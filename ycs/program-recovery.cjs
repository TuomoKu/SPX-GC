'use strict';
// Restart recovery. Each stage's Program (and Preview draft) is kept in a small
// state file with a heartbeat, so a server that was killed, crashed or lost power
// can put back exactly what was on air when it returns within the window.
// A deliberate stop records a clean shutdown and the next start is clean.
const fs = require('node:fs/promises');
const { writeText } = require('../utils/config-store.cjs');

const VERSION = 1;
const identifier = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,95}$/;
const plain = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const seconds = ms => Math.max(0, Math.round(ms / 1000));
function bounded(promise, ms, message) {
  let timer;
  const limit = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); timer.unref?.(); });
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer));
}

function windowSeconds(value, log = console) {
  if (value === undefined) return 120;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    log.warn('[YCS restore] ycs.restoreProgramWithinSeconds must be a number of seconds, or 0 to disable; using 120');
    return 120;
  }
  return value;
}

// A saved graphic must be a well-formed playback descriptor. Anything else means
// the file is not ours or is damaged, and that stage starts clean.
function validGraphic(graphic) {
  return plain(graphic) && typeof graphic.id === 'string' && graphic.id.length > 0 && graphic.id.length <= 96 &&
    identifier.test(graphic.slot) && Number.isInteger(graphic.z) &&
    typeof graphic.template === 'string' && graphic.template.startsWith('/templates/') && !graphic.template.split('/').includes('..') &&
    plain(graphic.data) && (graphic.links === undefined || plain(graphic.links)) &&
    (graphic.exitMs === undefined || (typeof graphic.exitMs === 'number' && graphic.exitMs >= 0)) &&
    (graphic.continuation === undefined || (Number.isInteger(graphic.continuation) && graphic.continuation >= 0));
}
function validStage(saved) {
  if (!plain(saved) || !Number.isSafeInteger(saved.revision) || saved.revision < 0 || !Array.isArray(saved.program) || saved.program.length > 64) return false;
  if (!saved.program.every(validGraphic)) return false;
  if (new Set(saved.program.map(graphic => graphic.id)).size !== saved.program.length) return false;
  if (new Set(saved.program.map(graphic => graphic.slot)).size !== saved.program.length) return false;
  return saved.draft === null || saved.draft === undefined || validGraphic(saved.draft);
}

