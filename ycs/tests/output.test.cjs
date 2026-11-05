'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { randomUUID } = require('node:crypto');
async function eventually(condition, label, tries = 100) {
  for (let index = 0; index < tries; index++) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  assert.fail('Renderer did not reach the expected state');
}
async function renderer(t, { lan = false, speed = 1 } = {}) {
  const dom = new JSDOM('<main id="composition"></main>', {
    url: `http://${lan ? '192.168.1.10' : 'localhost'}/output/stage-1/program`,
    runScripts: 'outside-only'
  });
  const { window } = dom;
  const calls = [],
    reports = [];
  let events,
    failed = false;
  const gates = new Map();
  window.console.error = () => {};
  window.console.warn = () => {};
  if (speed !== 1) {
    // Compress retry/heartbeat timers so capped intervals can be observed quickly.
    const schedule = window.setTimeout.bind(window);
    window.setTimeout = (callback, ms = 0, ...args) => schedule(callback, ms / speed, ...args);
  }
  window.crypto.randomUUID = lan ? undefined : randomUUID;
  const pages = [];
  window.fetch = async (url, request) => {
    if (!request?.body) {
      pages.push(url);
      return { ok: true, url };
    }
    reports.push(JSON.parse(request.body));
    return { ok: true };
  };
  window.io = () => {
    events = {
      on: (event, callback) => {
        events[event] = callback;
      },
      emit() {},
      disconnect() {}
    };
    return events;
  };
  const root = window.document.getElementById('composition');
  const append = root.append.bind(root);
  root.append = (frame) => {
    append(frame);
    for (const name of ['update', 'play', 'stop', 'next'])
      frame.contentWindow[name] = (data) => {
        calls.push({ id: frame.dataset.graphic, name, data });
        if (gates.has(frame.dataset.graphic + ':' + name))
          return gates.get(frame.dataset.graphic + ':' + name).promise;
        if (failed === name && frame.dataset.graphic === 'replacement')
          throw new Error('Template failed to load');
      };
    queueMicrotask(() => frame.onload());
  };
  window.eval(await fs.readFile(path.join(__dirname, '../public/output.js'), 'utf8'));
  t.after(() => {
    window.dispatchEvent(new window.Event('pagehide'));
    window.close();
  });
  const send = (revision, graphics) =>
    events.state({ stage: 'stage-1', mode: 'program', revision, graphics });
  const graphic = (id, slot = id, text = 'ROUND 11') => ({
    id,
    slot,
    z: 10,
    exitMs: 1,
    template: '/templates/test.html',
    data: { f5: text }
  });
  return {
    window,
    root,
    calls,
    reports,
    pages,
    events: () => events,
    send,
    graphic,
    fail: (step = 'play') => {
      failed = step;
    },
    recover: () => {
      failed = false;
    },
    block(id, method) {
      let resolve, reject;
      const promise = new Promise((done, refuse) => {
        resolve = done;
        reject = refuse;
      });
      gates.set(id + ':' + method, { promise, resolve, reject });
    },
    refuse(id, method) {
      const gate = gates.get(id + ':' + method);
      gates.delete(id + ':' + method);
      gate.reject(new Error('Template failed to load'));
    },
    release(id, method) {
      const gate = gates.get(id + ':' + method);
      gates.delete(id + ':' + method);
      gate.resolve();
    }
  };
}

test('ordinary LAN HTTP outputs start, report distinct identities and retain live update/stop behavior without randomUUID', async (t) => {
  const first = await renderer(t, { lan: true }),
    second = await renderer(t, { lan: true });
  for (const r of [first, second]) {
    r.events().connect();
    r.send(1, [r.graphic('ticker')]);
    await eventually(() => r.root.dataset.revision === '1');
    assert.match(r.reports.at(-1).id, /^[a-f0-9]{32}$/);
    assert.equal(r.reports.at(-1).state, 'ready');
    r.send(2, [r.graphic('ticker', 'ticker', 'LAN UPDATE')]);
    await eventually(() => r.root.dataset.revision === '2');
    assert.equal(r.calls.filter((call) => call.name === 'play').length, 1);
    r.send(3, []);
    await eventually(() => r.root.dataset.revision === '3');
    assert.equal(r.root.querySelectorAll('iframe').length, 0);
  }
  assert.notEqual(first.reports[0].id, second.reports[0].id);
});

