'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { JSDOM } = require('jsdom');
async function controller(t, compact = false, previewOnEdit = true, primary = false, hooks = {}) {
  const dom = new JSDOM(
    `<html data-ycs-stage="stage-1" data-ycs-project="Stage1" data-ycs-rundown="Show"><head></head><body><div id="controllerPluginButtons"></div><iframe id="previewIF"></iframe>
    <div class="itemrow inFocus" data-spx-epoch="ticker"><div class="truncate"></div><div id="Expanded" style="display:block"></div>
    <input data-update="f0" type="hidden" value="broadcast-1"><input data-update="f5" class="gcinput" value="MANUAL ROUND">
    <input name="RundownItem[onair]" value="false"><span data-spx-name="icon"></span><span data-spx-name="deletelarge"></span>
    <button data-spx-name="playbutton" data-spx-playtext="PLAY" data-spx-stoptext="STOP"></button><button data-spx-name="updatebutton" class="disabled">Update</button></div></body></html>`,
    { url: 'http://localhost/gc/Stage1/Show', runScripts: 'outside-only' }
  );
  const { window } = dom,
    posts = [],
    channels = new Map();
  const row = window.document.querySelector('.itemrow');
  const originalRound = row.querySelector('[data-update="f5"]');
  if (compact) {
    const expanded = row.querySelector('#Expanded');
    expanded.innerHTML =
      '<table><tbody><tr><td colspan="3" class="spxTableHeadsmall"><span>YCS TICKER 1</span><i class="l-icon">Edit</i></td></tr><tr><td width="65%"></td><td width="35%"><button onclick="saveTemplateItemChangesByElement(this.closest(\'.itemrow\'))">Save</button></td></tr></tbody></table>';
    const cell = expanded.querySelector('td[width="65%"]');
    cell.append(row.querySelector('[data-update="f0"]'), originalRound);
    for (const [field, type, value] of [
      ['f2', 'checkbox', '1'],
      ['f8', 'number', '145'],
      ['f14', 'textarea', '[]']
    ]) {
      const input = window.document.createElement(type === 'textarea' ? 'textarea' : 'input');
      if (type !== 'textarea') input.type = type;
      input.dataset.update = field;
      input.name = `RundownItem[${field}]`;
      input.value = value;
      input.checked = type === 'checkbox';
      input.className = 'gcinput';
      cell.append(input);
    }
    if (primary) {
      const flags=window.document.createElement('select'); flags.dataset.update='f7';
      flags.innerHTML='<option value="./assets/us.png">us.png</option>';cell.append(flags);
    }
  }
  let revision = 0,
    closed = 0,
    validationError;
  window.setMasterButtonStates = () => {};
  window.getFocusedRow = () => row;
  window.ToggleExpand = () => {
    closed++;
    row.querySelector('#Expanded').style.display = 'none';
  };
  // Matches the bundled Socket.IO 4.0.0 client: active stays true after a refused
  // namespace connection, and connected is false until it is accepted.
  const socket = {
    active: true,
    connected: false,
    on: (event, callback) => {
      const handlers = channels.get(event);
      channels.set(event, handlers ? (...args) => { handlers(...args); callback(...args); } : callback);
    },
    emit() {},
    disconnect() { (hooks.calls ||= []).push('disconnect'); },
    connect() { (hooks.calls ||= []).push('connect'); hooks.connects = (hooks.connects || 0) + 1; }
  };
  window.io = () => socket;
  window.fetch = async (url, request) => {
    let payload;
    if (request?.method === 'POST') {
      const body = JSON.parse(request.body);
      posts.push({ url, body });
      const refusal = hooks.refuse?.(url);
      if (refusal)
        return { ok: false, status: refusal, json: async () => ({ error: 'Remote API requires a configured token or operator login' }) };
      if (validationError)
        return {
          ok: false,
          json: async () => ({
            error: 'Current round: Value exceeds 300 characters',
            fields: validationError
          })
        };
      const action = url.split('/').at(-1);
      payload = {
        editorRevision: action === 'stop' ? 99 : action === 'preview' ? revision : ++revision,
        ...(action === 'nickname' ? { nickname: body.nickname.trim() } : {})
      };
    } else if (url === '/ycs/session' && hooks.page) return hooks.page();
    else if (url.endsWith('/editor'))
      payload = {
        previewOnEdit,
        slots:[{id:'ticker',label:'Ticker'},{id:'lower-third',label:'Lower third'}], slot:'ticker',slotOverride:'ticker',defaultSlot:'ticker',slotConfigured:true,
        sections: compact && !primary ? [{placement:'header',fields:['f2']},{title:'Stories',collapsed:true,fields:['f14']},{title:'Appearance & timing',collapsed:true,fields:['f8']}] : [],
        revision,
        links: {
          f5: { mode: 'manual', manual: 'MANUAL ROUND' },
          ...(compact ? { f2: { mode: hooks.checkboxLinked ? 'linked' : 'manual', manual: '1' } } : {}),
          ...(hooks.blankSource ? { f2: { mode: 'linked', manual: '1' }, f8: { mode: 'linked', manual: '145' } } : {})
        },
        fields: compact
          ? [
              { field: 'f0', ftype: 'hidden', title: 'Identity' },
              { field: 'f2', ftype: 'checkbox', title: 'Show rounds remaining' },
              { field: 'f5', ftype: 'textfield', title: 'Current round' },
              { field: 'f8', ftype: 'number', title: 'Crawl speed', ...(primary?{ycsPrimary:true}:{}) },
              ...(primary?[{field:'f7',ftype:'filelist',title:'Left flag',ycsPrimary:true}]:[]),
              {
                field: 'f14',
                ftype: 'textarea',
                title: 'Stories',
                ycsCollection: { version: 1, fields: [{ key: 'subtopic' }] }
              }
            ]
          : [{ field: 'f5', ftype: 'textfield', title: 'Current round', value: 'MANUAL ROUND' }]
      };
    else if (/\/data(?:\?.*)?$/.test(url))
      payload = {
        health: 'ok',
        sources: { 'test.round': { label: 'Test round', value: 'LINKED ROUND' }, ...(hooks.blankSource ? { 'test.blank': { label: 'Report', value: '', health: 'ok' } } : {}) },
        mappings: [{ stage: 'stage-1', graphic: 'ticker', field: 'f5', source: 'test.round' }, ...(hooks.blankSource ? ['f2', 'f8'].map(field => ({ stage: 'stage-1', graphic: 'ticker', field, source: 'test.blank' })) : [])]
      };
    else if (url.endsWith('/health'))
      payload = hooks.health || {
        program: { connected: 0, ready: 0, errors: [] },
        preview: { connected: 0, ready: 0, errors: [] }
      };
    else payload = [];
    return { ok: true, json: async () => payload };
  };
  window.structuredClone = structuredClone;
  window.eval(await fs.readFile(path.join(__dirname, '../public/rundown-summary.js'), 'utf8'));
  await require('./helpers/browser.cjs').loadContract(window);
  window.eval(await fs.readFile(path.join(__dirname, '../public/companion-contract.js'), 'utf8'));
  window.eval(await fs.readFile(path.join(__dirname, '../public/companion-tools.js'), 'utf8'));
  window.eval(await fs.readFile(path.join(__dirname, '../public/stage-panel.js'), 'utf8'));
  window.eval(
    "'use strict';\n" + (await fs.readFile(path.join(__dirname, '../public/controller.js'), 'utf8'))
  );
  t.after(() => {
    window.dispatchEvent(new window.Event('pagehide'));
    window.close();
  });
  for (let index = 0; index < 10; index++) await new Promise((resolve) => setImmediate(resolve));
  const program = (graphics) =>
    channels.get('state')({ stage: 'stage-1', mode: 'program', graphics });
  return {
    window,
    row,
    posts,
    program,
    originalRound,
    focus: (selection) => channels.get('focus')(selection),
    preview: (selected) =>
      channels.get('state')({ stage: 'stage-1', mode: 'preview', selected, graphics: [] }),
    closed: () => closed,
    connectError: () => channels.get('connect_error')(new Error('Stage connection not authorized')),
    socket,
    transportError: () => channels.get('connect_error')(new Error('websocket error')),
    socketLost: (reason = 'transport close') => channels.get('disconnect')(reason),
    socketConnected: () => channels.get('connect')(),
    rejectFields: (errors) => {
      validationError = errors;
    }
  };
}

