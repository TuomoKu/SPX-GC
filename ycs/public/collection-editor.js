// Coordinates a local collection draft, its dialog and mapping preview requests.
window.YCSCollectionEditor = class CollectionEditor {
  constructor(workspace) {
    this.workspace = workspace;
    this.$ = workspace.$;
    this.sequence = 0;
    this.api = workspace.api || new window.YCSMappingAPI((...args) => workspace.request(...args));
    this.view = new window.YCSCollectionView(this);
  }
  get pick() {
    return this.draft?.pick;
  }
  get connectionId() {
    return this.draft?.connectionId;
  }
  sources() {
    return Object.entries(this.workspace.getState().connections || {}).filter(
      ([, source]) => !source.project || source.project === this.workspace.project()
    ).map(([id, source]) => {
      if (!source.sheetRange) return [id, source];
      const state = this.workspace.getState(), book = state.workbooks?.[source.sheetRange.workbook];
      return [id, { ...source, label: [book?.label, book?.groups[source.sheetRange.group]?.label, source.label].filter(Boolean).join(' / ') }];
    });
  }
  connection() {
    return this.workspace.getState().connections[this.connectionId];
  }
  async open(field) {
    this.cancelPending();
    this.field = field;
    this.model = this.workspace.model;
    this.schema = field.ycsCollection;
    this.stage = this.model.stage || this.workspace.stage;
    this.graphic = this.model.graphic || this.$('mapping-graphic').value;
    const binding = this.workspace.binding(field),
      sources = this.sources();
    let id =
      binding?.selection?.kind === 'collection' ? binding.connection : this.workspace.sourceId;
    if (!sources.some(([key]) => key === id)) id = sources[0]?.[0];
    if (!id) {
      this.draft = null;
      this.view.noSource();
      this.view.show(field.title);
      return;
    }
    this.draft = new window.YCSCollectionDraft(
      this.schema,
      id,
      this.workspace.getState().connections[id],
      binding?.selection?.kind === 'collection' ? binding : null
    );
    this.render();
    this.view.show(field.title);
    await this.preview();
  }
  render() {
    this.view.render(this.draft, this.sources());
  }
  selectSource(id) {
    this.draft = new window.YCSCollectionDraft(
      this.schema,
      id,
      this.workspace.getState().connections[id],
      null
    );
    this.render();
    this.change();
  }
  editRange(value) {
    this.draft.range(value);
    this.change();
  }
  editHeader(value) {
    this.draft.header(value, this.connection());
    this.render();
    this.change();
  }
  editArray(value) {
    this.draft.array(value, this.connection());
    this.render();
    this.change();
  }
  editField(field, value) {
    this.draft.setField(field, value);
    this.change();
  }
  change() {
    this.cancelPending();
    this.view.waiting();
    this.timer = setTimeout(() => this.preview(), 200);
  }
  currentBinding() {
    return this.draft.binding();
  }
  async preview() {
    clearTimeout(this.timer);
    const sequence = ++this.sequence;
    this.validBinding = null;
    this.view.waiting();
    if (!this.connectionId) return;
    try {
      const binding = this.currentBinding();
      const data = await this.api.previewCollection({
        stage: this.stage,
        graphic: this.graphic,
        model: this.model,
        field: this.field.field,
        binding,
        scope: this.$('mapping-scope').value
      });
      if (sequence !== this.sequence || !this.view.open) return;
      const field = data.fields.find((field) => field.field === this.field.field);
      this.report = field.collection;
      this.validBinding = field.error ? null : binding;
      this.view.result(field, this.schema);
    } catch (error) {
      if (sequence === this.sequence && this.view.open) {
        this.validBinding = null;
        this.view.error(error.message);
      }
    }
  }
  apply() {
    if (!this.view.canApply || !this.validBinding || this.workspace.model !== this.model) return;
    this.workspace.selectedField = this.field.field;
    this.workspace.assign(this.validBinding);
    this.close();
  }
  cancelPending() {
    this.sequence++;
    this.validBinding = null;
    clearTimeout(this.timer);
  }
  close() {
    this.cancelPending();
    this.view.close();
  }
  dispose() {
    this.close();
    this.view.dispose();
  }
};
