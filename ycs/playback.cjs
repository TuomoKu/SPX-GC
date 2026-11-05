// YCS stage playback. Each stage owns a program composition and preview draft.
// The shared service is used by the SPX editor and explicit Companion commands.
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { linkable } = require('./data.cjs');
const {types,normalizeField}=require('./field-types.cjs');
const { writeText } = require('../utils/config-store.cjs');

const clone = value => structuredClone(value);
const identifier = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,95}$/;
function fail(message, status = 400) { const error = new Error(message); error.status = status; throw error; }
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function bounded(promise, ms, message) {
  let timer;
  const limit = new Promise((_, reject) => { timer = setTimeout(() => { const error = new Error(message); error.status = 503; reject(error); }, ms); });
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer));
}
function manualValue(definition, value) {
  try { return normalizeField(definition, value, { manual: true }); }
  catch (cause) {
    const error = new Error(`${definition.title || definition.field}: ${cause.message}`);
    error.status = 422;
    error.fields = { [definition.field]: cause.message };
    throw error;
  }
}

class RundownRepository {
  constructor(root, stages, { readTimeout = 3000, writeTimeout = 5000 } = {}) {
    this.stages = new Map();
    for (const stage of stages) {
      if (!identifier.test(stage.id) || !identifier.test(stage.project) || !identifier.test(stage.rundown)) fail('Invalid stage configuration');
      if (this.stages.has(stage.id)) fail('Duplicate stage');
      this.stages.set(stage.id, { ...stage, file: path.resolve(root, stage.project, 'data', stage.rundown + '.json') });
    }
    Object.assign(this, { readTimeout, writeTimeout });
    // Parsed files keyed by path, reused while the file stamp is unchanged.
    this.cache = new Map();
    this.loading = new Map();
    this.writing = new Map();
  }
  stage(id) { return this.stages.get(id) || fail('Unknown stage', 404); }
  profileFile(id) { return path.resolve(this.stage(id).file, '../../profile.json'); }
  matchFile(file) {
    if (typeof file !== 'string') return;
    const target = path.resolve(file);
    return [...this.stages.values()].find(stage => process.platform === 'win32' ? stage.file.toLowerCase() === target.toLowerCase() : stage.file === target);
  }
  // One disk load per file at a time, however many callers ask. A stalled read
  // (a hung SMB share) then holds one libuv thread rather than one per poll.
  refresh(file, validate = value => value) {
    let pending = this.loading.get(file);
    if (pending) return pending;
    pending = (async () => {
      for (let attempt = 0; ; attempt++) {
        const info = await fs.stat(file);
        const stamp = [info.mtimeMs, info.size, info.ino].join(':');
        const cached = this.cache.get(file);
        if (cached?.stamp === stamp) return cached.value;
        try {
          const value = validate(JSON.parse(await fs.readFile(file, 'utf8')));
          this.cache.set(file, { stamp, value });
          return value;
        } catch (error) {
          // Stock SPX routes rewrite rundowns in place; a read can catch one half-written.
          if (!(error instanceof SyntaxError) || attempt >= 3) throw error;
          await pause(20);
        }
      }
    })().catch(error => {
      if (error.code === 'ENOENT') this.cache.delete(file);
      throw error;
    }).finally(() => this.loading.delete(file));
    this.loading.set(file, pending);
    return pending;
  }
  load(file, validate) {
    return bounded(this.refresh(file, validate), this.readTimeout, 'Show files are not responding; try again');
  }
  validRundown(rundown) {
    if (!Array.isArray(rundown?.templates)) fail('Invalid stage rundown', 500);
    const ids = rundown.templates.map(item => item.itemID);
    if (new Set(ids).size !== ids.length) fail('Rundown graphic IDs must be unique', 500);
    return rundown;
  }
  async read(id) {
    return clone(await this.load(this.stage(id).file, rundown => this.validRundown(rundown)));
  }
  async profile(id) {
    try { return await this.load(this.profileFile(id)); }
    catch (error) { if (error.code === 'ENOENT') return {}; throw error; }
  }
  // Last parsed copy, without touching disk. Read-only; may be stale or undefined.
  peek(id) { return this.cache.get(this.stage(id).file)?.value; }
  // Polls are answered from memory, refreshed in the background for at most `wait` ms.
  async inventory(id, wait = 1000) {
    const refreshes = [this.refresh(this.stage(id).file, rundown => this.validRundown(rundown)), this.refresh(this.profileFile(id))];
    await Promise.race([Promise.allSettled(refreshes), pause(wait)]);
    return { rundown: this.peek(id), profile: this.cache.get(this.profileFile(id))?.value };
  }
  async write(id, rundown) {
    const file = this.stage(id).file;
    // Writes for a stage are serialized by its queue, so one still pending here
    // has timed out. Fail fast rather than racing it or tying up more threads.
    if (this.writing.has(file)) fail('Show files are not responding; try again', 503);
    const value = { ...rundown, updated: new Date().toISOString() };
    const pending = writeText(file, JSON.stringify(value, null, 2)).finally(() => this.writing.delete(file));
    this.writing.set(file, pending);
    await bounded(pending, this.writeTimeout, 'Show files are not responding; try again');
    // Re-stat on the next read; keep the written copy for memory-only callers.
    this.cache.set(file, { stamp: null, value: clone(value) });
  }
  item(rundown, id) { return rundown.templates.find(item => item.itemID === id) || fail('Unknown graphic', 404); }
}

