'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { RundownRepository, Playback } = require('../playback.cjs');

const { testData } = require('./helpers/test-data.cjs');
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ycs-playback-'));
  // A program-state write can still be finishing when a test ends.
  t.after(() => fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 20 }));
  const stages = [1, 2, 3].map(number => ({ id: `stage-${number}`, project: `Stage${number}`, rundown: 'Show' }));
  for (const [index, stage] of stages.entries()) {
    const folder = path.join(root, stage.project, 'data');
    await fs.mkdir(folder, { recursive: true });
    const make = (id, slot) => ({ itemID: id, ycsSlot: slot, relpath: '/test/graphic.html', onair: 'false', DataFields: [
      { field: 'f0', ftype: 'hidden', value: `broadcast-${index + 1}` }, { field: 'f5', ftype: 'textfield', value: `STAGE ${index + 1} ROUND` }
    ] });
    await fs.writeFile(path.join(folder, 'Show.json'), JSON.stringify({ templates: [make('ticker', 'ticker'), make('lower-third', 'lower-third'), make('other-name', 'lower-third')] }));
  }
  // Test round sources at the conventional data path (see helpers/test-data.cjs).
  await fs.writeFile(path.join(root, 'sources.json'), JSON.stringify(testData(stages), null, 2));
  const repository = new RundownRepository(root, stages);
  const playback = new Playback(repository, { ticker: { order: 10 }, 'lower-third': { order: 20 } });
  return { root, stages, repository, playback };
}