test('live field updates retain the ticker iframe and do not replay Play or touch another slot', async (t) => {
  const r = await renderer(t);
  r.send(1, [r.graphic('ticker'), r.graphic('lower-third')]);
  await eventually(() => r.root.dataset.revision === '1');
  const ticker = r.root.querySelector('[data-graphic="ticker"]');
  const lower = r.root.querySelector('[data-graphic="lower-third"]');
  const before = r.calls.length;
  r.send(2, [r.graphic('ticker', 'ticker', 'ROUND 12'), r.graphic('lower-third')]);
  await eventually(() => r.root.dataset.revision === '2');
  assert.equal(r.root.querySelector('[data-graphic="ticker"]'), ticker);
  assert.equal(r.root.querySelector('[data-graphic="lower-third"]'), lower);
  assert.deepEqual(
    r.calls.slice(before).map((call) => [call.id, call.name]),
    [['ticker', 'update']]
  );
  assert.equal(r.reports.at(-1).revision, 2);
  assert.equal(r.reports.at(-1).state, 'ready');
  r.send(3, [r.graphic('ticker', 'ticker', 'ROUND 12'), r.graphic('lower-third')]);
  await eventually(() => r.root.dataset.revision === '3');
  assert.equal(r.calls.length, before + 1);
});

test('failed replacements retain the old graphic, report errors and accept a recovered snapshot', async (t) => {
  const r = await renderer(t);
  r.send(1, [r.graphic('ticker')]);
  await eventually(() => r.root.dataset.revision === '1');
  const original = r.root.querySelector('[data-graphic="ticker"]');
  r.fail();
  r.send(2, [r.graphic('replacement', 'ticker')]);
  await eventually(() => r.reports.at(-1)?.state === 'error');
  assert.equal(r.root.querySelector('[data-graphic="ticker"]'), original);
  assert.equal(r.root.querySelector('[data-graphic="replacement"]'), null);
  assert.match(r.reports.at(-1).message, /Template failed/);
  r.recover();
  r.send(2, [r.graphic('replacement', 'ticker')]);
  await eventually(() => r.root.dataset.revision === '2');
  assert.equal(r.root.querySelector('[data-graphic="ticker"]'), null);
  assert.equal(r.root.querySelectorAll('iframe').length, 1);
  assert.equal(r.reports.at(-1).state, 'ready');
  r.events()['connect_error']();
  await eventually(() => r.reports.at(-1)?.state === 'error');
  assert.match(r.reports.at(-1).message, /connection lost/i);
});

test('navigating an output closes health cleanly even when the browser transport has already closed', async (t) => {
  const r = await renderer(t);
  r.send(1, [r.graphic('ticker')]);
  await eventually(() => r.root.dataset.revision === '1');
  r.events().disconnect = () => {
    throw new Error('Transport not open');
  };
  r.window.dispatchEvent(new r.window.Event('pagehide'));
  assert.equal(r.reports.at(-1).state, 'closed');
  assert.equal(r.root.querySelectorAll('iframe').length, 0);
  r.events()['connect_error']();
  assert.equal(
    r.reports.at(-1).state,
    'closed',
    'a disposed output must not re-register as an error renderer'
  );
});

test('a server shutting down deliberately does not strand the output with its last graphics', async (t) => {
  const r = await renderer(t);
  let reconnects = 0;
  r.events().connect();
  const connect = r.events().connect;
  r.events().connect = () => {
    reconnects++;
    connect();
  };
  r.send(5, [r.graphic('ticker')]);
  await eventually(() => r.root.dataset.revision === '5');
  r.events().disconnect('io server disconnect');
  assert.equal(r.root.querySelectorAll('iframe').length, 1, 'held until the server answers');
  await eventually(() => reconnects === 1, 'the output reopens by itself', 500);
  assert.deepEqual(r.pages, ['/output/stage-1/program'], 'renewing its session first');
  r.send(0, []);
  await eventually(() => r.root.querySelectorAll('iframe').length === 0, 'a clean start clears it', 500);
});

test('a lost transport is left to Socket.IO without renewing', async (t) => {
  const r = await renderer(t);
  r.events().connect();
  r.events().disconnect('transport close');
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.deepEqual(r.pages, []);
});

