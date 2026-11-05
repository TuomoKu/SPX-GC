'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { fixture } = require('./playback.test.cjs');
const { DataSources } = require('../data.cjs');
const { GoogleSheetsAPI } = require('../google-sheets-api.cjs');
const { SheetMetrics } = require('../sheet-metrics.cjs');
const url = 'https://docs.google.com/spreadsheets/d/1PUBLIC_SHEET_TEST_1234567890/edit';
async function setup(t) {
  const f = await fixture(t), calls = [];
  let now = Date.now();
  const sheets = new GoogleSheetsAPI({ key: 'test-only-key', now: () => now, fetcher: async input => {
    const request = new URL(input); calls.push(request);
    const result = request.pathname.endsWith('batchGet')
      ? { valueRanges: request.searchParams.getAll('ranges').map(range => ({ range, values: [['CUSTOM', 'STATUS'], ['FALSE', 'IN PROGRESS']] })) }
      : { sheets: [1, 2, 3].map(number => ({ properties: { sheetId: number, title: 'STAGE ' + number } })) };
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
  } });
  const sources = new DataSources(path.join(f.root, 'sources.json'), f.stages, { sheets, now: () => now });
  t.after(() => sources.close()); await sources.ready;
  const book = await sources.saveWorkbook({ label: 'Event', settings: { url, refreshSeconds: 0.25 }, revision: sources.document.revision });
  return { ...f, sources, sheets, calls, book: book.workbookId, advance: seconds => { now += seconds * 1000; }, now: () => now };
}
async function group(r, number) { return (await r.sources.saveWorkbookGroup(r.book, { label: 'Stage ' + number, worksheet: 'STAGE ' + number, revision: r.sources.document.revision })).groupId; }
async function range(r, groupId, name = 'Match', extra = {}) {
  return (await r.sources.saveNamedRange(r.book, groupId, { label: name, settings: { worksheet: 'STAGE 1', range: 'A1:B3' }, headerRow: 1, dataRow: 2, revision: r.sources.document.revision, ...extra })).connectionId;
}
test('15 named ranges across three tabs share one scheduled batch and one refresh interval', async t => {
  const r = await setup(t);
  for (let stage = 1; stage <= 3; stage++) {
    const id = await group(r, stage);
    for (let index = 0; index < 5; index++) await range(r, id, 'Range ' + index, { settings: { worksheet: 'STAGE ' + stage, range: `A${index * 3 + 1}:B${index * 3 + 3}` }, headerRow: index * 3 + 1, dataRow: index * 3 + 2 });
  }
  r.calls.length = 0; r.sheets.metrics = new SheetMetrics(r.now);
  await r.sources.pollSheets();
  assert.equal(r.calls.length, 1); assert.equal(r.calls[0].searchParams.getAll('ranges').length, 15);
  const snapshot = r.sources.snapshot();
  assert.ok(snapshot.workbooks[r.book].lastSync); assert.equal(snapshot.workbooks[r.book].requestsPerMinute, 1);
  await r.sources.pollSheets(); assert.equal(r.calls.length, 1);
  r.advance(0.25); await r.sources.pollSheets(); assert.equal(r.calls.length, 2);
  await r.sources.saveWorkbook({ id: r.book, label: 'Renamed event', settings: { url, refreshSeconds: 100000 }, revision: r.sources.document.revision });
  assert.ok(Object.values(r.sources.document.connections).every(c => c.settings.refreshSeconds === 100000));
});
test('group/range renames preserve cell bindings; used ranges cannot be moved or deleted', async t => {
  const r = await setup(t), id = await group(r, 1), connection = await range(r, id);
  await r.sources.saveMappings('stage-1', 'ticker', '/test/graphic.html', [{ field: 'f5', scope: 'override', binding: { connection, selection: { kind: 'cell', cell: 'B2' } } }], r.sources.document.revision);
  await r.sources.saveWorkbookGroup(r.book, { id, label: 'Main stage', worksheet: 'STAGE 1', revision: r.sources.document.revision });
  await range(r, id, 'Renamed match', { id: connection });
  assert.equal(r.sources.document.mappings.find(mapping => mapping.stage === 'stage-1' && mapping.graphic === 'ticker').binding.connection, connection);
  assert.equal(r.sources.snapshot().connections[connection].label, 'Renamed match');
  await assert.rejects(range(r, id, 'Renamed match', { id: connection, settings: { worksheet: 'STAGE 2', range: 'A1:B3' } }), { status: 409 });
  await assert.rejects(r.sources.removeWorkbookItem(r.book, id, r.sources.document.revision), { status: 409 });
});
test('invalid intervals, duplicated spreadsheet URLs, range names, and headers are rejected', async t => {
  const r = await setup(t), id = await group(r, 1);
  for (const refreshSeconds of [0, -1, Infinity, NaN]) await assert.rejects(r.sources.saveWorkbook({ label: 'Bad', settings: { url, refreshSeconds }, revision: r.sources.document.revision }));
  await assert.rejects(r.sources.saveWorkbook({ label: 'Duplicate', settings: { url, refreshSeconds: 5 }, revision: r.sources.document.revision }));
  await range(r, id);
  await assert.rejects(range(r, id));
  await assert.rejects(range(r, id, 'Bad header', { headerRow: 4 }));
  await assert.rejects(range(r, id, 'Bad row', { dataRow: 1 }));
});
test('actual metadata and batched requests count over a rolling minute, including failures', async t => {
  const r = await setup(t), id = await group(r, 1); await range(r, id);
  assert.equal(r.sources.snapshot().workbooks[r.book].requestsPerMinute, 2);
  r.sheets.fetcher = async () => new Response('{}', { status: 429, headers: { 'Content-Type': 'application/json' } });
  await r.sources.refreshWorkbook(r.book);
  assert.equal(r.sources.snapshot().workbooks[r.book].requestsPerMinute, 3);
  assert.equal(r.sources.snapshot().workbooks[r.book].lastSync, null);
  assert.equal(r.sources.snapshot().connections[Object.keys(r.sources.document.connections)[0]].rows[1][1].value, 'IN PROGRESS');
  r.advance(61); assert.equal(r.sources.snapshot().workbooks[r.book].requestsPerMinute, 0);
});

