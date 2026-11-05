'use strict';
const { randomUUID } = require('node:crypto');
const { normalizeSettings, parseRange } = require('./public-sheets.cjs');
const pattern = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,95}$/;
// Matches the connection backoff cap in data.cjs: sources recover soon after an outage.
const BACKOFF_CAP_SECONDS = 120;
function fail(message, status = 422) { throw Object.assign(new Error(message), { status }); }
function label(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 300) fail('Enter a name.');
  return value.trim();
}
function settings(input) {
  const normalized = normalizeSettings({ ...input, worksheet: '0', range: 'A1' });
  return { url: normalized.url, refreshSeconds: normalized.refreshSeconds };
}
function rangeMetadata(input, connectionSettings) {
  const bounds = parseRange(connectionSettings.range);
  const headerRow = input.headerRow == null ? null : Number(input.headerRow);
  const dataRow = input.dataRow == null ? (headerRow === null ? bounds.firstRow : headerRow + 1) : Number(input.dataRow);
  if (headerRow !== null && (!Number.isInteger(headerRow) || headerRow < bounds.firstRow || headerRow >= bounds.lastRow)) fail('Header row must be inside the range with a data row below it.');
  if (!Number.isInteger(dataRow) || dataRow < bounds.firstRow || dataRow > bounds.lastRow || dataRow === headerRow) fail('Choose a data row inside the range.');
  return { workbook: input.workbook, group: input.group, headerRow, dataRow };
}
function validate(document) {
  const workbooks = document.workbooks || {};
  if (typeof workbooks !== 'object' || Array.isArray(workbooks) || Object.keys(workbooks).length > 100) fail('Invalid spreadsheet sources.');
  const urls = new Set();
  for (const [id, workbook] of Object.entries(workbooks)) {
    if (!pattern.test(id) || label(workbook.label) !== workbook.label || JSON.stringify(settings(workbook.settings)) !== JSON.stringify(workbook.settings)) fail('Invalid spreadsheet source.');
    if (urls.has(workbook.settings.url)) fail('This spreadsheet already has a source.');
    urls.add(workbook.settings.url);
    if (!workbook.groups || Array.isArray(workbook.groups) || Object.keys(workbook.groups).length > 100) fail('Invalid source groups.');
    const names = new Set();
    for (const [groupId, group] of Object.entries(workbook.groups)) {
      if (!pattern.test(groupId) || label(group.label) !== group.label || names.has(group.label.toLowerCase())) fail('Invalid group.');
      names.add(group.label.toLowerCase());
      normalizeSettings({ ...workbook.settings, worksheet: group.worksheet, range: 'A1' });
    }
  }
  const names = new Set();
  for (const connection of Object.values(document.connections)) if (connection.sheetRange) {
    const metadata = connection.sheetRange, workbook = workbooks[metadata.workbook];
    if (connection.type !== 'google-sheets' || !workbook?.groups[metadata.group] || connection.settings.url !== workbook.settings.url || connection.settings.refreshSeconds !== workbook.settings.refreshSeconds || JSON.stringify(rangeMetadata(metadata, connection.settings)) !== JSON.stringify(metadata)) fail('Invalid named range.');
    const key = JSON.stringify([metadata.workbook, metadata.group, connection.label.toLowerCase()]);
    if (names.has(key)) fail('Range names must be unique within a group.');
    names.add(key);
  }
}
function attach(DataSources) {
  Object.assign(DataSources.prototype, {
    workbookRuntime(id) {
      this.workbookRuntimes ||= new Map();
      const workbook = this.document?.workbooks?.[id];
      if (!workbook) fail('Unknown spreadsheet.', 404);
      const fingerprint = JSON.stringify(workbook.settings);
      if (this.workbookRuntimes.get(id)?.fingerprint !== fingerprint) this.workbookRuntimes.set(id, { fingerprint, nextAt: 0, lastSuccess: null, failures: 0 });
      return this.workbookRuntimes.get(id);
    },
    workbookSnapshots() {
      return Object.fromEntries(Object.entries(this.document?.workbooks || {}).map(([id, workbook]) => {
        const runtime = this.workbookRuntime(id);
        return [id, { ...workbook, lastSync: runtime.lastSuccess, requestsPerMinute: this.sheets.metrics?.count(workbook.settings.url) || 0 }];
      }));
    },
    async saveWorkbook(input) {
      const normalized = settings(input.settings), name = label(input.label), id = input.id || 'book.' + randomUUID();
      if (!pattern.test(id)) fail('Invalid spreadsheet ID.');
      await this.edit(input.revision, next => {
        next.workbooks ||= {};
        if (input.id && !next.workbooks[id]) fail('Unknown spreadsheet.', 404);
        if (Object.entries(next.workbooks).some(([key, book]) => key !== id && book.settings.url === normalized.url)) fail('This spreadsheet already has a source.');
        const previous = next.workbooks[id];
        const ranges = Object.entries(next.connections).filter(([, connection]) => connection.sheetRange?.workbook === id);
        next.workbooks[id] = { label: name, settings: normalized, groups: previous?.groups || {} };
        for (const [, connection] of ranges) Object.assign(connection.settings, normalized);
      }, input.confirmed);
      return { workbookId: id, snapshot: this.snapshot() };
    },
    async saveWorkbookGroup(workbookId, input) {
      const name = label(input.label), id = input.id || 'group.' + randomUUID();
      if (!pattern.test(id)) fail('Invalid group ID.');
      await this.edit(input.revision, next => {
        const book = next.workbooks?.[workbookId];
        if (!book) fail('Unknown spreadsheet.', 404);
        if (input.id && !book.groups[id]) fail('Unknown group.', 404);
        if (Object.entries(book.groups).some(([key, group]) => key !== id && group.label.toLowerCase() === name.toLowerCase())) fail('Choose a unique group name.');
        const normalized = normalizeSettings({ ...book.settings, range: 'A1', worksheet: input.worksheet || '0' });
        book.groups[id] = { label: name, worksheet: normalized.worksheet };
      });
      return { groupId: id, snapshot: this.snapshot() };
    },
    async saveNamedRange(workbookId, groupId, input) {
      await this.ready;
      const book = this.document?.workbooks?.[workbookId];
      if (!book?.groups[groupId]) fail('Unknown group.', 404);
      const normalized = normalizeSettings({ ...input.settings, ...book.settings });
      const metadata = rangeMetadata({ workbook: workbookId, group: groupId, headerRow: input.headerRow, dataRow: input.dataRow }, normalized);
      const name = label(input.label), id = input.id || 'range.' + randomUUID();
      if (!pattern.test(id)) fail('Invalid range ID.');
      const result = await this.sheets.read(normalized, { headerRows: metadata.headerRow === null ? [] : [metadata.headerRow] });
      await this.edit(input.revision, next => {
        const currentBook = next.workbooks?.[workbookId];
        if (!currentBook?.groups[groupId] || JSON.stringify(currentBook.settings) !== JSON.stringify(book.settings)) fail('Spreadsheet changed. Reload before saving.', 409);
        const old = next.connections[id];
        if (input.id && (!old || old.sheetRange?.workbook !== workbookId || old.sheetRange.group !== groupId)) fail('Unknown named range.', 404);
        next.connections[id] = { type: 'google-sheets', label: name, settings: normalized, sheetRange: metadata };
      }, input.confirmed);
      this.acceptRead(id, result.rows, result.data, result.headerRows);
      this.workbookRuntime(workbookId).nextAt = 0;
      await this.persistCache();
      return { connectionId: id, snapshot: this.snapshot() };
    },
    async removeWorkbookItem(workbookId, groupId, revision, confirmed = false) {
      await this.edit(revision, next => {
        const book = next.workbooks?.[workbookId];
        if (!book || (groupId && !book.groups[groupId])) fail('Unknown spreadsheet or group.', 404);
        const ids = Object.keys(next.connections).filter(id => next.connections[id].sheetRange?.workbook === workbookId && (!groupId || next.connections[id].sheetRange.group === groupId));
        for (const id of ids) delete next.connections[id];
        if (groupId) delete book.groups[groupId]; else delete next.workbooks[workbookId];
      }, confirmed);
      return this.snapshot();
    },
    // Reads every named range together, so API reads form one batch per spreadsheet.
    readWorkbook(id) {
      const runtime = this.workbookRuntime(id);
      if (runtime.pending) return runtime.pending;
      const ids = Object.keys(this.document.connections).filter(key => this.document.connections[key].sheetRange?.workbook === id);
      runtime.pending = (async () => {
        await Promise.allSettled(ids.map(key => this.refreshConnection(key)));
        const ranges = ids.map(key => this.runtimes.get(key));
        const okay = ids.length && ranges.every(value => value?.health === 'ok');
        if (okay) { runtime.lastSuccess = new Date(this.now()).toISOString(); runtime.failures = 0; }
        else runtime.failures++;
        const seconds = this.document?.workbooks?.[id]?.settings.refreshSeconds || 5;
        const wait = okay || !ids.length ? seconds : Math.min(BACKOFF_CAP_SECONDS, seconds * 2 ** Math.min(runtime.failures, 6));
        // A range caught mid-check asks to be read again sooner than the interval.
        const soonest = Math.min(...ranges.filter(value => value?.transient > 0).map(value => value.nextAt));
        runtime.nextAt = Math.min(8640000000000000, this.now() + wait * 1000, soonest);
      })().finally(() => { runtime.pending = null; });
      return runtime.pending;
    },
    async refreshWorkbook(id) {
      await this.ready;
      await this.readWorkbook(id);
      return this.snapshot();
    },
    // Each spreadsheet runs independently, so a stalled one cannot delay another.
    // Polling also skips the full snapshot, which only the refresh route returns.
    pollWorkbooks() {
      const jobs = [];
      for (const id of Object.keys(this.document?.workbooks || {})) {
        const runtime = this.workbookRuntime(id);
        if (!runtime.pending && runtime.nextAt <= this.now())
          jobs.push(this.readWorkbook(id).catch(error => console.error('[YCS Sheets]', error.message)));
      }
      return Promise.all(jobs);
    }
  });
}
module.exports = { attach, validate, settings, rangeMetadata };