if (require.main === module) {
test('three stages can use identical graphic IDs with independent compositions and saved data', async t => {
  const { playback, repository } = await fixture(t);
  await Promise.all([1, 2, 3].map(number => playback.command(`stage-${number}`, 'ticker', 'play')));
  for (let number = 1; number <= 3; number++) {
    const snapshot = playback.snapshot(`stage-${number}`, 'program');
    assert.equal(snapshot.graphics[0].data.f5, `STAGE ${number} ROUND`);
    assert.equal((await repository.read(`stage-${number}`)).templates[0].onair, 'true');
  }
  await playback.clear('stage-2');
  assert.equal(playback.snapshot('stage-2', 'program').graphics.length, 0);
  assert.equal(playback.snapshot('stage-1', 'program').graphics.length, 1);
  assert.equal(playback.snapshot('stage-3', 'program').graphics.length, 1);
});

test('a lower third coexists with the ticker and replacement/Stop remain confined to their slot and graphic', async t => {
  const { playback } = await fixture(t);
  await playback.command('stage-1', 'ticker', 'play');
  const ticker = playback.snapshot('stage-1', 'program').graphics[0];
  await playback.command('stage-1', 'lower-third', 'play');
  assert.equal(playback.snapshot('stage-1', 'program').graphics.length, 2);
  await playback.command('stage-1', 'other-name', 'play');
  let composition = playback.snapshot('stage-1', 'program').graphics;
  assert.deepEqual(composition.map(item => item.id), ['ticker', 'other-name']);
  assert.deepEqual(composition[0], ticker);
  await playback.command('stage-1', 'lower-third', 'stop');
  assert.equal(playback.snapshot('stage-1', 'program').graphics.length, 2);
  await playback.command('stage-1', 'other-name', 'stop');
  assert.deepEqual(playback.snapshot('stage-1', 'program').graphics, [ticker]);
});

test('preview combines a draft with program and cannot alter program or another stage preview', async t => {
  const { playback } = await fixture(t);
  await playback.command('stage-1', 'ticker', 'play');
  await playback.command('stage-2', 'ticker', 'play');
  const stage2 = playback.snapshot('stage-2', 'preview');
  await playback.command('stage-1', 'lower-third', 'preview', [{ field: 'f5', value: 'PENDING NAME' }]);
  assert.deepEqual(playback.snapshot('stage-1', 'preview').graphics.map(item => item.id), ['ticker', 'lower-third']);
  assert.deepEqual(playback.snapshot('stage-1', 'program').graphics.map(item => item.id), ['ticker']);
  assert.deepEqual(playback.snapshot('stage-2', 'preview'), stage2);
});

test('saving an override remains off air until Update; new requests read the saved rundown explicitly', async t => {
  const { playback } = await fixture(t);
  await playback.command('stage-1', 'ticker', 'play');
  await playback.command('stage-1', 'ticker', 'save', [{ field: 'f5', value: 'CUSTOM ROUND' }]);
  assert.equal(playback.snapshot('stage-1', 'program').graphics[0].data.f5, 'STAGE 1 ROUND');
  await playback.command('stage-2', 'ticker', 'play');
  await playback.command('stage-1', 'ticker', 'update');
  assert.equal(playback.snapshot('stage-1', 'program').graphics[0].data.f5, 'CUSTOM ROUND');
  assert.equal(playback.snapshot('stage-2', 'program').graphics[0].data.f5, 'STAGE 2 ROUND');
});

test('repeated Play is idempotent in content and simultaneous commands serialize per stage', async t => {
  const { playback } = await fixture(t);
  await playback.command('stage-1', 'ticker', 'play');
  const initial = playback.snapshot('stage-1', 'program').graphics;
  await playback.command('stage-1', 'ticker', 'play');
  assert.deepEqual(playback.snapshot('stage-1', 'program').graphics, initial);
  await Promise.all([playback.command('stage-1', 'lower-third', 'play'), playback.command('stage-1', 'lower-third', 'stop')]);
  assert.deepEqual(playback.snapshot('stage-1', 'program').graphics, initial);
});

test('invalid patches and failed content writes preserve the active composition; Stop never waits on disk', async t => {
  const { playback, repository } = await fixture(t);
  await playback.command('stage-1', 'ticker', 'play');
  const before = playback.snapshot('stage-1', 'program');
  for (const fields of [[{ field: 'f0', value: 'broadcast-2' }], [{ field: 'missing', value: 'x' }], [{ field: 'f5', value: 12 }], [{ field: 'f5', value: 'a' }, { field: 'f5', value: 'b' }]]) {
    await assert.rejects(playback.command('stage-1', 'ticker', 'update', fields));
    assert.deepEqual(playback.snapshot('stage-1', 'program'), before);
  }
  const write = repository.write;
  repository.write = async () => { throw new Error('Disk unavailable'); };
  // New field values must be saved before they go on air.
  await assert.rejects(playback.command('stage-1', 'ticker', 'update', [{ field: 'f5', value: 'NEW ROUND' }]), /Disk unavailable/);
  assert.deepEqual(playback.snapshot('stage-1', 'program'), before);
  // Stop takes the graphic off air even though its onair flag cannot be saved.
  await playback.command('stage-1', 'ticker', 'stop');
  assert.equal(playback.snapshot('stage-1', 'program').graphics.length, 0);
  repository.write = write;
  playback.close();
});

test('stage events are scoped and snapshots are detached from internal state', async t => {
  const { playback } = await fixture(t);
  let stage1Events = 0, stage2Events = 0;
  playback.on('stage-1:program', () => stage1Events++);
  playback.on('stage-2:program', () => stage2Events++);
  await playback.command('stage-1', 'ticker', 'play');
  const snapshot = playback.snapshot('stage-1', 'program');
  snapshot.graphics[0].data.f5 = 'MUTATED';
  assert.equal(playback.snapshot('stage-1', 'program').graphics[0].data.f5, 'STAGE 1 ROUND');
  assert.equal(stage1Events, 1);
  assert.equal(stage2Events, 0);
  assert.throws(() => playback.snapshot('../outside', 'program'));
  assert.throws(() => playback.snapshot('stage-1', 'invalid'));
});

}
module.exports = { fixture };

if (require.main === module) test('editor exposes template-specific preview policy and preserves other template defaults', async t => {
  const { playback, repository } = await fixture(t);
  const show = await repository.read('stage-1');
  show.templates[1].ycsPreviewOnEdit = false;
  await repository.write('stage-1', show);
  assert.equal((await playback.editor('stage-1', 'lower-third')).previewOnEdit, false);
  assert.equal((await playback.editor('stage-1', 'ticker')).previewOnEdit, true);
});
