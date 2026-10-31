// Native SPX controls use the same stage service as Companion. Links are
// resolved on the server, with separate editor and on-air binding snapshots.
const stage = document.documentElement.dataset.ycsStage;
const project = document.documentElement.dataset.ycsProject;
const rundown = document.documentElement.dataset.ycsRundown;
if (stage) {
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/ycs/controller.css'; document.head.append(css);
  const stagePanel = new window.YCSStagePanel({ stage, onStop: clearStage });
  const models = new Map(), timers = new Map();
  let validationRow, previewGeneration = 0;
  const iconMarkup=name=>`<svg class="ycs-editor-icon" viewBox="0 0 24 24" aria-hidden="true"><use href="/ycs/editor-icons.svg#${name}"></use></svg>`;
  let sourceState, active = new Set(), program = new Map(), disposed = false, polling = false;
  async function request(url, body) {
    const response = await fetch(url, body === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const payload = await response.json();
    if (!response.ok) { const error = new Error(payload.error || 'Stage request failed'); error.fields = payload.fields; throw error; }
    return payload;
  }
  function notify(text, error = false) { stagePanel.notify(text, error); }
  function fieldErrors(row, errors = {}) {
    for (const input of row.querySelectorAll('[data-update]')) {
      const id = `ycs-error-${row.dataset.spxEpoch}-${input.dataset.update}`;
      row.querySelectorAll('.ycs-field-error').forEach(element => { if (element.id === id) element.remove(); });
      const descriptions = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(value => value && value !== id);
      input.removeAttribute('aria-invalid');
      if (errors[input.dataset.update]) {
        const detail = document.createElement('small'); detail.id = id; detail.className = 'ycs-field-error'; detail.textContent = errors[input.dataset.update]; detail.setAttribute('role', 'status');
        (input.closest('.ycs-link-field') || input).after(detail);
        input.setAttribute('aria-invalid', 'true'); descriptions.push(id);
      }
      if (descriptions.length) input.setAttribute('aria-describedby', descriptions.join(' ')); else input.removeAttribute('aria-describedby');
    }
  }
  function fields(row) {
    return [...row.querySelectorAll('[data-update]')].map(input => ({ field: input.dataset.update, value: input.type === 'checkbox' ? (input.checked ? '1' : '0') : input.value }));
  }
  function pending(row, model) {
    if (!model.badge) return;
    let changed = row.dataset.spxChanged === 'true';
    const current = program.get(row.dataset.spxEpoch);
    if (current) for (const [field, link] of Object.entries(model.links)) {
      if (link.mode === 'linked' ? current.links?.[field]?.source !== link.source || current.links?.[field]?.mode !== link.mode : current.data?.[field] !== link.manual) changed = true;
    }
    model.badge.hidden = !changed; model.badge.textContent = current ? 'Pending · Update on air to apply' : 'Unsaved draft';
  }
  function editorValue(input,value) {
    if(input.type==='checkbox') return YCSDataContract.checkboxValue(value);
    if(input.type==='number') return String(YCSDataContract.finiteNumber(value));
    return String(value);
  }
  function showValue(input,value){if(input.type==='checkbox')input.checked=String(value)==='1';else{if(input.tagName==='SELECT'&&![...input.options].some(option=>option.value===String(value))){const option=document.createElement('option');option.value=String(value);option.textContent=String(value);option.dataset.ycsValue='true';input.append(option);}input.value=value;}}
  function manualValue(input){return input.type==='checkbox'?(input.checked?'1':'0'):input.value;}
  function renderSummary(row, model) {
    const target = row.querySelector('.truncate');
    if (!target) return;
    target.textContent = window.YCSRundownSummary.text(model.summaryFields, field => {
      const link = model.summaryLinks?.[field.field];
      if (!link || link.mode !== 'linked') return link?.manual ?? field.value;
      const override = sourceState?.mappings.find(item => item.stage === stage && item.graphic === row.dataset.spxEpoch && item.field === field.field);
      const fallback = sourceState?.defaults?.find(item => item.stage === stage && item.template === model.template && item.field === field.field);
      const sourceId = sourceState ? (override || fallback)?.source : link.source;
      if (link.source !== sourceId) { link.source = sourceId; delete link.lastValue; }
      const source = sourceState?.sources[sourceId];
      if (source?.value !== undefined && typeof source.value === 'string' && source.value.length <= 300) link.lastValue = source.value;
      return link.lastValue ?? link.manual ?? field.value;
    });
  }
  function paintLink(row, model) {
    for (const [field, widget] of Object.entries(model.widgets || {})) {
      const link = model.links[field], { input, button, detail, title } = widget;
      const override = sourceState?.mappings.find(item => item.stage === stage && item.graphic === row.dataset.spxEpoch && item.field === field);
      const fallback = sourceState?.defaults?.find(item => item.stage === stage && item.template === model.template && item.field === field);
      if (sourceState) {
        const nextSource = (override || fallback)?.source || null;
        if (link.source !== nextSource) delete link.lastValue;
        link.source = nextSource;
      }
      const source = sourceState?.sources[link.source], linked = link.mode === 'linked';
      let incompatible=false;
      if(source?.value!==undefined){try{link.lastValue=editorValue(input,source.value);}catch{incompatible=true;}}
      const value = link.lastValue ?? link.manual, changed = linked && manualValue(input) !== value;
      if (linked) showValue(input,value);
      input.readOnly = linked; if(input.type==='checkbox'||input.tagName==='SELECT')input.disabled=linked; input.classList.toggle('ycs-linked-input', linked);
      button.setAttribute('aria-pressed', String(linked)); button.setAttribute('aria-label', linked ? 'Use manual ' + title : 'Link ' + title + ' to data source');
      button.classList.toggle('is-linked', linked);button.classList.toggle('is-unassigned',!link.source);
      button.querySelector('use')?.setAttribute('href','/ycs/editor-icons.svg#'+(linked?'link-2':'unlink-2'));
      const problem = incompatible || !source || sourceState?.health !== 'ok' || (source.health && source.health !== 'ok') || source.warning;
      button.classList.toggle('is-warning', linked && Boolean(problem));
      let description=linked ? `${source?.label || 'Source unavailable'}${problem ? ' · holding last valid value / manual fallback' : ''}` : link.source ? 'Manual override · ' + (source?.label||'unavailable source') : 'Manual · source unassigned';
      if(source?.collection)description+=` · ${source.collection.included} stories, ${source.collection.excluded} unpublished${source.collection.invalid?', '+source.collection.invalid+' invalid':''}`;
      if(linked&&problem&&source?.error)description+=' · '+source.error;
      button.title=description+' · '+(linked?'Click to restore manual value':link.source?'Click to link':'Assign a source in Manage field mappings');input.title=title+' · '+description;
      detail.textContent=linked&&problem?'Holding last valid value / manual fallback':description;detail.classList.toggle('is-warning',linked&&Boolean(problem));
      if (changed && row.classList.contains('inFocus')) schedulePreview(row);
    }
    pending(row, model);
    renderSummary(row, model);
  }
  function slotControl(row, editor, model) {
    const routing = document.createElement('div'); routing.className='ycs-slot-control';
    const slotLabel=document.createElement('label'); slotLabel.textContent='Slot';
    const slotSelect=document.createElement('select');slotSelect.setAttribute('aria-label','Display slot');
    const defaultOption=document.createElement('option');defaultOption.value='__default';defaultOption.textContent='Template default'+(editor.defaultSlot?' ('+editor.defaultSlot+')':' · unassigned');slotSelect.append(defaultOption);
    const emptyOption=document.createElement('option');emptyOption.value='';emptyOption.textContent='Unassigned';slotSelect.append(emptyOption);
    for(const slot of editor.slots || []){const option=document.createElement('option');option.value=slot.id;option.textContent=slot.label;slotSelect.append(option);}
    if(editor.slotOverride && ![...slotSelect.options].some(option=>option.value===editor.slotOverride)){const option=document.createElement('option');option.value=editor.slotOverride;option.textContent='Unavailable: '+editor.slotOverride;slotSelect.append(option);}
    slotSelect.value=editor.slotOverride ?? '__default';
    const warning=document.createElement('span');warning.className='ycs-slot-warning';warning.setAttribute('role','status');
    const collapsedWarning=document.createElement('small');collapsedWarning.className='ycs-slot-warning';row.querySelector('.truncate')?.after(collapsedWarning);
    const paintSlot=valid=>{collapsedWarning.textContent=valid?'':'Assign a display slot';warning.textContent=valid?'':'Assign a slot before preview or playback';slotSelect.setAttribute('aria-invalid',String(!valid));};paintSlot(editor.slotConfigured !== false);
    slotSelect.addEventListener('click',event=>event.stopPropagation());
    slotSelect.addEventListener('change',event=>{event.stopPropagation();const previous=model.slotSelection;const value=slotSelect.value;slotSelect.disabled=true;const operation=model.queue.then(async()=>{const result=await request('/api/ycs/stages/'+stage+'/graphics/'+encodeURIComponent(row.dataset.spxEpoch)+'/slot',{slot:value==='__default'?null:value,revision:model.revision});model.revision=result.editorRevision;model.slotSelection=value;paintSlot(result.slotConfigured);notify('Slot saved. Apply with Play or Update on air.');});model.queue=operation.catch(error=>{slotSelect.value=previous;notify(error.message,true);}).finally(()=>{slotSelect.disabled=false;});});
    routing.addEventListener('keydown',event=>event.stopPropagation());model.slotSelection=slotSelect.value;slotLabel.append(slotSelect);routing.append(slotLabel,warning);return routing;

  }
  function organize(row, editor, model) {
    const cell = row.querySelector('#Expanded td[width="65%"]');
    const supported = ['hidden', 'textfield', 'checkbox', 'number', 'filelist', 'textarea', 'dropdown', 'caption', 'instruction', 'spacer'];
    if (!cell || !editor.fields?.length || editor.fields.some(field => !supported.includes(field.ftype))) return;
    const original = document.createElement('div'); original.hidden = true; original.className = 'ycs-original-fields';
    while (cell.firstChild) original.append(cell.firstChild); cell.append(original);
    cell.classList.add('ycs-compact-editor');
    const content = document.createElement('div'); content.className = 'ycs-editor-content';
    content.addEventListener('click', event => {
      if (model.previewOnEdit !== false) return;
      // Native row clicks normally preview on focus. Editing a deferred template
      // should select it for the master controls without taking it to Preview.
      event.stopPropagation();
      for (const item of document.querySelectorAll('.itemrow')) item.classList.toggle('inFocus', item === row);
      window.setMasterButtonStates?.(row);
    });
    const heading=document.createElement('div');heading.className='ycs-editor-heading';const headingTitle=document.createElement('div');headingTitle.className='ycs-editor-title';
    const nativeTitle=row.querySelector('#Expanded td[colspan="3"].spxTableHeadsmall');
    if(nativeTitle){while(nativeTitle.firstChild)headingTitle.append(nativeTitle.firstChild);nativeTitle.closest('tr').hidden=true;}else headingTitle.textContent=editor.title||row.dataset.spxEpoch;
    const folderTools=[];
    for(const icon of headingTitle.querySelectorAll('.l-icon')){
      // Font Awesome observes its generated SVG nodes. A fresh wrapper prevents
      // it from replacing the local Lucide icon after a class/path change.
      const replacement=document.createElement('span');replacement.className='l-icon ycs-template-edit';
      for(const name of ['disabled','HIDE','hide','hidden'])if(icon.classList.contains(name))replacement.classList.add(name);
      replacement.hidden=icon.hidden;replacement.style.cssText=icon.style.cssText;
      for(const name of ['onclick','onmouseover','onmouseout'])if(icon.hasAttribute(name))replacement.setAttribute(name,icon.getAttribute(name));
      replacement.innerHTML=iconMarkup('folder-open');replacement.title=icon.classList.contains('disabled')?'Template folder access is disabled':'Open template folder';icon.replaceWith(replacement);folderTools.push(replacement);replacement.remove();
    }
    let name=headingTitle.querySelector('[data-ycs-item-title]') || headingTitle.querySelector('span');
    if(!name){name=document.createElement('span');name.textContent=headingTitle.textContent;headingTitle.replaceChildren(name);}
    name.dataset.ycsItemTitle='';
    model.templateTitle=editor.templateTitle || name.textContent;
    name.textContent=model.nickname || model.templateTitle;
    const rename=document.createElement('button');rename.type='button';rename.className='ycs-nickname-edit';rename.setAttribute('aria-label','Edit nickname');rename.title='Edit rundown nickname · Graphic ID stays unchanged';rename.innerHTML=iconMarkup('square-pen');headingTitle.append(rename);
    const renameForm=document.createElement('div');renameForm.className='ycs-nickname-form';renameForm.hidden=true;
    const nicknameInput=document.createElement('input');nicknameInput.type='text';nicknameInput.maxLength=100;nicknameInput.placeholder=model.templateTitle;nicknameInput.setAttribute('aria-label','Rundown nickname');
    const saveNickname=document.createElement('button');saveNickname.type='button';saveNickname.textContent='Save';saveNickname.setAttribute('aria-label','Save nickname');
    const cancelNickname=document.createElement('button');cancelNickname.type='button';cancelNickname.textContent='Cancel';cancelNickname.setAttribute('aria-label','Cancel nickname');
    renameForm.append(nicknameInput,saveNickname,cancelNickname);headingTitle.append(renameForm);
    const closeRename=()=>{if(saveNickname.disabled)return;renameForm.hidden=true;name.hidden=false;rename.hidden=false;rename.focus();};
    rename.addEventListener('click',event=>{event.stopPropagation();nicknameInput.value=model.nickname;name.hidden=true;rename.hidden=true;renameForm.hidden=false;nicknameInput.focus();nicknameInput.select();});
    cancelNickname.addEventListener('click',event=>{event.stopPropagation();closeRename();});
    saveNickname.addEventListener('click',async event=>{event.stopPropagation();saveNickname.disabled=true;cancelNickname.disabled=true;nicknameInput.disabled=true;let saved=false;try{await editNickname(row,model,nicknameInput.value);saved=true;}catch{/* Keep the form open for correction; the queue reports the error. */}finally{saveNickname.disabled=false;cancelNickname.disabled=false;nicknameInput.disabled=false;}if(saved)closeRename();else nicknameInput.focus();});
    renameForm.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Enter'){event.preventDefault();if(!saveNickname.disabled)saveNickname.click();}else if(event.key==='Escape'){event.preventDefault();closeRename();}});
    renameForm.addEventListener('keyup',event=>event.stopPropagation());
    const toggles=document.createElement('div');toggles.className='ycs-editor-toggles';heading.append(headingTitle,toggles);content.append(heading);
    const destinations = new Map(), assigned = new Set();
    for(const section of Array.isArray(editor.sections)?editor.sections:[]){
      if(!section || !Array.isArray(section.fields) || section.fields.some(field=>typeof field!=='string'||assigned.has(field)))continue;
      let container;
      if(section.placement==='header') container=toggles;
      else if(section.title){container=document.createElement('details');container.className='ycs-advanced';container.open=section.collapsed!==true;const title=document.createElement('summary');title.textContent=section.title;container.append(title);content.append(container);}
      else {container=document.createElement('div');content.append(container);}
      for(const field of section.fields){destinations.set(field,container);assigned.add(field);}
    }
    const badge = document.createElement('span'); badge.className = 'ycs-pending'; badge.hidden = true; model.badge = badge;
    const manager = document.createElement('a'); manager.href = `/ycs/data-manager?stage=${stage}&graphic=${encodeURIComponent(row.dataset.spxEpoch)}`; manager.className = 'ycs-field-mappings'; manager.textContent = 'Manage field mappings ↗';
    cell.append(content, manager, badge);
    for (const field of editor.fields) {
      const input = original.querySelector(`[data-update="${field.field}"]`); if (!input || field.ftype === 'hidden') continue;
      const wrapper = document.createElement('div'); wrapper.className = 'ycs-editor-field';
      const label = document.createElement('label'); input.id ||= `ycs-${row.dataset.spxEpoch}-${field.field}`; label.htmlFor = input.id; label.textContent = field.title==='Rounds remaining text'?'Remaining text':field.title || field.field;
      if (field.ftype === 'checkbox') { input.classList.add('ycs-check');wrapper.classList.add('ycs-checkbox-field');wrapper.append(input, label);(destinations.get(field.field) || content).append(wrapper);continue; }
      else wrapper.append(label, input);
      (destinations.get(field.field) || content).append(wrapper);
    }

    for (const info of row.querySelectorAll('#Expanded td.aright.spxTableHeadsmall')) info.closest('tr').hidden = true;
    const save = row.querySelector('button[onclick*="saveTemplateItemChangesByElement"]'); if (save) { save.textContent = 'Save draft'; save.title = 'Save without changing program'; }
    const update = row.querySelector('[data-spx-name="updatebutton"]'); if (update) { update.textContent = 'Update on air'; update.title = 'Apply this draft and its field links to program'; }
    const siblingCells=[...cell.parentElement.children].filter(sibling=>sibling!==cell),nativeActions=siblingCells.flatMap(sibling=>[...sibling.querySelectorAll('button,.l-icon')]);
    if(nativeActions.length){const footer=document.createElement('div');footer.className='ycs-editor-footer';const actions=document.createElement('div');actions.className='ycs-editor-actions';const tools=document.createElement('div');tools.className='ycs-editor-tools';for(const action of [...nativeActions,...folderTools])(action.tagName==='BUTTON'?actions:tools).append(action);footer.append(manager,actions,tools);cell.append(footer);for(const sibling of siblingCells)sibling.hidden=true;cell.colSpan=siblingCells.length+1;cell.setAttribute('width','100%');}
  }
  function initialize(row) {
    const id = row.dataset.spxEpoch, model = { links: {}, widgets: {}, revision: 0, queue: Promise.resolve() }; models.set(id, model);
    model.ready = request(`/api/ycs/stages/${stage}/graphics/${encodeURIComponent(id)}/editor`).then(editor => {
      model.summaryFields = structuredClone(editor.fields || []); model.summaryLinks = structuredClone(editor.links || {});
      model.previewOnEdit = editor.previewOnEdit !== false; model.links = editor.links; model.revision = editor.revision; model.template = editor.template; model.nickname=editor.nickname || ''; organize(row, editor, model);
      const routing=slotControl(row, editor, model),heading=row.querySelector('.ycs-editor-heading');
      if(heading)heading.after(routing);else row.querySelector('#Expanded')?.prepend(routing);
      window.YCSCompanionTools({ row, project, rundown, editor, copyIcon: stagePanel.icon('copy'), copyText: (...args) => stagePanel.copyText(...args) });
      for (const [field, link] of Object.entries(model.links)) {
        const input = row.querySelector(`[data-update="${field}"]`); if (!input) continue;
        const title = editor.fields?.find(item => item.field === field)?.title || input.placeholder || 'Current round';
        const container = document.createElement('div'); container.className = 'ycs-link-field'; input.before(container);
        const button = document.createElement('button'); button.type = 'button'; button.className = 'ycs-link-toggle';
        button.innerHTML = iconMarkup('unlink-2');
        const detail = document.createElement('div'); detail.className = 'ycs-link-detail';detail.id=`ycs-link-${id}-${field}`;input.setAttribute('aria-describedby',[input.getAttribute('aria-describedby'),detail.id].filter(Boolean).join(' '));button.setAttribute('aria-describedby',detail.id);container.append(button, input); container.after(detail);
        model.widgets[field] = { input, button, detail, title };
        button.addEventListener('click', event => {
          event.stopPropagation();
          if (link.mode === 'manual') { if (!link.source) { notify('Assign a source using Manage field mappings first.', true); return; } link.manual = manualValue(input); link.mode = 'linked'; }
          else { link.mode = 'manual'; showValue(input,link.manual); }
          row.dataset.spxChanged = 'true'; paintLink(row, model); send(row, 'preview', true);
        }); showValue(input,link.manual);
      }
      paintLink(row, model);
    }).catch(error => { notify(error.message, true); throw error; }); model.ready.catch(() => {});
    return model.ready;
  }
  function editNickname(row, model, nickname) {
    const operation=model.queue.then(async()=>{
      await model.ready;
      const result=await request(`/api/ycs/stages/${stage}/graphics/${encodeURIComponent(row.dataset.spxEpoch)}/nickname`,{nickname,revision:model.revision});
      model.nickname=result.nickname;model.revision=result.editorRevision;
      for(const title of row.querySelectorAll('[data-ycs-item-title]'))title.textContent=result.nickname || model.templateTitle;
      notify('Nickname saved. Graphic ID unchanged.');
    });
    model.queue=operation.catch(error=>notify(error.message,true));
    return operation;
  }
  function send(row, action, automatic = false) {
    if (!row) return Promise.resolve();
    const model = models.get(row.dataset.spxEpoch); if (!model) return Promise.resolve();
    clearTimeout(timers.get(row));
    const generation = previewGeneration;
    const operation = model.queue.then(async () => {
      await model.ready;
      if (automatic && model.previewOnEdit === false) return;
      if (action === 'preview' && generation !== previewGeneration) return;
      const body = ['stop', 'continue'].includes(action) ? {} : {
        fields: fields(row), links: Object.fromEntries(Object.entries(model.links).map(([field, link]) => [field, { mode: link.mode, manual: link.manual }])), revision: model.revision
      };
      const result = await request(`/api/ycs/stages/${stage}/graphics/${encodeURIComponent(row.dataset.spxEpoch)}/${action}`, body);
      if (!['stop', 'continue'].includes(action)) fieldErrors(row);
      if (validationRow === row && !['stop', 'continue'].includes(action)) { notify(''); validationRow = null; }
      if (action !== 'preview') {
        if (['play', 'update', 'save'].includes(action)) model.revision = result.editorRevision;
        notify(action === 'save' ? 'Saved. Program unchanged.' : `${row.dataset.spxEpoch}: ${action}`);
        if (['play', 'update', 'save'].includes(action)) { row.dataset.spxChanged = 'false'; pending(row, model); }
        if (action === 'save') {
          model.summaryLinks = structuredClone(model.links);
          for (const field of model.summaryFields) {
            const input = row.querySelector('[data-update="' + field.field + '"]');
            if (input) field.value = model.links[field.field]?.manual ?? manualValue(input);
          }
          renderSummary(row, model);
          if (row.querySelector('#Expanded')?.style.display !== 'none') window.ToggleExpand?.(row);
        }
      }
      return result;
    });
    model.queue = operation.catch(error => { if (action === 'preview') row.dataset.spxPreviewing = 'false'; validationRow = error.fields ? row : null; fieldErrors(row, error.fields); notify(error.message, true); });
    return model.queue;
  }
  function schedulePreview(row) { clearTimeout(timers.get(row)); if (models.get(row.dataset.spxEpoch)?.previewOnEdit === false) return; timers.set(row, setTimeout(() => send(row, 'preview', true), 300)); }
  for (const row of document.querySelectorAll('.itemrow')) initialize(row);
  document.addEventListener('input', event => {
    const row = event.target.closest('.itemrow'); if (!row || !event.target.matches('[data-update]')) return;
    const model = models.get(row.dataset.spxEpoch);
    const link = model?.links[event.target.dataset.update];
    if (link?.mode === 'manual') link.manual = manualValue(event.target);
    row.dataset.spxChanged = 'true'; if (model) pending(row, model);
    schedulePreview(row);
  });
  // Existing buttons and keyboard shortcuts call these globals. Server state
  // drives the indicators; unsuccessful commands never mark an item on air.
  window.previewItem = row => send(row || window.getFocusedRow(), 'preview');
  window.updateItem = row => send(row || window.getFocusedRow(), 'update');
  window.saveTemplateItemChangesByElement = row => send(row, 'save');
  window.playItem = (row, forced = '', prevent = false) => {
    row ||= window.getFocusedRow(); if (!row || prevent) return;
    return send(row, forced || (active.has(row.dataset.spxEpoch) ? 'stop' : 'play'));
  };
  window.nextItem = row => send(row || window.getFocusedRow(), 'continue');
  // Wait for the saved copy, then import a fresh native row. cloneNode would
  // copy enhanced markup without its listeners, model or updated identifiers.
  const duplicating = new WeakSet();
  window.duplicateRundownItem = async row => {
    row ||= window.getFocusedRow();
    if (!row || duplicating.has(row)) return;
    duplicating.add(row);
    let saved = false;
    try {
      await models.get(row.dataset.spxEpoch)?.queue;
      const datafile = document.getElementById('datafile')?.value;
      if (!datafile) throw new Error('Rundown file is unavailable. Reload before duplicating.');
      const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() :
        Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
      const response = await fetch(location.pathname, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'duplicateRundownItem', sourceEpoch: row.dataset.spxEpoch,
          cloneEpoch: id, foldername: project, listname: rundown, datafile })
      });
      if (!response.ok) throw new Error('Could not duplicate this item.');
      saved = true;
      const page = await fetch(location.pathname, { cache: 'no-store' });
      if (!page.ok) throw new Error('Could not load the saved copy.');
      const documentCopy = new DOMParser().parseFromString(await page.text(), 'text/html');
      const nativeRow = [...documentCopy.querySelectorAll('.itemrow')].find(item => item.dataset.spxEpoch === id);
      if (!nativeRow || !row.isConnected || disposed) throw new Error('Reload to display the saved copy.');
      const copy = document.importNode(nativeRow, true);
      row.after(copy);
      window.updateFormIndexes?.();
      await initialize(copy);
      if (row.classList.contains('inFocus')) {
        row.classList.remove('inFocus'); copy.classList.add('inFocus');
        window.setMasterButtonStates?.(copy);
      }
      notify('Item duplicated.');
      return copy;
    } catch (error) {
      if (!disposed) notify(saved ? 'Copy saved. Reload the rundown to finish loading it. ' + error.message : error.message, true);
    } finally { duplicating.delete(row); }
  };
  // Keep the native Caps Lock overlay's copy shortcuts on the same stage API.
  window.copyItemID = (item, action = '') => {
    try {
      const text = action ? new URL(window.YCSCompanion.command(project, rundown, item, action.toLowerCase()).path, location.href).href : item;
      const copied = stagePanel.copyText(text, action ? 'Companion ' + action + ' URL' : 'Item ID');
      window.showItemIDs?.(false);
      return copied;
    } catch (error) { notify(error.message, true); }
  };
  async function clearStage() {
    try { await request(`/api/ycs/stages/${stage}/clear`, {}); notify('Stage stopped.'); }
    catch (error) { notify(error.message, true); }
  }
  window.stopAll = clearStage;
  function syncButtons(snapshot) {
    active = new Set(snapshot.graphics.map(item => item.id));
    program = new Map(snapshot.graphics.map(item => [item.id, item]));
    for (const row of document.querySelectorAll('.itemrow')) {
      const playing = active.has(row.dataset.spxEpoch); row.dataset.spxOnair = String(playing);
      const hidden = row.querySelector('[name="RundownItem[onair]"]'); if (hidden) hidden.value = String(playing);
      const icon = row.querySelector('[data-spx-name="icon"]'); icon?.classList.toggle('playTrue', playing); icon?.classList.toggle('playFalse', !playing);
      row.querySelector('[data-spx-name="updatebutton"]')?.classList.toggle('disabled', !playing);
      for (const target of row.querySelectorAll('[data-spx-name="deletesmall"], [data-spx-name="deletelarge"]')) target.style.visibility = playing ? 'hidden' : 'visible';
      const button = row.querySelector('[data-spx-name="playbutton"]');
      if (button) {
        button.textContent = button.getAttribute(playing ? 'data-spx-stoptext' : 'data-spx-playtext');
        button.classList.toggle('bg_red', playing); button.classList.toggle('bg_green', !playing);
      }
    }
    const selected = document.querySelector('.itemrow.inFocus'); if (selected) window.setMasterButtonStates?.(selected);
    stagePanel.setProgram(snapshot);
  }
  const stageEvents = io('/ycs-playback', { transports: ['websocket'], forceNew: true });
  stageEvents.on('connect', () => stageEvents.emit('subscribe', { stage, modes: ['program', 'preview'], controller: true }));
  stageEvents.on('focus', selection => {
    if (disposed || selection.stage !== stage) return;
    previewGeneration++;
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    const row = [...document.querySelectorAll('.itemrow')].find(row => row.dataset.spxEpoch === selection.selected);
    if (!row) { notify('Selected item is missing. Reload the rundown.', true); return; }
    for (const item of document.querySelectorAll('.itemrow')) item.classList.toggle('inFocus', item === row);
    row.scrollIntoView?.({ block: 'nearest' });
    window.setMasterButtonStates?.(row);
    stagePanel.selectMonitor('preview');
    if (row.dataset.spxChanged === 'true') notify('Previewing saved values. Save edits before using Companion Play.');
  });
  stageEvents.on('state', snapshot => {
    if (snapshot.stage !== stage) return;
    if (snapshot.mode === 'program') syncButtons(snapshot);
    else if (snapshot.mode === 'preview') {
      // Native focusRow skips rows marked already previewing. Stop Stage (or
      // another controller) may clear/change Preview while its row stays focused.
      for (const row of document.querySelectorAll('.itemrow'))
        row.dataset.spxPreviewing = String(snapshot.selected === row.dataset.spxEpoch);
      stagePanel.setPreview(snapshot);
    }
  });
  function disconnected() {
    if (disposed) return;
    stagePanel.setConnected(false);
  }
  stageEvents.on('disconnect', disconnected); stageEvents.on('connect_error', disconnected);
  stageEvents.on('stage-error', error => notify(error.error, true));
  async function poll() {
    if (polling || disposed) return; polling = true;
    try {
      sourceState = await request('/api/ycs/data');
      stagePanel.setDataAvailable(sourceState.health === 'ok');
      for (const row of document.querySelectorAll('.itemrow')) { const model = models.get(row.dataset.spxEpoch); if (model?.widgets) paintLink(row, model); }
    } catch { stagePanel.setDataAvailable(false); }
    finally { polling = false; }
  }
  poll(); const pollTimer = setInterval(poll, 1500);
  const options = document.getElementById('renderOptionsFoldable'); if (options) options.hidden = true;
  window.addEventListener('pagehide', () => {
    disposed = true; stagePanel.dispose(); clearInterval(pollTimer); for (const timer of timers.values()) clearTimeout(timer);
    try { stageEvents.disconnect(); } catch { /* Transport may already be closed during navigation. */ }
  }, { once: true });
}
