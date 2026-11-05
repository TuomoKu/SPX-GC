'use strict';
// Regression tests for local files rewritten in place by another program while a
// poll reads them (review repro e4): a header-only file, a cut row and a cut cell
// all parsed as valid data with health ok.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { LocalFiles } = require('../local-files.cjs');
const { DataSources } = require('../data.cjs');
const { fixture } = require('./playback.test.cjs');

const full =
  'Stage,Headline,Score\nSTAGE 1,Kaiba defeats Yugi in round 7,2-1\nSTAGE 2,Joey advances to top 8,2-0\nSTAGE 3,Mai wins the regional final,2-1\n';
// The producer finished writing some time ago.
const settled = (file) => fs.utimes(file, new Date(Date.now() - 5000), new Date(Date.now() - 5000));

async function setup(t, io) {
  const base = await fixture(t), dir = path.join(base.root, 'files');
  await fs.mkdir(dir);
  const csv = path.join(dir, 'ticker.csv');
  await fs.writeFile(csv, full);
  await settled(csv);
  const sources = new DataSources(path.join(base.root, 'local.json'), base.stages, {
    localFiles: new LocalFiles(dir, io ? { io } : {})
  });
  t.after(() => sources.close());
  await sources.ready;
  const { connectionId: id } = await sources.saveConnection(null, 'Ticker', { file: csv, refreshSeconds: 5, delimiter: ',' }, 0, 'local-csv');
  const list = sources.reference({ connection: id, selection: { kind: 'collection', format: 'sheet', range: 'A1:C200', headerRow: 1, required: [], fields: { headline: { kind: 'column', name: 'Headline' } } } });
  const score = sources.reference({ connection: id, selection: { kind: 'row', headerRow: 1, keyColumn: 'Stage', keyValue: 'STAGE 2', valueColumn: 'Score' } });
  sources.retain('t', [list, score]);
  return { sources, csv, id, list, score };
}

test('a poll of a file the producer just rewrote keeps the last good data until the write settles', async (t) => {
  const r = await setup(t);
  const good = r.sources.value(r.list);
  assert.equal(JSON.parse(good).length, 3);
  for (const cut of [full.indexOf('\n') + 1, full.indexOf('Joey advances') + 9, full.indexOf('2-0') + 1]) {
    await fs.writeFile(r.csv, full.slice(0, cut)); // writer is mid-write (truncate, then rows)
    await r.sources.refreshSheet(r.id);
    assert.equal(r.sources.value(r.list), good);
    assert.equal(r.sources.value(r.score), '2-0');
    const connection = r.sources.snapshot().connections[r.id];
    assert.equal(connection.health, 'ok', 'a transient read is not a source failure');
    assert.ok(Date.parse(connection.nextRefresh) - Date.now() <= 1500, 'retried within about a second');
  }
  await fs.writeFile(r.csv, full.replace('2-0', '2-2'));
  await settled(r.csv);
  await r.sources.refreshSheet(r.id);
  assert.equal(r.sources.value(r.score), '2-2');
});

test('a file that changes while it is being read is transient, even for an explicit test read', async (t) => {
  const base = await fixture(t), dir = path.join(base.root, 'files');
  await fs.mkdir(dir);
  const csv = path.join(dir, 'scores.csv');
  await fs.writeFile(csv, full);
  await settled(csv);
  // The producer truncates the file between our read and the size/mtime check.
  const io = {
    ...fs,
    open: async (...args) => {
      const handle = await fs.open(...args);
      return {
        stat: (...a) => handle.stat(...a),
        close: () => handle.close(),
        read: async (...a) => {
          const result = await handle.read(...a);
          if (result.bytesRead) {
            await fs.writeFile(csv, 'Stage,Headline,Score\n');
            await settled(csv);
          }
          return result;
        }
      };
    }
  };
  const files = new LocalFiles(dir, { io });
  await assert.rejects(files.read({ file: csv, refreshSeconds: 5, delimiter: ',' }, { type: 'local-csv' }), (error) => error.transient === true && /changed while it was being read/.test(error.message));
});

test('repeatedly rewritten files still update once a read stays consistent', async (t) => {
  const r = await setup(t);
  for (let i = 0; i < 3; i++) {
    await fs.writeFile(r.csv, full.replace('2-0', '3-' + i));
    await r.sources.refreshSheet(r.id);
    assert.equal(r.sources.value(r.score), '2-0');
  }
  await fs.writeFile(r.csv, full.replace('2-0', '3-3'));
  await r.sources.refreshSheet(r.id);
  assert.equal(r.sources.value(r.score), '3-3', 'after three young reads, a stable read is accepted');
});

test('JSON files use the same settle guard', async (t) => {
  const base = await fixture(t), dir = path.join(base.root, 'files');
  await fs.mkdir(dir);
  const file = path.join(dir, 'round.json');
  await fs.writeFile(file, JSON.stringify({ round: 'ROUND 1' }));
  await settled(file);
  const sources = new DataSources(path.join(base.root, 'local.json'), base.stages, { localFiles: new LocalFiles(dir) });
  t.after(() => sources.close());
  await sources.ready;
  const { connectionId: id } = await sources.saveConnection(null, 'Round', { file, refreshSeconds: 5 }, 0, 'local-json');
  const ref = sources.reference({ connection: id, selection: { kind: 'json', pointer: '/round' } });
  sources.retain('t', [ref]);
  await fs.writeFile(file, JSON.stringify({ round: 'ROUND 2' }));
  await sources.refreshSheet(id);
  assert.equal(sources.value(ref), 'ROUND 1');
  await settled(file);
  await sources.refreshSheet(id);
  assert.equal(sources.value(ref), 'ROUND 2');
});
