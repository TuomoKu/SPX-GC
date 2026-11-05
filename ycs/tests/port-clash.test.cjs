'use strict';
// Runs the real server.js against a port that is already taken.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

const project = path.join(__dirname, '../..');
function run(config) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['server.js', config], { cwd: project, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    const timer = setTimeout(() => child.kill('SIGKILL'), 20000);
    child.on('exit', (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, output });
    });
  });
}
async function fixture(t, port, ycsExtra = {}) {
  await fs.mkdir(path.join(project, '.local'), { recursive: true });
  const root = await fs.mkdtemp(path.join(project, '.local', 'port-clash-'));
  t.after(() => fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 }));
  const rundown = path.join(root, 'DATAROOT/Show-1/data');
  await fs.mkdir(rundown, { recursive: true });
  const show = JSON.stringify({ templates: [{ itemID: 'a', onair: 'true', project: 'Show-1' }] }, null, 2);
  await fs.writeFile(path.join(rundown, 'Show.json'), show);
  const graphics = path.join(root, 'graphics');
  await fs.mkdir(graphics);
  const dataFile = path.join(root, 'ycs-data.json');
  await fs.writeFile(dataFile, JSON.stringify({ version: 1, revision: 0, connections: {}, mappings: [] }));
  // A running server's recent state: a copy that restored it would rewrite these.
  const stateFile = path.join(root, 'ycs-data.program-state.json');
  const state = JSON.stringify({ version: 1, pid: 4242, startedAt: Date.now() - 1000, heartbeat: Date.now(), clean: false, stages: {} });
  await fs.writeFile(stateFile, state);
  const config = path.join(root, 'config.json');
  await fs.writeFile(config, JSON.stringify({
    general: { port, langfile: 'english.json', loglevel: 'error', logfolder: path.join(root, 'LOG'), dataroot: path.join(root, 'DATAROOT'), launchBrowser: false, username: '', password: '', hostname: 'PORT-CLASH-TEST' },
    casparchannels: [],
    globalExtras: [],
    ycs: { enabled: true, graphicsRoot: graphics, dataFile, stages: [{ id: 'stage-1', name: 'Stage 1', project: 'Show-1', rundown: 'Show' }], slots: { ticker: { order: 10, exitMs: 250 } }, ...ycsExtra }
  }, null, 2));
  return { config: path.relative(project, config).replace(/\\/g, '/'), rundown: path.join(rundown, 'Show.json'), show, stateFile, state };
}

test('a copy of SPX that finds its port taken exits at once and leaves the running show alone', async (t) => {
  const occupant = net.createServer();
  await new Promise((resolve) => occupant.listen(0, resolve));
  t.after(() => occupant.close());
  const f = await fixture(t, occupant.address().port);
  const started = Date.now();
  const result = await run(f.config);
  assert.equal(result.signal, null, 'it exits by itself: ' + result.output.slice(-600));
  assert.equal(result.code, 3, result.output.slice(-600));
  assert.ok(Date.now() - started < 15000);
  assert.match(result.output, /Could not open port/);
  assert.equal(await fs.readFile(f.stateFile, 'utf8'), f.state, 'the running server\'s program state is untouched');
  assert.equal(await fs.readFile(f.rundown, 'utf8'), f.show, 'the show build is untouched');
});

test('a listen address this PC does not have also exits instead of running without a port', async (t) => {
  const f = await fixture(t, 5999, { listenHost: '203.0.113.7' });
  const result = await run(f.config);
  assert.equal(result.signal, null, 'it exits by itself: ' + result.output.slice(-600));
  assert.equal(result.code, 4, result.output.slice(-600));
  assert.equal(await fs.readFile(f.rundown, 'utf8'), f.show);
});
