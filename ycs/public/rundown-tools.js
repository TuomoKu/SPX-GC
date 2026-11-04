// Local rundown presentation. Filtering never selects, previews or plays an item.
(function () {
  'use strict';
  window.YCSRundownTools = class RundownTools {
    constructor() {
      this.list = document.getElementById('itemList');
      this.query = ''; this.disposed = false; this.originals = {};
      if (!this.list) return;
      this.bar = document.createElement('div'); this.bar.className = 'ycs-rundown-toolbar';
      this.input = document.createElement('input'); this.input.type = 'search';
      this.input.placeholder = 'Search graphics…'; this.input.setAttribute('aria-label', 'Search graphics');
      this.clear = document.createElement('button'); this.clear.type = 'button'; this.clear.textContent = '×'; this.clear.setAttribute('aria-label', 'Clear graphic search');
      this.density = document.createElement('select'); this.density.setAttribute('aria-label', 'Rundown row size');
      for (const [value, label] of [['compact', 'Compact'], ['comfortable', 'Comfortable']]) {
        const option = document.createElement('option'); option.value = value; option.textContent = label; this.density.append(option);
      }
      let density = 'compact';
      try { if (localStorage.getItem('ycs.rundownDensity') === 'comfortable') density = 'comfortable'; } catch { /* Storage can be disabled. */ }
      this.density.value = density; this.setDensity();
      this.count = document.createElement('span'); this.count.className = 'ycs-rundown-count'; this.count.setAttribute('aria-live', 'polite');
      this.bar.append(this.input, this.clear, this.density, this.count);
      this.list.prepend(this.bar);
      this.empty = document.createElement('div'); this.empty.className = 'ycs-rundown-empty'; this.empty.textContent = 'No matching graphics'; this.empty.hidden = true; this.bar.after(this.empty);
      this.input.addEventListener('input', () => { this.query = this.input.value.trim().toLocaleLowerCase(); this.refresh(); });
      this.clear.addEventListener('click', () => { this.reset(); this.input.focus(); });
      this.density.addEventListener('change', () => { this.setDensity(); try { localStorage.setItem('ycs.rundownDensity', this.density.value); } catch {} });
      // SPX uses Escape for Stop All and Enter for Save. Search must consume them.
      this.bar.addEventListener('keydown', event => {
        event.stopPropagation();
        if (event.key === 'Escape') { event.preventDefault(); this.reset(); }
      });
      this.wrap('getFocusedRow', original => (...args) => {
        const row = original(...args); return row && !row.hidden ? row : null;
      });
      this.wrap('focusRow', original => target => {
        if (!this.query) return original(target);
        const rows = this.visible();
        const row = typeof target === 'number' ? rows[Math.max(0, Math.min(target, rows.length - 1))] : target;
        if (row && !row.hidden) return original(row);
      });
      this.wrap('moveFocus', original => direction => {
        if (!this.query) return original(direction);
        const rows = this.visible(); if (!rows.length) return;
        const current = rows.findIndex(row => row.classList.contains('inFocus'));
        const index = current < 0 ? 0 : Math.max(0, Math.min(rows.length - 1, current + Math.sign(direction)));
        window.focusRow(rows[index]);
      });
      this.wrap('setMasterButtonStates', original => (row, ...args) => {
        if (!row || row.hidden) { this.disableMaster(); return; }
        for (const button of this.masterButtons()) { button.disabled = false; button.removeAttribute('aria-disabled'); }
        return original(row, ...args);
      });
      this.wrap('SaveNewSortOrder', original => (...args) => { if (!this.query) return original(...args); });
      this.wrap('AppState', original => (...args) => { const result = original(...args); this.syncSorting(); return result; });
      this.onKey = event => {
        if (this.bar.contains(event.target) || event.target.closest?.('input,textarea,select,[contenteditable="true"]')) return;
        if (!this.rows().some(row => !row.hidden && row.classList.contains('inFocus')) && [' ', 'Enter', 'F5'].includes(event.key)) {
          event.preventDefault(); event.stopImmediatePropagation();
        }
      };
      document.addEventListener('keydown', this.onKey, true);
      this.onLoad = () => this.syncSorting(); window.addEventListener('load', this.onLoad);
      this.observer = new MutationObserver(records => {
        const changed = records.some(record => (record.target.closest?.('.itemrow') || record.target.parentElement?.closest('.itemrow')) || [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === 1 && (node.matches('.itemrow') || node.querySelector('.itemrow'))));
        if (changed) this.refresh();
      });
      this.observer.observe(this.list, { childList: true, characterData: true, subtree: true });
      this.refresh();
    }
    wrap(name, build) {
      if (typeof window[name] !== 'function') return;
      this.originals[name] = window[name]; window[name] = build(window[name]);
    }
    rows() { return this.list ? [...this.list.querySelectorAll('.itemrow')] : []; }
    visible() { return this.rows().filter(row => !row.hidden); }
    masterButtons() { return ['MasterTOGGLE', 'MasterUPDATE', 'MasterCONTINUE'].map(id => document.getElementById(id)).filter(Boolean); }
    disableMaster() {
      for (const button of this.masterButtons()) { button.classList.add('disabled'); button.disabled = true; button.setAttribute('aria-disabled', 'true'); }
    }
    setDensity() { document.documentElement.dataset.ycsDensity = this.density.value; }
    reset() { if (!this.list) return; this.input.value = ''; this.query = ''; this.refresh(); }
    reveal(row) { if (row?.hidden && this.query) this.reset(); }
    syncSorting() {
      const sortable = window.Sortable?.get?.(this.list);
      if (!sortable) return;
      sortable.option('draggable', '.itemrow');
      const editing = typeof APPSTATE !== 'undefined' && APPSTATE === 'EDITING';
      sortable.option('disabled', Boolean(this.query) || editing);
    }
    refresh() {
      if (!this.list || this.disposed) return;
      const words = this.query.split(/\s+/).filter(Boolean), rows = this.rows();
      for (const row of rows) {
        const collapsed = row.querySelector('#Collapsed');
        const heading = collapsed?.querySelector('table')?.textContent || row.querySelector('[data-ycs-item-title]')?.textContent || '';
        const template = row.querySelector('[name="RundownItem[relpath]"]')?.value || '';
        const text = (heading + ' ' + template + ' ' + (row.querySelector('.truncate')?.textContent || '')).toLocaleLowerCase();
        row.hidden = !words.every(word => text.includes(word));
        if (row.hidden && row.classList.contains('inFocus')) row.classList.remove('inFocus');
      }
      const visible = rows.filter(row => !row.hidden).length;
      const label = this.query ? visible + ' / ' + rows.length : rows.length + ' graphics';
      if (this.count.textContent !== label) this.count.textContent = label;
      this.clear.disabled = !this.query; this.empty.hidden = !this.query || visible > 0;
      if (!rows.some(row => !row.hidden && row.classList.contains('inFocus'))) this.disableMaster();
      this.syncSorting();
    }
    dispose() {
      this.disposed = true; this.observer?.disconnect(); document.removeEventListener('keydown', this.onKey, true); window.removeEventListener('load', this.onLoad);
      for (const [name, original] of Object.entries(this.originals)) window[name] = original;
    }
  };
})();
