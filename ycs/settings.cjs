'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { GoogleSheetsAPI } = require('./google-sheets-api.cjs');
const { credentialFile, readKey, inspectKey } = require('./sheets-key.cjs');
const configStore = require('../utils/config-store.cjs');

function fail(message, status = 422) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
function atomic(file, value) {
  const temporary = file + '.' + crypto.randomUUID() + '.tmp';
  try {
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
    fs.renameSync(temporary, file);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
function editable(config) {
  return {
    sheetsAPI: {
      enabled: Boolean(config.ycs?.sheetsAPI?.enabled),
      keyEnv: config.ycs?.sheetsAPI?.keyEnv || 'YCS_GOOGLE_SHEETS_API_KEY'
    },
    decktypeFolders: config.ycs?.decktypeFolders || [],
    graphicsRoot: config.ycs?.graphicsRoot || ''
  };
}
function validate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Invalid settings');
  const allowed = ['revision', 'sheetsAPI', 'decktypeFolders', 'graphicsRoot', 'key', 'clearKey'];
  if (Object.keys(input).some(key => !allowed.includes(key))) fail('Unsupported setting');
  if (typeof input.sheetsAPI?.enabled !== 'boolean') fail('Choose a Google Sheets reader');
  if (!Array.isArray(input.decktypeFolders) || input.decktypeFolders.length > 16) fail('Use up to 16 decktype folders');
  function filePath(value, empty = false) {
    if (typeof value !== 'string' || value.length > 1024 || /[\u0000-\u001f]/.test(value)) fail('Enter a valid server folder path');
    const result = value.trim();
    if ((!result && !empty) || (result && /^(?:https?|file):/i.test(result))) fail('Use a folder path on the SPX computer, not a URL');
    return result;
  }
  const decktypeFolders = input.decktypeFolders.map(value => filePath(value));
  if (new Set(decktypeFolders.map(value => value.toLowerCase())).size !== decktypeFolders.length) fail('Remove duplicate decktype folders');
  if (input.key !== undefined && (typeof input.key !== 'string' || input.key.length > 256 || /[\s\u0000-\u001f]/.test(input.key))) fail('Enter a valid Google API key');
  if (input.clearKey !== undefined && typeof input.clearKey !== 'boolean') fail('Invalid key removal option');
  if (input.clearKey && input.key) fail('Choose either replacing or removing the saved key');
  return { sheetsAPI: { enabled: input.sheetsAPI.enabled }, decktypeFolders, graphicsRoot: filePath(input.graphicsRoot, true) };
}

class Settings {
  constructor({ configFile, config, playback, root = path.resolve(__dirname, '..'), env = process.env,
    platform = process.platform, restart, fetcher = fetch, instance = `${process.pid}-${Date.now()}`, restartTimeout = 5000, busyTimeout = 3000 }) {
    Object.assign(this, { configFile, config, playback, root, env, platform, fetcher, instance, busyTimeout });
    this.launchRestart = restart || (async (record, requestId) => {
      const logs = path.join(root, '.local/runtime-logs');
      fs.mkdirSync(logs, { recursive: true });
      const output = fs.openSync(path.join(logs, `restart-${requestId}.log`), 'a');
      try {
        // A detached Node helper owns PowerShell's lifetime. Windows PowerShell
        // itself cannot reliably execute -File with DETACHED_PROCESS.
        const child = spawn(process.execPath, [path.join(root, 'ycs/restart-runtime.cjs'),
          String(process.pid), record.startTicks, requestId
        ], { cwd: root, detached: true, windowsHide: true, stdio: ['ignore', output, output, 'ipc'] });
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            // No permission to stop SPX was sent: it is safe to terminate this helper.
            child.kill();
            reject(new Error('Restart helper did not become ready'));
          }, restartTimeout);
          const ready = message => {
            if (message?.type !== 'ready' || message.requestId !== requestId) return;
            clearTimeout(timer);
            resolve();
          };
          child.once('message', ready);
          child.once('error', error => { clearTimeout(timer); reject(error); });
          child.once('exit', () => {
            clearTimeout(timer);
            this.restartFailed(requestId);
            reject(new Error('Restart helper exited before completing restart'));
          });
        });
        child.send({ type: 'proceed', requestId }, error => { if (error) this.restartFailed(requestId); });
        child.unref();
      } finally { fs.closeSync(output); }
    });
    this.runningSettings = editable(config);
    this.runningKey = inspectKey(configFile ? credentialFile(configFile) : undefined).fingerprint;
    this.queued = null;
    this.serial = Promise.resolve();
  }
  read() {
    if (!this.configFile) fail('Settings are unavailable: no active configuration file', 503);
    const config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
    const credentials = inspectKey(credentialFile(this.configFile));
    const revision = crypto.createHash('sha256').update(JSON.stringify({ config, credential: credentials.fingerprint })).digest('hex');
    return { config, key: credentials.key, credentials, revision };
  }
  restartFailed(requestId) {
    if (this.queued !== requestId) return;
    this.queued = null;
    this.playback.restartPending = false;
    try { atomic(path.join(this.root, '.local/restart-status.json'), {
      requestId, state: 'failed', message: 'Restart failed. The server is still running and playback is available. Check .local/runtime-logs.'
    }); } catch { /* Recovery must not depend on being able to write the status file. */ }
  }
  runtime() {
    const statusFile = path.join(this.root, '.local/restart-status.json');
    let status;
    try { status = JSON.parse(fs.readFileSync(statusFile, 'utf8')); } catch { /* No restart has been requested. */ }
    if (this.queued && status?.requestId === this.queued && status.state === 'failed') {
      this.queued = null;
      this.playback.restartPending = false;
    }
    if (this.platform !== 'win32') return { available: false, reason: 'Restart from this page currently requires the Windows launcher.' };
    try {
      const record = JSON.parse(fs.readFileSync(path.join(this.root, '.local/runtime-process.json'), 'utf8'));
      if (record.id !== process.pid || path.resolve(record.executable) !== path.resolve(process.execPath) ||
          path.resolve(record.configuration) !== path.resolve(this.configFile) || !/^\d+$/.test(record.startTicks)) throw new Error();
      if (this.queued) return { available: false, reason: 'Restart in progress.', queued: true };
      return { available: true, record, error: status?.state === 'failed' ? status.message : '' };
    } catch { return { available: false, reason: 'Start SPX with its Windows launcher to enable browser restart.' }; }
  }
  snapshot() {
    const { config, key, credentials, revision } = this.read();
    const value = editable(config), runtime = this.runtime();
    const environmentKey = Boolean(this.env[value.sheetsAPI.keyEnv]);
    return {
      revision, instance: this.instance, configFile: this.configFile, values: value,
      key: { saved: credentials.present, error: credentials.error, environment: environmentKey, source: environmentKey ? 'Environment variable' : credentials.error ? 'Saved key needs attention' : key ? 'Saved on this server' : 'Not configured' },
      restartRequired: JSON.stringify(value) !== JSON.stringify(this.runningSettings) || credentials.fingerprint !== this.runningKey,
      runningReader: this.runningSettings.sheetsAPI.enabled ? 'Google Sheets API' : 'Public query connector',
      restart: { available: runtime.available, reason: runtime.reason || '', queued: Boolean(runtime.queued), error: runtime.error || '' },
      stages: (config.ycs?.stages || []).map(({ id, title, project, rundown }) => ({ id, title, project, rundown })),
      slots: Object.entries(config.ycs?.slots || {}).map(([id, slot]) => ({ id, label: slot.label || id }))
    };
  }
  async save(input) {
    const job = this.serial.then(() => configStore.transaction(this.configFile, async () => {
      if (this.queued || this.playback.restartPending) fail('Wait for the server restart to finish.', 409);
      const next = validate(input);
      const current = this.read();
      if (input.revision !== current.revision) fail('Settings changed elsewhere. Reload before saving.', 409);
      const name = current.config.ycs?.sheetsAPI?.keyEnv || 'YCS_GOOGLE_SHEETS_API_KEY';
      const key = input.clearKey ? '' : input.key || current.key;
      if (next.sheetsAPI.enabled && !(this.env[name] || key)) fail('Add a Google API key before enabling the API reader');
      const config = structuredClone(current.config);
      config.ycs = { ...config.ycs, ...next, sheetsAPI: { ...config.ycs?.sheetsAPI, ...next.sheetsAPI, keyEnv: name } };
      const keyFile = credentialFile(this.configFile);
      // Hold the configuration transaction across both writes. Restore the original
      // credential bytes (including a damaged file) if configuration persistence fails.
      const changeKey = Boolean(input.key || input.clearKey);
      if (changeKey) await configStore.writeJSON(keyFile, { key });
      try { await configStore.replaceConfig(this.configFile, config); }
      catch (error) {
        if (changeKey && current.credentials.raw !== null) await configStore.writeText(keyFile, current.credentials.raw);
        else if (changeKey) fs.rmSync(keyFile, { force: true });
        throw error;
      }
      // Legacy recents/settings writes use global.config. Replace its YCS object,
      // leaving the running services' captured settings unchanged until restart.
      if (global.configfileref === this.configFile && global.config) global.config.ycs = structuredClone(config.ycs);
      return this.snapshot();
    }));
    this.serial = job.catch(() => {});
    return job;
  }
  async test(input) {
    if (!input || typeof input.url !== 'string') fail('Enter a public spreadsheet URL to test');
    if (input.key !== undefined && (typeof input.key !== 'string' || input.key.length > 256 || /\s/.test(input.key))) fail('Invalid Google API key');
    const current = this.read();
    const name = current.config.ycs?.sheetsAPI?.keyEnv || 'YCS_GOOGLE_SHEETS_API_KEY';
    const key = this.env[name] || input.key || current.key;
    const reader = new GoogleSheetsAPI({ key, fetcher: this.fetcher });
    const result = await reader.worksheets({ url: input.url });
    return { message: `Connected · ${result.worksheets.length} worksheet${result.worksheets.length === 1 ? '' : 's'} found` };
  }
  async restart() {
    // Wait for a pending Save before restarting. A queued request blocks further saves.
    await this.serial;
    await configStore.transaction(this.configFile, () => {});
    const runtime = this.runtime();
    if (!runtime.available) fail(runtime.reason, 409);
    if (this.playback.restartPending) fail('Restart already in progress.', 409);
    this.playback.restartPending = true;
    // One stuck stage (a stalled share) must not hold every stage's commands
    // behind the restart gate. Give up and release the gate after busyTimeout.
    let timer;
    const idle = await Promise.race([
      Promise.allSettled([...(this.playback.queues?.values() || [])]).then(() => true),
      new Promise(resolve => { timer = setTimeout(resolve, this.busyTimeout, false); })
    ]);
    clearTimeout(timer);
    if (!idle) {
      this.playback.restartPending = false;
      fail('A stage is busy. Try the restart again in a moment.', 409);
    }
    if ([...this.playback.states.values()].some(state => state.program.length)) {
      this.playback.restartPending = false;
      fail('Stop all Program graphics before restarting the server.', 409);
    }
    const requestId = crypto.randomUUID();
    this.queued = requestId;
    try {
      atomic(path.join(this.root, '.local/restart-status.json'), { requestId, state: 'pending' });
      await this.launchRestart(runtime.record, requestId);
    } catch {
      this.queued = null;
      this.playback.restartPending = false;
      fail('Could not start the restart helper. The server is still running.', 503);
    }
    return { accepted: true, instance: this.instance };
  }
}

function registerSettings(app, router, { auth, sameOrigin, handlers, config, playback, configFile, hooks = {} }) {
  const service = new Settings({ config, playback, configFile, ...hooks });
  const local = (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress))
      return res.status(403).json({ error: 'Open settings on the SPX computer to make server changes.' });
    next();
  };
  const mutation = (req, res, next) => req.get('x-ycs-settings') === '1'
    ? next() : res.status(403).json({ error: 'Use the settings page to change server settings.' });
  app.get('/ycs/settings', auth.CheckLogin, (req, res) => res.sendFile(path.join(__dirname, 'public/settings.html')));
  router.get('/settings', local, handlers(async (req, res) => res.json(service.snapshot())));
  router.post('/settings', local, mutation, handlers(async (req, res) => {
    if (service.queued) fail('Wait for the server restart to finish.', 409);
    res.json(await service.save(req.body));
  }));
  router.post('/settings/sheets/test', local, mutation, handlers(async (req, res) => res.json(await service.test(req.body))));
  router.post('/settings/restart', local, mutation, handlers(async (req, res) => res.status(202).json(await service.restart())));
  return service;
}
module.exports = { Settings, registerSettings, credentialFile, readKey, validate };
