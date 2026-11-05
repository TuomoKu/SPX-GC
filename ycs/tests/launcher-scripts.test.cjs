'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const folder = path.join(__dirname, '..');
const read = name => fs.readFile(path.join(folder, name), 'utf8');
const scripts = async () => (await fs.readdir(folder)).filter(name => name.endsWith('.ps1'));

test('launcher scripts stay ASCII so Windows PowerShell 5.1 reads them correctly without a BOM', async () => {
  for (const name of await scripts()) assert.doesNotMatch(await read(name), /[^\x00-\x7f]/, name);
});

test('every Invoke-WebRequest uses -UseBasicParsing for Windows PowerShell 5.1', async () => {
  for (const name of await scripts())
    for (const line of (await read(name)).split('\n').filter(line => line.includes('Invoke-WebRequest')))
      assert.match(line, /-UseBasicParsing/, name + ': ' + line.trim());
});

test('runtime readiness probes the configured listenHost, not a fixed 127.0.0.1', async () => {
  const start = await read('start-runtime.ps1');
  assert.match(start, /\$configuration\.ycs\.listenHost/);
  assert.match(start, /'0\.0\.0\.0'/);
  for (const line of start.split('\n').filter(line => line.includes('Invoke-WebRequest')))
    assert.doesNotMatch(line, /127\.0\.0\.1/, line.trim());
  assert.match(start, /'-BaseUrl', \(& \$quote \$baseUrl\)/, 'the window receives the probed address');
  assert.match(await read('runtime-window.ps1'), /url=\$BaseUrl/, 'the runtime record keeps the probed address for launch.ps1');
  assert.doesNotMatch(await read('launch.ps1'), /'http:\/\/127\.0\.0\.1:' \+ \[int\]\$configuration/);
});

test('stop waits for the process to exit and the window sets UV_THREADPOOL_SIZE for the server', async () => {
  assert.match(await read('stop-runtime.ps1'), /Wait-Process -Id \$runtimeProcess\.Id -Timeout 10/);
  const window = await read('runtime-window.ps1');
  assert.match(window, /\$env:UV_THREADPOOL_SIZE = '16'/);
  assert.ok(window.indexOf("$env:UV_THREADPOOL_SIZE = '16'") < window.indexOf('Start-Process -FilePath $NodeExecutable'));
});

test('SPX runs in a visible window that shares its console but never writes to it', async () => {
  const start = await read('start-runtime.ps1');
  assert.match(start, /Start-Process -FilePath 'powershell\.exe' -ArgumentList \$windowArguments [^\n]*-WindowStyle Normal/);
  assert.doesNotMatch(start, /-WindowStyle Hidden/);
  const window = await read('runtime-window.ps1');
  // Sharing the console is what stops SPX when the window closes. Writing to files keeps
  // a text selection in that console, which pauses console writes, away from the server.
  const launch = window.split('\n').find(line => line.includes('Start-Process -FilePath $NodeExecutable'));
  assert.match(launch, /-NoNewWindow/);
  assert.match(launch, /-RedirectStandardOutput \$Stdout -RedirectStandardError \$Stderr/);
  assert.match(window, /id=\$node\.Id;/, 'the runtime record names Node, which Settings and stop-runtime act on');
});

test('the stock welcome splash stays removed', async () => {
  await assert.rejects(fs.stat(path.join(folder, '../ASSETS/plugins/welcomeOverlay')), { code: 'ENOENT' });
});

test('without -Config the launchers default to the configuration launched last', async () => {
  for (const name of ['launch.ps1', 'start-runtime.ps1'])
    assert.match((await read(name)).split('\n')[0], /\[string\]\$Config = ''/, name);
  assert.match(await read('start-runtime.ps1'), /\$lastConfiguration -and .*\(Test-Path -LiteralPath \$lastConfiguration -PathType Leaf\) -or \(Test-Path -LiteralPath \(\$lastConfiguration \+ '\.bak'\)/);
});

test('launcher scripts survive an unreadable runtime record and a record naming another folder', async () => {
  const start = await read('start-runtime.ps1');
  assert.match(start, /try \{ \$record = Get-Content[^\n]*ConvertFrom-Json \}\s+catch \{ Write-Warning/);
  assert.match(start, /if \(\$record -and \$record\.id\)/);
  assert.match(start, /\$lastConfiguration\.StartsWith\(\$projectRoot/);
  assert.match(await read('stop-runtime.ps1'), /catch \{ throw "Could not read \$recordFile/);
});

test('every deliberate stop records its marker, including when the process already exited', async () => {
  const stop = await read('stop-runtime.ps1');
  assert.match(stop, /if \(-not \$runtimeProcess\) \{ \$null = Write-StopMarker;/);
  assert.match(await read('stop-dev.ps1'), /runtime-stopped\.json/);
});

test('launcher scripts parse in PowerShell when pwsh is available', async t => {
  const pwsh = spawnSync('pwsh', ['-NoProfile', '-Command', 'exit 0']);
  if (pwsh.error) { t.skip('pwsh is not installed'); return; }
  for (const name of await scripts()) {
    const command = `$t=$null;$e=$null;$null=[System.Management.Automation.Language.Parser]::ParseFile('${path.join(folder, name)}',[ref]$t,[ref]$e);if($e.Count){$e|ForEach-Object{$_.Message};exit 1}`;
    const result = spawnSync('pwsh', ['-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8' });
    assert.equal(result.status, 0, name + ': ' + result.stdout + result.stderr);
  }
});
