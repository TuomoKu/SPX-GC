'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const Handlebars = require('handlebars');

// Runs the stock /CCG/system/:data handler with a fake router, logger and process.
async function systemRoute(config) {
  const source = await fs.readFile(path.join(__dirname, '../../routes/routes-casparcg.js'), 'utf8');
  const start = source.indexOf('const RESTART_REFUSED');
  const end = source.indexOf("router.get('/control/:data'", start);
  assert.ok(start >= 0 && end > start);
  let handler;
  const exits = [], logs = [];
  const context = {
    router: { get(url, callback) { handler = callback; } },
    logger: { verbose() {}, warn: message => logs.push(message), error: message => logs.push(message) },
    process: { exit: code => exits.push(code) },
    config, JSON, require
  };
  context.global = context;
  vm.runInNewContext(source.slice(start, end), context);
  return async command => {
    const response = { statusCode: 200, body: '', status(code) { this.statusCode = code; return this; },
      type() { return this; }, send(body) { this.body = body; return this; }, sendStatus(code) { this.statusCode = code; return this; } };
    handler({ params: { data: JSON.stringify({ command }) } }, response);
    return { response, exits, logs };
  };
}

test('RESTARTSERVER is refused with a clear message when YCS is enabled', async () => {
  const run = await systemRoute({ general: {}, ycs: { enabled: true } });
  const { response, exits, logs } = await run('RESTARTSERVER');
  assert.equal(response.statusCode, 409);
  assert.match(response.body, /YCS launcher.*\/ycs\/settings.*Restart server/);
  assert.deepEqual(exits, [], 'the server keeps running');
  assert.match(logs.join('\n'), /Refused RESTARTSERVER/);
});

test('stock RESTARTSERVER still exits for a process manager when YCS is off', async () => {
  for (const config of [{ general: {} }, { general: {}, ycs: { enabled: false } }]) {
    const run = await systemRoute(config);
    const { response, exits } = await run('RESTARTSERVER');
    assert.equal(response.statusCode, 200);
    assert.deepEqual(exits, [2]);
  }
});

test('the header menu replaces Kill with the YCS settings restart only when YCS is enabled', async () => {
  const template = await fs.readFile(path.join(__dirname, '../../views/partials/header.handlebars'), 'utf8');
  const instance = Handlebars.create();
  for (const helper of ['lang', 'prettyfyBreadcrumb', 'ServerStatus', 'GenerateOpenFolderCommands', 'DetectCustomContentPackages'])
    instance.registerHelper(helper, () => '');
  instance.registerHelper('ifValue', function (left, right, options) { return left === right ? options.fn(this) : options.inverse(this); });
  const render = instance.compile(template);
  const stock = render({ user: 'default', config: {} });
  assert.match(stock, /spx_system\('restartServer'\)/);
  assert.doesNotMatch(stock, /href="\/ycs\/settings"/i);
  const ycs = render({ user: 'default', config: {}, ycsEnabled: true });
  assert.doesNotMatch(ycs, /restartServer/);
  assert.match(ycs, /HREF="\/ycs\/settings"[^>]*>.*Restart SPX-server/);
});
