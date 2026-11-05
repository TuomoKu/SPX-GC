'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const directory = path.join(__dirname, 'tests');
const files = fs.readdirSync(directory)
  .filter(file => file.endsWith('.test.cjs'))
  .sort()
  .map(file => path.join(directory, file));
// Enumerate files ourselves: Node 20 does not expand test globs on Windows.
const flags = Number(process.versions.node.split('.')[0]) === 20
  ? ['--experimental-websocket'] : [];
const result = spawnSync(process.execPath, [...flags, '--test', ...process.argv.slice(2), ...files], {
  stdio: 'inherit', windowsHide: true
});
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
