'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { fixture } = require('./playback.test.cjs');
const { DataSources } = require('../data.cjs');

test('clearing a mapping preserves saved linked fallback through editor Preview, Save, Play and Update', async t => {
  const { root, stages, repository, playback } = await fixture(t);
  const sources = new DataSources(path.join(root, 'sources.json'), stages);
  t.after(() => sources.close());
  await sources.ready;
  playback.sources = sources;
  const links = { f5: { mode: 'linked', manual: 'MANUAL ROUND' } };
  await playback.command('stage-1', 'ticker', 'play', undefined, { links });
  assert.equal(playback.snapshot('stage-1', 'program').graphics[0].data.f5, 'SWISS ROUND 11 OF 15');
  await sources.saveMappings('stage-1', 'ticker', '/test/graphic.html', [
    { field: 'f5', scope: 'override', binding: null }
  ], sources.document.revision);
  assert.equal(sources.mapping('stage-1', 'ticker', 'f5', '/test/graphic.html'), undefined);
  for (const action of ['preview', 'save', 'play', 'update']) {
    const editor = await playback.editor('stage-1', 'ticker');
    assert.equal(editor.links.f5.mode, 'linked');
    assert.equal(editor.links.f5.source, null);
    await playback.command('stage-1', 'ticker', action,
      [{ field: 'f5', value: 'MANUAL ROUND' }],
      { links, revision: editor.revision });
    const mode = ['preview', 'save'].includes(action) ? 'preview' : 'program';
    assert.equal(playback.snapshot('stage-1', mode).graphics[0].data.f5, 'MANUAL ROUND');
  }
  const saved = repository.item(await repository.read('stage-1'), 'ticker');
  assert.deepEqual(saved.ycsLinks.f5, links.f5);
  // Restoring a mapping reconnects the saved link on the next explicit update.
  await sources.saveMappings('stage-1', 'ticker', '/test/graphic.html', [
    { field: 'f5', scope: 'override', binding: { source: 'test.stage-1.currentRound' } }
  ], sources.document.revision);
  await playback.command('stage-1', 'ticker', 'update', undefined, { links });
  assert.equal(playback.snapshot('stage-1', 'program').graphics[0].data.f5, 'SWISS ROUND 11 OF 15');
});

test('new links still require a mapping and rejected commands leave Program unchanged', async t => {
  const { root, stages, playback } = await fixture(t);
  const sources = new DataSources(path.join(root, 'sources.json'), stages);
  t.after(() => sources.close());
  await sources.ready;
  playback.sources = sources;
  await sources.saveMappings('stage-1', 'ticker', '/test/graphic.html', [
    { field: 'f5', scope: 'override', binding: null }
  ], sources.document.revision);
  const before = playback.snapshot('stage-1', 'program');
  await assert.rejects(playback.command('stage-1', 'ticker', 'play', undefined, {
    links: { f5: { mode: 'linked', manual: 'MANUAL ROUND' } }
  }), { status: 422 });
  assert.deepEqual(playback.snapshot('stage-1', 'program'), before);
});
