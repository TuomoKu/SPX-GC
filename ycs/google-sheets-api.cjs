'use strict';
const { PublicSheets, normalizeSettings, parseRange, columnName, usable } = require('./public-sheets.cjs');
const { readKey } = require('./sheets-key.cjs');

function fail(message, status = 502) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function cells(values = [], range) {
  const bounds = parseRange(range);
  const width = bounds.lastColumn - bounds.firstColumn + 1;
  const height = bounds.lastRow - bounds.firstRow + 1;
  if (!Array.isArray(values) || values.length > height || values.some(row => !Array.isArray(row) || row.length > width))
    fail('Google returned invalid range data');
  return Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, column) => {
    const raw = values[row]?.[column];
    if (raw != null && !['string', 'number', 'boolean'].includes(typeof raw)) fail('Google returned an invalid cell');
    const value = raw == null ? '' : typeof raw === 'boolean' ? (raw ? 'TRUE' : 'FALSE') : String(raw);
    return { address: columnName(bounds.firstColumn + column) + (bounds.firstRow + row), value: value.slice(0, 4001), usable: usable(value) };
  }));
}

// Same read contract as PublicSheets. No connection IDs, selectors or mappings change.
class GoogleSheetsAPI {
  constructor({ key, fetcher = fetch, now = Date.now } = {}) {
    if (typeof key !== 'string' || !key.trim() || /[\r\n]/.test(key))
      fail('Set the Google Sheets API key in the configured server environment variable before enabling sheetsAPI', 422);
    Object.assign(this, { key: key.trim(), fetcher, now });
    this.batchSize = 32;
    this.metadata = new Map();
    this.pending = new Map();
    this.active = 0;
    this.waiters = [];
  }

