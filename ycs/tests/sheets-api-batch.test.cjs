'use strict';
// Regression test for the official API reader: one range Google rejects with 400
// failed the whole batchGet and cleared the tab cache, freezing every connection
// on that spreadsheet (review repro e7).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { GoogleSheetsAPI } = require('../google-sheets-api.cjs');
const { DataSources } = require('../data.cjs');
const { fixture } = require('./playback.test.cjs');

const url = 'https://docs.google.com/spreadsheets/d/1PUBLIC_SHEET_TEST_0000000001/edit';
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('a rejected range fails only its own connection; healthy ranges on the workbook keep updating', async (t) => {
  const calls = { batch: [], metadata: 0 };
  let round = 'R1', clock = 1e6;
  const sheets = new GoogleSheetsAPI({
    key: 'k',
    now: () => clock,
    fetcher: async (input) => {
      const target = new URL(input);
      if (!target.pathname.endsWith(':batchGet')) {
        calls.metadata++;
        return json({ sheets: [{ properties: { sheetId: 0, title: 'Scores' } }, { properties: { sheetId: 1, title: 'Ticker' } }] });
      }
      const ranges = target.searchParams.getAll('ranges');
      calls.batch.push(ranges);
      // Staff deleted columns: the wide range now "exceeds grid limits".
      if (ranges.some((range) => range.includes('AF'))) return json({ error: { message: 'Range exceeds grid limits' } }, 400);
      return json({ valueRanges: ranges.map(() => ({ values: [['Round'], [round]] })) });
    }
  });
  const base = await fixture(t);
  const sources = new DataSources(path.join(base.root, 'api.json'), base.stages, { sheets, now: () => clock });
  t.after(() => sources.close());
  await sources.ready;
  const good = (await sources.saveConnection(null, 'Round', { url, worksheet: '0', range: 'A1:A2', refreshSeconds: 5 }, 0)).connectionId;
  const other = (await sources.saveConnection(null, 'Other', { url, worksheet: '1', range: 'B1:B2', refreshSeconds: 5 }, sources.snapshot().revision)).connectionId;
  await sources.edit(sources.snapshot().revision, (next) => {
    next.connections['sheet.wide'] = { type: 'google-sheets', label: 'Wide', settings: { url, worksheet: '1', range: 'A1:AF2', refreshSeconds: 5 } };
  });
  const ref = sources.reference({ connection: good, selection: { kind: 'cell', cell: 'A2' } });
  sources.retain('t', [ref]);
  const metadata = calls.metadata;
  round = 'R2';
  for (let poll = 0; poll < 4; poll++) {
    for (const runtime of sources.runtimes.values()) runtime.nextAt = 0;
    calls.batch.length = 0;
    clock += 5000;
    await sources.pollSheets();
    const snapshot = sources.snapshot();
    assert.equal(sources.value(ref), 'R2', `poll ${poll + 1}: healthy tab updates`);
    assert.equal(snapshot.connections[good].health, 'ok');
    assert.equal(snapshot.connections[other].health, 'ok');
    assert.equal(snapshot.connections['sheet.wide'].health, 'error');
    // First poll: the failed batch plus one retry per range. Later polls: one batch
    // for the healthy ranges and one request for the remembered bad range.
    assert.equal(calls.batch.length, poll === 0 ? 4 : 2);
  }
  assert.ok(calls.metadata - metadata <= 1, 'range errors refresh tab metadata at most once a minute');
});
