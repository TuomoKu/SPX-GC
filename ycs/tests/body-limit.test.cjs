'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const express = require('express');
const bodyParser = require('body-parser');

// server.js is not importable without starting SPX; check its JSON parser
// options, then prove those options accept a largest-case controller Save.
test('the server JSON parser accepts Save/Play bodies with full-length linkable fields', async t => {
  const source = await fs.readFile(path.join(__dirname, '../../server.js'), 'utf8');
  const match = source.match(/app\.use\(bodyParser\.json\((\{[^)]*\})\)\);/);
  assert.ok(match, 'server.js passes options to bodyParser.json');
  const options = Function('return ' + match[1])();
  assert.equal(options.limit, '1mb');
  const app = express();
  app.use(bodyParser.json(options));
  app.post('/save', (req, res) => res.json({ fields: req.body.DataFields.length }));
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  // One 65,536-character field, sent as both the field value and its manual fallback,
  // in three-byte UTF-8 characters: about 400 kB, four times the old 100 kB default.
  const value = '€'.repeat(65536);
  const body = JSON.stringify({ DataFields: [{ field: 'f14', value }], links: { f14: { mode: 'manual', manual: value } } });
  assert.ok(Buffer.byteLength(body) > 100 * 1024);
  const response = await fetch(`http://127.0.0.1:${server.address().port}/save`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  assert.equal(response.status, 200);
});