test('native chain previews without Play and program state enables Update and protects active rows', async (t) => {
  const r = await controller(t);
  assert.equal(r.posts.length, 0);
  r.row.querySelector('.ycs-link-toggle').click();
  await r.window.previewItem(r.row);
  assert.ok(r.posts.every((post) => post.url.endsWith('/preview')));
  const last = r.posts.at(-1).body;
  assert.equal(last.links.f5.manual, 'MANUAL ROUND');
  assert.equal(last.links.f5.mode, 'linked');
  assert.equal(r.row.querySelector('[data-update="f5"]').readOnly, true);
  r.program([{ id: 'ticker', links: { f5: { mode: 'linked', source: 'test.round' } } }]);
  assert.equal(
    r.row.querySelector('[data-spx-name="updatebutton"]').classList.contains('disabled'),
    false
  );
  assert.equal(r.row.querySelector('[data-spx-name="deletelarge"]').style.visibility, 'hidden');
  r.program([]);
  assert.equal(
    r.row.querySelector('[data-spx-name="updatebutton"]').classList.contains('disabled'),
    true
  );
});

test('field validation errors appear beside their input and clear after a successful correction', async (t) => {
  const r = await controller(t),
    input = r.row.querySelector('[data-update="f5"]');
  r.rejectFields({ f5: 'Value exceeds 300 characters' });
  await r.window.updateItem(r.row);
  assert.equal(input.getAttribute('aria-invalid'), 'true');
  assert.equal(r.row.querySelector('.ycs-field-error').textContent, 'Value exceeds 300 characters');
  assert.ok(
    input.getAttribute('aria-describedby').includes(r.row.querySelector('.ycs-field-error').id)
  );
  assert.equal(r.closed(), 0);
  r.rejectFields(null);
  await r.window.previewItem(r.row);
  assert.equal(input.hasAttribute('aria-invalid'), false);
  assert.equal(r.row.querySelector('.ycs-field-error'), null);
  assert.equal(r.window.document.querySelector('.ycs-command-status').textContent, '');
});

