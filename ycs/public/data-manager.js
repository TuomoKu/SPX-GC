const $ = (id) => document.getElementById(id);
let state,
  stages = [],
  loading = false,
  disposed = false,
  editingId = null,
  tested = '',
  draftRevision,
  rangeOwner = null;
function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function option(select, value, title) {
  const result = node('option', title);
  result.value = value;
  select.append(result);
}
function label(title, input) {
  const result = node('label', title);
  result.append(input);
  return result;
}
function button(title, callback) {
  const result = node('button', title);
  result.type = 'button';
  result.addEventListener('click', () =>
    Promise.resolve(callback()).catch((error) => message(error.message, true))
  );
  return result;
}
function message(text, error = false) {
  $('message').textContent = text;
  $('message').classList.toggle('error', error);
}
async function request(url, body) {
  const response = await fetch(
    '/api/ycs' + url,
    body === undefined
      ? { cache: 'no-store' }
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
  );
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed');
  return result;
}
function showTab(name) {
  for (const tab of ['sources', 'mappings']) {
    $(tab + '-tab').setAttribute('aria-selected', String(name === tab));
    $(tab + '-view').hidden = name !== tab;
  }
}
$('sources-tab').onclick = () => showTab('sources');
$('mappings-tab').onclick = () => showTab('mappings');
function time(value) {
  return value ? new Date(value).toLocaleTimeString() : 'Waiting for first read';
}
const usageLabels = new Map();
function usageText(usage) {
  const key = JSON.stringify([usage.stage, usage.graphic || usage.template, usage.field]);
  if (usage.graphicTitle) usageLabels.set(key, {graphic:usage.graphicTitle, field:usage.fieldTitle || usage.field});
  const names = usageLabels.get(key);
  return `${stages.find((stage) => stage.id === usage.stage)?.title || usage.stage} · ${names?.graphic || usage.graphic || 'Template default'} · ${names?.field || usage.field}${usage.kind === 'on-air' ? ' · ON AIR' : ''}`;
}
function renderConnections() {
  const container = $('connections');
  container.replaceChildren();
  workbookSources.render(container);
  for (const [id, connection] of Object.entries(state.connections || {})) {
    if (connection.sheetRange) continue;
    const card = node('article', undefined, 'connection'),
      top = node('div', undefined, 'connection-top'),
      badge = node(
        'span',
        connection.health === 'ok'
          ? 'Connected'
          : connection.health === 'loading'
            ? 'Connecting'
            : 'Needs attention',
        'status'
      );
    badge.classList.toggle('warning', connection.health !== 'ok');
    const title = node('h3', connection.label);
    title.prepend(YCSSourceIcons.node(connection.type));
    top.append(title);
    if (connection.type !== 'google-sheets') top.append(badge);
    const actions = node('div', undefined, 'connection-actions');
    actions.append(
      button('Refresh', async () => {
        state = await request(`/data/connections/${id}/refresh`, {});
        renderConnections();
        refreshValues();
      }),
      button('Edit', () => openConnection(id))
    );
    const remove = button('Remove', async () => {
      state = await request(`/data/connections/${id}/remove`, { revision: state.revision });
      renderConnections();
      message('Connection removed.');
    });
    remove.disabled = connection.usages.length > 0;
    remove.title = remove.disabled
      ? 'Remove its field mappings and stop linked on-air graphics first'
      : 'Remove unused connection';
    actions.append(remove);
    top.append(actions);
    card.append(
      top,
      node(
        'p',
        connection.type === 'google-sheets'
          ? `Last sync: ${connection.lastSuccess ? time(connection.lastSuccess) : '—'} · Requests/min: ${connection.requestsPerMinute || 0}`
          : `${YCSSourceTypes.isLocal(connection) ? connection.settings.file : 'JSON API'} · ${connection.project || 'Shared'} · Every ${connection.settings.refreshSeconds}s · Last read ${time(connection.lastSuccess)}`,
        'meta'
      )
    );
    if (connection.error || connection.warning)
      card.append(
        node(
          'p',
          (connection.error || connection.warning) + ' · Holding last valid values.',
          'warning'
        )
      );
    const details = node('details');
    details.append(
      node(
        'summary',
        `${connection.usages.length} field reference${connection.usages.length === 1 ? '' : 's'}`
      )
    );
    const list = node('ul');
    for (const usage of connection.usages) { const entry=node('li',usageText(usage));entry.title=[usage.stage,usage.graphic || usage.template,usage.field].join(' · ');list.append(entry); }
    if (!connection.usages.length) list.append(node('li', 'Ready to assign from Mappings.'));
    details.append(list);
    card.append(details);
    container.append(card);
  }
  if (!container.children.length)
    container.append(
      node(
        'div',
        'No connections yet. Add a Google Sheet, JSON API or local JSON/CSV file to get started.',
        'empty'
      )
    );
}
function renderLocal() {
  $('local-sources').replaceChildren();
  for (const [id, source] of Object.entries(state.sources))
    if (source.type === 'local') {
      const form = node('form', undefined, 'local-value'),
        input = node('input');
      input.value = source.value;
      input.maxLength = 300;
      input.required = true;
      const save = node('button', 'Publish test value');
      save.type = 'submit';
      form.append(label(source.label, input), save);
      form.onsubmit = async (event) => {
        event.preventDefault();
        save.disabled = true;
        try {
          const revision = state.revision;
          state = await request('/data/source', { id, value: input.value, revision });
          workspace.acceptRevision(revision, state.revision);
          message('Test value published to committed linked fields.');
        } catch (error) {
          message(error.message, true);
        } finally {
          save.disabled = false;
        }
      };
      $('local-sources').append(form);
    }
}
function settings() {
  const refreshSeconds = Number($('sheet-refresh').value),
    type = $('connection-type').value;
  if (YCSSourceTypes.isLocal(type))
    return {
      ...localFile.settings(),
      refreshSeconds,
      ...(type === 'local-csv' ? { delimiter: $('csv-delimiter').value } : {})
    };
  const common = { url: $('sheet-url').value, refreshSeconds };
  return type === 'json-api'
    ? {
        ...common,
        ...($('json-token').value.trim() ? { tokenEnv: $('json-token').value.trim() } : {})
      }
    : { ...common, worksheet: sheetPicker.worksheet, range: $('sheet-range').value };
}
function fingerprint() {
  return JSON.stringify({
    type: $('connection-type').value,
    project: $('connection-project').value,
    settings: settings()
  });
}
function connectionType() {
  const type = $('connection-type').value,
    json = type === 'json-api',
    local = YCSSourceTypes.isLocal(type),
    sheet = type === 'google-sheets';
  $('sheet-connection-fields').hidden = !sheet;
  $('sheet-tabs-status').hidden = !sheet;
  $('manual-worksheet-field').hidden = !sheet || $('sheet-worksheet').value !== '__manual__';
  $('json-token-field').hidden = !json;
  $('json-source-help').hidden = !json;
  $('local-file-fields').hidden = !local;
  $('csv-delimiter-field').hidden = type !== 'local-csv';
  $('local-file').required = local;
  $('local-file').disabled = !local || Boolean(state.connections[editingId]?.usages.length);
  $('csv-delimiter').disabled =
    type !== 'local-csv' || Boolean(state.connections[editingId]?.usages.length);
  $('sheet-url-label').hidden = local;
  $('sheet-url').disabled = local;
  $('connection-help').textContent = local
    ? 'Paste the full path to a JSON or CSV file accessible to the SPX computer. Test it, then save. Changes to the file refresh linked graphics automatically.'
    : json
      ? 'Connect a read-only public HTTPS JSON API. Optional Bearer credentials stay in the server environment.'
      : 'Use a sheet shared with Anyone with the link as Viewer. No sign-in or API key.';
  $('source-url-title').textContent = json ? 'JSON API URL' : 'Google Sheets URL';
  sheetPicker.enabled = sheet;
  $('named-range-metadata').hidden = !rangeOwner;
  $('range-header-row').disabled = !$('range-use-headers').checked;
  $('range-header-options').hidden = !rangeOwner || !$('range-use-headers').checked;
  $('connection-dialog').classList.toggle('named-range-editor', Boolean(rangeOwner));
  for (const id of ['connection-type-field', 'connection-project-field', 'connection-refresh-settings']) $(id).hidden = Boolean(rangeOwner);
  $('sheet-url-label').hidden = Boolean(rangeOwner) || local;
  $('connection-help').hidden = Boolean(rangeOwner);
  $('sheet-tabs-status').hidden = Boolean(rangeOwner) || !sheet;
  $('connection-usage').hidden = Boolean(rangeOwner);
  $('connection-name-title').textContent = rangeOwner ? 'Range name' : 'Source name';
  $('sheet-label').placeholder = rangeOwner ? 'e.g. Match status' : 'Tournament data';
  $('test-sheet').textContent = rangeOwner ? 'Preview range' : 'Test connection';
  $('save-sheet').textContent = rangeOwner ? 'Save range' : 'Save source';
  $('range-parent-context').hidden = !rangeOwner;
  if (rangeOwner) {
    const book = state.workbooks[rangeOwner.workbook];
    $('range-parent-context').textContent = book.label + ' / ' + book.groups[rangeOwner.group].label;
  }
}
function openConnection(id = null, owner = null) {
  rangeOwner = owner;
  editingId = id;
  tested = '';
  draftRevision = state.revision;
  const connection = state.connections[id];
  $('connection-form').reset();
  $('connection-type').value = connection?.type || (owner ? 'google-sheets' : 'json-api');
  $('connection-type').querySelector('[value="google-sheets"]').disabled = !owner && !connection;
  $('connection-type').disabled = Boolean(owner || connection?.usages.length);
  $('connection-project').value = connection?.project || '';
  $('connection-project').disabled = Boolean(connection?.usages.length);
  $('json-token').value = connection?.settings.tokenEnv || '';
  $('sheet-label').value = connection?.label || '';
  $('sheet-url').value = connection?.settings.url || '';
  $('sheet-range').value = connection?.settings.range || 'A1:D4';
  $('sheet-refresh').value = connection?.settings.refreshSeconds || 5;
  if (owner) {
    const book = state.workbooks[owner.workbook];
    $('sheet-url').value = book.settings.url; $('sheet-refresh').value = book.settings.refreshSeconds;
  }
  $('range-use-headers').checked = connection?.sheetRange?.headerRow != null;
  $('range-header-row').value = connection?.sheetRange?.headerRow || 1;
  $('range-data-row').value = connection?.sheetRange?.dataRow || 2;
  $('csv-delimiter').value = connection?.settings.delimiter || ',';
  $('connection-title').textContent = id ? 'Edit connection' : 'Add connection';
  if (owner) $('connection-title').textContent = id ? 'Edit named range' : 'Add named range';
  $('sheet-preview').replaceChildren();
  $('sheet-test-status').textContent = '';
  $('save-sheet').disabled = !owner;
  $('connection-usage').textContent = connection?.usages.length
    ? `Used by ${connection.usages.length} field references. You can change its name or refresh interval. Add a new connection to change its location, file, delimiter, sheet, tab or range.`
    : '';
  for (const key of ['sheet-url', 'sheet-range'])
    $(key).readOnly = Boolean(connection?.usages.length);
  if (owner) { $('sheet-url').readOnly = true; $('sheet-refresh').disabled = true; }
  else $('sheet-refresh').disabled = false;
  $('connection-dialog').showModal();
  sheetPicker.reset({
    worksheet: connection?.settings.worksheet || (owner ? state.workbooks[owner.workbook].groups[owner.group].worksheet : ''),
    locked: Boolean(connection?.usages.length),
    enabled: !connection || connection.type === 'google-sheets'
  });
  connectionType();
  localFile.reset({
    file: connection?.settings.file || '',
    location: connection?.settings.location,
    locked: Boolean(connection?.usages.length)
  });
  $('sheet-label').focus();
}
$('close-connection').onclick = () => $('connection-dialog').close();
$('cancel-connection').onclick = () => $('connection-dialog').close();
$('range-use-headers').onchange = () => { $('range-header-row').disabled = !$('range-use-headers').checked; $('range-header-options').hidden = !$('range-use-headers').checked; invalidateSheetTest(); };
function invalidateSheetTest() {
  if (rangeOwner) {
    const match = $('sheet-range').value.toUpperCase().match(/^[A-Z]+(\d+)(?::[A-Z]+(\d+))?$/);
    if (match) {
      const first = Number(match[1]), last = Number(match[2] || match[1]);
      for (const id of ['range-header-row', 'range-data-row']) { $(id).min = first; $(id).max = last; }
      if (Number($('range-header-row').value) < first || Number($('range-header-row').value) > last) $('range-header-row').value = first;
      if (Number($('range-data-row').value) < first || Number($('range-data-row').value) > last) $('range-data-row').value = Math.min(first + 1, last);
    }
  }
  tested = '';
  $('save-sheet').disabled = !rangeOwner;
  $('sheet-test-status').textContent = rangeOwner ? '' : 'Test the updated settings before saving.';
}
const localFile = new window.YCSLocalFileField({ request });
const sheetPicker = new window.YCSSheetPicker({ request, invalidate: invalidateSheetTest });
$('connection-type').onchange = () => {
  connectionType();
  localFile.reset();
  invalidateSheetTest();
};
$('connection-project').onchange = invalidateSheetTest;
for (const input of document.querySelectorAll('[data-setting]'))
  input.addEventListener('input', invalidateSheetTest);
