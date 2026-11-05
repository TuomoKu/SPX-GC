'use strict';
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const queues = new Map();
// Returned by an update() change to leave the file untouched.
const UNCHANGED = Symbol('config-store.unchanged');
function identity(file) {
  const resolved = path.resolve(file);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}
const backupFile = file => file + '.bak';
function transaction(file, operation) {
  const key = identity(file);
  const job = (queues.get(key) || Promise.resolve()).then(operation);
  const settled = job.catch(() => {});
  queues.set(key, settled);
  settled.then(() => { if (queues.get(key) === settled) queues.delete(key); });
  return job;
}
async function syncDirectory(file) {
  // Windows cannot open a directory handle; NTFS journals the rename itself.
  if (process.platform === 'win32') return;
  try {
    const handle = await fs.open(path.dirname(file), 'r');
    try { await handle.sync(); } finally { await handle.close(); }
  } catch { /* Best effort: the file contents are already flushed. */ }
}
async function writeText(file, text) {
  const temporary = file + '.' + crypto.randomUUID() + '.tmp';
  try {
    // Flush the replacement before rename. Otherwise a power cut can leave the
    // renamed file full of NUL bytes on NTFS.
    const handle = await fs.open(temporary, 'w', 0o600);
    try {
      await handle.writeFile(text);
      await handle.sync();
    } finally { await handle.close(); }
    for (let attempt = 0; ; attempt++) {
      try { await fs.rename(temporary, file); break; }
      catch (error) {
        if (!['EPERM', 'EBUSY'].includes(error.code) || attempt >= 4) throw error;
        await new Promise(resolve => setTimeout(resolve, 15 * 2 ** attempt));
      }
    }
    await syncDirectory(file);
  } finally { await fs.rm(temporary, { force: true }); }
}
// Synchronous variant for startup, before the server accepts requests.
function writeTextSync(file, text) {
  const temporary = file + '.' + crypto.randomUUID() + '.tmp';
  try {
    const descriptor = fsSync.openSync(temporary, 'w', 0o600);
    try {
      fsSync.writeFileSync(descriptor, text);
      fsSync.fsyncSync(descriptor);
    } finally { fsSync.closeSync(descriptor); }
    for (let attempt = 0; ; attempt++) {
      try { fsSync.renameSync(temporary, file); break; }
      catch (error) {
        // Same transient Windows sharing errors as writeText, with a blocking wait.
        if (!['EPERM', 'EBUSY'].includes(error.code) || attempt >= 4) throw error;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 15 * 2 ** attempt);
      }
    }
  } finally { fsSync.rmSync(temporary, { force: true }); }
}
const writeJSON = (file, value) => writeText(file, JSON.stringify(value, null, 2) + '\n');
function parseConfig(text) {
  const value = JSON.parse(text);
  if (!value || typeof value !== 'object' || Array.isArray(value) || !value.general || typeof value.general !== 'object')
    throw new Error('Configuration has no general section');
  return value;
}
// Replace a configuration file, first keeping the current one as <file>.bak
// when it is still a readable configuration.
async function replaceConfig(file, value) {
  try {
    const current = await fs.readFile(file, 'utf8');
    parseConfig(current);
    await writeText(backupFile(file), current);
  } catch { /* Never replace a good backup with a damaged or missing file. */ }
  await writeJSON(file, value);
}
async function update(file, change) {
  return transaction(file, async () => {
    // Read inside the shared queue, rather than enqueueing a stale snapshot.
    const current = JSON.parse(await fs.readFile(file, 'utf8'));
    const replacement = await change(current);
    if (replacement === UNCHANGED) return current;
    const next = replacement === undefined ? current : replacement;
    next.updated = new Date().toISOString();
    await replaceConfig(file, next);
    if (global.configfileref && identity(global.configfileref) === identity(file)) global.config = next;
    return next;
  });
}
// Startup: parse the configuration, falling back to <file>.bak when the main file
// is damaged (for example NUL-filled after a power cut). A recovered file is
// restored from the backup and the damaged copy is kept beside it.
function loadConfigSync(file, log = console.error) {
  const raw = fsSync.readFileSync(file, 'utf8');
  try {
    const config = parseConfig(raw);
    try {
      let saved = null;
      try { saved = fsSync.readFileSync(backupFile(file), 'utf8'); } catch { /* No backup yet. */ }
      if (saved !== raw) writeTextSync(backupFile(file), raw);
    } catch (error) { log('Could not refresh configuration backup ' + backupFile(file) + ': ' + error.message); }
    return { config, recovered: false };
  } catch (problem) {
    let backup;
    try { backup = fsSync.readFileSync(backupFile(file), 'utf8'); parseConfig(backup); }
    catch { throw new Error(`Configuration ${file} is damaged (${problem.message}) and no usable backup exists at ${backupFile(file)}`); }
    const damaged = file + '.damaged-' + new Date().toISOString().replace(/[:.]/g, '-');
    try { fsSync.copyFileSync(file, damaged); } catch { /* Recovery must not depend on the copy. */ }
    writeTextSync(file, backup);
    log([
      '',
      '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
      '!!  CONFIGURATION FILE WAS DAMAGED: ' + file,
      // The parser quotes the bad byte; keep NULs out of the log.
      '!!  ' + problem.message.replace(/[\u0000-\u001f]/g, '?'),
      '!!  Restored the last good configuration from ' + backupFile(file),
      '!!  The damaged file was kept as ' + damaged,
      '!!  Check recent settings changes before going on air.',
      '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
      ''
    ].join('\n'));
    return { config: parseConfig(backup), recovered: true, damaged };
  }
}
module.exports = { transaction, update, writeJSON, writeText, writeTextSync, replaceConfig, loadConfigSync, backupFile, UNCHANGED };
