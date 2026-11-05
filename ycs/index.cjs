'use strict';
const express = require('express');
const path = require('node:path');
const { Playback, RundownRepository, prepareEdits } = require('./playback.cjs');
const { DataSources, linkable } = require('./data.cjs');
const { LocalFiles } = require('./local-files.cjs');
const { createSheets } = require('./google-sheets-api.cjs');
const { Renderers } = require('./renderers.cjs');
const outputAccess = require('./output-access.cjs');
const operatorAccess = require('./operator-access.cjs');
const { ProgramRecovery } = require('./program-recovery.cjs');

module.exports = function registerYCS(app, config, hooks = {}) {
  if (!config.ycs?.enabled) return;
  // Views swap the stock Kill menu item for the managed restart in YCS settings.
  app.locals.ycsEnabled = true;
  const settings = config.ycs;
  // Stock SPX replaces global.config when the login policy is saved. Read login
  // settings from it per request; YCS settings stay as started until restart.
  const followGlobal = global.config === config;
  const live = () => (followGlobal && global.config?.general ? global.config : config);
  const configFile = hooks.configFile || global.configfileref;
  const repository = new RundownRepository(config.general.dataroot, settings.stages);
  const dataFile = settings.dataFile || path.resolve(config.general.dataroot, '../ycs-data.json');
  const sources = new DataSources(
    dataFile,
    settings.stages,
    {
      sheets: hooks.sheets || createSheets(settings.sheetsAPI, { keyFile: configFile ? require('./sheets-key.cjs').credentialFile(configFile) : undefined }),
      json: hooks.json,
      localFiles:
        hooks.localFiles ||
        new LocalFiles(
          settings.localDataRoot || path.resolve(config.general.dataroot, '../data-sources'),
          { locations: settings.localDataLocations || [] }
        )
    }
  );
  const playback = new Playback(repository, settings.slots, sources);
  const renderers = new Renderers();
  // Restart recovery (YCS.md, "Restart recovery"). Commands and output
  // subscriptions wait for this one decision, so no output can see an empty
  // program from a server that is about to restore it.
  const recovery = new ProgramRecovery(
    settings.programStateFile || dataFile.replace(/\.json$/i, '') + '.program-state.json',
    {
      withinSeconds: settings.restoreProgramWithinSeconds,
      // The Windows launcher's stop script leaves this marker (stop-runtime.ps1).
      stopMarker: hooks.stopMarker !== undefined ? hooks.stopMarker : path.resolve(__dirname, '../.local/runtime-stopped.json'),
      ...hooks.recovery
    }
  );
  playback.recovery = recovery;
  playback.ready = recovery
    .decide(settings.stages.map((stage) => stage.id))
    .then((decision) => {
      if (!decision.restore) return console.log(`[YCS restore] Starting with program stopped: ${decision.reason}.`);
      for (const stage of settings.stages) {
        const saved = decision.stages.get(stage.id);
        if (!saved?.program.length && !saved?.draft) { console.log(`[YCS restore] ${stage.id}: nothing was on air; ${decision.reason}.`); continue; }
        playback.restore(stage.id, saved, decision.downtimeMs);
        const count = saved.program.length;
        if (!count) { console.log(`[YCS restore] ${stage.id}: restored its Preview draft; ${decision.reason}.`); continue; }
        console.log(`[YCS restore] ${stage.id}: restored ${count} graphic${count === 1 ? '' : 's'} (${saved.program.map((graphic) => graphic.id).join(', ')}); ${decision.reason}.`);
      }
    })
    .catch((error) => console.error('[YCS restore] Starting with program stopped:', error.message));
  playback.ready.then(() => {
    recovery.attach(playback);
    // Make rundown onair flags match the program: restored graphics are marked
    // on air and stale flags from before a clean start are cleared.
    for (const stage of settings.stages)
      playback.queue(stage.id, () => playback.persist(stage.id), { duringRestart: true }).catch(() => {});
  });
  sources.activeReferences = () =>
    [...playback.states].flatMap(([stage, state]) =>
      state.program.flatMap((graphic) =>
        Object.entries(graphic.links || {})
          .filter(([, link]) => link.mode === 'linked')
          .map(([field, link]) => ({ stage, graphic: graphic.id, field, source: link.source }))
      )
    );
  const protectedMappingItems = () => [...playback.states].flatMap(([stage, state]) =>
    [...state.program, ...(state.draft ? [state.draft] : [])].map(graphic => ({stage, graphic: graphic.id})));
  const reconcileMappings = () => sources.reconcileMappings(repository, protectedMappingItems);
  playback.reconcileMappings = reconcileMappings;
  Promise.all([sources.ready, playback.ready]).then(reconcileMappings).catch(error => console.error('[YCS mapping cleanup]', error.message));
  let lastReconciliation = 0;
  let closeSockets;
  playback.attachSockets = (io) => {
    closeSockets = require('./sockets.cjs')(io, playback, config, live);
  };
  const updateLinks = () => {
    for (const stage of settings.stages)
      playback.refreshLinks(stage.id).catch((error) => console.error('[YCS data]', error.message));
  };
  sources.on('change', updateLinks);
  sources.ready.catch((error) => console.error('[YCS data]', error.message));
  const sourceTimer = setInterval(
    () =>
      sources
        .refresh({ datasets: 'none' })
        .then(() => sources.pollSheets())
        .then(async () => {
          await playback.ready;
          if (Date.now() - lastReconciliation > 5000) {
            lastReconciliation = Date.now();
            // Publishes nothing unless a value differs, and heals any missed update.
            updateLinks();
            await reconcileMappings();
          }
        })
        .catch((error) => console.error('[YCS data]', error.message)),
    1000
  );
  sourceTimer.unref();
  const workbookTimer = setInterval(() => {
    if (Object.keys(sources.document?.workbooks || {}).length)
      sources.pollSheets().catch(error => console.error('[YCS Sheets]', error.message));
  }, 100);
  workbookTimer.unref();
  const closePlayback = playback.close.bind(playback);
  playback.close = () => {
    recovery.stop();
    closePlayback();
    clearInterval(sourceTimer);
    clearInterval(workbookTimer);
    sources.off('change', updateLinks);
    sources.close();
    closeSockets?.();
  };
  // A deliberate stop (signal, rehearsal stop): record it so the next start is clean.
  playback.shutdown = async () => {
    await recovery.shutdown();
    playback.close();
  };
  const auth = hooks.auth || require('../utils/spx_auth.js');
  const router = express.Router();
  const handlers = (handler) => (req, res, next) =>
    Promise.resolve()
      .then(() => handler(req, res))
      .catch(next);

  function sameOrigin(req, res, next) {
    const origin = req.get('origin');
    if (origin && origin !== `${req.protocol}://${req.get('host')}`)
      return res.status(403).json({ error: 'Cross-origin commands are not accepted' });
    next();
  }
  function apiAccess(req, res, next) {
    // Browser operator sessions use normal SPX login. Companion can use a header.
    const operator = operatorAccess.allowed(req, live());
    if (operator) return next();
    if (settings.apiKey) {
      if (req.get('authorization') !== `Bearer ${settings.apiKey}`)
        return res.status(401).json({ error: 'API token required' });
    } else if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) {
      return res
        .status(403)
        .json({ error: 'Remote API requires a configured token or operator login' });
    }
    next();
  }

  app.get('/ycs/data-manager', auth.CheckLogin, (req, res) => {
    operatorAccess.grant(req);
    res.sendFile(path.join(__dirname, 'public/data-manager.html'));
  });
  // Renews the operator session of a page left open across a server restart, without
  // the file reads and configuration writes of loading a whole controller page.
  app.get('/ycs/session', auth.CheckLogin, (req, res) => {
    operatorAccess.grant(req);
    res.set('Cache-Control', 'no-store').sendStatus(204);
  });
  app.use('/ycs', express.static(path.join(__dirname, 'public')));
  require('./decktype-assets.cjs')(app, settings.decktypeFolders);

  if (settings.graphicsRoot) {
    // The graphics repository/package keeps reusable helpers and templates beside ticker.
    const root = path.resolve(settings.graphicsRoot);
    app.use('/templates/ycs/ticker', express.static(root));
    for (const folder of ['shared', 'lower-third', 'match-status'])
      app.use('/templates/ycs/' + folder, express.static(path.join(root, '..', folder)));
  }
  app.use('/templates/ycs-system', express.static(path.join(__dirname, 'templates')));
  app.get(
    '/output/:stage/:mode',
    auth.CheckLogin,
    handlers(async (req, res) => {
      playback.snapshot(req.params.stage, req.params.mode);
      outputAccess.grant(req, req.params.stage, req.params.mode);
      res.sendFile(path.join(__dirname, 'public/output.html'));
    })
  );
  router.post(
    '/stages/:stage/:mode/report',
    sameOrigin,
    (req, res, next) =>
      outputAccess.allowed(req, live(), req.params.stage, req.params.mode)
        ? next()
        : apiAccess(req, res, next),
    handlers(async (req, res) => {
      playback.snapshot(req.params.stage, req.params.mode);
      renderers.report(req.params.stage, req.params.mode, req.body);
      res.sendStatus(204);
    })
  );
  // Settings use the operator login rather than Companion credentials, and only
  // accept local requests. Keep them separate from the external command API.
  const settingsRouter = express.Router();
  settingsRouter.use('/settings', sameOrigin, auth.CheckLogin);
  require('./settings.cjs').registerSettings(app, settingsRouter, {
    auth, handlers, config, playback, configFile, hooks: hooks.settings
  });
  app.use('/api/ycs', settingsRouter);
  router.use(sameOrigin, apiAccess);
  router.get(
    '/data',
    handlers(async (req, res) => {
      await sources.ready;
      // Controllers and Data Manager poll this every few seconds. Serve labels
      // from the parsed-file cache; a stalled share only delays its own refresh.
      // Pollers send the dataset hashes they hold (`have=id:hash,…`) or ask for no
      // datasets at all; unchanged rows/data are then left out of the response.
      let datasets = 'all';
      if (req.query.datasets === 'none') datasets = 'none';
      else if (typeof req.query.have === 'string' && req.query.have.length <= 16384)
        datasets = new Map(
          req.query.have
            .split(',')
            .map((item) => item.split(':'))
            .filter((pair) => pair.length === 2)
        );
      const snapshot = sources.snapshot({ datasets });
      const inventories = new Map();
      await Promise.all([...repository.stages.values()].map(async stage => {
        const { rundown, profile } = await repository.inventory(stage.id);
        if (rundown) inventories.set(stage.id, { items: rundown.templates, definitions: profile?.templates || [] });
      }));
      for (const connection of Object.values(snapshot.connections)) for (const usage of connection.usages) {
        const inventory = inventories.get(usage.stage);
        const item = inventory?.items.find(item => item.itemID === usage.graphic);
        const templatePath = item?.relpath || usage.template;
        const definition = inventory?.definitions.find(item => item.relpath === templatePath);
        usage.graphicTitle = item?.ycsNickname || definition?.description || (templatePath ? path.basename(templatePath).replace(/\.html?$/i, '') : 'Unavailable graphic');
        if (usage.kind === 'default') usage.graphicTitle += ' (template default)';
        usage.fieldTitle = (item?.DataFields || definition?.DataFields || []).find(field => field.field === usage.field)?.title || usage.field;
      }
      res.json(snapshot);
    })
  );
  router.post(
    '/data/source',
    handlers(async (req, res) =>
      res.json(await sources.updateSource(req.body.id, req.body.value, req.body.revision))
    )
  );
  router.get(
    '/data/local/locations',
    handlers(async (req, res) => res.json(sources.localFiles.describe()))
  );
  router.post(
    '/data/local/test',
    handlers(async (req, res) =>
      res.json(await sources.localFiles.read(req.body.settings, { type: req.body.type }))
    )
  );
  router.post(
    '/data/json/test',
    handlers(async (req, res) => res.json(await sources.json.read(req.body.settings)))
  );
  router.post(
    '/data/sheets/test',
    handlers(async (req, res) => res.json(await sources.testSheet(req.body.settings)))
  );
  router.post(
    '/data/sheets/worksheets',
    handlers(async (req, res) => res.json(await sources.sheets.worksheets({ url: req.body.url })))
  );
  router.post(
    '/data/sheets',
    handlers(async (req, res) =>
      res.json(
        await sources.addSheet(
          req.body.label,
          req.body.settings,
          req.body.revision,
          req.body.type,
          req.body.project,
          req.body.confirmed
        )
      )
    )
  );
  router.post(
    '/data/sheets/:id/refresh',
    handlers(async (req, res) => res.json(await sources.refreshSheet(req.params.id)))
  );
  router.post(
    '/data/mapping',
    handlers(async (req, res) => {
      const { stage, graphic, field, source, revision } = req.body;
      const item = repository.item(await repository.read(stage), graphic);
      if (!linkable(item, field))
        return res.status(422).json({ error: 'This template field does not support text linking' });
      res.json(await sources.updateMapping({ stage, graphic, field, source }, revision));
    })
  );
  router.post(
    '/data/connections',
    handlers(async (req, res) =>
      res.json(
        await sources.saveConnection(
          req.body.id,
          req.body.label,
          req.body.settings,
          req.body.revision,
          req.body.type,
          req.body.project,
          req.body.confirmed
        )
      )
    )
  );
  router.post('/data/workbooks', handlers(async (req, res) => res.json(await sources.saveWorkbook(req.body))));
  router.post('/data/workbooks/:id/groups', handlers(async (req, res) => res.json(await sources.saveWorkbookGroup(req.params.id, req.body))));
  router.post('/data/workbooks/:id/groups/:group/ranges', handlers(async (req, res) => res.json(await sources.saveNamedRange(req.params.id, req.params.group, req.body))));
  router.post('/data/workbooks/:id/refresh', handlers(async (req, res) => res.json(await sources.refreshWorkbook(req.params.id))));
  router.post('/data/workbooks/:id/remove', handlers(async (req, res) => res.json(await sources.removeWorkbookItem(req.params.id, null, req.body.revision, req.body.confirmed))));
  router.post('/data/workbooks/:id/groups/:group/remove', handlers(async (req, res) => res.json(await sources.removeWorkbookItem(req.params.id, req.params.group, req.body.revision, req.body.confirmed))));
  router.post(
    '/data/connections/:id/refresh',
    handlers(async (req, res) => res.json(await sources.refreshSheet(req.params.id)))
  );
  router.post(
    '/data/connections/:id/remove',
    handlers(async (req, res) =>
      res.json(await sources.removeConnection(req.params.id, req.body.revision, req.body.confirmed))
    )
  );
  router.get(
    '/data/mappings/:stage/:graphic',
    handlers(async (req, res) => {
      await sources.ready;
      const { stage, graphic } = req.params,
        item = repository.item(await repository.read(stage), graphic);
      res.json(await playback.mappingPreview(stage, graphic));
    })
  );
  router.post(
    '/data/mappings/:stage/:graphic/preview',
    handlers(async (req, res) =>
      res.json(await playback.mappingPreview(req.params.stage, req.params.graphic, req.body.edits))
    )
  );
  router.post(
    '/data/mappings/:stage/:graphic',
    handlers(async (req, res) => {
      const { stage, graphic } = req.params,
        item = repository.item(await repository.read(stage), graphic);
      if (
        !Array.isArray(req.body.edits) ||
        req.body.edits.some((edit) => !linkable(item, edit.field))
      )
        return res.status(422).json({ error: 'This field cannot be mapped' });
      res.json(
        await sources.saveMappings(
          stage,
          graphic,
          item.relpath,
          prepareEdits(item, req.body.edits),
          req.body.revision
        )
      );
    })
  );
  router.get('/stages', (req, res) =>
    res.json(
      [...repository.stages.values()].map(({ id, title, project, rundown }) => ({
        id,
        title,
        project,
        rundown,
        controller: `/gc/${project}/${rundown}`
      }))
    )
  );
  router.get(
    '/stages/:stage/graphics',
    handlers(async (req, res) => res.json(await playback.catalog(req.params.stage)))
  );
  router.get(
    '/stages/:stage/graphics/:graphic/editor',
    handlers(async (req, res) =>
      res.json(await playback.editor(req.params.stage, req.params.graphic))
    )
  );
  router.post('/stages/:stage/graphics/:graphic/slot', handlers(async (req, res) => {
    res.json(await playback.assignSlot(req.params.stage, req.params.graphic, req.body.slot, req.body.revision));
  }));
  router.post(
    '/stages/:stage/graphics/:graphic/nickname',
    handlers(async (req, res) =>
      res.json(
        await playback.rename(
          req.params.stage,
          req.params.graphic,
          req.body.nickname,
          req.body.revision
        )
      )
    )
  );
  router.get(
    '/stages/:stage/health',
    handlers(async (req, res) =>
      res.json({
        ...renderers.snapshot(req.params.stage, playback.state(req.params.stage).revision),
        restored: playback.restored(req.params.stage)
      })
    )
  );
  router.post(
    '/stages/:stage/restored/dismiss',
    handlers(async (req, res) => {
      playback.dismissRestored(req.params.stage);
      res.json({ dismissed: true });
    })
  );
  router.get(
    '/stages/:stage/:mode/state',
    handlers(async (req, res) => {
      await playback.ready;
      res.json(playback.snapshot(req.params.stage, req.params.mode));
    })
  );
  router.get('/stages/:stage/:mode/events', async (req, res, next) => {
    await playback.ready;
    try {
      const { stage, mode } = req.params;
      const state = playback.snapshot(stage, mode);
      // Retire legacy browser streams without retry loops. Updated controllers
      // and outputs use the /ycs-playback Socket.IO namespace. Keep the stream
      // endpoint for explicit non-browser integrations and existing API tests.
      if (req.get('accept')?.includes('text/event-stream')) return res.sendStatus(204);
      res.status(200).set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      });
      res.flushHeaders();
      const send = (value) => res.write(`event: state\ndata: ${JSON.stringify(value)}\n\n`);
      send(state);
      const eventName = stage + ':' + mode;
      playback.on(eventName, send);
      const heartbeat = setInterval(() => res.write(': connected\n\n'), 15000);
      heartbeat.unref();
      req.on('close', () => {
        clearInterval(heartbeat);
        playback.off(eventName, send);
      });
    } catch (error) {
      next(error);
    }
  });
  router.post(
    '/stages/:stage/graphics/:graphic/:action',
    handlers(async (req, res) => {
      res.json(
        await playback.command(
          req.params.stage,
          req.params.graphic,
          req.params.action,
          req.body?.fields,
          { links: req.body?.links, revision: req.body?.revision }
        )
      );
    })
  );
  router.post(
    '/stages/:stage/clear',
    handlers(async (req, res) => res.json(await playback.clear(req.params.stage)))
  );
  app.use('/api/ycs', router);

  // Public control addresses identify the saved project/rundown/item. The
  // configured output is resolved exactly; there is no global focused rundown.
  app.all(
    '/api/:project/:rundown/:graphic/:action',
    // Leave existing API namespaces to their own routers, including removed
    // endpoints that must remain 404 rather than becoming item commands.
    (req, res, next) => (['ycs', 'v1'].includes(req.params.project) ? next('route') : next()),
    (req, res, next) => {
      res.locals.ycsJSON = true; // Errors are JSON for Companion, never an HTML stack trace.
      res.set('Cache-Control', 'no-store');
      // Express normally runs GET handlers for HEAD too. Control URLs must
      // execute only explicit GET/POST requests, never probes or preflights.
      if (!['GET', 'POST'].includes(req.method))
        return res.set('Allow', 'GET, POST').status(405).end();
      next();
    },
    sameOrigin,
    (req, res, next) => settings.allowUnauthenticatedCompanion === true
      ? next()
      : apiAccess(req, res, next),
    handlers(async (req, res) => {
      const { project, rundown, graphic, action } = req.params;
      const allowed = require('./public/companion-contract.js').actions;
      if (!allowed.includes(action) && action !== 'select')
        return res.status(400).json({ error: 'Unknown item action' });
      const matches = [...repository.stages.values()].filter(
        (stage) => stage.project === project && stage.rundown === rundown
      );
      if (!matches.length)
        return res.status(404).json({ error: 'Project/rundown has no configured output' });
      if (matches.length !== 1)
        return res.status(409).json({ error: 'Project/rundown has multiple configured outputs' });
      if (
        req.body &&
        (typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).length)
      )
        return res
          .status(400)
          .json({ error: 'Item commands use saved data; send an empty JSON object' });
      const stage = matches[0].id;
      res.json(
        action === 'select' || action === 'focus'
          ? await playback.focus(stage, graphic)
          : await playback.command(stage, graphic, action)
      );
    })
  );

  // Preserve the familiar SPX editor and keyboard/Save/Play/Update controls.
  // Requests for configured stages bypass legacy shared global.rundownData.
  app.use((req, res, next) => {
    if (req.method === 'GET' && req.path.startsWith('/gc/')) {
      const parts = req.path.split('/');
      const stage = [...repository.stages.values()].find(
        (stage) => stage.project === parts[2] && stage.rundown === parts[3]
      );
      if (stage)
        res.locals.ycsStage = {
          id: stage.id,
          title: stage.title,
          project: stage.project,
          rundown: stage.rundown,
          previewUrl: `/output/${stage.id}/preview`
        };
      if (stage && (parts.length === 4 || (parts.length === 5 && parts[4] === '')))
        return auth.CheckLogin(req, res, () => {
          operatorAccess.grant(req);
          next();
        });
    }
    if (req.method === 'POST' && req.body?.command === 'removeItemFromRundown') {
      const stage = repository.matchFile(req.body.datafile);
      if (stage && req.path === '/gc/' + stage.project + '/' + stage.rundown) {
        return sameOrigin(req, res, () => auth.CheckLogin(req, res, () => handlers(async () => {
          await playback.queue(stage.id, async () => {
            const state = playback.state(stage.id);
            if (state.program.some(item => item.id === req.body.epoch)) { const error = new Error('Stop this graphic before deleting it'); error.status = 409; throw error; }
            const rundown = await repository.read(stage.id);
            rundown.templates = rundown.templates.filter(item => item.itemID !== req.body.epoch);
            await repository.write(stage.id, rundown);
            if (state.draft?.id === req.body.epoch) { state.draft = null; playback.publish(stage.id); }
            await reconcileMappings();
          });
          res.json({removed: true});
        })(req, res, next)));
      }
    }
    if (req.method !== 'POST' || !['/gc/playout', '/gc/saveItemChanges'].includes(req.path))
      return next();
    const stage = repository.matchFile(req.body?.datafile || req.body?.rundownfile);
    if (!stage) return next();
    sameOrigin(req, res, () =>
      auth.CheckLogin(req, res, () =>
        handlers(async () => {
          if (req.path === '/gc/saveItemChanges') {
            await playback.command(stage.id, req.body.epoch, 'save', req.body.DataFields);
            const saved = repository.item(await repository.read(stage.id), req.body.epoch);
            const model = await playback.editor(stage.id, req.body.epoch);
            const plain = require('./public/rundown-summary.js').text(saved.DataFields, field => {
              const link = model.links[field.field];
              return link?.mode === 'linked' ? sources.value(link.source) ?? link.manual : field.value;
            });
            const summary = plain.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
            return res.json(['Stage changes saved', summary]);
          }
          const action = req.body.command;
          if (action === 'autoPlayLocal') return res.json({ skipped: true });
          if (!['play', 'stop', 'preview', 'update', 'continue'].includes(action))
            return res.status(400).json({ error: 'This command is not supported for a YCS stage' });
          await playback.command(stage.id, req.body.epoch, action, req.body.fields);
          return res.type('text').send(`${stage.title || stage.id}: ${action} ${req.body.epoch}`);
        })(req, res, next)
      )
    );
  });
  app.use((error, req, res, next) => {
    if (
      !req.path.startsWith('/api/ycs') &&
      !req.path.startsWith('/output') &&
      !res.locals.ycsJSON &&
      !repository.matchFile(req.body?.datafile || req.body?.rundownfile)
    )
      return next(error);
    if (res.headersSent) return next(error);
    res.status(error.status || 500).json({
      error: error.status ? error.message : 'Stage operation failed; program state retained',
      ...(error.confirmationRequired ? { confirmationRequired: true } : {}),
      ...(error.fields ? { fields: error.fields } : {})
    });
  });
  return playback;
};
