window.YCSGroupedMappingSources = class GroupedMappingSources {
  constructor(view) { this.view = view; this.workspace = view.workspace; this.memory = new Map(); this.groupMemory = new Map(); }
  configure(id) {
    const w = this.workspace, metadata = w.getState().connections[id]?.sheetRange;
    if (id !== this.appliedRange) {
      w.tableMode = metadata?.headerRow != null;
      w.headerRow = metadata?.headerRow || undefined; w.dataRow = metadata?.dataRow || undefined;
      this.appliedRange = id;
    }
    return id;
  }
  select(value) {
    const w = this.workspace, state = w.getState();
    const hierarchy = document.getElementById('mapping-source-hierarchy');
    hierarchy.replaceChildren();
    if (!value.startsWith('book:')) return this.configure(value);
    const id = value.slice(5), book = state.workbooks[id];
    if (!book) return '';
    const stage = w.stages.find(stage => stage.id === w.stage);
    const normalize = text => String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const matched = Object.entries(book.groups).find(([, group]) => [stage?.id, stage?.title, stage?.project].some(name => normalize(group.label) === normalize(name)));
    const stageKey = id + ':' + w.stage;
    const groupId = this.groupMemory.get(stageKey) && book.groups[this.groupMemory.get(stageKey)] ? this.groupMemory.get(stageKey) : matched?.[0] || Object.keys(book.groups)[0];
    const groups = this.view.control(Object.entries(book.groups).map(([key, group]) => [key, group.label]), groupId, 'Source group');
    groups.id = 'mapping-source-group';
    hierarchy.append(this.view.fieldLabel('Group', groups));
    const ranges = Object.entries(state.connections).filter(([, range]) => range.sheetRange?.workbook === id && range.sheetRange.group === groupId);
    const memoryKey = id + ':' + groupId;
    const connectionId = this.memory.get(memoryKey) && ranges.some(([key]) => key === this.memory.get(memoryKey)) ? this.memory.get(memoryKey) : ranges.find(([key]) => key === w.sourceId)?.[0] || ranges[0]?.[0] || '';
    const rangeSelect = this.view.control(ranges.map(([key, range]) => [key, range.label]), connectionId, 'Named range');
    rangeSelect.id = 'mapping-source-range'; hierarchy.append(this.view.fieldLabel('Named range', rangeSelect));
    groups.onchange = () => { this.groupMemory.set(stageKey, groups.value); w.sourceId = this.select(value); this.repaint(); };
    rangeSelect.onchange = () => { this.memory.set(memoryKey, rangeSelect.value); w.sourceId = this.configure(rangeSelect.value); this.repaint(); };
    return this.configure(connectionId);
  }
  repaint() { this.workspace.renderSourceContext(); this.workspace.renderSourceValues(); this.workspace.renderFields(); }
  render() {
    const w = this.workspace, state = w.getState(), select = document.getElementById('mapping-source');
    const previous = select.value;
    select.replaceChildren();
    const append = (id, text, type) => { const option = document.createElement('option'); option.value = id; option.textContent = text; option.dataset.type = type; select.append(option); };
    for (const [id, book] of Object.entries(state.workbooks || {})) append('book:' + id, book.label, 'google-sheets');
    for (const [id, connection] of Object.entries(state.connections || {})) if (!connection.sheetRange && (!connection.project || connection.project === w.project())) append(id, connection.label, connection.type);
    for (const [id, source] of Object.entries(state.sources || {})) if (source.type === 'local') append('local:' + id, source.label, 'local-json');
    const currentBook = state.connections[w.sourceId]?.sheetRange?.workbook;
    const preferred = currentBook ? 'book:' + currentBook : w.sourceId || previous;
    if ([...select.options].some(option => option.value === preferred)) select.value = preferred;
    this.iconSelect ||= new YCSSourceSelect(select); this.iconSelect.sync();
    return this.select(select.value);
  }
};
