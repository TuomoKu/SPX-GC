'use strict';
const fs = require('node:fs');
function credentialFile(configFile) { return configFile + '.sheets-key.json'; }
function readKey(file) {
  if (!file) return '';
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (typeof data.key !== 'string' || data.key.length > 256 || /\s/.test(data.key)) throw new Error();
    return data.key;
  } catch (error) {
    if (error.code === 'ENOENT') return '';
    const invalid = new Error('The saved Google API key file is invalid; check it on the SPX computer.');
    invalid.status = 422;
    throw invalid;
  }
}
module.exports = { credentialFile, readKey };
