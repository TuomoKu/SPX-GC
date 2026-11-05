'use strict';
const { loadDataManagerScripts } = require('./helpers/browser.cjs');

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { JSDOM } = require('jsdom');
async function flush() {
  for (let count = 0; count < 10; count++) await new Promise((resolve) => setImmediate(resolve));
}
async function fixture(t) {
  const dom = new JSDOM(
    await fs.readFile(path.join(__dirname, '../public/data-manager.html'), 'utf8'),
    { url: 'http://localhost/ycs/data-manager', runScripts: 'outside-only' }
  );
  const { window } = dom,
    posts = [];
  let poll;
  window.structuredClone = structuredClone;
  window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  window.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  const data = {
    revision: 0,
    health: 'ok',
    connections: {},
    defaults: [],
    sources: { 'test.round': { label: 'Local round', value: 'MANUAL VALUE', type: 'local' } },
    mappings: []
  };
  const rows = [
    ['Stage', 'Round'],
    ['STAGE 1', '<b>FINALS</b>']
  ].map((row, index) =>
    row.map((value, column) => ({
      address: String.fromCharCode(65 + column) + (index + 1),
      value,
      usable: true
    }))
  );
  window.setInterval = (callback) => {
    poll = callback;
    return 1;
  };
  window.clearInterval = () => {};
  window.fetch = async (target, options) => {
    let result;
    if (options?.method === 'POST') {
      const body = JSON.parse(options.body);
      posts.push({ target, body });
      if (target.endsWith('/test')) result = { rows };
      else if (target.endsWith('/preview'))
        result = {
          template: '/test.html',
          graphic: { id: 'ticker', template: '/templates/test.html', data: { f5: 'MANUAL' } },
          fields: [{ field: 'f5', value: 'MANUAL', health: 'ok' }]
        };
      else if (target.endsWith('/connections')) {
        data.revision++;
        data.connections['sheet.test'] = {
          label: body.label,
          settings: body.settings,
          rows,
          health: 'ok',
          usages: [],
          lastSuccess: new Date().toISOString()
        };
        result = { connectionId: 'sheet.test', snapshot: data };
      } else {
        data.revision++;
        result = data;
      }
    } else if (target.endsWith('/stages'))
      result = [
        {
          id: 'stage-1',
          title: 'Stage 1',
          controller: '/gc/Stage1/Show',
          project: 'Stage1',
          rundown: 'Show'
        }
      ];
    else if (target.endsWith('/graphics'))
      result = [
        {
          id: 'ticker',
          title: 'Ticker',
          template: '/test.html',
          fields: [{ field: 'f5', title: 'Current round' }],
          mapped: 0
        }
      ];
    else if (target.includes('/data/mappings/'))
      result = {
        revision: data.revision,
        template: '/test.html',
        title: 'Ticker',
        fields: [
          {
            field: 'f5',
            title: 'Current round',
            type: 'Text',
            manual: 'MANUAL',
            value: 'MANUAL',
            binding: null,
            origin: 'unassigned'
          }
        ]
      };
    else result = data;
    return { ok: true, json: async () => structuredClone(result) };
  };

  await loadDataManagerScripts(window);
  window.eval(await fs.readFile(path.join(__dirname, '../public/data-manager.js'), 'utf8'));
  await flush();
  t.after(() => {
    window.dispatchEvent(new window.Event('pagehide'));
    window.close();
  });
  const set = (id, value) => {
    const input = window.document.getElementById(id);
    input.value = value;
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  };
  const connect = async () => {
    window.document.getElementById('add-connection').click();
    window.document.querySelector('[data-create-source="json-api"]').click();
    window.document.getElementById('connection-type').querySelector('[value="google-sheets"]').disabled = false;
    window.document.getElementById('connection-type').value = 'google-sheets';
    window.document.getElementById('connection-type').dispatchEvent(new window.Event('change'));
    set('sheet-label', 'Show');
    set('sheet-url', 'https://docs.google.com/spreadsheets/d/1PUBLIC_SHEET_TEST_1234567890/edit');
    window.document.getElementById('test-sheet').click();
    await flush();
  };
  return { window, posts, set, connect, poll: () => poll(), data };
}
test('connection editor tests a reusable dataset, renders literal values and never sends playout', async (t) => {
  const r = await fixture(t),
    document = r.window.document;
  assert.equal(document.getElementById('connection-dialog').open, false);
  await r.connect();
  assert.equal(document.getElementById('save-sheet').disabled, false);
  assert.equal(document.querySelector('.sheet-preview b'), null);
  assert.match(document.querySelector('.sheet-preview').textContent, /<b>FINALS<\/b>/);
  r.set('sheet-range', 'A1:B8');
  assert.equal(document.getElementById('save-sheet').disabled, true);
  document.getElementById('test-sheet').click();
  await flush();
  document.getElementById('save-sheet').click();
  await flush();
  assert.equal(r.posts.at(-1).body.settings.cell, undefined);
  assert.equal(document.querySelector('.connection h3').textContent, 'Show');
  assert.equal(document.getElementById('connection-dialog').open, false);
  assert.ok(r.posts.every((post) => !post.target.includes('/stages/')));
});
test('visual mapping keeps field drafts and local edits during polling and saves with the loaded revision', async (t) => {
  const r = await fixture(t),
    document = r.window.document;
  await r.connect();
  document.getElementById('save-sheet').click();
  await flush();
  document.getElementById('reload-mappings').click();
  await flush();
  const source = document.getElementById('mapping-source');
  source.value = 'sheet.test';
  source.dispatchEvent(new r.window.Event('change'));
  document.querySelector('.source-card').click();
  const local = document.querySelector('.local-value input');
  local.value = 'UNSAVED LOCAL';
  r.data.revision = 99;
  await r.poll();
  assert.equal(local.value, 'UNSAVED LOCAL');
  assert.equal(document.getElementById('save-mappings').disabled, false);
  document.getElementById('save-mappings').click();
  await flush();
  const saved = r.posts.find((post) => post.target === '/api/ycs/data/mappings/stage-1/ticker');
  assert.equal(saved.body.revision, 1);
  assert.equal(saved.body.edits[0].binding.selection.kind, 'cell');
});

