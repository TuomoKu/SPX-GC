'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { fixture } = require('./playback.test.cjs');
const { DataSources } = require('../data.cjs');

test('Companion playback-only commands keep an open editor valid; actual field and link edits still conflict', async t => {
  const { playback, repository, root } = await fixture(t);
  const editor = await playback.editor('stage-1', 'ticker');
  for (const action of ['play', 'update', 'stop', 'toggle', 'toggle', 'play']) {
    assert.equal((await playback.command('stage-1', 'ticker', action)).editorRevision, editor.revision);
  }
  await playback.command('stage-1', 'ticker', 'preview', [{ field: 'f5', value: 'UNSAVED DRAFT' }], { revision: editor.revision });
  assert.equal(playback.snapshot('stage-1', 'program').graphics[0].data.f5, 'STAGE 1 ROUND');
  const saved = await playback.command('stage-1', 'ticker', 'save', [{ field: 'f5', value: 'NEW ROUND' }], { revision: editor.revision });
  assert.equal(saved.editorRevision, editor.revision + 1);
  await playback.command('stage-1', 'ticker', 'update');
  await assert.rejects(playback.command('stage-1', 'ticker', 'save', [{ field: 'f5', value: 'STALE DRAFT' }], { revision: editor.revision }), { status: 409 });
  assert.equal((await playback.editor('stage-1', 'ticker')).revision, saved.editorRevision);
  assert.equal((await repository.read('stage-1')).templates[0].DataFields[1].value, 'NEW ROUND');
  const sources = new DataSources(path.join(root, 'sources.json'), []);
  await sources.ready; t.after(() => sources.close()); playback.sources = sources;
  const changedLink = await playback.command('stage-1', 'ticker', 'save', undefined, { revision: saved.editorRevision, links: { f5: { mode: 'manual', manual: 'NEW ROUND' } } });
  assert.equal(changedLink.editorRevision, saved.editorRevision + 1);
  await assert.rejects(playback.command('stage-1', 'ticker', 'preview', undefined, { revision: saved.editorRevision }), { status: 409 });
});

test('invalid manual fields and link fallbacks fail atomically with field errors before saving or changing program', async t => {
  const { playback, repository } = await fixture(t);
  const rundown = await repository.read('stage-1');
  rundown.templates[0].DataFields.push(
    { field: 'speed', title: 'Speed', ftype: 'number', value: '145', min: 0, max: 500 },
    { field: 'show', ftype: 'checkbox', value: '0' },
    { field: 'colour', ftype: 'color', value: '#ffffff' },
    { field: 'choice', ftype: 'dropdown', items: [{ value: 'a' }, { value: 'b' }], value: 'a' },
    { field: 'logo', ftype: 'filelist', value: './logo.png' },
    { field: 'json', ftype: 'textarea', value: '{}' }
  );
  await repository.write('stage-1', rundown); await playback.command('stage-1', 'ticker', 'play');
  const before = playback.snapshot('stage-1', 'program'), raw = await fs.readFile(repository.stage('stage-1').file, 'utf8');
  const invalid = [['speed', 'not-a-number'], ['speed', ''], ['speed', '-1'], ['speed', '501'], ['show', 'maybe'], ['colour', '#12345'], ['choice', 'missing'], ['logo', 'javascript:alert(1)'], ['f5', 'x'.repeat(301)]];
  for (const action of ['save', 'preview', 'play', 'update']) for (const [field, value] of invalid) {
    const patch = field === 'f5' ? [{ field, value }] : [{ field: 'f5', value: 'SHOULD NOT APPLY' }, { field, value }];
    await assert.rejects(playback.command('stage-1', 'ticker', action, patch), error => error.status === 422 && Boolean(error.fields[field]));
    assert.deepEqual(playback.snapshot('stage-1', 'program'), before);
    assert.equal(await fs.readFile(repository.stage('stage-1').file, 'utf8'), raw);
  }
  await assert.rejects(playback.command('stage-1', 'ticker', 'save', undefined, { links: { speed: { mode: 'manual', manual: 'invalid' } } }), error => error.status === 422 && Boolean(error.fields.speed));
  const longJSON = JSON.stringify({ note: 'x'.repeat(1000) });
  await playback.command('stage-1', 'ticker', 'save', [{ field: 'speed', value: '0145' }, { field: 'show', value: 'true' }, { field: 'json', value: longJSON }]);
  const fields = (await playback.editor('stage-1', 'ticker')).fields;
  assert.equal(fields.find(field => field.field === 'speed').value, '145');
  assert.equal(fields.find(field => field.field === 'show').value, '1');
  assert.equal(fields.find(field => field.field === 'json').value, longJSON);
  const invalidSaved = await repository.read('stage-1'); invalidSaved.templates[0].DataFields.find(field => field.field === 'speed').value = 'invalid';
  await repository.write('stage-1', invalidSaved);
  await assert.rejects(playback.command('stage-1', 'ticker', 'play'), error => error.status === 422 && Boolean(error.fields.speed));
});

