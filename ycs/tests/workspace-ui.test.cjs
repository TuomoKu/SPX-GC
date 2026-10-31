'use strict';
const { loadDataManagerScripts } = require('./helpers/browser.cjs');

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { JSDOM } = require('jsdom');
async function flush() {
  for (let i = 0; i < 8; i++) await new Promise((resolve) => setImmediate(resolve));
}
async function fixture(t) {
  const dom = new JSDOM(
      await fs.readFile(path.join(__dirname, '../public/data-manager.html'), 'utf8'),
      { url: 'http://localhost/ycs/data-manager', runScripts: 'outside-only' }
    ),
    window = dom.window;
  window.structuredClone = structuredClone;
  window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  window.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };

  await loadDataManagerScripts(window);
  const state = {
    revision: 1,
    defaults: [],
    sources: {},
    connections: {
      sheet: {
        label: 'Guests',
        type: 'google-sheets',
        project: 'ShowA',
        settings: {
          url: 'https://docs.google.com/spreadsheets/d/1PUBLIC_SHEET_TEST_1234567890/edit',
          worksheet: '42',
          range: 'A1:B3'
        },
        rows: [
          [
            { address: 'A1', value: 'Name' },
            { address: 'B1', value: 'Title' }
          ],
          [
            { address: 'A2', value: 'Guest One' },
            { address: 'B2', value: 'Expert' }
          ],
          [
            { address: 'A3', value: 'Guest Two' },
            { address: 'B3', value: 'Guest' }
          ]
        ],
        health: 'ok'
      },
      api: {
        label: 'API',
        type: 'json-api',
        project: 'ShowB',
        settings: { url: 'https://api.example.com' },
        health: 'ok',
        data: { person: { name: 'JSON Name' } }
      }
    }
  };
  const posts = [],
    message = [];
  let conflict = false;
  const model = (id) => ({
    title: id,
    revision: 1,
    template: '/test.html',
    fields: [
      {
        field: 'f0',
        title: 'Name',
        ftype: 'textfield',
        type: 'Text',
        manual: 'Manual',
        value: 'Manual',
        binding: null
      },
      {
        field: 'f1',
        title: 'Title',
        ftype: 'textfield',
        type: 'Text',
        manual: 'Manual title',
        value: 'Manual title',
        binding: null
      }
    ]
  });
  const workspace = new window.YCSMappingWorkspace({
    getState: () => state,
    message: (text, error) => message.push({ text, error }),
    onSaved: () => {},
    request: async (url, body) => {
      if (body) {
        posts.push({ url, body: structuredClone(body) });
        if (conflict && !url.endsWith('/preview')) throw new Error('Data changed elsewhere');
        if (url.endsWith('/preview'))
          return {
            ...model('guest'),
            graphic: { id: 'guest', template: '/templates/test.html', data: { f0: 'Preview' } },
            fields: model('guest').fields
          };
        return state;
      }
      if (url.endsWith('/graphics'))
        return [
          {
            id: 'guest',
            title: 'Guest',
            template: '/test.html',
            slot: 'lower-third',
            fields: model('guest').fields,
            mapped: 0
          },
          {
            id: 'other',
            title: 'Other',
            template: '/test.html',
            slot: 'lower-third',
            fields: model('guest').fields,
            mapped: 0
          }
        ];
      return model(url.split('/').pop());
    }
  });
  await workspace.initialize([
    { id: 'a', title: 'Stage A', project: 'ShowA', rundown: 'Main' },
    { id: 'b', title: 'Stage B', project: 'ShowB', rundown: 'Main' }
  ]);
  await flush();
  t.after(() => {
    workspace.dispose();
    window.close();
  });
  return {
    window,
    workspace,
    state,
    posts,
    message,
    conflict: () => {
      conflict = true;
    },
    $: (id) => window.document.getElementById(id)
  };
}
test('mapping workspace scopes sources to projects and retains separate graphic drafts across navigation', async (t) => {
  const r = await fixture(t);
  assert.deepEqual(
    [...r.$('mapping-source').options].map((option) => option.value),
    ['sheet']
  );
  r.window.document.querySelector('.source-card').click();
  assert.equal(r.workspace.model.edits.get('f0').binding.selection.cell, 'A1');
  r.$('mapping-graphic').value = 'other';
  await r.workspace.selectGraphic();
  assert.equal(r.workspace.model.edits.size, 0);
  r.$('mapping-graphic').value = 'guest';
  await r.workspace.selectGraphic();
  assert.equal(r.workspace.model.edits.size, 1);
  r.$('mapping-project').value = 'ShowB';
  await r.workspace.selectProject();
  assert.deepEqual(
    [...r.$('mapping-source').options].map((option) => option.value),
    ['api']
  );
  r.$('mapping-project').value = 'ShowA';
  await r.workspace.selectProject();
  assert.equal(r.workspace.model.edits.size, 1);
});
test('table-row auto-map is explicit, transforms preserve edits, Revert discards only the selected draft, and conflicts retain it', async (t) => {
  const r = await fixture(t);
  r.workspace.tableMode = true;
  r.workspace.renderSourceContext();
  r.workspace.autoMap();
  assert.equal(r.workspace.model.edits.get('f0').binding.selection.cell, 'A2');
  assert.equal(r.workspace.model.edits.get('f1').binding.selection.cell, 'B2');
  const transform = r.window.document.querySelector('[aria-label="Name transform"]');
  transform.value = 'uppercase';
  transform.dispatchEvent(new r.window.Event('change'));
  assert.equal(r.workspace.model.edits.get('f0').binding.transform.kind, 'uppercase');
  r.state.revision = 99;
  r.workspace.update(r.state);
  r.conflict();
  await r.workspace.save();
  const saved = r.posts.find(
    (post) => post.url.startsWith('/data/mappings/') && !post.url.endsWith('/preview')
  );
  assert.equal(saved.body.revision, 1);
  assert.equal(r.workspace.model.edits.size, 2);
  assert.match(r.message.at(-1).text, /changed elsewhere/);
  await r.workspace.selectGraphic(true);
  assert.equal(r.workspace.model.edits.size, 0);
  assert.equal(r.$('save-mappings').disabled, true);
});
test('cell and JSON browsing never require table headers and source drag payloads target the selected graphic field', async (t) => {
  const r = await fixture(t);
  r.workspace.selectedField = 'f1';
  r.workspace.openCells();
  const cell = r.$('mapping-cell-grid').querySelector('button[aria-label="B3: Guest"]');
  cell.click();
  assert.equal(r.workspace.model.edits.get('f1').binding.selection.cell, 'B3');
  r.$('mapping-project').value = 'ShowB';
  await r.workspace.selectProject();
  r.window.document.querySelector('.source-card').click();
  assert.equal(r.workspace.model.edits.get('f0').binding.selection.pointer, '/person/name');
  const row = r.$('mapping-fields').querySelector('[data-field="f1"]'),
    event = new r.window.Event('drop', { bubbles: true, cancelable: true });
  event.dataTransfer = {
    getData: () =>
      JSON.stringify({ connection: 'api', selection: { kind: 'json', pointer: '/person/name' } })
  };
  row.dispatchEvent(event);
  assert.equal(r.workspace.model.edits.get('f1').binding.selection.pointer, '/person/name');
});

