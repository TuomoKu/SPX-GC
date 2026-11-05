'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { PublicSheets, normalizeSettings, endpoint, parseRange, parseResponse } = require('../public-sheets.cjs');
const { DataSources } = require('../data.cjs');
const { fixture } = require('./playback.test.cjs');
const settings = { url: 'https://docs.google.com/spreadsheets/d/1PUBLIC_SHEET_TEST_1234567890/edit?gid=467889934#gid=12', worksheet: '', range: 'A1:D4', refreshSeconds: 5, cell: 'A2' };
const wrapped = cells => `/*O_o*/\nycsSheet(${JSON.stringify({ status: 'ok', table: { cols: cells[0].map(() => ({})), rows: cells.map(c => ({ c })) } })});`;
const response = body => new Response(body, { headers: { 'Content-Type': 'application/javascript' } });

test('public sheet URLs, tab selection and bounded cell ranges are normalized without accepting arbitrary hosts', () => {
  const input = normalizeSettings(settings);
  assert.equal(input.worksheet, '467889934');
  assert.equal(input.cell, 'A2');
  const url = endpoint(input, input.cell);
  assert.equal(url.hostname, 'docs.google.com'); assert.equal(url.searchParams.get('range'), 'A2');
  assert.equal(url.searchParams.get('gid'), '467889934'); assert.equal(url.searchParams.get('headers'), '0');
  assert.equal(normalizeSettings({ ...settings, worksheet: 'Stage Info' }).worksheet, 'Stage Info');
  assert.equal(normalizeSettings({ ...settings, url: settings.url.split('?')[0] + '#gid=99' }).worksheet, '99');
  assert.equal(parseRange('$b$2:$c$4').a1, 'B2:C4');
  for (const url of ['http://docs.google.com/spreadsheets/d/1PUBLIC_SHEET_TEST_1234567890', 'https://evil.example/spreadsheets/d/1PUBLIC_SHEET_TEST_1234567890', 'https://docs.google.com@localhost/private', 'https://docs.google.com/spreadsheets/d/e/2PUBLIC/pubhtml', 'https://user:pass@docs.google.com/spreadsheets/d/1PUBLIC_SHEET_TEST_1234567890']) assert.throws(() => normalizeSettings({ ...settings, url }));
  for (const range of ['A1:Z999', 'A:A', 'Sheet1!A1', 'A0', 'B2:A1']) assert.throws(() => normalizeSettings({ ...settings, range }));
  for (const refreshSeconds of [0, 1, 4, 3601, NaN]) assert.throws(() => normalizeSettings({ ...settings, refreshSeconds }));
  assert.throws(() => normalizeSettings({ ...settings, cell: 'E2' }));
});

test('Google callback data is parsed as JSON with formatted values and safe, addressable empty cells', async () => {
  const rows = parseResponse(wrapped([[{ v: 'Round' }, { v: 1119, f: '1,119' }], [null, { v: false }]]), 'B2:C4');
  assert.deepEqual(rows[0][1], { address: 'C2', value: '1,119', usable: true });
  assert.deepEqual(rows[1][0], { address: 'B3', value: '', usable: false });
  assert.equal(rows[1][1].value, 'FALSE'); assert.equal(rows[2][0].usable, false);
  for (const raw of ['<html>sign in</html>', 'ycsSheet({"status":"error"});', 'evil({});', 'ycsSheet({});process.exit();', 'ycsSheet({"status":"ok","table":{"cols":[],"rows":[]}});extra()']) assert.throws(() => parseResponse(raw, 'A1'));
  const sheet = new PublicSheets(async (url, options) => {
    assert.equal(options.redirect, 'manual'); assert.equal(options.credentials, 'omit');
    assert.equal(url.searchParams.get('range'), 'A2');
    return response(wrapped([[{ v: '<script>literal text</script>' }]]));
  });
  assert.equal((await sheet.read(settings, { singleCell: true })).value, '<script>literal text</script>');
});

test('empty, oversized, malformed, private and redirected sheet responses fail without returning a blank value', async () => {
  const bodies = [response(wrapped([[null]])), response(wrapped([[{ v: 'x'.repeat(301) }]])), response('bad data'), new Response('private', { status: 403 }), new Response(null, { status: 302, headers: { Location: 'https://accounts.google.com' } }), new Response('<html>login</html>', { headers: { 'Content-Type': 'text/html' } }), response('x'.repeat(262145))];
  for (const body of bodies) await assert.rejects(new PublicSheets(async () => body).read(settings, { singleCell: true }));
  await assert.rejects(new PublicSheets(async () => { throw new Error('Offline'); }).read(settings), /Could not reach Google Sheets/);
});

async function sourcesFixture(t) {
  const base = await fixture(t); let value = 'ROUND FROM SHEET', failed = false, calls = 0, clock = 1000;
  const sheets = { read: async (input, options) => {
    calls++; if (failed) throw new Error('Test sheet offline');
    return options?.singleCell ? { value } : { settings: normalizeSettings(input), rows: [[{ address: 'A2', value, usable: true }]] };
  } };
  const sources = new DataSources(path.join(base.root, 'sources.json'), base.stages, { sheets, now: () => clock });
  await sources.ready; base.playback.sources = sources; t.after(() => sources.close());
  sources.on('change', () => { for (const stage of base.stages) base.playback.refreshLinks(stage.id); });
  return { ...base, sources, sheets, setValue: next => { value = next; }, offline: () => { failed = true; }, online: () => { failed = false; }, advance: ms => { clock += ms; }, calls: () => calls };
}

