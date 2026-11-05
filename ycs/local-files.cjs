'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { columnName, usable } = require('./public-sheets.cjs');

const MAX_BYTES = 1048576;
const TABLE_RANGE = 'A1:AF200';
// A file modified more recently than this may still be mid-write by its producer.
const SETTLE_MS = 2000;
function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
// A read that may have seen a partly written file. Callers keep their last valid
// data and retry soon; it is neither a source failure nor new data.
function transient(message) {
  const error = new Error(message);
  error.status = 503;
  error.transient = true;
  throw error;
}
function localFileType(name) {
  if (typeof name !== 'string' || !/^[^<>:"/\\|?*\u0000-\u001f]{1,180}\.(json|csv)$/i.test(name))
    fail('Enter the path to a JSON or CSV file');
  return name.toLowerCase().endsWith('.json') ? 'local-json' : 'local-csv';
}
function relativePath(value, { directory = false } = {}) {
  if (typeof value !== 'string' || value.length > 1024 || (!value && !directory))
    fail('Enter a path within the selected server location');
  const normalized = value.replace(/\\/g, '/');
  if (!normalized && directory) return '';
  const parts = normalized.split('/');
  if (
    parts.some(
      (part) =>
        !part ||
        part === '.' ||
        part === '..' ||
        /[<>:"|?*\u0000-\u001f]/.test(part) ||
        /[. ]$/.test(part) ||
        /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)
    )
  )
    fail(
      'Use a relative path inside the selected server location; parent paths and drive names are not accepted'
    );
  return parts.join('/');
}
function locationId(value = 'default') {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(value))
    fail('Choose a configured server location');
  return value;
}
function filePath(input) {
  if (typeof input !== 'string') fail('Enter the path to a JSON or CSV file');
  let value = input.trim();
  if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
  if (!value || value.length > 4096 || /^[\\/]{2}[?.][\\/]/.test(value))
    fail('Use a regular file path, not a Windows device path');
  if (!path.isAbsolute(value)) return relativePath(value);
  if (
    process.platform === 'win32' &&
    !/^(?:[a-z]:[\\/]|[\\/]{2}[^\\/]+[\\/][^\\/]+[\\/])/i.test(value)
  )
    fail('Use a full drive path or a network share path');
  const root = path.parse(value).root;
  if (/^[\\/]{2}/.test(root)) relativePath(root.replace(/^[\\/]+|[\\/]+$/g, ''));
  relativePath(value.slice(root.length));
  return path.normalize(value);
}
function normalizeLocalSettings(input, type) {
  const file = filePath(input?.file);
  if (localFileType(path.basename(file)) !== type)
    fail('The selected file does not match the source type');
  if (path.isAbsolute(file) && input.location !== undefined)
    fail('A full file path does not need a server location');
  const location = locationId(input.location),
    refreshSeconds = Number(input.refreshSeconds);
  if (!Number.isInteger(refreshSeconds) || refreshSeconds < 5 || refreshSeconds > 3600)
    fail('Refresh interval must be 5–3600 seconds');
  const settings = { file, refreshSeconds, ...(location === 'default' ? {} : { location }) };
  if (type === 'local-csv') {
    const delimiter = input.delimiter ?? ',';
    if (![',', ';', '\t'].includes(delimiter)) fail('Choose a comma, semicolon or tab delimiter');
    Object.assign(settings, { delimiter, range: TABLE_RANGE });
  }
  return settings;
}

// Keep CSV as an addressable grid: headers and record layout belong to mappings.
// Quoted delimiters/newlines and doubled quotes follow CSV escaping rules.
function parseCSV(raw, delimiter = ',') {
  if (![',', ';', '\t'].includes(delimiter)) fail('Unsupported CSV delimiter');
  raw = raw.replace(/^\uFEFF/, '');
  const records = [];
  let row = [],
    value = '',
    quoted = false,
    closed = false,
    atStart = true;
  function cell() {
    if (value.length > 4000) fail('CSV cells must contain at most 4000 characters');
    row.push(value);
    if (row.length > 32) fail('CSV files support at most 32 columns');
    value = '';
    atStart = true;
    closed = false;
  }
  function record() {
    cell();
    records.push(row);
    row = [];
    if (records.length > 200) fail('CSV files support at most 200 rows, including headers');
  }
  for (let index = 0; index < raw.length; index++) {
    const char = raw[index];
    if (quoted) {
      if (char === '"') {
        if (raw[index + 1] === '"') {
          value += '"';
          index++;
        } else {
          quoted = false;
          closed = true;
        }
      } else value += char;
    } else if (char === delimiter) cell();
    else if (char === '\n' || char === '\r') {
      record();
      if (char === '\r' && raw[index + 1] === '\n') index++;
    } else if (char === '"' && atStart) {
      quoted = true;
      atStart = false;
    } else {
      if (closed || char === '"') fail('CSV quoting is invalid');
      value += char;
      atStart = false;
    }
    if (value.length > 4000) fail('CSV cells must contain at most 4000 characters');
  }
  if (quoted) fail('CSV has an unclosed quoted value');
  if (row.length || value || closed || !atStart) record();
  if (!records.length) fail('CSV file is empty');
  const width = Math.max(...records.map((row) => row.length));
  return records.map((row, i) =>
    Array.from({ length: width }, (_, j) => {
      const value = row[j] ?? '';
      return { address: columnName(j + 1) + (i + 1), value, usable: usable(value) };
    })
  );
}

class LocalFiles {
  constructor(
    root,
    { locations = [], timeoutMs = 5000, io = fs, settleMs = SETTLE_MS, now = Date.now } = {}
  ) {
    this.root = path.resolve(root);
    this.io = io;
    this.timeoutMs = timeoutMs;
    this.settleMs = settleMs;
    this.now = now;
    this.jobs = new Map();
    if (!Array.isArray(locations) || locations.length > 20)
      fail('Configure up to 20 additional server data locations');
    this.locations = new Map([
      ['default', { id: 'default', label: 'Local data', path: this.root }]
    ]);
    for (const input of locations) {
      const id = locationId(input?.id);
      if (
        this.locations.has(id) ||
        typeof input.label !== 'string' ||
        !input.label.trim() ||
        input.label.length > 100 ||
        typeof input.path !== 'string' ||
        !path.isAbsolute(input.path) ||
        input.path.length > 2048 ||
        /\u0000/.test(input.path)
      )
        fail('Invalid server data location configuration');
      this.locations.set(id, { id, label: input.label.trim(), path: path.resolve(input.path) });
    }
  }
  describe() {
    return { locations: [...this.locations.values()].map((location) => ({ ...location })) };
  }
  location(id = 'default') {
    const value = this.locations.get(locationId(id));
    if (!value) fail('Unknown server data location');
    return value;
  }
  // OS network operations cannot always be cancelled. Keep one job per target
  // until it settles, even after its response times out, rather than piling up I/O.
  bounded(key, operation, { signal } = {}) {
    signal?.throwIfAborted();
    let job = this.jobs.get(key);
    if (!job) {
      const controller = new AbortController();
      job = {};
      this.jobs.set(key, job);
      const work = Promise.resolve().then(() => operation(controller.signal));
      let timer;
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          const error = new Error('Server file location timed out; check the network connection');
          error.status = 504;
          reject(error);
        }, this.timeoutMs);
        timer.unref?.();
      });
      job.result = Promise.race([work, timeout]);
      const done = () => {
        clearTimeout(timer);
        if (this.jobs.get(key) === job) this.jobs.delete(key);
      };
      work.then(done, done);
    }
    if (!signal) return job.result;
    return new Promise((resolve, reject) => {
      const abort = () => reject(signal.reason || new Error('File request cancelled'));
      signal.addEventListener('abort', abort, { once: true });
      job.result.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
    });
  }
  async directory(location, relative, signal) {
    signal.throwIfAborted();
    if (location.id === 'default' && !location.path.startsWith('\\\\'))
      await this.io.mkdir(location.path, { recursive: true });
    signal.throwIfAborted();
    const root = await this.io.realpath(location.path);
    signal.throwIfAborted();
    let folder = root;
    for (const part of relative ? relative.split('/') : []) {
      signal.throwIfAborted();
      folder = path.join(folder, part);
      const stat = await this.io.lstat(folder);
      signal.throwIfAborted();
      if (!stat.isDirectory() || stat.isSymbolicLink())
        fail('Choose a regular folder inside the selected location');
    }
    const resolved = relative ? await this.io.realpath(folder) : root,
      inside = path.relative(root, resolved);
    if (inside === '..' || inside.startsWith('..' + path.sep) || path.isAbsolute(inside))
      fail('Folder must stay inside the selected location');
    signal.throwIfAborted();
    return { root, folder: resolved };
  }
  // `settle` (background polls) also rejects files modified within settleMs as
  // transient. Explicit tests and saves only reject files that change mid-read.
  async read(input, { signal, type, settle = false } = {}) {
    type ||= localFileType(path.basename(filePath(input?.file)));
    const settings = normalizeLocalSettings(input, type),
      location = path.isAbsolute(settings.file)
        ? { id: 'absolute', path: path.dirname(settings.file) }
        : this.location(settings.location);
    const readSettings = path.isAbsolute(settings.file)
      ? { ...settings, file: path.basename(settings.file) }
      : settings;
    return this.bounded(
      'read:' + (settle ? 'settled:' : '') + location.id + ':' + JSON.stringify(settings),
      async (signal) => ({
        ...(await this.readFile(readSettings, type, location, signal, settle)),
        settings
      }),
      { signal }
    );
  }
  async readFile(settings, type, location, signal, settle = false) {
    let file;
    try {
      const parts = settings.file.split('/'),
        name = parts.pop(),
        { root, folder } = await this.directory(location, parts.join('/'), signal),
        candidate = path.join(folder, name);
      const link = await this.io.lstat(candidate);
      signal.throwIfAborted();
      if (!link.isFile() || link.isSymbolicLink())
        fail('Select a regular data file inside the server location');
      const resolved = await this.io.realpath(candidate),
        inside = path.relative(root, resolved);
      if (
        path.dirname(resolved) !== folder ||
        inside === '..' ||
        inside.startsWith('..' + path.sep) ||
        path.isAbsolute(inside)
      )
        fail('Data file must stay inside the selected location');
      signal.throwIfAborted();
      file = await this.io.open(resolved, 'r');
      signal.throwIfAborted();
      const stat = await file.stat();
      signal.throwIfAborted();
      if (!stat.isFile() || stat.size > MAX_BYTES)
        fail('Local files must be regular files up to 1 MB');
      const bytes = Buffer.alloc(MAX_BYTES + 1);
      let size = 0;
      while (size < bytes.length) {
        signal.throwIfAborted();
        const result = await file.read(bytes, size, bytes.length - size, null);
        if (!result.bytesRead) break;
        size += result.bytesRead;
      }
      signal.throwIfAborted();
      if (size > MAX_BYTES) fail('Local files must be up to 1 MB');
      // Producers that rewrite a file in place can be caught mid-write: a header
      // only, a cut row or a cut cell all parse as valid data. Compare size and
      // modification time around the read and wait for recent writes to settle.
      const after = await file.stat();
      signal.throwIfAborted();
      if (after.size !== stat.size || after.mtimeMs !== stat.mtimeMs || size !== stat.size)
        transient('File changed while it was being read; retaining the last valid data');
      // A file server whose clock runs ahead makes every write look recent; callers
      // stop asking to settle after repeated transient reads (see DataSources).
      if (settle && this.settleMs > 0 && this.now() - after.mtimeMs < this.settleMs)
        transient('File was modified moments ago; waiting for the write to finish');
      let raw;
      try {
        raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, size));
      } catch {
        fail('Save the local file as UTF-8');
      }
      if (type === 'local-json') {
        let data;
        try {
          data = JSON.parse(raw.replace(/^\uFEFF/, ''));
        } catch {
          fail('Local file contains invalid JSON');
        }
        return { settings, data };
      }
      const rows = parseCSV(raw, settings.delimiter);
      return { settings, rows, headerRows: rows.map((_, index) => index + 1) };
    } catch (error) {
      if (error.status || signal.aborted) throw error;
      fail(
        'Server file is unavailable; check its path, network and Windows access permissions',
        422
      );
    } finally {
      await file?.close();
    }
  }
}
module.exports = {
  LocalFiles,
  normalizeLocalSettings,
  parseCSV,
  localFileType,
  MAX_BYTES,
  SETTLE_MS,
  TABLE_RANGE,
  relativePath,
  filePath
};
