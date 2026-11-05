window.YCSWorkbookSources = class WorkbookSources {
  constructor({ request, getState, accept, openRange, openOther }) {
    Object.assign(this, { request, getState, accept, openRange, openOther });
    this.$ = id => document.getElementById(id);
    this.groups = new Map(); this.openBooks = new Set();
    this.$('add-spreadsheet').onclick = () => this.openWorkbook();
    this.$('workbook-form').onsubmit = event => this.submit(event, async () => {
      const result = await this.request('/data/workbooks', { id: this.editBook, label: this.$('workbook-label').value, settings: { url: this.$('workbook-url').value, refreshSeconds: Number(this.$('workbook-refresh').value) }, revision: this.revision });
      this.openBooks.add(result.workbookId); this.accept(result.snapshot); this.$('workbook-dialog').close();
    }, 'workbook-error');
    this.$('group-form').onsubmit = event => this.submit(event, async () => {
      const result = await this.request(`/data/workbooks/${this.groupBook}/groups`, { id: this.editGroup, label: this.$('group-label').value, worksheet: this.$('group-worksheet').value, revision: this.revision });
      this.groups.set(this.groupBook, result.groupId); this.accept(result.snapshot); this.$('group-dialog').close();
    }, 'group-error');
    for (const id of ['workbook', 'group']) this.$('close-' + id).onclick = () => this.$(id + '-dialog').close();
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
    this.$('group-label').value = group?.label || ''; this.$('group-worksheet').value = group?.worksheet || '0'; this.$('group-error').textContent = '';
    this.$('group-title').textContent = group ? 'Edit group' : 'Add group'; this.$('group-dialog').showModal();
    const sequence = this.groupSequence = (this.groupSequence || 0) + 1;
    try {
      const result = await this.request('/data/sheets/worksheets', { url: book.settings.url });
      if (sequence !== this.groupSequence || !this.$('group-dialog').open) return;
      this.$('group-worksheets').replaceChildren(...result.worksheets.map(tab => { const o = this.node('option'); o.value = tab.name; o.label = tab.name; return o; }));
      if (!group && result.worksheets.length) this.$('group-worksheet').value = result.worksheets[0].name;
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
      const card = this.node('article', undefined, 'connection workbook-source'), top = this.node('div', undefined, 'connection-top');
      const title = this.button(book.label, () => { if (this.openBooks.has(id)) this.openBooks.delete(id); else this.openBooks.add(id); this.accept(this.getState()); });
      title.className = 'workbook-title'; title.prepend(YCSSourceIcons.node('google-sheets')); title.setAttribute('aria-expanded', String(this.openBooks.has(id)));
      const actions = this.node('div', undefined, 'connection-actions');
      actions.append(this.button('Refresh', async () => this.accept(await this.request(`/data/workbooks/${id}/refresh`, {}))), this.button('Edit', () => this.openWorkbook(id)), this.button('Remove', async () => this.accept(await this.request(`/data/workbooks/${id}/remove`, { revision: state.revision }))));
      top.append(title, actions); card.append(top);
      const metrics = this.node('p', '', 'meta'); metrics.dataset.workbookMetrics = id; card.append(metrics);
      const body = this.node('div', undefined, 'workbook-body'); body.hidden = !this.openBooks.has(id);
      const sidebar = this.node('div', undefined, 'workbook-groups'), content = this.node('div', undefined, 'workbook-ranges');
      const groupId = this.groups.get(id) && book.groups[this.groups.get(id)] ? this.groups.get(id) : Object.keys(book.groups)[0];
      this.groups.set(id, groupId);
      for (const [key, group] of Object.entries(book.groups)) {
        const button = this.button(group.label, () => { this.groups.set(id, key); this.accept(this.getState()); }); button.setAttribute('aria-pressed', String(key === groupId)); sidebar.append(button);
      }
      sidebar.append(this.button('+ Add group', () => this.openGroup(id)));
      if (groupId) {
        const group = book.groups[groupId], heading = this.node('div', undefined, 'section-heading'), controls = this.node('div', undefined, 'connection-actions');
        controls.append(this.button('+ Add range', () => this.openRange(id, groupId)), this.button('Edit group', () => this.openGroup(id, groupId)), this.button('Remove group', async () => this.accept(await this.request(`/data/workbooks/${id}/groups/${groupId}/remove`, { revision: state.revision }))));
        heading.append(this.node('h3', group.label), controls); content.append(heading);
        for (const [rangeId, range] of Object.entries(state.connections).filter(([, range]) => range.sheetRange?.workbook === id && range.sheetRange.group === groupId)) {
          const row = this.node('div', undefined, 'named-range-row'), text = this.node('div'), buttons = this.node('div', undefined, 'connection-actions');
          text.append(this.node('strong', range.label), this.node('p', range.settings.worksheet + ' · ' + range.settings.range, 'meta'));
          buttons.append(this.button('Edit', () => this.openRange(id, groupId, rangeId)), this.button('Remove', async () => this.accept(await this.request(`/data/connections/${rangeId}/remove`, { revision: state.revision }))));
          row.append(text, buttons); content.append(row);
        }
      }
      body.append(sidebar, content); card.append(body); container.append(card);
    }
    this.updateMetrics();
  }
};