test('native Save closes the editor; Stop does not silently refresh a stale editing revision', async (t) => {
  const r = await controller(t);
  await r.window.saveTemplateItemChangesByElement(r.row);
  assert.equal(r.closed(), 1);
  assert.equal(r.row.querySelector('.truncate').textContent, 'MANUAL ROUND');
  await r.window.playItem(r.row, 'stop');
  await r.window.updateItem(r.row);
  assert.equal(r.posts.at(-1).body.revision, 1);
});

test('compact action picker copies exact project/rundown/item URLs without requests or draft changes', async (t) => {
  const r = await controller(t, true),
    copied = [];
  r.window.document.documentElement.dataset.ycsServerAddress = '192.0.2.7:5660';
  Object.defineProperty(r.window.navigator, 'clipboard', {
    value: { writeText: async (value) => copied.push(value) }
  });
  const tools = r.row.querySelector('.ycs-companion-tools'),
    select = tools.querySelector('select'),
    button = tools.querySelector('button');
  assert.equal(tools.querySelectorAll('button').length, 1);
  assert.equal(tools.querySelector('p'), null);
  assert.equal(tools.querySelector('summary'), null);
  assert.equal(r.window.document.querySelector('.ycs-companion-download'), null);
  assert.equal(
    button.innerHTML,
    r.window.document.querySelector('[data-copy-output="preview"]').innerHTML
  );
  const input = r.row.querySelector('[data-update="f5"]');
  input.value = 'UNSAVED DRAFT';
  for (const action of ['focus', 'play', 'stop', 'toggle', 'update', 'preview', 'continue']) {
    select.value = action;
    select.dispatchEvent(new r.window.Event('change', { bubbles: true }));
    button.click();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(copied.at(-1), 'http://192.0.2.7:5660/api/Stage1/Show/ticker/' + action);
  }
  assert.equal(r.posts.length, 0);
  assert.equal(input.value, 'UNSAVED DRAFT');
  assert.equal(r.row.querySelector('#Expanded').style.display, 'block');
  await r.window.copyItemID('ticker', 'play');
  assert.equal(copied.at(-1), 'http://192.0.2.7:5660/api/Stage1/Show/ticker/play');
});

test('remote focus selects Preview monitor and preserves drafts without sending another preview or playout', async (t) => {
  const r = await controller(t, true),
    input = r.row.querySelector('[data-update="f5"]');
  input.value = 'UNSAVED';
  input.dispatchEvent(new r.window.Event('input', { bubbles: true }));
  const queuedPreview = r.window.previewItem(r.row);
  r.window.document.querySelector('[data-monitor="program"]').click();
  r.row.classList.remove('inFocus');
  r.focus({ stage: 'stage-2', selected: 'ticker' });
  assert.equal(r.row.classList.contains('inFocus'), false);
  r.focus({ stage: 'stage-1', selected: 'ticker' });
  assert.equal(r.row.classList.contains('inFocus'), true);
  await queuedPreview;
  await new Promise((resolve) => setTimeout(resolve, 350));
  assert.equal(
    r.window.document.getElementById('previewIF').getAttribute('src'),
    '/output/stage-1/preview'
  );
  assert.match(
    r.window.document.querySelector('.ycs-command-status').textContent,
    /Previewing saved values/
  );
  assert.equal(input.value, 'UNSAVED');
  assert.equal(r.posts.length, 0);
  assert.equal(r.closed(), 0);
});

