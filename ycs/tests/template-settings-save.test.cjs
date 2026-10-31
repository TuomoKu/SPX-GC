'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { Playback, RundownRepository } = require('../playback.cjs');

const original = {
  relpath: '/YCS/lower-third/lower-third.html', description: 'Lower third',
  playserver: 'OVERLAY', playchannel: '1', playlayer: '2', webplayout: '2',
  dataformat: 'json', out: 'manual', uicolor: '2', steps: 0,
  ycsSlot: 'lower-third', ycsPreviewOnEdit: false, imported: '2026-10-01',
  extension: { enabled: false, count: 0, sections: ['Names'] },
  DataFields: [{ field: 'f4', ftype: 'textfield', title: 'Name', value: '100% — José & Co', ycsPrimary: true }]
};
const encode = fields => encodeURI(JSON.stringify(fields));
function form(template = original) {
  return {
    relpath: template.relpath, description: 'Edited description', playserver: '-',
    playchannel: '2', playlayer: '5', webplayout: '3', dataformat: 'json',
    out: 'manual', uicolor: '3', DataFields: encode(template.DataFields)
  };
}

async function harness(t, template = original, projectFormat = 'SPX', ycs) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'spx-template-save-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const project = path.join(root, 'Production');
  await fs.mkdir(path.join(project, 'data'), { recursive: true });
  const file = path.join(project, 'profile.json');
  const profile = { projectFormat, general: { background: 'keep.png' }, templates: [structuredClone(template), { description: 'Unrelated', DataFields: [] }] };
  const bytes = JSON.stringify(profile, null, 2);
  await fs.writeFile(file, bytes);
  const rundownFile = path.join(project, 'data', 'Show.json');
  const existing = { ...structuredClone(template), itemID: 'existing', ycsNickname: 'Keep nickname', ycsEditRevision: 3, ycsLinks: { f4: { mode: 'manual', manual: '100% — José & Co' } } };
  const rundownBytes = JSON.stringify({ templates: [existing] });
  await fs.writeFile(rundownFile, rundownBytes);
  const source = await fs.readFile(path.resolve(__dirname, '../../routes/routes-application.js'), 'utf8');
  const start = source.lastIndexOf('router.post(', source.indexOf("'/show/:foldername/config/saveTemplate'"));
  const marker = '); // saveTemplate end';
  const end = source.indexOf(marker, start);
  assert.ok(start >= 0 && end > start);
  let handler;
  vm.runInNewContext(source.slice(start, end + marker.length), {
    router: { post(url, auth, callback) { handler = callback; } },
    spxAuth: { CheckLogin() {} }, logger: { verbose() {}, error() {} },
    config: { general: { dataroot: root }, ycs }, path, structuredClone,
    GetJsonData: async target => JSON.parse(await fs.readFile(target, 'utf8')),
    spx: { writeFile: async (target, data) => fs.writeFile(target, JSON.stringify(data)) }
  });
  return {
    root, file, profile, bytes, rundownFile, rundownBytes,
    async save(templateData = form(template), index = '0') {
      const response = { code: 200, status(code) { this.code = code; return this; }, send(body) { this.body = body; }, redirect(url) { this.code = 302; this.url = url; } };
      await handler({ body: { showFolder: 'Production', TemplIndex: index, templateData } }, response);
      return { response, saved: JSON.parse(await fs.readFile(file, 'utf8')) };
    }
  };
}

test('settings save updates form fields and preserves all non-form metadata, including false and zero', async t => {
  const h = await harness(t);
  const posted = form();
  const { response, saved } = await h.save(posted);
  assert.equal(response.code, 302);
  assert.equal(response.url, '/show/Production/config');
  assert.deepEqual(saved, { ...h.profile, templates: [{ ...original, ...posted, DataFields: original.DataFields }, h.profile.templates[1]] });
  assert.equal(await fs.readFile(h.rundownFile, 'utf8'), h.rundownBytes, 'existing item fields, identity, links and nickname are untouched');
});

