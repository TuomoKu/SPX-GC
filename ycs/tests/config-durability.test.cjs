'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const store = require('../../utils/config-store.cjs');
const { DataSources } = require('../data.cjs');
const { fixture } = require('./playback.test.cjs');

async function directory(t, prefix) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
// Records the order of open/write/sync/rename calls on fs.promises.
function traceWrites(t) {
  const events = [];
  const open = fs.open, rename = fs.rename;
  fs.open = async (...args) => {
    const handle = await open(...args);
    const name = path.basename(String(args[0]));
    const sync = handle.sync.bind(handle);
    handle.sync = () => { events.push('sync ' + name); return sync(); };
    return handle;
  };
  fs.rename = async (from, to) => { events.push('rename ' + path.basename(String(from)) + ' -> ' + path.basename(String(to))); return rename(from, to); };
  t.after(() => { fs.open = open; fs.rename = rename; });
  return events;
}

test('configuration writes flush the replacement file before renaming it', async t => {
  const root = await directory(t, 'ycs-fsync-');
  const file = path.join(root, 'config.json');
  await fs.writeFile(file, JSON.stringify({ general: { port: 1 } }));
  const events = traceWrites(t);
  await store.update(file, current => { current.general.port = 2; });
  const renames = events.filter(event => event.startsWith('rename') && event.endsWith('-> config.json'));
  assert.equal(renames.length, 1);
  const temporary = renames[0].split(' ')[1];
  assert.ok(events.indexOf('sync ' + temporary) >= 0, 'temporary file was flushed');
  assert.ok(events.indexOf('sync ' + temporary) < events.indexOf(renames[0]), 'flush happens before rename');
  assert.equal(JSON.parse(await fs.readFile(file, 'utf8')).general.port, 2);
});

test('data-file saves also flush before rename', async t => {
  const f = await fixture(t);
  const sources = new DataSources(path.join(f.root, 'sources.json'), f.stages);
  t.after(() => sources.close());
  await sources.ready;
  const events = traceWrites(t);
  await sources.updateSource('test.stage-1.currentRound', 'ROUND 2', sources.snapshot().revision);
  const rename = events.find(event => event.startsWith('rename') && event.endsWith('-> sources.json'));
  assert.ok(rename);
  const flushed = events.indexOf('sync ' + rename.split(' ')[1]);
  assert.ok(flushed >= 0 && flushed < events.indexOf(rename), 'data file flushed before rename');
});

test('each configuration update keeps the previous good file as .bak', async t => {
  const root = await directory(t, 'ycs-backup-');
  const file = path.join(root, 'config.json');
  await fs.writeFile(file, JSON.stringify({ general: { port: 1 } }));
  await store.update(file, current => { current.general.port = 2; });
  assert.equal(JSON.parse(await fs.readFile(file + '.bak', 'utf8')).general.port, 1);
  await store.update(file, current => { current.general.port = 3; });
  assert.equal(JSON.parse(await fs.readFile(file + '.bak', 'utf8')).general.port, 2);
  // A damaged main file never replaces a good backup.
  await fs.writeFile(file, '\0'.repeat(64));
  await assert.rejects(store.update(file, current => { current.general.port = 4; }));
  await store.replaceConfig(file, { general: { port: 5 } });
  assert.equal(JSON.parse(await fs.readFile(file + '.bak', 'utf8')).general.port, 2);
});

test('startup recovers a NUL-filled configuration from .bak and keeps the damaged copy', async t => {
  const root = await directory(t, 'ycs-recover-');
  const file = path.join(root, 'config.json');
  await fs.writeFile(file, JSON.stringify({ general: { port: 5791 }, ycs: { enabled: true } }));
  const logs = [];
  // A good startup refreshes the backup.
  assert.equal(store.loadConfigSync(file, message => logs.push(message)).recovered, false);
  assert.equal(JSON.parse(await fs.readFile(file + '.bak', 'utf8')).general.port, 5791);
  await fs.writeFile(file, Buffer.alloc(4096));
  const result = store.loadConfigSync(file, message => logs.push(message));
  assert.equal(result.recovered, true);
  assert.equal(result.config.general.port, 5791);
  assert.match(logs.join('\n'), /CONFIGURATION FILE WAS DAMAGED/);
  assert.equal(JSON.parse(await fs.readFile(file, 'utf8')).general.port, 5791, 'main file restored for later writes');
  assert.deepEqual(await fs.readFile(result.damaged), Buffer.alloc(4096));
  // Without a usable backup startup still fails, naming both files.
  await fs.writeFile(file, '');
  await fs.writeFile(file + '.bak', '{');
  assert.throws(() => store.loadConfigSync(file, () => {}), /damaged.*no usable backup/);
});

test('SPX startup config loading uses the backup instead of exiting', async t => {
  const root = await directory(t, 'ycs-getconf-');
  await fs.writeFile(path.join(root, 'cfg.json'), JSON.stringify({ general: { port: 5792, logfolder: root + '/LOG/' } }));
  await fs.writeFile(path.join(root, 'cfg.json.bak'), JSON.stringify({ general: { port: 5793, logfolder: root + '/LOG/' } }));
  await fs.writeFile(path.join(root, 'cfg.json'), Buffer.alloc(512));
  const loader = path.resolve(__dirname, '../../utils/spx_getconf.js');
  const output = execFileSync(process.execPath, ['-e',
    `require(${JSON.stringify(loader)}).readConfig().then(() => console.log('PORT=' + global.config.general.port + ' REF=' + Boolean(global.configfileref)))`,
    // With -e, argv[1] is the first extra argument; SPX reads its config from argv[2].
    'spx', 'cfg.json'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  assert.match(output, /PORT=5793 REF=true/);
});

test('startup restore retries a transient Windows sharing error on rename', async t => {
  const root = await directory(t, 'ycs-recover-retry-');
  const file = path.join(root, 'config.json');
  await fs.writeFile(file + '.bak', JSON.stringify({ general: { port: 5794 } }));
  await fs.writeFile(file, '');
  const fsSync = require('node:fs');
  const rename = fsSync.renameSync;
  let failures = 2;
  fsSync.renameSync = (...args) => {
    if (failures-- > 0) throw Object.assign(new Error('busy'), { code: 'EBUSY' });
    return rename(...args);
  };
  t.after(() => { fsSync.renameSync = rename; });
  assert.equal(store.loadConfigSync(file, () => {}).config.general.port, 5794);
  assert.equal(JSON.parse(await fs.readFile(file, 'utf8')).general.port, 5794);
  assert.deepEqual((await fs.readdir(root)).filter(name => name.endsWith('.tmp')), []);
});
