'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const { Settings, registerSettings, credentialFile } = require('../settings.cjs');
const { createSheets, GoogleSheetsAPI } = require('../google-sheets-api.cjs');
const { fixture } = require('./playback.test.cjs');
const { JSDOM } = require('jsdom');
const configStore = require('../../utils/config-store.cjs');
const vm = require('node:vm');

function setup(t, overrides = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ycs-settings-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, '.local'));
  const configFile = path.join(root, '.local/config.json');
  const config = { general: { username: '', port: 5660 }, ycs: {
    enabled: true, apiKey: 'existing-companion-secret', customProperty: 'keep',
    stages: [{ id: 'stage-1', title: 'Stage 1', project: 'Project', rundown: 'Show' }],
    slots: { ticker: { label: 'BUG', order: 10 } }, decktypeFolders: ['C:/Decktypes']
  } };
  fs.writeFileSync(configFile, JSON.stringify(config));
  const playback = { states: new Map([['stage-1', { program: [] }]]), queues: new Map() };
  const options = { configFile, config, root, playback, env: {}, platform: 'win32', ...overrides };
  const service = new Settings(options);
  const input = () => ({ ...service.snapshot().values, revision: service.snapshot().revision });
  function managed() {
    fs.writeFileSync(path.join(root, '.local/runtime-process.json'), JSON.stringify({
      id: process.pid, executable: process.execPath, configuration: configFile, startTicks: '123456789'
    }));
  }
  return { root, configFile, config, playback, service, input, managed, options };
}

test('settings save preserves unrelated configuration; credentials are write-only and survive reader construction', async t => {
  const r = setup(t);
  const data = await r.service.save({ ...r.input(), sheetsAPI: { enabled: true }, key: 'new-test-google-key' });
  assert.equal(data.restartRequired, true);
  assert.equal(data.key.saved, true);
  assert.doesNotMatch(JSON.stringify(data), /new-test-google-key|existing-companion-secret/);
  const stored = JSON.parse(fs.readFileSync(r.configFile));
  assert.equal(stored.ycs.apiKey, 'existing-companion-secret');
  assert.equal(stored.ycs.customProperty, 'keep');
  assert.equal(stored.general.port, 5660);
  assert.deepEqual(stored.ycs.stages, r.config.ycs.stages);
  assert.ok(createSheets(stored.ycs.sheetsAPI, { env: {}, keyFile: credentialFile(r.configFile) }) instanceof GoogleSheetsAPI);
  const restarted = new Settings({ ...r.options, config: stored });
  assert.equal(restarted.snapshot().restartRequired, false);
  await r.service.save({ ...r.input(), graphicsRoot: 'D:/graphics/ticker' });
  assert.equal(JSON.parse(fs.readFileSync(credentialFile(r.configFile))).key, 'new-test-google-key');
  await r.service.save({ ...r.input(), sheetsAPI: { enabled: false }, clearKey: true });
  assert.equal(r.service.snapshot().key.saved, false);
});

test('validation and stale revisions preserve drafts without overwriting configuration', async t => {
  const r = setup(t), before = fs.readFileSync(r.configFile, 'utf8'), input = r.input();
  for (const invalid of [
    { sheetsAPI: { enabled: true } }, { decktypeFolders: ['https://bad.example'] },
    { decktypeFolders: ['C:/Data', 'c:/data'] }, { graphicsRoot: 'bad\nfolder' },
    { stages: [] }, { key: 'bad\nkey' }, { key: 'key', clearKey: true }
  ]) await assert.rejects(r.service.save({ ...input, ...invalid }), { status: 422 });
  assert.equal(fs.readFileSync(r.configFile, 'utf8'), before);
  await r.service.save({ ...input, graphicsRoot: 'C:/other' });
  await assert.rejects(r.service.save({ ...input, graphicsRoot: 'C:/stale' }), { status: 409 });
  assert.equal(r.service.snapshot().values.graphicsRoot, 'C:/other');
});