test('reconnecting retains frames for the same composition and accepts revision zero after a server restart', async (t) => {
  const r = await renderer(t);
  r.events().connect();
  r.send(50, [r.graphic('ticker')]);
  await eventually(() => r.root.dataset.revision === '50');
  const original = r.root.querySelector('iframe'),
    before = r.calls.length;
  r.events().disconnect();
  assert.equal(
    r.root.querySelector('iframe'),
    original,
    'transport loss holds the visible composition'
  );
  r.events().connect();
  r.send(50, [r.graphic('ticker')]);
  await eventually(() => r.reports.at(-1)?.state === 'ready');
  assert.equal(r.root.querySelector('iframe'), original);
  assert.equal(r.calls.length, before, 'reconnect must not replay Play');
  r.events().disconnect();
  r.events().connect();
  r.send(0, []);
  await eventually(() => r.root.dataset.revision === '0');
  assert.equal(r.root.querySelectorAll('iframe').length, 0, 'restart clears the retained graphic');
  r.send(1, [r.graphic('ticker', 'ticker', 'AFTER RESTART')]);
  await eventually(() => r.root.dataset.revision === '1');
  assert.equal(r.root.querySelectorAll('iframe').length, 1);
  r.send(0, []);
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(
    r.root.dataset.revision,
    '1',
    'older snapshots in the current connection remain rejected'
  );
});

test('Stop supersedes an in-flight mount before Play and does not wait for its pending update', async (t) => {
  const r = await renderer(t);
  r.block('ticker', 'update');
  r.send(1, [r.graphic('ticker')]);
  await eventually(() => r.calls.some((c) => c.name === 'update'));
  r.send(2, []);
  await eventually(() => r.root.dataset.revision === '2');
  assert.equal(r.root.querySelectorAll('iframe').length, 0);
  r.release('ticker', 'update');
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(r.calls.filter((c) => c.name === 'play').length, 0);
});
test('a slow or failed slot does not hold up another slot, and failed slots recover with bounded retries', async (t) => {
  const r = await renderer(t);
  r.block('ticker', 'update');
  r.fail();
  r.send(1, [r.graphic('ticker'), r.graphic('replacement'), r.graphic('healthy')]);
  await eventually(() => r.calls.some((c) => c.id === 'healthy' && c.name === 'play'));
  await eventually(() => r.reports.at(-1)?.state === 'error');
  assert.equal(
    r.calls.some((c) => c.id === 'ticker' && c.name === 'play'),
    false
  );
  r.recover();
  r.release('ticker', 'update');
  await new Promise((resolve) => setTimeout(resolve, 310));
  await eventually(() => r.root.dataset.revision === '1');
  assert.equal(r.root.querySelectorAll('iframe').length, 3);
  assert.equal(r.calls.filter((c) => c.id === 'healthy' && c.name === 'play').length, 1);
  assert.equal(r.reports.at(-1).state, 'ready');
});
test('server restart cancels an old in-flight mount; a disposed output cannot play or retry', async (t) => {
  const r = await renderer(t);
  r.events().connect();
  r.block('ticker', 'update');
  r.send(50, [r.graphic('ticker')]);
  await eventually(() => r.calls.some((c) => c.name === 'update'));
  r.events().disconnect();
  r.events().connect();
  r.send(0, []);
  await eventually(() => r.root.dataset.revision === '0');
  r.release('ticker', 'update');
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(
    r.calls.some((c) => c.name === 'play'),
    false
  );
  r.block('other', 'update');
  r.send(1, [r.graphic('other')]);
  await eventually(() => r.calls.some((c) => c.id === 'other' && c.name === 'update'));
  r.window.dispatchEvent(new r.window.Event('pagehide'));
  r.release('other', 'update');
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(r.root.children.length, 0);
  assert.equal(
    r.calls.some((c) => c.name === 'play'),
    false
  );
});
test('a permanently failed slot stops retrying and Stop clears its retry timer and error', async (t) => {
  const r = await renderer(t);
  r.fail();
  r.send(1, [r.graphic('replacement'), r.graphic('healthy')]);
  await eventually(() => r.reports.at(-1)?.state === 'error');
  r.send(2, [r.graphic('healthy')]);
  await eventually(() => r.root.dataset.revision === '2');
  const plays = r.calls.filter((c) => c.id === 'replacement' && c.name === 'play').length;
  await new Promise((resolve) => setTimeout(resolve, 310));
  assert.equal(r.calls.filter((c) => c.id === 'replacement' && c.name === 'play').length, plays);
  assert.equal(r.root.querySelectorAll('iframe').length, 1);
  assert.equal(r.reports.at(-1).state, 'ready');
});

