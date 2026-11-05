'use strict';
// Regression tests for the reviewers' on-air command repros (stopfail.sh,
// race.cjs, hang.sh, restartlock.cjs, authswap.sh and the item-route errors).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const express = require('express');
const session = require('express-session');
const register = require('../index.cjs');
const { Settings } = require('../settings.cjs');
const { fixture } = require('./playback.test.cjs');

const posix = process.platform !== 'win32';
const quiet = (t) => {
  const warn = console.warn;
  console.warn = () => {};
  t.after(() => { console.warn = warn; });
};
function within(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' did not finish within ' + ms + ' ms')), ms); })
  ]).finally(() => clearTimeout(timer));
}
async function server(t, { apiKey, fallback = true, auth, sessions, before } = {}) {
  const f = await fixture(t);
  before?.(f);
  const app = express();
  app.use(express.json());
  if (sessions) app.use(sessions);
  const config = {
    general: { dataroot: f.root, username: '' },
    ycs: {
      enabled: true,
      dataFile: path.join(f.root, 'sources.json'),
      stages: f.stages,
      slots: { ticker: { order: 10 }, 'lower-third': { order: 20 } },
      ...(apiKey ? { apiKey } : {})
    }
  };
  const previous = global.config;
  global.config = config;
  t.after(() => { global.config = previous; });
  const playback = register(app, config, { auth: auth || { CheckLogin: (req, res, next) => next() } });
  if (fallback) app.use((error, req, res, next) => res.status(error.status || 500).json({ error: error.message }));
  const listener = http.createServer(app);
  await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve));
  await playback.sources.ready;
  t.after(async () => {
    playback.close();
    listener.closeAllConnections?.();
    await new Promise((resolve) => listener.close(resolve));
  });
  const base = 'http://127.0.0.1:' + listener.address().port;
  const post = (target, body = {}, headers = {}) =>
    fetch(base + target, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  return { ...f, config, playback, base, post };
}

test('Stop, Toggle and Stop stage take graphics off air when the rundown cannot be written or parsed', { skip: !posix }, async (t) => {
  quiet(t);
  const { playback, repository, root } = await fixture(t);
  const folder = path.join(root, 'Stage1', 'data');
  t.after(() => { try { fs.chmodSync(folder, 0o755); } catch { /* already removed */ } });
  for (const id of ['ticker', 'lower-third']) await playback.command('stage-1', id, 'play');
  fs.chmodSync(folder, 0o555); // a locked share or AV-held rename
  await playback.command('stage-1', 'ticker', 'stop');
  assert.deepEqual(playback.snapshot('stage-1', 'program').graphics.map((g) => g.id), ['lower-third']);
  await playback.command('stage-1', 'lower-third', 'toggle');
  assert.equal(playback.snapshot('stage-1', 'program').graphics.length, 0);
  await playback.command('stage-1', 'ticker', 'play');
  fs.chmodSync(folder, 0o755);
  fs.writeFileSync(repository.stage('stage-1').file, '{"templates":[{"itemID":'); // truncated by a stock write
  await playback.command('stage-1', 'ticker', 'stop');
  assert.equal(playback.snapshot('stage-1', 'program').graphics.length, 0);
  await playback.command('stage-2', 'ticker', 'play');
  fs.writeFileSync(repository.stage('stage-2').file, 'not json');
  await playback.clear('stage-2');
  assert.equal(playback.snapshot('stage-2', 'program').graphics.length, 0);
  playback.close();
});

test('onair flags are saved after a failed write once the disk recovers', async (t) => {
  quiet(t);
  const { playback, repository } = await fixture(t);
  await playback.command('stage-1', 'ticker', 'play');
  const write = repository.write.bind(repository);
  let failing = true;
  repository.write = (...args) => (failing ? Promise.reject(new Error('EBUSY')) : write(...args));
  await playback.command('stage-1', 'ticker', 'stop');
  assert.equal((await repository.read('stage-1')).templates[0].onair, 'true', 'the write failed');
  failing = false;
  for (let index = 0; index < 60 && (await repository.read('stage-1')).templates[0].onair !== 'false'; index++)
    await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal((await repository.read('stage-1')).templates[0].onair, 'false');
  playback.close();
});

test('a rundown read that catches a half-written stock save retries instead of failing', async (t) => {
  const { playback, repository } = await fixture(t);
  const file = repository.stage('stage-1').file;
  const full = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, full.slice(0, Math.floor(full.length / 2)));
  setTimeout(() => fs.writeFileSync(file, full), 25);
  const rundown = await repository.read('stage-1');
  assert.equal(rundown.templates.length, 3);
  await playback.command('stage-1', 'ticker', 'play');
  assert.equal(playback.snapshot('stage-1', 'program').graphics.length, 1);
});

