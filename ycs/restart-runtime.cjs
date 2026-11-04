'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const [pid, ticks, requestId] = process.argv.slice(2);
if (!/^\d+$/.test(pid || '') || !/^\d+$/.test(ticks || '') || !/^[a-f0-9-]{36}$/.test(requestId || '')) process.exit(1);
const root = path.resolve(__dirname, '..');
function failed() {
  try { fs.writeFileSync(path.join(root, '.local/restart-status.json'), JSON.stringify({
    requestId, state: 'failed', message: 'Restart failed. Use the SPX launcher and check .local/runtime-logs on the server.'
  })); } catch { /* The parent also observes this helper exiting. */ }
  process.exitCode = 1;
}
let permitted = false;
const deadline = setTimeout(() => { failed(); process.disconnect?.(); }, 10000);
process.on('message', message => {
  if (permitted || message?.type !== 'proceed' || message.requestId !== requestId) return;
  permitted = true;
  clearTimeout(deadline);
  const child = spawn('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden',
    '-File', path.join(__dirname, 'restart-runtime.ps1'),
    '-ExpectedProcessId', pid, '-ExpectedStartTicks', ticks, '-RequestId', requestId
  ], { cwd: root, windowsHide: true, stdio: 'inherit' });
  child.on('error', failed);
  child.on('exit', code => { if (code !== 0) failed(); });
  process.disconnect();
});
process.on('disconnect', () => {
  if (!permitted) { clearTimeout(deadline); failed(); }
});
if (!process.send) { clearTimeout(deadline); failed(); }
else process.send({ type: 'ready', requestId });
