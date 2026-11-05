'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { DataSources } = require('../data.cjs');
const { fixture } = require('./playback.test.cjs');
const settings = { url: 'https://docs.google.com/spreadsheets/d/1PUBLIC_SHEET_TEST_1234567890/edit', worksheet: '42', range: 'A1:C4', refreshSeconds: 5 };
const cells = values => values.map((row, index) => row.map((value, column) => ({ address: String.fromCharCode(65 + column) + (index + 1), value, usable: Boolean(value) })));
const table = () => cells([['Stage', 'Round', 'Status'], ['STAGE 1', 'ROUND 1', 'READY'], ['STAGE 2', 'ROUND 2', 'PLAYING'], ['STAGE 3', 'FINAL', 'WAITING']]);
const selection = stage => ({ kind: 'row', headerRow: 1, keyColumn: 'Stage', keyValue: stage, valueColumn: 'Round' });
async function setup(t) {
  const base = await fixture(t); let data = table(), calls = 0;
  const sheets = { read: async () => { calls++; return { rows: structuredClone(data) }; } };
  const sources = new DataSources(path.join(base.root, 'sources.json'), base.stages, { sheets }); await sources.ready; base.playback.sources = sources;
  sources.activeReferences = () => [...base.playback.states].flatMap(([stage, state]) => state.program.flatMap(graphic => Object.entries(graphic.links || {}).filter(([, link]) => link.mode === 'linked').map(([field, link]) => ({ stage, graphic: graphic.id, field, source: link.source }))));
  t.after(() => sources.close());
  return { ...base, sources, sheets, calls: () => calls, set: value => { data = value; } };
}
test('migration deduplicates cell sources, preserves IDs and makes an exact v1 backup', async t => {
  const base = await fixture(t), file = path.join(base.root, 'data.json');
  const original = JSON.stringify({ version: 1, revision: 7, sources: { first: { type: 'google-sheets', label: 'Round', settings: { ...settings, cell: 'B2' } }, second: { type: 'google-sheets', label: 'Stage', settings: { ...settings, cell: 'A4' } } }, mappings: [{ stage: 'stage-1', graphic: 'ticker', field: 'f5', source: 'first' }] });
  await fs.writeFile(file, original);
  const sources = new DataSources(file, base.stages, { sheets: { read: async () => ({ rows: table() }) } }); t.after(() => sources.close()); await sources.ready;
  assert.equal(sources.snapshot().version, 2); assert.equal(sources.snapshot().revision, 7); assert.equal(Object.keys(sources.snapshot().connections).length, 1);
  assert.equal(await fs.readFile(file + '.v1-backup.json', 'utf8'), original);
  await sources.pollSheets(); assert.equal(sources.value('first'), 'ROUND 1'); assert.equal(sources.value('second'), 'STAGE 3');
  assert.equal(sources.value(sources.mapping('stage-1', 'ticker', 'f5')), 'ROUND 1');
});
test('one dataset serves independent stage rows; reordered rows work and ambiguous/empty values hold their cache across restart', async t => {
  const r = await setup(t), { connectionId } = await r.sources.saveConnection(null, 'Show', settings, 0);
  const bind = { connection: connectionId, selection: selection('STAGE 1') }, ref = r.sources.reference(bind);
  assert.equal(r.sources.value(ref), 'ROUND 1'); const reads = r.calls();
  assert.equal(r.sources.value(r.sources.reference({ connection: connectionId, selection: selection('STAGE 2') })), 'ROUND 2'); assert.equal(r.calls(), reads);
  const reordered = table(); [reordered[1], reordered[3]] = [reordered[3], reordered[1]]; reordered[3][1].value = 'UPDATED'; r.set(reordered); await r.sources.refreshSheet(connectionId); assert.equal(r.sources.value(ref), 'UPDATED');
  const duplicate = table(); duplicate[2][0].value = 'STAGE 1'; r.set(duplicate); await r.sources.refreshSheet(connectionId);
  assert.equal(r.sources.value(ref), 'UPDATED'); assert.match(r.sources.snapshot().sources[ref].error, /More than one/);
  await r.sources.flushCache(); // background cache writes are throttled
  const restarted = new DataSources(r.sources.file, r.stages, { sheets: r.sheets }); t.after(() => restarted.close()); await restarted.ready;
  assert.equal(restarted.value(restarted.reference(bind)), 'UPDATED');
  const blank = table(); blank[1][1].value = ''; r.set(blank); await restarted.refreshSheet(connectionId); assert.equal(restarted.value(restarted.reference(bind)), 'UPDATED');
});
test('template defaults are reusable, overrides are atomic and program keeps its committed binding until Update', async t => {
  const r = await setup(t), { connectionId } = await r.sources.saveConnection(null, 'Show', settings, 0), template = '/test/graphic.html';
  const bind = stage => ({ connection: connectionId, selection: selection(stage) });
  await r.sources.saveMappings('stage-1', 'ticker', template, [{ field: 'f5', scope: 'default', binding: bind('STAGE 1') }], r.sources.snapshot().revision);
  assert.equal(r.sources.value(r.sources.mapping('stage-1', 'lower-third', 'f5', template)), 'ROUND 1'); assert.equal(r.sources.mapping('stage-2', 'ticker', 'f5', template), 'test.stage-2.currentRound');
  await r.playback.command('stage-1', 'ticker', 'play', undefined, { links: { f5: { mode: 'linked', manual: 'FALLBACK' } } });
  await r.sources.saveMappings('stage-1', 'ticker', template, [{ field: 'f5', scope: 'override', binding: bind('STAGE 2') }], r.sources.snapshot().revision);
  const changed = table(); changed[1][1].value = 'OLD STILL LIVE'; r.set(changed); await r.sources.refreshSheet(connectionId); await r.playback.refreshLinks('stage-1');
  assert.equal(r.playback.snapshot('stage-1', 'program').graphics[0].data.f5, 'OLD STILL LIVE');
  await r.playback.command('stage-1', 'ticker', 'update'); assert.equal(r.playback.snapshot('stage-1', 'program').graphics[0].data.f5, 'ROUND 2');
  const revision = r.sources.snapshot().revision;
  await assert.rejects(r.sources.saveMappings('stage-1', 'ticker', template, [{ field: 'f5', scope: 'override', binding: null }, { field: 'f4', scope: 'override', binding: { connection: 'missing', selection: selection('STAGE 1') } }], revision));
  assert.equal(r.sources.snapshot().revision, revision); assert.equal(r.sources.value(r.sources.mapping('stage-1', 'ticker', 'f5', template)), 'ROUND 2');
});
test('connection usage protects saved/default/on-air references; unused connections can be edited and removed', async t => {
  const r = await setup(t), added = await r.sources.saveConnection(null, 'Show', settings, 0), id = added.connectionId;
  const pick = { connection: id, selection: { kind: 'cell', cell: 'B2' } };
  await r.sources.saveMappings('stage-1', 'ticker', '/test/graphic.html', [{ field: 'f5', scope: 'override', binding: pick }], r.sources.snapshot().revision);
  await r.playback.command('stage-1', 'ticker', 'play', undefined, { links: { f5: { mode: 'linked', manual: 'FALLBACK' } } });
  await assert.rejects(r.sources.saveConnection(id, 'Changed target', { ...settings, worksheet: '43' }, r.sources.snapshot().revision), { status: 409 });
  await r.sources.saveConnection(id, 'Renamed', { ...settings, refreshSeconds: 10 }, r.sources.snapshot().revision);
  await r.sources.saveMappings('stage-1', 'ticker', '/test/graphic.html', [{ field: 'f5', scope: 'override', binding: null }], r.sources.snapshot().revision);
  assert.equal(r.sources.usages(id).filter(usage => usage.kind === 'on-air').length, 1); await assert.rejects(r.sources.removeConnection(id, r.sources.snapshot().revision), { status: 409 });
  await r.playback.clear('stage-1'); await r.sources.saveConnection(id, 'Unused', { ...settings, worksheet: '44' }, r.sources.snapshot().revision);
  await r.sources.removeConnection(id, r.sources.snapshot().revision); assert.equal(r.sources.snapshot().connections[id], undefined);
});

