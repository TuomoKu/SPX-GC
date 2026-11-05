'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const express = require('express');
const { JSDOM } = require('jsdom');
const { fixture } = require('./playback.test.cjs');
const { loadDataManagerScripts } = require('./helpers/browser.cjs');
const { normalizeSettings } = require('../public-sheets.cjs');
const url = 'https://docs.google.com/spreadsheets/d/1PUBLIC_SHEET_TEST_1234567890/edit';
async function until(predicate) { for (let i = 0; i < 400; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 5)); } assert.fail('UI did not settle'); }
test('spreadsheet, group and named-range dialogs feed the existing mapping panel with headers and icon choices', async t => {
  const f = await fixture(t), app = express(); app.use(express.json());
  const rows = [['CUSTOM', 'STATUS'], ['FALSE', 'IN PROGRESS'], ['TRUE', 'SIDING']].map((row, index) => row.map((value, column) => ({ address: String.fromCharCode(65 + column) + (index + 1), value, usable: true })));
  const playback = require('../index.cjs')(app, { general: { dataroot: f.root, username: '' }, ycs: { enabled: true, dataFile: path.join(f.root, 'sources.json'), stages: f.stages, slots: { ticker: { order: 10 } } } }, {
    auth: { CheckLogin(req, res, next) { next(); } },
    sheets: { worksheets: async () => ({ worksheets: [{ id: '1', name: 'STAGE 1' }] }), read: async input => ({ settings: normalizeSettings(input), rows, headerRows: [1] }) }
  });
  await playback.sources.ready;
  const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
  const base = 'http://127.0.0.1:' + server.address().port;
  const dom = new JSDOM(await fs.readFile(path.join(__dirname, '../public/data-manager.html'), 'utf8'), { url: base + '/ycs/data-manager', runScripts: 'outside-only' });
  const w = dom.window, $ = id => w.document.getElementById(id), requests = [];
  w.structuredClone = structuredClone;
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new w.Event('close')); };
  w.fetch = (target, options) => { requests.push(target); return fetch(base + target, options); };
  w.setInterval = () => 1; w.clearInterval = () => {};
  t.after(async () => { w.dispatchEvent(new w.Event('pagehide')); w.close(); playback.close(); await new Promise(resolve => server.close(resolve)); });
  await loadDataManagerScripts(w); w.eval(await fs.readFile(path.join(__dirname, '../public/data-manager.js'), 'utf8'));
  await until(() => $('health').textContent !== 'Connecting…');
  $('add-spreadsheet').click(); $('workbook-label').value = 'Event'; $('workbook-url').value = url; $('workbook-refresh').value = '0.5';
  $('workbook-form').dispatchEvent(new w.Event('submit', { cancelable: true }));
  await until(() => !$('workbook-dialog').open);
  assert.equal($('workbook-dialog').open, false);
  assert.match(w.document.querySelector('[data-workbook-metrics]').textContent, /Last sync:.*Requests\/min:/);
  [...w.document.querySelectorAll('.workbook-groups button')].find(b => b.textContent === '+ Add group').click();
  await until(() => $('group-worksheet').value === 'STAGE 1');
  $('group-label').value = 'Stage 1'; $('group-form').dispatchEvent(new w.Event('submit', { cancelable: true }));
  await until(() => !$('group-dialog').open);
  [...w.document.querySelectorAll('.workbook-ranges button')].find(b => b.textContent === '+ Add range').click();
  assert.equal($('connection-dialog').open, true); assert.equal($('connection-type').value, 'google-sheets');
  await until(() => $('sheet-worksheet').value === '1' && !$('load-worksheets').disabled);
  $('sheet-label').value = 'Match status'; $('sheet-range').value = 'A1:B3'; $('range-use-headers').checked = true; $('range-use-headers').dispatchEvent(new w.Event('change'));
  await $('test-sheet').onclick(); assert.equal($('save-sheet').disabled, false, $('sheet-test-status').textContent);
  await $('connection-form').onsubmit(new w.Event('submit', { cancelable: true }));
  assert.equal($('connection-dialog').open, false);
  $('mapping-source').value = [...$('mapping-source').options].find(option => option.value.startsWith('book:')).value;
  $('mapping-source').dispatchEvent(new w.Event('change'));
  await until(() => $('mapping-source-range')?.options.length === 1 && $('source-values').textContent.includes('IN PROGRESS'));
  assert.equal($('mapping-source-group').selectedOptions[0].textContent, 'Stage 1');
  assert.equal($('mapping-source-range').selectedOptions[0].textContent, 'Match status');
  assert.match($('source-values').textContent, /CUSTOM.*A2.*FALSE/);
  assert.match($('source-values').textContent, /STATUS.*B2.*IN PROGRESS/);
  assert.equal(w.document.querySelector('.source-select-trigger .source-sheet-icon') !== null, true);
  w.document.querySelector('.source-select-trigger').click();
  assert.equal(w.document.querySelector('.source-select-options').hidden, false);
  const card = [...$('source-values').querySelectorAll('.source-card')].find(card => card.textContent.includes('STATUS'));
  card.click();
  await until(() => !$('save-mappings').disabled);
  $('save-mappings').click();
  await until(() => $('mapping-status').textContent.includes('Mapping saved'));
  const mapping = playback.sources.document.mappings.find(item => item.stage === 'stage-1' && item.graphic === 'ticker');
  assert.equal(mapping.binding.selection.cell, 'B2');
  assert.equal(playback.snapshot('stage-1', 'program').graphics.length, 0);
  assert.ok(requests.every(request => !request.endsWith('/play') && !request.endsWith('/update')));
});