test('API test uses unsaved credentials without storing or returning them; environment key takes precedence', async t => {
  let key;
  const fetcher = async (url, options) => {
    key = options.headers['X-Goog-Api-Key'];
    return new Response(JSON.stringify({ sheets: [{ properties: { sheetId: 0, title: 'Test' } }] }), { headers: { 'Content-Type': 'application/json' } });
  };
  const r = setup(t, { fetcher });
  const result = await r.service.test({ key: 'unsaved-key', url: 'https://docs.google.com/spreadsheets/d/1PUBLIC_SHEET_TEST_1234567890/edit' });
  assert.equal(key, 'unsaved-key');
  assert.match(result.message, /1 worksheet/);
  assert.equal(fs.existsSync(credentialFile(r.configFile)), false);
  r.service.env.YCS_GOOGLE_SHEETS_API_KEY = 'environment-key';
  await r.service.test({ key: 'ignored-key', url: 'https://docs.google.com/spreadsheets/d/1PUBLIC_SHEET_TEST_1234567890/edit' });
  assert.equal(key, 'environment-key');
});

test('restart requires the managed runtime, refuses active Program and unlocks if helper fails', async t => {
  let calls = 0;
  const r = setup(t, { restart: async () => { calls++; } });
  await assert.rejects(r.service.restart(), /Windows launcher/);
  r.managed();
  r.playback.states.get('stage-1').program.push({ id: 'onair' });
  await assert.rejects(r.service.restart(), /Stop all Program/);
  assert.equal(calls, 0);
  assert.equal(r.playback.restartPending, false);
  r.playback.states.get('stage-1').program.length = 0;
  assert.equal((await r.service.restart()).accepted, true);
  assert.equal(calls, 1);
  assert.equal(r.playback.restartPending, true);
  await assert.rejects(r.service.restart(), /progress/);
  await assert.rejects(r.service.save(r.input()), /restart/);
  fs.writeFileSync(path.join(r.root, '.local/restart-status.json'), JSON.stringify({ requestId: r.service.queued, state: 'failed', message: 'Restart failed.' }));
  assert.equal(r.service.snapshot().restart.available, true);
  assert.equal(r.playback.restartPending, false);
  r.service.launchRestart = async () => { throw new Error('spawn failed'); };
  await assert.rejects(r.service.restart(), /helper/);
  assert.equal(r.playback.restartPending, false);
});

test('restart lock prevents new stage commands and waits for in-flight commands before checking Program', async t => {
  const base = await fixture(t);
  base.playback.restartPending = true;
  await assert.rejects(base.playback.command('stage-1', 'ticker', 'play'), { status: 503 });
  assert.equal(base.playback.snapshot('stage-1', 'program').graphics.length, 0);
  base.playback.restartPending = false;
  const r = setup(t, { playback: base.playback, restart: async () => assert.fail('must not restart active Program') });
  r.managed();
  const playing = base.playback.command('stage-1', 'ticker', 'play');
  await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(r.service.restart(), /Stop all Program/);
  await playing;
  assert.equal(base.playback.restartPending, false);
});

