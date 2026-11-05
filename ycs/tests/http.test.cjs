'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const register = require('../index.cjs');
const path = require('node:path');
const { fixture } = require('./playback.test.cjs');

test('Companion commands and native SPX controls share stage-scoped playback without a controller browser', async t => {
  const { root, stages, repository } = await fixture(t);
  const app = express();
  app.use(express.json());
  const config = { general: { dataroot: root, username: '' }, ycs: { enabled: true, dataFile: path.join(root, 'sources.json'), stages, slots: { ticker: { order: 10 }, 'lower-third': { order: 20 } } } };
  const playback = register(app, config, { auth: { CheckLogin: (req, res, next) => next() } });
  t.after(() => playback.close());
  const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (url, body = {}, headers = {}) => fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  assert.equal((await post('/api/ycs/stages/stage-1/graphics/ticker/play')).status, 200);
  assert.equal((await post('/api/ycs/stages/stage-1/graphics/lower-third/play')).status, 200);
  assert.equal(playback.snapshot('stage-1', 'program').graphics.length, 2);
  assert.equal((await post('/api/ycs/stages/stage-2/graphics/ticker/play')).status, 200);
  assert.equal((await post('/api/ycs/stages/stage-1/graphics/ticker/stop', {}, { Origin: 'https://untrusted.example' })).status, 403);
  // Explicitly poison the legacy cache. Stage requests must ignore it.
  global.rundownData = { templates: [{ itemID: 'wrong-stage' }] };
  assert.equal((await post('/gc/playout', { datafile: repository.stage('stage-1').file, epoch: 'ticker', command: 'update', fields: [{ field: 'f5', value: 'ROUND 13' }] })).status, 200);
  assert.equal(playback.snapshot('stage-1', 'program').graphics[0].data.f5, 'ROUND 13');
  assert.equal(playback.snapshot('stage-2', 'program').graphics[0].data.f5, 'STAGE 2 ROUND');
  assert.equal((await post('/gc/saveItemChanges', { rundownfile: repository.stage('stage-1').file, epoch: 'ticker', DataFields: [{ field: 'f5', value: 'SAVED ONLY' }] })).status, 200);
  assert.equal(playback.snapshot('stage-1', 'program').graphics[0].data.f5, 'ROUND 13');
  const response = await fetch(base + '/api/ycs/stages/stage-1/program/events');
  const reader = response.body.getReader();
  const event = new TextDecoder().decode((await reader.read()).value);
  assert.match(event, /"stage":"stage-1"/);
  assert.match(event, /ROUND 13/);
  await reader.cancel();
  assert.equal((await post('/api/ycs/stages/stage-1/clear')).status, 200);
  assert.equal(playback.snapshot('stage-1', 'program').graphics.length, 0);
  assert.equal(playback.snapshot('stage-2', 'program').graphics.length, 1);
  assert.equal((await post('/api/ycs/stages/stage-1/graphics/missing/play')).status, 404);
  const invalid = await post('/api/ycs/stages/stage-1/graphics/ticker/save', { fields: [{field:'f5',value:'x'.repeat(301)}] });
  assert.equal(invalid.status,422); assert.match((await invalid.json()).fields.f5,/300/);
  const read = url => fetch(base + url).then(response => response.json());
  const beforeNavigation = playback.snapshot('stage-2', 'program');
  await read('/api/ycs/stages'); await read('/api/ycs/stages/stage-2/graphics/ticker/editor');
  assert.deepEqual(playback.snapshot('stage-2', 'program'), beforeNavigation);
  const editor = await read('/api/ycs/stages/stage-1/graphics/ticker/editor');
  assert.equal((await post('/api/ycs/stages/stage-1/graphics/ticker/preview', { revision: editor.revision, links: { f5: { mode: 'linked', manual: 'CUSTOM' } } })).status, 200);
  assert.equal(playback.snapshot('stage-1', 'program').graphics.length, 0);
  const data = await read('/api/ycs/data');
  assert.equal((await post('/api/ycs/data/source', { id: 'test.stage-1.currentRound', value: 'SOURCE UPDATE', revision: data.revision }, { Origin: 'https://untrusted.example' })).status, 403);
  assert.equal((await post('/api/ycs/data/mapping', { stage: 'stage-1', graphic: 'ticker', field: 'f0', source: 'test.stage-1.currentRound', revision: data.revision })).status, 422);
  assert.equal((await post('/api/ycs/stages/stage-1/graphics/ticker/play', { links: { f5: { mode: 'linked', manual: 'MANUAL ROUND' } }, revision: editor.revision })).status, 200);
  const liveUpdate = new Promise((resolve, reject) => {
    const timer = setTimeout(() => { playback.off('stage-1:program', listener); reject(new Error('Live source update did not arrive')); }, 1000);
    const listener = snapshot => {
      if (snapshot.graphics.find(item => item.id === 'ticker')?.data.f5 === 'SOURCE UPDATE') { clearTimeout(timer); playback.off('stage-1:program', listener); resolve(); }
    };
    playback.on('stage-1:program', listener);
  });
  assert.equal((await post('/api/ycs/data/source', { id: 'test.stage-1.currentRound', value: 'SOURCE UPDATE', revision: data.revision })).status, 200);
  await liveUpdate;
  assert.equal(playback.snapshot('stage-1', 'program').graphics[0].data.f5, 'SOURCE UPDATE');
  assert.equal(playback.snapshot('stage-2', 'program').graphics[0].data.f5, 'STAGE 2 ROUND');
  assert.equal((await post('/api/ycs/stages/stage-1/program/report', { id: 'test-renderer', state: 'error', revision: 0, message: 'Test error' })).status, 204);
  assert.deepEqual((await read('/api/ycs/stages/stage-1/health')).program.errors, ['Test error']);
});
