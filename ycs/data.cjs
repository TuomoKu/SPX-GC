'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { randomUUID, createHash } = require('node:crypto');
const { PublicSheets, normalizeSettings } = require('./public-sheets.cjs');
const { JSONAPI, normalizeJSONSettings } = require('./json-api.cjs');
const sourceTypes = require('./public/source-types.js');
const { LocalFiles, normalizeLocalSettings } = require('./local-files.cjs');
const { linkable } = require('./field-types.cjs');
const { selection, resolve, transform, normalizeTransform } = require('./bindings.cjs');
const { writeText } = require('../utils/config-store.cjs');
const clone = (value) => structuredClone(value);
const empty = () => ({ version: 2, revision: 0, sources: {}, connections: {}, mappings: [], defaults: [] });
const keyPattern = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,95}$/;
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
function cachedValue(value) {
  if (typeof value !== 'string' || value.length > 65536) return false;
  if (value.length <= 300 && value.trim()) return true;
  try {
    return Array.isArray(JSON.parse(value));
  } catch {
    return false;
  }
}
function text(value) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 300;
}
function connectionSettings(input) {
  const settings = normalizeSettings(input);
  delete settings.cell;
  return settings;
}
function normalizeConnectionSettings(type, settings) {
  if (sourceTypes.isLocal(type)) return normalizeLocalSettings(settings, type);
  return type === 'json-api' ? normalizeJSONSettings(settings) : connectionSettings(settings);
}
function target(settings) {
  return {
    url: settings.url,
    worksheet: settings.worksheet,
    range: settings.range,
    ...(settings.file
      ? {
          file: settings.file,
          delimiter: settings.delimiter,
          ...(settings.location ? { location: settings.location } : {})
        }
      : {})
  };
}
function binding(document, input) {
  if (input?.selection?.kind === 'collection' && input.transform && input.transform.kind !== 'none')
    fail('Apply transforms to individual values, not a story list');
  const change = normalizeTransform(input?.transform),
    extra = change ? { transform: change } : {};
  if (input && Object.hasOwn(input, 'static')) {
    if (typeof input.static !== 'string' || input.static.length > 300)
      fail('Static values must be text up to 300 characters');
    return { static: input.static, ...extra };
  }
  if (input === null) return null;
  if (input?.source && Object.hasOwn(document.sources, input.source))
    return { source: input.source, ...extra };
  const connection =
    Object.hasOwn(document.connections, input?.connection) &&
    document.connections[input.connection];
  if (!connection) fail('Choose a saved connection');
  if (
    sourceTypes.isJSON(connection) !==
    (input.selection?.kind === 'json' ||
      (input.selection?.kind === 'collection' && input.selection.format === 'json'))
  )
    fail('Choose a compatible source value');
  return {
    connection: input.connection,
    selection: selection(input.selection, connection.settings),
    ...extra
  };
}
function validate(document) {
  if (
    !document ||
    document.version !== 2 ||
    !Number.isSafeInteger(document.revision) ||
    document.revision < 0 ||
    !document.sources ||
    Array.isArray(document.sources) ||
    !document.connections ||
    Array.isArray(document.connections) ||
    !Array.isArray(document.mappings) ||
    !Array.isArray(document.defaults)
  )
    fail('Invalid local data document');
  if (
    Object.keys(document.sources).length > 300 ||
    Object.keys(document.connections).length > 100 ||
    document.mappings.length + document.defaults.length > 1000
  )
    fail('Too many data connections or mappings');
  for (const [id, connection] of Object.entries(document.connections)) {
    if (
      !keyPattern.test(id) ||
      !text(connection.label) ||
      !sourceTypes.supported(connection) ||
      (connection.project !== undefined && !keyPattern.test(connection.project)) ||
      JSON.stringify(normalizeConnectionSettings(connection.type, connection.settings)) !==
        JSON.stringify(connection.settings)
    )
      fail('Invalid connection');
  }
  for (const [id, source] of Object.entries(document.sources)) {
    if (!keyPattern.test(id) || !source || !text(source.label)) fail('Invalid source label');
    if (source.type === 'connection-value') {
      if (!source.binding?.connection) fail('Invalid source alias');
      binding(document, source.binding);
    } else if ((source.type && source.type !== 'local') || !text(source.value))
      fail('Local values must be nonempty text, up to 300 characters');
  }
  for (const [list, owner] of [
    [document.mappings, 'graphic'],
    [document.defaults, 'template']
  ]) {
    const seen = new Set();
    for (const mapping of list) {
      if (
        !mapping ||
        typeof mapping.stage !== 'string' ||
        !keyPattern.test(mapping.stage) ||
        typeof mapping.field !== 'string' ||
        !keyPattern.test(mapping.field) ||
        typeof mapping[owner] !== 'string' ||
        !mapping[owner] ||
        mapping[owner].length > 500 ||
        (owner === 'graphic' && !keyPattern.test(mapping.graphic))
      )
        fail('Invalid mapping');
      if (mapping.source) {
        if (!Object.hasOwn(document.sources, mapping.source)) fail('Unknown source');
      } else binding(document, mapping.binding);
      const key = JSON.stringify([mapping.stage, mapping[owner], mapping.field]);
      if (seen.has(key)) fail('Duplicate field mapping');
      seen.add(key);
    }
  }
  return document;
}
function migrate(input) {
  if (input?.version !== 1) return input;
  const document = clone(input);
  document.version = 2;
  document.connections = {};
  document.defaults = [];
  for (const source of Object.values(document.sources))
    if (source.type === 'google-sheets') {
      const settings = connectionSettings(source.settings),
        id = 'sheet.' + hash(settings).slice(0, 24);
      document.connections[id] ||= { type: 'google-sheets', label: source.label, settings };
      source.binding = { connection: id, selection: { kind: 'cell', cell: source.settings.cell } };
      source.type = 'connection-value';
      delete source.settings;
    }
  for (const mapping of document.mappings)
    if (document.sources[mapping.source]?.binding) {
      mapping.binding = clone(document.sources[mapping.source].binding);
      delete mapping.source;
    }
  return validate(document);
}
class DataSources extends EventEmitter {
  constructor(
    file,
    stages,
    {
      sheets = new PublicSheets(),
      json = new JSONAPI(),
      localFiles = new LocalFiles(path.join(path.dirname(file), 'data-sources')),
      now = Date.now
    } = {}
  ) {
    super();
    Object.assign(this, {
      file: path.resolve(file),
      stages,
      sheets,
      json,
      localFiles,
      now,
      error: '',
      document: null,
      checkedAt: null,
      closed: false
    });
    this.runtimes = new Map();
    this.bindings = new Map();
    this.good = {};
    this.inFlight = new Map();
    this.controllers = new Set();
    this.referenceTimes = new Map();
    this.retained = new Map();
    this.createdAt = now();
    this.cacheFile = this.file.replace(/\.json$/i, '') + '.sheets-cache.json';
    this.cache = {};
    this.serial = Promise.resolve();
    this.cacheSerial = Promise.resolve();
    this.activeReferences = () => [];
    this.ready = this.initialize().catch(() => {
      this.error = 'Local JSON source unavailable or invalid; retaining last valid values';
    });
  }
  async initialize() {
    // A missing data file is never recreated here: seeding demo sources at
    // startup put demo values on air. Linked fields use manual values until the
    // file is available; setup/demo/rehearsal scripts write their own data.
    try {
      const raw = await fs.readFile(this.cacheFile, 'utf8');
      if (raw.length < 4194304) {
        const cache = JSON.parse(raw);
        if (cache.version === 2) {
          this.cache = cache.connections || {};
          this.good = Object.fromEntries(
            Object.entries(cache.good || {}).filter(
              ([key, value]) => key.startsWith('bind.') && cachedValue(value)
            )
          );
        } else this.legacyCache = cache.values;
      }
    } catch {
      /* Cache is optional; manual fields remain usable. */
    }
    const original = await fs.readFile(this.file, 'utf8').catch((error) => {
      if (error.code !== 'ENOENT') throw error;
      console.error(`[YCS data] DATA FILE NOT FOUND: ${this.file}. Linked fields use their manual values until it is available.`);
    });
    const parsed = original === undefined ? null : JSON.parse(original.replace(/^\uFEFF/, ''));
    if (parsed?.version === 1) {
      const next = migrate(parsed);
      this.document = next;
      await fs.writeFile(this.file + '.v1-backup.json', original, { flag: 'wx' }).catch((error) => {
        if (error.code !== 'EEXIST') throw error;
      });
      await writeText(this.file, JSON.stringify(next, null, 2));
      for (const [id, source] of Object.entries(parsed.sources)) {
        const saved = this.legacyCache?.[id];
        if (
          saved?.fingerprint === hash(source.settings) &&
          text(saved.value) &&
          next.sources[id].binding
        )
          this.good[this.reference(next.sources[id].binding)] = saved.value;
      }
    }
    await this.read();
  }
  queue(operation) {
    const result = this.serial.then(operation);
    this.serial = result.catch(() => {});
    return result;
  }
  async read() {
    const previous = JSON.stringify([this.document, this.error]);
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      if (raw.length > 1048576) fail('Local data file is too large');
      const next = clone(validate(JSON.parse(raw.replace(/^\uFEFF/, ''))));
      if (
        this.document &&
        (next.revision < this.document.revision ||
          (next.revision === this.document.revision &&
            JSON.stringify(next) !== JSON.stringify(this.document)))
      )
        fail('External edits must advance the revision');
      this.document = next;
      this.syncRuntimes();
      this.error = '';
      this.missing = false;
    } catch (error) {
      this.missing = !this.document && error.code === 'ENOENT';
      this.error = this.missing
        ? 'Data file not found; linked fields use their manual values'
        : 'Local JSON source unavailable or invalid; retaining last valid values';
    }
    this.checkedAt = new Date().toISOString();
    if (previous !== JSON.stringify([this.document, this.error])) this.emit('change');
    return this.snapshot();
  }
  refresh() {
    return this.queue(async () => {
      await this.ready;
      return this.read();
    });
  }
  syncRuntimes() {
    for (const [id, connection] of Object.entries(this.document.connections)) {
      const fingerprint = hash(connection.settings);
      if (this.runtimes.get(id)?.fingerprint === fingerprint) continue;
      let saved = this.cache[id];
      if (
        sourceTypes.isTable(connection) &&
        (!Array.isArray(saved?.rows) ||
          saved.rows.length > 200 ||
          saved.rows.some(
            (row) =>
              !Array.isArray(row) ||
              row.length > 32 ||
              row.some(
                (cell) =>
                  !cell || typeof cell.address !== 'string' || typeof cell.value !== 'string'
              )
          ))
      )
        saved = undefined;
      this.runtimes.set(id, {
        fingerprint,
        rows: saved?.fingerprint === fingerprint ? saved.rows : undefined,
        data: saved?.fingerprint === fingerprint ? saved.data : undefined,
        headerRows: saved?.headerRows || [parseInt(connection.settings.range?.match(/\d+/)?.[0])],
        lastSuccess: saved?.fingerprint === fingerprint ? saved.lastSuccess : null,
        lastAttempt: null,
        nextAt: 0,
        failures: 0,
        health: 'loading',
        error: ''
      });
    }
    for (const id of this.runtimes.keys())
      if (!this.document.connections[id]) this.runtimes.delete(id);
  }
  bindingRecord(input) {
    const settings = this.document?.connections[input.connection]?.settings;
    // Pin connection settings as well as selection. Old program bindings never
    // silently adopt an edited target or a newly saved field mapping.
    return { ...input, target: settings && target(settings) };
  }
  reference(input) {
    if (!input) return;
    if (input.source && !input.transform) return input.source;
    const record = this.bindingRecord(input),
      id = 'bind.' + hash(record);
    this.bindings.set(id, record);
    this.referenceTimes.set(id, this.now());
    return id;
  }
  previewBinding(input) {
    if (input.source && !input.transform) return this.resolveSnapshot(input.source);
    const record = this.bindingRecord(input);
    // Draft selectors are resolved without registering a live binding or
    // writing a fallback. Existing committed last-good values remain readable.
    return this.resolveSnapshot('bind.' + hash(record), record);
  }
  retain(owner, references) {
    this.retained.set(owner, new Set(references.filter(Boolean)));
  }
  holdReferences(references) {
    const owner = {};
    this.retain(owner, references);
    return () => this.retained.delete(owner);
  }
  pruneBindings() {
    const keep = new Set();
    for (const entry of [
      ...(this.document?.mappings || []),
      ...(this.document?.defaults || []),
      ...Object.values(this.document?.sources || {})
    ]) {
      if (entry.binding) keep.add(this.reference(entry.binding));
    }
    for (const references of this.retained.values()) for (const id of references) keep.add(id);
    for (const entry of this.activeReferences()) keep.add(entry.source);
    // A short grace period also covers callers reading an ad-hoc reference.
    // Snapshot reads do not renew it. Preview drafts never enter this registry.
    const expired = (id) =>
      !keep.has(id) && this.now() - (this.referenceTimes.get(id) ?? this.createdAt) >= 60000;
    for (const id of this.bindings.keys())
      if (expired(id)) {
        this.bindings.delete(id);
        this.referenceTimes.delete(id);
      }
    for (const id of Object.keys(this.good))
      if (id.startsWith('bind.') && expired(id)) delete this.good[id];
  }
  effective(stage, graphic, field, template) {
    const override = this.document?.mappings.find(
      (item) => item.stage === stage && item.graphic === graphic && item.field === field
    );
    const fallback = this.document?.defaults.find(
      (item) => item.stage === stage && item.template === template && item.field === field
    );
    const mapping = override || fallback;
    return {
      binding: mapping?.source ? { source: mapping.source } : mapping?.binding || null,
      origin: override ? 'override' : fallback ? 'default' : 'unassigned'
    };
  }
  mapping(stage, graphic, field, template) {
    return this.reference(this.effective(stage, graphic, field, template).binding);
  }
  resolveSnapshot(id, previewRecord) {
    const source = this.document?.sources[id];
    if (source && source.type !== 'connection-value')
      return { ...source, type: 'local', health: this.error ? 'error' : 'ok' };
    const input = previewRecord || source?.binding || this.bindings.get(id);
    if (!input) return { health: 'error', error: 'Source unavailable' };
    if (Object.hasOwn(input, 'static'))
      return {
        value: transform(input.static, input.transform),
        label: 'Static value',
        type: 'static',
        health: 'ok'
      };
    if (input.source) {
      const nested = this.resolveSnapshot(input.source);
      return {
        ...nested,
        value: nested.value === undefined ? undefined : transform(nested.value, input.transform)
      };
    }
    const ref = source ? this.reference(input) : id,
      runtime = this.runtimes.get(input.connection),
      connection = this.document?.connections[input.connection];
    let error = '',
      collection,
      resolved;
    try {
      if (
        input.target &&
        JSON.stringify(input.target) !== JSON.stringify(connection && target(connection.settings))
      )
        throw new Error('Connection target changed; committed link retained');
      let value;
      if (input.selection.kind === 'collection') {
        collection = require('./collections.cjs').resolveCollection(
          sourceTypes.isJSON(connection) ? runtime?.data : runtime?.rows,
          input.selection
        );
        if (collection.invalid) throw new Error(collection.error);
        value = collection.value;
      } else {
        value = transform(
          resolve(sourceTypes.isJSON(connection) ? runtime?.data : runtime?.rows, input.selection),
          input.transform
        );
        if (!text(value)) throw new Error('Transformed value is empty or exceeds 300 characters');
      }
      resolved = value;
      if (!previewRecord) this.good[ref] = value;
    } catch (problem) {
      error = problem.message;
    }
    const status = connection
      ? this.connectionSnapshot(input.connection, connection)
      : { health: 'error', error: 'Connection unavailable' };
    return {
      ...source,
      ...(collection ? { collection } : {}),
      binding: input,
      value: resolved ?? this.good[ref],
      label: source?.label || connection?.label,
      type: source?.type || 'connection-value',
      health: error ? 'error' : status.health,
      error: error || status.error,
      lastSuccess: status.lastSuccess,
      lastAttempt: status.lastAttempt,
      nextRefresh: status.nextRefresh,
      warning: status.warning
    };
  }
  value(id) {
    return id ? this.resolveSnapshot(id).value : undefined;
  }
  connectionSnapshot(id, connection) {
    const runtime = this.runtimes.get(id),
      stale =
        !runtime?.lastSuccess ||
        this.now() - Date.parse(runtime.lastSuccess) > connection.settings.refreshSeconds * 2000;
    return {
      ...connection,
      rows: runtime?.rows || [],
      ...(sourceTypes.isJSON(connection) ? { data: runtime?.data } : {}),
      health: this.error
        ? 'error'
        : runtime?.health === 'ok' && stale
          ? 'stale'
          : runtime?.health || 'loading',
      lastSuccess: runtime?.lastSuccess || null,
      lastAttempt: runtime?.lastAttempt || null,
      nextRefresh: runtime?.nextAt ? new Date(runtime.nextAt).toISOString() : null,
      error: runtime?.error || '',
      warning: runtime?.cacheError || ''
    };
  }
  snapshot() {
    this.pruneBindings();
    const document = this.document || {
      version: 2,
      revision: 0,
      sources: {},
      connections: {},
      defaults: [],
      mappings: []
    };
    for (const entry of [...document.mappings, ...document.defaults])
      if (entry.binding) this.reference(entry.binding);
    const sources = Object.fromEntries(
      [...new Set([...Object.keys(document.sources), ...this.bindings.keys()])].map((id) => [
        id,
        this.resolveSnapshot(id)
      ])
    );
    return clone({
      ...document,
      mappings: document.mappings.map((item) => ({
        ...item,
        source: item.source || this.reference(item.binding)
      })),
      defaults: document.defaults.map((item) => ({
        ...item,
        source: this.reference(item.binding)
      })),
      sources,
      connections: Object.fromEntries(
        Object.entries(document.connections).map(([id, value]) => [
          id,
          { ...this.connectionSnapshot(id, value), usages: this.usages(id) }
        ])
      ),
      health: this.error ? 'unavailable' : 'ok',
      error: this.error,
      checkedAt: this.checkedAt
    });
  }
  usages(id) {
    const result = [];
    const uses = (entry) => {
      const pick = entry.binding || this.document?.sources[entry.source]?.binding;
      return pick?.connection === id;
    };
    for (const item of this.document?.mappings || [])
      if (uses(item))
        result.push({
          stage: item.stage,
          graphic: item.graphic,
          field: item.field,
          kind: 'mapping'
        });
    for (const item of this.document?.defaults || [])
      if (uses(item))
        result.push({
          stage: item.stage,
          template: item.template,
          field: item.field,
          kind: 'default'
        });
    for (const item of this.activeReferences())
      if (
        uses({
          binding: this.document?.sources[item.source]?.binding || this.bindings.get(item.source)
        })
      )
        result.push({ ...item, kind: 'on-air' });
    return result;
  }
  reconcileMappings(repository, protectedItems = () => this.activeReferences()) {
    return this.queue(async () => {
      await this.ready;
      await this.read();
      if (this.error) return { removed: 0 };
      const inventories = new Map();
      for (const stage of repository.stages.values()) {
        try {
          const rundown = await repository.read(stage.id);
          if (rundown.templates.some(item => typeof item.itemID !== 'string' || !Array.isArray(item.DataFields))) continue;
          inventories.set(stage.id, new Map(rundown.templates.map(item => [item.itemID, new Set(item.DataFields.map(field => field.field))])));
        } catch { /* Unavailable or invalid is not evidence of deletion. */ }
      }
      const protectedKeys = new Set(protectedItems().map(item => JSON.stringify([item.stage, item.graphic])));
      const next = clone(this.document);
      const before = next.mappings.length;
      next.mappings = next.mappings.filter(item => {
        if (!inventories.has(item.stage) || protectedKeys.has(JSON.stringify([item.stage, item.graphic]))) return true;
        return inventories.get(item.stage).get(item.graphic)?.has(item.field) === true;
      });
      const removed = before - next.mappings.length;
      if (!removed) return { removed: 0 };
      validate(next);
      next.revision++;
      next.updatedAt = new Date().toISOString();
      await writeText(this.file, JSON.stringify(next, null, 2));
      this.document = next;
      this.syncRuntimes(); this.checkedAt = next.updatedAt; this.emit('change');
      return { removed };
    });
  }
  edit(expectedRevision, operation) {
    return this.queue(async () => {
      await this.ready;
      await this.read();
      // An explicit save may create a missing data file, but never its folder:
      // an unmounted share must not be replaced by a new local folder.
      if (this.missing) await fs.stat(path.dirname(this.file)).catch(() =>
        fail(`Data folder not found: ${path.dirname(this.file)}. Connect the drive or restore the folder, then retry.`, 503));
      else if (this.error) fail('Repair the local JSON source before saving changes', 503);
      const current = this.document || empty();
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision !== current.revision)
        fail('Data changed elsewhere. Reload saved data before saving.', 409);
      const next = clone(current);
      operation(next);
      validate(next);
      next.revision++;
      next.updatedAt = new Date().toISOString();
      await writeText(this.file, JSON.stringify(next, null, 2));
      this.document = next;
      this.error = '';
      this.missing = false;
      this.syncRuntimes();
      this.checkedAt = next.updatedAt;
      this.emit('change');
      return this.snapshot();
    });
  }
  updateSource(id, value, revision) {
    return this.edit(revision, (next) => {
      if (!Object.hasOwn(next.sources, id)) fail('Unknown source', 404);
      if (next.sources[id].type === 'connection-value') fail('Sheet values are read-only', 422);
      if (!text(value)) fail('Enter nonempty text, up to 300 characters');
      next.sources[id].value = value;
    });
  }
  updateMapping(mapping, revision) {
    return this.edit(revision, (next) => {
      const connection =
          next.connections[
            mapping.binding?.connection || next.sources[mapping.source]?.binding?.connection
          ],
        project = this.stages.find((stage) => stage.id === mapping.stage)?.project;
      if (connection?.project && connection.project !== project)
        fail('This source belongs to another project', 422);
      const index = next.mappings.findIndex(
        (item) =>
          item.stage === mapping.stage &&
          item.graphic === mapping.graphic &&
          item.field === mapping.field
      );
      if (index < 0) next.mappings.push(mapping);
      else next.mappings[index] = mapping;
    });
  }
  saveMappings(stage, graphic, template, edits, revision) {
    if (
      !Array.isArray(edits) ||
      edits.length > 100 ||
      new Set(edits.map((edit) => edit.field)).size !== edits.length
    )
      fail('Invalid field mappings');
    return this.edit(revision, (next) => {
      for (const edit of edits) {
        next.mappings = next.mappings.filter(
          (item) => !(item.stage === stage && item.graphic === graphic && item.field === edit.field)
        );
        if (edit.scope === 'inherit') continue;
        const pick = binding(next, edit.binding);
        const project = this.stages.find((item) => item.id === stage)?.project;
        const selected =
          next.connections[pick?.connection || next.sources[pick?.source]?.binding?.connection];
        if (selected?.project && selected.project !== project)
          fail('This source belongs to another project', 422);
        if (edit.scope === 'default') {
          next.defaults = next.defaults.filter(
            (item) =>
              !(item.stage === stage && item.template === template && item.field === edit.field)
          );
          next.defaults.push({ stage, template, field: edit.field, binding: pick });
        } else if (edit.scope === 'override')
          next.mappings.push({ stage, graphic, field: edit.field, binding: pick });
        else fail('Choose template default or graphic override');
      }
    });
  }
  async persistCache() {
    this.pruneBindings();
    // Resolve all registered bindings before saving the restart fallback.
    for (const id of [...Object.keys(this.document.sources), ...this.bindings.keys()])
      this.value(id);
    const connections = Object.fromEntries(
      [...this.runtimes]
        .filter(
          ([, runtime]) => (runtime.rows || runtime.data !== undefined) && runtime.lastSuccess
        )
        .map(([id, runtime]) => [
          id,
          {
            fingerprint: runtime.fingerprint,
            rows: runtime.rows,
            data: runtime.data,
            headerRows: runtime.headerRows,
            lastSuccess: runtime.lastSuccess
          }
        ])
    );
    const raw = JSON.stringify({ version: 2, connections, good: this.good });
    this.cacheSerial = this.cacheSerial
      .catch(() => {})
      .then(async () => {
        await fs.writeFile(this.cacheFile + '.tmp', raw);
        await fs.rename(this.cacheFile + '.tmp', this.cacheFile);
      });
    await this.cacheSerial;
    this.cache = connections;
  }
  readConnection(type, settings, options) {
    if (sourceTypes.isLocal(type)) return this.localFiles.read(settings, { ...options, type });
    return (type === 'json-api' ? this.json : this.sheets).read(settings, options);
  }
  testSheet(settings) {
    return this.sheets.read(connectionSettings(settings));
  }
  async saveConnection(id, label, input, revision, type = 'google-sheets', project) {
    if (!text(label)) fail('Enter a connection name, up to 300 characters');
    if (!sourceTypes.supported(type)) fail('Unsupported source type');
    if (project && !this.stages.some((stage) => stage.project === project)) fail('Unknown project');
    const settings = normalizeConnectionSettings(type, input),
      result = await this.readConnection(type, settings);
    if (sourceTypes.isTable(type) && !Array.isArray(result.rows))
      fail('Connection returned invalid rows', 502);
    id ||= 'sheet.' + randomUUID();
    await this.edit(revision, (next) => {
      if (
        next.connections[id] &&
        (next.connections[id].type !== type || next.connections[id].project !== project) &&
        this.usages(id).length
      )
        fail('This connection is in use; create another source to change its type or project', 409);
      if (
        next.connections[id] &&
        JSON.stringify({ ...next.connections[id].settings, refreshSeconds: 0 }) !==
          JSON.stringify({ ...settings, refreshSeconds: 0 }) &&
        this.usages(id).length
      )
        fail(
          'This connection is in use. Add a new connection and remap its fields before changing its target.',
          409
        );
      next.connections[id] = {
        type,
        label: label.trim(),
        settings,
        ...(project ? { project } : {})
      };
    });
    this.acceptRead(id, result.rows, result.data, result.headerRows);
    await this.persistCache().catch(() => {
      this.runtimes.get(id).cacheError =
        'Live data is available, but its restart cache could not be saved';
    });
    this.emit('change');
    return { connectionId: id, snapshot: this.snapshot() };
  }
  removeConnection(id, revision) {
    return this.edit(revision, (next) => {
      if (!next.connections[id]) fail('Unknown connection', 404);
      if (this.usages(id).length)
        fail(
          'Remove saved field mappings and stop linked on-air graphics before removing this connection',
          409
        );
      for (const [key, source] of Object.entries(next.sources))
        if (source.binding?.connection === id) delete next.sources[key];
      delete next.connections[id];
    });
  }
  // Compatibility endpoint for existing cell-source integrations. New UI saves
  // connections once and stores field selectors directly on each mapping.
  async addSheet(label, input, revision) {
    const settings = normalizeSettings(input);
    if (!settings.cell) fail('Choose a cell first');
    const added = await this.saveConnection(null, label, settings, revision),
      sourceId = 'google.' + randomUUID();
    await this.edit(added.snapshot.revision, (next) => {
      next.sources[sourceId] = {
        type: 'connection-value',
        label,
        binding: {
          connection: added.connectionId,
          selection: { kind: 'cell', cell: settings.cell }
        }
      };
    });
    await this.persistCache();
    return { sourceId, snapshot: this.snapshot() };
  }
  acceptRead(id, rows, data, headerRows) {
    const runtime = this.runtimes.get(id),
      now = this.now();
    Object.assign(runtime, {
      rows,
      data,
      headerRows: headerRows || [
        parseInt(this.document.connections[id].settings.range?.match(/\d+/)?.[0])
      ],
      lastSuccess: new Date(now).toISOString(),
      lastAttempt: new Date(now).toISOString(),
      failures: 0,
      health: 'ok',
      error: '',
      cacheError: '',
      nextAt: now + this.document.connections[id].settings.refreshSeconds * 1000
    });
  }
  async ensureCollectionHeaders(input) {
    const pick = input?.selection;
    if (this.document?.connections[input?.connection]?.type !== 'google-sheets') return;
    if (
      !pick ||
      !['collection', 'row'].includes(pick.kind) ||
      (pick.kind === 'collection' && pick.format !== 'sheet')
    )
      return;
    const needsHeader = () => {
      const runtime = this.runtimes.get(input.connection);
      return runtime?.rows && !runtime.headerRows?.includes(input.selection.headerRow);
    };
    if (needsHeader())
      await this.refreshSheet(input.connection, { headerRows: [input.selection.headerRow] });
    // An existing coalesced poll may not have requested this draft header.
    if (needsHeader())
      await this.refreshSheet(input.connection, { headerRows: [input.selection.headerRow] });
  }
  headerRows(id) {
    return [
      ...new Set(
        [
          ...this.document.mappings,
          ...this.document.defaults,
          ...Object.values(this.document.sources)
        ]
          .map((item) => item.binding)
          .concat([...this.bindings.values()])
          .filter(
            (input) =>
              input?.connection === id && ['collection', 'row'].includes(input.selection?.kind)
          )
          .map((input) => input.selection.headerRow)
          .filter(Number.isInteger)
      )
    ];
  }
  async refreshSheet(id, { headerRows = [] } = {}) {
    await this.ready;
    if (this.closed) return;
    id = this.document?.sources[id]?.binding?.connection || id;
    const connection = this.document?.connections[id];
    if (!connection) fail('Unknown data connection', 404);
    if (this.inFlight.has(id)) return this.inFlight.get(id);
    const runtime = this.runtimes.get(id),
      controller = new AbortController();
    this.controllers.add(controller);
    const job = (async () => {
      runtime.lastAttempt = new Date(this.now()).toISOString();
      try {
        const result = await this.readConnection(connection.type, connection.settings, {
          signal: controller.signal,
          headerRows: [...new Set([...this.headerRows(id), ...headerRows])]
        });
        if (this.closed || this.runtimes.get(id) !== runtime) return;
        if (sourceTypes.isTable(connection) && !Array.isArray(result.rows))
          fail('Connection returned invalid rows', 502);
        this.acceptRead(id, result.rows, result.data, result.headerRows);
        try {
          await this.persistCache();
        } catch {
          runtime.cacheError = 'Live data is available, but its restart cache could not be saved';
        }
      } catch (error) {
        if (this.closed || this.runtimes.get(id) !== runtime) return;
        runtime.failures++;
        runtime.health = 'error';
        runtime.error = error.message;
        runtime.nextAt =
          this.now() +
          Math.min(
            3600,
            connection.settings.refreshSeconds * 2 ** Math.min(runtime.failures - 1, 6)
          ) *
            1000;
      } finally {
        this.controllers.delete(controller);
      }
      if (!this.closed && this.runtimes.get(id) === runtime) this.emit('change');
      return this.snapshot();
    })();
    this.inFlight.set(id, job);
    try {
      return await job;
    } finally {
      if (this.inFlight.get(id) === job) this.inFlight.delete(id);
    }
  }
  async pollSheets() {
    await this.ready;
    if (this.polling || this.closed || this.error) return;
    this.polling = true;
    try {
      const due = [...this.runtimes]
        .filter(([, value]) => value.nextAt <= this.now())
        .map(([id]) => id);
      // API reads scheduled together are combined into one batch per workbook.
      // Other adapters retain the existing four-connection concurrency bound.
      const groups = this.sheets.batchSize
        ? [
            { ids: due.filter(id => this.document.connections[id]?.type === 'google-sheets'), size: this.sheets.batchSize },
            { ids: due.filter(id => this.document.connections[id]?.type !== 'google-sheets'), size: 4 }
          ]
        : [{ ids: due, size: 4 }];
      for (const { ids, size } of groups)
        for (let index = 0; index < ids.length && !this.closed; index += size)
          await Promise.allSettled(ids.slice(index, index + size).map(id => this.refreshSheet(id)));
    } finally {
      this.polling = false;
    }
  }
  close() {
    this.closed = true;
    this.retained.clear();
    for (const controller of this.controllers) controller.abort();
  }
}
module.exports = { DataSources, linkable, validate, migrate, binding };
