'use strict';
// Restart recovery: a crash or kill inside the window puts back exactly what
// was on air; a graceful stop, a long outage or a damaged state file starts clean.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const express = require('express');
const register = require('../index.cjs');
const { fixture } = require('./playback.test.cjs');

function capture(t) {
  const lines = [];
  const original = { log: console.log, warn: console.warn, error: console.error };
  for (const level of Object.keys(original)) console[level] = (...args) => lines.push(args.join(' '));
  t.after(() => Object.assign(console, original));
  return lines;
}
async function eventually(check, label, timeout = 3000) {
  const end = Date.now() + timeout;
  for (;;) {
    let value;
    try { value = await check(); } catch { /* not yet */ }
    if (value) return value;
    if (Date.now() > end) assert.fail('Timed out: ' + label);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
const stateFile = (f) => path.join(f.root, 'sources.program-state.json');
const rundownFile = (f, number = 1) => path.join(f.root, `Stage${number}`, 'data', 'Show.json');
const readJSON = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));

// One server run over a shared show folder. close() is a crash (nothing is
// recorded); shutdown() is a deliberate stop.
async function boot(t, f, { within, stopMarker = null, onCreate } = {}) {
  const app = express();
  app.use(express.json());
  const ycs = { enabled: true, dataFile: path.join(f.root, 'sources.json'), stages: f.stages, slots: { ticker: { order: 10 }, 'lower-third': { order: 20 } } };
  if (within !== undefined) ycs.restoreProgramWithinSeconds = within;
  const config = { general: { dataroot: f.root, username: '' }, ycs };
  const previous = global.config;
  global.config = config;
  const playback = register(app, config, { stopMarker, auth: { CheckLogin: (req, res, next) => next() } });
  onCreate?.(playback);
  app.use((error, req, res, next) => res.status(error.status || 500).json({ error: error.message }));
  const listener = http.createServer(app);
  await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + listener.address().port;
  let open = true;
  const stopListening = async () => {
    if (!open) return;
    open = false;
    global.config = previous;
    listener.closeAllConnections?.();
    await new Promise((resolve) => listener.close(resolve));
  };
  t.after(async () => { playback.close(); await stopListening(); });
  await playback.sources.ready;
  await playback.ready;
  const call = async (route, body) => {
    const response = await fetch(base + route, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };
  return {
    playback, call,
    command: (stage, graphic, action, body = {}) => call(`/api/ycs/stages/${stage}/graphics/${graphic}/${action}`, body),
    program: async (stage = 'stage-1') => (await call(`/api/ycs/stages/${stage}/program/state`)).body,
    health: async (stage = 'stage-1') => (await call(`/api/ycs/stages/${stage}/health`)).body,
    // Wait until the state file holds this run's current program.
    async saved() {
      return eventually(async () => {
        const state = await readJSON(stateFile(f));
        return state.pid === process.pid && state.startedAt === playback.recovery.startedAt &&
          [...playback.states].every(([id, current]) => JSON.stringify(state.stages[id].program) === JSON.stringify(current.program)) && state;
      }, 'program state saved');
    },
    async crash() { playback.close(); await stopListening(); },
    async shutdown() { await playback.shutdown(); await stopListening(); }
  };
}
async function onair(f, number = 1) {
  return Object.fromEntries((await readJSON(rundownFile(f, number))).templates.map((item) => [item.itemID, item.onair]));
}
async function backdate(f, ms) {
  const state = await readJSON(stateFile(f));
  state.heartbeat -= ms;
  await fs.writeFile(stateFile(f), JSON.stringify(state));
}

test('a crash inside the window restores each stage exactly, with continuation, revision, notice and onair flags', async (t) => {
  const logs = capture(t);
  const f = await fixture(t);
  // A stepped lower third, so the continuation step is part of what is restored.
  const rundown = await readJSON(rundownFile(f));
  rundown.templates.find((item) => item.itemID === 'lower-third').steps = '3';
  await fs.writeFile(rundownFile(f), JSON.stringify(rundown));
  const first = await boot(t, f);
  assert.equal((await first.command('stage-1', 'ticker', 'play', { fields: [{ field: 'f5', value: 'LIVE ROUND 7' }] })).status, 200);
  assert.equal((await first.command('stage-1', 'lower-third', 'play')).status, 200);
  await first.command('stage-1', 'lower-third', 'continue');
  await new Promise((resolve) => setTimeout(resolve, 450)); // past the repeat window
  await first.command('stage-1', 'lower-third', 'continue');
  await first.command('stage-2', 'ticker', 'play');
  await first.command('stage-1', 'other-name', 'preview');
  const before = { one: await first.program('stage-1'), two: await first.program('stage-2'), preview: (await first.call('/api/ycs/stages/stage-1/preview/state')).body };
  assert.equal(before.one.graphics.find((graphic) => graphic.id === 'lower-third').continuation, 2);
  await first.saved();
  await first.crash();

  // While the server is down, the rundown goes stale: an old value and no onair flags.
  const stale = await readJSON(rundownFile(f));
  for (const item of stale.templates) item.onair = 'false';
  stale.templates.find((item) => item.itemID === 'ticker').DataFields.find((field) => field.field === 'f5').value = 'STALE ROUND';
  await fs.writeFile(rundownFile(f), JSON.stringify(stale));

  const second = await boot(t, f);
  const one = await second.program('stage-1');
  assert.deepEqual(one.graphics, before.one.graphics, 'restored program matches the snapshot, not the stale rundown');
  assert.equal(one.graphics.find((graphic) => graphic.id === 'ticker').data.f5, 'LIVE ROUND 7');
  assert.ok(one.revision > before.one.revision, 'restored revision continues past the saved one');
  assert.deepEqual((await second.program('stage-2')).graphics, before.two.graphics);
  assert.deepEqual((await second.program('stage-3')).graphics, []);
  assert.deepEqual((await second.call('/api/ycs/stages/stage-1/preview/state')).body.graphics, before.preview.graphics, 'preview draft is restored too');
  assert.deepEqual(await eventually(async () => { const flags = await onair(f); return flags.ticker === 'true' && flags; }, 'onair flags restored'),
    { ticker: 'true', 'lower-third': 'true', 'other-name': 'false' });

  const notice = (await second.health('stage-1')).restored;
  assert.equal(notice.graphics, 2);
  assert.ok(Number.isInteger(notice.downtimeSeconds) && notice.downtimeSeconds >= 0 && notice.downtimeSeconds < 10);
  assert.equal((await second.health('stage-2')).restored.graphics, 1);
  assert.equal((await second.health('stage-3')).restored, null, 'a stage with nothing on air shows no notice');
  assert.ok(logs.some((line) => /\[YCS restore\] stage-1: restored 2 graphics \(ticker, lower-third\); the server was down \d+ s, within the 120 s window/.test(line)), logs.join('\n'));

  // Restored graphics behave like any other: Continue keeps stepping, Stop works.
  await second.command('stage-1', 'lower-third', 'continue');
  assert.equal((await second.program('stage-1')).graphics.find((graphic) => graphic.id === 'lower-third').continuation, 3);
  assert.equal((await second.health('stage-1')).restored, null, 'the next Program command clears the notice');
  assert.equal((await second.call('/api/ycs/stages/stage-2/restored/dismiss', {})).status, 200);
  assert.equal((await second.health('stage-2')).restored, null, 'dismiss clears the notice');
  assert.deepEqual((await second.program('stage-2')).graphics, before.two.graphics, 'dismissing changes nothing on air');
  await second.command('stage-1', 'ticker', 'stop');
  assert.deepEqual((await second.program('stage-1')).graphics.map((graphic) => graphic.id), ['lower-third']);
});

test('a restart after the window starts clean and clears stale onair flags', async (t) => {
  const logs = capture(t);
  const f = await fixture(t);
  const first = await boot(t, f);
  await first.command('stage-1', 'ticker', 'play');
  await first.command('stage-1', 'lower-third', 'play');
  await first.saved();
  await first.crash();
  assert.equal((await onair(f)).ticker, 'true');
  await backdate(f, 125000);
  const second = await boot(t, f);
  assert.deepEqual((await second.program('stage-1')).graphics, []);
  assert.equal((await second.health('stage-1')).restored, null);
  await eventually(async () => Object.values(await onair(f)).every((flag) => flag === 'false'), 'stale onair flags cleared');
  assert.ok(logs.some((line) => /Starting with program stopped: the server was down 12\d s, longer than the 120 s window/.test(line)), logs.join('\n'));
  // The new run records itself, so a later crash restores the new program.
  await second.command('stage-1', 'ticker', 'play');
  await second.saved();
});

test('a graceful shutdown or a launcher stop starts clean, however quickly the server returns', async (t) => {
  const logs = capture(t);
  const f = await fixture(t);
  const first = await boot(t, f);
  await first.command('stage-1', 'ticker', 'play');
  await first.saved();
  await first.shutdown();
  assert.equal((await readJSON(stateFile(f))).clean, true);
  const second = await boot(t, f);
  assert.deepEqual((await second.program('stage-1')).graphics, []);
  await eventually(async () => (await onair(f)).ticker === 'false', 'onair flag cleared');
  assert.ok(logs.some((line) => /Starting with program stopped: the previous run stopped cleanly/.test(line)));

  // The Windows stop script cannot signal Node; it leaves a marker naming the process.
  const marker = path.join(f.root, 'runtime-stopped.json');
  await second.command('stage-1', 'ticker', 'play');
  await second.saved();
  await second.crash();
  await fs.writeFile(marker, JSON.stringify({ id: process.pid + 1, stoppedAt: Date.now() }));
  const third = await boot(t, f, { stopMarker: marker });
  assert.equal((await third.program('stage-1')).graphics.length, 1, 'a marker for another process does not count');
  assert.ok(await fs.stat(marker));
  await third.saved();
  await third.crash();
  await fs.writeFile(marker, JSON.stringify({ id: process.pid, stoppedAt: Date.now() }));
  const fourth = await boot(t, f, { stopMarker: marker });
  assert.deepEqual((await fourth.program('stage-1')).graphics, []);
  await assert.rejects(fs.stat(marker), { code: 'ENOENT' }, 'a matched marker is used once');
  assert.ok(logs.some((line) => /Starting with program stopped: the launcher stopped the previous run/.test(line)));
});

test('restoreProgramWithinSeconds 0 disables restoration', async (t) => {
  const logs = capture(t);
  const f = await fixture(t);
  const first = await boot(t, f, { within: 0 });
  await first.command('stage-1', 'ticker', 'play');
  await first.saved();
  await first.crash();
  const second = await boot(t, f, { within: 0 });
  assert.deepEqual((await second.program('stage-1')).graphics, []);
  assert.ok(logs.some((line) => /restoration is disabled \(ycs.restoreProgramWithinSeconds is 0\)/.test(line)));
  // An invalid value falls back to the default window rather than disabling it.
  await second.command('stage-1', 'ticker', 'play');
  await second.saved();
  await second.crash();
  const third = await boot(t, f, { within: 'soon' });
  assert.equal((await third.program('stage-1')).graphics.length, 1);
  assert.ok(logs.some((line) => /must be a number of seconds, or 0 to disable; using 120/.test(line)));
});

test('a missing, corrupt or damaged state file starts clean and never stops the server', async (t) => {
  const logs = capture(t);
  const f = await fixture(t);
  const first = await boot(t, f);
  assert.deepEqual((await first.program('stage-1')).graphics, []);
  assert.ok(logs.some((line) => /Starting with program stopped: no saved program state/.test(line)));
  await first.command('stage-1', 'ticker', 'play');
  await first.command('stage-2', 'ticker', 'play');
  const good = await first.saved();
  await first.crash();
  const now = Date.now();
  const cases = [
    ['truncated JSON', JSON.stringify(good).slice(0, 40)],
    ['empty file', ''],
    ['null', 'null'],
    ['another version', JSON.stringify({ ...good, version: 99 })],
    ['no heartbeat', JSON.stringify({ ...good, heartbeat: 'yesterday' })]
  ];
  for (const [label, text] of cases) {
    await fs.writeFile(stateFile(f), text);
    const run = await boot(t, f);
    for (const stage of ['stage-1', 'stage-2']) assert.deepEqual((await run.program(stage)).graphics, [], label);
    assert.equal((await run.command('stage-1', 'lower-third', 'play')).status, 200, label + ': commands still work');
    await run.saved();
    await run.crash();
  }
  // One damaged stage starts clean; the others still restore.
  const damaged = structuredClone(good);
  damaged.heartbeat = now;
  damaged.stages['stage-1'].program = [{ id: 'ticker', slot: 'ticker', template: 'javascript:alert(1)', data: {} }];
  await fs.writeFile(stateFile(f), JSON.stringify(damaged));
  const partial = await boot(t, f);
  assert.deepEqual((await partial.program('stage-1')).graphics, []);
  assert.deepEqual((await partial.program('stage-2')).graphics, good.stages['stage-2'].program);
  assert.ok(logs.some((line) => /stage-1: saved program is damaged; this stage starts clean/.test(line)));
  await partial.crash();
  // A state path that cannot be read at all (a folder) starts clean too.
  await fs.rm(stateFile(f));
  await fs.mkdir(stateFile(f));
  const blocked = await boot(t, f);
  assert.deepEqual((await blocked.program('stage-2')).graphics, []);
  assert.equal((await blocked.command('stage-2', 'ticker', 'play')).status, 200, 'a failed state write never affects a command');
  assert.ok(logs.some((line) => /could not save program state/.test(line)));
});

test('linked data updates after a restore follow the diffed path without remounting the graphic', async (t) => {
  capture(t);
  const f = await fixture(t);
  const first = await boot(t, f);
  // The fixture's data file maps ticker f5 on each stage to a test source.
  assert.equal((await first.command('stage-1', 'ticker', 'play', { links: { f5: { mode: 'linked', manual: 'MANUAL' } } })).status, 200);
  const before = await first.program('stage-1');
  assert.equal(before.graphics[0].data.f5, 'SWISS ROUND 11 OF 15');
  await first.saved();
  await first.crash();
  // The source changes during the outage.
  const data = await readJSON(path.join(f.root, 'sources.json'));
  data.sources['test.stage-1.currentRound'].value = 'SWISS ROUND 12 OF 15';
  data.revision++;
  await fs.writeFile(path.join(f.root, 'sources.json'), JSON.stringify(data));

  const published = [];
  const second = await boot(t, f, { onCreate: (playback) => playback.on('stage-1:program', (snapshot) => published.push(snapshot)) });
  await eventually(async () => (await second.program('stage-1')).graphics[0].data.f5 === 'SWISS ROUND 12 OF 15', 'outage value applied');
  // The first snapshot any output could see is the saved one; the change follows as a data update.
  assert.deepEqual(published[0].graphics, before.graphics);
  assert.deepEqual(published.at(-1).graphics.map(({ data, ...rest }) => rest), before.graphics.map(({ data, ...rest }) => rest), 'only data changed');
  // And a live update after the restore uses the same path.
  const revision = (await second.call('/api/ycs/data')).body.revision;
  assert.equal((await second.call('/api/ycs/data/source', { id: 'test.stage-1.currentRound', value: 'SWISS ROUND 13 OF 15', revision })).status, 200);
  await eventually(async () => (await second.program('stage-1')).graphics[0].data.f5 === 'SWISS ROUND 13 OF 15', 'live value applied');
  assert.equal((await second.health('stage-1')).restored.graphics, 1, 'a data update is not an operator command');
});

test('outputs and commands wait for the restore decision instead of seeing an empty program', async (t) => {
  capture(t);
  const f = await fixture(t);
  const first = await boot(t, f);
  await first.command('stage-1', 'ticker', 'play');
  await first.saved();
  await first.crash();
  // Hold the state file read, as a slow disk would.
  const fsp = require('node:fs/promises');
  const read = fsp.readFile;
  let release;
  const held = new Promise((resolve) => (release = resolve));
  fsp.readFile = async (file, ...args) => { if (String(file) === stateFile(f)) await held; return read(file, ...args); };
  t.after(() => { fsp.readFile = read; });
  let playback;
  const pending = boot(t, f, { onCreate: (created) => (playback = created) });
  await eventually(() => playback, 'server created');
  const early = playback.command('stage-1', 'ticker', 'stop');
  let settled = false;
  early.then(() => (settled = true), () => (settled = true));
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(settled, false, 'commands queue behind the restore decision');
  fsp.readFile = read;
  release();
  const second = await pending;
  await early;
  assert.deepEqual((await second.program('stage-1')).graphics, [], 'the queued Stop applied to the restored program');
  assert.equal((await onair(f)).ticker, 'false');
});
