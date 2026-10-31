// DOM rendering and UI events only. Draft mutations and requests go through the workspace.
window.YCSMappingView = class MappingView {
  updateRundownLink() {
    const link = this.$('back-rundown');
    const stage = this.workspace.stages.find(stage => stage.id === this.workspace.stage);
    const target = stage?.controller || (stage?.project && stage?.rundown ? '/gc/' + encodeURIComponent(stage.project) + '/' + encodeURIComponent(stage.rundown) : null);
    if (target) link.setAttribute('href', target); else link.removeAttribute('href');
    link.setAttribute('aria-disabled', String(!target));
    link.title = target ? (stage.project || stage.title) + ' / ' + stage.rundown : 'Select a configured rundown';
  }
  setProjects(stages, selected) {
    const target = this.$('mapping-project');
    target.replaceChildren();
    for (const project of [...new Set(stages.map((item) => item.project || item.id))])
      this.option(target, project, project.replaceAll('-', ' '));
    if (selected) target.value = selected;
  }
  setStages(stages, preferred) {
    const target = this.$('mapping-stage');
    target.replaceChildren();
    for (const stage of stages.filter(
      (item) => (item.project || item.id) === this.$('mapping-project').value
    ))
      this.option(target, stage.id, (stage.rundown || stage.title) + ' · ' + stage.title);
    if (typeof preferred === 'string') target.value = preferred;
  }
  clearGraphics() {
    this.$('mapping-graphic').replaceChildren();
  }
  populateGraphics(graphics, requested) {
    const target = this.$('mapping-graphic');
    for (const graphic of graphics) this.option(target, graphic.id, graphic.title);
    if (graphics.some((item) => item.id === requested)) target.value = requested;
  }
  showLoading() {
    this.$('mapping-fields').replaceChildren();
    this.$('mapping-title').textContent = 'Loading graphic…';
  }
  showEmpty(title) {
    this.$('mapping-fields').replaceChildren();
    this.$('mapping-title').textContent = title;
  }
  showSelection(model) {
    this.$('mapping-title').textContent =
      model.title || this.workspace.graphics.find((item) => item.id === model.graphic)?.title;
    this.$('mapping-path').textContent = model.template;
  }
  setSaving(saving) {
    this.$('mappings-view').inert = saving;
  }
  previewError(message) {
    this.$('preview-error').textContent = message;
  }
  clearPreviewError() {
    this.previewError('');
  }
  sendPreview(graphic) {
    this.$('mapping-preview').contentWindow.postMessage(
      { type: 'ycs-mapping-preview', graphic },
      location.origin
    );
  }
  constructor(workspace) {
    this.workspace = workspace;
    this.$ = workspace.$;
    this.$('back-rundown').onclick = event => {
      if (!this.$('back-rundown').hasAttribute('href')) { event.preventDefault(); return; }
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (workspace.saving) { event.preventDefault(); workspace.message('Wait for the mapping save to finish.'); return; }
      if ([...workspace.models.values()].some(model => model.edits.size) && !window.confirm('Discard unsaved mapping changes and return to the selected rundown?')) event.preventDefault();
    };
    this.$('mapping-project').onchange = () => this.workspace.selectProject();
    this.$('mapping-stage').onchange = () => this.workspace.selectStage();
    this.$('mapping-graphic').onchange = () => this.workspace.selectGraphic();
    this.$('graphic-search').oninput = () => this.renderGraphics();
    this.$('source-search').oninput = () => this.renderSourceValues();
    this.$('mapping-source').onchange = () =>
      this.workspace.selectSource(this.$('mapping-source').value);
    this.$('auto-map').onclick = () => this.workspace.autoMap();
    this.$('save-mappings').onclick = () => this.workspace.save();
    this.$('reload-mappings').onclick = () => this.workspace.selectGraphic(true);
    this.$('browse-source').onclick = () => this.openCells();
    this.$('close-cell').onclick = () => this.$('cell-dialog').close();
    this.$('mapping-scope').onchange = () =>
      this.workspace.changeScope(this.$('mapping-scope').value);
    this.$('advanced-lookup').onclick = () => this.openLookup();
    this.$('cancel-lookup').onclick = () => this.$('lookup-dialog').close();
    this.$('apply-lookup').onclick = () => {
      const connection = this.workspace.connection();
      if (!connection || !window.YCSSourceTypes.isTable(connection)) return;
      this.workspace.assign({
        connection: this.workspace.sourceId,
        selection: {
          kind: 'row',
          headerRow: Number(this.$('lookup-header').value),
          keyColumn: this.$('lookup-key').value,
          keyValue: this.$('lookup-match').value,
          valueColumn: this.$('lookup-value').value
        }
      });
      this.$('lookup-dialog').close();
    };
    this.listeners = [
      ['pointermove', (event) => this.moveDrag(event)],
      ['pointerup', (event) => this.endDrag(event)],
      ['pointercancel', () => this.endDrag()]
    ];
    for (const [name, listener] of this.listeners) document.addEventListener(name, listener);
    this.$('mapping-preview').onload = () => this.workspace.schedulePreview();
    this.messageHandler = (event) => {
      if (
        event.origin !== location.origin ||
        event.source !== this.$('mapping-preview').contentWindow
      )
        return;
      if (event.data?.type === 'ycs-mapping-preview-ready') this.workspace.schedulePreview();
      if (event.data?.type === 'ycs-mapping-preview-status')
        this.$('preview-error').textContent = event.data.error || '';
    };
    window.addEventListener('message', this.messageHandler);
    if (window.ResizeObserver) {
      this.resize = new ResizeObserver(() => this.fitPreview());
      this.resize.observe(this.$('mapping-preview').parentElement);
    }
    this.fitPreview();
  }
  node(tag, text, className) {
    return window.YCSMappingDOM.node(tag, text, className);
  }
  option(select, value, text) {
    return window.YCSMappingDOM.option(select, value, text);
  }
  control(options, value, label) {
    return window.YCSMappingDOM.control(options, value, label);
  }
  fieldLabel(title, control) {
    return window.YCSMappingDOM.fieldLabel(title, control);
  }
  setBusy(busy) {
    this.$('mappings-view').setAttribute('aria-busy', String(busy));
    for (const selector of ['.mapping-editor', '.data-panel'])
      this.$('mappings-view').querySelector(selector).inert = busy;
    this.$('reload-mappings').disabled = busy;
  }
  renderGraphics() {
    const target = this.$('graphics-list');
    target.replaceChildren();
    const search = this.$('graphic-search').value.toLowerCase();
    this.$('graphics-count').textContent = this.workspace.graphics.length + ' in rundown';
    for (const [index, graphic] of this.workspace.graphics.entries()) {
      if (!`${graphic.title} ${graphic.template}`.toLowerCase().includes(search)) continue;
      const model = this.workspace.models.get(this.workspace.stage + '\0' + graphic.id),
        mapped = model
          ? model.fields.filter((field) => this.workspace.bindingFor(model, field)).length
          : graphic.mapped || 0,
        total = graphic.fields?.length || model?.fields.length || 0;
      const button = this.node('button', undefined, 'graphic-card');
      button.type = 'button';
      button.dataset.graphic = graphic.id;
      button.setAttribute('aria-pressed', String(this.$('mapping-graphic').value === graphic.id));
      const details = this.node('span');
      details.append(
        this.node('strong', graphic.title),
        this.node('code', graphic.template?.split('/').pop() || graphic.id)
      );
      button.append(
        this.node('span', String(index + 1).padStart(2, '0'), 'graphic-index'),
        details,
        this.node('span', `${mapped}/${total}${model?.edits.size ? ' •' : ''}`, 'graphic-count')
      );
      button.onclick = () => {
        this.$('mapping-graphic').value = graphic.id;
        this.workspace.selectGraphic();
      };
      target.append(button);
    }
  }
  renderSources() {
    const select = this.$('mapping-source'),
      state = this.workspace.getState();
    select.replaceChildren();
    for (const [id, connection] of Object.entries(state.connections || {}))
      if (!connection.project || connection.project === this.workspace.project())
        this.option(
          select,
          id,
          connection.label + (window.YCSSourceTypes.isJSON(connection) ? ' · JSON' : '')
        );
    for (const [id, source] of Object.entries(state.sources || {}))
      if (source.type === 'local') this.option(select, 'local:' + id, 'Local · ' + source.label);
    const mapped = this.workspace.model.fields
      .map((field) => this.workspace.binding(field)?.connection)
      .find(Boolean);
    if ([...select.options].some((option) => option.value === this.workspace.sourceId))
      select.value = this.workspace.sourceId;
    else if (mapped && [...select.options].some((option) => option.value === mapped))
      select.value = mapped;
    return select.value;
  }
  renderSourceContext() {
    const target = this.$('source-context');
    target.replaceChildren();
    const connection = this.workspace.connection();
    this.$('browse-source').hidden = !window.YCSSourceTypes.isTable(connection);
    this.$('source-values-title').textContent = window.YCSSourceTypes.isJSON(connection)
      ? 'JSON properties'
      : this.workspace.tableMode
        ? 'Columns'
        : 'Cells / values';
    if (window.YCSSourceTypes.isTable(connection)) {
      const description = this.node(
        'p',
        `${connection.settings.file || this.workspace.sheetNames?.[connection.settings.url]?.[connection.settings.worksheet] || connection.settings.worksheet} · ${connection.settings.range}`,
        'hint'
      );
      target.append(description);
      const mode = this.control(
        [
          ['cells', 'Pick individual cells'],
          ['table', 'Use a table row']
        ],
        this.workspace.tableMode ? 'table' : 'cells',
        'Sheet browsing mode'
      );
      mode.onchange = () => {
        this.workspace.browseAs(mode.value === 'table');
      };
      target.append(this.fieldLabel('Browse as', mode));
      if (this.workspace.tableMode) {
        const first = Number(connection.rows[0]?.[0]?.address.match(/\d+$/)?.[0]) || 1;
        for (const [title, key, initial] of [
          ['Header row', 'headerRow', first],
          ['Data row', 'dataRow', first + 1]
        ]) {
          const input = this.node('input');
          input.type = 'number';
          input.min = first;
          input.value = this.workspace[key] || initial;
          input.oninput = () => {
            this.workspace.setBrowseRow(key, Number(input.value));
          };
          target.append(this.fieldLabel(title, input));
        }
      }
    } else if (window.YCSSourceTypes.isJSON(connection))
      target.append(
        this.node(
          'p',
          (connection.settings.file ? connection.settings.file + ' · ' : '') +
            'Expand a collection to choose a property. Paths are generated automatically.',
          'hint'
        )
      );
  }
  renderSourceValues() {
    const connection = this.workspace.connection(),
      target = this.$('source-values');
    target.replaceChildren();
    const health = connection?.health || 'ok';
    this.$('mapping-source-health').textContent = health === 'ok' ? 'Connected' : health;
    this.$('mapping-source-health').className = health === 'ok' ? 'connected' : 'warning';
    const search = this.$('source-search').value.toLowerCase(),
      leaves = this.workspace
        .leaves()
        .filter((leaf) =>
          `${leaf.name} ${leaf.path || ''} ${leaf.value ?? ''}`.toLowerCase().includes(search)
        );
    let count = 0;
    const groups = new Map();
    for (const leaf of leaves.slice(0, 200)) {
      const card = this.node('button', undefined, 'source-card');
      card.type = 'button';
      card.draggable = true;
      card.dataset.binding = JSON.stringify(leaf.binding);
      card.disabled =
        leaf.value === undefined || leaf.value === null || String(leaf.value).length > 300;
      const used =
        this.workspace.model?.fields
          .filter((field) => this.workspace.equalPick(this.workspace.binding(field), leaf.binding))
          .map((field) => field.title) || [];
      const head = this.node('span', undefined, 'source-card-heading');
      head.append(
        this.node('code', leaf.name),
        this.node('small', used.length ? 'Used · ' + used.join(', ') : '')
      );
      card.append(head, this.node('span', String(leaf.value ?? 'No value'), 'source-card-value'));
      card.title = leaf.path || leaf.name;
      card.onclick = () => {
        if (!card.ignoreClick) this.workspace.assign(structuredClone(leaf.binding));
      };
      card.onpointerdown = (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        this.drag = {
          binding: structuredClone(leaf.binding),
          name: leaf.name,
          startX: event.clientX,
          startY: event.clientY,
          card
        };
        card.setPointerCapture?.(event.pointerId);
      };
      card.ondragstart = (event) => {
        event.dataTransfer.setData('application/x-ycs-binding', JSON.stringify(leaf.binding));
        event.dataTransfer.effectAllowed = 'copy';
      };
      if (window.YCSSourceTypes.isJSON(connection) && !search && leaf.path.includes('/')) {
        const groupPath = leaf.path.slice(0, leaf.path.lastIndexOf('/')) || '/';
        let group = groups.get(groupPath);
        if (!group) {
          group = this.node('details');
          group.open = groups.size === 0;
          group.append(this.node('summary', groupPath));
          groups.set(groupPath, group);
          target.append(group);
        }
        group.append(card);
      } else target.append(card);
      count++;
    }
    if (!count)
      target.append(
        this.node(
          'p',
          connection?.error || 'No values available. Choose a source or browse its cells.',
          'hint'
        )
      );
    if (leaves.length > 200)
      target.append(
        this.node(
          'p',
          'Showing 200 values. Search to narrow the list, or browse sheet cells.',
          'hint'
        )
      );
  }
  moveDrag(event) {
    if (!this.drag) return;
    const drag = this.drag;
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6 && !drag.moved)
      return;
    drag.moved = true;
    drag.card.ignoreClick = true;
    if (!drag.ghost) {
      drag.ghost = this.node('div', drag.name, 'mapping-drag-label');
      document.body.append(drag.ghost);
    }
    drag.ghost.style.left = event.clientX + 12 + 'px';
    drag.ghost.style.top = event.clientY + 12 + 'px';
    for (const row of this.$('mapping-fields').children) row.classList.remove('drop-target');
    const row = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest('#mapping-fields tr[data-field]');
    row?.classList.add('drop-target');
  }
  endDrag(event) {
    const drag = this.drag;
    if (!drag) return;
    this.drag = null;
    drag.ghost?.remove();
    for (const row of this.$('mapping-fields').children) row.classList.remove('drop-target');
    if (drag.moved && event) {
      const row = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest('#mapping-fields tr[data-field]');
      if (row) {
        this.workspace.selectField(row.dataset.field);
        this.workspace.assign(drag.binding);
      }
    }
    setTimeout(() => {
      drag.card.ignoreClick = false;
    }, 0);
  }
  renderFields() {
    const target = this.$('mapping-fields');
    target.replaceChildren();
    if (!this.workspace.model) return;
    for (const field of this.workspace.model.fields) {
      const binding = this.workspace.binding(field),
        row = this.node('tr');
      row.dataset.field = field.field;
      row.classList.toggle('field-selected', this.workspace.selectedField === field.field);
      const name = this.node('td'),
        choose = this.node('button', field.title, 'field-name');
      choose.type = 'button';
      choose.onclick = () => {
        this.workspace.selectField(field.field);
        for (const line of target.children)
          line.classList.toggle('field-selected', line.dataset.field === field.field);
      };
      name.append(choose, this.node('code', field.field));
      row.append(name, this.node('td', field.type || 'Text'));
      if (field.ycsCollection) {
        this.renderCollectionField(row, field, binding);
        target.append(row);
        continue;
      }
      const source = this.node('td'),
        options = [
          ['', 'Unmapped'],
          ['static', 'Static value'],
          ['browse', 'Choose from source panel…']
        ];
      if (binding && !Object.hasOwn(binding, 'static'))
        options.push(['current', this.workspace.sourceLabel(binding)]);
      const select = this.control(
        options,
        !binding ? '' : Object.hasOwn(binding, 'static') ? 'static' : 'current',
        field.title + ' data source'
      );
      select.onchange = () => {
        this.workspace.selectField(field.field);
        if (select.value === 'browse') {
          this.renderFields();
          this.$('source-search').focus();
          this.workspace.message('Click a source value to assign ' + field.title + '.');
        } else
          this.workspace.assign(select.value === 'static' ? { static: field.manual || '' } : null);
      };
      source.append(select);
      if (binding && Object.hasOwn(binding, 'static')) {
        const input = this.node('input');
        input.value = binding.static;
        input.setAttribute('aria-label', field.title + ' static value');
        input.oninput = () => {
          this.workspace.editField(field.field, {
            ...this.workspace.binding(field),
            static: input.value
          });
        };
        source.append(input);
      }
      row.append(source);
      const transform = this.node('td'),
        transformSelect = this.control(
          [
            ['none', 'None'],
            ['uppercase', 'Uppercase'],
            ['lowercase', 'Lowercase'],
            ['trim', 'Trim whitespace'],
            ['prefix', 'Prefix text / media path']
          ],
          binding?.transform?.kind || 'none',
          field.title + ' transform'
        );
      transformSelect.disabled = !binding;
      transformSelect.onchange = () => {
        this.workspace.selectField(field.field);
        const next = structuredClone(this.workspace.binding(field));
        next.transform = { kind: 'none' };
        if (transformSelect.value !== 'none')
          next.transform = {
            kind: transformSelect.value,
            ...(transformSelect.value === 'prefix' ? { value: '' } : {})
          };
        this.workspace.assign(next);
      };
      transform.append(transformSelect);
      if (binding?.transform?.kind === 'prefix') {
        const input = this.node('input');
        input.value = binding.transform.value;
        input.placeholder = 'media/guests/';
        input.setAttribute('aria-label', field.title + ' prefix');
        input.oninput = () => {
          this.workspace.editField(field.field, {
            ...this.workspace.binding(field),
            transform: { kind: 'prefix', value: input.value }
          });
        };
        transform.append(input);
      }
      row.append(transform);
      const preview = this.node('td');
      preview.dataset.preview = field.field;
      preview.append(this.node('span', field.value ?? field.manual ?? ''));
      row.append(preview);
      row.ondragover = (event) => {
        if (event.dataTransfer.types.includes('application/x-ycs-binding')) {
          event.preventDefault();
          row.classList.add('drop-target');
        }
      };
      row.ondragleave = () => row.classList.remove('drop-target');
      row.ondrop = (event) => {
        event.preventDefault();
        row.classList.remove('drop-target');
        try {
          const pick = JSON.parse(event.dataTransfer.getData('application/x-ycs-binding'));
          this.workspace.selectField(field.field);
          this.workspace.assign(pick);
        } catch {
          this.workspace.message('Choose a value from the source panel.', true);
        }
      };
      target.append(row);
    }
    this.paintPreview();
  }
  renderCollectionField(row, field, binding) {
    const source = this.node('td'),
      configure = this.node('button', binding ? 'Edit story mapping' : 'Map story list');
    configure.type = 'button';
    configure.setAttribute('aria-label', 'Map ' + field.title);
    configure.onclick = () => this.workspace.collectionEditor?.open(field);
    source.append(configure);
    if (binding) {
      source.append(this.node('small', this.workspace.sourceLabel(binding)));
      const clear = this.node('button', 'Unmap');
      clear.type = 'button';
      clear.onclick = () => {
        this.workspace.selectField(field.field);
        this.workspace.assign(null);
      };
      source.append(clear);
    }
    row.append(source, this.node('td', 'Per-story fields'));
    const preview = this.node('td');
    preview.dataset.preview = field.field;
    row.append(preview);
  }
  status() {
    const changed = Boolean(this.workspace.model?.edits.size);
    this.$('save-mappings').disabled = this.workspace.loading || !changed;
    this.$('mapping-status').textContent = this.workspace.loading
      ? 'Loading selection…'
      : !this.workspace.model
        ? 'Select a graphic.'
        : changed
          ? 'Unsaved mapping · Program unchanged'
          : 'Mapping saved · Program unchanged';
  }
  openCells() {
    if (
      this.workspace.model?.fields.find((field) => field.field === this.workspace.selectedField)
        ?.ycsCollection
    ) {
      this.workspace.collectionEditor?.open(
        this.workspace.model.fields.find((field) => field.field === this.workspace.selectedField)
      );
      return;
    }
    const connection = this.workspace.connection();
    if (!connection || !window.YCSSourceTypes.isTable(connection) || !this.workspace.model) return;
    const field = this.workspace.model.fields.find(
      (field) => field.field === this.workspace.selectedField
    );
    this.$('cell-help').textContent =
      'Choose a cell for ' + field.title + '. Empty cells may be linked before data arrives.';
    const target = this.$('mapping-cell-grid');
    target.replaceChildren();
    const table = this.node('table');
    table.setAttribute('aria-label', 'Source cells');
    const rows = connection.rows || [];
    const head = this.node('thead'), headings = this.node('tr');
    headings.append(this.node('th'));
    for (const cell of rows[0] || []) {
      const heading = this.node('th', cell.address.replace(/\d+$/, ''));
      heading.scope = 'col'; headings.append(heading);
    }
    head.append(headings); table.append(head);
    const body = this.node('tbody');
    for (const cells of rows) {
      const tr = this.node('tr');
      const rowHeading = this.node('th', cells[0]?.address.match(/\d+$/)?.[0] || '');
      rowHeading.scope = 'row'; tr.append(rowHeading);
      for (const cell of cells) {
        const td = this.node('td'),
          button = this.node('button');
        button.type = 'button';
        button.append(this.node('span', cell.value || 'Empty'));
        button.title = cell.address + ': ' + (cell.value || 'Empty');
        button.classList.toggle('empty-cell', !cell.value);
        button.setAttribute('aria-label', cell.address + ': ' + (cell.value || 'empty'));
        button.onclick = () => {
          this.workspace.assign({
            connection: this.workspace.sourceId,
            selection: { kind: 'cell', cell: cell.address }
          });
          this.$('cell-dialog').close();
        };
        td.append(button);
        tr.append(td);
      }
      body.append(tr);
    }
    table.append(body);
    target.append(table);
    this.$('cell-dialog').showModal();
  }
  openLookup() {
    if (
      this.workspace.model?.fields.find((field) => field.field === this.workspace.selectedField)
        ?.ycsCollection
    ) {
      this.workspace.message('Use Map story list for collection fields.');
      return;
    }
    if (
      !this.workspace.connection() ||
      !window.YCSSourceTypes.isTable(this.workspace.connection())
    ) {
      this.workspace.message('Choose a Google Sheets or CSV source for row lookup.');
      return;
    }
    const field = this.workspace.model.fields.find(
        (field) => field.field === this.workspace.selectedField
      ),
      pick = this.workspace.binding(field)?.selection || {};
    this.$('lookup-header').value = pick.headerRow || 1;
    this.$('lookup-key').value = pick.keyColumn || '';
    this.$('lookup-match').value = pick.keyValue || '';
    this.$('lookup-value').value = pick.valueColumn || '';
    this.$('lookup-dialog').showModal();
  }
  paintPreview() {
    if (!this.workspace.model) return;
    const data = this.workspace.previewData;
    if (data?.template !== this.workspace.model.template) return;
    for (const field of data.fields || []) {
      const target = this.$('mapping-fields').querySelector(`[data-preview="${field.field}"]`);
      if (!target) continue;
      let display = field.value;
      if (field.ycsCollection) {
        try {
          display = JSON.parse(field.value).length + ' stories';
        } catch {
          display = 'Manual story list';
        }
      }
      target.replaceChildren(this.node('span', display));
      if (field.error) target.append(this.node('small', field.error, 'warning'));
      else if (field.required && !field.value)
        target.append(this.node('small', 'Required · no value', 'warning'));
      target
        .closest('tr')
        .classList.toggle(
          'field-warning',
          Boolean(field.error) || (field.required && !field.value)
        );
    }
    const graphic = this.workspace.graphics.find(
        (item) => item.id === this.$('mapping-graphic').value
      ),
      mapped = this.workspace.model.fields.filter((field) => this.workspace.binding(field)).length,
      summary = this.$('graphic-summary');
    summary.replaceChildren();
    for (const [title, value] of [
      ['Rundown item', graphic?.title || ''],
      ['Display slot', graphic?.slot || ''],
      ['Fields mapped', mapped + ' of ' + this.workspace.model.fields.length],
      ['Preview', 'Mapping draft only · no playout']
    ])
      summary.append(this.node('dt', title), this.node('dd', value));
  }
  fitPreview() {
    const frame = this.$('mapping-preview');
    frame.style.transform = `scale(${frame.parentElement.clientWidth / 1920})`;
  }
  setWorksheetLabel(connection, names) {
    const target = this.$('source-context').querySelector('p.hint');
    if (target)
      target.textContent =
        (names[connection.settings.worksheet] || connection.settings.worksheet) +
        ' · ' +
        connection.settings.range;
  }
  dispose() {
    this.endDrag();
    this.resize?.disconnect();
    for (const [name, listener] of this.listeners) document.removeEventListener(name, listener);
    window.removeEventListener('message', this.messageHandler);
    this.$('mapping-preview').onload = null;
  }
};
