'use strict';
const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs/promises'),
  path = require('node:path'),
  http = require('node:http');
const express = require('express'),
  { Server } = require('socket.io');
const client = require(
  path.join(path.dirname(require.resolve('socket.io')), '../client-dist/socket.io.js')
);
const register = require('../index.cjs'),
  { fixture } = require('./playback.test.cjs'),
  contract = require('../public/companion-contract.js');
async function setup(t, { apiKey, duplicate = false } = {}) {
  const f = await fixture(t),
    app = express();
  app.use(express.json());
  if (duplicate) f.stages.push({ id: 'duplicate', project: 'Stage1', rundown: 'Show' });
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
  const playback = register(app, config, { auth: { CheckLogin: (req, res, next) => next() } });
  const server = http.createServer(app),
    io = new Server(server);
  playback.attachSockets(io);
  app.use((error, req, res, next) =>
    res.status(error.status || 500).json({ error: error.message })
  );
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  await playback.sources.ready;
  t.after(async () => {
    playback.close();
    await new Promise((resolve) => io.close(resolve));
  });
  const base = 'http://127.0.0.1:' + server.address().port;
  const post = (target, body = {}, headers = {}) =>
    fetch(base + target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body)
    });
  return { ...f, playback, base, post };
}
test('project/rundown item commands use saved values and isolate outputs without guessed IDs', async (t) => {
  const r = await setup(t),
    show = await r.repository.read('stage-1');
  show.templates[0].itemID = '1799991234';
  show.templates[0].steps = 2;
  await r.repository.write('stage-1', show);
  const url = (action) => contract.command('Stage1', 'Show', '1799991234', action).path;
  for (const action of ['play', 'play', 'update', 'continue'])
    assert.equal((await r.post(url(action))).status, 200);
  assert.equal(r.playback.snapshot('stage-1', 'program').graphics[0].id, '1799991234');
  assert.equal(r.playback.snapshot('stage-2', 'program').graphics.length, 0);
  assert.equal((await r.post(url('stop'))).status, 200);
  assert.equal(r.playback.snapshot('stage-1', 'program').graphics.length, 0);
  assert.equal((await r.post(url('update'))).status, 200);
  assert.equal(r.playback.snapshot('stage-1', 'program').graphics.length, 0);
  assert.equal((await r.post(url('toggle'))).status, 200);
  assert.equal(r.playback.snapshot('stage-1', 'program').graphics.length, 1);
  assert.equal((await r.post(url('toggle'))).status, 200);
  assert.equal(r.playback.snapshot('stage-1', 'program').graphics.length, 0);
  assert.equal((await r.post(url('preview'))).status, 200);
  assert.equal(r.playback.snapshot('stage-1', 'preview').selected, '1799991234');
  assert.equal((await r.post('/api/Stage1/Show/ticker/play')).status, 404);
  // Existing editor/control addresses remain compatible.
  assert.equal((await r.post('/api/ycs/stages/stage-2/graphics/ticker/play')).status, 200);
});
test('item commands enforce auth, origin, exact configured scope and saved-data-only requests; exports are gone', async (t) => {
  const r = await setup(t, { apiKey: 'test-only' }),
    url = '/api/Stage1/Show/ticker/play',
    auth = { Authorization: 'Bearer test-only' };
  assert.equal((await r.post(url)).status, 401);
  assert.equal((await r.post(url, {}, { ...auth, Origin: 'https://foreign.invalid' })).status, 403);
  assert.equal((await r.post(url, { fields: [] }, auth)).status, 400);
  assert.equal((await r.post('/api/Stage1/Wrong/ticker/play', {}, auth)).status, 404);
  assert.equal((await r.post('/api/NewProject/Show/ticker/play', {}, auth)).status, 404);
  assert.equal((await r.post('/api/Stage1/Show/ticker/clear', {}, auth)).status, 400);
  assert.equal((await r.post(url, {}, auth)).status, 200);
  for (const target of ['/api/ycs/companion/export', '/api/ycs/stages/stage-1/companion'])
    assert.equal((await fetch(r.base + target, { headers: auth })).status, 404);
  const ambiguous = await setup(t, { duplicate: true });
  assert.equal((await ambiguous.post(url)).status, 409);
  assert.equal(
    contract.command('Stage1', 'Show', 'ticker', 'focus').path,
    '/api/Stage1/Show/ticker/focus'
  );
  for (const id of ['../bad', 'bad/name', '', null])
    assert.throws(() => contract.command(id, 'Show', 'ticker', 'play'));
});
test('focus/select preview saved data and notify only matching controllers, without writes or Program changes', async (t) => {
  const r = await setup(t),
    sockets = [];
  t.after(() => sockets.forEach((s) => s.disconnect()));
  const connect = async (stage, controller) => {
    const socket = client(r.base + '/ycs-playback', {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false
    });
    sockets.push(socket);
    await new Promise((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
    });
    await new Promise((resolve) => {
      socket.once('state', resolve);
      socket.emit('subscribe', { stage, modes: ['preview'], controller });
    });
    return socket;
  };
  const [operator, other, output] = await Promise.all([
    connect('stage-1', true),
    connect('stage-2', true),
    connect('stage-1', false)
  ]);
  let foreign = 0,
    renderer = 0;
  other.on('focus', () => foreign++);
  output.on('focus', () => renderer++);
  await r.playback.command('stage-1', 'ticker', 'preview', [
    { field: 'f5', value: 'UNSAVED SERVER PREVIEW' }
  ]);
  const before = await fs.readFile(r.repository.stage('stage-1').file, 'utf8');
  const program = r.playback.snapshot('stage-1', 'program'),
    preview = r.playback.snapshot('stage-1', 'preview');
  for (const action of ['select', 'focus']) {
    const event = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Focus event timeout')), 2000);
      operator.once('focus', (value) => {
        clearTimeout(timer);
        resolve(value);
      });
    });
    const response = await r.post('/api/Stage1/Show/lower-third/' + action);
    assert.equal(response.status, 200);
    const snapshot = await response.json();
    assert.equal(snapshot.mode, 'preview');
    assert.equal(snapshot.selected, 'lower-third');
    assert.deepEqual(await event, { stage: 'stage-1', selected: 'lower-third' });
  }
  assert.equal(await fs.readFile(r.repository.stage('stage-1').file, 'utf8'), before);
  assert.deepEqual(r.playback.snapshot('stage-1', 'program').graphics, program.graphics);
  assert.equal(r.playback.snapshot('stage-1', 'preview').selected, 'lower-third');
  assert.equal(r.playback.snapshot('stage-1', 'preview').graphics[0].data.f5, 'STAGE 1 ROUND');
  assert.equal(foreign, 0);
  assert.equal(renderer, 0);
  assert.equal((await r.post('/api/Stage1/Show/missing/select')).status, 404);
  const unslotted = await r.repository.read('stage-1');
  unslotted.templates[1].ycsSlot = 'unavailable-slot';
  await r.repository.write('stage-1', unslotted);
  const previous = r.playback.snapshot('stage-1', 'preview');
  assert.equal((await r.post('/api/Stage1/Show/lower-third/select')).status, 422);
  assert.deepEqual(r.playback.snapshot('stage-1', 'preview'), previous);
  assert.equal((await r.post('/api/Stage1/Show/lower-third/play')).status, 422);
});

