// Coordinates selection, previews and saves. State, transport and rendering are separate collaborators.
window.YCSMappingWorkspace = class MappingWorkspace {
  constructor({ request, getState, message, onSaved }) {
    Object.assign(this, { request, getState, message, onSaved });
    this.$ = (id) => document.getElementById(id);
    this.drafts = new window.YCSMappingDrafts();
    this.models = this.drafts.models;
    this.api = new window.YCSMappingAPI((...args) => this.request(...args));
    this.graphics = [];
    this.stages = [];
    this.selectedField = null;
    this.previewSequence = 0;
    this.sheetNames = {};
    this.view = new window.YCSMappingView(this);
    this.collectionEditor = window.YCSCollectionEditor
      ? new window.YCSCollectionEditor(this)
      : null;
  }
  get selectionSequence() {
    return this.drafts.selectionSequence;
  }
  get model() {
    return this.drafts.current;
  }
  set model(value) {
    this.drafts.current = value;
  }
  selectSource(id) {
    if (this.view.groupedSources) {
      this.sourceId = this.view.groupedSources.select(id);
      this.view.groupedSources.iconSelect?.sync();
      this.renderSourceContext(); this.renderFields(); this.renderSourceValues();
      return;
    }
    this.sourceId = id;
    this.tableMode = false;
    this.renderSourceContext();
    this.renderFields();
    this.renderSourceValues();
  }
  changeScope(scope) {
    if (!this.model) return;
    if (this.model.edits.size) {
      this.drafts.setScope(this.model, scope);
      this.changed();
    } else if (scope === 'inherit') this.assign(null);
  }
  selectField(field) {
    this.selectedField = field;
  }
  editField(field, binding) {
    if (!this.current()) return;
    this.drafts.edit(this.model, field, binding, this.$('mapping-scope').value);
    this.changed(false);
  }
  browseAs(table) {
    this.tableMode = table;
    this.renderSourceContext();
    this.renderSourceValues();
    this.renderFields();
  }
  setBrowseRow(key, value) {
    this[key] = value;
    this.renderSourceValues();
    this.renderFields();
  }
  async initialize(stages) {
    this.stages = stages;
    const params = new URLSearchParams(location.search);
    const stage = stages.find((item) => item.id === params.get('stage')) || stages[0];
    this.view.setProjects(stages, stage?.project || stage?.id);
    if (!stage) {
      this.message('No configured rundowns are available.');
      return;
    }
    await this.selectProject(stage.id);
  }
  async selectProject(preferred) {
    this.view.setStages(this.stages, preferred);
    await this.selectStage();
  }
  beginSelection() {
    const sequence = this.drafts.beginSelection();
    this.previewSequence++;
    clearTimeout(this.previewTimer);
    this.endDrag();
    this.previewData = null;
    this.loading = true;
    this.view.showLoading();
    this.setBusy(true);
    this.status();
    return sequence;
  }
  current(model = this.model) {
    return Boolean(
      model &&
        !this.loading &&
        model === this.model &&
        model.stage === this.stage &&
        model.graphic === this.$('mapping-graphic').value
    );
  }
  async selectStage() {
    const sequence = this.beginSelection(),
      stage = this.$('mapping-stage').value;
    this.stage = stage;
    this.view.updateRundownLink();
    this.graphics = [];
    this.view.clearGraphics();
    this.renderGraphics();
    try {
      const graphics = await this.api.graphics(stage);
      if (sequence !== this.selectionSequence) return;
      this.graphics = graphics;
      this.view.populateGraphics(graphics, new URLSearchParams(location.search).get('graphic'));
      this.renderGraphics();
      await this.selectGraphic();
    } catch (error) {
      if (sequence === this.selectionSequence) {
        this.loading = false;
        this.setBusy(false);
        this.status();
        this.view.showEmpty('Could not load rundown');
        this.message(error.message, true);
      }
    }
  }
  key() {
    return this.stage + '\0' + this.$('mapping-graphic').value;
  }
  async selectGraphic(revert = false) {
    const graphic = this.$('mapping-graphic').value,
      stage = this.stage,
      key = this.key(),
      sequence = this.beginSelection();
    if (!graphic) {
      this.loading = false;
      this.setBusy(false);
      this.status();
      this.view.showEmpty('No graphics in this rundown');
      return;
    }
    try {
      let model = this.models.get(key);
      if (!model || revert) {
        const data = await this.api.load(stage, graphic);
        if (!this.drafts.isLatest(sequence)) return;
        model = this.drafts.load(stage, graphic, data);
      }
      if (!this.drafts.isLatest(sequence)) return;
      this.loading = false;
      this.setBusy(false);
      this.model = model;
      this.drafts.refresh(this.getState());
      this.previewData = null;
      this.view.clearPreviewError();
      this.selectedField =
        model.fields.find((field) => field.ftype === 'textfield')?.field ||
        model.fields[0]?.field ||
        null;
      this.view.showSelection(model);
      this.renderSources();
      this.renderFields();
      this.renderGraphics();
      this.renderSourceContext();
      this.renderSourceValues();
      this.status();
      this.schedulePreview();
      this.fitPreview();
    } catch (error) {
      if (sequence === this.selectionSequence) {
        this.loading = false;
        this.setBusy(false);
        this.status();
        this.view.showEmpty('Could not load graphic');
        this.message(error.message, true);
      }
    }
  }
  project() {
    return this.stages.find((item) => item.id === this.stage)?.project;
  }
  connection() {
    return this.getState()?.connections[this.sourceId];
  }
  binding(field) {
    return this.drafts.binding(this.model, field, this.getState().defaults || []);
  }
  bindingFor(model, field) {
    return this.drafts.binding(model, field, this.getState().defaults || []);
  }
  sourceLabel(binding) {
    return window.YCSMappingData.sourceLabel(binding, this.getState());
  }
  leaves() {
    return window.YCSMappingData.leaves({
      state: this.getState(),
      sourceId: this.sourceId,
      tableMode: this.tableMode,
      headerRow: this.headerRow,
      dataRow: this.dataRow
    });
  }
  equalPick(first, second) {
    return window.YCSMappingData.equalPick(first, second);
  }
  assign(binding) {
    if (!this.current() || !this.selectedField) return;
    if (binding !== null && (typeof binding !== 'object' || Array.isArray(binding)))
      return this.message('Choose a source value.', true);
    const field = this.model.fields.find((field) => field.field === this.selectedField),
      previous = this.binding(field);
    if (field?.ycsCollection && binding && binding.selection?.kind !== 'collection') {
      this.message('Use Map story list to select a range or JSON array.', true);
      return;
    }
    // Completed game only makes sense for a game count, so a new source must not inherit it
    // and quietly show one less than its value.
    if (binding && !Object.hasOwn(binding, 'transform') && previous?.transform && previous.transform.kind !== 'completed-game')
      binding = { ...binding, transform: previous.transform };
    this.drafts.edit(this.model, this.selectedField, binding, this.$('mapping-scope').value);
    this.changed();
  }
  changed(render = true) {
    this.drafts.changed(this.model);
    this.status();
    if (render) {
      this.renderFields();
      this.renderSourceValues();
    }
    this.renderGraphics();
    this.schedulePreview();
  }
  autoMap() {
    if (!this.model) return;
    const normal = window.YCSMappingData.normalName;
    const leaves = this.leaves();
    let count = 0;
    for (const field of this.model.fields) {
      if (field.ycsCollection || this.binding(field)) continue;
      const matches = leaves.filter(
        (leaf) =>
          [normal(field.title), normal(field.field)].includes(normal(leaf.name)) &&
          leaf.value !== null &&
          leaf.value !== undefined
      );
      if (matches.length === 1) {
        this.drafts.edit(
          this.model,
          field.field,
          matches[0].binding,
          this.$('mapping-scope').value
        );
        count++;
      }
    }
    if (count) this.changed();
    this.message(
      count
        ? `${count} exact name match${count === 1 ? '' : 'es'} added to the draft.`
        : 'No unique name matches. Choose cells/properties directly, or enable table-row browsing.'
    );
  }
  schedulePreview() {
    clearTimeout(this.previewTimer);
    this.previewTimer = setTimeout(() => this.preview(), 180);
  }
  async preview() {
    if (!this.current()) return;
    const model = this.model,
      sequence = ++this.previewSequence,
      { stage, graphic } = model;
    try {
      const result = await this.api.preview(stage, graphic, [...model.edits.values()]);
      if (sequence !== this.previewSequence || !this.current(model)) return;
      this.previewData = result;
      this.paintPreview();
      this.view.sendPreview(result.graphic);
    } catch (error) {
      if (sequence === this.previewSequence && this.current(model))
        this.view.previewError(error.message);
    }
  }
  async save() {
    if (!this.current() || !this.model.edits.size || this.saving) return;
    const model = this.model,
      { stage, graphic } = model,
      version = model.version;
    const body = this.drafts.saveBody(model);
    this.saving = true;
    this.view.setSaving(true);
    try {
      const data = await this.api.save(stage, graphic, body);
      this.acceptRevision(body.revision, data.revision);
      this.drafts.refresh(data);
      this.onSaved(data);
      if (this.current(model) && model.version === version) await this.selectGraphic(true);
      else if (model.version === version) this.drafts.discard(model);
      this.message(
        'Mapping saved. Enable its field links in the rundown, then Preview / Play / Update as needed.'
      );
    } catch (error) {
      this.message(error.message, true);
    } finally {
      this.saving = false;
      this.view.setSaving(false);
    }
  }
  acceptRevision(before, after) {
    this.drafts.acceptRevision(before, after);
  }
  update(state) {
    this.drafts.refresh(state);
    if (!this.model) return;
    const fingerprint = JSON.stringify([
      state.revision,
      Object.entries(state.connections || {}).map(([id, item]) => [
        id,
        item.rows,
        item.data,
        item.health
      ])
    ]);
    if (fingerprint === this.fingerprint) return;
    this.fingerprint = fingerprint;
    if (this.sourceRevision !== state.revision) {
      this.sourceRevision = state.revision;
      this.renderSources();
      this.renderFields();
    }
    this.renderSourceValues();
    this.schedulePreview();
  }
  dispose() {
    this.disposed = true;
    this.collectionEditor?.dispose();
    this.view.dispose();
    clearTimeout(this.previewTimer);
    this.previewSequence++;
    this.drafts.dispose();
  }
  node(...args) {
    return this.view.node(...args);
  }
  option(...args) {
    return this.view.option(...args);
  }
  control(...args) {
    return this.view.control(...args);
  }
  fieldLabel(...args) {
    return this.view.fieldLabel(...args);
  }
  setBusy(...args) {
    return this.view.setBusy(...args);
  }
  renderGraphics(...args) {
    return this.view.renderGraphics(...args);
  }
  renderSources(...args) {
    this.sourceId = this.view.renderSources(...args);
  }
  renderSourceContext() {
    this.view.renderSourceContext();
    const connection = this.connection();
    if (connection?.type !== 'google-sheets' || this.sheetNames[connection.settings.url]) return;
    const url = connection.settings.url;
    this.api.worksheetNames(url).then((names) => {
      if (this.disposed) return;
      this.sheetNames[url] = names;
      const current = this.connection();
      if (current?.settings.url === url) this.view.setWorksheetLabel(current, names);
    });
  }
  renderSourceValues(...args) {
    return this.view.renderSourceValues(...args);
  }
  moveDrag(...args) {
    return this.view.moveDrag(...args);
  }
  endDrag(...args) {
    return this.view.endDrag(...args);
  }
  renderFields(...args) {
    return this.view.renderFields(...args);
  }
  renderCollectionField(...args) {
    return this.view.renderCollectionField(...args);
  }
  status(...args) {
    return this.view.status(...args);
  }
  openCells(...args) {
    return this.view.openCells(...args);
  }
  openLookup(...args) {
    return this.view.openLookup(...args);
  }
  paintPreview(...args) {
    return this.view.paintPreview(...args);
  }
  fitPreview(...args) {
    return this.view.fitPreview(...args);
  }
};
