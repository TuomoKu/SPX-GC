'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { randomUUID } = require('node:crypto');
async function eventually(condition) {
  for (let index = 0; index < 100; index++) {
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
  window.fetch = async (url, request) => {
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
        if (failed && name === 'play' && frame.dataset.graphic === 'replacement')
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
    events: () => events,
    send,
    graphic,
    fail: () => {
      failed = true;
    },
    recover: () => {
      failed = false;
    },
    block(id, method) {
      let resolve;
      const promise = new Promise((done) => (resolve = done));
      gates.set(id + ':' + method, { promise, resolve });
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
  r.fail();
  r.send(2, [r.graphic('replacement'), r.graphic('healthy')]);
  const plays = () => r.calls.filter((c) => c.id === 'replacement' && c.name === 'play').length;
  // 250/1000/3000 ms, then the 5 s cap (scaled 20x): the old code gave up after 4 attempts.
  for (let index = 0; index < 400 && plays() < 6; index++)
    await new Promise((resolve) => setTimeout(resolve, 5));
  assert.ok(plays() >= 6, `expected continued retries, saw ${plays()}`);
  assert.equal(r.reports.at(-1).state, 'error');
  assert.equal(r.calls.filter((c) => c.id === 'healthy' && c.name === 'play').length, 1);
  r.recover();
  for (let index = 0; index < 400 && r.root.dataset.revision !== '2'; index++)
    await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(r.root.dataset.revision, '2');
  assert.equal(r.root.querySelectorAll('iframe').length, 2);
  assert.equal(r.reports.at(-1).state, 'ready');
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