test('rundown writes use the shared rename retry and the cache serves unchanged files', async (t) => {
  const { repository } = await fixture(t);
  const first = await repository.read('stage-1');
  first.templates[0].ycsNickname = 'Cached';
  assert.equal((await repository.read('stage-1')).templates[0].ycsNickname, undefined, 'callers get copies');
  const rename = fsp.rename;
  let attempts = 0;
  fsp.rename = async (...args) => {
    if (attempts++ === 0) throw Object.assign(new Error('busy'), { code: 'EPERM' });
    return rename(...args);
  };
  t.after(() => { fsp.rename = rename; });
  await repository.write('stage-1', first);
  assert.equal(attempts, 2);
  assert.equal((await repository.read('stage-1')).templates[0].ycsNickname, 'Cached');
  assert.equal(repository.peek('stage-1').templates[0].ycsNickname, 'Cached');
  assert.deepEqual(fs.readdirSync(path.dirname(repository.stage('stage-1').file)), ['Show.json']);
});

test('a stalled profile read on one stage does not freeze data polls or another stage', { skip: !posix }, async (t) => {
  quiet(t);
  const r = await server(t);
  assert.equal((await r.post('/api/ycs/stages/stage-2/graphics/ticker/play')).status, 200);
  assert.equal((await r.post('/api/ycs/stages/stage-1/graphics/ticker/play')).status, 200);
  const profile = path.join(r.root, 'Stage1', 'profile.json');
  execFileSync('mkfifo', [profile]); // a read that never completes, like a hung SMB open
  // Release every reader still blocked on the FIFO so the process can exit.
  // (Runs in the test body: the fixture's cleanup would unlink the FIFO first.)
  const release = () => {
    for (let index = 0; index < 50; index++) {
      let fd;
      try { fd = fs.openSync(profile, fs.constants.O_WRONLY | fs.constants.O_NONBLOCK); }
      catch { break; }
      try { fs.writeSync(fd, '{"templates":[]}'); } catch { /* reader closed */ }
      fs.closeSync(fd);
    }
  };
  try {
    const polls = Array.from({ length: 6 }, () => within(fetch(r.base + '/api/ycs/data'), 4000, 'data poll'));
    for (const response of await Promise.all(polls)) assert.equal(response.status, 200);
    const responses = await within(Promise.all([
      r.post('/api/ycs/stages/stage-2/graphics/ticker/stop'),
      r.post('/api/ycs/stages/stage-1/graphics/ticker/stop'),
      r.post('/api/ycs/stages/stage-2/graphics/lower-third/play'),
      fetch(r.base + '/api/ycs/data')
    ]), 4000, 'commands on other files');
    assert.deepEqual(responses.map((response) => response.status), [200, 200, 200, 200]);
    assert.equal(r.playback.snapshot('stage-1', 'program').graphics.length, 0);
    assert.deepEqual(r.playback.snapshot('stage-2', 'program').graphics.map((g) => g.id), ['lower-third']);
    assert.equal([...(r.playback.repository.loading?.keys() || [])].filter((file) => file === profile).length, 1, 'one read in flight');
    // Play on the stalled stage fails within the read timeout instead of hanging its queue.
    const play = await within(r.post('/api/ycs/stages/stage-1/graphics/ticker/play'), 4500, 'play on stalled stage');
    assert.equal(play.status, 503);
  } finally {
    release();
    await new Promise((resolve) => setTimeout(resolve, 50));
    release();
  }
});

test('restart gives up on a stuck stage, releases the gate, and Stop works while a restart is pending', async (t) => {
  const { playback, root } = await fixture(t);
  const configFile = path.join(root, 'cfg.json');
  fs.writeFileSync(configFile, JSON.stringify({ general: {}, ycs: { enabled: true } }));
  fs.mkdirSync(path.join(root, '.local'), { recursive: true });
  fs.writeFileSync(path.join(root, '.local/runtime-process.json'), JSON.stringify({ id: process.pid, executable: process.execPath, configuration: configFile, startTicks: '123' }));
  let launched = false;
  const settings = new Settings({ configFile, config: { ycs: {} }, playback, root, platform: 'win32', busyTimeout: 150, restart: async () => { launched = true; } });
  let unstick;
  playback.queue('stage-1', () => new Promise((resolve) => (unstick = resolve)));
  const restart = settings.restart().then(() => 'accepted', (error) => error.status + ' ' + error.message);
  assert.match(await within(restart, 1500, 'restart'), /^409 A stage is busy/);
  assert.equal(launched, false);
  assert.equal(playback.restartPending, false);
  await within(playback.command('stage-2', 'ticker', 'play'), 1000, 'stage-2 play');
  unstick();
  // Stop and Stop stage only take graphics off air, so a pending restart allows them.
  playback.restartPending = true;
  await assert.rejects(playback.command('stage-2', 'lower-third', 'play'), { status: 503 });
  await playback.command('stage-2', 'ticker', 'toggle');
  assert.equal(playback.snapshot('stage-2', 'program').graphics.length, 0);
  playback.restartPending = false;
  await playback.command('stage-2', 'ticker', 'play');
  playback.restartPending = true;
  await playback.command('stage-2', 'ticker', 'stop');
  await playback.clear('stage-2');
  assert.equal(playback.snapshot('stage-2', 'program').graphics.length, 0);
  playback.restartPending = false;
});

