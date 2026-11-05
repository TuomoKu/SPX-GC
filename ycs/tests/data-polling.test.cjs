'use strict';
// Regression tests for scheduling: stalled internet sources delayed every other
// source (review repro e3), backoff kept sources stale for minutes after an outage
// (e9), and a bad external edit to the data file stopped all polling.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { DataSources } = require('../data.cjs');
const { LocalFiles } = require('../local-files.cjs');
const { fixture } = require('./playback.test.cjs');

const sheetURL = (index) => `https://docs.google.com/spreadsheets/d/1PUBLIC_SHEET_TEST_${String(index).padStart(10, '0')}/edit`;
const table = (value) => [[{ address: 'A1', value: 'Round', usable: true }], [{ address: 'A2', value, usable: true }]];
// Saves read without a signal; scheduled reads pass one and never get an answer.
const hang = (signal) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));

test('stalled sheet and JSON sources occupy their own slots; a local CSV keeps its schedule', async (t) => {
  const base = await fixture(t), dir = path.join(base.root, 'files');
  await fs.mkdir(dir);
  const csv = path.join(dir, 'scores.csv');
  await fs.writeFile(csv, 'Team,Score\nA,0\n');
  const started = { sheets: 0, json: 0 };
  const sheets = { read: async (input, options) => (options?.signal ? (started.sheets++, hang(options.signal)) : { rows: table('ok') }) };
  const json = { read: async (input, options) => (options?.signal ? (started.json++, hang(options.signal)) : { data: { ok: true } }) };
  const sources = new DataSources(path.join(base.root, 'poll.json'), base.stages, {
    sheets,
    json,
    localFiles: new LocalFiles(dir, { settleMs: 0 })
  });
  await sources.ready;
  for (let i = 0; i < 12; i++)
    await sources.saveConnection(null, 'Sheet ' + i, { url: sheetURL(i), worksheet: '0', range: 'A1:A2', refreshSeconds: 5 }, sources.snapshot().revision);
  for (let i = 0; i < 4; i++)
    await sources.saveConnection(null, 'API ' + i, { url: `https://api.example.org/${i}`, refreshSeconds: 5 }, sources.snapshot().revision, 'json-api');
  const { connectionId } = await sources.saveConnection(null, 'Scores', { file: csv, refreshSeconds: 5, delimiter: ',' }, sources.snapshot().revision, 'local-csv');
  const ref = sources.reference({ connection: connectionId, selection: { kind: 'cell', cell: 'B2' } });
  sources.retain('t', [ref]);
  for (const runtime of sources.runtimes.values()) runtime.nextAt = 0;
  const stalledPoll = sources.pollSheets(); // the venue uplink goes bad
  t.after(async () => {
    await sources.close();
    await stalledPoll;
  });
  // Let that poll's own CSV read finish first; it is not stalled.
  while (sources.runtimes.get(connectionId).reads < 2 || sources.runtimes.get(connectionId).queued)
    await new Promise((resolve) => setImmediate(resolve));
  for (let score = 1; score <= 3; score++) {
    await fs.writeFile(csv, `Team,Score\nA,${score}\n`);
    sources.runtimes.get(connectionId).nextAt = 0;
    const tick = Date.now();
    await sources.pollSheets(); // the next one-second tick
    assert.equal(sources.value(ref), String(score));
    assert.ok(Date.now() - tick < 1000, 'the CSV does not wait for stalled internet reads');
  }
  assert.equal(started.sheets, 4, 'stalled sheet reads hold four slots; the rest wait their turn');
  assert.equal(started.json, 4, 'JSON APIs have their own budget');
  for (const runtime of sources.runtimes.values()) runtime.nextAt = 0;
  await Promise.race([sources.pollSheets(), new Promise((resolve) => setTimeout(resolve, 50))]);
  assert.equal(started.sheets, 4, 'a queued or in-flight connection is never read twice at once');
});