test('GET supports the same saved-data item actions as POST, including repeat toggles and stage isolation', async (t) => {
  const r = await setup(t),
    show = await r.repository.read('stage-1');
  show.templates[0].steps = 2;
  await r.repository.write('stage-1', show);
  const get = (action) => fetch(r.base + '/api/Stage1/Show/ticker/' + action);
  for (const action of ['play', 'update', 'continue', 'preview', 'select', 'focus', 'stop']) {
    const response = await get(action);
    assert.equal(response.status, 200, action);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  assert.equal(r.playback.snapshot('stage-1', 'program').graphics.length, 0);
  for (const count of [1, 0, 1, 0]) {
    assert.equal((await get('toggle')).status, 200);
    assert.equal(r.playback.snapshot('stage-1', 'program').graphics.length, count);
  }
  assert.equal(r.playback.snapshot('stage-2', 'program').graphics.length, 0);
  assert.equal(contract.command('Stage1', 'Show', 'ticker', 'play').method, 'GET');
  assert.equal((await r.post('/api/Stage1/Show/ticker/play')).status, 200);
});

test('GET retains auth and origin checks; HEAD and unsupported methods never execute controls', async (t) => {
  const r = await setup(t, { apiKey: 'get-test-key' }),
    url = r.base + '/api/Stage1/Show/ticker/play';
  const headers = { Authorization: 'Bearer get-test-key' };
  assert.equal((await fetch(url)).status, 401);
  assert.equal(
    (await fetch(url, { headers: { ...headers, Origin: 'https://foreign.invalid' } })).status,
    403
  );
  assert.equal((await fetch(r.base + '/api/Stage1/Wrong/ticker/play', { headers })).status, 404);
  assert.equal((await fetch(r.base + '/api/Stage1/Show/missing/play', { headers })).status, 404);
  assert.equal((await fetch(r.base + '/api/Stage1/Show/ticker/unknown', { headers })).status, 400);
  assert.equal((await fetch(url, { headers })).status, 200);
  const before = await fs.readFile(r.repository.stage('stage-1').file, 'utf8');
  const program = r.playback.snapshot('stage-1', 'program'),
    preview = r.playback.snapshot('stage-1', 'preview');
  for (const method of ['HEAD', 'OPTIONS', 'PUT', 'DELETE'])
    for (const action of [...contract.actions, 'focus']) {
      const response = await fetch(r.base + '/api/Stage1/Show/ticker/' + action, {
        method,
        headers
      });
      assert.equal(response.status, 405, method + ' ' + action);
      assert.equal(response.headers.get('allow'), 'GET, POST');
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
  assert.equal(await fs.readFile(r.repository.stage('stage-1').file, 'utf8'), before);
  assert.deepEqual(r.playback.snapshot('stage-1', 'program'), program);
  assert.deepEqual(r.playback.snapshot('stage-1', 'preview'), preview);
});

test('headless Focus uses current saved mappings, preserves on-air content and matches subsequent saved-data Play', async (t) => {
  const r = await setup(t),
    sources = r.playback.sources;
  await r.playback.command('stage-1', 'ticker', 'play');
  const onair = r.playback.snapshot('stage-1', 'program').graphics;
  await r.playback.command('stage-1', 'ticker', 'save', undefined, {
    links: { f5: { mode: 'linked', manual: 'SAVED FALLBACK' } }
  });
  await sources.updateSource(
    'test.stage-1.currentRound',
    'LIVE ROUND 12',
    sources.snapshot().revision
  );
  const file = r.repository.stage('stage-1').file,
    before = await fs.readFile(file, 'utf8');
  const sourceBefore = await fs.readFile(path.join(r.root, 'sources.json'), 'utf8');
  const response = await fetch(r.base + '/api/Stage1/Show/ticker/focus');
  assert.equal(response.status, 200);
  const preview = await response.json();
  assert.equal(preview.mode, 'preview');
  assert.equal(preview.selected, 'ticker');
  assert.equal(preview.graphics[0].data.f5, 'LIVE ROUND 12');
  assert.deepEqual(r.playback.snapshot('stage-1', 'program').graphics, onair);
  assert.equal(r.playback.snapshot('stage-2', 'preview').selected, null);
  assert.equal(await fs.readFile(file, 'utf8'), before);
  assert.equal(await fs.readFile(path.join(r.root, 'sources.json'), 'utf8'), sourceBefore);
  assert.equal(
    contract.command('Stage1', 'Show', 'ticker', 'select').path,
    '/api/Stage1/Show/ticker/focus'
  );
  assert.throws(
    () => r.playback.command('stage-1', 'ticker', 'focus', [{ field: 'f5', value: 'UNSAVED' }]),
    { status: 400 }
  );
  assert.equal((await r.post('/api/Stage1/Show/ticker/play')).status, 200);
  assert.deepEqual(r.playback.snapshot('stage-1', 'program').graphics, preview.graphics);
});
test('failed Focus leaves preview and Program intact and never emits a controller focus event', async (t) => {
  const r = await setup(t);
  await r.playback.focus('stage-1', 'lower-third');
  const before = r.playback.snapshot('stage-1', 'preview'),
    program = r.playback.snapshot('stage-1', 'program');
  let focused = 0;
  r.playback.on('stage-1:focus', () => focused++);
  const show = await r.repository.read('stage-1');
  show.templates[0].ycsSlot = 'unavailable-slot';
  await r.repository.write('stage-1', show);
  assert.equal((await fetch(r.base + '/api/Stage1/Show/ticker/focus')).status, 422);
  assert.deepEqual(r.playback.snapshot('stage-1', 'preview'), before);
  assert.deepEqual(r.playback.snapshot('stage-1', 'program'), program);
  assert.equal(focused, 0);
});

test('rundown deletion rejects on-air items and removes persisted item mappings after Stop',async t=>{
 const r=await setup(t),sources=r.playback.sources;
 await r.playback.reconcileMappings();
 const snapshot=sources.snapshot();
 assert.ok(snapshot.mappings.some(m=>m.stage==='stage-1'&&m.graphic==='ticker'));
 await r.playback.command('stage-1','ticker','play');
 const body={command:'removeItemFromRundown',datafile:r.repository.stage('stage-1').file,epoch:'ticker'};
 assert.equal((await r.post('/gc/Stage1/Show',body)).status,409);
 assert.ok((await r.repository.read('stage-1')).templates.some(item=>item.itemID==='ticker'));
 await r.playback.command('stage-1','ticker','stop');
 await r.playback.focus('stage-1','ticker');
 assert.equal((await r.post('/gc/Stage1/Show',body)).status,200);
 assert.equal((await r.repository.read('stage-1')).templates.some(item=>item.itemID==='ticker'),false);
 assert.equal(sources.snapshot().mappings.some(m=>m.stage==='stage-1'&&m.graphic==='ticker'),false);
 assert.equal(r.playback.snapshot('stage-1','preview').selected,null);
 assert.ok(sources.snapshot().mappings.some(m=>m.stage==='stage-2'&&m.graphic==='ticker'));
});