test('nickname editing changes only display metadata, preserves unsaved field edits and supports Cancel and clearing', async (t) => {
  const r = await controller(t, true),
    edit = r.row.querySelector('.ycs-nickname-edit'),
    input = r.row.querySelector('[data-update="f5"]');
  assert.equal(edit.disabled, false);
  assert.equal(edit.getAttribute('aria-label'), 'Edit nickname');
  edit.click();
  r.row.querySelector('[aria-label="Cancel nickname"]').click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(r.posts.length, 0);
  const escaped = [];
  r.window.document.addEventListener('keydown', (event) => escaped.push(event.key));
  edit.click();
  r.row
    .querySelector('[aria-label="Rundown nickname"]')
    .dispatchEvent(new r.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(r.row.querySelector('.ycs-nickname-form').hidden, true);
  assert.deepEqual(escaped, []);
  input.value = 'UNSAVED ROUND';
  r.row.dataset.spxChanged = 'true';
  edit.click();
  r.row.querySelector('[aria-label="Rundown nickname"]').value = '  Player <b>A</b>  ';
  r.row.querySelector('[aria-label="Save nickname"]').click();
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve));
  assert.equal(r.posts.at(-1).url, '/api/ycs/stages/stage-1/graphics/ticker/nickname');
  assert.deepEqual(Object.keys(r.posts.at(-1).body).sort(), ['nickname', 'revision']);
  assert.equal(r.row.querySelector('[data-ycs-item-title]').textContent, 'Player <b>A</b>');
  assert.equal(r.row.querySelector('[data-ycs-item-title] b'), null);
  assert.equal(r.row.dataset.spxEpoch, 'ticker');
  assert.equal(r.row.dataset.spxChanged, 'true');
  assert.equal(input.value, 'UNSAVED ROUND');
  await r.window.saveTemplateItemChangesByElement(r.row);
  assert.equal(r.posts.at(-1).body.revision, 1);
  edit.click();
  r.row.querySelector('[aria-label="Rundown nickname"]').value = '';
  r.row.querySelector('[aria-label="Save nickname"]').click();
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve));
  assert.equal(r.row.querySelector('[data-ycs-item-title]').textContent, 'YCS TICKER 1');
  assert.ok(
    r.posts.every(
      (post) =>
        !post.url.endsWith('/play') &&
        !post.url.endsWith('/update') &&
        !post.url.endsWith('/preview')
    )
  );
});

test('a blank source shows blank on linked number and checkbox fields, and Play sends their typed values', async t => {
  const r = await controller(t, true, true, false, { blankSource: true });
  const number = r.row.querySelector('[data-update="f8"]'),
    checkbox = r.row.querySelector('[data-update="f2"]');
  for (let i = 0; i < 100 && (number.value !== '' || checkbox.checked); i++) await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(number.value, '', 'the number shows blank');
  assert.equal(checkbox.checked, false, 'the checkbox shows unticked');
  const detail = number.closest('.ycs-link-field').querySelector('button');
  assert.equal(detail.classList.contains('is-warning'), false, 'a blank is not reported as holding a value');
  await r.window.previewItem(r.row);
  const sent = Object.fromEntries(r.posts.at(-1).body.fields.map(entry => [entry.field, entry.value]));
  assert.equal(sent.f8, '145', 'the typed fallback is sent, not the blank display');
  assert.equal(sent.f2, '1');
});

test('a linked checkbox with a cleared mapping keeps its unlink button visible and restores manual editing', async t => {
  const r = await controller(t, true, true, false, { checkboxLinked: true });
  const style = r.window.document.createElement('style');
  style.textContent = await fs.readFile(path.join(__dirname, '../public/controller.css'), 'utf8');
  r.window.document.head.append(style);
  assert.ok(style.sheet, 'the actual controller stylesheet must load');
  const checkbox = r.row.querySelector('[data-update="f2"]');
  const button = checkbox.closest('.ycs-link-field').querySelector('button');
  assert.equal(checkbox.disabled, true);
  assert.equal(button.classList.contains('is-unassigned'), true);
  assert.equal(button.classList.contains('is-linked'), true);
  assert.notEqual(r.window.getComputedStyle(button).display, 'none');
  button.click();
  await r.window.previewItem(r.row);
  assert.equal(checkbox.disabled, false);
  assert.equal(checkbox.checked, true);
  assert.equal(r.posts.at(-1).body.links.f2.mode, 'manual');
  assert.ok(r.posts.every(post => post.url.endsWith('/preview')));
});

