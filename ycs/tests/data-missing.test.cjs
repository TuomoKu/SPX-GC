'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const { DataSources } = require('../data.cjs');
const { fixture } = require('./playback.test.cjs');

const round = playback => playback.snapshot('stage-1', 'program').graphics.find(item => item.id === 'ticker')?.data.f5;

test('a missing data file is not recreated with demo sources; linked fields play manual values', async t => {
  const f = await fixture(t);
  const file = path.join(f.root, 'show-share', 'ycs-data.json');
  const sources = new DataSources(file, f.stages);
  t.after(() => sources.close());
  await sources.ready;
  f.playback.sources = sources;
  assert.equal(fsSync.existsSync(path.dirname(file)), false, 'no folder or demo file created');
  const snapshot = sources.snapshot();
  assert.equal(snapshot.health, 'unavailable');
  assert.match(snapshot.error, /Data file not found/);
  assert.deepEqual(Object.keys(snapshot.sources), []);
  assert.equal(sources.mapping('stage-1', 'ticker', 'f5', '/test/graphic.html'), undefined);
  // The reviewer's repro: the ticker's round field was saved in linked mode.
  const show = await f.repository.read('stage-1');
  show.templates[0].ycsLinks = { f5: { mode: 'linked', manual: 'STAGE 1 ROUND' } };
  await f.repository.write('stage-1', show);
  await f.playback.command('stage-1', 'ticker', 'play');
  assert.notEqual(round(f.playback), 'SWISS ROUND 11 OF 15');
  assert.equal(round(f.playback), 'STAGE 1 ROUND');
  // An explicit save cannot create the missing folder (for example an unmounted share).
  await assert.rejects(sources.edit(0, () => {}), { status: 503, message: /Data folder not found/ });
  assert.equal(fsSync.existsSync(path.dirname(file)), false);
});

test('the data file appearing later is loaded, and an explicit save can create it in an existing folder', async t => {
  const f = await fixture(t);
  const file = path.join(f.root, 'later', 'ycs-data.json');
  await fs.mkdir(path.dirname(file));
  const sources = new DataSources(file, f.stages);
  t.after(() => sources.close());
  await sources.ready;
  assert.equal(sources.snapshot().health, 'unavailable');
  await sources.edit(0, next => { next.sources.manual = { label: 'Operator value', value: 'SAVED' }; });
  assert.equal(sources.snapshot().health, 'ok');
  const saved = JSON.parse(await fs.readFile(file, 'utf8'));
  assert.equal(saved.revision, 1);
  assert.deepEqual(Object.keys(saved.sources), ['manual'], 'no demo sources were added');

  const other = path.join(f.root, 'mounted', 'ycs-data.json');
  const late = new DataSources(other, f.stages);
  t.after(() => late.close());
  await late.ready;
  assert.equal(late.snapshot().health, 'unavailable');
  await fs.mkdir(path.dirname(other));
  await fs.writeFile(other, JSON.stringify({ version: 2, revision: 7, sources: { real: { label: 'Real', value: 'REAL ROUND' } }, connections: {}, mappings: [], defaults: [] }));
  await late.refresh();
  assert.equal(late.snapshot().health, 'ok');
  assert.equal(late.value('real'), 'REAL ROUND');
});
