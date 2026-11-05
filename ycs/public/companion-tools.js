// Copy-only controls. Selecting an action never sends a request.
window.YCSCompanionTools = function ({ row, project, rundown, editor, copyIcon, copyText }) {
  const target = row.querySelector('.ycs-compact-editor') || row.querySelector('#Expanded');
  if (!target || row.querySelector('.ycs-companion-tools')) return;
  const item = row.dataset.spxEpoch;
  const container = document.createElement('div');
  container.className = 'ycs-companion-tools';
  const line = document.createElement('div');
  line.className = 'ycs-companion-row';
  const label = document.createElement('label');
  label.textContent = 'Companion';
  const select = document.createElement('select');
  select.id = 'ycs-companion-action-' + item;
  select.setAttribute('aria-label', 'Companion action');
  label.htmlFor = select.id;
  for (const action of window.YCSCompanion.actions) {
    const option = document.createElement('option');
    option.value = action;
    option.textContent = action[0].toUpperCase() + action.slice(1);
    select.append(option);
  }
  select.value = 'play';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ycs-copy-output';
  button.setAttribute('aria-label', 'Copy Companion URL');
  button.innerHTML = copyIcon;
  const status = document.createElement('div');
  status.className = 'ycs-copy-status';
  status.setAttribute('role', 'status');
  const fallback = document.createElement('input');
  fallback.className = 'ycs-copy-fallback';
  fallback.readOnly = true;
  fallback.hidden = true;
  fallback.setAttribute('aria-label', 'Companion URL to copy');
  let url;
  function update() {
    try {
      url = window.YCSStagePanel.shareURL(
        window.YCSCompanion.command(project, rundown, item, select.value).path
      );
      button.disabled = editor.slotConfigured === false;
      button.title = button.disabled
        ? 'Assign an output slot to this item first'
        : 'Copy GET ' + url;
    } catch (error) {
      button.disabled = true;
      button.title = error.message;
    }
    status.textContent = '';
    fallback.hidden = true;
  }
  select.addEventListener('change', update);
  button.addEventListener('click', () => copyText(url, 'Companion URL', { status, fallback }));
  for (const type of ['click', 'keydown', 'keyup'])
    container.addEventListener(type, (event) => event.stopPropagation());
  line.append(label, select, button);
  container.append(line, status, fallback);
  target.append(container);
  update();
};
