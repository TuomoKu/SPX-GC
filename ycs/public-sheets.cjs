'use strict';
const { createHash } = require('node:crypto');
const MAX_BODY = 262144;
// Worksheet lists come from the public HTML viewer, shared by every connection on
// a spreadsheet. Google's query endpoint answers an unknown gid or sheet name with
// the first tab and status "ok", so each read is checked against this list.
const TAB_TTL = 300000, TAB_RECHECK = 5000, TAB_RETRY = 60000;
function fail(message, status = 400) { const error = new Error(message); error.status = status; throw error; }
// Not a source failure: the caller keeps its last valid data and retries later.
function transient(message, retryAfterMs) { const error = new Error(message); error.status = 503; error.transient = true; error.retryAfterMs = retryAfterMs; throw error; }
function columnNumber(name) { return [...name].reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0); }
function columnName(number) { let name = ''; while (number) { number--; name = String.fromCharCode(65 + number % 26) + name; number = Math.floor(number / 26); } return name; }
function parseRange(value) {
  if (typeof value !== 'string') fail('Enter an A1 cell or range, such as B2 or A1:D10');
  const match = value.trim().toUpperCase().replace(/\$/g, '').match(/^([A-Z]{1,3})([1-9]\d{0,6})(?::([A-Z]{1,3})([1-9]\d{0,6}))?$/);
  if (!match) fail('Use an A1 cell or bounded range, such as B2 or A1:D10; enter the worksheet separately');
  const firstColumn = columnNumber(match[1]), firstRow = Number(match[2]);
  const lastColumn = columnNumber(match[3] || match[1]), lastRow = Number(match[4] || match[2]);
  if (lastColumn < firstColumn || lastRow < firstRow || lastColumn - firstColumn >= 32 || lastRow - firstRow >= 200) fail('Use a range of up to 200 rows and 32 columns');
  return { firstColumn, firstRow, lastColumn, lastRow, a1: `${match[1]}${firstRow}` + (match[3] ? `:${match[3]}${lastRow}` : '') };
}
function normalizeSettings(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Invalid Google Sheets settings');
  let url;
  try { url = new URL(input.url); } catch { fail('Enter the original Google Sheets sharing URL'); }
  if (url.protocol !== 'https:' || url.hostname !== 'docs.google.com' || url.port || url.username || url.password) fail('Use an https://docs.google.com/spreadsheets/d/... sharing URL');
  const id = url.pathname.match(/^\/spreadsheets\/d\/([A-Za-z0-9_-]{20,160})(?:\/|$)/)?.[1];
  if (!id) fail('Use the original spreadsheet sharing URL, rather than a Publish to web URL');
  const hash = new URLSearchParams(url.hash.slice(1));
  const worksheet = String(input.worksheet ?? '').trim();
  if (worksheet.length > 100 || /[\u0000-\u001f]/.test(worksheet)) fail('Invalid worksheet name');
  const gid = worksheet || url.searchParams.get('gid') || hash.get('gid') || '0';
  const selector = /^\d+$/.test(gid) ? { gid } : { sheet: worksheet };
  if (selector.gid && !/^\d{1,16}$/.test(selector.gid)) fail('Invalid worksheet gid');
  const range = parseRange(input.range);
  const refreshSeconds = Number(input.refreshSeconds);
  if (!Number.isInteger(refreshSeconds) || refreshSeconds < 5 || refreshSeconds > 3600) fail('Refresh interval must be 5–3600 seconds');
  let cell;
  if (input.cell !== undefined && input.cell !== '') {
    const selected = parseRange(input.cell);
    if (selected.firstRow !== selected.lastRow || selected.firstColumn !== selected.lastColumn || selected.firstRow < range.firstRow || selected.firstRow > range.lastRow || selected.firstColumn < range.firstColumn || selected.firstColumn > range.lastColumn) fail('Choose one cell inside the preview range');
    cell = columnName(selected.firstColumn) + selected.firstRow;
  }
  return { url: `https://docs.google.com/spreadsheets/d/${id}/edit`, worksheet: selector.sheet || selector.gid, range: range.a1, refreshSeconds, ...(cell ? { cell } : {}) };
}
function endpoint(settings, range) {
  const normalized = normalizeSettings(settings);
  const id = normalized.url.split('/')[5];
  const url = new URL(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq`);
  url.searchParams.set('tqx', 'out:json;responseHandler:ycsSheet');
  url.searchParams.set('headers', '0');
  url.searchParams.set(/^\d+$/.test(normalized.worksheet) ? 'gid' : 'sheet', normalized.worksheet);
  url.searchParams.set('range', range || normalized.range);
  return url;
}
function displayValue(cell) {
  if (!cell || typeof cell !== 'object') return '';
  if (typeof cell.f === 'string') return cell.f;
  if (typeof cell.v === 'string') return cell.v;
  if (typeof cell.v === 'number' && Number.isFinite(cell.v)) return String(cell.v);
  if (typeof cell.v === 'boolean') return cell.v ? 'TRUE' : 'FALSE';
  return '';
}
function usable(value) { return typeof value === 'string' && value.trim().length > 0 && value.length <= 300; }
function parseResponse(raw, range) {
  // Google wraps JSON in a callback. Only parse the fixed envelope as data;
  // never evaluate sheet content or a remote script.
  const envelope = raw.match(/^\s*(?:\/\*[\s\S]*?\*\/\s*)?ycsSheet\((\{[\s\S]*\})\);?\s*$/);
  if (!envelope) fail('Google did not return sheet data. Check that Anyone with the link can view this sheet.', 502);
  let result;
  try { result = JSON.parse(envelope[1]); } catch { fail('Google returned invalid sheet data', 502); }
  if (result.status !== 'ok' || !Array.isArray(result.table?.rows) || !Array.isArray(result.table?.cols)) fail('Google could not read this worksheet/range. Check public sharing, the tab and the range.', 502);
  const selected = parseRange(range), width = selected.lastColumn - selected.firstColumn + 1, height = selected.lastRow - selected.firstRow + 1;
  if (result.table.cols.length > width || result.table.rows.length > height) fail('Google returned more cells than the requested range', 502);
  return Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, column) => {
    const value = displayValue(result.table.rows[row]?.c?.[column]);
    return { address: columnName(selected.firstColumn + column) + (selected.firstRow + row), value: value.slice(0, 4001), usable: usable(value) };
  }));
}
async function readLimited(response, limit = MAX_BODY) {
  if (Number(response.headers.get('content-length')) > limit) fail('Sheet response is too large; choose a smaller range', 502);
  if (!response.body) fail('Google returned no sheet data', 502);
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let size = 0, raw = '';
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > limit) fail('Sheet response is too large; choose a smaller range', 502);
      raw += decoder.decode(value, { stream: true });
    }
    return raw + decoder.decode();
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
}
function findTab(tabs, worksheet) {
  if (/^\d+$/.test(worksheet)) return tabs.find((tab) => tab.id === worksheet);
  const exact = tabs.find((tab) => tab.name === worksheet);
  if (exact) return exact;
  const loose = tabs.filter((tab) => tab.name.toLowerCase() === worksheet.toLowerCase());
  return loose.length === 1 ? loose[0] : undefined;
}
// A header cell left blank above data in its column is the signature of Google's
// per-column type inference dropping a text header. Only such rows need a re-read.
function headerGaps(rows, index) {
  const header = rows[index];
  if (!header) return false;
  return header.some(
    (cell, column) =>
      !cell.value.trim() && rows.slice(index + 1).some((row) => row[column]?.value.trim())
  );
}
class PublicSheets {
  constructor(fetcher = fetch, { now = Date.now } = {}) {
    this.fetcher = fetcher;
    this.now = now;
    this.tabCache = new Map();
    this.verified = new Map();
  }
  async worksheets(input, { signal } = {}) {
    const settings = normalizeSettings({ url: input?.url, range: 'A1', refreshSeconds: 5 });
    const timeout = new AbortController(), timer = setTimeout(() => timeout.abort(), 8000); timer.unref?.();
    try {
      const response = await this.fetcher(settings.url.replace('/edit', '/htmlview'), {
        signal: signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal,
        redirect: 'manual', credentials: 'omit', referrerPolicy: 'no-referrer', headers: { Accept: 'text/html' }
      });
      if (response.status !== 200) fail('Could not list worksheets. Check public sharing or enter a tab name/gid manually.', 502);
      const worksheets = parseWorksheets(await readLimited(response, 2097152));
      this.rememberTabs(settings, worksheets);
      return { worksheets, selected: settings.worksheet };
    } catch (error) {
      if (error.status) throw error;
      fail('Could not list worksheets. Retry or enter a tab name/gid manually.', 502);
    } finally { clearTimeout(timer); }
  }
  rememberTabs(settings, tabs) {
    const id = settings.url.split('/')[5];
    const entry = { tabs, fetchedAt: this.now(), failedAt: undefined };
    for (const [key, value] of this.tabCache) {
      if (this.tabCache.size < 100) break;
      if (!value.pending) this.tabCache.delete(key);
    }
    this.tabCache.set(id, { ...this.tabCache.get(id), ...entry });
    return entry;
  }
  // Cached worksheet list, refreshed when older than maxAge. A failed refresh keeps
  // the previous list and is not retried for a minute, so a broken viewer page
  // never costs an extra request per poll.
  tabList(settings, maxAge) {
    const id = settings.url.split('/')[5], entry = this.tabCache.get(id), now = this.now();
    if (entry?.pending) return entry.pending;
    if (entry && (now - entry.fetchedAt < maxAge || now - (entry.failedAt ?? -Infinity) < TAB_RETRY))
      return Promise.resolve(entry);
    const pending = this.worksheets({ url: settings.url }).then(
      () => this.tabCache.get(id),
      () => {
        const failed = { tabs: entry?.tabs, fetchedAt: entry?.fetchedAt ?? -Infinity, failedAt: this.now() };
        this.tabCache.set(id, failed);
        return failed;
      }
    ).then((result) => { delete result.pending; return result; });
    this.tabCache.set(id, { ...entry, fetchedAt: entry?.fetchedAt ?? -Infinity, pending });
    return pending;
  }
  // `settle` (background polls) holds new content until a fresh worksheet list
  // confirms its tab. Explicit tests and saves accept a list fetched moments ago.
  async read(input, { singleCell = false, signal, headerRows = [], settle = false } = {}) {
    const settings = normalizeSettings(input), range = singleCell ? settings.cell : settings.range;
    if (!range) fail('Choose a cell before saving the source');
    const timeout = new AbortController(), started = this.now();
    const timer = setTimeout(() => timeout.abort(), 8000); timer.unref?.();
    try {
      const combined = signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal;
      const readRange=async selected=>{
        const response = await this.fetcher(endpoint(settings, selected), {
          signal: combined, redirect: 'manual', credentials: 'omit', referrerPolicy: 'no-referrer',
          headers: { Accept: 'application/javascript, application/json', 'Cache-Control': 'no-cache' }
        });
        if (!response.ok || response.status !== 200 || /text\/html/i.test(response.headers.get('content-type') || '')) fail('Sheet is unavailable or requires sign-in. Check Anyone with the link → Viewer, the URL and worksheet.', 502);
        const raw = await readLimited(response);
        return { rows: parseResponse(raw, selected), raw };
      };
      const main = await readRange(range), rows = main.rows, bounds = parseRange(range);
      const headers=singleCell?[]:[...new Set([bounds.firstRow,...headerRows])];
      if(headers.length>16||headers.some(row=>!Number.isInteger(row)||row<bounds.firstRow||row>bounds.lastRow))fail('Use at most 16 header rows within the connection range');
      // The query endpoint infers a type per column and can return a text header
      // as null above checkboxes/numbers. Re-read only header rows that show such a
      // gap, each on its own, and overlay them at their original addresses.
      const gaps = bounds.firstRow === bounds.lastRow ? [] : headers.filter((row) => headerGaps(rows, row - bounds.firstRow));
      for(let offset=0;offset<gaps.length;offset+=4){
        await Promise.all(gaps.slice(offset,offset+4).map(async row=>{
          const selected=columnName(bounds.firstColumn)+row+':'+columnName(bounds.lastColumn)+row;
          rows[row-bounds.firstRow]=(await readRange(selected)).rows[0];
        }));
      }
      const warning = await this.verifyTab(settings, range, main.raw, started, combined, settle);
      if (singleCell && !rows[0][0].usable) fail('Selected cell is empty or exceeds 300 characters; retaining the last valid value', 502);
      return { settings, rows, headerRows:headers, ...(warning ? { warning } : {}), ...(singleCell ? { value: rows[0][0].value } : {}) };
    } catch (error) {
      if (error.status) throw error;
      fail(timeout.signal.aborted ? 'Google Sheets request timed out; retaining the last valid value' : 'Could not reach Google Sheets; retaining the last valid value', 502);
    } finally { clearTimeout(timer); }
  }
  // Fails when the configured tab no longer exists. Unchanged content needs only
  // the cached list (five minutes). New content, or a missing tab, needs a list
  // fetched after this read began; lists are refreshed at most every five seconds
  // per spreadsheet, and new content arriving sooner is held until then.
  async verifyTab(settings, range, raw, started, signal, settle) {
    const key = settings.url + '\n' + settings.worksheet + '\n' + range;
    const digest = createHash('sha1').update(raw).digest('base64');
    // The shared list request is not cancelled with this read; stop waiting for it.
    const wait = (promise) => new Promise((resolve, reject) => {
      const abort = () => reject(signal.reason || new Error('Sheet read cancelled'));
      if (signal.aborted) return abort();
      signal.addEventListener('abort', abort, { once: true });
      promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
    });
    let list = await wait(this.tabList(settings, TAB_TTL));
    const fresh = () => list.fetchedAt >= started;
    if (list.tabs && !fresh() && (this.verified.get(key) !== digest || !findTab(list.tabs, settings.worksheet)))
      list = await wait(this.tabList(settings, TAB_RECHECK));
    if (!list.tabs) return 'Worksheet list unavailable; the selected tab could not be verified';
    if (!findTab(list.tabs, settings.worksheet)) {
      this.verified.delete(key);
      fail('Worksheet not found in this spreadsheet; it may have been renamed or deleted. Retaining the last valid data.', 502);
    }
    if (fresh() || this.verified.get(key) === digest) {
      if (this.verified.size >= 1000) this.verified.clear();
      this.verified.set(key, digest);
      return '';
    }
    // The viewer page is failing: rely on the last list rather than hold all data.
    if (list.failedAt > list.fetchedAt) return 'Worksheet list unavailable; the selected tab was checked against an older list';
    if (!settle) return '';
    transient('Checking that the worksheet still exists; retaining the last valid data', Math.max(500, list.fetchedAt + TAB_RECHECK - this.now()));
  }
}
function parseWorksheets(raw) {
  // The public HTML viewer contains scalar tab descriptors. Treat its response
  // only as data: never execute scripts, follow embedded URLs or render HTML.
  // This is a compatibility parser, not the authenticated Sheets metadata API.
  const quoted = '"(?:\\\\.|[^"\\\\])*"';
  const pattern = new RegExp('items\\.push\\(\\{\\s*name:\\s*(' + quoted + '),\\s*pageUrl:\\s*' + quoted + ',\\s*gid:\\s*"(\\d{1,16})"', 'g');
  const worksheets = [], seen = new Set();
  for (const match of raw.matchAll(pattern)) {
    let name;
    try { name = JSON.parse(match[1].replace(/\\x([0-9a-f]{2})/gi, '\\u00$1')); } catch { continue; }
    if (typeof name !== 'string' || !name.trim() || name.length > 100 || /[\u0000-\u001f]/.test(name) || seen.has(match[2])) continue;
    seen.add(match[2]); worksheets.push({ id: match[2], name });
    if (worksheets.length > 200) fail('Too many worksheet tabs to preview; enter the tab name/gid manually.', 502);
  }
  if (!worksheets.length) fail('Worksheet list unavailable. Check public sharing or enter a tab name/gid manually.', 502);
  return worksheets;
}
module.exports = { PublicSheets, findTab, normalizeSettings, parseRange, parseResponse, parseWorksheets, endpoint, usable, columnName };
