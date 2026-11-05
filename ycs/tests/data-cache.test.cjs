'use strict';
// Regression tests for the restart cache and refresh cost: twenty large connections
// produced a 6.5 MiB cache that the 4 MiB read gate then discarded (review repro
// e1), and unchanged reads rewrote the cache, rebuilt snapshots and refreshed every
// link on every poll (e2).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const express = require('express');
const register = require('../index.cjs');
const { DataSources } = require('../data.cjs');
const { columnName } = require('../public-sheets.cjs');
const { fixture } = require('./playback.test.cjs');

const sheetURL = (index) => `https://docs.google.com/spreadsheets/d/1PUBLIC_SHEET_TEST_${String(index).padStart(10, '0')}/edit`;
const big = (tag) =>
  Array.from({ length: 200 }, (_, r) =>
    Array.from({ length: 32 }, (_, c) => {
      const value = r === 0 ? 'H' + c : `${tag} r${r}c${c}`;
      return { address: columnName(c + 1) + (r + 1), value, usable: true };
    })
  );
const offline = { read: async () => { throw Object.assign(new Error('offline'), { status: 502 }); } };

test('twenty full-size connections survive an offline restart', async (t) => {
  const base = await fixture(t), file = path.join(base.root, 'big.json');
  const sources = new DataSources(file, base.stages, { sheets: { read: async () => ({ rows: big('v0') }) } });
  await sources.ready;
  const ids = Array.from({ length: 20 }, (_, i) => 'sheet.big' + i);
  await sources.edit(0, (next) => {
    for (const [i, id] of ids.entries())
      next.connections[id] = { type: 'google-sheets', label: 'C' + i, settings: { url: sheetURL(i), worksheet: '0', range: 'A1:AF200', refreshSeconds: 5 } };
  });
  await sources.pollSheets();
  const bind = { connection: ids[0], selection: { kind: 'cell', cell: 'B2' } };
  sources.retain('t', [sources.reference(bind)]);
  await sources.persistCache();
  await sources.close();
  const size = (await fs.stat(sources.cacheFile)).size;
  assert.ok(size < 4194304, `compact cache is ${size} bytes`);
  const restarted = new DataSources(file, base.stages, { sheets: offline });
  t.after(() => restarted.close());
  await restarted.ready;
  assert.equal(restarted.value(restarted.reference(bind)), 'v0 r1c1');
  assert.deepEqual(restarted.runtimes.get(ids[19]).rows, big('v0'), 'rows are restored with addresses');
  assert.equal(restarted.snapshot().connections[ids[0]].warning, '');
});

test('a full cache keeps resolved values, drops the largest datasets and warns', async (t) => {
  const base = await fixture(t), file = path.join(base.root, 'full.json');
  const errors = [];
  t.mock.method(console, 'error', (...args) => errors.push(args.join(' ')));
  const sources = new DataSources(file, base.stages, { sheets: { read: async () => ({ rows: big('v1') }) }, cacheLimit: 300000 });
  await sources.ready;
  const ids = [];
  for (let i = 0; i < 4; i++)
    ids.push((await sources.saveConnection(null, 'C' + i, { url: sheetURL(i), worksheet: '0', range: 'A1:AF200', refreshSeconds: 5 }, sources.snapshot().revision)).connectionId);
  const bind = { connection: ids[3], selection: { kind: 'cell', cell: 'C3' } };
  sources.retain('t', [sources.reference(bind)]);
  await sources.persistCache();
  assert.ok((await fs.stat(sources.cacheFile)).size <= 300000);
  assert.ok(errors.some((line) => /Restart cache exceeds/.test(line)));
  const dropped = ids.filter((id) => /Restart cache is full/.test(sources.snapshot().connections[id].warning));
  assert.ok(dropped.length > 0 && dropped.length < 4);
  await sources.close();
  const restarted = new DataSources(file, base.stages, { sheets: offline, cacheLimit: 300000 });
  t.after(() => restarted.close());
  await restarted.ready;
  assert.equal(restarted.value(restarted.reference(bind)), 'v1 r2c2', 'resolved values always survive');
  for (const id of dropped)
    assert.match(restarted.snapshot().connections[id].warning, /No cached data from before restart/);
});

test('version 2 caches still restore after the upgrade', async (t) => {
  const base = await fixture(t), file = path.join(base.root, 'v2.json');
  const sources = new DataSources(file, base.stages, { sheets: { read: async () => ({ rows: big('old') }) } });
  await sources.ready;
  const { connectionId } = await sources.saveConnection(null, 'C', { url: sheetURL(1), worksheet: '0', range: 'A1:AF200', refreshSeconds: 5 }, 0);
  const runtime = sources.runtimes.get(connectionId);
  await sources.close();
  await fs.writeFile(sources.cacheFile, JSON.stringify({ version: 2, connections: { [connectionId]: { fingerprint: runtime.fingerprint, rows: runtime.rows, headerRows: [1], lastSuccess: runtime.lastSuccess } }, good: {} }));
  const restarted = new DataSources(file, base.stages, { sheets: offline });
  t.after(() => restarted.close());
  await restarted.ready;
  assert.equal(restarted.value(restarted.reference({ connection: connectionId, selection: { kind: 'cell', cell: 'D9' } })), 'old r8c3');
});