class ProgramRecovery {
  constructor(file, { withinSeconds, stopMarker = null, heartbeatMs = 5000, now = Date.now, pid = process.pid, readTimeout = 2000, writeTimeout = 5000, log = console } = {}) {
    Object.assign(this, { file, stopMarker, heartbeatMs, now, pid, readTimeout, writeTimeout, log });
    this.withinSeconds = windowSeconds(withinSeconds, log);
    this.startedAt = now();
    this.writing = null;
    this.dirty = false;
    this.closed = false;
    this.failing = false;
  }
  async read(file) {
    return bounded(fs.readFile(file, 'utf8'), this.readTimeout, 'read timed out');
  }
  // Was the last run stopped by the Windows launcher? Its stop script cannot
  // signal Node, so it leaves a marker naming the process it terminated.
  async stoppedByLauncher(saved) {
    if (!this.stopMarker) return false;
    let marker;
    try { marker = JSON.parse(await this.read(this.stopMarker)); } catch { return false; }
    const matches = plain(marker) && marker.id === saved.pid && Number.isFinite(marker.stoppedAt) && marker.stoppedAt >= saved.startedAt;
    if (matches) await fs.rm(this.stopMarker, { force: true }).catch(() => {});
    return matches;
  }
  // Decide once, at startup, whether to restore. Never throws: any doubt starts clean.
  async decide(stageIds) {
    const clean = (reason, downtimeMs) => ({ restore: false, reason, downtimeMs, stages: new Map() });
    if (this.withinSeconds === 0) return clean('restoration is disabled (ycs.restoreProgramWithinSeconds is 0)');
    let saved;
    try {
      const raw = await this.read(this.file);
      if (raw.length > 8 * 1024 * 1024) throw new Error('file too large');
      saved = JSON.parse(raw);
      if (!plain(saved) || saved.version !== VERSION || !plain(saved.stages) || !Number.isFinite(saved.heartbeat) || !Number.isFinite(saved.startedAt)) throw new Error('unrecognised contents');
    } catch (error) {
      if (error.code === 'ENOENT') return clean('no saved program state');
      return clean(`saved program state could not be used (${error.message})`);
    }
    const downtimeMs = this.now() - saved.heartbeat;
    if (saved.clean === true) return clean('the previous run stopped cleanly', downtimeMs);
    if (await this.stoppedByLauncher(saved)) return clean('the launcher stopped the previous run', downtimeMs);
    // A clock that moved backwards cannot measure the outage; do not guess.
    if (downtimeMs < -10000) return clean('the system clock moved back since the last heartbeat');
    if (downtimeMs > this.withinSeconds * 1000) return clean(`the server was down ${seconds(downtimeMs)} s, longer than the ${this.withinSeconds} s window`, downtimeMs);
    const stages = new Map();
    for (const id of stageIds) {
      const stage = saved.stages[id];
      if (stage === undefined) continue;
      if (!validStage(stage)) { this.log.warn(`[YCS restore] ${id}: saved program is damaged; this stage starts clean`); continue; }
      stages.set(id, { revision: stage.revision, program: stage.program, draft: stage.draft || null });
    }
    return { restore: true, reason: `the server was down ${seconds(Math.max(0, downtimeMs))} s, within the ${this.withinSeconds} s window`, downtimeMs: Math.max(0, downtimeMs), stages };
  }
  // Start keeping the file current: after each published change and on a heartbeat.
  attach(playback) {
    this.playback = playback;
    this.listener = () => this.changed();
    playback.on('publish', this.listener);
    this.heartbeat = setInterval(() => this.save(), this.heartbeatMs);
    this.heartbeat.unref?.();
    return this.save();
  }
  changed() {
    if (this.closed || this.pending) return;
    // Write right after the command, outside it. Changes made while a write is
    // in flight are coalesced into the next one.
    this.pending = setTimeout(() => { this.pending = null; this.save(); }, 0);
    this.pending.unref?.();
  }
  document(clean = false) {
    const stages = {};
    for (const [id, state] of this.playback.states) stages[id] = { revision: state.revision, program: state.program, draft: state.draft || null };
    return { version: VERSION, pid: this.pid, startedAt: this.startedAt, heartbeat: this.now(), clean, stages };
  }
  // One write at a time; a change during a write is saved right after it. A
  // failed or stuck write is logged and never reaches a command.
  save(clean = false) {
    if (this.closed && !clean) return Promise.resolve();
    if (this.writing) { this.dirty = true; return this.writing; }
    let text;
    try { text = JSON.stringify(this.document(clean)) + '\n'; }
    catch (error) { this.log.warn(`[YCS restore] could not record program state (${error.message})`); return Promise.resolve(); }
    const problem = message => {
      if (!this.failing) this.log.warn(`[YCS restore] could not save program state (${message}); restart recovery may be out of date`);
      this.failing = true;
    };
    // A stuck write (a hung share) still owns the file until it settles, so
    // later saves wait for it rather than piling up behind it.
    const stuck = setTimeout(() => problem('write is not responding'), this.writeTimeout);
    stuck.unref?.();
    this.writing = writeText(this.file, text).then(() => {
      if (this.failing) this.log.warn('[YCS restore] program state is being saved again');
      this.failing = false;
    }, error => problem(error.message)).finally(() => {
      clearTimeout(stuck);
      this.writing = null;
      if (this.dirty && !this.closed) { this.dirty = false; this.save(); }
    });
    return this.writing;
  }
  stop() {
    this.closed = true;
    clearInterval(this.heartbeat);
    clearTimeout(this.pending);
    this.pending = null;
    if (this.playback && this.listener) this.playback.off('publish', this.listener);
  }
  // A deliberate stop: record it so the next start is clean, however soon.
  async shutdown(timeout = 2000) {
    this.stop();
    try {
      await bounded((async () => {
        while (this.writing) await this.writing;
        await this.save(true);
      })(), timeout, 'timed out');
    } catch (error) {
      this.log.warn(`[YCS restore] could not record a clean shutdown (${error.message})`);
    }
  }
}

module.exports = { ProgramRecovery, windowSeconds, validStage, VERSION };
