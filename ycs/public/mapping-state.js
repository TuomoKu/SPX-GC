// Pure mapping drafts. No DOM access, timers or network requests.
window.YCSMappingDrafts = class MappingDrafts {
  constructor() {
    this.models = new Map();
    this.current = null;
    this.selectionSequence = 0;
  }

  key(stage, graphic) {
    return stage + '\0' + graphic;
  }

  beginSelection() {
    this.current = null;
    return ++this.selectionSequence;
  }

  isLatest(sequence) {
    return sequence === this.selectionSequence;
  }

  load(stage, graphic, data) {
    const model = { ...data, stage, graphic, edits: new Map(), version: 0 };
    this.models.set(this.key(stage, graphic), model);
    return model;
  }

  binding(model, field, defaults) {
    const draft = model?.edits.get(field.field);
    if (!draft) return field.binding;
    if (draft.scope !== 'inherit') return draft.binding;
    return (
      defaults.find(
        (entry) =>
          entry.stage === model.stage &&
          entry.template === model.template &&
          entry.field === field.field
      )?.binding || null
    );
  }

  edit(model, field, binding, scope) {
    model.edits.set(field, {
      field,
      scope,
      binding: binding === null ? null : structuredClone(binding)
    });
  }

  setScope(model, scope) {
    for (const edit of model.edits.values()) edit.scope = scope;
  }

  changed(model) {
    model.version++;
  }

  saveBody(model) {
    return { revision: model.revision, edits: structuredClone([...model.edits.values()]) };
  }

  refresh(state) {
    if (!Array.isArray(state.mappings) || !Array.isArray(state.defaults)) return;
    for (const model of this.models.values()) {
      if (state.revision < model.revision) continue;
      for (const field of model.fields || []) {
        const override = state.mappings.find(entry => entry.stage === model.stage && entry.graphic === model.graphic && entry.field === field.field);
        const fallback = state.defaults.find(entry => entry.stage === model.stage && entry.template === model.template && entry.field === field.field);
        const saved = override || fallback;
        field.binding = saved?.source && !saved.binding ? { source: saved.source } : structuredClone(saved?.binding || null);
        field.origin = override ? 'override' : fallback ? 'default' : 'unassigned';
      }
    }
    // Keep edits and revisions: external changes must still cause save conflicts.
  }

  discard(model) {
    this.models.delete(this.key(model.stage, model.graphic));
  }

  acceptRevision(before, after) {
    if (!Number.isSafeInteger(after)) return;
    for (const model of this.models.values()) if (model.revision === before) model.revision = after;
  }

  dispose() {
    this.selectionSequence++;
    this.current = null;
  }
};