test('compact native editor preserves field nodes and values, keeps checkbox editing and link changes off air, and saves all advanced fields', async (t) => {
  const r = await controller(t, true),
    input = r.row.querySelector('[data-update="f5"]'),
    checkbox = r.row.querySelector('[data-update="f2"]');
  assert.equal(
    input,
    r.originalRound,
    'moving labels must not replace native inputs or their handlers'
  );
  assert.equal(r.posts.length, 0);
  assert.ok(r.row.querySelector('.ycs-editor-heading').contains(checkbox));
  assert.equal(r.row.querySelector('[data-ycs-item-title]').textContent, 'YCS TICKER 1');
  assert.equal(
    r.row.querySelector('.ycs-editor-title use').getAttribute('href'),
    '/ycs/editor-icons.svg#square-pen'
  );
  const button = input.previousElementSibling,
    detail = r.window.document.getElementById(input.getAttribute('aria-describedby'));
  assert.match(button.title, /Test round/);
  assert.equal(detail.classList.contains('is-warning'), false);
  checkbox.checked = false;
  checkbox.dispatchEvent(new r.window.Event('input', { bubbles: true }));
  button.click();
  await r.window.previewItem(r.row);
  assert.equal(input.readOnly, true);
  assert.ok(r.posts.every((post) => post.url.endsWith('/preview')));
  assert.equal(r.posts.at(-1).body.links.f2.manual, '0');
  assert.equal(r.posts.at(-1).body.links.f5.mode, 'linked');
  button.click();
  await r.window.previewItem(r.row);
  assert.equal(input.value, 'MANUAL ROUND');
  assert.equal(input.readOnly, false);
  await r.window.saveTemplateItemChangesByElement(r.row);
  const saved = r.posts.at(-1);
  assert.ok(saved.url.endsWith('/save'));
  assert.deepEqual(saved.body.fields.map((field) => field.field).sort(), [
    'f0',
    'f14',
    'f2',
    'f5',
    'f8'
  ]);
  assert.equal(saved.body.fields.find((field) => field.field === 'f2').value, '0');
  assert.equal(saved.body.fields.find((field) => field.field === 'f8').value, '145');
  assert.equal(saved.body.fields.find((field) => field.field === 'f14').value, '[]');
  assert.equal(r.closed(), 1);
});

test('duplicating imports and initializes a fresh saved row without disturbing original drafts or command URLs', async (t) => {
  const r = await controller(t, true),
    input = r.row.querySelector('[data-update="f5"]');
  input.value = 'UNSAVED ORIGINAL';
  r.row.dataset.spxChanged = 'true';
  const hidden = r.window.document.createElement('input');
  hidden.id = 'datafile';
  hidden.value = 'Stage1/data/Show.json';
  r.window.document.body.append(hidden);
  const originalFetch = r.window.fetch,
    copied = [];
  let cloneID,
    duplicates = 0;
  Object.defineProperty(r.window.navigator, 'clipboard', {
    value: { writeText: async (value) => copied.push(value) }
  });
  r.window.fetch = async (url, options) => {
    if (url === '/gc/Stage1/Show' && options.method === 'POST') {
      duplicates++;
      const data = JSON.parse(options.body);
      assert.equal(data.sourceEpoch, 'ticker');
      cloneID = data.cloneEpoch;
      assert.notEqual(cloneID, 'ticker');
      return { ok: true };
    }
    if (url === '/gc/Stage1/Show')
      return {
        ok: true,
        text: async () => `<html><body>
      <div class="itemrow" data-spx-epoch="${cloneID}" data-spx-changed="false">
        <div class="truncate"></div><div id="Expanded" style="display:block">
          <table><tbody><tr><td colspan="3" class="spxTableHeadsmall"><span>YCS TICKER 1</span></td></tr>
          <tr><td width="65%"><input data-update="f0" type="hidden" value="broadcast-1">
          <input data-update="f5" class="gcinput" value="SAVED DATA"></td>
          <td width="35%"><button onclick="saveTemplateItemChangesByElement(this.closest('.itemrow'))">Save</button></td></tr></tbody></table>
        </div><input name="RundownItem[onair]" value="false">
        <span data-spx-name="icon"></span><button data-spx-name="updatebutton"></button>
      </div></body></html>`
      };
    return originalFetch(url, options);
  };
  const [copy] = await Promise.all([
    r.window.duplicateRundownItem(r.row),
    r.window.duplicateRundownItem(r.row)
  ]);
  assert.equal(duplicates, 1);
  assert.ok(copy);
  assert.equal(copy.dataset.spxEpoch, cloneID);
  assert.equal(input.value, 'UNSAVED ORIGINAL');
  assert.equal(r.row.dataset.spxChanged, 'true');
  assert.equal(r.posts.length, 0);
  assert.notEqual(copy.querySelector('[data-update="f5"]').id, input.id);
  assert.equal(copy.querySelectorAll('.ycs-companion-tools').length, 1);
  copy.querySelector('.ycs-companion-tools button').click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(copied.at(-1), 'http://localhost/api/Stage1/Show/' + cloneID + '/play');
  await r.window.playItem(copy, 'play');
  assert.equal(r.posts.at(-1).url, '/api/ycs/stages/stage-1/graphics/' + cloneID + '/play');
  assert.equal(r.posts.at(-1).body.fields.find((f) => f.field === 'f5').value, 'MANUAL ROUND');
  assert.equal(input.value, 'UNSAVED ORIGINAL');
  copy.querySelector('[aria-label="Edit nickname"]').click();
  assert.equal(copy.querySelector('.ycs-nickname-form').hidden, false);
});
test('a rejected duplicate never adds a dead row or executes playout', async (t) => {
  const r = await controller(t, true),
    hidden = r.window.document.createElement('input');
  hidden.id = 'datafile';
  hidden.value = 'Show.json';
  r.window.document.body.append(hidden);
  const originalFetch = r.window.fetch;
  r.window.fetch = async (url, options) =>
    url === '/gc/Stage1/Show' ? { ok: false } : originalFetch(url, options);
  await r.window.duplicateRundownItem(r.row);
  assert.equal(r.window.document.querySelectorAll('.itemrow').length, 1);
  assert.equal(r.posts.length, 0);
  assert.match(
    r.window.document.querySelector('.ycs-command-status').textContent,
    /Could not duplicate/
  );
});

