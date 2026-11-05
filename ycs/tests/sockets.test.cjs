'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const express = require('express');
const { Server } = require('socket.io');
const client = require(path.join(path.dirname(require.resolve('socket.io')), '../client-dist/socket.io.js'));
const register = require('../index.cjs');
const attach = require('../sockets.cjs');
const { fixture } = require('./playback.test.cjs');
function event(socket, name, predicate = () => true) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off(name, receive); reject(new Error(`No ${name} event`)); }, 2000);
    function receive(value) { if (predicate(value)) { clearTimeout(timer); socket.off(name, receive); resolve(value); } }
    socket.on(name, receive);
  });
}
test('more than six WebSocket subscribers leave HTTP controls responsive, isolate stages and restore snapshots', async t => {
  const { root, stages } = await fixture(t), app = express(); app.use(express.json());
  const config = { general: { dataroot: root, username: '' }, ycs: { enabled: true, dataFile: path.join(root, 'sources.json'), stages, slots: { ticker: { order: 10 }, 'lower-third': { order: 20 } } } };
  const playback = register(app, config, { auth: { CheckLogin: (req, res, next) => next() } });
  const server = http.createServer(app), io = new Server(server), clients = [];
  playback.attachSockets(io);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { for (const socket of clients) socket.disconnect(); playback.close(); await new Promise(resolve => io.close(resolve)); });
  async function connect(stage, mode) {
    const socket = client(base + '/ycs-playback', { transports: ['websocket'], forceNew: true, reconnection: false }); clients.push(socket);
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WebSocket connection timed out')), 2000);
      const failed = error => { clearTimeout(timeout); reject(error); };
      socket.once('connect_error', failed);
      socket.once('connect', () => { clearTimeout(timeout); socket.off('connect_error', failed); resolve(); });
    });
    const initial = event(socket, 'state'); socket.emit('subscribe', { stage, modes: [mode] });
    const snapshot = await initial; assert.equal(socket.io.engine.transport.name, 'websocket'); return { socket, snapshot };
  }
  const subscribers = await Promise.all(Array.from({ length: 9 }, (_, index) => connect(`stage-${index % 3 + 1}`, index < 3 ? 'program' : 'preview')));
  assert.ok(subscribers.every(item => item.snapshot.graphics.length === 0));
  assert.equal((await fetch(base + '/api/ycs/stages')).status, 200);
  const next = event(subscribers[0].socket, 'state', snapshot => snapshot.mode === 'program' && snapshot.graphics.length === 1);
  await playback.command('stage-1', 'ticker', 'play'); assert.equal((await next).graphics[0].id, 'ticker');
  assert.equal(playback.snapshot('stage-2', 'program').graphics.length, 0);
  const reconnect = await connect('stage-1', 'program'); assert.equal(reconnect.snapshot.graphics[0].id, 'ticker');
  const invalid = event(reconnect.socket, 'stage-error'); reconnect.socket.emit('subscribe', { stage: 'stage-1', modes: ['unknown'] }); assert.match((await invalid).error, /Unknown stage/);
  assert.equal((await fetch(base + '/api/ycs/stages/stage-1/program/events', { headers: { Accept: 'text/event-stream' } })).status, 204);
});

test('stage WebSocket access rejects a bad origin, missing keys and unauthorized remote clients', async t => {
  const { playback } = await fixture(t); let authorize;
  const namespace = { use: fn => { authorize = fn; }, on() {}, to: () => ({ emit() {} }), disconnectSockets() {} };
  const config = { general: { username: 'operator' }, ycs: { apiKey: 'test-only-key' } };
  const cleanup = attach({ of: () => namespace }, playback, config); t.after(cleanup);
  const request = (origin = 'http://localhost:5660', token, user) => ({ request: { headers: { host: 'localhost:5660', origin }, socket: { remoteAddress: '10.0.0.2' }, session: { user } }, handshake: { auth: { token } } });
  const check = socket => new Promise(resolve => authorize(socket, resolve));
  assert.ok(await check(request('https://untrusted.example', 'test-only-key')));
  assert.ok(await check(request()));
  assert.equal(await check(request(undefined, 'test-only-key')), undefined);
  assert.equal(await check(request(undefined, undefined, 'operator')), undefined);
  config.general.username = '';
  delete config.ycs.apiKey;
  const noLogin = request(undefined, undefined, 'default');
  assert.ok(await check(noLogin));
  noLogin.request.session.ycsOperator = true;
  assert.equal(await check(noLogin), undefined);
});
