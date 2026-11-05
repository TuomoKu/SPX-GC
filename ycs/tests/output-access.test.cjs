'use strict';
const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  path = require('node:path'),
  http = require('node:http');
const express = require('express'),
  session = require('express-session'),
  { Server } = require('socket.io');
// The bundled browser client omits Node extraHeaders. Supply the cookies a real browser sends.
const NativeWS = require('ws'),
  originalWS = globalThis.WebSocket;
let browserHeaders = {};
globalThis.WebSocket = class extends NativeWS {
  constructor(uri, protocols) {
    super(uri, protocols, { headers: browserHeaders });
  }
};
const client = require(
  path.join(path.dirname(require.resolve('socket.io')), '../client-dist/socket.io.js')
);
globalThis.WebSocket = originalWS;
const register = require('../index.cjs'),
  attach = require('../sockets.cjs'),
  access = require('../output-access.cjs'),
  { fixture } = require('./playback.test.cjs');
test('no-login browser sessions are operators when an API key is set; viewer sockets stay scoped', async (t) => {
  const f = await fixture(t),
    app = express();
  app.use(express.json());
  const sessions = session({
    secret: 'isolated-test-session-secret',
    resave: false,
    saveUninitialized: false
  });
  app.use(sessions);
  const config = {
    general: { dataroot: f.root, username: '' },
    ycs: {
      enabled: true,
      apiKey: 'private-command-key',
      dataFile: path.join(f.root, 'sources.json'),
      stages: f.stages,
      slots: { ticker: { order: 10 }, 'lower-third': { order: 20 } }
    }
  };
  const playback = register(app, config, {
    auth: {
      CheckLogin: (req, res, next) => {
        req.session.user = 'default';
        next();
      }
    }
  });
  const server = http.createServer(app),
    io = new Server(server);
  io.engine.use(sessions);
  playback.attachSockets(io);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port,
    clients = [];
  t.after(async () => {
    clients.forEach((s) => s.disconnect());
    playback.close();
    await new Promise((resolve) => io.close(resolve));
  });
  const page = await fetch(base + '/output/stage-1/program');
  assert.equal(page.status, 200);
  const cookie = page.headers.get('set-cookie').split(';')[0],
    headers = { Cookie: cookie, Origin: base };
  // An output page alone never grants operator access. Opening an operator page
  // does, so the controller works with an API key set. Requests without it still need the key.
  assert.equal((await fetch(base + '/api/ycs/data', { headers })).status, 401);
  assert.equal((await fetch(base + '/ycs/data-manager', { headers: { Cookie: cookie } })).status, 200);
  assert.equal((await fetch(base + '/api/ycs/data', { headers })).status, 200);
  assert.equal((await fetch(base + '/api/Stage1/Show/ticker/stop', { headers })).status, 200);
  assert.equal((await fetch(base + '/api/ycs/data')).status, 401);
  assert.equal((await fetch(base + '/api/Stage1/Show/ticker/stop')).status, 401);
  assert.equal(
    (await fetch(base + '/api/Stage1/Show/ticker/stop', { headers: { Authorization: 'Bearer private-command-key' } })).status,
    200
  );
  const post = (stage, mode, extra = headers) =>
    fetch(base + '/api/ycs/stages/' + stage + '/' + mode + '/report', {
      method: 'POST',
      headers: { ...extra, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'viewer-test', state: 'ready', revision: 0 })
    });
  assert.equal((await post('stage-1', 'program')).status, 204);
  assert.equal((await post('stage-1', 'preview', {})).status, 401);
  browserHeaders = headers;
  const socket = client(base + '/ycs-playback', {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
    extraHeaders: headers,
    auth: { viewer: true, stage: 'stage-1', mode: 'program' }
  });
  clients.push(socket);
  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
  const once = (name) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error(name + ' timeout')), 2000);
      socket.once(name, (value) => {
        clearTimeout(timer);
        resolve(value);
      });
    });
  let event = once('state');
  socket.emit('subscribe', { stage: 'stage-1', modes: ['program'] });
  assert.equal((await event).stage, 'stage-1');
  for (const payload of [
    { stage: 'stage-2', modes: ['program'] },
    { stage: 'stage-1', modes: ['preview'] },
    { stage: 'stage-1', modes: ['program'], controller: true }
  ]) {
    event = once('stage-error');
    socket.emit('subscribe', payload);
    assert.ok((await event).error);
  }
  assert.equal(playback.snapshot('stage-1', 'program').graphics.length, 0);
});
test('socket auth follows the live login settings and rejects logout, foreign origins and invalid scopes', async (t) => {
  const f = await fixture(t);
  let authorize;
  const namespace = {
    use: (fn) => (authorize = fn),
    on() {},
    to: () => ({ emit() {} }),
    disconnectSockets() {}
  };
  const startup = { general: { username: '' }, ycs: { apiKey: 'test-key' } };
  let current = startup;
  const cleanup = attach({ of: () => namespace }, f.playback, startup, () => current);
  t.after(cleanup);
  const request = {
    headers: { host: 'SPX-PC:5660', origin: 'http://SPX-PC:5660' },
    socket: { remoteAddress: '192.168.1.50' },
    session: { user: 'default', ycsOperator: true }
  };
  access.grant(request, 'stage-1', 'program');
  const check = (auth, req = request) =>
    new Promise((resolve) => authorize({ request: req, handshake: { auth }, data: {} }, resolve));
  assert.equal(await check({ viewer: true, stage: 'stage-1', mode: 'program' }), undefined);
  assert.equal(await check({}), undefined, 'a no-login controller connects with an API key set');
  assert.ok(
    await check({}, { ...request, session: { user: 'default' } }),
    'an output-only session is not an operator'
  );
  assert.ok(await check({ viewer: true, stage: '../outside', mode: 'program' }));
  assert.ok(
    await check(
      { viewer: true, stage: 'stage-1', mode: 'program' },
      { ...request, headers: { ...request.headers, origin: 'https://foreign.invalid' } }
    )
  );
  assert.ok(
    await check(
      { viewer: true, stage: 'stage-1', mode: 'program' },
      { ...request, session: { ...request.session, user: '' } }
    )
  );
  assert.ok(await check({}, { ...request, session: undefined }));
  assert.equal(await check({ token: 'test-key' }, { ...request, session: undefined }), undefined);
  // Enabling SPX login at runtime replaces global.config; no restart is needed.
  current = { general: { username: 'op' }, ycs: startup.ycs };
  assert.ok(await check({ viewer: true, stage: 'stage-1', mode: 'program' }), 'old no-login session');
  const signedIn = { ...request, session: { user: 'op', ycsOutputs: ['stage-1:program'] } };
  assert.equal(await check({ viewer: true, stage: 'stage-1', mode: 'program' }, signedIn), undefined);
  assert.equal(await check({}, signedIn), undefined);
  assert.equal(await check({ token: 'test-key' }, { ...request, session: undefined }), undefined);
});

test('the session route grants operator access and sends no page', async (t) => {
  const f = await fixture(t),
    app = express();
  app.use(express.json());
  app.use(session({ secret: 'isolated-test-session-secret', resave: false, saveUninitialized: false }));
  register(app, {
    general: { dataroot: f.root, username: '' },
    ycs: { enabled: true, apiKey: 'private-command-key', dataFile: path.join(f.root, 'sources.json'), stages: f.stages, slots: { ticker: { order: 10 }, 'lower-third': { order: 20 } } }
  }, { auth: { CheckLogin: (req, res, next) => { req.session.user = 'default'; next(); } } });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;
  assert.equal((await fetch(base + '/api/ycs/stages')).status, 401, 'refused without a session');
  const renewed = await fetch(base + '/ycs/session');
  assert.equal(renewed.status, 204);
  const cookie = renewed.headers.get('set-cookie').split(';')[0];
  assert.equal((await fetch(base + '/api/ycs/stages', { headers: { Cookie: cookie } })).status, 200);
});
