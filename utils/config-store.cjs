'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const queues = new Map();
function identity(file) {
  const resolved = path.resolve(file);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}
function transaction(file, operation) {
  const key = identity(file);
  const job = (queues.get(key) || Promise.resolve()).then(operation);
  const settled = job.catch(() => {});
  queues.set(key, settled);
  settled.then(() => { if (queues.get(key) === settled) queues.delete(key); });
  return job;
}
async function writeText(file, text) {
  const temporary = file + '.' + crypto.randomUUID() + '.tmp';
  try {
    await fs.writeFile(temporary, text, { mode: 0o600 });
    for (let attempt = 0; ; attempt++) {
      try { await fs.rename(temporary, file); break; }
      catch (error) {
        if (!['EPERM', 'EBUSY'].includes(error.code) || attempt >= 4) throw error;
        await new Promise(resolve => setTimeout(resolve, 15 * 2 ** attempt));
      }
    }
  } finally { await fs.rm(temporary, { force: true }); }
}
const writeJSON = (file, value) => writeText(file, JSON.stringify(value, null, 2) + '\n');
async function update(file, change) {
  return transaction(file, async () => {
    // Read inside the shared queue, rather than enqueueing a stale snapshot.
    const current = JSON.parse(await fs.readFile(file, 'utf8'));
    const replacement = await change(current);
    const next = replacement === undefined ? current : replacement;
    next.updated = new Date().toISOString();
    await writeJSON(file, next);
    if (global.configfileref && identity(global.configfileref) === identity(file)) global.config = next;
    return next;
  });
}
module.exports = { transaction, update, writeJSON, writeText };