test('known local saves advance compatible draft revisions without discarding other graphics or bypassing older conflicts', async (t) => {
  const r = await fixture(t);
  r.window.document.querySelector('.source-card').click();
  const first = r.workspace.model;
  r.$('mapping-graphic').value = 'other';
  await r.workspace.selectGraphic();
  r.window.document.querySelector('.source-card').click();
  const second = r.workspace.model;
  r.workspace.acceptRevision(1, 2);
  assert.equal(first.revision, 2);
  assert.equal(second.revision, 2);
  assert.equal(first.edits.size, 1);
  assert.equal(second.edits.size, 1);
  first.revision = 1;
  r.workspace.acceptRevision(2, 3);
  assert.equal(first.revision, 1);
  assert.equal(second.revision, 3);
});

test('stage navigation blocks edits and Save while loading, preserves the old draft and ignores late stage responses', async (t) => {
  const r = await fixture(t),
    workspace = r.workspace,
    request = workspace.request;
  workspace.assign({ static: 'Stage A draft' });
  const first = workspace.model;
  let release;
  workspace.request = (url, body) =>
    url === '/stages/b/graphics'
      ? new Promise((resolve) => (release = resolve))
      : request(url, body);
  r.$('mapping-project').value = 'ShowB';
  const navigation = workspace.selectProject();
  assert.equal(workspace.model, null);
  assert.equal(r.$('save-mappings').disabled, true);
  assert.equal(r.$('mappings-view').getAttribute('aria-busy'), 'true');
  workspace.assign({ static: 'Wrong stage' });
  await workspace.save();
  await workspace.preview();
  assert.equal(
    r.posts.filter(
      (post) => post.url.startsWith('/data/mappings/') && !post.url.endsWith('/preview')
    ).length,
    0
  );
  assert.equal(first.edits.get('f0').binding.static, 'Stage A draft');
  r.$('mapping-project').value = 'ShowA';
  await workspace.selectProject();
  assert.equal(workspace.model, first);
  assert.equal(workspace.current(), true);
  release([{ id: 'guest', title: 'Late stage B', fields: [] }]);
  await navigation;
  assert.equal(workspace.stage, 'a');
  assert.equal(workspace.model, first);
  assert.notEqual(r.$('mapping-title').textContent, 'Late stage B');
});