test('a failed slot keeps retrying at a capped interval and recovers without another command', async (t) => {
  const r = await renderer(t, { speed: 20 });
  r.send(1, [r.graphic('healthy')]);
  await eventually(() => r.root.dataset.revision === '1');
  r.fail('update'); // A template outage fails before the graphic is ever shown.
  r.send(2, [r.graphic('replacement'), r.graphic('healthy')]);
  const attempts = () => r.calls.filter((c) => c.id === 'replacement' && c.name === 'update').length;
  // 250/1000/3000 ms, then the 5 s cap (scaled 20x): the old code gave up after 4 attempts.
  for (let index = 0; index < 400 && attempts() < 6; index++)
    await new Promise((resolve) => setTimeout(resolve, 5));
  assert.ok(attempts() >= 6, `expected continued retries, saw ${attempts()}`);
  assert.equal(r.reports.at(-1).state, 'error');
  assert.equal(r.calls.filter((c) => c.id === 'healthy' && c.name === 'play').length, 1);
  r.recover();
  for (let index = 0; index < 400 && r.root.dataset.revision !== '2'; index++)
    await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(r.root.dataset.revision, '2');
  assert.equal(r.root.querySelectorAll('iframe').length, 2);
  assert.equal(r.reports.at(-1).state, 'ready');
});

