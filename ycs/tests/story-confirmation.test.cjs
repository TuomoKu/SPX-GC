'use strict';
// Regression test: a valid empty story list (staff clear a range to retype it)
// drained the on-air ticker on the first read. Two consecutive empty reads are now
// required before a non-empty list becomes empty.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DataSources } = require('../data.cjs');
const { fixture } = require('./playback.test.cjs');

const field = { field: 'f14', ftype: 'textarea', title: 'Stories', value: '[]', ycsCollection: { version: 1, fields: [{ key: 'subtopic', title: 'Crawler text', required: true }] } };
const cells = (values) => values.map((row, r) => row.map((value, c) => ({ address: String.fromCharCode(65 + c) + (r + 1), value, usable: Boolean(value) })));

async function onAir(t, { type, read, selection, settings }) {
  const base = await fixture(t);
  const sources = new DataSources(path.join(base.root, 'stories.json'), base.stages, { [type]: { read } });
  t.after(() => sources.close());
  await sources.ready;
  base.playback.sources = sources;
  sources.on('change', () => base.playback.refreshLinks('stage-1'));
  const rundown = await base.repository.read('stage-1');
  rundown.templates[0].DataFields.push(structuredClone(field));
  await base.repository.write('stage-1', rundown);
  const { connectionId } = await sources.saveConnection(null, 'Stories', settings, 0, type === 'json' ? 'json-api' : 'google-sheets');
  const binding = { connection: connectionId, selection };
  await sources.saveMappings('stage-1', 'ticker', '/test/graphic.html', [{ field: 'f14', scope: 'override', binding }], sources.snapshot().revision);
  await base.playback.command('stage-1', 'ticker', 'play', undefined, { links: { f14: { mode: 'linked', manual: '[]' } } });
  const stories = () => JSON.parse(base.playback.snapshot('stage-1', 'program').graphics[0].data.f14);
  const ref = sources.mapping('stage-1', 'ticker', 'f14', '/test/graphic.html');
  const refresh = async () => {
    await sources.refreshSheet(connectionId);
    await base.playback.refreshLinks('stage-1');
  };
  return { sources, stories, ref, refresh };
}

test('a cleared sheet range holds the on-air stories until a second empty read confirms it', async (t) => {
  let values = [['Subtopic'], ['First story'], ['Second story']];
  const r = await onAir(t, {
    type: 'sheets',
    read: async () => ({ rows: cells(values) }),
    settings: { url: 'https://docs.google.com/spreadsheets/d/1PUBLIC_SHEET_TEST_1234567890/edit', worksheet: '0', range: 'A1:A3', refreshSeconds: 5 },
    selection: { kind: 'collection', format: 'sheet', range: 'A1:A3', headerRow: 1, fields: { subtopic: { kind: 'column', name: 'Subtopic' } }, required: ['subtopic'] }
  });
  assert.equal(r.stories().length, 2);
  values = [['Subtopic'], [''], ['']]; // staff clear the range to retype it
  await r.refresh();
  assert.equal(r.stories().length, 2, 'the first empty read is held');
  assert.match(r.sources.snapshot().sources[r.ref].warning, /holding the previous list/);
  values = [['Subtopic'], ['Retyped story'], ['']];
  await r.refresh();
  assert.deepEqual(r.stories(), [{ subtopic: 'Retyped story' }], 'a non-empty read resets the confirmation');
  values = [['Subtopic'], [''], ['']];
  await r.refresh();
  assert.equal(r.stories().length, 1);
  let changes = 0;
  r.sources.on('change', () => changes++);
  await r.refresh(); // same empty data: still confirms and reaches program
  assert.equal(changes, 1);
  assert.deepEqual(r.stories(), [], 'two consecutive empty reads drain the ticker');
  assert.equal(r.sources.snapshot().sources[r.ref].warning, '');
});

test('an emptied JSON story array is confirmed the same way', async (t) => {
  let data = { stories: [{ text: 'API story' }] };
  const r = await onAir(t, {
    type: 'json',
    read: async () => ({ data: structuredClone(data) }),
    settings: { url: 'https://api.example.org/stories', refreshSeconds: 5 },
    selection: { kind: 'collection', format: 'json', pointer: '/stories', fields: { subtopic: { kind: 'property', pointer: '/text' } }, required: ['subtopic'] }
  });
  assert.equal(r.stories().length, 1);
  data = { stories: [] };
  await r.refresh();
  assert.equal(r.stories().length, 1);
  await r.refresh();
  assert.deepEqual(r.stories(), []);
});