  async request(id, suffix, parameters) {
    // Bound outbound work even when many workbooks are due in the same poll.
    if (this.active >= 4) await new Promise(resolve => this.waiters.push(resolve));
    else this.active++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    timer.unref?.();
    try {
      const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${id}${suffix}`);
      for (const [name, value] of parameters) url.searchParams.append(name, value);
      const response = await this.fetcher(url, {
        signal: controller.signal, redirect: 'manual', credentials: 'omit', referrerPolicy: 'no-referrer',
        headers: { Accept: 'application/json', 'X-Goog-Api-Key': this.key }
      });
      // Never expose upstream error bodies, which may contain credentials or sheet data.
      if (response.status === 429) fail('Google Sheets quota reached; retaining last valid data and retrying with backoff');
      if ([401, 403].includes(response.status)) fail('Google Sheets API access denied; check the server API key, enabled API and public sharing');
      if (response.status === 404) fail('Google spreadsheet not found or not publicly shared');
      if (!response.ok || response.status !== 200) {
        if (response.status === 400) this.metadata.delete(id);
        fail('Google Sheets API could not read the requested worksheet/range');
      }
      if (!/^application\/json\b/i.test(response.headers.get('content-type') || '')) fail('Google Sheets API returned an invalid response');
      const limit = 8388608;
      if (Number(response.headers.get('content-length')) > limit || !response.body) fail('Google Sheets API response is too large or empty');
      const reader = response.body.getReader();
      let raw = '', size = 0;
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > limit) fail('Google Sheets API response exceeds 8 MB; use smaller ranges');
          raw += decoder.decode(value, { stream: true });
        }
      } catch (error) { await reader.cancel().catch(() => {}); throw error; }
      try { return JSON.parse(raw + decoder.decode()); }
      catch { fail('Google Sheets API returned invalid JSON'); }
    } catch (error) {
      if (error.status) throw error;
      fail(controller.signal.aborted ? 'Google Sheets API request timed out; retaining last valid data' : 'Could not reach Google Sheets API; retaining last valid data');
    } finally {
      clearTimeout(timer);
      const next = this.waiters.shift();
      if (next) next();
      else this.active--;
    }
  }

  async tabs(id, force = false) {
    const cached = this.metadata.get(id);
    if (cached && (cached.pending || (!force && cached.expires > this.now()))) return cached.promise;
    const entry = { pending: true, expires: 0 };
    entry.promise = this.request(id, '', [['fields', 'sheets(properties(sheetId,title))']]).then(result => {
      if (!Array.isArray(result.sheets) || !result.sheets.length || result.sheets.length > 200)
        fail('Google returned an invalid worksheet list');
      const tabs = result.sheets.map(({ properties } = {}) => {
        if (!Number.isInteger(properties?.sheetId) || typeof properties.title !== 'string' || !properties.title)
          fail('Google returned an invalid worksheet');
        return { id: String(properties.sheetId), name: properties.title };
      });
      entry.pending = false;
      entry.expires = this.now() + 300000;
      return tabs;
    }).catch(error => { if (this.metadata.get(id) === entry) this.metadata.delete(id); throw error; });
    // Limit retained metadata, without evicting requests still in flight.
    for (const [key, value] of this.metadata) {
      if (this.metadata.size < 100) break;
      if (!value.pending) this.metadata.delete(key);
    }
    this.metadata.set(id, entry);
    return entry.promise;
  }

  async worksheets(input, { signal } = {}) {
    const settings = normalizeSettings({ url: input?.url, range: 'A1', refreshSeconds: 5 });
    signal?.throwIfAborted();
    const worksheets = await this.tabs(settings.url.split('/')[5], true);
    signal?.throwIfAborted();
    return { worksheets, selected: settings.worksheet };
  }

  queue(id, range, signal) {
    signal?.throwIfAborted();
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error, value) => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener('abort', abort);
        if (error) reject(error); else resolve(value);
      };
      const abort = () => finish(signal.reason || new Error('Sheet read cancelled'));
      signal?.addEventListener('abort', abort, { once: true });
      const job = { range, finish, cancelled: () => settled };
      if (!this.pending.has(id)) {
        this.pending.set(id, []);
        setImmediate(() => this.flush(id));
      }
      this.pending.get(id).push(job);
    });
  }

  async flush(id) {
    const jobs = this.pending.get(id).filter(job => !job.cancelled());
    this.pending.delete(id);
    for (let offset = 0; offset < jobs.length; offset += this.batchSize) {
      const batch = jobs.slice(offset, offset + this.batchSize);
      const ranges = [...new Set(batch.map(job => job.range))];
      try {
        const result = await this.request(id, '/values:batchGet', [
          ['majorDimension', 'ROWS'], ['valueRenderOption', 'FORMATTED_VALUE'],
          ...ranges.map(range => ['ranges', range])
        ]);
        if (!Array.isArray(result.valueRanges) || result.valueRanges.length !== ranges.length)
          fail('Google returned an incomplete batch; retaining last valid data');
        for (const job of batch) job.finish(null, result.valueRanges[ranges.indexOf(job.range)]);
      } catch (error) { for (const job of batch) job.finish(error); }
    }
  }

  async read(input, { singleCell = false, signal, headerRows = [] } = {}) {
    const settings = normalizeSettings(input);
    const range = singleCell ? settings.cell : settings.range;
    if (!range) fail('Choose a cell before saving the source', 400);
    const bounds = parseRange(range);
    const headers = singleCell ? [] : [...new Set([bounds.firstRow, ...headerRows])];
    if (headers.length > 16 || headers.some(row => !Number.isInteger(row) || row < bounds.firstRow || row > bounds.lastRow))
      fail('Use at most 16 header rows within the connection range', 400);
    signal?.throwIfAborted();
    const id = settings.url.split('/')[5];
    const tabs = await this.tabs(id);
    signal?.throwIfAborted();
    const tab = tabs.find(tab => /^\d+$/.test(settings.worksheet) ? tab.id === settings.worksheet : tab.name === settings.worksheet);
    if (!tab) { this.metadata.delete(id); fail('Worksheet not found; refresh the worksheet list and select its tab'); }
    const qualified = `'${tab.name.replace(/'/g, "''")}'!${range}`;
    const result = await this.queue(id, qualified, signal);
    if (!result || typeof result !== 'object') fail('Google returned invalid range data');
    const rows = cells(result.values, range);
    if (singleCell && !rows[0][0].usable) fail('Selected cell is empty or exceeds 300 characters; retaining the last valid value');
    return { settings, rows, headerRows: headers, ...(singleCell ? { value: rows[0][0].value } : {}) };
  }
}

function createSheets(options = {}, { env = process.env, fetcher = fetch, keyFile } = {}) {
  if (!options.enabled) return new PublicSheets(fetcher);
  const name = options.keyEnv || 'YCS_GOOGLE_SHEETS_API_KEY';
  if (!/^[A-Z_][A-Z0-9_]{0,99}$/.test(name)) fail('Invalid sheetsAPI.keyEnv environment variable name', 422);
  const key = env[name] || readKey(keyFile);
  if (!key) {
    const unavailable = async () => fail('Google Sheets API key is missing. Open YCS SPX Settings on the server to configure it.', 422);
    // Keep the settings page available after deploying without this machine's key.
    // Do not silently read through the compatibility connector.
    return { batchSize: 32, read: unavailable, worksheets: unavailable };
  }
  return new GoogleSheetsAPI({ key, fetcher });
}

module.exports = { GoogleSheetsAPI, createSheets, cells };