test('a repeated Toggle or Continue for the same item within the window is ignored', async (t) => {
  const { playback, repository } = await fixture(t);
  const show = await repository.read('stage-1');
  show.templates[0].steps = 3;
  await repository.write('stage-1', show);
  let now = 1000;
  playback.now = () => now;
  await playback.command('stage-1', 'ticker', 'toggle');
  const repeat = await playback.command('stage-1', 'ticker', 'toggle');
  assert.equal(repeat.repeated, true);
  assert.equal(playback.snapshot('stage-1', 'program').graphics.length, 1, 'double press keeps it on air');
  // Another item and another stage are independent.
  await playback.command('stage-1', 'lower-third', 'toggle');
  await playback.command('stage-2', 'ticker', 'toggle');
  assert.equal(playback.snapshot('stage-1', 'program').graphics.length, 2);
  assert.equal(playback.snapshot('stage-2', 'program').graphics.length, 1);
  await playback.command('stage-1', 'ticker', 'continue');
  await playback.command('stage-1', 'ticker', 'continue');
  assert.equal(playback.snapshot('stage-1', 'program').graphics[0].continuation, 1);
  now += 450;
  await playback.command('stage-1', 'ticker', 'continue');
  assert.equal(playback.snapshot('stage-1', 'program').graphics[0].continuation, 2);
  await playback.command('stage-1', 'ticker', 'toggle');
  assert.deepEqual(playback.snapshot('stage-1', 'program').graphics.map((g) => g.id), ['lower-third']);
  // Play and Stop stay idempotent and are never suppressed.
  await playback.command('stage-1', 'ticker', 'play');
  await playback.command('stage-1', 'ticker', 'stop');
  assert.deepEqual(playback.snapshot('stage-1', 'program').graphics.map((g) => g.id), ['lower-third']);
});

test('changing the SPX login at runtime applies to command and output access without a restart', async (t) => {
  const sessions = session({ secret: 'isolated-test-session-secret', resave: false, saveUninitialized: false });
  const r = await server(t, {
    apiKey: 'companion-key',
    sessions,
    auth: { CheckLogin: (req, res, next) => { req.session.user = req.query.as || 'default'; next(); } }
  });
  const login = async (as) => {
    const query = as ? '?as=' + as : '';
    const page = await fetch(r.base + '/output/stage-1/program' + query);
    const Cookie = page.headers.get('set-cookie').split(';')[0];
    // Operator access comes from opening an operator page, not an output page.
    await fetch(r.base + '/ycs/data-manager' + query, { headers: { Cookie } });
    return { Cookie, Origin: r.base };
  };
  const report = (headers) => r.post('/api/ycs/stages/stage-1/program/report', { id: 'swap', state: 'ready', revision: 0 }, headers);
  const before = await login();
  assert.equal((await fetch(r.base + '/api/ycs/data', { headers: before })).status, 200);
  // Stock /saveauthpolicy goes through config-store, which replaces global.config.
  global.config = { ...r.config, general: { ...r.config.general, username: 'op', password: 'hash' } };
  assert.equal((await fetch(r.base + '/api/ycs/data', { headers: before })).status, 401, 'old no-login session');
  assert.equal((await report(before)).status, 401);
  const operator = await login('op');
  assert.equal((await fetch(r.base + '/api/ycs/data', { headers: operator })).status, 200);
  assert.equal((await report(operator)).status, 204);
  assert.equal((await fetch(r.base + '/api/Stage1/Show/ticker/stop', { headers: { Authorization: 'Bearer companion-key' } })).status, 200);
});

test('Companion item-route errors are JSON without stack traces or paths', async (t) => {
  quiet(t);
  const r = await server(t, { fallback: false });
  const missing = await fetch(r.base + '/api/Stage1/Show/missing/play');
  assert.equal(missing.status, 404);
  assert.match(missing.headers.get('content-type'), /json/);
  assert.deepEqual(await missing.json(), { error: 'Unknown graphic' });
  fs.writeFileSync(r.repository.stage('stage-1').file, '{');
  const broken = await fetch(r.base + '/api/Stage1/Show/ticker/play');
  assert.equal(broken.status, 500);
  const body = await broken.text();
  assert.deepEqual(JSON.parse(body), { error: 'Stage operation failed; program state retained' });
  assert.doesNotMatch(body, new RegExp(r.root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});
