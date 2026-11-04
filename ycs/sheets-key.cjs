'use strict';
const fs = require('node:fs');
const crypto = require('node:crypto');
function credentialFile(configFile) { return configFile + '.sheets-key.json'; }
function inspectKey(file) {
  if (!file) return { key: '', fingerprint: '', present: false, raw: null, error: '' };
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return inspectKey();
    return { key: '', fingerprint: `unreadable:${error.code}`, present: true, raw: null, error: 'Saved Google API key cannot be read. Check file access on the SPX computer.' };
  }
  const fingerprint = crypto.createHash('sha256').update(raw).digest('hex');
  try {
    const data = JSON.parse(raw);
    if (typeof data.key !== 'string' || data.key.length > 256 || /\s/.test(data.key)) throw new Error();
    return { key: data.key, fingerprint, present: Boolean(data.key), raw, error: '' };
  } catch {
    return { key: '', fingerprint, present: true, raw, error: 'Saved Google API key is invalid. Replace or remove it in YCS SPX Settings.' };
  }
}
function readKey(file) {
  const result = inspectKey(file);
  if (result.error) {
    const invalid = new Error(result.error);
    invalid.status = 422;
    throw invalid;
  }
  return result.key;
}
module.exports = { credentialFile, readKey, inspectKey };