test('unchanged reads skip the cache write, the snapshot and the change event; changed ones are throttled', async (t) => {
  const base = await fixture(t);
  let clock = 1e12, tag = 'v0';
  const sources = new DataSources(path.join(base.root, 'quiet.json'), base.stages, { sheets: { read: async () => ({ rows: big(tag) }) }, now: () => clock });
  await sources.ready;
  const ids = [];
  for (let i = 0; i < 3; i++)
    ids.push((await sources.saveConnection(null, 'C' + i, { url: sheetURL(i), worksheet: '0', range: 'A1:AF200', refreshSeconds: 5 }, sources.snapshot().revision)).connectionId);
  const ref = sources.reference({ connection: ids[0], selection: { kind: 'cell', cell: 'B2' } });
  sources.retain('t', [ref]);
  let changes = 0, writes = 0, snapshots = 0;
  sources.on('change', () => changes++);
  const persist = sources.persistCache.bind(sources), snapshot = sources.snapshot.bind(sources);
  sources.persistCache = () => { writes++; return persist(); };
  sources.snapshot = (...args) => { snapshots++; return snapshot(...args); };
  for (let i = 0; i < 10; i++) {
    clock += 5000;
    await sources.pollSheets();
  }
  assert.deepEqual({ changes, writes, snapshots }, { changes: 0, writes: 0, snapshots: 0 });
  // The data changes on every poll: one immediate write, then at most one per 10 s.
  for (let i = 1; i <= 4; i++) {
    tag = 'v' + i;
    clock += 5000;
    await sources.pollSheets();
  }
  assert.equal(changes, 12, 'one event per changed connection read');
  assert.equal(writes, 1);
  assert.equal(sources.value(ref), 'v4 r1c1');
  await sources.close(); // flushes the pending write
  assert.equal(writes, 2);
  const cache = JSON.parse(await fs.readFile(sources.cacheFile, 'utf8'));
  assert.equal(cache.connections[ids[0]].values[1][1], 'v4 r1c1');
  await assert.rejects(fs.stat(sources.cacheFile + '.tmp'), { code: 'ENOENT' });
});

test('GET /data leaves out datasets the poller already holds', async (t) => {
  const { root, stages } = await fixture(t);
  let tag = 'v0';
  const app = express();
  app.use(express.json());
  const config = { general: { dataroot: root, username: '' }, ycs: { enabled: true, dataFile: path.join(root, 'payload.json'), stages, slots: { ticker: { order: 10 } } } };
  const playback = register(app, config, { auth: { CheckLogin: (req, res, next) => next() }, sheets: { read: async () => ({ rows: big(tag) }) } });
  t.after(() => playback.close());
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5777, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const get = (query = '') => fetch('http://127.0.0.1:5777/api/ycs/data' + query).then(async (response) => ({ text: await response.text() }));
  const post = (url, body) => fetch('http://127.0.0.1:5777/api/ycs' + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((response) => response.json());
  let revision = JSON.parse((await get()).text).revision;
  const ids = [];
  for (let i = 0; i < 2; i++) {
    const saved = await post('/data/connections', { label: 'C' + i, settings: { url: sheetURL(i), worksheet: '0', range: 'A1:AF200', refreshSeconds: 5 }, revision });
    ids.push(saved.connectionId);
    revision = saved.snapshot.revision;
  }
  const full = await get(), state = JSON.parse(full.text);
  assert.equal(state.connections[ids[0]].rows.length, 200);
  const have = ids.map((id) => id + ':' + state.connections[id].datasetHash).join(',');
  const quiet = await get('?have=' + encodeURIComponent(have)), unchanged = JSON.parse(quiet.text);
  assert.ok(quiet.text.length * 10 < full.text.length, `${quiet.text.length} vs ${full.text.length} bytes`);
  assert.equal(unchanged.connections[ids[0]].datasetUnchanged, true);
  assert.equal('rows' in unchanged.connections[ids[0]], false);
  tag = 'v1';
  await post(`/data/connections/${ids[1]}/refresh`, {});
  const partial = JSON.parse((await get('?have=' + encodeURIComponent(have))).text);
  assert.equal(partial.connections[ids[0]].datasetUnchanged, true);
  assert.equal(partial.connections[ids[1]].rows[1][0].value, 'v1 r1c0');
  const none = JSON.parse((await get('?datasets=none')).text);
  assert.equal('rows' in none.connections[ids[1]], false);
  // Field values still come back without datasets; demo sources are not assumed to exist.
  assert.equal(typeof none.sources, 'object');
  assert.equal('rows' in none.connections[ids[0]], false);
});
