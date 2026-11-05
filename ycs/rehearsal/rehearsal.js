const stages = [1, 2, 3].map(number => `stage-${number}`);
const cards = new Map(), status = document.querySelector('#status'), results = document.querySelector('#results');
let busy = false, edition = 1;
async function request(url, body) {
  const response = await fetch(url, body === undefined ? { cache: 'no-store', signal: AbortSignal.timeout(2500) } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(5000) });
  const value = await response.json(); if (!response.ok) throw new Error(value.error || `HTTP ${response.status}`); return value;
}
const state = stage => request(`/api/ycs/stages/${stage}/program/state`);
const command = (stage, graphic, action, body = {}) => request(`/api/ycs/stages/${stage}/graphics/${graphic}/${action}`, body);
const ticker = snapshot => snapshot.graphics.find(item => item.id === 'ticker');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, label, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { try { if (await check()) return; } catch { /* reconnecting */ } await pause(150); }
  throw new Error(`Timed out: ${label}`);
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function log(message, ok = true) { const row = document.createElement('li'); row.className = ok ? 'pass' : 'fail'; row.textContent = `${ok ? 'PASS' : 'FAIL'} · ${message}`; results.append(row); }
async function check(message, action) { status.textContent = message + '…'; await action(); log(message); }
async function task(action) {
  if (busy) return; busy = true;
  for (const button of document.querySelectorAll('button')) button.disabled = true;
  try { await action(); await refresh(); }
  catch (error) { status.textContent = error.message; log(error.message, false); }
  finally { busy = false; for (const button of document.querySelectorAll('button')) button.disabled = false; }
}
function outputDocument(stage) { return cards.get(stage).querySelector('iframe').contentDocument; }
function graphicFrame(stage, id = 'ticker') { return outputDocument(stage)?.querySelector(`iframe[data-graphic="${id}"]`); }
async function rendered(stage, count) {
  await until(async () => {
    const snapshot = await state(stage), document = outputDocument(stage), composition = document?.querySelector('#composition');
    return snapshot.graphics.length === count && document.documentElement.dataset.connection === 'connected' && Number(composition?.dataset.revision) === snapshot.revision && !composition?.dataset.error && document.querySelectorAll('iframe.graphic').length === count;
  }, `${stage} rendered ${count} graphics`);
}
async function refreshFeeds(offline = false) {
  await request('/rehearsal/feed', { offline, edition });
  for (const id of ['rehearsal.sheet', 'rehearsal.json']) await request(`/api/ycs/data/connections/${id}/refresh`, {});
}
async function liveRound(stage, value) {
  const data = await request('/api/ycs/data');
  await request('/api/ycs/data/source', { id: `test.${stage}.currentRound`, value, revision: data.revision });
  cards.get(stage).querySelector('input').value = value;
}
for (const [index, stage] of stages.entries()) {
  const card = document.createElement('article'); card.className = 'stage'; card.dataset.stage = stage;
  card.innerHTML = `<header><h2>Stage ${index + 1}</h2><a href="/output/${stage}/program" target="_blank" rel="noopener">Open output ↗</a></header>
    <div class="monitor"><iframe title="Stage ${index + 1} rehearsal output" src="/output/${stage}/program"></iframe></div>
    <div class="stage-content"><div class="state" role="status">Connecting…</div><div class="source">Stories: ${index === 0 ? 'simulated Sheet range' : 'simulated JSON array'}</div>
    <div class="actions"><button data-graphic="ticker" data-action="play">Play ticker</button><button data-graphic="ticker" data-action="stop">Stop ticker</button><button data-graphic="lower-third" data-action="play">Play lower third</button><button data-graphic="lower-third" data-action="stop">Stop lower third</button></div>
    <label>Linked round value<div class="input-row"><input aria-label="Stage ${index + 1} linked round" value="SWISS ROUND ${index + 1} OF 15"><button data-live>Send live</button></div></label>
    <div class="actions"><button data-reload>Reload output</button><button data-drop>Test reconnect</button><button data-clear>Stop stage</button></div><small>Test controls affect this disposable rehearsal only.</small></div>`;
  document.querySelector('#stages').append(card); cards.set(stage, card);
  const monitor = card.querySelector('.monitor'), frame = card.querySelector('iframe');
  new ResizeObserver(() => { frame.style.transform = `scale(${monitor.clientWidth / 1920})`; }).observe(monitor);
  card.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    task(async () => {
      if (button.dataset.graphic) await command(stage, button.dataset.graphic, button.dataset.action);
      else if (button.hasAttribute('data-live')) await liveRound(stage, card.querySelector('input').value);
      else if (button.hasAttribute('data-clear')) await request(`/api/ycs/stages/${stage}/clear`, {});
      else if (button.hasAttribute('data-drop')) await request(`/rehearsal/disconnect/${stage}`, {});
      else if (button.hasAttribute('data-reload')) frame.src = `/output/${stage}/program`;
      status.textContent = 'Rehearsal command sent. Your saved event setup is unchanged.';
    });
  });
}
async function refresh() {
  await Promise.all(stages.map(async stage => {
    const target = cards.get(stage).querySelector('.state');
    try {
      const [snapshot, health] = await Promise.all([state(stage), request(`/api/ycs/stages/${stage}/health`)]);
      const round = ticker(snapshot)?.data.f5;
      target.textContent = `${snapshot.graphics.length ? snapshot.graphics.map(item => item.slot).join(' + ') : 'Stopped'}${round ? ' · ' + round : ''} · ${health.program.errors.length ? health.program.errors.join('; ') : health.program.ready ? 'Output ready' : 'Waiting for renderer'}`;
    } catch { target.textContent = 'Reconnecting · retaining current graphics until server state returns'; }
  }));
}
document.querySelector('#clear').addEventListener('click', () => task(async () => {
  for (const stage of stages) await request(`/api/ycs/stages/${stage}/clear`, {});
  status.textContent = 'All rehearsal outputs stopped.';
}));
document.querySelector('#run').addEventListener('click', () => task(async () => {
  results.replaceChildren(); await refreshFeeds();
  for (const [index, stage] of stages.entries()) {
    await request(`/api/ycs/stages/${stage}/clear`, {});
    await liveRound(stage, `SWISS ROUND ${index + 1} OF 15`);
    await command(stage, 'ticker', 'save', { links: { f5: { mode: 'linked', manual: 'MANUAL FALLBACK' } } });
  }
  await check('Three independent tickers with different rounds and mapped story lists', async () => {
    await Promise.all(stages.map(stage => command(stage, 'ticker', 'play')));
    await Promise.all(stages.map(stage => rendered(stage, 1)));
    for (const [index, stage] of stages.entries()) {
      const snapshot = await state(stage), graphic = ticker(snapshot), stories = JSON.parse(graphic.data.f14);
      assert(graphic.data.f5 === `SWISS ROUND ${index + 1} OF 15`, `${stage} has another stage's round`);
      assert(stories.length === 2 && stories.every(story => story.subtopic.startsWith(`STAGE ${index + 1}`)), 'Story isolation or Published filtering failed');
      assert(stories[0].id.endsWith('-update') && stories[1].id.endsWith('-news'), 'Story ordering failed');
      const visibleItems = [...graphicFrame(stage).contentDocument.querySelectorAll('.crawl-item')];
      assert(visibleItems.length > 0 && visibleItems.every(item => item.textContent.startsWith(`STAGE ${index + 1}`)), 'Bundled bootstrap stories leaked into the mapped ticker');
    }
  });
  await check('Ticker and lower third coexist on every output', async () => {
    const originals = stages.map(stage => graphicFrame(stage));
    await Promise.all(stages.map(stage => command(stage, 'lower-third', 'play')));
    await Promise.all(stages.map(stage => rendered(stage, 2)));
    stages.forEach((stage, i) => assert(graphicFrame(stage) === originals[i], 'Adding a lower third replaced the ticker'));
  });
  await check('Stage 2 live data updates keep every ticker iframe running', async () => {
    const originals = stages.map(stage => graphicFrame(stage)), other = await Promise.all(['stage-1', 'stage-3'].map(state));
    await liveRound('stage-2', 'SWISS ROUND 9 OF 15');
    await until(async () => ticker(await state('stage-2'))?.data.f5 === 'SWISS ROUND 9 OF 15', 'live round update');
    await rendered('stage-2', 2);
    stages.forEach((stage, i) => assert(graphicFrame(stage) === originals[i], 'Live update remounted a ticker'));
    assert(JSON.stringify(await Promise.all(['stage-1', 'stage-3'].map(state))) === JSON.stringify(other), 'Live update changed another stage');
  });
  await check('Manual draft stays off air until Update; linked mode can be restored', async () => {
    const before = await state('stage-2'), original = graphicFrame('stage-2');
    const body = { links: { f5: { mode: 'manual', manual: 'CUSTOM ORLANDO ROUND' } } };
    await command('stage-2', 'ticker', 'preview', body); await command('stage-2', 'ticker', 'save', body);
    assert(JSON.stringify((await state('stage-2')).graphics) === JSON.stringify(before.graphics), 'Draft changed program');
    await command('stage-2', 'ticker', 'update'); await rendered('stage-2', 2);
    assert(ticker(await state('stage-2')).data.f5 === 'CUSTOM ORLANDO ROUND', 'Manual override was not committed');
    await command('stage-2', 'ticker', 'update', { links: { f5: { mode: 'linked', manual: 'CUSTOM ORLANDO ROUND' } } });
    assert(ticker(await state('stage-2')).data.f5 === 'SWISS ROUND 9 OF 15', 'Linked mode did not restore source data');
    await rendered('stage-2', 2); assert(graphicFrame('stage-2') === original, 'Manual/linked update remounted ticker');
  });
  await check('Sheets and JSON story updates preserve frames; source outages hold valid lists', async () => {
    const originals = stages.map(stage => graphicFrame(stage)); edition++; await refreshFeeds();
    await until(async () => (await Promise.all(stages.map(state))).every(snapshot => ticker(snapshot).data.f14.includes(`EDITION ${edition}`)), 'story edition update');
    await Promise.all(stages.map(stage => rendered(stage, 2)));
    const lists = (await Promise.all(stages.map(state))).map(snapshot => ticker(snapshot).data.f14);
    try {
      await refreshFeeds(true);
      assert(JSON.stringify((await Promise.all(stages.map(state))).map(snapshot => ticker(snapshot).data.f14)) === JSON.stringify(lists), 'Outage replaced the last valid story lists');
      const data = await request('/api/ycs/data');
      assert(Object.values(data.connections).every(connection => connection.health !== 'ok'), 'Outage was not reported');
    } finally { await refreshFeeds(false); }
    stages.forEach((stage, i) => assert(graphicFrame(stage) === originals[i], 'Story refresh remounted ticker'));
  });
  await check('Transport reconnect keeps graphics; output reload restores the stage composition', async () => {
    const original = graphicFrame('stage-1'); await request('/rehearsal/disconnect/stage-1', {});
    await pause(1800); await rendered('stage-1', 2);
    assert(graphicFrame('stage-1') === original, 'Reconnect remounted ticker');
    cards.get('stage-3').querySelector('iframe').src = '/output/stage-3/program';
    await until(() => graphicFrame('stage-3') && outputDocument('stage-3')?.documentElement.dataset.connection === 'connected', 'reloaded output');
    await rendered('stage-3', 2);
  });
  await check('Stop stage clears only that stage', async () => {
    const other = await Promise.all(['stage-1', 'stage-3'].map(state));
    await request('/api/ycs/stages/stage-2/clear', {}); await rendered('stage-2', 0);
    assert(JSON.stringify(await Promise.all(['stage-1', 'stage-3'].map(state))) === JSON.stringify(other), 'Stop stage affected another stage');
    await command('stage-2', 'ticker', 'play'); await command('stage-2', 'lower-third', 'play'); await rendered('stage-2', 2);
  });
  status.textContent = 'Playback checks passed. All three test outputs are running. Test server restart next, or use the stage controls.';
}));
document.querySelector('#restart').addEventListener('click', () => task(async () => {
  // crash: SIGKILL, restores. graceful: normal stop, starts clean.
  // expired: heartbeat backdated past the window, then SIGKILL; starts clean.
  async function restart(mode) {
    const previous = await request('/rehearsal/info'); await request('/rehearsal/restart', { mode });
    await until(async () => (await request('/rehearsal/info')).pid !== previous.pid, 'new rehearsal worker', 30000);
  }
  async function onAir() {
    await Promise.all(stages.map(async stage => { await command(stage, 'ticker', 'play'); await command(stage, 'lower-third', 'play'); }));
    await Promise.all(stages.map(stage => rendered(stage, 2)));
  }
  await check('Crash restart keeps every output on air: same frames, no replayed entrance', async () => {
    await onAir();
    const before = await Promise.all(stages.map(state)), frames = stages.map(stage => [graphicFrame(stage), graphicFrame(stage, 'lower-third')]);
    await restart('crash');
    await Promise.all(stages.map(stage => rendered(stage, 2)));
    const after = await Promise.all(stages.map(state));
    stages.forEach((stage, i) => {
      assert(JSON.stringify(after[i].graphics) === JSON.stringify(before[i].graphics), `${stage} restored a different program`);
      assert(graphicFrame(stage) === frames[i][0] && graphicFrame(stage, 'lower-third') === frames[i][1], `${stage} remounted a graphic after the restart`);
    });
    const health = await Promise.all(stages.map(stage => request(`/api/ycs/stages/${stage}/health`)));
    assert(health.every(item => item.restored?.graphics === 2), 'A stage is missing its restored notice');
  });
  await check('Graceful restart reconnects all outputs and starts program stopped', async () => {
    await restart('graceful');
    await Promise.all(stages.map(stage => rendered(stage, 0)));
    const data = await request('/api/ycs/data'); assert(data.mappings.length === 6, 'Saved rehearsal mappings were lost');
    assert(data.sources['test.stage-2.currentRound'].value !== undefined, 'Saved source values were lost');
  });
  await check('Restart after the restore window starts program stopped', async () => {
    await onAir();
    await restart('expired');
    await Promise.all(stages.map(stage => rendered(stage, 0)));
  });
  status.textContent = 'Restart passed. A crash restart kept every graphic on air; a graceful stop and a restart after the window started stopped.';
}));
await refresh(); status.textContent = 'Ready. These outputs start stopped. Run playback checks to rehearse all three stages.';
setInterval(() => { if (!busy) refresh(); }, 1500);