async function useNativeFocus(r) {
  const source = await fs.readFile(path.join(__dirname, '../../static/js/spx_gc.js'), 'utf8');
  const start = source.indexOf('function focusRow('),
    end = source.indexOf('function getFocusedRow()', start);
  r.window.eval(source.slice(start, end));
  r.window.getIndexOfRowItem = () => 0;
  r.row.scrollIntoView = () => {};
  const mode = r.window.document.createElement('input');
  mode.id = 'previewMode';
  mode.value = 'selected';
  r.window.document.body.append(mode);
}
const flushController = async () => {
  for (let i = 0; i < 10; i++) await new Promise((resolve) => setImmediate(resolve));
};

test('Stop Stage clears the preview marker so clicking the same highlighted single item previews again', async (t) => {
  const r = await controller(t, true);
  await useNativeFocus(r);
  r.window.focusRow(r.row);
  await flushController();
  assert.equal(r.posts.at(-1).url, '/api/ycs/stages/stage-1/graphics/ticker/preview');
  r.preview('ticker');
  assert.equal(r.row.dataset.spxPreviewing, 'true');
  const input = r.row.querySelector('[data-update="f5"]');
  input.value = 'LOCAL DRAFT';
  r.row.dataset.spxChanged = 'true';
  await r.window.stopAll();
  assert.equal(r.posts.at(-1).url, '/api/ycs/stages/stage-1/clear');
  r.program([]);
  r.preview(null);
  assert.equal(r.row.classList.contains('inFocus'), true);
  assert.equal(r.row.dataset.spxPreviewing, 'false');
  const count = r.posts.length;
  r.window.focusRow(r.row);
  await flushController();
  assert.equal(r.posts.length, count + 1);
  assert.equal(r.posts.at(-1).url, '/api/ycs/stages/stage-1/graphics/ticker/preview');
  assert.equal(r.posts.at(-1).body.fields.find((f) => f.field === 'f5').value, 'LOCAL DRAFT');
  assert.equal(input.value, 'LOCAL DRAFT');
  assert.equal(r.row.dataset.spxChanged, 'true');
  assert.ok(r.posts.every((p) => p.url.endsWith('/preview') || p.url.endsWith('/clear')));
});

test('external Preview changes clear only stale markers, and a failed preview permits click-to-retry', async (t) => {
  const r = await controller(t);
  await useNativeFocus(r);
  r.preview('ticker');
  r.preview('another-item');
  assert.equal(r.row.dataset.spxPreviewing, 'false');
  r.rejectFields({ f5: 'Invalid preview value' });
  r.window.focusRow(r.row);
  await flushController();
  assert.equal(r.row.dataset.spxPreviewing, 'false');
  r.rejectFields(null);
  const before = r.posts.length;
  r.window.focusRow(r.row);
  await flushController();
  assert.equal(r.posts.length, before + 1);
  r.preview('ticker');
  assert.equal(r.row.dataset.spxPreviewing, 'true');
  r.window.focusRow(r.row);
  await flushController();
  assert.equal(
    r.posts.length,
    before + 1,
    'an already visible preview should not replay on every click'
  );
});

