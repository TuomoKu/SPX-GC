'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const store = require('../../utils/config-store.cjs');

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'spx-config-transactions-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, 'config.json');
  await fs.writeFile(file, JSON.stringify({ general: { recents: [] }, ycs: { graphicsRoot: 'original' } }));
  return { root, file, read: async () => JSON.parse(await fs.readFile(file, 'utf8')) };
}

test('atomic writes retry transient locks and preserve the original on permanent failure', async t => {
  const r = await fixture(t), originalRename = fs.rename;
  let attempts = 0;
  fs.rename = async (...args) => {
    if (++attempts < 3) throw Object.assign(new Error('File is locked'), { code: 'EPERM' });
    return originalRename(...args);
  };
  try {
    await store.writeJSON(r.file, { saved: true });
    assert.equal(attempts, 3);
    assert.deepEqual(await r.read(), { saved: true });
    fs.rename = async () => { throw Object.assign(new Error('File is locked'), { code: 'EBUSY' }); };
    await assert.rejects(store.writeJSON(r.file, { saved: false }), { code: 'EBUSY' });
    assert.deepEqual(await r.read(), { saved: true });
    assert.deepEqual(await fs.readdir(r.root), ['config.json']);
  } finally {
    fs.rename = originalRename;
  }
});
test('queued configuration patches preserve independent fields and recover after rejected writes', async t => {
  const r = await fixture(t);
  await Promise.all(Array.from({ length: 20 }, (_, index) => store.update(r.file, current => { current.general['setting' + index] = index; })));
  const result = await r.read();
  for (let index = 0; index < 20; index++) assert.equal(result.general['setting' + index], index);
  await assert.rejects(store.update(r.file, current => { current.ycs.graphicsRoot = 'bad'; throw Error('Rejected change'); }), /Rejected/);
  assert.equal((await r.read()).ycs.graphicsRoot, 'original');
  await store.update(r.file, current => { current.ycs.graphicsRoot = 'new'; });
  assert.equal((await r.read()).ycs.graphicsRoot, 'new');
  assert.deepEqual(await fs.readdir(r.root), ['config.json']);
});
test('stock recent-rundown updates use latest configuration rather than overwriting YCS settings', async t => {
  const r = await fixture(t);
  const source = await fs.readFile(path.join(__dirname, '../../utils/spx_server_functions.js'), 'utf8');
  const start = source.indexOf('setRecents: function (rundownRef)');
  const end = source.indexOf('  shortifyName:', start);
  const context = { module: { exports: {} }, configStore: store, configfileref: r.file, logger: { error: message => assert.fail(message) } };
  vm.runInNewContext('module.exports = {' + source.slice(start, end) + '};', context);
  const recent = context.module.exports.setRecents;
  await Promise.all([
    store.update(r.file, current => { current.ycs.graphicsRoot = 'new-graphics'; }),
    recent('Project/Show1'), recent('Project/Show2'), recent('Project/Show1')
  ]);
  const result = await r.read();
  assert.equal(result.ycs.graphicsRoot, 'new-graphics');
  assert.deepEqual(result.general.recents, ['Project/Show1', 'Project/Show2']);
});

test('authentication settings handle rejected configuration writes without an unhandled rejection', async () => {
  const source = await fs.readFile(path.join(__dirname, '../../routes/routes-application.js'), 'utf8');
  const start = source.indexOf("router.post('/saveauthpolicy',");
  const end = source.indexOf('}); // post /saveauthpolicy end', start) + '}); // post /saveauthpolicy end'.length;
  let handler, redirected = false;
  const context = { router: { post(url, callback) { handler = callback; } }, configfileref: 'config.json',
    logger: { debug() {}, error() {} }, configStore: { update: async () => { throw Error('Disk unavailable'); } } };
  context.global = context;
  vm.runInNewContext(source.slice(start, end), context);
  await handler({ body: { policy: '0' } }, { redirect() { redirected = true; } });
  assert.equal(redirected, true);
});