test('backoff is capped at two minutes; a success on the same transport retries the others at once', async (t) => {
  const base = await fixture(t);
  let clock = 1e12, down = true, value = 'R1';
  const sheets = { read: async () => { if (down) throw Object.assign(new Error('Could not reach Google Sheets'), { status: 502 }); return { rows: table(value) }; } };
  const sources = new DataSources(path.join(base.root, 'backoff.json'), base.stages, { sheets, now: () => clock });
  t.after(() => sources.close());
  await sources.ready;
  down = false;
  const a = (await sources.saveConnection(null, 'A', { url: sheetURL(1), worksheet: '0', range: 'A1:A2', refreshSeconds: 30 }, 0)).connectionId;
  const b = (await sources.saveConnection(null, 'B', { url: sheetURL(2), worksheet: '0', range: 'A1:A2', refreshSeconds: 60 }, sources.snapshot().revision)).connectionId;
  const ref = sources.reference({ connection: b, selection: { kind: 'cell', cell: 'A2' } });
  sources.retain('t', [ref]);
  down = true;
  value = 'R2';
  // A ten-minute venue internet outage, polled every second.
  const start = clock;
  for (; clock < start + 600000; clock += 1000) await sources.pollSheets();
  for (const id of [a, b]) {
    const runtime = sources.runtimes.get(id);
    assert.ok(runtime.failures > 3);
    assert.ok(runtime.nextAt - clock <= 120000, 'retry within two minutes');
  }
  down = false;
  let recovered;
  for (; clock < start + 900000; clock += 1000) {
    await sources.pollSheets();
    if (sources.value(ref) === 'R2') { recovered = clock - start - 600000; break; }
  }
  assert.ok(recovered !== undefined && recovered <= 120000, `stale for ${recovered} ms after recovery`);
  // Both were waiting out a backoff; whichever recovered first woke the other.
  assert.equal(sources.runtimes.get(a).health, 'ok');
  assert.equal(sources.runtimes.get(b).health, 'ok');
});

test('a success wakes connections in backoff on the same transport only', async (t) => {
  const base = await fixture(t);
  let clock = 1e12;
  const failing = new Set();
  const sheets = { read: async (input) => { if (failing.has(input.url)) throw new Error('offline'); return { rows: table('ok') }; } };
  const json = { read: async (input) => { if (failing.has(input.url)) throw new Error('offline'); return { data: { ok: true } }; } };
  const sources = new DataSources(path.join(base.root, 'wake.json'), base.stages, { sheets, json, now: () => clock });
  t.after(() => sources.close());
  await sources.ready;
  const a = (await sources.saveConnection(null, 'A', { url: sheetURL(1), worksheet: '0', range: 'A1:A2', refreshSeconds: 60 }, 0)).connectionId;
  const b = (await sources.saveConnection(null, 'B', { url: sheetURL(2), worksheet: '0', range: 'A1:A2', refreshSeconds: 60 }, sources.snapshot().revision)).connectionId;
  const j = (await sources.saveConnection(null, 'J', { url: 'https://api.example.org/x', refreshSeconds: 60 }, sources.snapshot().revision, 'json-api')).connectionId;
  failing.add(sheetURL(2)).add('https://api.example.org/x');
  await sources.refreshSheet(b);
  await sources.refreshSheet(j);
  assert.ok(sources.runtimes.get(b).nextAt > clock);
  failing.clear();
  clock += 1000;
  await sources.refreshSheet(a);
  assert.ok(sources.runtimes.get(b).nextAt <= clock, 'sheet in backoff is due now');
  assert.ok(sources.runtimes.get(j).nextAt > clock, 'other transports keep their backoff');
});

test('an invalid external edit blocks saves but keeps polling from the last valid configuration', async (t) => {
  const base = await fixture(t);
  let clock = 1e12, value = 'R1';
  const sheets = { read: async () => ({ rows: table(value) }) };
  const sources = new DataSources(path.join(base.root, 'edit.json'), base.stages, { sheets, now: () => clock });
  t.after(() => sources.close());
  await sources.ready;
  const { connectionId } = await sources.saveConnection(null, 'Round', { url: sheetURL(1), worksheet: '0', range: 'A1:A2', refreshSeconds: 5 }, 0);
  const ref = sources.reference({ connection: connectionId, selection: { kind: 'cell', cell: 'A2' } });
  sources.retain('t', [ref]);
  await fs.writeFile(sources.file, '{ "version": 2, "revision": '); // half-saved by a text editor
  await sources.refresh();
  assert.match(sources.snapshot().error, /invalid/);
  value = 'R2';
  clock += 5000;
  await sources.pollSheets();
  assert.equal(sources.value(ref), 'R2');
  await assert.rejects(sources.saveConnection(null, 'Other', { url: sheetURL(2), worksheet: '0', range: 'A1:A2', refreshSeconds: 5 }, sources.snapshot().revision), { status: 503 });
});
