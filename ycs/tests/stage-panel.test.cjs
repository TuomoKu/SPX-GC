'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { JSDOM } = require('jsdom');
async function panel(t, origin = 'http://192.0.2.7:5660') {
  const dom = new JSDOM(
    '<div id="previewBG"><iframe id="previewIF" src="/output/stage-2/preview" width="1920" height="1080"></iframe></div><div id="controllerPluginButtons"></div>',
    {
      url: origin + '/gc/Stage2/Show',
      runScripts: 'outside-only'
    }
  );
  const { window } = dom;
  let stops = 0;
  window.eval(await fs.readFile(path.join(__dirname, '../public/stage-panel.js'), 'utf8'));
  const controller = new window.YCSStagePanel({
    stage: 'stage-2',
    onStop: async () => {
      stops++;
    }
  });
  t.after(() => {
    controller.dispose();
    window.close();
  });
  return { window, controller, element: controller.element, stops: () => stops };
}
test('monitor selection preserves the native renderer, labels its mode and never sends playout or changes stage', async (t) => {
  const r = await panel(t),
    document = r.window.document,
    frame = document.getElementById('previewIF'),
    background = document.getElementById('previewBG');
  assert.equal(background.parentElement.className, 'ycs-monitor-shell');
  assert.equal(frame.width, '1920');
  assert.equal(frame.height, '1080');
  assert.equal(r.element.querySelector('.ycs-stage-links'), null);
  assert.equal(r.element.querySelector('.ycs-output-details'), null);
  assert.equal(document.querySelector('.ycs-monitor-label').textContent, 'Preview');
  r.element.querySelector('[data-monitor="program"]').click();
  assert.equal(frame.getAttribute('src'), '/output/stage-2/program');
  assert.equal(frame.title, 'STAGE 2 · Program output');
  assert.equal(document.querySelector('.ycs-monitor-label').textContent, 'Program');
  assert.equal(
    r.element.querySelector('[data-monitor="program"]').getAttribute('aria-pressed'),
    'true'
  );
  assert.equal(
    r.element.querySelector('[data-monitor="preview"]').getAttribute('aria-pressed'),
    'false'
  );
  assert.equal(document.getElementById('previewIF'), frame);
  r.controller.setProgram({ graphics: [{ id: 'ticker' }] });
  assert.equal(
    r.element.querySelector('[data-output="program"]').classList.contains('is-active'),
    true
  );
  r.controller.setConnected(false);
  assert.equal(r.element.querySelector('.ycs-connection-status').hidden, false);
  r.controller.setPreview({ selected: 'ticker' });
  assert.equal(r.element.querySelector('.ycs-connection-status').hidden, true);
  assert.match(r.element.querySelector('[data-monitor="preview"]').title, /ticker draft/);
  r.element.querySelector('[data-monitor="preview"]').click();
  assert.equal(frame.getAttribute('src'), '/output/stage-2/preview');
  assert.equal(r.stops(), 0);
  r.element.querySelector('.ycs-clear').click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(r.stops(), 1);
  assert.equal(r.element.querySelector('.ycs-clear').disabled, false);
});
test('copy buttons use the respective absolute stage output URL without changing the monitor or invoking panic', async (t) => {
  const r = await panel(t, 'http://localhost:5660'),
    copied = [];
  r.window.document.documentElement.dataset.ycsServerAddress = '192.0.2.7:5660';
  Object.defineProperty(r.window.navigator, 'clipboard', {
    value: { writeText: async (value) => copied.push(value) }
  });
  for (const mode of ['program', 'preview']) {
    r.element.querySelector('[data-copy-output="' + mode + '"]').click();
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.deepEqual(copied, [
    'http://192.0.2.7:5660/output/stage-2/program',
    'http://192.0.2.7:5660/output/stage-2/preview'
  ]);
  assert.equal(
    r.window.document.getElementById('previewIF').getAttribute('src'),
    '/output/stage-2/preview'
  );
  assert.equal(r.stops(), 0);
  assert.match(
    r.element.querySelector('.ycs-copy-status').textContent,
    /Preview output URL copied/
  );
});
test('LAN HTTP copying falls back to selected text, reports browser denial and ignores late clipboard completion after disposal', async (t) => {
  const r = await panel(t);
  let copied;
  r.window.document.execCommand = (command) => {
    assert.equal(command, 'copy');
    copied = r.window.document.activeElement.value;
    return true;
  };
  await r.controller.copyOutput('program');
  assert.equal(copied, 'http://192.0.2.7:5660/output/stage-2/program');
  assert.equal(r.element.querySelector('.ycs-copy-fallback').hidden, true);
  r.window.document.execCommand = () => false;
  await r.controller.copyOutput('preview');
  const fallback = r.element.querySelector('.ycs-copy-fallback');
  assert.equal(fallback.hidden, false);
  assert.equal(fallback.value, 'http://192.0.2.7:5660/output/stage-2/preview');
  assert.equal(fallback.selectionStart, 0);
  assert.equal(fallback.selectionEnd, fallback.value.length);
  assert.match(r.element.querySelector('.ycs-copy-status').textContent, /Copy unavailable/);
  let reject;
  Object.defineProperty(r.window.navigator, 'clipboard', {
    value: {
      writeText: () =>
        new Promise((resolve, fail) => {
          reject = fail;
        })
    }
  });
  const status = r.element.querySelector('.ycs-copy-status').textContent;
  const pending = r.controller.copyOutput('program');
  r.controller.dispose();
  reject(new Error('Denied'));
  await pending;
  assert.equal(r.element.querySelector('.ycs-copy-status').textContent, status);
  assert.equal(fallback.value, 'http://192.0.2.7:5660/output/stage-2/preview');
});

test('output health shows each mode\'s renderer errors and hides once outputs recover', async (t) => {
  const r = await panel(t);
  const status = r.element.querySelector('.ycs-output-health');
  assert.equal(status.hidden, true);
  r.controller.setOutputHealth({
    program: { connected: 2, ready: 1, errors: ['ticker: Template failed', 'ticker: Template failed'] },
    preview: { connected: 1, ready: 0, errors: ['Output needs login; retaining current graphics'] }
  });
  assert.equal(status.hidden, false);
  assert.equal(
    status.textContent,
    'Program output · ticker: Template failed; Preview output · Output needs login; retaining current graphics'
  );
  r.controller.setConnected(false);
  assert.equal(r.element.querySelector('.ycs-connection-status').hidden, false, 'connection line is separate');
  r.controller.setOutputHealth({ program: { errors: [] }, preview: { errors: [] } });
  assert.equal(status.hidden, true);
  assert.equal(status.textContent, '');
});
