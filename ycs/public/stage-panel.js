// Operator-only monitor controls. Selecting or copying an output never sends
// a playback command; the panic callback is the only playout action here.
window.YCSStagePanel = class StagePanel {
  constructor({ stage, onStop, onDismissRestored }) {
    this.stage = stage;
    this.onStop = onStop;
    this.onDismissRestored = onDismissRestored;
    this.title = stage.toUpperCase().replaceAll('-', ' ');
    this.frame = document.getElementById('previewIF');
    this.element = document.createElement('section');
    this.element.className = 'ycs-stage-panel';
    this.element.setAttribute('aria-label', this.title + ' controls');
    this.element.innerHTML = `
      <strong class="ycs-heading"></strong>
      <span class="ycs-output-label">Output</span>
      <div class="ycs-output-options" role="group" aria-label="Monitor output">
        ${['preview', 'program']
          .map(
            (mode) => `
          <div class="ycs-output-choice" data-output="${mode}">
            <button type="button" class="ycs-output-select" data-monitor="${mode}" aria-pressed="false">
              <span class="ycs-output-dot" aria-hidden="true"></span>${this.modeTitle(mode)}
            </button>
            <button type="button" class="ycs-copy-output" data-copy-output="${mode}" aria-label="Copy ${mode} output URL">${this.icon('copy')}</button>
          </div>`
          )
          .join('')}
      </div>
      <div class="ycs-copy-status" role="status" aria-live="polite"></div>
      <input class="ycs-copy-fallback" aria-label="Output URL to copy" readonly hidden>
      <div class="ycs-connection-status" role="status" hidden></div>
      <div class="ycs-connection-status ycs-output-health" role="status" hidden></div>
      <div class="ycs-connection-status ycs-restored-status" role="status" hidden><span></span> <button type="button" class="ycs-restored-dismiss">Dismiss</button></div>
      <div class="ycs-panel-footer">
        <button type="button" class="ycs-clear">${this.icon('stop')}Stop stage</button>
        <a class="ycs-manager-link" href="/ycs/data-manager">Data Manager ↗</a>
      </div>
      <div class="ycs-command-status" role="status" aria-live="polite"></div>`;
    this.element.querySelector('.ycs-heading').textContent = this.title;
    this.element.querySelector('.ycs-manager-link').href =
      '/ycs/data-manager?stage=' + encodeURIComponent(stage);
    document.getElementById('controllerPluginButtons')?.prepend(this.element);
    const background = document.getElementById('previewBG');
    if (background && this.frame && background.contains(this.frame)) {
      this.monitor = document.createElement('div');
      this.monitor.className = 'ycs-monitor-shell';
      this.monitor.innerHTML = '<div class="ycs-monitor-label"></div>';
      background.before(this.monitor);
      this.monitor.append(background);
      document.getElementById('previewWidthRuler')?.classList.add('ycs-preview-ruler');
    }
    for (const button of this.element.querySelectorAll('[data-monitor]')) {
      button.addEventListener('click', () => this.selectMonitor(button.dataset.monitor));
    }
    for (const button of this.element.querySelectorAll('[data-copy-output]')) {
      button.title = 'Copy ' + this.modeTitle(button.dataset.copyOutput) + ' output URL';
      button.addEventListener('click', () => this.copyOutput(button.dataset.copyOutput));
    }
    this.element.querySelector('.ycs-clear').title = 'Stop all graphics on ' + this.title;
    this.element.querySelector('.ycs-clear').addEventListener('click', async () => {
      const button = this.element.querySelector('.ycs-clear');
      button.disabled = true;
      try {
        await this.onStop();
      } catch (error) {
        this.notify(error.message, true);
      } finally {
        button.disabled = false;
      }
    });
    this.element.querySelector('.ycs-restored-dismiss').addEventListener('click', () => {
      this.setRestored(null);
      this.onDismissRestored?.();
    });
    const current = this.frame?.getAttribute('src');
    this.selectMonitor(current === this.outputPath('program') ? 'program' : 'preview', false);
  }
  icon(name) {
    const paths = {
      copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
      eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
      stop: '<rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor" stroke="none"/>',
      program:
        '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>'
    };
    return `<svg class="ycs-panel-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
  }
  modeTitle(mode) {
    return mode === 'program' ? 'Program' : 'Preview';
  }
  outputPath(mode) {
    return '/output/' + encodeURIComponent(this.stage) + '/' + mode;
  }
  outputURL(mode) {
    return new URL(this.outputPath(mode), window.location.href).href;
  }
  selectMonitor(mode, navigate = true) {
    if (!['preview', 'program'].includes(mode)) return;
    this.mode = mode;
    const path = this.outputPath(mode);
    if (navigate && this.frame && this.frame.getAttribute('src') !== path) this.frame.src = path;
    if (this.frame) this.frame.title = this.title + ' · ' + this.modeTitle(mode) + ' output';
    for (const choice of this.element.querySelectorAll('[data-output]')) {
      const selected = choice.dataset.output === mode;
      choice.classList.toggle('is-selected', selected);
      choice.querySelector('[data-monitor]').setAttribute('aria-pressed', String(selected));
    }
    if (this.monitor) {
      this.monitor.dataset.mode = mode;
      this.monitor.querySelector('.ycs-monitor-label').innerHTML =
        this.icon(mode === 'preview' ? 'eye' : 'program') +
        '<span>' +
        this.modeTitle(mode) +
        '</span>';
    }
  }
  copyOutput(mode) {
    return this.copyText(this.outputURL(mode), this.modeTitle(mode) + ' output URL');
  }
  async copyText(url, label, elements = {}) {
    const status = elements.status || this.element.querySelector('.ycs-copy-status'),
      fallback = elements.fallback || this.element.querySelector('.ycs-copy-fallback');
    let copied = false;
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch {
      if (this.disposed) return;
      // Clipboard API is absent on ordinary LAN HTTP pages. Keep a user-gesture
      // fallback, and expose selectable text if the browser blocks both methods.
      const focus = document.activeElement;
      fallback.value = url;
      fallback.hidden = false;
      fallback.focus();
      fallback.select();
      try {
        copied = document.execCommand('copy') === true;
      } catch {
        /* Manual copy below. */
      }
      if (copied) focus?.focus();
    }
    if (this.disposed) return;
    fallback.hidden = copied;
    status.textContent = copied
      ? label + ' copied.'
      : 'Copy unavailable. Select and copy the text below.';
    clearTimeout(this.copyTimer);
    if (copied)
      this.copyTimer = setTimeout(() => {
        status.textContent = '';
      }, 3000);
  }
  setProgram(snapshot) {
    const active = snapshot.graphics.length > 0;
    const choice = this.element.querySelector('[data-output="program"]');
    choice.classList.toggle('is-active', active);
    choice.querySelector('[data-monitor]').title = active
      ? 'Monitor program · ' + snapshot.graphics.length + ' graphics on air'
      : 'Monitor program · No graphics on air';
    this.setConnected(true);
  }
  setPreview(snapshot) {
    this.element.querySelector('[data-monitor="preview"]').title = snapshot.selected
      ? 'Monitor preview · ' + snapshot.selected + ' draft'
      : 'Monitor preview · Follows program';
    this.setConnected(true);
  }
  setConnected(connected, text = 'Controller reconnecting · Program state unconfirmed') {
    const status = this.element.querySelector('.ycs-connection-status');
    status.hidden = connected;
    status.textContent = connected ? '' : text;
  }
  // Renderer reports from /api/ycs/stages/:stage/health. A failed slot keeps its
  // previous frame on air and retries, so show the error rather than guess.
  setOutputHealth(health) {
    const status = this.element.querySelector('.ycs-output-health');
    const problems = ['program', 'preview'].flatMap((mode) =>
      [...new Set(health?.[mode]?.errors || [])].map((error) => this.modeTitle(mode) + ' output · ' + error)
    );
    status.hidden = !problems.length;
    status.textContent = problems.join('; ');
  }
  // Set by stage health after a restart restored this stage's program. Shown
  // until dismissed or the next Program command on this stage.
  setRestored(notice) {
    const status = this.element.querySelector('.ycs-restored-status');
    const count = notice?.graphics || 0;
    status.hidden = !count;
    status.querySelector('span').textContent = count
      ? `Restored ${count} graphic${count === 1 ? '' : 's'} after restart · server was down about ${notice.downtimeSeconds} s`
      : '';
  }
  setDataAvailable(available) {
    const link = this.element.querySelector('.ycs-manager-link');
    link.classList.toggle('ycs-error', !available);
    link.title = available
      ? 'Open this stage in Data Manager'
      : 'Linked data needs attention · Open Data Manager';
  }
  notify(text, error = false) {
    const status = this.element.querySelector('.ycs-command-status');
    clearTimeout(this.messageTimer);
    status.textContent = text;
    status.classList.toggle('ycs-error', error);
    if (text && !error)
      this.messageTimer = setTimeout(() => {
        status.textContent = '';
      }, 3500);
  }
  dispose() {
    this.disposed = true;
    clearTimeout(this.copyTimer);
    clearTimeout(this.messageTimer);
  }
};
