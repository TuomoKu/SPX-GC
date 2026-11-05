window.YCSWorkbookSources = class WorkbookSources {
  constructor({ request, getState, accept, openRange, openOther }) {
    Object.assign(this, { request, getState, accept, openRange, openOther });
    this.$ = id => document.getElementById(id);
    this.groups = new Map(); this.openBooks = new Set();
    this.$('add-connection').onclick = () => this.$('source-choice-dialog').showModal();
    this.$('close-source-choice').onclick = () => this.$('source-choice-dialog').close();
    for (const button of document.querySelectorAll('[data-create-source]')) {
      const type = button.dataset.createSource;
      button.prepend(YCSSourceIcons.node(type));
      button.onclick = () => {
        this.$('source-choice-dialog').close();
        if (type === 'google-sheets') this.openWorkbook(); else this.openOther(type);
      };
    }
    this.$('workbook-form').onsubmit = event => this.submit(event, async () => {
      const result = await this.request('/data/workbooks', { id: this.editBook, label: this.$('workbook-label').value, settings: { url: this.$('workbook-url').value, refreshSeconds: Number(this.$('workbook-refresh').value) }, revision: this.revision });
      this.openBooks.add(result.workbookId); this.accept(result.snapshot); this.$('workbook-dialog').close();
    }, 'workbook-error');
    this.$('group-form').onsubmit = event => this.submit(event, async () => {
      const result = await this.request(`/data/workbooks/${this.groupBook}/groups`, { id: this.editGroup, label: this.$('group-label').value, worksheet: this.$('group-worksheet').value, revision: this.revision });
      this.groups.set(this.groupBook, result.groupId); this.accept(result.snapshot); this.$('group-dialog').close();
    }, 'group-error');
    for (const id of ['workbook', 'group']) {
      this.$('close-' + id).onclick = () => this.$(id + '-dialog').close();
      this.$('cancel-' + id).onclick = () => this.$(id + '-dialog').close();
    }
    this.$('workbook-test').onclick = async () => {
      const url = this.$('workbook-url').value;
      this.$('workbook-test').disabled = true;
      try { const result = await this.request('/data/sheets/worksheets', { url }); if (url === this.$('workbook-url').value) this.$('workbook-error').textContent = result.worksheets.length + ' worksheets'; }
      catch (error) { this.$('workbook-error').textContent = error.message; }
      finally { this.$('workbook-test').disabled = false; }
    };
  }
  node(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
  button(text, callback) { const button = this.node('button', text); button.type = 'button'; button.onclick = async () => { button.disabled = true; try { await callback(); } catch (error) { document.getElementById('message').textContent = error.message; } finally { button.disabled = false; } }; return button; }
  async submit(event, operation, errorId) { event.preventDefault(); const button = event.target.querySelector('[type=submit]'); button.disabled = true; this.$(errorId).textContent = ''; try { await operation(); } catch (error) { this.$(errorId).textContent = error.message; } finally { button.disabled = false; } }
  openWorkbook(id = null) {
    const book = this.getState().workbooks?.[id]; this.editBook = id; this.revision = this.getState().revision;
    this.$('workbook-label').value = book?.label || ''; this.$('workbook-url').value = book?.settings.url || ''; this.$('workbook-url').readOnly = Boolean(book && Object.values(this.getState().connections).some(c => c.sheetRange?.workbook === id));
    this.$('workbook-refresh').value = book?.settings.refreshSeconds ?? 5; this.$('workbook-error').textContent = '';
    this.$('workbook-title').textContent = book ? 'Edit spreadsheet' : 'Add spreadsheet'; this.$('workbook-dialog').showModal();
  }
  async openGroup(bookId, groupId = null) {
    const book = this.getState().workbooks[bookId], group = book.groups[groupId];
    this.groupBook = bookId; this.editGroup = groupId; this.revision = this.getState().revision;
    this.$('group-label').value = group?.label || '';
    const fallback = this.node('option', group?.worksheet || 'Loading worksheets…');
    fallback.value = group?.worksheet || '0'; this.$('group-worksheet').replaceChildren(fallback);
    this.$('group-error').textContent = '';
    this.$('group-title').textContent = group ? 'Edit group' : 'Add group'; this.$('group-dialog').showModal();
    const sequence = this.groupSequence = (this.groupSequence || 0) + 1;
    try {
      const result = await this.request('/data/sheets/worksheets', { url: book.settings.url });
      if (sequence !== this.groupSequence || !this.$('group-dialog').open) return;
      const selected = result.worksheets.find(tab => tab.name === group?.worksheet || tab.id === group?.worksheet);
      this.$('group-worksheet').replaceChildren(...result.worksheets.map(tab => { const o = this.node('option', tab.name); o.value = tab.name; return o; }));
      if (group && !selected) this.$('group-worksheet').append(fallback);
      this.$('group-worksheet').value = selected?.name || group?.worksheet || result.worksheets[0]?.name || '0';
    } catch (error) { if (sequence === this.groupSequence) this.$('group-error').textContent = error.message; }
  }
  updateMetrics() {
    for (const element of document.querySelectorAll('[data-workbook-metrics]')) {
      const book = this.getState().workbooks?.[element.dataset.workbookMetrics];
      if (book) element.textContent = `Last sync: ${book.lastSync ? new Date(book.lastSync).toLocaleTimeString() : '—'} · Requests/min: ${book.requestsPerMinute}`;
    }
  }
  render(container) {
    const state = this.getState();
    for (const [id, book] of Object.entries(state.workbooks || {})) {
      const card = this.node('article', undefined, 'connection workbook-source');
      const header = this.node('div', undefined, 'workbook-header');
      const title = this.button('', () => { if (this.openBooks.has(id)) this.openBooks.delete(id); else this.openBooks.add(id); this.accept(this.getState()); });
      title.className = 'workbook-title'; title.setAttribute('aria-expanded', String(this.openBooks.has(id)));
      const names = this.node('span', undefined, 'workbook-title-text');
      const count = Object.values(state.connections).filter(range => range.sheetRange?.workbook === id).length;
      const groupCount = Object.keys(book.groups).length;
      names.append(this.node('strong', book.label), this.node('small', `Google Sheets · ${groupCount} group${groupCount === 1 ? '' : 's'} · ${count} range${count === 1 ? '' : 's'}`));
      title.append(YCSSourceIcons.node('google-sheets'), names, this.node('span', this.openBooks.has(id) ? '⌃' : '⌄', 'workbook-chevron'));
      header.append(title, this.menu('Source actions', [
        this.button('Edit source', () => this.openWorkbook(id)),
        this.button('Remove source', async () => this.accept(await this.request(`/data/workbooks/${id}/remove`, { revision: this.getState().revision })))
      ]));
      card.append(header);
      const toolbar = this.node('form', undefined, 'workbook-toolbar'), interval = this.node('input');
      interval.type = 'number'; interval.min = '0'; interval.step = 'any'; interval.required = true;
      interval.value = book.settings.refreshSeconds; interval.setAttribute('aria-label', 'Refresh interval in seconds');
      const intervalLabel = this.node('label', 'Refresh interval (seconds)'); intervalLabel.append(interval);
      const save = this.node('button', 'Save interval'); save.type = 'submit'; save.hidden = true;
      interval.oninput = () => { save.hidden = Number(interval.value) === book.settings.refreshSeconds; interval.setCustomValidity(Number(interval.value) > 0 ? '' : 'Enter a positive interval.'); };
      toolbar.onsubmit = async event => {
        event.preventDefault(); save.disabled = true;
        try { const result = await this.request('/data/workbooks', { id, label: book.label, settings: { ...book.settings, refreshSeconds: Number(interval.value) }, revision: this.getState().revision }); this.accept(result.snapshot); }
        catch (error) { this.$('message').textContent = error.message; }
        finally { save.disabled = false; }
      };
      toolbar.append(intervalLabel, save, this.button('Refresh all', async () => this.accept(await this.request(`/data/workbooks/${id}/refresh`, {}))));
      card.append(toolbar);
      const body = this.node('div', undefined, 'workbook-body'); body.hidden = !this.openBooks.has(id);
      const sidebar = this.node('div', undefined, 'workbook-groups'), content = this.node('div', undefined, 'workbook-ranges');
      sidebar.append(this.node('div', 'Groups', 'workbook-eyebrow'));
      const groupId = this.groups.get(id) && book.groups[this.groups.get(id)] ? this.groups.get(id) : Object.keys(book.groups)[0];
      this.groups.set(id, groupId);
      for (const [key, group] of Object.entries(book.groups)) {
        const button = this.button('', () => { this.groups.set(id, key); this.accept(this.getState()); });
        const count = Object.values(state.connections).filter(range => range.sheetRange?.workbook === id && range.sheetRange.group === key).length;
        button.append(this.node('span', group.label), this.node('small', count));
        button.setAttribute('aria-pressed', String(key === groupId)); sidebar.append(button);
      }
      sidebar.append(this.button('+ Add group', () => this.openGroup(id)));
      if (groupId) {
        const group = book.groups[groupId], heading = this.node('div', undefined, 'section-heading'), controls = this.node('div', undefined, 'connection-actions');
        const add = this.button('+ Add range', () => this.openRange(id, groupId)); add.className = 'primary';
        controls.append(add, this.menu('Group actions', [this.button('Edit group', () => this.openGroup(id, groupId)), this.button('Remove group', async () => this.accept(await this.request(`/data/workbooks/${id}/groups/${groupId}/remove`, { revision: this.getState().revision })))]));
        const groupTitle = this.node('div'); groupTitle.append(this.node('h3', group.label), this.node('p', 'Default worksheet: ' + group.worksheet, 'meta'));
        heading.append(groupTitle, controls); content.append(heading);
        for (const [rangeId, range] of Object.entries(state.connections).filter(([, range]) => range.sheetRange?.workbook === id && range.sheetRange.group === groupId)) {
          const row = this.node('div', undefined, 'named-range-row'), text = this.node('div'), buttons = this.node('div', undefined, 'connection-actions');
          text.append(this.node('strong', range.label), this.node('p', range.settings.worksheet + ' · ' + range.settings.range, 'meta'));
          buttons.append(this.button('Edit range', () => this.openRange(id, groupId, rangeId)), this.menu('Range actions', [this.button('Remove range', async () => this.accept(await this.request(`/data/connections/${rangeId}/remove`, { revision: this.getState().revision })))]));
          row.append(text, buttons); content.append(row);
        }
      }
      body.append(sidebar, content); card.append(body);
      const metrics = this.node('div', '', 'workbook-footer'); metrics.dataset.workbookMetrics = id; card.append(metrics);
      container.append(card);
    }
    this.updateMetrics();
  }
  menu(name, buttons) {
    const menu = this.node('details', undefined, 'workbook-menu'), summary = this.node('summary', '⋯');
    summary.setAttribute('aria-label', name);
    const list = this.node('div', undefined, 'workbook-menu-list'); list.append(...buttons);
    menu.append(summary, list); return menu;
  }
};