function previewTable(data) {
  $('sheet-preview').replaceChildren();
  const table = node('table'),
    body = node('tbody');
  for (const cells of data.slice(0, 10)) {
    const row = node('tr');
    row.append(node('th', cells[0]?.address.match(/\d+$/)?.[0] || ''));
    for (const cell of cells.slice(0, 8)) {
      const value = node('td', cell.value);
      value.title = cell.address;
      row.append(value);
    }
    body.append(row);
  }
  table.append(body);
  $('sheet-preview').append(table);
  if (!rangeOwner) $('sheet-preview').append(node('p', 'Preview: first 10 rows and 8 columns.', 'hint'));
}
$('test-sheet').onclick = async () => {
  const submitted = fingerprint();
  const submittedSettings = settings(),
    type = $('connection-type').value,
    json = YCSSourceTypes.isJSON(type),
    local = YCSSourceTypes.isLocal(type);
  $('test-sheet').disabled = true;
  $('save-sheet').disabled = true;
  $('sheet-test-status').textContent = 'Reading source…';
  try {
    const result = await request(
      local ? '/data/local/test' : json ? '/data/json/test' : '/data/sheets/test',
      { settings: submittedSettings, ...(local ? { type } : {}) }
    );
    if (submitted !== fingerprint()) return;
    tested = submitted;
    if (json) {
      $('sheet-preview').replaceChildren(
        node('pre', JSON.stringify(result.data, null, 2).slice(0, 12000))
      );
    } else previewTable(result.rows);
    $('sheet-test-status').textContent = 'Read successful';
    $('save-sheet').disabled = false;
  } catch (error) {
    tested = '';
    $('sheet-test-status').textContent = error.message;
  } finally {
    $('test-sheet').disabled = false;
  }
};
$('connection-form').onsubmit = async (event) => {
  event.preventDefault();
  if (!rangeOwner && tested !== fingerprint()) return;
  $('save-sheet').disabled = true;
  try {
    const result = await request(rangeOwner ? `/data/workbooks/${rangeOwner.workbook}/groups/${rangeOwner.group}/ranges` : '/data/connections', {
      id: editingId,
      label: $('sheet-label').value,
      settings: settings(),
      type: $('connection-type').value,
      project: $('connection-project').value || undefined,
      revision: draftRevision,
      ...(rangeOwner ? { headerRow: $('range-use-headers').checked ? Number($('range-header-row').value) : null, dataRow: Number($('range-data-row').value) } : {})
    });
    workspace.acceptRevision(draftRevision, result.snapshot.revision);
    state = result.snapshot;
    $('connection-dialog').close();
    renderConnections();
    if (workspace.model) {
      workspace.renderSources();
      workspace.renderSourceContext();
      workspace.renderSourceValues();
    }
    message(rangeOwner ? 'Named range saved.' : 'Source saved.');
  } catch (error) {
    $('sheet-test-status').textContent = error.message;
    $('save-sheet').disabled = false;
  }
};
const workspace = new window.YCSMappingWorkspace({
  request,
  getState: () => state,
  message,
  onSaved: (data) => {
    state = data;
    renderConnections();
  }
});
const workbookSources = new window.YCSWorkbookSources({
  request, getState: () => state,
  accept: next => {
    const previous = state.revision;
    state = next; workspace.acceptRevision(previous, next.revision);
    renderConnections();
    if (workspace.model) { workspace.renderSources(); workspace.renderSourceContext(); workspace.renderSourceValues(); workspace.renderFields(); }
  },
  openRange: (workbook, group, id) => openConnection(id || null, { workbook, group }),
  openOther: type => { openConnection(); $('connection-type').value = type; connectionType(); }
});
function refreshValues() {
  workspace.update(state);
}
async function poll() {
  if (loading || disposed) return;
  loading = true;
  try {
    state = await request('/data');
    $('health').textContent =
      state.health === 'ok' ? 'Background sync active' : 'Data needs attention';
    $('health').classList.toggle('warning', state.health !== 'ok');
    if (
      !document.querySelector('#connections details[open], #connections .workbook-body:not([hidden])') &&
      !document.activeElement?.closest('#connections')
    )
      renderConnections();
    workbookSources.updateMetrics();
    refreshValues();
  } catch {
    $('health').textContent = 'Server disconnected';
    $('health').classList.add('warning');
  } finally {
    loading = false;
  }
}
async function initialize() {
  [state, stages] = await Promise.all([request('/data'), request('/stages')]);
  for (const project of [...new Set(stages.map((stage) => stage.project).filter(Boolean))])
    option($('connection-project'), project, project.replaceAll('-', ' '));
  for (const stage of stages) {
    const link = node('a', stage.title + ' rundown');
    link.href = stage.controller;
    $('stages').append(link);
    option($('mapping-stage'), stage.id, stage.title);
  }
  const params = new URLSearchParams(location.search);
  if (stages.some((stage) => stage.id === params.get('stage')))
    $('mapping-stage').value = params.get('stage');
  if (params.get('graphic')) showTab('mappings');
  renderConnections();
  renderLocal();
  await workspace.initialize(stages);
  await poll();
}
initialize().catch((error) => message(error.message, true));
const timer = setInterval(poll, 3000);
window.addEventListener(
  'pagehide',
  () => {
    disposed = true;
    sheetPicker.dispose();
    localFile.dispose();
    workbookSources.dispose();
    workspace.dispose();
    clearInterval(timer);
  },
  { once: true }
);