test('templates can defer checkbox, text and link edits until an explicit command', async t => {
  const r = await controller(t, true, false);
  await useNativeFocus(r);
  r.row.addEventListener('click', () => r.window.focusRow(r.row));
  r.row.classList.remove('inFocus');
  const checkbox = r.row.querySelector('[data-update="f2"]');
  checkbox.click();
  assert.equal(r.row.classList.contains('inFocus'), true, 'editing focuses the item without previewing it');
  const text = r.row.querySelector('[data-update="f5"]');
  text.value = 'DRAFT TITLE';
  text.dispatchEvent(new r.window.Event('input', { bubbles: true }));
  r.row.querySelector('[data-update="f5"]').closest('.ycs-link-field').querySelector('button').click();
  await new Promise(resolve => setTimeout(resolve, 400));
  assert.equal(r.posts.length, 0, 'neither editing nor linking sends Preview or Play');
  assert.equal(r.row.dataset.spxChanged, 'true');
  await r.window.previewItem(r.row);
  assert.ok(r.posts.at(-1).url.endsWith('/preview'));
  assert.equal(r.posts.at(-1).body.fields.find(field => field.field === 'f2').value, '0');
  assert.equal(r.row.dataset.spxChanged, 'true', 'preview does not save the draft');
  await r.window.playItem(r.row, 'play');
  assert.ok(r.posts.at(-1).url.endsWith('/play'));
  await r.window.updateItem(r.row);
  assert.ok(r.posts.at(-1).url.endsWith('/update'));
});

test('primary field metadata keeps match score and flag controls inline without changing other templates',async t=>{
  const r=await controller(t,true,true,true), content=r.row.querySelector('.ycs-editor-content');
  assert.equal(content.contains(r.row.querySelector('[data-update="f8"]')),true);
  assert.equal(content.contains(r.row.querySelector('[data-update="f7"]')),true);
  assert.equal(r.row.querySelectorAll('.ycs-advanced').length,0);
  await r.window.saveTemplateItemChangesByElement(r.row);
  assert.equal(r.posts.at(-1).body.fields.find(field=>field.field==='f7').value,'./assets/us.png');
  const normal=await controller(t,true);
  assert.equal([...normal.row.querySelectorAll('.ycs-advanced')].find(group=>group.querySelector('summary').textContent==='Appearance & timing').contains(normal.row.querySelector('[data-update="f8"]')),true);
});

test('slot dropdown saves routing without preview/play and keeps unsaved content drafts',async t=>{
 const r=await controller(t,true),select=r.row.querySelector('[aria-label="Display slot"]');
 const input=r.row.querySelector('[data-update="f5"]');input.value='UNSAVED';
 select.value='lower-third';select.dispatchEvent(new r.window.Event('change',{bubbles:true}));
 for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(r.posts.length,1);assert.ok(r.posts[0].url.endsWith('/slot'));assert.equal(r.posts[0].body.slot,'lower-third');assert.equal(input.value,'UNSAVED');
});

test('the stage panel shows renderer errors from stage health so a failed slot is visible', async (t) => {
  const health = {
    program: { connected: 1, ready: 0, errors: ['lower-third: Template lifecycle timed out'] },
    preview: { connected: 1, ready: 1, errors: [] }
  };
  const r = await controller(t, false, true, false, { health });
  const status = r.window.document.querySelector('.ycs-output-health');
  assert.equal(status.hidden, false);
  assert.equal(status.textContent, 'Program output · lower-third: Template lifecycle timed out');
});

test('the stage panel shows a restored-program notice from stage health, and Dismiss clears it on the server', async (t) => {
  const health = {
    program: { connected: 1, ready: 1, errors: [] },
    preview: { connected: 1, ready: 1, errors: [] },
    restored: { graphics: 2, downtimeSeconds: 7 }
  };
  const r = await controller(t, false, true, false, { health });
  const status = r.window.document.querySelector('.ycs-restored-status');
  assert.equal(status.hidden, false);
  assert.equal(status.querySelector('span').textContent, 'Restored 2 graphics after restart · server was down about 7 s');
  status.querySelector('button').click();
  assert.equal(status.hidden, true);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(r.posts.map((post) => post.url), ['/api/ycs/stages/stage-1/restored/dismiss'], 'Dismiss sends no playout command');
});

const sessionOk = async () => ({ ok: true, redirected: false, url: 'http://localhost/ycs/session' });
function capture(r) {
  const timers = [], schedule = r.window.setTimeout;
  r.window.setTimeout = (callback, ms) => ([0, 1000, 5000].includes(ms) ? timers.push({ callback, ms }) : schedule(callback, ms));
  return timers;
}

test('a refused socket renews at once, reopens its transport and backs off if refused again', async (t) => {
  const hooks = { page: sessionOk };
  const r = await controller(t, false, true, false, hooks), timers = capture(r);
  const status = r.window.document.querySelector('.ycs-connection-status');
  r.connectError();
  assert.equal(status.hidden, false);
  assert.deepEqual(timers.map((timer) => timer.ms), [0], 'even though the client still reports active');
  await timers.shift().callback();
  assert.deepEqual(hooks.calls, ['disconnect', 'connect'], 'the handshake must carry the renewed session');
  assert.equal(timers.length, 0, 'the answer arrives as connect or another refusal');
  r.connectError();
  assert.deepEqual(timers.map((timer) => timer.ms), [5000]);
  await timers.shift().callback();
  r.socketConnected();
  r.connectError();
  assert.deepEqual(timers.map((timer) => timer.ms), [0], 'connecting clears the back-off');
});