function prepareEdits(item,edits){
  if(!Array.isArray(edits)||edits.length>100||new Set(edits.map(edit=>edit.field)).size!==edits.length)fail('Invalid field mappings');
  return edits.map(edit=>{const field=item.DataFields.find(field=>field.field===edit.field);if(!field||!linkable(item,edit.field))fail('Unknown or protected field',422);const next=clone(edit),pick=next.binding;if(pick){const isList=pick.selection?.kind==='collection';if(Boolean(field.ycsCollection)!==isList)fail(field.ycsCollection?'Map a story list for this field':'Choose a single value for this field',422);if(isList){const schema=require('./collections.cjs').schema(field);if(!schema)fail('Unsupported template collection schema',422);if(Object.keys(pick.selection.fields||{}).some(key=>!schema.fields.some(field=>field.key===key)))fail('Unknown story field',422);pick.selection.required=schema.fields.filter(field=>field.required).map(field=>field.key);}}return next;});
}
function fieldValues(item, input) {
  if (input === undefined) return;
  if (!Array.isArray(input) || input.length > 100) fail('Fields must be an array');
  const definitions = new Map(item.DataFields.map(field => [field.field, field]));
  const seen = new Set();
  const values = new Map();
  for (const incoming of input) {
    if (!incoming || typeof incoming.field !== 'string' || seen.has(incoming.field)) fail('Invalid or duplicate field');
    seen.add(incoming.field);
    const definition = definitions.get(incoming.field);
    if (!definition) fail('Unknown template field');
    if (typeof incoming.value !== 'string' || incoming.value.length > 65536) fail('Invalid template field value');
    values.set(incoming.field, linkable(item, incoming.field) ? manualValue(definition, incoming.value) : incoming.value);
    // Hidden instance identity cannot be changed by an editor/API patch.
    if (incoming.field === 'f0' && definition.ftype === 'hidden' && incoming.value !== definition.value) fail('Instance identity is read-only');
  }
  for (const [field, value] of values) definitions.get(field).value = value;
}

function descriptor(item, slots, sources) {
  const slot = Object.hasOwn(slots, item.ycsSlot) && slots[item.ycsSlot];
  if (!slot) fail('Graphic has no configured display slot', 422);
  if (typeof item.relpath !== 'string' || !/^\/[a-zA-Z0-9_./-]+\.html?$/.test(item.relpath) || item.relpath.split('/').includes('..')) fail('Invalid template path', 422);
  const data = Object.fromEntries(item.DataFields.filter(field => field.field).map(field => [field.field, field.value ?? '']));
  const links = {};
  for (const [field, link] of Object.entries(item.ycsLinks || {})) {
    if (!linkable(item, field)) continue;
    const source = sources?.mapping(item.ycsStage, item.itemID, field, item.relpath);
    const definition=item.DataFields.find(item=>item.field===field);
    links[field] = { ...link, source, definition:{ftype:definition.ftype,...(definition.ycsCollection?{ycsCollection:definition.ycsCollection}:{}),...(definition.items?{items:definition.items}:{})} };
    if (link.mode === 'linked' && sources?.value(source)!==undefined) {try {data[field]=normalizeField(definition,sources.value(source));}catch{/* Retain the manual fallback for incompatible source values. */}}
  }
  return { id: item.itemID, slot: item.ycsSlot, z: slot.order, exitMs: slot.exitMs ?? 250, template: '/templates' + item.relpath, data, ...(Object.keys(links).length ? { links } : {}) };
}

