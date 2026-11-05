// A story-mapping draft is independent of its dialog and transport.
window.YCSCollectionDraft = class CollectionDraft {
  constructor(schema, connectionId, connection, binding) {
    this.schema = schema;
    this.connectionId = connectionId;
    this.configure(connection, binding);
  }
  static arrays(data) {
    const result = [];
    const walk = (value, pointer, depth) => {
      if (depth > 12 || result.length > 100) return;
      if (Array.isArray(value)) {
        result.push([pointer, pointer || '/ (root array)']);
        return;
      }
      if (value && typeof value === 'object')
        for (const [key, child] of Object.entries(value))
          walk(child, window.YCSDataContract.appendJsonPointer(pointer, key), depth + 1);
    };
    walk(data, '', 0);
    return result;
  }
  static properties(records) {
    const paths = new Set();
    const walk = (value, pointer, depth) => {
      if (depth > 10 || paths.size > 300) return;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const [key, child] of Object.entries(value))
          walk(child, window.YCSDataContract.appendJsonPointer(pointer, key), depth + 1);
      } else if (!Array.isArray(value)) paths.add(pointer);
    };
    for (const item of (Array.isArray(records) ? records : []).slice(0, 200)) walk(item, '', 0);
    return [...paths].map((pointer) => [pointer, pointer || '/ (item value)']);
  }
  configure(connection, binding) {
    const saved = binding?.connection === this.connectionId ? binding.selection : null;
    this.format = window.YCSSourceTypes.isJSON(connection) ? 'json' : 'sheet';
    this.pick = {
      kind: 'collection',
      format: this.format,
      fields: {},
      required: this.schema.fields.filter((field) => field.required).map((field) => field.key)
    };
    this.duplicates = [];
    if (this.format === 'sheet') {
      this.pick.range = saved?.range || connection.settings.range;
      this.pick.headerRow = saved?.headerRow || connection.sheetRange?.headerRow || Number(this.pick.range.match(/\d+/)?.[0]) || 1;
      const headers =
        (connection.rows || []).find(
          (row) => Number(row[0]?.address.match(/\d+$/)?.[0]) === this.pick.headerRow
        ) || [];
      const columns = headers
        .filter((cell) => cell.value?.trim())
        .map((cell) => [cell.value, cell.value]);
      this.duplicates = [
        ...new Set(
          columns
            .filter(([key], index) => columns.findIndex(([other]) => other === key) !== index)
            .map(([key]) => key)
        )
      ];
      this.columns = columns.filter(([key]) => !this.duplicates.includes(key));
    } else {
      this.arrays = CollectionDraft.arrays(connection.data);
      this.pick.pointer = saved?.pointer ?? this.arrays[0]?.[0] ?? '';
      if (saved && !this.arrays.some(([pointer]) => pointer === saved.pointer))
        this.arrays.push([saved.pointer, saved.pointer + ' (missing)']);
      this.columns = CollectionDraft.properties(
        window.YCSDataContract.readJsonPointer(connection.data, this.pick.pointer)
      );
    }
    this.controls = [
      ...this.schema.fields.map((field) => ({ ...field, content: true })),
      {
        key: 'enabled',
        title: 'Published / enabled',
        aliases: ['Published', 'Enabled'],
        empty: 'All stories enabled'
      },
      { key: 'order', title: 'Order', empty: 'Source row / array order' },
      { key: 'id', title: 'Story ID', aliases: ['StoryID', 'ID'], empty: 'Use content identity' }
    ];
    const normal = window.YCSMappingData.normalName;
    for (const field of this.controls) {
      let chosen = field.content ? saved?.fields?.[field.key] : saved?.[field.key];
      if (!saved) {
        const names = [field.key, field.title, ...(field.aliases || [])].map(normal);
        const matches = this.columns.filter(([pointer]) =>
          names.includes(normal(this.format === 'json' ? pointer.split('/').pop() : pointer))
        );
        if (matches.length === 1)
          chosen =
            this.format === 'sheet'
              ? { kind: 'column', name: matches[0][0] }
              : { kind: 'property', pointer: matches[0][0] };
      }
      if (chosen)
        (field.content ? this.pick.fields : this.pick)[field.key] = structuredClone(chosen);
    }
  }
  selected(field) {
    return (field.content ? this.pick.fields : this.pick)[field.key];
  }
  range(value) {
    this.pick.range = value;
  }
  header(value, connection) {
    this.pick.headerRow = Number(value);
    this.configure(connection, this.binding());
  }
  array(pointer, connection) {
    this.pick.pointer = pointer;
    this.configure(connection, this.binding());
  }
  setField(field, { source, text, transform, prefix }) {
    let pick;
    if (source === 'fixed') pick = { kind: 'static', value: text };
    else if (source.startsWith('ref:'))
      pick =
        this.format === 'sheet'
          ? { kind: 'column', name: source.slice(4) }
          : { kind: 'property', pointer: source.slice(4) };
    if (pick && pick.kind !== 'static' && text) pick.fallback = text;
    if (pick && field.content && transform !== 'none')
      pick.transform = { kind: transform, ...(transform === 'prefix' ? { value: prefix } : {}) };
    const target = field.content ? this.pick.fields : this.pick;
    if (pick) target[field.key] = pick;
    else delete target[field.key];
  }
  binding() {
    return { connection: this.connectionId, selection: structuredClone(this.pick) };
  }
};
