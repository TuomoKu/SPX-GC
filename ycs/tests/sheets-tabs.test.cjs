'use strict';
// Regression tests for the public query reader: Google answers an unknown gid or
// sheet name with the first tab and status "ok" (review repro e8), and header rows
// were re-read on every poll.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { PublicSheets } = require('../public-sheets.cjs');
const { DataSources } = require('../data.cjs');
const { fixture } = require('./playback.test.cjs');

const url = 'https://docs.google.com/spreadsheets/d/1PUBLIC_SHEET_TEST_0000000001/edit';
const wrap = (rows) =>
  `ycsSheet(${JSON.stringify({ status: 'ok', table: { cols: rows[0].map(() => ({})), rows: rows.map((row) => ({ c: row.map((v) => (v === null ? null : { v })) })) } })});`;
const html = (tabs) =>
  tabs.map(([gid, name]) => `items.push({name: ${JSON.stringify(name)}, pageUrl: "x", gid: "${gid}",initialSheet:false});`).join('');

// A Google stand-in: tab data by gid or sheet name, first tab for anything unknown.
function google() {
  const state = {
    tabs: { 0: { name: 'Notes', rows: [['Notes', 'Staff only'], ['Lunch', '12:30']] }, 555: { name: 'Rounds', rows: [['Stage', 'Round'], ['STAGE 1', 'SWISS ROUND 5']] } },
    clock: 1e6,
    calls: { list: 0, data: 0 }
  };
  const fetcher = async (input) => {
    const target = new URL(input);
    if (target.pathname.endsWith('/htmlview')) {
      state.calls.list++;
      return new Response(html(Object.entries(state.tabs).map(([gid, tab]) => [gid, tab.name])), { headers: { 'Content-Type': 'text/html' } });
    }
    state.calls.data++;
    const query = target.searchParams;
    const tab =
      state.tabs[query.get('gid')] ||
      Object.values(state.tabs).find((item) => item.name === query.get('sheet')) ||
      Object.values(state.tabs)[0];
    const range = query.get('range'), single = /^[A-Z]+(\d+):[A-Z]+\1$/.exec(range);
    const rows = single ? [tab.rows[Number(single[1]) - 1]] : tab.rows;
    return new Response(wrap(rows), { headers: { 'Content-Type': 'application/javascript' } });
  };
  return { state, sheets: new PublicSheets(fetcher, { now: () => state.clock }) };
}

test('a deleted tab is a source failure that keeps the last good value, not tab 1 on air', async (t) => {
  const base = await fixture(t), g = google();
  const sources = new DataSources(path.join(base.root, 'tabs.json'), base.stages, { sheets: g.sheets, now: () => g.state.clock });
  t.after(() => sources.close());
  await sources.ready;
  const { connectionId } = await sources.saveConnection(null, 'Rounds', { url, worksheet: '555', range: 'A1:B2', refreshSeconds: 5 }, 0);
  const ref = sources.reference({ connection: connectionId, selection: { kind: 'cell', cell: 'B2' } });
  sources.retain('t', [ref]);
  assert.equal(sources.value(ref), 'SWISS ROUND 5');
  delete g.state.tabs[555]; // staff delete (or re-create) the Rounds tab
  g.state.clock += 60000;
  await sources.refreshSheet(connectionId);
  assert.equal(sources.value(ref), 'SWISS ROUND 5');
  const connection = sources.snapshot().connections[connectionId];
  assert.equal(connection.health, 'error');
  assert.match(connection.error, /Worksheet not found/);
});

test('a renamed tab selected by name fails; selection by gid survives the rename', async () => {
  const g = google();
  await g.sheets.read({ url, worksheet: 'Rounds', range: 'A1:B2', refreshSeconds: 5 });
  g.state.tabs[555].name = 'Rounds (old)';
  g.state.clock += 60000;
  await assert.rejects(g.sheets.read({ url, worksheet: 'Rounds', range: 'A1:B2', refreshSeconds: 5 }), /Worksheet not found/);
  const byGid = await g.sheets.read({ url, worksheet: '555', range: 'A1:B2', refreshSeconds: 5 });
  assert.equal(byGid.rows[1][1].value, 'SWISS ROUND 5');
});

test('the worksheet list is cached: unchanged polls add no list request, changed content waits for a fresh list', async () => {
  const g = google(), settings = { url, worksheet: '555', range: 'A1:B2', refreshSeconds: 5 };
  await g.sheets.read(settings);
  assert.equal(g.state.calls.list, 1);
  for (let i = 0; i < 20; i++) {
    g.state.clock += 5000;
    await g.sheets.read(settings);
  }
  assert.equal(g.state.calls.list, 1, 'unchanged content within the five-minute TTL needs no list request');
  g.state.tabs[555].rows[1][1] = 'SWISS ROUND 6';
  g.state.clock += 5000;
  assert.equal((await g.sheets.read(settings)).rows[1][1].value, 'SWISS ROUND 6');
  assert.equal(g.state.calls.list, 2, 'new content is checked against a list fetched after it');
  g.state.tabs[555].rows[1][1] = 'SWISS ROUND 7';
  g.state.clock += 2000;
  await assert.rejects(g.sheets.read(settings, { settle: true }), (error) => error.transient && error.retryAfterMs === 3000);
  assert.equal(g.state.calls.list, 2, 'lists are refreshed at most every five seconds per spreadsheet');
  assert.equal((await g.sheets.read(settings)).rows[1][1].value, 'SWISS ROUND 7', 'an explicit test accepts the recent list');
  assert.equal(g.state.calls.list, 2);
  g.state.clock += 3000;
  assert.equal((await g.sheets.read(settings, { settle: true })).rows[1][1].value, 'SWISS ROUND 7');
  assert.equal(g.state.calls.list, 3);
});