test('connection usage renders readable labels safely and keeps IDs in hover details',async t=>{
 const r=await fixture(t);r.data.connections.demo={type:'google-sheets',label:'Controls',settings:{worksheet:'0',range:'A1:B2',refreshSeconds:5},health:'ok',usages:[{stage:'stage-1',graphic:'1234',field:'f3',kind:'mapping',graphicTitle:'<b>Desk hosts</b>',fieldTitle:'Rounds remaining'}]};
 await r.poll();await flush();const li=r.window.document.querySelector('.connection li');
 assert.equal(li.textContent,'Stage 1 · <b>Desk hosts</b> · Rounds remaining');assert.equal(li.querySelector('b'),null);assert.equal(li.title,'stage-1 · 1234 · f3');
});

test('a Data Manager left open renews its session after a server restart', async (t) => {
  const r = await fixture(t);
  const original = r.window.fetch;
  let refused = true, pages = 0;
  r.window.fetch = async (target, options) => {
    if (target === '/ycs/data-manager') { pages++; refused = false; return { ok: true, redirected: false }; }
    if (refused) return { ok: false, status: 403, json: async () => ({ error: 'Remote API requires a configured token or operator login' }) };
    return original(target, options);
  };
  await r.poll();
  await flush();
  assert.equal(pages, 1);
  assert.notEqual(r.window.document.getElementById('health').textContent, 'Server disconnected');
});

test('the Data Manager still reports a server it cannot reach', async (t) => {
  const r = await fixture(t);
  r.window.fetch = async () => { throw new Error('connection refused'); };
  await r.poll();
  await flush();
  assert.equal(r.window.document.getElementById('health').textContent, 'Server disconnected');
});
