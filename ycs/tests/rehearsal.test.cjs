'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { prepare, createRehearsal } = require('../rehearsal.cjs');

test('disposable rehearsal uses real template definitions, offline sheet/JSON lists and persistent isolated stage data', async t => {
  // The graphics checkout is optional for normal fork CI; this test supplies
  // an independent SPX definition with the real public Stories contract.
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ycs-rehearsal-'));
  // A program-state write can still be finishing when a test ends.
  t.after(() => fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 20 }));
  const graphics = path.join(root, 'graphics'); await fs.mkdir(graphics);
  await fs.writeFile(path.join(graphics, 'ticker.html'), `window.SPXGCTemplateDefinition = ${JSON.stringify({ DataFields: [
    ...['f1', 'f3', 'f4', 'f5', 'f6', 'f7'].map(field => ({ field, ftype: 'textfield', value: '' })),
    { field: 'f14', ftype: 'textarea', value: '[]', ycsCollection: { version: 1, fields: [{ key: 'category' }, { key: 'topic' }, { key: 'subtopic', required: true }] } }
  ] })};`);
  const show = path.join(root, 'show'); await prepare(show, graphics);
  let runtime = await createRehearsal(show, graphics);
  t.after(async () => runtime?.close());
  async function listen() { await new Promise(resolve => runtime.server.listen(0, '127.0.0.1', resolve)); return `http://127.0.0.1:${runtime.server.address().port}`; }
  let base = await listen();
  const get = async route => { const response = await fetch(base + route); assert.equal(response.status, 200); return response.json(); };
  const post = async (route, body = {}) => { const response = await fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); assert.equal(response.status, 200, await response.clone().text()); return response.json(); };
  assert.equal((await get('/rehearsal/info')).rehearsal, true);
  for (const number of [1, 2, 3]) {
    await post(`/api/ycs/stages/stage-${number}/graphics/ticker/play`);
    await post(`/api/ycs/stages/stage-${number}/graphics/lower-third/play`);
    const snapshot = await get(`/api/ycs/stages/stage-${number}/program/state`);
    assert.equal(snapshot.graphics.length, 2);
    const ticker = snapshot.graphics.find(graphic => graphic.id === 'ticker');
    assert.equal(ticker.template, '/templates/ycs/ticker/ticker.html');
    assert.equal(ticker.data.f0, undefined);
    assert.equal(ticker.data.f5, `SWISS ROUND ${number} OF 15`);
    const stories = JSON.parse(ticker.data.f14);
    assert.equal(stories.length, 2);
    assert.match(stories[0].topic, new RegExp(`STAGE ${number} UPDATE`));
    assert.match(stories[1].subtopic, /EDITION 1/);
  }
  const before = await get('/api/ycs/stages/stage-1/program/state');
  await post('/rehearsal/feed', { offline: true, edition: 2 });
  await post('/api/ycs/data/connections/rehearsal.sheet/refresh');
  assert.deepEqual((await get('/api/ycs/stages/stage-1/program/state')).graphics, before.graphics);
  await post('/rehearsal/feed', { offline: false, edition: 2 });
  await post('/api/ycs/data/connections/rehearsal.sheet/refresh');
  await runtime.playback.refreshLinks('stage-1');
  assert.match((await get('/api/ycs/stages/stage-1/program/state')).graphics[0].data.f14, /EDITION 2/);
  await post('/api/ycs/stages/stage-2/clear');
  assert.equal((await get('/api/ycs/stages/stage-1/program/state')).graphics.length, 2);
  assert.equal((await get('/api/ycs/stages/stage-3/program/state')).graphics.length, 2);
  const wrongOrigin = await fetch(base + '/rehearsal/feed', { method: 'POST', headers: { Origin: 'https://untrusted.example', 'Content-Type': 'application/json' }, body: JSON.stringify({ offline: true, edition: 3 }) });
  assert.equal(wrongOrigin.status, 403);
  const data = await get('/api/ycs/data');
  await post('/api/ycs/data/source', { id: 'test.stage-2.currentRound', value: 'SAVED ROUND', revision: data.revision });
  // A crash (no clean shutdown) inside the window restores program as it was.
  const saved = async () => {
    const file = path.join(show, 'sources.program-state.json');
    for (let attempt = 0; attempt < 200; attempt++) {
      try { const state = JSON.parse(await fs.readFile(file, 'utf8')); if (state.startedAt === runtime.playback.recovery.startedAt && [...runtime.playback.states].every(([id, current]) => JSON.stringify(state.stages[id].program) === JSON.stringify(current.program))) return state; } catch { /* not yet */ }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.fail('program state was not saved');
  };
  await saved();
  const crash = async () => { runtime.playback.close(); await new Promise(resolve => runtime.io.close(resolve)); };
  const restarts = [];
  await crash(); runtime = await createRehearsal(show, graphics, { restart: mode => restarts.push(mode) }); base = await listen();
  assert.equal((await get('/api/ycs/stages/stage-1/program/state')).graphics.length, 2);
  assert.equal((await get('/api/ycs/stages/stage-2/program/state')).graphics.length, 0);
  assert.equal((await get('/api/ycs/stages/stage-1/health')).restored.graphics, 2);
  // The over-window rehearsal restart backdates the heartbeat, then the worker is killed.
  await saved();
  const response = await fetch(base + '/rehearsal/restart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'expired' }) });
  assert.equal(response.status, 202);
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.deepEqual(restarts, ['expired']);
  await crash(); runtime = await createRehearsal(show, graphics); base = await listen();
  for (const number of [1, 2, 3]) assert.equal((await get(`/api/ycs/stages/stage-${number}/program/state`)).graphics.length, 0);
  await post('/api/ycs/stages/stage-1/graphics/ticker/play');
  // A graceful stop starts clean, however quickly the rehearsal returns.
  await runtime.close(); runtime = await createRehearsal(show, graphics); base = await listen();
  for (const number of [1, 2, 3]) assert.equal((await get(`/api/ycs/stages/stage-${number}/program/state`)).graphics.length, 0);
  assert.equal((await get('/api/ycs/data')).sources['test.stage-2.currentRound'].value, 'SAVED ROUND');
  assert.equal((await get('/api/ycs/data')).mappings.length, 6);
});