class Playback extends EventEmitter {
  constructor(repository, slots, sources) {
    super();
    this.repository = repository;
    this.slots = { default: { label: 'Default', order: 0, exitMs: 250 }, ...slots };
    this.sources = sources;
    for (const [name, slot] of Object.entries(this.slots)) {
      if (!identifier.test(name) || !Number.isInteger(slot.order) || slot.order < 0 || slot.order > 9999) fail('Invalid display slot configuration');
    }
    this.states = new Map();
    this.queues = new Map();
    this.persistence = new Map();
    this.presses = new Map();
    this.now = Date.now;
    this.repeatWindow = 400;
    // Restart recovery: notices for stages whose program was put back, and a
    // gate that holds commands and output subscriptions until that decision.
    this.notices = new Map();
    this.ready = Promise.resolve();
    for (const stage of repository.stages.values()) this.states.set(stage.id, { revision: 0, program: [], draft: null });
  }
  state(stageId) { this.repository.stage(stageId); return this.states.get(stageId); }
  snapshot(stageId, mode) {
    if (!['program', 'preview'].includes(mode)) fail('Unknown output mode', 404);
    const state = this.state(stageId);
    const items = clone(state.program).filter(item => mode !== 'preview' || !state.draft || item.id !== state.draft.id);
    if (mode === 'preview' && state.draft) {
      const index = items.findIndex(item => item.slot === state.draft.slot);
      if (index < 0) items.push(clone(state.draft)); else items[index] = clone(state.draft);
    }
    return { stage: stageId, mode, revision: state.revision, selected: state.draft?.id || null, graphics: items.sort((a, b) => a.z - b.z) };
  }
  queue(stageId, operation, { duringRestart = false } = {}) {
    this.repository.stage(stageId);
    const result = (this.queues.get(stageId) || this.ready).then(() => {
      if (this.restartPending && !duringRestart) fail('Server restart in progress; try again after it reconnects', 503);
      return operation();
    });
    this.queues.set(stageId, result.catch(() => {}));
    return result;
  }
  publish(stageId) {
    // Keep committed program and selected preview bindings alive even after a
    // mapping is replaced. They remain authoritative until Play/Update/Stop.
    this.sources?.retain?.(this, [...this.states.values()].flatMap(state =>
      [...state.program, ...(state.draft ? [state.draft] : [])].flatMap(graphic =>
        Object.values(graphic?.links || {}).filter(link => link.mode === 'linked').map(link => link.source))));
    this.state(stageId).revision++;
    for (const mode of ['program', 'preview']) this.emit(stageId + ':' + mode, this.snapshot(stageId, mode));
    this.emit('publish', stageId);
  }
  // Put back a stage's saved program exactly as it was: same descriptors, data,
  // continuation steps and a later revision. The rundown is not consulted, so a
  // stale rundown cannot change what is on air; linked data updates follow
  // through refreshLinks as usual.
  restore(stageId, saved, downtimeMs) {
    const state = this.state(stageId);
    state.program = clone(saved.program);
    state.draft = saved.draft ? clone(saved.draft) : null;
    state.revision = saved.revision;
    if (state.program.length) this.notices.set(stageId, { graphics: state.program.length, downtimeSeconds: Math.round(downtimeMs / 1000) });
    this.publish(stageId);
  }
  // Shown in the stage panel until dismissed or the next Program command.
  restored(stageId) { this.state(stageId); return this.notices.get(stageId) || null; }
  dismissRestored(stageId) { this.state(stageId); this.notices.delete(stageId); }
  async definition(stageId, item) {
    const profile = await this.repository.profile(stageId);
    const matches = (profile.templates || []).filter(template => template.relpath === item.relpath);
    return matches.length === 1 ? clone(matches[0]) : {};
  }
  // Mark rundown onair flags from a program composition. Returns true if any changed.
  flag(rundown, program) {
    let changed = false;
    for (const candidate of rundown.templates) {
      const onair = String(program.some(current => current.id === candidate.itemID));
      if (candidate.onair !== onair) { candidate.onair = onair; changed = true; }
    }
    return changed;
  }
  // Save onair flags after the program has already changed and been published.
  // Disk trouble must never keep a graphic on air, so this logs and retries
  // later instead of failing the command. Call it inside the stage queue.
  async persist(stageId) {
    let entry = this.persistence.get(stageId);
    if (!entry) this.persistence.set(stageId, entry = { failures: 0 });
    clearTimeout(entry.timer);
    entry.timer = null;
    try {
      const rundown = await this.repository.read(stageId);
      if (this.flag(rundown, this.state(stageId).program)) await this.repository.write(stageId, rundown);
      entry.failures = 0;
    } catch (error) {
      // A missing rundown has no flags to save; do not retry it forever.
      if (error.code === 'ENOENT') { entry.failures = 0; return; }
      const wait = Math.min(30000, 1000 * 2 ** entry.failures++);
      console.warn(`[YCS playback] ${stageId}: could not save on-air flags (${error.message}); retrying in ${wait / 1000} s`);
      entry.timer = setTimeout(() => this.queue(stageId, () => this.persist(stageId), { duringRestart: true }).catch(() => {}), wait);
      entry.timer.unref?.();
    }
  }
  editorRevision(stageId, graphicId) {
    return this.repository.peek(stageId)?.templates.find(item => item.itemID === graphicId)?.ycsEditRevision || 0;
  }
  // Companion GET buttons retry, and operators double-press. A Toggle or
  // Continue repeated for the same item within the window is ignored.
  repeated(stageId, graphicId, action) {
    const key = stageId + '\n' + graphicId + '\n' + action;
    const last = this.presses.get(key);
    return last !== undefined && this.now() - last < this.repeatWindow;
  }
  pressed(stageId, graphicId, action) {
    const now = this.now();
    for (const [key, at] of this.presses) if (now - at >= this.repeatWindow) this.presses.delete(key);
    this.presses.set(stageId + '\n' + graphicId + '\n' + action, now);
  }
  async routed(stageId, item) {
    const definition = await this.definition(stageId, item);
    const assigned = Object.hasOwn(item, 'ycsSlot') ? item.ycsSlot : definition.ycsSlot;
    return { ...item, ycsSlot: assigned || 'default' };
  }
  assignSlot(stageId, graphicId, slot, revision) {
    if (slot !== null && slot !== '' && !Object.hasOwn(this.slots, slot)) fail('Choose an available slot', 422);
    if (!Number.isInteger(revision) || revision < 0) fail('An editor revision is required', 400);
    return this.queue(stageId, async () => {
      const rundown = await this.repository.read(stageId);
      const item = this.repository.item(rundown, graphicId);
      if (revision !== (item.ycsEditRevision || 0)) fail('This graphic was saved in another controller. Reload before continuing.', 409);
      const before = JSON.stringify([Object.hasOwn(item, 'ycsSlot'), item.ycsSlot]);
      if (slot === null) delete item.ycsSlot; else item.ycsSlot = slot;
      if (before !== JSON.stringify([Object.hasOwn(item, 'ycsSlot'), item.ycsSlot])) {
        item.ycsEditRevision = revision + 1;
        this.flag(rundown, this.state(stageId).program);
        await this.repository.write(stageId, rundown);
      }
      const effective = await this.routed(stageId, item);
      return { slot: effective.ycsSlot || null, slotOverride: Object.hasOwn(item, 'ycsSlot') ? item.ycsSlot : null, slotConfigured: Object.hasOwn(this.slots, effective.ycsSlot), editorRevision: item.ycsEditRevision || 0 };
    });
  }
  async catalog(stageId) {
    await this.sources?.ready;
    const rundown = await this.repository.read(stageId);
    return Promise.all(rundown.templates.map(async item => ({ id:item.itemID,title:item.ycsNickname||item.description||item.itemID,slot:(await this.routed(stageId,item)).ycsSlot,template:item.relpath,fields:item.DataFields.filter(field=>linkable(item,field.field)).map(field=>({field:field.field,title:field.title||field.field,ftype:field.ftype,type:types[field.ftype],required:field.required===true,...(field.ycsCollection?{ycsCollection:field.ycsCollection,type:'Story list'}:{})})),mapped:item.DataFields.filter(field=>linkable(item,field.field)&&this.sources?.mapping(stageId,item.itemID,field.field,item.relpath)).length })));
  }
  async editor(stageId, graphicId) {
    await this.sources?.ready;
    const item = this.repository.item(await this.repository.read(stageId), graphicId);
    const definition = await this.definition(stageId, item);
    const effective = await this.routed(stageId, item);
    const links = {};
    for (const field of item.DataFields) if (linkable(item, field.field)) {
      const saved = item.ycsLinks?.[field.field] || { mode: 'manual', manual: field.value ?? '' };
      links[field.field] = { ...saved, source: this.sources?.mapping(stageId, graphicId, field.field, item.relpath) || null };
    }
    return { revision: item.ycsEditRevision || 0, title: item.ycsNickname || item.description || graphicId, nickname: item.ycsNickname || '', slot: effective.ycsSlot || null, slotOverride: Object.hasOwn(item, 'ycsSlot') ? item.ycsSlot : null, defaultSlot: definition.ycsSlot || 'default', slots: Object.entries(this.slots).map(([id, slot]) => ({id, label: slot.label || id})), sections: clone(definition.editorSections || item.editorSections || []), slotConfigured: Object.hasOwn(this.slots, effective.ycsSlot), templateTitle: path.basename(item.relpath).replace(/\.html?$/i, ''), template: item.relpath, previewOnEdit: item.ycsPreviewOnEdit !== false, fields: clone(item.DataFields), links };
  }
  async mappingPreview(stageId,graphicId,edits=[]) {
    await this.sources?.ready;
    const item=this.repository.item(await this.repository.read(stageId),graphicId);
    edits=prepareEdits(item,edits);
    const graphic=descriptor(await this.routed(stageId,item),this.slots);
    const fields=await Promise.all(item.DataFields.filter(field=>linkable(item,field.field)).map(async field=>{
      const draft=edits.find(edit=>edit.field===field.field);
      const effective=this.sources.effective(stageId,graphicId,field.field,item.relpath);
      const pick=draft&&draft.scope!=='inherit'?draft.binding:draft?this.sources.document.defaults.find(entry=>entry.stage===stageId&&entry.template===item.relpath&&entry.field===field.field)?.binding||null:effective.binding;
      let value=String(field.value??''),health='manual',error='',collection;
      if(pick) {
        try {
          const checked=require('./data.cjs').binding(this.sources.document,pick);
          const connection=this.sources.document.connections[checked.connection||this.sources.document.sources[checked.source]?.binding?.connection];
          if(connection?.project&&connection.project!==this.repository.stage(stageId).project)fail('This source belongs to another project',422);
          await this.sources.ensureCollectionHeaders(checked);const source=this.sources.previewBinding(checked);collection=source.collection;
          if(source.value===undefined)throw new Error(source.error||'Waiting for a valid source value');
          value=normalizeField(field,source.value);health=source.health;error=source.error||'';
        }catch(problem){health='error';error=problem.message;}
      }
      graphic.data[field.field]=value;
      return {field:field.field,title:field.title||field.field,ftype:field.ftype,type:types[field.ftype],required:field.required===true,...(field.ycsCollection?{ycsCollection:field.ycsCollection,type:'Story list'}:{}),manual:String(field.value??''),binding:pick,origin:effective.origin,value,health,error,...(collection?{collection}:{})};
    }));
    return {revision:this.sources.snapshot().revision,template:item.relpath,title:item.ycsNickname||item.description||graphicId,graphic,fields};
  }
  rename(stageId, graphicId, nickname, revision) {
    if (typeof nickname !== 'string' || nickname.length > 100 || /[\u0000-\u001f\u007f]/.test(nickname)) fail('Use a nickname of up to 100 characters on one line', 422);
    if (!Number.isInteger(revision) || revision < 0) fail('An editor revision is required', 400);
    const name = nickname.trim();
    return this.queue(stageId, async () => {
      const rundown = await this.repository.read(stageId);
      const item = this.repository.item(rundown, graphicId);
      if (revision !== (item.ycsEditRevision || 0)) fail('This graphic was saved in another controller. Reload before continuing.', 409);
      if ((item.ycsNickname || '') !== name) {
        if (name) item.ycsNickname = name; else delete item.ycsNickname;
        item.ycsEditRevision = revision + 1;
        this.flag(rundown, this.state(stageId).program);
        await this.repository.write(stageId, rundown);
      }
      // Operator metadata only: preserve IDs, bindings, manual values and both
      // output snapshots, including an unsaved preview already on the server.
      return { nickname: name, editorRevision: item.ycsEditRevision || 0 };
    });
  }
  focus(stageId, graphicId) { return this.command(stageId, graphicId, 'focus'); }
  select(stageId, graphicId) { return this.focus(stageId, graphicId); }
  command(stageId, graphicId, action, fields, options = {}) {
    if (!['play', 'stop', 'toggle', 'update', 'preview', 'save', 'continue', 'focus'].includes(action)) fail('Unknown command');
    if (action === 'focus' && (fields !== undefined || options.links !== undefined)) fail('Focus uses saved data', 400);
    const requested = action;
    return this.queue(stageId, async () => {
      const state = this.state(stageId);
      if (['play', 'stop', 'toggle', 'update', 'continue'].includes(requested)) this.notices.delete(stageId);
      const active = state.program.find(current => current.id === graphicId);
      if (['toggle', 'continue'].includes(requested) && this.repeated(stageId, graphicId, requested))
        return { ...this.snapshot(stageId, 'program'), editorRevision: this.editorRevision(stageId, graphicId), repeated: true };
      // Resolve inside the stage queue, using actual program membership rather
      // than saved onair flags, preview selection or a Companion-local toggle.
      if (action === 'toggle') action = active ? 'stop' : 'play';
      // Stop is always allowed: it only ever takes graphics off air.
      if (this.restartPending && action !== 'stop') fail('Server restart in progress; try again after it reconnects', 503);
      if (action === 'stop') {
        // Act on the in-memory program first: an unreadable or locked rundown
        // must never keep a graphic on air. Persist the onair flags afterwards.
        if (!active) {
          let known = this.repository.peek(stageId);
          if (!known) known = await this.repository.read(stageId).catch(() => undefined);
          if (known) this.repository.item(known, graphicId);
        } else {
          state.program = state.program.filter(current => current.id !== graphicId);
        }
        this.publish(stageId);
        if (active) await this.persist(stageId);
        if (requested === 'toggle') this.pressed(stageId, graphicId, requested);
        return { ...this.snapshot(stageId, 'program'), editorRevision: this.editorRevision(stageId, graphicId) };
      }
      const rundown = await this.repository.read(stageId);
      const item = this.repository.item(rundown, graphicId);
      await this.sources?.ready;
      const changesData = ['play', 'update', 'save', 'preview', 'focus'].includes(action);
      const originalContent = JSON.stringify([item.DataFields, item.ycsLinks || {}]);
      if (changesData && options.revision !== undefined && options.revision !== (item.ycsEditRevision || 0)) fail('This graphic was saved in another controller. Reload before continuing.', 409);
      if (changesData && options.links !== undefined && (!options.links || typeof options.links !== 'object' || Array.isArray(options.links))) fail('Invalid field links');
      if (changesData) {
        // Validate every incoming value before filtering linked display values.
        const checked = clone(item);
        fieldValues(checked, fields);
        const links = clone(item.ycsLinks || {});
        for (const [field, link] of Object.entries(options.links || {})) {
          if (!linkable(item, field) || !link || !['manual', 'linked'].includes(link.mode) || typeof link.manual !== 'string') fail('Invalid field link');
          if (link.mode === 'linked' && !this.sources?.mapping(stageId, graphicId, field, item.relpath)) fail('Assign a source in Data Manager before linking this field', 422);
          links[field] = { mode: link.mode, manual: manualValue(item.DataFields.find(def => def.field === field), link.manual) };
        }
        for (const field of item.DataFields) {
          if (!linkable(item, field.field)) continue;
          const link = links[field.field];
          if (!link) continue;
          const incoming = fields?.find(candidate => candidate.field === field.field);
          if (link.mode === 'manual' && incoming) link.manual = checked.DataFields.find(candidate => candidate.field === field.field).value;
          link.manual = manualValue(field, link.manual);
          // The persisted field remains the manual fallback, not a transient
          // source value copied out of the editor's read-only input.
          checked.DataFields.find(candidate => candidate.field === field.field).value = link.manual;
        }
        item.DataFields = checked.DataFields;
        if (Object.keys(links).length) item.ycsLinks = links;
        // Validate the resulting saved/manual values too, including fields
        // omitted by Companion or by a partial API patch.
        for (const field of item.DataFields) if (linkable(item, field.field)) field.value = manualValue(field, field.value ?? '');
      }
      const contentChanged = originalContent !== JSON.stringify([item.DataFields, item.ycsLinks || {}]);
      const routed = await this.routed(stageId, item);
      // Continue operates on the active snapshot even if routing is now invalid.
      const graphic = action === 'continue' ? clone(active || {links:{}}) : action === 'save' && !Object.hasOwn(this.slots, routed.ycsSlot) ? null : descriptor({ ...routed, ycsStage: stageId }, this.slots, this.sources);
      // A poll may prune while a rundown write awaits disk. Hold this descriptor
      // until its links have been installed in program/preview, or the write fails.
      const release = this.sources?.holdReferences?.(Object.values(graphic?.links || {}).filter(link => link.mode === 'linked').map(link => link.source));
      let deferred = false;
      try {
        if (action === 'preview' || action === 'focus') {
          state.draft = graphic;
        } else if (action === 'save') {
          if (contentChanged) item.ycsEditRevision = (item.ycsEditRevision || 0) + 1;
          this.flag(rundown, state.program);
          await this.repository.write(stageId, rundown);
          if (state.draft?.id === graphicId) state.draft = graphic;
        } else if (action === 'continue') {
          if (!active) fail('Graphic is not active', 409);
          if (!(Number(item.steps) > 1)) fail('Graphic has no continuation step', 422);
          // An explicit increment is replayed after a remount or output reload.
          active.continuation = (active.continuation || 0) + 1;
        } else {
          let next = clone(state.program);
          if (action === 'play') {
            // Repeating Play for an active graphic updates it without an IN replay.
            next = next.filter(current => current.slot !== graphic.slot && current.id !== graphicId);
            if (active?.continuation) graphic.continuation = active.continuation;
            next.push(graphic);
          } else if (active) {
            graphic.continuation = active.continuation;
            next = next.filter(current => current.id === graphicId || current.slot !== graphic.slot).map(current => current.id === graphicId ? graphic : current);
          }
          if (contentChanged) {
            // New field values must be saved before they go on air.
            item.ycsEditRevision = (item.ycsEditRevision || 0) + 1;
            this.flag(rundown, next);
            await this.repository.write(stageId, rundown);
          } else deferred = true; // Saved data only: onair flags follow best-effort.
          state.program = next;
          if (state.draft?.id === graphicId) state.draft = graphic;
        }
        this.publish(stageId);
        if (deferred) await this.persist(stageId);
        if (['toggle', 'continue'].includes(requested)) this.pressed(stageId, graphicId, requested);
        if (action === 'focus') this.emit(stageId + ':focus', { stage: stageId, selected: graphicId });
        return { ...this.snapshot(stageId, action === 'preview' || action === 'focus' || action === 'save' ? 'preview' : 'program'), editorRevision: item.ycsEditRevision || 0 };
      } finally { release?.(); }
    }, { duringRestart: true });
  }
  refreshLinks(stageId) {
    return this.queue(stageId, async () => {
      const state = this.state(stageId);
      let changed = false;
      for (const graphic of [...state.program, ...(state.draft ? [state.draft] : [])]) {
        for (const [field, link] of Object.entries(graphic.links || {})) {
          let value = this.sources?.value(link.source);
          if(value!==undefined){try{value=normalizeField(link.definition||{ftype:'textfield'},value);}catch{continue;}}
          if (link.mode === 'linked' && value !== undefined && value !== graphic.data[field]) {
            graphic.data[field] = value;
            changed = true;
          }
        }
      }
      if (changed) this.publish(stageId);
    });
  }
  clear(stageId) {
    // Stop stage acts on memory first, like Stop, and is allowed during a restart.
    return this.queue(stageId, async () => {
      const state = this.state(stageId);
      this.notices.delete(stageId);
      state.program = [];
      state.draft = null;
      this.publish(stageId);
      await this.persist(stageId);
      return this.snapshot(stageId, 'program');
    }, { duringRestart: true });
  }
  close() {
    for (const entry of this.persistence.values()) clearTimeout(entry.timer);
  }
}

module.exports = { Playback, RundownRepository, fieldValues, prepareEdits };