test('multiple ordinary text fields link independently while hidden identity and typed fields remain protected', async t => {
  const r = await setup(t), rundown = await r.repository.read('stage-1');
  rundown.templates[0].DataFields.push({ field: 'f4', ftype: 'textfield', title: 'Status', value: 'MANUAL STATUS' }, { field: 'f2', ftype: 'checkbox', value: '1' }); await r.repository.write('stage-1', rundown);
  const { connectionId } = await r.sources.saveConnection(null, 'Show', settings, 0);
  await r.sources.saveMappings('stage-1', 'ticker', '/test/graphic.html', [
    { field: 'f5', scope: 'override', binding: { connection: connectionId, selection: selection('STAGE 1') } },
    { field: 'f4', scope: 'override', binding: { connection: connectionId, selection: { ...selection('STAGE 1'), valueColumn: 'Status' } } }
  ], r.sources.snapshot().revision);
  const links = { f5: { mode: 'linked', manual: 'MANUAL ROUND' }, f4: { mode: 'linked', manual: 'MANUAL STATUS' } };
  await r.playback.command('stage-1', 'ticker', 'play', undefined, { links });
  assert.equal(r.playback.snapshot('stage-1', 'program').graphics[0].data.f4, 'READY');
  await r.playback.command('stage-1', 'ticker', 'update', undefined, { links: { f4: { mode: 'manual', manual: 'CUSTOM' } } });
  const changed = table(); changed[1][1].value = 'NEW ROUND'; changed[1][2].value = 'FINISHED'; r.set(changed); await r.sources.refreshSheet(connectionId); await r.playback.refreshLinks('stage-1');
  const data = r.playback.snapshot('stage-1', 'program').graphics[0].data; assert.equal(data.f4, 'CUSTOM'); assert.equal(data.f5, 'NEW ROUND');
  for (const field of ['f0']) await assert.rejects(r.playback.command('stage-1', 'ticker', 'preview', undefined, { links: { [field]: { mode: 'linked', manual: 'x' } } }), { status: 400 });
});