test('a template that fails after being shown cannot loop its entrance, even on a busy stage, and still recovers', async (t) => {
  const r = await renderer(t, { speed: 20 });
  r.send(1, [r.graphic('healthy')]);
  await eventually(() => r.root.dataset.revision === '1');
  r.fail('play');
  r.send(2, [r.graphic('replacement'), r.graphic('healthy')]);
  const plays = () => r.calls.filter((c) => c.id === 'replacement' && c.name === 'play').length;
  for (let index = 0; index < 400 && plays() < 4; index++)
    await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(plays(), 4, 'the first attempt plus three short retries');
  // Live updates to another slot and to this graphic's own data must not retry it.
  for (let index = 0; index < 10; index++) {
    r.send(3 + index, [r.graphic('replacement', 'replacement', 'ROUND ' + index), r.graphic('healthy', 'healthy', 'SCORE ' + index)]);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.equal(plays(), 4, 'no entrance replays from unrelated updates');
  assert.equal(r.reports.at(-1).state, 'error');
  // The slow retry (30 s, scaled 20x) recovers it with the latest data.
  r.recover();
  await eventually(() => r.root.querySelectorAll('iframe').length === 2, 'the slot recovers without a command', 2000);
  assert.equal(plays(), 5);
  assert.equal(r.calls.filter((c) => c.id === 'replacement' && c.name === 'update').at(-1).data, JSON.stringify({ f5: 'ROUND 9' }));
});

test('new data during an entrance is applied afterwards without restarting the entrance', async (t) => {
  const r = await renderer(t);
  const plays = () => r.calls.filter((c) => c.id === 'ticker' && c.name === 'play').length;
  r.block('ticker', 'play');
  r.send(1, [r.graphic('ticker')]);
  await eventually(() => plays() === 1);
  const frame = r.root.querySelector('iframe');
  r.send(2, [r.graphic('ticker', 'ticker', 'ROUND 12')]);
  r.send(3, [r.graphic('ticker', 'ticker', 'ROUND 13')]);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(r.root.querySelector('iframe'), frame, 'the frame on screen stays');
  assert.equal(plays(), 1);
  r.release('ticker', 'play');
  await eventually(() => r.root.dataset.revision === '3');
  assert.equal(plays(), 1, 'the entrance played once');
  assert.equal(r.root.querySelector('iframe'), frame);
  assert.equal(r.calls.filter((c) => c.name === 'update').at(-1).data, JSON.stringify({ f5: 'ROUND 13' }));
  assert.equal(r.calls.filter((c) => c.name === 'update').length, 2, 'only the newest data is applied');
});

test('new data while a graphic loads does not start it again', async (t) => {
  const r = await renderer(t);
  r.block('ticker', 'update');
  r.send(1, [r.graphic('ticker')]);
  await eventually(() => r.calls.some((c) => c.name === 'update'));
  const frame = r.root.querySelector('iframe');
  r.send(2, [r.graphic('ticker', 'ticker', 'ROUND 12')]);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(r.root.querySelector('iframe'), frame, 'the load in progress carries on');
  r.release('ticker', 'update');
  await eventually(() => r.root.dataset.revision === '2');
  assert.equal(r.root.querySelector('iframe'), frame);
  assert.equal(r.root.querySelectorAll('iframe').length, 1);
  assert.equal(r.calls.filter((c) => c.name === 'play').length, 1);
  assert.equal(r.calls.filter((c) => c.name === 'update').at(-1).data, JSON.stringify({ f5: 'ROUND 12' }));
});

test('new data for a replacement mid-entrance keeps the old graphic until it has finished', async (t) => {
  const r = await renderer(t);
  const named = (id, text) => ({ ...r.graphic(id, 'lower', text) });
  r.send(1, [named('old')]);
  await eventually(() => r.root.dataset.revision === '1');
  r.block('new', 'play');
  r.send(2, [named('new')]);
  await eventually(() => r.calls.some((c) => c.id === 'new' && c.name === 'play'));
  const frame = r.root.querySelector('iframe[data-graphic="new"]');
  r.send(3, [named('new', 'ROUND 12')]);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(r.root.querySelector('iframe[data-graphic="new"]'), frame);
  assert.ok(r.root.querySelector('iframe[data-graphic="old"]'), 'the old graphic is still up');
  r.release('new', 'play');
  await eventually(() => r.root.dataset.revision === '3');
  assert.equal(r.calls.filter((c) => c.id === 'new' && c.name === 'play').length, 1);
  assert.equal(r.root.querySelector('iframe[data-graphic="old"]'), null);
  assert.equal(r.calls.filter((c) => c.id === 'new' && c.name === 'update').at(-1).data, JSON.stringify({ f5: 'ROUND 12' }));
});

test('every Continue press during an entrance is applied', async (t) => {
  const r = await renderer(t);
  const stepped = (continuation) => ({ ...r.graphic('ticker'), continuation });
  r.block('ticker', 'play');
  r.send(1, [stepped(0)]);
  await eventually(() => r.calls.some((c) => c.name === 'play'));
  r.send(2, [stepped(1)]);
  r.send(3, [stepped(2)]);
  r.release('ticker', 'play');
  await eventually(() => r.root.dataset.revision === '3');
  assert.equal(r.calls.filter((c) => c.name === 'next').length, 2);
  assert.equal(r.calls.filter((c) => c.name === 'play').length, 1);
});

test('Stop and a different graphic still cancel an entrance straight away', async (t) => {
  const r = await renderer(t);
  r.block('ticker', 'play');
  r.send(1, [r.graphic('ticker')]);
  await eventually(() => r.calls.some((c) => c.name === 'play'));
  r.send(2, []);
  await eventually(() => r.root.dataset.revision === '2');
  assert.equal(r.root.querySelectorAll('iframe').length, 0, 'Stop does not wait for the entrance');
  r.block('first', 'play');
  r.send(3, [r.graphic('first', 'lower')]);
  await eventually(() => r.calls.some((c) => c.id === 'first' && c.name === 'play'));
  r.send(4, [r.graphic('second', 'lower')]);
  await eventually(() => r.root.dataset.revision === '4');
  assert.equal(r.root.querySelector('iframe').dataset.graphic, 'second');
  assert.equal(r.root.querySelectorAll('iframe').length, 1);
});

test('a retry that fails before showing, with new data waiting, still waits before trying again', async (t) => {
  const r = await renderer(t);
  const count = (name) => r.calls.filter((c) => c.id === 'replacement' && c.name === name).length;
  r.fail('play');
  r.send(1, [r.graphic('replacement')]);
  await eventually(() => count('play') === 1);
  // The shown failure's retry is in progress when new data arrives, then fails before showing.
  r.recover();
  r.block('replacement', 'update');
  await eventually(() => count('update') === 2, 'the retry started', 1000);
  r.send(2, [r.graphic('replacement', 'replacement', 'ROUND 12')]);
  r.refuse('replacement', 'update');
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(count('update'), 2, 'no immediate retry');
  await eventually(() => r.root.dataset.revision === '2', 'it recovers after the wait', 1000);
  assert.equal(r.calls.filter((c) => c.name === 'update').at(-1).data, JSON.stringify({ f5: 'ROUND 12' }));
});

test('Stop then Play retries a failed graphic at once', async (t) => {
  const r = await renderer(t, { speed: 20 });
  r.fail('play');
  r.send(1, [r.graphic('replacement')]);
  const plays = () => r.calls.filter((c) => c.id === 'replacement' && c.name === 'play').length;
  for (let index = 0; index < 400 && plays() < 2; index++)
    await new Promise((resolve) => setTimeout(resolve, 5));
  r.recover();
  r.send(2, []);
  r.send(3, [r.graphic('replacement')]);
  await eventually(() => r.root.querySelectorAll('iframe').length === 1, 'Play after Stop mounts straight away', 2000);
});

test('a slot that outlasted a load failure and then fails after being shown still recovers', async (t) => {
  const r = await renderer(t, { speed: 20 });
  r.fail('update');
  r.send(1, [r.graphic('replacement')]);
  const count = (name) => r.calls.filter((c) => c.id === 'replacement' && c.name === name).length;
  for (let index = 0; index < 800 && count('update') < 5; index++)
    await new Promise((resolve) => setTimeout(resolve, 5));
  r.fail('play');
  for (let index = 0; index < 800 && !count('play'); index++)
    await new Promise((resolve) => setTimeout(resolve, 5));
  r.recover();
  await eventually(() => r.root.querySelectorAll('iframe').length === 1, 'the slot recovers without a command', 2000);
  await eventually(() => r.reports.at(-1).state === 'ready', 'reported ready', 2000);
});

test('Stop then Play of the same graphic during its exit leaves it on air', async (t) => {
  const r = await renderer(t);
  r.send(1, [r.graphic('lower')]);
  await eventually(() => r.root.dataset.revision === '1');
  r.block('lower', 'stop'); // the OUT animation is still running
  r.send(2, []); // Stop (or the first press of a double Toggle)
  await eventually(() => r.calls.some((c) => c.name === 'stop'));
  r.send(3, [r.graphic('lower')]); // Play again before the exit completes
  await eventually(() => r.root.dataset.revision === '3');
  r.release('lower', 'stop');
  await new Promise((resolve) => setTimeout(resolve, 50));
  const shown = [...r.root.querySelectorAll('iframe')].filter((f) => f.style.visibility !== 'hidden');
  assert.equal(shown.length, 1, 'program has the graphic, so the output must show it');
  assert.equal(r.calls.filter((c) => c.name === 'play').length, 2);
  assert.equal(r.reports.at(-1).state, 'ready');
});

test('reverting a replacement that is still loading never shows the replacement', async (t) => {
  const r = await renderer(t);
  r.send(1, [r.graphic('first', 'lower')]);
  await eventually(() => r.root.dataset.revision === '1');
  const original = r.root.querySelector('[data-graphic="first"]');
  r.block('second', 'update'); // replacement template is still loading
  r.send(2, [r.graphic('second', 'lower')]);
  await eventually(() => r.calls.some((c) => c.id === 'second' && c.name === 'update'));
  r.send(3, [r.graphic('first', 'lower')]); // operator plays the original again
  await eventually(() => r.root.dataset.revision === '3');
  r.release('second', 'update');
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(r.calls.some((c) => c.id === 'second' && c.name === 'play'), false);
  assert.equal(r.root.querySelector('[data-graphic="second"]'), null);
  assert.equal(r.root.querySelector('[data-graphic="first"]'), original);
  assert.equal(r.calls.filter((c) => c.id === 'first' && c.name === 'play').length, 1);
  assert.equal(r.calls.filter((c) => c.name === 'stop').length, 0);
});

test('a remounted stepped graphic returns to its current continuation step', async (t) => {
  const r = await renderer(t);
  r.send(1, [{ ...r.graphic('ticker'), continuation: 2 }]);
  await eventually(() => r.root.dataset.revision === '1');
  assert.deepEqual(
    r.calls.map((c) => c.name),
    ['update', 'play', 'next', 'next']
  );
  r.send(2, [{ ...r.graphic('ticker'), continuation: 3 }]);
  await eventually(() => r.root.dataset.revision === '2');
  assert.equal(r.calls.filter((c) => c.name === 'next').length, 3);
  assert.equal(r.calls.filter((c) => c.name === 'play').length, 1);
});

test('login-mode renewal redirected to the login page reports Output needs login and does not reconnect', async (t) => {
  const r = await renderer(t);
  r.send(1, [r.graphic('ticker')]);
  await eventually(() => r.root.dataset.revision === '1');
  const fetch = r.window.fetch;
  let renewals = 0,
    reconnects = 0;
  r.window.fetch = async (url, request) => {
    if (!request.method) {
      renewals++;
      return { ok: true, status: 200, redirected: true, url: 'http://localhost/login' };
    }
    return fetch(url, request);
  };
  r.events().connected = false;
  r.events().connect = () => reconnects++;
  r.events().connect_error();
  await eventually(() => renewals === 1);
  await eventually(() => /needs login/.test(r.reports.at(-1)?.message || ''));
  assert.equal(r.reports.at(-1).state, 'error');
  assert.equal(reconnects, 0);
  assert.equal(r.root.querySelectorAll('iframe').length, 1, 'current graphics are retained');
});

test('a lost output session renews its page grant and reconnects after a namespace authorization error', async (t) => {
  const r = await renderer(t);
  r.send(1, [r.graphic('ticker')]);
  await eventually(() => r.root.dataset.revision === '1');
  const original = r.root.querySelector('iframe'),
    fetch = r.window.fetch;
  let renewals = 0,
    reconnects = 0,
    disconnects = 0;
  r.window.fetch = async (url, request) => {
    if (!request.method) {
      assert.equal(url, '/output/stage-1/program');
      renewals++;
      return { ok: true };
    }
    return fetch(url, request);
  };
  r.events().connected = false;
  r.events().disconnect = () => { disconnects++; };
  r.events().connect = () => {
    assert.equal(disconnects, 1, 'transport must reopen with the renewed cookie');
    reconnects++;
    r.events().connected = true;
  };
  r.events().connect_error();
  await eventually(() => reconnects === 1);
  assert.equal(renewals, 1);
  assert.equal(r.root.querySelector('iframe'), original);
  assert.equal(r.calls.filter((c) => c.name === 'play').length, 1);
});

test('after a restore, an output holding the identical composition keeps its frames: no remount, play, update or next', async (t) => {
  const r = await renderer(t);
  r.events().connect();
  const ticker = r.graphic('ticker', 'ticker', 'ROUND 7');
  const lower = { ...r.graphic('lower-third'), continuation: 2 };
  r.send(57, [ticker, lower]);
  await eventually(() => r.root.dataset.revision === '57');
  const frames = [...r.root.querySelectorAll('iframe')],
    before = r.calls.length;
  r.events().disconnect();
  // The restored server publishes a different revision and may describe links
  // differently; content identity (slot, template, data, step) is unchanged.
  r.events().connect();
  r.send(3, [{ ...ticker, links: { f5: { mode: 'linked', source: 'restored' } } }, lower]);
  await eventually(() => r.root.dataset.revision === '3');
  assert.deepEqual([...r.root.querySelectorAll('iframe')], frames, 'same frames stay on air');
  assert.equal(r.calls.length, before, 'no lifecycle call: nothing replays');
  assert.equal(r.reports.at(-1).state, 'ready');
  assert.equal(r.reports.at(-1).revision, 3);
  // A later linked data update is an ordinary update on the same frame.
  r.send(4, [r.graphic('ticker', 'ticker', 'ROUND 8'), lower]);
  await eventually(() => r.root.dataset.revision === '4');
  assert.deepEqual(r.calls.slice(before).map((call) => call.id + ':' + call.name), ['ticker:update']);
  assert.deepEqual([...r.root.querySelectorAll('iframe')], frames);
});

test('an output reloaded during the outage mounts the restored composition with its IN and step', async (t) => {
  const r = await renderer(t);
  r.events().connect();
  r.send(3, [{ ...r.graphic('lower-third'), continuation: 1 }]);
  await eventually(() => r.root.dataset.revision === '3');
  assert.deepEqual(r.calls.map((call) => call.name), ['update', 'play', 'next']);
});
