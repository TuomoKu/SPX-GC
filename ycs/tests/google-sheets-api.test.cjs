'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { GoogleSheetsAPI, createSheets } = require('../google-sheets-api.cjs');
const { PublicSheets } = require('../public-sheets.cjs');
const { DataSources } = require('../data.cjs');
const { fixture } = require('./playback.test.cjs');
const { normalizeSelection, resolveCollection } = require('../collections.cjs');

const settings = {
  url: 'https://docs.google.com/spreadsheets/d/1PUBLIC_SHEET_TEST_1234567890/edit#gid=7',
  worksheet: '7', range: 'A1:C3', refreshSeconds: 5, cell: 'A2'
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const tabs = { sheets: [{ properties: { sheetId: 7, title: "Stage's data" } }, { properties: { sheetId: 8, title: 'Stories' } }] };
function mock() {
  const calls = [];
  let failure = null, title = "Stage's data", clock = 0;
  const sheets = new GoogleSheetsAPI({ key: 'test-server-secret', now: () => clock, fetcher: async (url, options) => {
    calls.push(url);
    assert.equal(url.hostname, 'sheets.googleapis.com');
    assert.equal(url.searchParams.has('key'), false);
    assert.equal(options.headers['X-Goog-Api-Key'], 'test-server-secret');
    assert.equal(options.redirect, 'manual');
    assert.equal(options.credentials, 'omit');
    if (failure) return json({ error: { message: 'test-server-secret upstream detail' } }, failure);
    if (!url.pathname.endsWith('values:batchGet')) return json({ sheets: [{ properties: { sheetId: 7, title } }, tabs.sheets[1]] });
    assert.equal(url.searchParams.get('valueRenderOption'), 'FORMATTED_VALUE');
    return json({ valueRanges: url.searchParams.getAll('ranges').map(range => ({
      range, values: range.endsWith('!A2') ? [['LATEST ROUND']] : [['Published', 'Order', 'Topic'], [true, '1,119', 'Story'], [false]]
    })) });
  } });
  return { sheets, calls, fail: status => { failure = status; }, rename: value => { title = value; }, advance: ms => { clock += ms; } };
}

test('transport is opt-in; missing credentials fail clearly and never fall back silently', () => {
  assert.ok(createSheets() instanceof PublicSheets);
  assert.ok(createSheets({ enabled: false }) instanceof PublicSheets);
  assert.throws(() => createSheets({ enabled: true }, { env: {} }), /environment variable/);
  assert.throws(() => createSheets({ enabled: true, keyEnv: 'bad name' }), /Invalid sheetsAPI/);
  assert.ok(createSheets({ enabled: true, keyEnv: 'SHEETS_KEY' }, { env: { SHEETS_KEY: 'test-key' } }) instanceof GoogleSheetsAPI);
});

test('same-workbook reads batch and deduplicate ranges; headers, booleans and blank addresses survive', async () => {
  const { sheets, calls } = mock();
  const [first, duplicate, second] = await Promise.all([
    sheets.read(settings, { headerRows: [1, 2] }), sheets.read(settings),
    sheets.read({ ...settings, worksheet: 'Stories' })
  ]);
  assert.equal(calls.length, 2, 'one shared metadata request and one values batch');
  assert.deepEqual(calls[1].searchParams.getAll('ranges'), ["'Stage''s data'!A1:C3", "'Stories'!A1:C3"]);
  assert.deepEqual(first.rows, duplicate.rows);
  assert.deepEqual(second.rows, first.rows);
  assert.equal(first.rows[0][0].value, 'Published');
  assert.equal(first.rows[1][0].value, 'TRUE');
  assert.equal(first.rows[1][1].value, '1,119');
  assert.equal(first.rows[2][0].value, 'FALSE');
  assert.deepEqual(first.rows[2][2], { address: 'C3', value: '', usable: false });
  assert.deepEqual(first.headerRows, [1, 2]);
  assert.equal((await sheets.read(settings, { singleCell: true })).value, 'LATEST ROUND');
  assert.equal(calls.length, 3, 'metadata reused');
});

test('different workbooks stay separate; worksheet discovery refreshes cached metadata and gids survive tab renames', async () => {
  const r = mock();
  await Promise.all([r.sheets.read(settings), r.sheets.read({ ...settings, url: settings.url.replace('1234567890', '1234567891') })]);
  assert.equal(r.calls.length, 4);
  r.rename('New name');
  const discovery = await r.sheets.worksheets({ url: settings.url });
  assert.equal(discovery.worksheets[0].name, 'New name');
  assert.equal(discovery.selected, '7');
  await r.sheets.read(settings);
  assert.equal(r.calls.at(-1).searchParams.get('ranges'), "'New name'!A1:C3");
  r.advance(300001);
  const before = r.calls.length;
  await r.sheets.read(settings);
  assert.equal(r.calls.length - before, 2, 'expired metadata refreshed');
  await assert.rejects(r.sheets.read({ ...settings, worksheet: 'missing' }), /Worksheet not found/);
});

test('invalid, oversized, redirected and quota responses reject without exposing upstream errors or keys', async () => {
  for (const status of [302, 400, 401, 403, 404, 429, 500]) {
    const r = mock(); r.fail(status);
    await assert.rejects(r.sheets.read(settings), error => {
      assert.equal(error.status, 502);
      assert.doesNotMatch(error.message, /test-server-secret|upstream detail/);
      return true;
    });
  }
  const bodies = [
    json({ valueRanges: [] }), json({ valueRanges: [{ values: [[{}, '', '']] }] }),
    json({ valueRanges: [{ values: Array(4).fill([]) }] }),
    new Response('not JSON', { headers: { 'Content-Type': 'application/json' } }),
    new Response('html', { headers: { 'Content-Type': 'text/html' } }),
    new Response('x', { headers: { 'Content-Type': 'application/json', 'Content-Length': '8388609' } })
  ];
  for (const body of bodies) {
    const sheets = new GoogleSheetsAPI({ key: 'secret', fetcher: async url => url.pathname.endsWith('values:batchGet') ? body : json(tabs) });
    await assert.rejects(sheets.read(settings));
  }
});

test('empty/oversized single cells reject; cancelling one queued read does not break its batch peers', async () => {
  for (const value of ['', 'x'.repeat(301)]) {
    const sheets = new GoogleSheetsAPI({ key: 'secret', fetcher: async url => json(url.pathname.endsWith('values:batchGet') ? { valueRanges: [{ values: [[value]] }] } : tabs) });
    await assert.rejects(sheets.read(settings, { singleCell: true }), /Selected cell/);
  }
  const r = mock();
  await r.sheets.tabs(settings.url.split('/')[5]);
  const controller = new AbortController();
  const cancelled = r.sheets.read(settings, { signal: controller.signal });
  const peer = r.sheets.read(settings);
  await Promise.resolve();
  controller.abort();
  await assert.rejects(cancelled);
  assert.equal((await peer).rows[1][2].value, 'Story');
  const before = r.calls.length;
  await assert.rejects(r.sheets.read(settings, { signal: controller.signal }));
  assert.equal(r.calls.length, before);
});

test('API rows feed existing ticker collection mapping, transforms, enabled state and ordering', async () => {
  const input = { ...settings, range: 'A1:E4' };
  const sheets = new GoogleSheetsAPI({ key: 'secret', fetcher: async url => json(
    url.pathname.endsWith('values:batchGet') ? { valueRanges: [{ values: [
      ['Published', 'Category', 'Topic', 'Subtopic', 'Order'],
      [true, 'TCG', 'News', 'Later story', 2],
      [false, 'Games', 'Hidden', '', 0],
      [true, 'Games', 'Final', 'First story', 1]
    ] }] } : tabs
  ) });
  const result = await sheets.read(input);
  const selection = normalizeSelection({
    kind: 'collection', format: 'sheet', range: input.range, headerRow: 1,
    fields: {
      category: { kind: 'column', name: 'Category' },
      topic: { kind: 'column', name: 'Topic' },
      subtopic: { kind: 'column', name: 'Subtopic', transform: { kind: 'uppercase' } }
    },
    enabled: { kind: 'column', name: 'Published' },
    order: { kind: 'column', name: 'Order' }, required: ['subtopic']
  }, input);
  const playlist = resolveCollection(result.rows, selection);
  assert.equal(playlist.invalid, 0);
  assert.equal(playlist.excluded, 1);
  assert.deepEqual(playlist.items.map(item => item.subtopic), ['FIRST STORY', 'LATER STORY']);
});

test('many workbooks use at most four outbound requests simultaneously', async () => {
  let active = 0, maximum = 0;
  const sheets = new GoogleSheetsAPI({ key: 'secret', fetcher: async url => {
    maximum = Math.max(maximum, ++active);
    await new Promise(resolve => setImmediate(resolve));
    active--;
    return json(url.pathname.endsWith('values:batchGet') ? { valueRanges: [{ values: [['value']] }] } : tabs);
  } });
  await Promise.all(Array.from({ length: 12 }, (_, index) => sheets.read({
    ...settings, url: settings.url.replace('1234567890', '12345678' + String(index).padStart(2, '0'))
  })));
  assert.equal(maximum, 4);
  assert.equal(sheets.active, 0);
});

test('scheduler batches more than four existing connections; failures retain values and respect backoff', async t => {
  const base = await fixture(t), r = mock();
  let clock = 1000;
  const sources = new DataSources(path.join(base.root, 'api-data.json'), base.stages, { sheets: r.sheets, now: () => clock });
  t.after(() => sources.close());
  await sources.ready;
  const ids = [];
  for (let index = 0; index < 6; index++) {
    const added = await sources.saveConnection(null, `Range ${index}`, settings, sources.snapshot().revision);
    ids.push(added.connectionId);
  }
  const revision = sources.snapshot().revision, before = r.calls.length;
  clock += 5000;
  await sources.pollSheets();
  assert.equal(r.calls.length - before, 1, 'six connections share a single scheduled request');
  assert.equal(sources.snapshot().revision, revision, 'polling does not change configuration');
  const rows = sources.runtimes.get(ids[0]).rows;
  assert.equal(rows[1][2].value, 'Story');
  r.fail(429); clock += 5000;
  await sources.pollSheets();
  assert.deepEqual(sources.runtimes.get(ids[0]).rows, rows);
  assert.equal(sources.runtimes.get(ids[0]).health, 'error');
  const failedCalls = r.calls.length;
  clock += 4999; await sources.pollSheets();
  assert.equal(r.calls.length, failedCalls);
  r.fail(null); clock += 1; await sources.pollSheets();
  assert.equal(sources.runtimes.get(ids[0]).health, 'ok');
});