test('testing a connection changes no configuration; a saved source is read-only and mapping stays pending until Update', async t => {
  const { playback, sources, setValue } = await sourcesFixture(t);
  await playback.command('stage-1', 'ticker', 'play');
  const before = sources.snapshot().revision;
  await sources.testSheet(settings); assert.equal(sources.snapshot().revision, before);
  const added = await sources.addSheet('Public round', settings, before);
  assert.equal(added.snapshot.sources[added.sourceId].value, 'ROUND FROM SHEET');
  assert.equal(added.snapshot.sources[added.sourceId].health, 'ok');
  await sources.updateMapping({ stage: 'stage-1', graphic: 'ticker', field: 'f5', source: added.sourceId }, sources.snapshot().revision);
  const options = { links: { f5: { mode: 'linked', manual: 'MY MANUAL TEXT' } } };
  await playback.command('stage-1', 'ticker', 'preview', undefined, options);
  assert.equal(playback.snapshot('stage-1', 'program').graphics[0].data.f5, 'STAGE 1 ROUND');
  assert.equal(playback.snapshot('stage-1', 'preview').graphics[0].data.f5, 'ROUND FROM SHEET');
  await playback.command('stage-1', 'ticker', 'update', undefined, options);
  setValue('ROUND TWO'); const revision = sources.snapshot().revision;
  await sources.refreshSheet(added.sourceId); await playback.refreshLinks('stage-1');
  assert.equal(playback.snapshot('stage-1', 'program').graphics[0].data.f5, 'ROUND TWO');
  assert.equal(sources.snapshot().revision, revision, 'polling must not invalidate an editor configuration revision');
  await assert.rejects(sources.updateSource(added.sourceId, 'WRITE TO SHEET', revision), { status: 422 });
  await playback.command('stage-1', 'ticker', 'preview', [{ field: 'f5', value: 'MANUAL OVERRIDE' }], { links: { f5: { mode: 'manual', manual: 'MANUAL OVERRIDE' } } });
  setValue('ROUND THREE'); await sources.refreshSheet(added.sourceId); await playback.refreshLinks('stage-1');
  assert.equal(playback.snapshot('stage-1', 'program').graphics[0].data.f5, 'ROUND THREE');
  assert.equal(playback.snapshot('stage-1', 'preview').graphics[0].data.f5, 'MANUAL OVERRIDE');
});

test('automatic polling respects interval/backoff and last-good cache survives restart and failures', async t => {
  const r = await sourcesFixture(t), added = await r.sources.addSheet('Public round', settings, r.sources.snapshot().revision);
  const calls = r.calls(); await r.sources.pollSheets(); assert.equal(r.calls(), calls);
  r.advance(5000); r.setValue('LATEST GOOD'); await r.sources.pollSheets();
  assert.equal(r.sources.value(added.sourceId), 'LATEST GOOD');
  r.offline(); r.advance(5000); await r.sources.pollSheets();
  assert.equal(r.sources.snapshot().sources[added.sourceId].health, 'error');
  assert.equal(r.sources.value(added.sourceId), 'LATEST GOOD');
  const failedCalls = r.calls(); r.advance(4999); await r.sources.pollSheets(); assert.equal(r.calls(), failedCalls);
  r.advance(1); await r.sources.pollSheets();
  const delayed = r.sources.snapshot().sources[added.sourceId];
  assert.equal(Date.parse(delayed.nextRefresh) - Date.parse(delayed.lastAttempt), 10000);
  await r.sources.flushCache(); // background cache writes are throttled
  const restarted = new DataSources(r.sources.file, r.stages, { sheets: r.sheets }); t.after(() => restarted.close()); await restarted.ready;
  assert.equal(restarted.value(added.sourceId), 'LATEST GOOD');
  await restarted.refreshSheet(added.sourceId); assert.equal(restarted.value(added.sourceId), 'LATEST GOOD');
  assert.equal(restarted.snapshot().sources[added.sourceId].health, 'error');
  r.online(); r.setValue('RECOVERED'); await r.sources.refreshSheet(added.sourceId);
  assert.equal(r.sources.snapshot().sources[added.sourceId].health, 'ok');
  assert.equal(r.sources.value(added.sourceId), 'RECOVERED');
});

test('concurrent refreshes are coalesced and stale source-manager saves are rejected', async t => {
  const r = await sourcesFixture(t), added = await r.sources.addSheet('Public round', settings, r.sources.snapshot().revision);
  let release, reads = 0;
  r.sources.sheets = { read: async () => { reads++; await new Promise(resolve => { release = resolve; }); return { rows: [[{ address: 'A2', value: 'ONE REQUEST', usable: true }]] }; } };
  const a = r.sources.refreshSheet(added.sourceId), b = r.sources.refreshSheet(added.sourceId);
  await new Promise(resolve => setImmediate(resolve)); assert.equal(reads, 1); release(); await Promise.all([a, b]);
  assert.equal(r.sources.value(added.sourceId), 'ONE REQUEST');
  r.sources.sheets = r.sheets;
  await assert.rejects(r.sources.addSheet('Stale', settings, 0), { status: 409 });
  const raw = JSON.parse(await fs.readFile(r.sources.file, 'utf8'));
  raw.sources[added.sourceId].binding.selection.cell = 'A3'; raw.revision++;
  await fs.writeFile(r.sources.file, JSON.stringify(raw)); await r.sources.refresh();
  assert.equal(r.sources.value(added.sourceId), undefined, 'a changed cell must not reuse another cell’s cache');
});
