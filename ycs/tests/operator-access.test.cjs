'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const access = require('../operator-access.cjs');

test('no-login operator access requires an operator page grant, not just an output session', () => {
  const config = { general: { username: '' } };
  const request = { session: { user: 'default', ycsOutputs: ['stage-1:program'] } };
  assert.equal(access.allowed(request, config), false);
  access.grant(request);
  assert.equal(access.allowed(request, config), true);
  assert.equal(access.allowed({ session: { ycsOperator: true } }, config), false);
  assert.equal(access.allowed({}, config), false);
});

test('enabling login requires the configured user even with a previous operator grant', () => {
  const config = { general: { username: 'operator' } };
  assert.equal(access.allowed({ session: { user: 'default', ycsOperator: true } }, config), false);
  assert.equal(access.allowed({ session: { user: 'operator' } }, config), true);
});

test('opening a controller or Data Manager grants browser API access; output-only sessions stay restricted', async t => {
  const express = require('express');
  const session = require('express-session');
  const path = require('node:path');
  const { fixture } = require('./playback.test.cjs');
  const register = require('../index.cjs');
  const f = await fixture(t), app = express();
  app.use(express.json());
  app.use(session({ secret: 'operator-access-test-secret', resave: false, saveUninitialized: false }));
  const playback = register(app, {
    general: { username: '', dataroot: f.root },
    ycs: { enabled: true, apiKey: 'companion-test-key', stages: f.stages, slots: {}, dataFile: path.join(f.root, 'sources.json') }
  }, { auth: { CheckLogin(req, res, next) { req.session.user = 'default'; next(); } } });
  app.get('/gc/:project/:rundown', (req, res) => res.send('Controller'));
  const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
  t.after(async () => { playback.close(); await new Promise(resolve => server.close(resolve)); });
  const base = 'http://127.0.0.1:' + server.address().port;
  await playback.sources.ready;
  const output = await fetch(base + '/output/stage-1/program');
  const outputCookie = output.headers.get('set-cookie').split(';')[0];
  assert.equal((await fetch(base + '/api/ycs/stages', { headers: { Cookie: outputCookie } })).status, 401);
  for (const page of ['/gc/Stage1/Show', '/gc/Stage1/Show/', '/ycs/data-manager']) {
    const response = await fetch(base + page);
    assert.equal(response.status, 200);
    const cookie = response.headers.get('set-cookie').split(';')[0];
    assert.equal((await fetch(base + '/api/ycs/stages', { headers: { Cookie: cookie } })).status, 200);
  }
  assert.equal((await fetch(base + '/api/ycs/stages')).status, 401);
});
