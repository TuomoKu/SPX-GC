// Public-sheet browsing is a draft-only form control. Nothing here saves a
// connection or sends a playout command; the parent form owns those actions.
window.YCSSheetPicker = class SheetPicker {
  constructor({ request, invalidate }) {
    this.request = request; this.invalidate = invalidate; this.$ = id => document.getElementById(id);
    this.sequence = 0; this.previewSequence = 0; this.session = 0; this.tabs = []; this.dragging = false;
    this.$('load-worksheets').onclick = () => this.loadTabs();
    this.$('sheet-url').addEventListener('input', () => {
      if(this.enabled===false)return;
      this.sequence++; this.$('load-worksheets').disabled = false; this.tabs = []; this.manual = ''; this.setOptions('', []); this.$('sheet-tabs-status').textContent = '';
      clearTimeout(this.debounce); this.debounce = setTimeout(() => { if (this.$('sheet-url').validity.valid && this.$('sheet-url').value) this.loadTabs(); }, 650);
    });
    this.$('sheet-url').addEventListener('change', () => { clearTimeout(this.debounce); if (this.enabled!==false && this.$('sheet-url').value) this.loadTabs(); });
    this.$('sheet-worksheet').onchange = () => { this.manual = this.worksheet; this.updateManual(); this.invalidate(); };
    this.$('sheet-worksheet-manual').oninput = () => { this.manual = this.$('sheet-worksheet-manual').value; this.invalidate(); };
    this.$('select-range').onclick = () => this.openRange();
    for (const id of ['close-range', 'cancel-range']) this.$(id).onclick = () => this.$('range-dialog').close();
    this.$('range-dialog').addEventListener('close', () => { this.previewSequence++; this.endDrag(); });
    this.$('connection-dialog').addEventListener('close', () => { this.sequence++; clearTimeout(this.debounce); if (this.$('range-dialog').open) this.$('range-dialog').close(); });
    this.$('load-range-window').onclick = () => this.loadWindow();
    this.$('range-window').onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); this.loadWindow(); } };
    for (const [id, dx, dy] of [['range-left', -1, 0], ['range-right', 1, 0], ['range-up', 0, -1], ['range-down', 0, 1]]) this.$(id).onclick = () => this.moveWindow(dx, dy);
    this.$('use-range').onclick = () => {
      if (this.locked || !this.loaded || !this.selection) return;
      this.$('sheet-range').value = this.selection; this.invalidate(); this.$('range-dialog').close(); this.$('sheet-range').focus();
    };
    const grid = this.$('range-grid');
    grid.addEventListener('pointerdown', event => {
      const cell = event.target.closest('td[data-address]'); if (!cell || (event.button !== undefined && event.button !== 0)) return;
      event.preventDefault(); this.anchor = this.point(cell); this.end = this.anchor; this.dragging = true; this.pointerId = event.pointerId;
      cell.focus({ preventScroll: true }); grid.setPointerCapture?.(event.pointerId); this.paint();
    });
    grid.addEventListener('pointermove', event => {
      if (!this.dragging) return;
      this.pointer = { x: event.clientX, y: event.clientY };
      this.trackPointer(event.target.closest('td[data-address]'));
      if (!this.scrollFrame) this.scrollFrame = requestAnimationFrame(() => this.autoScroll());
    });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) grid.addEventListener(event, () => this.endDrag());
    grid.addEventListener('keydown', event => this.keydown(event));
  }
  get worksheet() { return this.locked ? this.originalWorksheet : this.$('sheet-worksheet').value === '__manual__' ? this.$('sheet-worksheet-manual').value.trim() : this.$('sheet-worksheet').value; }
  urlTab() { try { const url = new URL(this.$('sheet-url').value); return url.searchParams.get('gid') || new URLSearchParams(url.hash.slice(1)).get('gid') || ''; } catch { return ''; } }
  reset({ worksheet = '', locked = false,enabled=true }) {
    this.session++; this.sequence++; this.previewSequence++; clearTimeout(this.debounce); this.endDrag();
    this.enabled=enabled; this.locked = locked; this.originalWorksheet = worksheet; this.manual = worksheet; this.tabs = [];
    this.$('load-worksheets').disabled = false; this.$('sheet-worksheet-manual').value = worksheet; this.setOptions(worksheet, []);
    this.$('sheet-worksheet').disabled = locked; this.$('sheet-worksheet-manual').readOnly = locked;
    this.$('select-range').disabled = locked; this.$('sheet-tabs-status').textContent = '';
    if (this.enabled && this.$('sheet-url').value) this.loadTabs();
  }
  updateManual() { this.$('manual-worksheet-field').hidden = this.$('sheet-worksheet').value !== '__manual__'; }
  setOptions(desired, tabs) {
    const select = this.$('sheet-worksheet'); select.replaceChildren();
    const add = (value, title) => { const option = document.createElement('option'); option.value = value; option.textContent = title; select.append(option); };
    for (const tab of tabs) add(tab.id, tab.name);
    const match = tabs.find(tab => tab.id === desired || tab.name === desired);
    if (!tabs.length) add(desired, desired ? 'Tab ' + desired : this.urlTab() ? 'Tab from URL (' + this.urlTab() + ')' : 'Tab from URL / first worksheet');
    else if (desired && !match) add(desired, 'Current tab: ' + desired);
    add('__manual__', 'Enter a tab name or gid…');
    select.value = match?.id || desired || tabs.find(tab => tab.id === this.urlTab())?.id || tabs[0]?.id || '';
    this.updateManual();
  }
  async loadTabs() {
    if(this.enabled===false)return;
    const url = this.$('sheet-url').value.trim(); if (!url) { this.$('sheet-tabs-status').textContent = 'Enter a Google Sheets URL first.'; return; }
    const generation = ++this.sequence, session = this.session, desired = this.worksheet || this.urlTab();
    this.$('load-worksheets').disabled = true; this.$('sheet-tabs-status').textContent = 'Loading worksheets…';
    try {
      const result = await this.request('/data/sheets/worksheets', { url });
      if (generation !== this.sequence || session !== this.session || url !== this.$('sheet-url').value.trim() || !this.$('connection-dialog').open) return;
      this.tabs = result.worksheets; const before = this.worksheet || this.urlTab() || '0';
      // Respect any manual selection made while the request was in flight.
      const wasManual = this.$('sheet-worksheet').value === '__manual__';
      const current = wasManual ? this.$('sheet-worksheet-manual').value : this.worksheet;
      this.setOptions(current || desired, this.tabs);
      if (wasManual) { this.$('sheet-worksheet').value = '__manual__'; this.updateManual(); }
      this.$('sheet-tabs-status').textContent = `${this.tabs.length} worksheets loaded. Choose a tab, then select its data range.`;
      this.$('sheet-tabs-status').hidden = this.$('connection-dialog').classList.contains('named-range-editor');
      if (!this.locked && before !== this.worksheet) this.invalidate();
    } catch (error) {
      if (generation === this.sequence && session === this.session) {
        this.$('sheet-tabs-status').textContent = error.message;
        this.$('sheet-tabs-status').hidden = false;
      }
    } finally { if (generation === this.sequence) this.$('load-worksheets').disabled = false; }
  }
  column(value) { let name = ''; while (value) { value--; name = String.fromCharCode(65 + value % 26) + name; value = Math.floor(value / 26); } return name; }
  address(point) { return this.column(point.column) + point.row; }
  parse(value) {
    const match = String(value).trim().toUpperCase().replace(/\$/g, '').match(/^([A-Z]{1,3})([1-9]\d{0,6})(?::([A-Z]{1,3})([1-9]\d{0,6}))?$/);
    if (!match) throw new Error('Enter a bounded A1 range, such as A1:Z100.');
    const column = name => [...name].reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0);
    const first = { column: column(match[1]), row: Number(match[2]) }, last = { column: column(match[3] || match[1]), row: Number(match[4] || match[2]) };
    if (last.column < first.column || last.row < first.row || last.column - first.column >= 32 || last.row - first.row >= 200) throw new Error('Choose up to 200 rows and 32 columns.');
    return { first, last };
  }
  async openRange() {
    if (this.locked) return;
    this.selection = ''; this.loaded = false; this.anchor = null; this.end = null; this.$('selected-range').value = ''; this.$('use-range').disabled = true;
    if (!this.$('sheet-url').value) { this.$('sheet-tabs-status').textContent = 'Enter a Google Sheets URL first.'; return; }
    try {
      const chosen = this.parse(this.$('sheet-range').value);
      this.anchor = chosen.first; this.end = chosen.last;
      // Start with a useful neighborhood, including the current range. Larger
      // sheets can be browsed in bounded windows without loading the workbook.
      const first = { column: chosen.first.column, row: Math.max(1, chosen.first.row - 5) };
      const last = { column: Math.max(chosen.last.column, first.column + 25), row: Math.min(first.row + 199, Math.max(chosen.last.row, first.row + 99)) };
      this.$('range-window').value = this.address(first) + ':' + this.address(last);
    } catch { this.$('range-window').value = 'A1:Z100'; }
    const tab = this.tabs.find(tab => tab.id === this.worksheet || tab.name === this.worksheet);
    this.$('range-worksheet').textContent = tab?.name || this.worksheet || 'Tab from URL';
    this.$('range-dialog').showModal(); await this.loadWindow();
  }
  async loadWindow() {
    const sequence = ++this.previewSequence, session = this.session;
    this.endDrag(); this.loaded = false; this.$('use-range').disabled = true; this.$('range-grid').replaceChildren();
    try {
      const window = this.parse(this.$('range-window').value), range = this.address(window.first) + ':' + this.address(window.last);
      this.$('range-status').textContent = 'Loading sheet preview…'; this.$('load-range-window').disabled = true;
      const result = await this.request('/data/sheets/test', { settings: { url: this.$('sheet-url').value, worksheet: this.worksheet, range, refreshSeconds: 5 } });
      if (sequence !== this.previewSequence || session !== this.session || !this.$('range-dialog').open) return;
      this.window = window; this.loaded = true; this.$('range-window').value = range;
      this.draw(result.rows); this.paint();
      this.$('range-status').textContent = 'Drag to select cells. Browse another window to reach rows or columns farther away.';
    } catch (error) { if (sequence === this.previewSequence) { this.$('range-status').textContent = error.message; this.$('range-status').classList.add('error'); } }
    finally { if (sequence === this.previewSequence) this.$('load-range-window').disabled = false; }
  }
  draw(rows) {
    const make = (tag, text) => { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; return element; };
    const table = make('table'); table.setAttribute('role', 'grid'); table.setAttribute('aria-label', 'Read-only worksheet range selection');
    const head = make('thead'), header = make('tr'); header.append(make('th', ''));
    for (let column = this.window.first.column; column <= this.window.last.column; column++) { const th = make('th', this.column(column)); th.scope = 'col'; header.append(th); } head.append(header); table.append(head);
    const body = make('tbody');
    for (const cells of rows) {
      const tr = make('tr'), first = cells[0]; if (!first) continue;
      const rowNumber = Number(first.address.match(/\d+$/)?.[0]), th = make('th', String(rowNumber)); th.scope = 'row'; tr.append(th);
      for (const cell of cells) {
        const td = make('td', cell.value); td.dataset.address = cell.address; td.setAttribute('role', 'gridcell'); td.setAttribute('aria-label', cell.address + (cell.value ? ': ' + cell.value : ': empty')); td.setAttribute('aria-selected', 'false'); td.tabIndex = -1; td.title = cell.address + (cell.value ? ' · ' + cell.value : ''); tr.append(td);
      }
      body.append(tr);
    }
    table.append(body); this.$('range-grid').append(table); this.$('range-grid').scrollTop = 0; this.$('range-grid').scrollLeft = 0;
    this.$('range-status').classList.remove('error');
  }
  point(cell) { const address = this.parse(cell.dataset.address); return address.first; }
  paint() {
    const valid = this.loaded && this.anchor && this.end && Math.abs(this.anchor.row - this.end.row) < 200 && Math.abs(this.anchor.column - this.end.column) < 32;
    const first = valid ? { row: Math.min(this.anchor.row, this.end.row), column: Math.min(this.anchor.column, this.end.column) } : null;
    const last = valid ? { row: Math.max(this.anchor.row, this.end.row), column: Math.max(this.anchor.column, this.end.column) } : null;
    this.selection = valid ? this.address(first) + (first.row !== last.row || first.column !== last.column ? ':' + this.address(last) : '') : '';
    this.$('selected-range').value = this.selection; this.$('use-range').disabled = !valid;
    if (this.loaded && this.anchor && this.end && !valid) { this.$('range-status').textContent = 'Selections can include up to 200 rows and 32 columns.'; this.$('range-status').classList.add('error'); }
    else if (valid && this.$('range-status').classList.contains('error')) { this.$('range-status').textContent = 'Drag to select cells.'; this.$('range-status').classList.remove('error'); }
    let focusCell;
    for (const cell of this.$('range-grid').querySelectorAll('td[data-address]')) {
      const point = this.point(cell), selected = valid && point.row >= first.row && point.row <= last.row && point.column >= first.column && point.column <= last.column;
      cell.classList.toggle('range-selected', Boolean(selected)); cell.setAttribute('aria-selected', String(Boolean(selected))); cell.tabIndex = -1;
      if (valid && point.row === this.end.row && point.column === this.end.column) focusCell = cell;
    }
    (focusCell || this.$('range-grid').querySelector('td[data-address]'))?.setAttribute('tabindex', '0');
  }
  trackPointer(fallback) {
    const rect = this.$('range-grid').getBoundingClientRect();
    const hit = this.pointer && document.elementFromPoint?.(Math.max(rect.left + 45, Math.min(rect.right - 20, this.pointer.x)), Math.max(rect.top + 35, Math.min(rect.bottom - 20, this.pointer.y)))?.closest('td[data-address]');
    const cell = hit && this.$('range-grid').contains(hit) ? hit : fallback;
    if (!cell || !this.$('range-grid').contains(cell)) return;
    const next = this.point(cell); if (next.row !== this.end?.row || next.column !== this.end?.column) { this.end = next; this.paint(); }
  }
  autoScroll() {
    this.scrollFrame = null; if (!this.dragging || !this.pointer) return;
    const grid = this.$('range-grid'), rect = grid.getBoundingClientRect(), { x, y } = this.pointer;
    const dx = x < rect.left + 30 ? -14 : x > rect.right - 30 ? 14 : 0, dy = y < rect.top + 35 ? -14 : y > rect.bottom - 30 ? 14 : 0;
    if (dx || dy) { grid.scrollLeft += dx; grid.scrollTop += dy; this.trackPointer(); this.scrollFrame = requestAnimationFrame(() => this.autoScroll()); }
  }
  endDrag() { this.dragging = false; this.pointer = null; if (this.scrollFrame) cancelAnimationFrame(this.scrollFrame); this.scrollFrame = null; if (this.$('range-grid').hasPointerCapture?.(this.pointerId)) this.$('range-grid').releasePointerCapture(this.pointerId); }
  keydown(event) {
    const cell = event.target.closest('td[data-address]'), deltas = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!cell || !deltas[event.key] || !this.loaded) return;
    event.preventDefault(); const point = this.point(cell), [dx, dy] = deltas[event.key];
    const next = { column: Math.max(this.window.first.column, Math.min(this.window.last.column, point.column + dx)), row: Math.max(this.window.first.row, Math.min(this.window.last.row, point.row + dy)) };
    if (!event.shiftKey || !this.anchor) this.anchor = event.shiftKey ? point : next; this.end = next; this.paint();
    const target = this.$('range-grid').querySelector(`[data-address="${this.address(next)}"]`); target?.focus(); target?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }
  moveWindow(dx, dy) {
    try {
      const bounds = this.parse(this.$('range-window').value), width = bounds.last.column - bounds.first.column + 1, height = bounds.last.row - bounds.first.row + 1;
      const first = { column: Math.max(1, bounds.first.column + dx * width), row: Math.max(1, bounds.first.row + dy * height) };
      this.$('range-window').value = this.address(first) + ':' + this.address({ column: first.column + width - 1, row: first.row + height - 1 }); this.loadWindow();
    } catch (error) { this.$('range-status').textContent = error.message; }
  }
  dispose() { this.session++; this.sequence++; this.previewSequence++; clearTimeout(this.debounce); this.endDrag(); }
};
