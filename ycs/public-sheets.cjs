'use strict';
const MAX_BODY = 262144;
function fail(message, status = 400) { const error = new Error(message); error.status = status; throw error; }
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
  if (!Number.isFinite(refreshSeconds) || refreshSeconds <= 0) fail('Refresh interval must be a positive number of seconds');
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
class PublicSheets {
  constructor(fetcher = fetch) { this.fetcher = fetcher; this.metrics = new (require('./sheet-metrics.cjs').SheetMetrics)(); }
  async worksheets(input, { signal } = {}) {
    const settings = normalizeSettings({ url: input?.url, range: 'A1', refreshSeconds: 5 });
    const timeout = new AbortController(), timer = setTimeout(() => timeout.abort(), 8000); timer.unref?.();
    try {
      this.metrics.record(settings.url.split('/')[5]);
      const response = await this.fetcher(settings.url.replace('/edit', '/htmlview'), {
        signal: signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal,
        redirect: 'manual', credentials: 'omit', referrerPolicy: 'no-referrer', headers: { Accept: 'text/html' }
      });
      if (response.status !== 200) fail('Could not list worksheets. Check public sharing or enter a tab name/gid manually.', 502);
      return { worksheets: parseWorksheets(await readLimited(response, 2097152)), selected: settings.worksheet };
    } catch (error) {
      if (error.status) throw error;
      fail('Could not list worksheets. Retry or enter a tab name/gid manually.', 502);
    } finally { clearTimeout(timer); }
  }
  async read(input, { singleCell = false, signal, headerRows = [] } = {}) {
    const settings = normalizeSettings(input), range = singleCell ? settings.cell : settings.range;
    if (!range) fail('Choose a cell before saving the source');
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), 8000); timer.unref?.();
    try {
      const combined = signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal;
      const readRange=async selected=>{
        this.metrics.record(settings.url.split('/')[5]);
        const response = await this.fetcher(endpoint(settings, selected), {
          signal: combined, redirect: 'manual', credentials: 'omit', referrerPolicy: 'no-referrer',
          headers: { Accept: 'application/javascript, application/json', 'Cache-Control': 'no-cache' }
        });
        if (!response.ok || response.status !== 200 || /text\/html/i.test(response.headers.get('content-type') || '')) fail('Sheet is unavailable or requires sign-in. Check Anyone with the link → Viewer, the URL and worksheet.', 502);
        return parseResponse(await readLimited(response), selected);
      };
      const rows=await readRange(range),bounds=parseRange(range);
      const headers=singleCell?[]:[...new Set([bounds.firstRow,...headerRows])];
      if(headers.length>16||headers.some(row=>!Number.isInteger(row)||row<bounds.firstRow||row>bounds.lastRow))fail('Use at most 16 header rows within the connection range');
      // The query endpoint infers a type per column and can return a text header
      // as null above checkboxes/numbers. Read each requested header on its own
      // and overlay it at its original address. Data stays in one shared poll.
      if(bounds.firstRow!==bounds.lastRow)for(let offset=0;offset<headers.length;offset+=4){
        await Promise.all(headers.slice(offset,offset+4).map(async row=>{
          const selected=columnName(bounds.firstColumn)+row+':'+columnName(bounds.lastColumn)+row;
          rows[row-bounds.firstRow]=(await readRange(selected))[0];
        }));
      }
      if (singleCell && !rows[0][0].usable) fail('Selected cell is empty or exceeds 300 characters; retaining the last valid value', 502);
      return { settings, rows, headerRows:headers, ...(singleCell ? { value: rows[0][0].value } : {}) };
    } catch (error) {
      if (error.status) throw error;
      fail(timeout.signal.aborted ? 'Google Sheets request timed out; retaining the last valid value' : 'Could not reach Google Sheets; retaining the last valid value', 502);
    } finally { clearTimeout(timer); }
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
module.exports = { PublicSheets, normalizeSettings, parseRange, parseResponse, parseWorksheets, endpoint, usable, columnName };