test('a tab deleted moments after a list fetch never reaches the output', async (t) => {
  const base = await fixture(t), g = google();
  const sources = new DataSources(path.join(base.root, 'tabs.json'), base.stages, { sheets: g.sheets, now: () => g.state.clock });
  t.after(() => sources.close());
  await sources.ready;
  const { connectionId } = await sources.saveConnection(null, 'Rounds', { url, worksheet: '555', range: 'A1:B2', refreshSeconds: 5 }, 0);
  const ref = sources.reference({ connection: connectionId, selection: { kind: 'cell', cell: 'B2' } });
  sources.retain('t', [ref]);
  delete g.state.tabs[555];
  g.state.clock += 1000;
  await sources.refreshSheet(connectionId);
  assert.equal(sources.value(ref), 'SWISS ROUND 5', 'held, not tab 1');
  assert.equal(sources.snapshot().connections[connectionId].health, 'ok');
  g.state.clock = Date.parse(sources.snapshot().connections[connectionId].nextRefresh);
  await sources.pollSheets();
  assert.equal(sources.value(ref), 'SWISS ROUND 5');
  assert.match(sources.snapshot().connections[connectionId].error, /Worksheet not found/);
});

test('a new tab missing from a stale list is refetched before failing', async () => {
  const g = google();
  await g.sheets.read({ url, worksheet: '555', range: 'A1:B2', refreshSeconds: 5 });
  g.state.tabs[777] = { name: 'Late', rows: [['Late', 'tab'], ['x', 'NEW TAB']] };
  g.state.clock += 20000;
  const result = await g.sheets.read({ url, worksheet: '777', range: 'A1:B2', refreshSeconds: 5 });
  assert.equal(result.rows[1][1].value, 'NEW TAB');
  assert.equal(g.state.calls.list, 2);
});

test('an unavailable worksheet list does not block reads, warns, and is retried at most once a minute', async () => {
  let lists = 0;
  const now = { value: 0 };
  const sheets = new PublicSheets(async (input) => {
    if (new URL(input).pathname.endsWith('/htmlview')) {
      lists++;
      return new Response('<html>markup changed</html>', { headers: { 'Content-Type': 'text/html' } });
    }
    return new Response(wrap([['Round'], ['R1']]), { headers: { 'Content-Type': 'application/javascript' } });
  }, { now: () => now.value });
  const settings = { url, worksheet: '0', range: 'A1:A2', refreshSeconds: 5 };
  const first = await sheets.read(settings);
  assert.equal(first.rows[1][0].value, 'R1');
  assert.match(first.warning, /could not be verified/);
  for (let i = 0; i < 11; i++) {
    now.value += 5000;
    await sheets.read(settings);
  }
  assert.equal(lists, 1);
  now.value += 5000;
  await sheets.read(settings);
  assert.equal(lists, 2);
});

test('header rows are re-read only when Google drops a header above typed data', async () => {
  const requests = [];
  let rows = [['Stage', 'Round'], ['STAGE 1', 'R1'], ['STAGE 2', 'R2']];
  let clock = 0;
  const sheets = new PublicSheets(async (input) => {
    const target = new URL(input);
    if (target.pathname.endsWith('/htmlview')) return new Response(html([['0', 'Sheet1']]), { headers: { 'Content-Type': 'text/html' } });
    requests.push(target.searchParams.get('range'));
    const range = target.searchParams.get('range');
    const body = range === 'A1:C1' || range === 'A1:B1' ? [['Stage', 'Round', 'Live'].slice(0, rows[0].length)] : rows;
    return new Response(wrap(body), { headers: { 'Content-Type': 'application/javascript' } });
  }, { now: () => (clock += 10000) });
  const text = await sheets.read({ url, worksheet: '0', range: 'A1:B3', refreshSeconds: 5 }, { headerRows: [1] });
  assert.deepEqual(requests, ['A1:B3'], 'complete text headers come from the main read');
  assert.equal(text.rows[0][1].value, 'Round');
  // Google infers a boolean column and returns its text header as null.
  rows = [['Stage', 'Round', null], ['STAGE 1', 'R1', true], ['STAGE 2', 'R2', false]];
  requests.length = 0;
  const typed = await sheets.read({ url, worksheet: '0', range: 'A1:C3', refreshSeconds: 5 }, { headerRows: [1] });
  assert.deepEqual(requests, ['A1:C3', 'A1:C1']);
  assert.equal(typed.rows[0][2].value, 'Live');
  assert.equal(typed.rows[1][2].value, 'TRUE');
});