test('HTTP settings reject cross-origin or non-page mutations and never return stored credentials', async t => {
  const r = setup(t), app = express(), router = express.Router();
  app.use(express.json());
  const sameOrigin = (req, res, next) => req.get('origin') && req.get('origin') !== `http://${req.get('host')}`
    ? res.status(403).end() : next();
  router.use(sameOrigin);
  registerSettings(app, router, { auth: { CheckLogin: (req, res, next) => next() }, handlers: fn => (req, res, next) => Promise.resolve().then(() => fn(req, res)).catch(next), ...r.options, hooks: { root: r.root, env: {} } });
  app.use('/api/ycs', router);
  app.use((error, req, res, next) => res.status(error.status || 500).json({ error: error.message }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = headers => fetch(base + '/api/ycs/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(r.input()) });
  assert.equal((await post({})).status, 403);
  assert.equal((await post({ 'X-YCS-Settings': '1', Origin: 'https://elsewhere.example' })).status, 403);
  assert.equal((await post({ 'X-YCS-Settings': '1' })).status, 200);
  assert.equal((await fetch(base + '/ycs/settings')).status, 200);
  const snapshot = await fetch(base + '/api/ycs/settings').then(response => response.json());
  assert.doesNotMatch(JSON.stringify(snapshot), /existing-companion-secret/);
});

test('settings page keeps unsaved edits on failed Save and blocks restart until saved/reverted', async t => {
  const r = setup(t), html = fs.readFileSync(path.join(__dirname, '../public/settings.html'), 'utf8');
  r.managed();
  const dom = new JSDOM(html, { url: 'http://localhost/ycs/settings', runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const window = dom.window;
  window.AbortSignal = AbortSignal;
  window.fetch = async (url, options) => {
    if (options?.method === 'POST') return new Response(JSON.stringify({ error: 'Settings changed elsewhere. Reload before saving.' }), { status: 409 });
    return new Response(JSON.stringify(r.service.snapshot()));
  };
  window.eval(fs.readFileSync(path.join(__dirname, '../public/settings.js'), 'utf8'));
  await new Promise(resolve => setImmediate(resolve));
  const $ = id => window.document.getElementById(id);
  assert.equal($('restart').disabled, false);
  $('graphics-root').value = 'D:/my-draft';
  $('graphics-root').dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal($('restart').disabled, true);
  assert.equal($('save').disabled, false);
  $('settings-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal($('graphics-root').value, 'D:/my-draft');
  assert.match($('message').textContent, /changed elsewhere/);
});

test('settings login middleware leaves Companion token access independent', async t => {
  const r = setup(t), app = express();
  r.config.general.dataroot = path.join(r.root, 'data');
  r.config.general.username = 'operator';
  r.config.ycs.stages = [];
  r.config.ycs.dataFile = path.join(r.root, 'sources.json');
  fs.mkdirSync(r.config.general.dataroot);
  fs.writeFileSync(r.configFile, JSON.stringify(r.config));
  app.use(express.json());
  const playback = require('../index.cjs')(app, r.config, {
    configFile: r.configFile, settings: { root: r.root, env: {} },
    auth: { CheckLogin: (req, res) => res.status(401).json({ error: 'Operator login required' }) }
  });
  t.after(() => playback.close());
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { Authorization: 'Bearer existing-companion-secret' };
  assert.equal((await fetch(base + '/api/ycs/stages', { headers })).status, 200);
  assert.equal((await fetch(base + '/api/ycs/settings', { headers })).status, 401);
  assert.equal((await fetch(base + '/ycs/settings')).status, 401);
});

test('damaged credentials never prevent startup and can be replaced or cleared in settings', async t => {
  const r = setup(t);
  fs.writeFileSync(credentialFile(r.configFile), '{broken');
  const service = new Settings(r.options);
  assert.equal(service.snapshot().key.saved, true);
  assert.match(service.snapshot().key.error, /invalid/);
  const reader = createSheets({ enabled: true }, { env: {}, keyFile: credentialFile(r.configFile) });
  await assert.rejects(reader.read({}), /invalid/);
  const draft = () => ({ ...service.snapshot().values, revision: service.snapshot().revision });
  await service.save({ ...draft(), graphicsRoot: 'C:/new' });
  assert.equal(fs.readFileSync(credentialFile(r.configFile), 'utf8'), '{broken', 'unrelated saves do not silently remove damaged credentials');
  await service.save({ ...draft(), key: 'replacement-key', sheetsAPI: { enabled: true } });
  assert.equal(service.snapshot().key.error, '');
  assert.ok(createSheets({ enabled: true }, { env: {}, keyFile: credentialFile(r.configFile) }) instanceof GoogleSheetsAPI);
  fs.writeFileSync(credentialFile(r.configFile), '{broken again');
  await service.save({ ...draft(), sheetsAPI: { enabled: false }, clearKey: true });
  assert.equal(service.snapshot().key.saved, false);
  assert.equal(service.snapshot().key.error, '');
  assert.doesNotMatch(JSON.stringify(service.snapshot()), /replacement-key|broken again/);
});

test('server registration succeeds with a damaged key even when the API reader is enabled', async t => {
  const r = setup(t);
  fs.writeFileSync(credentialFile(r.configFile), '{broken');
  r.config.general.dataroot = path.join(r.root, 'data');
  r.config.ycs.stages = [];
  r.config.ycs.sheetsAPI = { enabled: true };
  r.config.ycs.dataFile = path.join(r.root, 'sources.json');
  fs.mkdirSync(r.config.general.dataroot);
  fs.writeFileSync(r.configFile, JSON.stringify(r.config));
  const app = express(); app.use(express.json());
  const playback = require('../index.cjs')(app, r.config, { configFile: r.configFile, settings: { root: r.root }, auth: { CheckLogin: (req, res, next) => next() } });
  t.after(() => playback.close());
  await new Promise(resolve => setImmediate(resolve));
});

test('missing restart helper releases playback without requiring settings polling', async t => {
  const r = setup(t); r.managed();
  await assert.rejects(r.service.restart(), /helper/);
  assert.equal(r.playback.restartPending, false);
  assert.equal(r.service.queued, null);
});

test('restart readiness timeout cannot stop SPX and releases playback', async t => {
  const r = setup(t, { restartTimeout: 150 }); r.managed();
  fs.mkdirSync(path.join(r.root, 'ycs'));
  fs.writeFileSync(path.join(r.root, 'ycs/package.json'), '{"type":"commonjs"}');
  fs.writeFileSync(path.join(r.root, 'ycs/restart-runtime.cjs'), 'setInterval(()=>{},1000);');
  await assert.rejects(r.service.restart(), /helper/);
  assert.equal(r.playback.restartPending, false);
  await new Promise(resolve => setTimeout(resolve, 100));
});

test('helper crash after readiness automatically releases playback without a status-file update', async t => {
  const r = setup(t); r.managed();
  fs.mkdirSync(path.join(r.root, 'ycs'));
  fs.writeFileSync(path.join(r.root, 'ycs/package.json'), '{"type":"commonjs"}');
  fs.writeFileSync(path.join(r.root, 'ycs/restart-runtime.cjs'), `
    process.send({type:'ready',requestId:process.argv[4]});
    process.on('message',()=>process.exit(1));
  `);
  await r.service.restart();
  for (let i = 0; i < 100 && r.playback.restartPending; i++) await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(r.playback.restartPending, false);
  assert.equal(r.service.queued, null);
});

test('stock settings and recents transactions preserve a concurrent YCS save', async t => {
  const r = setup(t);
  let handler;
  const source = fs.readFileSync(path.join(__dirname, '../../routes/routes-application.js'), 'utf8');
  const start = source.indexOf("router.post('/gc/saveConfigChanges',");
  const end = source.indexOf('}); // saveConfigChanges ended', start) + '}); // saveConfigChanges ended'.length;
  const context = { router: { post(url, auth, callback) { handler = callback; } }, spxAuth: { CheckLogin() {} },
    logger: { verbose() {}, error() {} }, configfileref: r.configFile, configStore, console };
  context.global = context;
  vm.runInNewContext(source.slice(start, end), context);
  const current = r.input();
  const saved = r.service.save({ ...current, graphicsRoot: 'C:/YCS-new' });
  await Promise.resolve();
  const stock = handler({ body: { key: 'greeting', val: 'New greeting' } }, { status() { return this; }, send() {} });
  await Promise.all([saved, stock]);
  await configStore.update(r.configFile, value => { value.general.recents = ['Project/Show']; });
  const config = JSON.parse(fs.readFileSync(r.configFile));
  assert.equal(config.ycs.graphicsRoot, 'C:/YCS-new');
  assert.equal(config.general.greeting, 'New greeting');
  assert.deepEqual(config.general.recents, ['Project/Show']);
  assert.equal(config.ycs.apiKey, 'existing-companion-secret');
});

test('settings restart reports a login redirect from the restarted server instead of waiting for it', async t => {
  const r = setup(t), html = fs.readFileSync(path.join(__dirname, '../public/settings.html'), 'utf8');
  r.managed();
  const dom = new JSDOM(html, { url: 'http://localhost/ycs/settings', runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const window = dom.window;
  window.AbortSignal = AbortSignal;
  window.HTMLDialogElement.prototype.showModal = function () {};
  window.HTMLDialogElement.prototype.close = function () {};
  const schedule = window.setTimeout.bind(window);
  window.setTimeout = (callback, ms) => schedule(callback, ms / 100);
  let restarted = false;
  window.fetch = async (url, options) => {
    if (options?.method === 'POST') { restarted = true; return new Response(JSON.stringify({ accepted: true, instance: r.service.instance }), { status: 202 }); }
    // The new server has no session: CheckLogin redirects to the login page (200 HTML).
    if (restarted) return { ok: true, status: 200, redirected: true, url: 'http://localhost/login', json: async () => { throw new SyntaxError('Unexpected token <'); } };
    return new Response(JSON.stringify(r.service.snapshot()));
  };
  window.eval(fs.readFileSync(path.join(__dirname, '../public/settings.js'), 'utf8'));
  await new Promise(resolve => setImmediate(resolve));
  const $ = id => window.document.getElementById(id);
  $('confirm-restart').click();
  for (let index = 0; index < 100 && !/Sign in/.test($('message').textContent); index++)
    await new Promise(resolve => setTimeout(resolve, 20));
  assert.match($('message').textContent, /SPX restarted\. Sign in again/);
  assert.equal($('message').classList.contains('error'), true);
});