test('posted metadata cannot replace saved routing, policy, steps or custom properties', async t => {
  const h = await harness(t);
  const { saved } = await h.save({ ...form(), ycsSlot: 'ticker', ycsPreviewOnEdit: true, steps: 99, extension: {}, ografProps: {}, injected: true });
  for (const key of ['ycsSlot', 'ycsPreviewOnEdit', 'steps', 'extension']) assert.deepEqual(saved.templates[0][key], original[key]);
  assert.equal(Object.hasOwn(saved.templates[0], 'injected'), false);
  assert.equal(Object.hasOwn(saved.templates[0], 'ografProps'), false);
});

test('OGraf properties survive a normal save without being replaced by posted values', async t => {
  const template = { ...original, ografProps: { id: 'graphic', capabilities: ['update'] } };
  const h = await harness(t, template, 'OGRAF');
  const { saved } = await h.save({ ...form(), ografProps: { id: 'replacement' } });
  assert.deepEqual(saved.templates[0].ografProps, template.ografProps);
});

test('stock templates stay stock and omitted fields keep their current values', async t => {
  const template = { relpath: '/stock.html', description: 'Stock', DataFields: original.DataFields };
  const h = await harness(t, template);
  const { saved } = await h.save({ description: '', ycsSlot: 'ticker' });
  assert.deepEqual(saved.templates[0], { ...template, description: '' });
});

test('invalid field data or a nonexistent template index leaves the profile byte-for-byte unchanged', async t => {
  const h = await harness(t);
  for (const DataFields of ['%broken', '{', encode({}), encode(null)]) {
    const { response } = await h.save({ ...form(), DataFields });
    assert.equal(response.code, 400);
    assert.equal(await fs.readFile(h.file, 'utf8'), h.bytes);
  }
  for (const index of ['99', '-1', 'constructor']) {
    assert.equal((await h.save(form(), index)).response.code, 404);
    assert.equal(await fs.readFile(h.file, 'utf8'), h.bytes);
  }
});

test('new items inherit retained metadata and play after repeated settings saves', async t => {
  const h = await harness(t);
  await h.save();
  const { saved } = await h.save({ description: 'Second save', webplayout: '4' });
  const rundown = JSON.parse(h.rundownBytes);
  rundown.templates.push({ ...saved.templates[0], itemID: 'new' });
  await fs.writeFile(h.rundownFile, JSON.stringify(rundown));
  const repository = new RundownRepository(h.root, [{ id: 'stage-1', project: 'Production', rundown: 'Show' }]);
  const playback = new Playback(repository, { 'lower-third': { order: 20, exitMs: 250 } });
  for (const id of ['existing', 'new']) {
    await playback.command('stage-1', id, 'play');
    const graphic = playback.snapshot('stage-1', 'program').graphics[0];
    assert.equal(graphic.id, id);
    assert.equal(graphic.slot, 'lower-third');
    assert.equal((await playback.editor('stage-1', id)).previewOnEdit, false);
  }
});

test('configured projects can edit only available slot defaults while retaining section metadata',async t=>{
 const sections=[{title:'Names',fields:['f4']}];
 const h=await harness(t,{...original,editorSections:sections},'SPX',{enabled:true,stages:[{project:'Production'}],slots:{ticker:{order:10},'lower-third':{order:20}}});
 let result=await h.save({...form(),ycsSlot:'ticker',editorSections:[]});
 assert.equal(result.saved.templates[0].ycsSlot,'ticker');assert.deepEqual(result.saved.templates[0].editorSections,sections);
 const before=await fs.readFile(h.file,'utf8');result=await h.save({...form(),ycsSlot:'unknown'});
 assert.equal(result.response.code,400);assert.equal(await fs.readFile(h.file,'utf8'),before);
 assert.equal(await fs.readFile(h.rundownFile,'utf8'),h.rundownBytes);
});
