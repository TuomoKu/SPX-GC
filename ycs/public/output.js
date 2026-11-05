// Per-slot output workers preserve committed frames while replacements load.
const [, , stage, mode] = location.pathname.split('/');
const root = document.getElementById('composition');
const frames = new Map(),
  jobs = new Map(),
  provisional = new Set(),
  retired = new Set();
// Quick retries cover a template blip; after that a failed slot keeps retrying
// at the heartbeat interval so it recovers without another operator command.
const retryDelays = [250, 1000, 3000],
  retryCap = 5000,
  // A template that fails after it was shown replays its entrance on each attempt.
  // Keep trying, so a temporary fault cannot leave a permanent hole, but rarely.
  shownRetry = 30000;
let disposed = false,
  revision = -1,
  latest,
  epoch = 0;
let renderedRevision = -1,
  renderingError = '',
  connectionError = '';
const rendererId =
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
        byte.toString(16).padStart(2, '0')
      ).join('');
document.documentElement.dataset.stage = stage;
document.documentElement.dataset.mode = mode;
async function report(state = renderingError ? 'error' : 'ready', keepalive = false) {
  try {
    await fetch(`/api/ycs/stages/${stage}/${mode}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive,
      body: JSON.stringify({
        id: rendererId,
        state,
        revision: renderedRevision,
        message: renderingError.slice(0, 300)
      })
    });
  } catch {
    /* Missed heartbeats are detected on the server. */
  }
}
const keyOf = (graphic) => JSON.stringify(graphic || null);
const sameTemplate = (a, b) => a && b && a.id === b.id && a.template === b.template;
const superseded = () => new DOMException('Output operation superseded', 'AbortError');
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function bounded(promise, milliseconds = 8000, signal) {
  let timer, abort;
  const limit = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Template lifecycle timed out')), milliseconds);
    abort = () => reject(superseded());
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
  });
  return Promise.race([promise, limit]).finally(() => {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  });
}
async function invoke(entry, method, args = [], signal) {
  if (signal?.aborted || disposed) throw superseded();
  const callback = entry.frame.contentWindow?.[method];
  if (typeof callback !== 'function') throw new Error(`Template has no ${method} lifecycle`);
  await bounded(Promise.resolve(callback.apply(entry.frame.contentWindow, args)), 8000, signal);
  if (signal?.aborted || disposed) throw superseded();
}
async function mount(graphic, signal) {
  const frame = document.createElement('iframe');
  frame.className = 'graphic';
  frame.dataset.graphic = graphic.id;
  frame.dataset.slot = graphic.slot;
  frame.style.zIndex = graphic.z;
  frame.style.visibility = 'hidden';
  frame.title = `${stage} ${mode} ${graphic.id}`;
  const loaded = new Promise((resolve, reject) => {
    frame.onload = resolve;
    frame.onerror = reject;
  });
  const url = new URL(graphic.template, location.origin);
  url.searchParams.set('ycsStage', stage);
  url.searchParams.set('ycsMode', mode);
  frame.src = url;
  const entry = { frame, graphic, continuation: graphic.continuation || 0 };
  const remove = () => frame.remove();
  provisional.add(entry);
  signal.addEventListener('abort', remove, { once: true });
  root.append(frame);
  let shown = false;
  try {
    await bounded(loaded, 8000, signal);
    await invoke(entry, 'update', [JSON.stringify(graphic.data)], signal);
    if (signal.aborted || disposed) throw superseded();
    frame.style.visibility = '';
    shown = true;
    await invoke(entry, 'play', [], signal);
    entry.data = JSON.stringify(graphic.data);
    // A reload or remount of a stepped graphic returns to the step on air.
    for (let step = 0; step < entry.continuation; step++) await invoke(entry, 'next', [], signal);
    return entry;
  } catch (error) {
    frame.remove();
    if (shown && error?.name !== 'AbortError') throw Object.assign(new Error(error?.message || String(error)), { afterShown: true });
    throw error;
  } finally {
    provisional.delete(entry);
    signal.removeEventListener('abort', remove);
  }
}
async function retire(entry) {
  if (retired.has(entry)) return;
  retired.add(entry);
  const controller = new AbortController();
  entry.retireController = controller;
  try {
    await bounded(
      invoke(entry, 'stop', [], controller.signal).then(() =>
        delay(Math.min(entry.graphic.exitMs ?? 250, 2000))
      ),
      2000
    );
  } catch (error) {
    if (!disposed) console.warn('[YCS output]', error.message);
  } finally {
    controller.abort();
    entry.frame.remove();
    retired.delete(entry);
  }
}
function health() {
  if (disposed || !latest) return;
  const errors = [...jobs.values()]
    .filter((job) => job.error)
    .map((job) => job.slot + ': ' + job.error);
  renderingError = connectionError || errors.join('; ');
  root.dataset.error = renderingError;
  const complete = [...jobs.values()].every(
    (job) => !job.running && !job.error && job.applied === job.key
  );
  if (complete) {
    renderedRevision = latest.revision;
    root.dataset.revision = latest.revision;
  }
  report();
}
async function apply(job, graphic, signal) {
  let entry = frames.get(job.slot);
  if (!graphic) {
    if (entry) {
      frames.delete(job.slot);
      await bounded(retire(entry), 2500, signal);
    }
    return;
  }
  if (!sameTemplate(entry?.graphic, graphic)) {
    const replacement = await mount(graphic, signal);
    if (signal.aborted || disposed) {
      replacement.frame.remove();
      throw superseded();
    }
    frames.set(job.slot, replacement);
    if (entry) await bounded(retire(entry), 2500, signal);
    return;
  }
  const data = JSON.stringify(graphic.data);
  if (entry.data !== data) {
    await invoke(entry, 'update', [data], signal);
    entry.data = data;
  }
  if ((graphic.continuation || 0) !== entry.continuation) {
    await invoke(entry, 'next', [], signal);
    entry.continuation = graphic.continuation || 0;
  }
  entry.graphic = graphic;
}
function kick(job) {
  if (disposed || !latest || job.running || job.timer || (job.applied === job.key && !job.error))
    return;
  const key = job.key,
    graphic = job.goal,
    generation = epoch;
  const controller = new AbortController();
  job.running = true;
  // A superseded run can leave the slot anywhere between the old and new goal
  // (for example an aborted exit still removes its frame), so nothing counts as
  // applied until this run completes.
  job.applied = undefined;
  job.target = graphic;
  job.controller = controller;
  apply(job, graphic, controller.signal)
    .then(() => {
      if (controller.signal.aborted || disposed || generation !== epoch) return;
      job.applied = key;
      job.error = '';
      job.failures = 0;
      job.shownFailures = 0;
    })
    .catch((error) => {
      if (error.name === 'AbortError' || disposed || generation !== epoch) return;
      // New data for the same graphic must not skip the retry limit below. That
      // includes a retry that fails before it shows, once the graphic has been shown.
      if (job.key !== key && !((error.afterShown || job.shownFailures) && sameTemplate(job.goal, graphic))) return;
      job.error = error.message;
      console.error('[YCS output]', job.slot, error);
      const wait = error.afterShown
        ? retryDelays[job.shownFailures++] ?? shownRetry
        : retryDelays[job.failures++] ?? retryCap;
      job.timer = setTimeout(() => {
        job.timer = null;
        kick(job);
      }, wait);
    })
    .finally(() => {
      job.running = false;
      job.controller = null;
      job.target = undefined;
      if (disposed) return;
      health();
      if (job.key !== key || generation !== epoch) kick(job);
    });
}
const events = io('/ycs-playback', {
  transports: ['websocket'],
  forceNew: true,
  auth: { viewer: true, stage, mode }
});
events.on('connect', () => {
  epoch++;
  revision = -1;
  latest = null;
  for (const job of jobs.values()) {
    job.controller?.abort();
    clearTimeout(job.timer);
    job.timer = null;
    job.shownFailures = 0;
  }
  events.emit('subscribe', { stage, modes: [mode] });
});
events.on('state', (snapshot) => {
  if (
    disposed ||
    snapshot.stage !== stage ||
    snapshot.mode !== mode ||
    snapshot.revision < revision
  )
    return;
  revision = snapshot.revision;
  latest = snapshot;
  connectionError = '';
  document.documentElement.dataset.connection = 'connected';
  const wanted = new Map(snapshot.graphics.map((graphic) => [graphic.slot, graphic]));
  for (const slot of new Set([...jobs.keys(), ...wanted.keys()])) {
    let job = jobs.get(slot);
    if (!job) {
      job = { slot, applied: keyOf(null), failures: 0, shownFailures: 0, error: '' };
      jobs.set(slot, job);
    }
    const goal = wanted.get(slot) || null,
      key = keyOf(goal);
    // Every publish carries all of a stage's slots. Updates, including this graphic's
    // own data, must not retry a shown failure early and replay its entrance. Stop,
    // a different graphic or a reconnect clears this.
    if (job.shownFailures && goal && sameTemplate(job.goal, goal)) {
      job.goal = goal;
      job.key = key;
      continue;
    }
    job.shownFailures = 0;
    if (key !== job.key) {
      // Keep data updates serial: new data for the graphic in flight, even during
      // its entrance, is applied when that finishes, so the entrance never restarts.
      // Stop or a different graphic cancels the run, so Stop never waits for a stale
      // Play and reverting a loading replacement never briefly shows it.
      if (job.running && !sameTemplate(job.target, goal)) job.controller?.abort();
      clearTimeout(job.timer);
      job.timer = null;
      job.failures = 0;
      job.error = '';
      job.goal = goal;
      job.key = key;
    } else if (job.error) {
      clearTimeout(job.timer);
      job.timer = null;
      job.failures = 0;
    }
    kick(job);
  }
  health();
});
function disconnected() {
  if (disposed) return;
  document.documentElement.dataset.connection = 'reconnecting';
  connectionError = 'Output connection lost; retaining current graphics';
  renderingError = connectionError;
  report();
}
let renewing = false,
  lastRenewal = 0,
  renewalTimer = null;
function scheduleRenewal() {
  if (disposed || events.connected || renewing || renewalTimer !== null) return;
  renewalTimer = setTimeout(renewViewerSession, Math.max(0, lastRenewal + 5000 - Date.now()));
}
async function renewViewerSession() {
  renewalTimer = null;
  if (disposed || events.connected) return;
  renewing = true;
  lastRenewal = Date.now();
  try {
    // Server restarts lose in-memory sessions. Refresh only this output's
    // grant, then reconnect even after a namespace auth error (not retried by Socket.IO).
    const response = await fetch(location.pathname, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000)
    });
    // CheckLogin answers an expired login-mode session with a redirect to the
    // login page, which also returns 200. That is not a renewed output grant.
    const final = response.url ? new URL(response.url, location.href).pathname : location.pathname;
    if (!disposed && (response.redirected || final !== location.pathname)) {
      connectionError = 'Output needs login; retaining current graphics';
      renderingError = connectionError;
      root.dataset.error = renderingError;
      report();
    } else if (!disposed && response.ok) {
      events.disconnect(); // Reopen the transport with the renewed session cookie.
      events.connect?.();
    }
  } catch {
    /* Retry only this read-only output authorization route. */
  } finally {
    renewing = false;
    scheduleRenewal();
  }
}
events.on('disconnect', disconnected);
events.on('connect_error', () => {
  disconnected();
  scheduleRenewal();
});
events.on('stage-error', (error) => {
  renderingError = error.error;
  report();
});
const healthTimer = setInterval(() => report(), 5000);
window.addEventListener(
  'pagehide',
  () => {
    disposed = true;
    clearInterval(healthTimer);
    clearTimeout(renewalTimer);
    for (const job of jobs.values()) {
      job.controller?.abort();
      clearTimeout(job.timer);
    }
    report('closed', true);
    try {
      events.disconnect();
    } catch {
      /* Transport may already be closed. */
    }
    for (const entry of [...frames.values(), ...provisional, ...retired]) {
      entry.retireController?.abort();
      entry.frame.remove();
    }
  },
  { once: true }
);