test('confirmed worksheet changes preserve cell mappings and confirmed deletion removes mappings', async t => {
  const r = await setup(t), groupId = await group(r, 1), connection = await range(r, groupId);
  const pick = { connection, selection: { kind: 'cell', cell: 'B2' } };
  await r.sources.saveMappings('stage-1', 'ticker', '/test/graphic.html', [
    {field:'f5', scope:'override', binding:pick}
  ], r.sources.document.revision);
  const revision = r.sources.document.revision;
  const update = {id:connection, settings:{worksheet:'STAGE 2', range:'A1:B3'}};
  await assert.rejects(range(r, groupId, 'Match', update), {status:409, confirmationRequired:true});
  assert.equal(r.sources.document.revision, revision);
  await range(r, groupId, 'Match', {...update, confirmed:true});
  assert.equal(r.sources.document.connections[connection].settings.worksheet, 'STAGE 2');
  assert.deepEqual(r.sources.document.mappings.find(m=>m.stage==='stage-1' && m.graphic==='ticker').binding, pick);
  await assert.rejects(r.sources.removeConnection(connection, r.sources.document.revision), {status:409, confirmationRequired:true});
  await r.sources.removeConnection(connection, r.sources.document.revision, true);
  assert.equal(r.sources.document.connections[connection], undefined);
  assert.equal(r.sources.mapping('stage-1','ticker','f5','/test/graphic.html'), undefined);
});

test('confirmed group deletion clears dependent aliases and mappings atomically', async t => {
  const r = await setup(t), groupId = await group(r, 1), connection = await range(r, groupId);
  await r.sources.edit(r.sources.document.revision, next => {
    next.sources.alias = {type:'connection-value',label:'Alias',binding:{connection,selection:{kind:'cell',cell:'B2'}}};
    next.mappings.push({stage:'stage-1',graphic:'other',field:'f5',source:'alias'});
  });
  await assert.rejects(r.sources.removeWorkbookItem(r.book, groupId, r.sources.document.revision), {confirmationRequired:true});
  await r.sources.removeWorkbookItem(r.book, groupId, r.sources.document.revision, true);
  assert.equal(r.sources.document.sources.alias, undefined);
  assert.equal(r.sources.document.connections[connection], undefined);
  assert.equal(r.sources.mapping('stage-1','other','f5','/test/graphic.html'), undefined);
});