test('a signed-out controller says so and keeps checking slowly', async (t) => {
  const hooks = { page: async () => ({ ok: true, redirected: true, url: 'http://localhost/login' }) };
  const r = await controller(t, false, true, false, hooks), timers = capture(r);
  r.connectError();
  await timers.shift().callback();
  assert.equal(hooks.connects, undefined);
  assert.match(r.window.document.querySelector('.ycs-connection-status').textContent, /signed out/);
  assert.deepEqual(timers.map((timer) => timer.ms), [5000]);
});

test('a lost transport or a slow handshake is left to Socket.IO, so it is never abandoned', async (t) => {
  const hooks = { page: sessionOk };
  const r = await controller(t, false, true, false, hooks), timers = capture(r);
  r.socketLost();
  r.transportError();
  assert.equal(timers.length, 0);
  assert.equal(hooks.calls, undefined);
  assert.equal(r.window.document.querySelector('.ycs-connection-status').hidden, false);
});

test('a server shutting down deliberately still gets a reopen, retried while it is away', async (t) => {
  let up = false;
  const hooks = { page: async () => { if (!up) throw new Error('connection refused'); return sessionOk(); } };
  const r = await controller(t, false, true, false, hooks), timers = capture(r);
  r.socketLost('io server disconnect');
  assert.deepEqual(timers.map((timer) => timer.ms), [0]);
  await timers.shift().callback();
  assert.equal(hooks.connects, undefined, 'nothing reopens while the server is down');
  assert.deepEqual(timers.map((timer) => timer.ms), [1000]);
  up = true;
  await timers.shift().callback();
  assert.deepEqual(hooks.calls, ['disconnect', 'connect']);
});

test('a socket that connects during the renewal is not torn down', async (t) => {
  const hooks = {};
  const r = await controller(t, false, true, false, hooks), timers = capture(r);
  hooks.page = async () => { r.socket.connected = true; return sessionOk(); };
  r.connectError();
  await timers.shift().callback();
  assert.equal(hooks.calls, undefined);
  assert.equal(timers.length, 0);
});

test('Stop refused after a restart renews the session and is sent again', async (t) => {
  let pages = 0, refused = true;
  const clear = '/api/ycs/stages/stage-1/clear';
  const hooks = {
    page: async () => { pages++; refused = false; return sessionOk(); },
    refuse: (url) => url === clear && refused && 403
  };
  const r = await controller(t, false, true, false, hooks);
  await Promise.all([r.window.stopAll(), r.window.stopAll()]);
  assert.equal(pages, 1, 'callers waiting together share one renewal');
  assert.equal(r.posts.filter((post) => post.url === clear).length, 4, 'each refused Stop goes out once more');
  assert.match(r.window.document.querySelector('.ycs-command-status').textContent, /Stage stopped/);
});

test('only a 403 is sent again, and only once', async (t) => {
  const clear = '/api/ycs/stages/stage-1/clear';
  for (const [status, page, sends, text] of [
    [500, sessionOk, 1, /operator login/],
    [409, sessionOk, 1, /operator login/],
    [403, async () => { throw new Error('connection refused'); }, 1, /operator login/],
    [403, sessionOk, 2, /operator login/]
  ]) {
    const r = await controller(t, false, true, false, { page, refuse: (url) => url === clear && status });
    await r.window.stopAll();
    assert.equal(r.posts.filter((post) => post.url === clear).length, sends, `status ${status}`);
    assert.match(r.window.document.querySelector('.ycs-command-status').textContent, text);
  }
});

test('a refused Play is not sent again, so it cannot land after a Stop from elsewhere', async (t) => {
  const refusing = (name) => (url) => url.endsWith('/' + name) && 403;
  const played = await controller(t, false, true, false, { page: sessionOk, refuse: refusing('play') });
  await played.window.playItem(played.row, 'play');
  assert.equal(played.posts.filter((post) => post.url.endsWith('/play')).length, 1);
  assert.match(played.window.document.querySelector('.ycs-command-status').textContent, /Press it again/);
  const stopped = await controller(t, false, true, false, { page: sessionOk, refuse: refusing('stop') });
  await stopped.window.playItem(stopped.row, 'stop');
  assert.equal(stopped.posts.filter((post) => post.url.endsWith('/stop')).length, 2, 'Stop on a single graphic does go out again');
});