test('graphic navigation blocks old-model saves, ignores stale same-target loads and recovers from a failed load', async (t) => {
  const r = await fixture(t),
    workspace = r.workspace,
    request = workspace.request;
  workspace.assign({ static: 'Original draft' });
  const pending = [];
  workspace.request = (url, body) =>
    !body && url === '/data/mappings/a/other'
      ? new Promise((resolve, reject) => pending.push({ resolve, reject }))
      : request(url, body);
  r.$('mapping-graphic').value = 'other';
  const first = workspace.selectGraphic();
  await workspace.save();
  assert.equal(
    r.posts.filter(
      (post) => post.url.startsWith('/data/mappings/') && !post.url.endsWith('/preview')
    ).length,
    0
  );
  r.$('mapping-graphic').value = 'guest';
  await workspace.selectGraphic();
  assert.equal(workspace.model.edits.size, 1);
  r.$('mapping-graphic').value = 'other';
  const second = workspace.selectGraphic();
  pending[1].resolve({ title: 'Newest other', revision: 1, template: '/test.html', fields: [] });
  await second;
  pending[0].resolve({ title: 'Obsolete other', revision: 1, template: '/test.html', fields: [] });
  await first;
  assert.equal(r.$('mapping-title').textContent, 'Newest other');
  const failed = workspace.selectGraphic(true);
  pending[2].reject(new Error('Read failed'));
  await failed;
  assert.equal(workspace.model, null);
  assert.equal(r.$('save-mappings').disabled, true);
  assert.equal(r.$('mappings-view').getAttribute('aria-busy'), 'false');
  r.$('mapping-graphic').value = 'guest';
  await workspace.selectGraphic();
  assert.equal(workspace.model.edits.get('f0').binding.static, 'Original draft');
});

test('an in-flight save stays bound to its original identity and cannot reload a subsequently selected graphic', async (t) => {
  const r = await fixture(t),
    workspace = r.workspace,
    request = workspace.request;
  workspace.assign({ static: 'Guest draft' });
  let release;
  workspace.request = (url, body) =>
    body && url === '/data/mappings/a/guest'
      ? new Promise((resolve) => {
          release = resolve;
          r.posts.push({ url, body: structuredClone(body) });
        })
      : request(url, body);
  const saving = workspace.save();
  r.$('mapping-graphic').value = 'other';
  await workspace.selectGraphic();
  const other = workspace.model;
  release({ revision: 2 });
  await saving;
  const saved = r.posts.find((post) => post.url === '/data/mappings/a/guest');
  assert.equal(saved.body.edits[0].binding.static, 'Guest draft');
  assert.equal(workspace.model, other);
  assert.equal(workspace.model.graphic, 'other');
  assert.equal(r.$('mappings-view').inert, false);
});

test('disposing the workspace detaches global listeners and ignores late preview responses', async (t) => {
  const r = await fixture(t),
    workspace = r.workspace;
  let complete,
    painted = 0,
    moves = 0;
  workspace.request = () => new Promise((resolve) => (complete = resolve));
  workspace.view.sendPreview = () => painted++;
  workspace.view.moveDrag = () => moves++;
  const pending = workspace.preview();
  workspace.dispose();
  r.window.document.dispatchEvent(new r.window.Event('pointermove'));
  complete({ template: '/test.html', fields: [], graphic: { id: 'guest' } });
  await pending;
  assert.equal(moves, 0);
  assert.equal(painted, 0);
  assert.equal(workspace.model, null);
  assert.equal(r.$('mapping-preview').onload, null);
});

test('Back to rundown follows selection and guards drafts in other graphics/projects and in-flight saves',async t=>{
 const r=await fixture(t),link=r.$('back-rundown');
 assert.equal(link.getAttribute('href'),'/gc/ShowA/Main');
 r.window.document.querySelector('.source-card').click();
 r.$('mapping-project').value='ShowB';await r.workspace.selectProject();
 assert.equal(link.getAttribute('href'),'/gc/ShowB/Main');
 let prompts=0;r.window.confirm=()=>{prompts++;return false;};
 const click=()=>{const event=new r.window.MouseEvent('click',{cancelable:true});link.onclick(event);return event;};
 assert.equal(click().defaultPrevented,true);assert.equal(prompts,1);
 assert.ok([...r.workspace.models.values()].some(model=>model.edits.size));
 r.window.confirm=()=>true;assert.equal(click().defaultPrevented,false);
 r.workspace.saving=true;assert.equal(click().defaultPrevented,true);
 r.workspace.saving=false;for(const model of r.workspace.models.values())model.edits.clear();
 r.window.confirm=()=>{throw Error('Clean drafts must not prompt');};assert.equal(click().defaultPrevented,false);
});
