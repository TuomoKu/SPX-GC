'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const store = require('../../utils/config-store.cjs');

async function directory(t, prefix) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
test('opening the most recent rundown again does not rewrite the configuration', async t => {
  const root = await directory(t, 'ycs-recents-');
  const file = path.join(root, 'config.json');
  await fs.writeFile(file, JSON.stringify({ general: { recents: ['P/A', 'P/B'] } }));
  const source = await fs.readFile(path.join(__dirname, '../../utils/spx_server_functions.js'), 'utf8');
  const start = source.indexOf('setRecents: function (rundownRef)');
  const end = source.indexOf('  shortifyName:', start);
  let writes = 0;
  const counting = { ...store, update: (target, change) => store.update(target, async current => {
    const result = await change(current);
    if (result !== store.UNCHANGED) writes++;
    return result;
  }) };
  const context = { module: { exports: {} }, configStore: counting, configfileref: file, logger: { error: message => assert.fail(message) } };
  vm.runInNewContext('module.exports = {' + source.slice(start, end) + '};', context);
  const before = await fs.readFile(file, 'utf8');
  await context.module.exports.setRecents('P/A');
  assert.equal(writes, 0);
  assert.equal(await fs.readFile(file, 'utf8'), before);
  assert.equal(fsSync.existsSync(file + '.bak'), false);
  await context.module.exports.setRecents('P/B');
  assert.equal(writes, 1);
  assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')).general.recents, ['P/B', 'P/A']);
});
