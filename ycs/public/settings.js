'use strict';
(() => {
  const $ = id => document.getElementById(id);
  let snapshot, baseline = '', busy = false, restarting = false;
  const draft = () => ({
    sheetsAPI: { enabled: $('sheets-enabled').value === 'true' },
    decktypeFolders: $('decktype-folders').value.split(/\r?\n/).map(value => value.trim()).filter(Boolean),
    graphicsRoot: $('graphics-root').value.trim(), key: $('sheets-key').value.trim(), clearKey: $('clear-key').checked
  });
  const dirty = () => Boolean(snapshot) && JSON.stringify(draft()) !== baseline;
  function message(text, error = false) {
    $('message').textContent = text;
    $('message').classList.toggle('error', error);
  }
  async function request(url, body, timeout = 20000) {
    const response = await fetch('/api/ycs/settings' + url, {
      ...(body !== undefined ? { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-YCS-Settings': '1' }, body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(timeout), cache: 'no-store'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Settings request failed');
    return data;
  }
  function controls() {
    $('fields').disabled = !snapshot || busy || restarting;
    $('save').disabled = busy || !dirty();
    $('revert').disabled = busy || !dirty();
    $('restart').disabled = !snapshot || !snapshot.restart.available || busy || restarting || dirty();
    $('draft-status').textContent = dirty() ? 'Unsaved changes' : '';
    if (snapshot) $('restart-help').textContent = dirty() ? 'Save or revert changes before restarting.' : snapshot.restart.reason || 'Stop all Program graphics before restarting. The page reconnects automatically.';
  }
  function render(data) {
    snapshot = data;
    $('sheets-enabled').value = String(data.values.sheetsAPI.enabled);
    $('sheets-key').value = '';
    $('clear-key').checked = false;
    $('clear-key').disabled = !data.key.saved;
    $('decktype-folders').value = data.values.decktypeFolders.join('\n');
    $('graphics-root').value = data.values.graphicsRoot;
    $('running-reader').textContent = 'Currently running: ' + data.runningReader;
    $('key-status').textContent = 'Key: ' + data.key.source + (data.key.environment ? ` (${data.values.sheetsAPI.keyEnv})` : '');
    $('pending').hidden = !data.restartRequired;
    $('config-file').textContent = data.configFile;
    $('outputs').replaceChildren();
    for (const stage of data.stages) {
      const row = document.createElement('div'), name = document.createElement('strong'), text = document.createElement('span');
      name.textContent = stage.title || stage.id;
      text.textContent = `${stage.project} / ${stage.rundown}`;
      row.append(name, text);
      $('outputs').append(row);
    }
    $('slots').textContent = 'Slots: ' + data.slots.map(slot => slot.label).join(' · ');
    baseline = JSON.stringify(draft());
    controls();
  }
  async function load() {
    busy = true; controls();
    try { render(await request('')); message(''); }
    catch (error) { message(error.message, true); }
    finally { busy = false; controls(); }
  }
  $('settings-form').addEventListener('input', () => { $('test-result').textContent = ''; controls(); });
  $('settings-form').addEventListener('change', controls);
  $('settings-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !snapshot) return;
    busy = true; controls();
    try {
      const data = await request('', { ...draft(), revision: snapshot.revision });
      render(data); message(data.restartRequired ? 'Saved. Restart SPX to apply these changes.' : 'Settings saved.');
    } catch (error) { message(error.message, true); }
    finally { busy = false; controls(); }
  });
  $('revert').addEventListener('click', load);
  $('test-sheets').addEventListener('click', async () => {
    if (busy) return;
    if ($('clear-key').checked) { $('test-result').textContent = 'Uncheck Remove saved key before testing.'; return; }
    busy = true; controls(); $('test-result').textContent = 'Testing Google Sheets API…';
    $('test-result').classList.remove('error');
    try {
      const result = await request('/sheets/test', { key: $('sheets-key').value.trim(), url: $('test-url').value.trim() });
      $('test-result').textContent = result.message;
    } catch (error) { $('test-result').textContent = error.message; $('test-result').classList.add('error'); }
    finally { busy = false; controls(); }
  });
  $('restart').addEventListener('click', () => $('restart-dialog').showModal());
  $('cancel-restart').addEventListener('click', () => $('restart-dialog').close());
  $('confirm-restart').addEventListener('click', async () => {
    if (busy || restarting) return;
    $('restart-dialog').close(); busy = true; controls();
    try {
      const result = await request('/restart', {});
      restarting = true; document.body.classList.add('restarting');
      message('Restarting SPX… waiting for the server to return.');
      const deadline = Date.now() + 60000;
      let returned = false;
      while (Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        try {
          const next = await request('', undefined, 2500);
          if (next.instance !== result.instance) { render(next); returned = true; break; }
          if (next.restart.error) throw new Error(next.restart.error);
        } catch (error) {
          if (error.message.includes('Restart failed')) throw error;
          // A refused/reset connection is expected while the server restarts.
        }
      }
      if (!returned) throw new Error('SPX has not returned. Use the launcher and check .local/runtime-logs on the SPX computer.');
      message('SPX restarted. Program is stopped.');
    } catch (error) { message(error.message, true); }
    finally { busy = false; restarting = false; document.body.classList.remove('restarting'); controls(); }
  });
  window.addEventListener('beforeunload', event => {
    if (dirty() && !restarting) { event.preventDefault(); event.returnValue = ''; }
  });
  load();
})();