test('unsaved collection and row-lookup previews request non-first header rows without registering a binding', async t => {
  const { playback, stages, root } = await fixture(t), requests = [];
  const rows = [
    [{address:'A1',value:'Notes'},{address:'B1',value:''}],
    [{address:'A2',value:'Stage'},{address:'B2',value:'Round'}],
    [{address:'A3',value:'STAGE 1'},{address:'B3',value:'ROUND 3'}]
  ];
  const sources = new DataSources(path.join(root, 'data.json'), stages, { sheets: { read: async (_, options = {}) => { requests.push(options.headerRows || []); return {rows,headerRows:[1,...(options.headerRows || [])]}; } } });
  await sources.ready; t.after(() => sources.close()); playback.sources = sources;
  const {connectionId} = await sources.saveConnection(null,'Sheet',{url:'https://docs.google.com/spreadsheets/d/1PUBLIC_SHEET_TEST_1234567890/edit',range:'A1:B3',worksheet:'42',refreshSeconds:5},0);
  const pick={connection:connectionId,selection:{kind:'row',headerRow:2,keyColumn:'Stage',keyValue:'STAGE 1',valueColumn:'Round'}};
  const preview=await playback.mappingPreview('stage-1','ticker',[{field:'f5',scope:'override',binding:pick}]);
  assert.equal(preview.graphic.data.f5,'ROUND 3'); assert.ok(requests.some(headers=>headers.includes(2))); assert.equal(sources.bindings.size,0);
  // A collection header request has the same ephemeral behavior.
  const collection={...pick,selection:{kind:'collection',format:'sheet',range:'A1:B3',headerRow:2,fields:{subtopic:{kind:'column',name:'Round'}},required:['subtopic']}};
  await sources.ensureCollectionHeaders(collection);
  assert.equal(JSON.parse(sources.previewBinding(collection).value)[0].subtopic,'ROUND 3'); assert.equal(sources.bindings.size,0);
});

test('mapping previews do not accumulate bindings or cached values; pruning preserves saved, program and preview references', async t => {
  const { playback, stages, root } = await fixture(t); let now = 1000;
  const sources = new DataSources(path.join(root, 'data.json'), stages, { now: () => now });
  await sources.ready; t.after(() => sources.close()); playback.sources = sources;
  for (let index = 0; index < 1000; index++) {
    assert.equal(sources.previewBinding({ static: `Draft ${index}` }).value, `Draft ${index}`);
  }
  for (let index = 0; index < 30; index++) await playback.mappingPreview('stage-1', 'ticker', [{ field: 'f5', scope: 'override', binding: { static: `Preview ${index}` } }]);
  assert.equal(sources.bindings.size, 0); assert.deepEqual(sources.good, {});
  const save = value => sources.saveMappings('stage-1', 'ticker', '/test/graphic.html', [{ field: 'f5', scope: 'override', binding: { static: value } }], sources.snapshot().revision);
  await save('OLD LIVE');
  await playback.command('stage-1', 'ticker', 'play', undefined, { links: { f5: { mode: 'linked', manual: 'Manual' } } });
  const oldRef = playback.snapshot('stage-1', 'program').graphics[0].links.f5.source;
  await save('NEW MAPPING');
  await playback.command('stage-1', 'ticker', 'preview');
  const newRef = playback.snapshot('stage-1', 'preview').graphics[0].links.f5.source;
  const abandoned = sources.reference({ static: 'Abandoned' });
  now += 60001; const snapshot = sources.snapshot();
  assert.equal(snapshot.sources[abandoned], undefined);
  assert.equal(snapshot.sources[oldRef].value, 'OLD LIVE');
  assert.equal(snapshot.sources[newRef].value, 'NEW MAPPING');
  await playback.refreshLinks('stage-1');
  assert.equal(playback.snapshot('stage-1', 'program').graphics[0].data.f5, 'OLD LIVE');
  await playback.clear('stage-1');
  assert.equal(sources.snapshot().sources[oldRef], undefined);
  assert.equal(sources.snapshot().sources[newRef].value, 'NEW MAPPING');
});

test('binding pruning protects a pending disk write and releases failed descriptors', async t => {
  const { playback, repository, stages, root } = await fixture(t); let now = 1000;
  const sources = new DataSources(path.join(root, 'data.json'), stages, { now: () => now });
  await sources.ready; t.after(() => sources.close()); playback.sources = sources;
  const save = value => sources.saveMappings('stage-1', 'ticker', '/test/graphic.html', [{ field: 'f5', scope: 'override', binding: { static: value } }], sources.snapshot().revision);
  await save('PENDING');
  const ref = sources.mapping('stage-1', 'ticker', 'f5', '/test/graphic.html');
  let release, entered; const writing = new Promise(resolve => entered = resolve), original = repository.write.bind(repository);
  repository.write = async (...args) => { entered(); await new Promise(resolve => release = resolve); return original(...args); };
  const play = playback.command('stage-1', 'ticker', 'play', undefined, { links: { f5: { mode: 'linked', manual: 'Manual' } } });
  await writing; await save('NEXT MAPPING'); now += 60001;
  assert.equal(sources.snapshot().sources[ref].value, 'PENDING');
  release(); await play; assert.equal(sources.snapshot().sources[ref].value, 'PENDING');
  repository.write = original; await playback.clear('stage-1');
  assert.equal(sources.snapshot().sources[ref], undefined);
  const failedRef = sources.mapping('stage-1', 'ticker', 'f5', '/test/graphic.html');
  repository.write = async () => { await save('AFTER FAILURE'); now += 60001; throw new Error('Disk failure'); };
  // A changed manual fallback must be saved before Play, so this write is required.
  await assert.rejects(playback.command('stage-1', 'ticker', 'play', undefined, { links: { f5: { mode: 'linked', manual: 'Changed manual' } } }), /Disk failure/);
  assert.equal(sources.snapshot().sources[failedRef], undefined);
  assert.equal(playback.snapshot('stage-1', 'program').graphics.length, 0);
});
