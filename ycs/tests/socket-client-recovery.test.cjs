'use strict';
// Runs the Socket.IO client that SPX pages actually load, not the one in node_modules.
// A mock of this behaviour once hid a controller that could not recover after a restart.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { Server } = require('socket.io');
const NativeWS = require('ws');
// The bundle is written for browsers, where self and WebSocket always exist.
const originalWS = globalThis.WebSocket, originalSelf = globalThis.self;
globalThis.WebSocket = NativeWS;
globalThis.self = globalThis;
const io = require(path.join(__dirname, '../../static/js/socket.io.js'));
globalThis.WebSocket = originalWS;
globalThis.self = originalSelf;
const wait = (socket, event) => new Promise((resolve) => socket.once(event, resolve));

test('the bundled client stays active after a refusal, and only reopening its transport recovers', async (t) => {
  let allow = false, handshakes = 0;
  const server = http.createServer(), hub = new Server(server);
  hub.of('/ycs-playback').use((socket, next) => {
    handshakes++;
    next(allow ? undefined : new Error('Stage connection not authorized'));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const socket = io('http://127.0.0.1:' + server.address().port + '/ycs-playback', { transports: ['websocket'], forceNew: true });
  t.after(async () => { socket.disconnect(); await new Promise((resolve) => hub.close(resolve)); });
  const refused = await wait(socket, 'connect_error');
  assert.equal(refused.message, 'Stage connection not authorized', 'controller.js matches this message');
  assert.equal(socket.active, true, 'why controller.js cannot test socket.active');
  assert.equal(socket.connected, false);
  const before = socket.io.engine.id;
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.equal(handshakes, 1, 'the client does not retry a refusal by itself');
  allow = true;
  socket.disconnect();
  const connected = wait(socket, 'connect');
  socket.connect();
  await connected;
  assert.equal(socket.connected, true);
  assert.notEqual(socket.io.engine.id, before, 'a new transport, so its handshake carries the renewed session');
  assert.equal(handshakes, 2);
});
