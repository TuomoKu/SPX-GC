'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { LocalFiles, parseCSV, normalizeLocalSettings } = require('../local-files.cjs');
const sourceTypes = require('../public/source-types.js');
const { DataSources } = require('../data.cjs');
const { Playback, RundownRepository } = require('../playback.cjs');
const { fixture } = require('./playback.test.cjs');

async function folder(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ycs-local-files-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
test('source classification accepts only declared source types', () => {
  for (const type of ['constructor', 'toString', '__proto__', 'local-xml'])
    assert.equal(sourceTypes.supported(type), false);
  assert.equal(sourceTypes.isJSON('local-json'), true);
  assert.equal(sourceTypes.isTable('local-csv'), true);
});

test('CSV reads quoted delimiters, doubled quotes, multiline UTF-8, empty cells and arbitrary header rows', () => {
  const rows = parseCSV(
    '\uFEFFTournament notes\r\nPublished,Category,Subtopic\r\nTRUE,TCG,"Literal <b>text</b>, with ""quotes"" ✓\r\nand a second line"\r\nFALSE,,\r\n'
  );
  assert.equal(rows.length, 4);
  assert.equal(rows[2][2].address, 'C3');
  assert.equal(rows[2][2].value, 'Literal <b>text</b>, with "quotes" ✓\r\nand a second line');
  assert.equal(rows[3][2].value, '');
  assert.equal(rows[0][2].value, '');
  assert.equal(parseCSV('A;B\n1;2', ';')[1][1].value, '2');
  assert.equal(parseCSV('A\tB\n1\t2', '\t')[1][1].value, '2');
  for (const raw of [
    '',
    '"unclosed',
    '"closed"junk',
    'bad"quote',
    'x'.repeat(4001),
    Array(34).join(','),
    Array(202).fill('row').join('\n')
  ])
    assert.throws(() => parseCSV(raw));
});

test('JSON/CSV files validate format, UTF-8, size and regular-file restrictions', async (t) => {
  const root = await folder(t),
    files = new LocalFiles(root);
  await fs.writeFile(path.join(root, 'round.json'), '\uFEFF{"round":"ROUND 1"}');
  await fs.writeFile(path.join(root, 'stories.csv'), 'Subtopic\nStory');
  await fs.writeFile(path.join(root, 'ignored.txt'), 'Not offered');
  await fs.mkdir(path.join(root, 'directory.json'));
  assert.deepEqual((await files.read({ file: 'round.json', refreshSeconds: 5 })).data, {
    round: 'ROUND 1'
  });
  for (const file of ['../round.json', 'round.json:secret', 'file.txt'])
    assert.throws(() => normalizeLocalSettings({ file, refreshSeconds: 5 }, 'local-json'));
  await assert.rejects(
    files.read({ file: 'round.json', refreshSeconds: 5 }, { type: 'local-csv' }),
    /source type/
  );
  await assert.rejects(
    files.read({ file: 'directory.json', refreshSeconds: 5 }),
    /regular data file/
  );
  await fs.writeFile(path.join(root, 'bad.json'), '{');
  await assert.rejects(files.read({ file: 'bad.json', refreshSeconds: 5 }), /invalid JSON/);
  await fs.writeFile(path.join(root, 'bad.json'), Buffer.from([0xff]));
  await assert.rejects(files.read({ file: 'bad.json', refreshSeconds: 5 }), /UTF-8/);
  await fs.writeFile(path.join(root, 'large.json'), ' '.repeat(1048577));
  await assert.rejects(files.read({ file: 'large.json', refreshSeconds: 5 }), /1 MB/);
  await assert.rejects(files.read({ file: 'missing.json', refreshSeconds: 5 }), /unavailable/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    files.read({ file: 'round.json', refreshSeconds: 5 }, { signal: controller.signal })
  );
});

test('local CSV/JSON mapping refreshes committed links, retains invalid/missing data and restores restart caches', async (t) => {
  const f = await fixture(t),
    dataRoot = path.join(f.root, 'files');
  await fs.mkdir(dataRoot);
  const jsonFile = path.join(dataRoot, 'round.json'),
    csvFile = path.join(dataRoot, 'stories.csv');
  await fs.writeFile(jsonFile, JSON.stringify({ round: 'ROUND 1' }));
  await fs.writeFile(
    csvFile,
    'Notes\nPublished,Topic,Subtopic\nTRUE,News,First story\nFALSE,Hidden,Ignored'
  );
  let clock = Date.now();
  const file = path.join(f.root, 'sources.json'),
    // Files here are written just before each poll; settle timing has its own test.
    options = {
      localFiles: new LocalFiles(path.join(f.root, 'unrelated'), { settleMs: 0 }),
      now: () => clock
    };
  const sources = new DataSources(file, f.stages, options);
  await sources.ready;
  t.after(() => sources.close());
  const playback = new Playback(
    new RundownRepository(f.root, f.stages),
    { ticker: { order: 10 } },
    sources
  );
  const ticker = f.repository.item(await f.repository.read('stage-1'), 'ticker');
  ticker.DataFields.push({
    field: 'f14',
    ftype: 'textarea',
    title: 'Stories',
    value: '[]',
    ycsCollection: {
      version: 1,
      fields: [
        { key: 'topic', title: 'Topic' },
        { key: 'subtopic', title: 'Crawler text', required: true }
      ]
    }
  });
  const saved = await f.repository.read('stage-1');
  saved.templates.find((item) => item.itemID === 'ticker').DataFields = ticker.DataFields;
  await fs.writeFile(f.repository.stage('stage-1').file, JSON.stringify(saved));
  const j = (
    await sources.saveConnection(
      null,
      'Round',
      { file: jsonFile, refreshSeconds: 5 },
      0,
      'local-json'
    )
  ).connectionId;
  const c = (
    await sources.saveConnection(
      null,
      'Stories',
      { file: csvFile, refreshSeconds: 5, delimiter: ',' },
      sources.snapshot().revision,
      'local-csv'
    )
  ).connectionId;
  const binding = {
    connection: c,
    selection: {
      kind: 'collection',
      format: 'sheet',
      range: 'A1:C200',
      headerRow: 2,
      fields: {
        topic: { kind: 'column', name: 'Topic' },
        subtopic: { kind: 'column', name: 'Subtopic' }
      },
      required: ['subtopic'],
      enabled: { kind: 'column', name: 'Published' }
    }
  };
  await sources.saveMappings(
    'stage-1',
    'ticker',
    ticker.relpath,
    [
      {
        field: 'f5',
        scope: 'override',
        binding: { connection: j, selection: { kind: 'json', pointer: '/round' } }
      },
      { field: 'f14', scope: 'override', binding }
    ],
    sources.snapshot().revision
  );
  const preview = await playback.mappingPreview('stage-1', 'ticker');
  assert.equal(preview.fields.find((field) => field.field === 'f5').value, 'ROUND 1');
  assert.equal(
    JSON.parse(preview.fields.find((field) => field.field === 'f14').value)[0].subtopic,
    'First story'
  );
  assert.equal(playback.snapshot('stage-1', 'program').graphics.length, 0);
  await playback.command('stage-1', 'ticker', 'play', undefined, {
    links: { f5: { mode: 'linked', manual: 'MANUAL' }, f14: { mode: 'linked', manual: '[]' } }
  });
  await fs.writeFile(jsonFile, JSON.stringify({ round: 'ROUND 2' }));
  await fs.writeFile(
    csvFile,
    'Notes\nSubtopic,Published,Topic\nSecond story,TRUE,Update\nIgnored,FALSE,Hidden'
  );
  clock += 5001;
  await sources.pollSheets();
  await playback.refreshLinks('stage-1');
  let graphic = playback.snapshot('stage-1', 'program').graphics[0];
  assert.equal(graphic.data.f5, 'ROUND 2');
  assert.equal(JSON.parse(graphic.data.f14)[0].subtopic, 'Second story');
  assert.equal(playback.snapshot('stage-2', 'program').graphics.length, 0);
  await fs.writeFile(jsonFile, '{');
  await fs.writeFile(csvFile, '"unclosed');
  clock += 5001;
  await sources.pollSheets();
  await playback.refreshLinks('stage-1');
  graphic = playback.snapshot('stage-1', 'program').graphics[0];
  assert.equal(graphic.data.f5, 'ROUND 2');
  assert.equal(JSON.parse(graphic.data.f14)[0].subtopic, 'Second story');
  assert.equal(sources.snapshot().connections[j].health, 'error');
  await fs.rm(jsonFile);
  await sources.refreshSheet(j);
  assert.equal(
    sources.value(sources.mapping('stage-1', 'ticker', 'f5', ticker.relpath)),
    'ROUND 2'
  );
  await sources.persistCache();
  sources.close();
  const restarted = new DataSources(file, f.stages, options);
  await restarted.ready;
  t.after(() => restarted.close());
  assert.equal(
    restarted.value(restarted.mapping('stage-1', 'ticker', 'f5', ticker.relpath)),
    'ROUND 2'
  );
  await fs.writeFile(jsonFile, JSON.stringify({ round: 'ROUND 3' }));
  await restarted.refreshSheet(j);
  assert.equal(
    restarted.value(restarted.mapping('stage-1', 'ticker', 'f5', ticker.relpath)),
    'ROUND 3'
  );
});
