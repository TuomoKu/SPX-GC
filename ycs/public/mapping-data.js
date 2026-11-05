// Read-only source presentation helpers. No DOM, requests or draft mutations.
window.YCSMappingData = Object.freeze({
  normalName(text) {
    return String(text)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  },
  equalPick(first, second) {
    if (!first || !second) return false;
    if (first.source || second.source) return first.source === second.source;
    return Boolean(
      first.connection &&
        second.connection &&
        first.connection === second.connection &&
        JSON.stringify(first.selection) === JSON.stringify(second.selection)
    );
  },
  sourceLabel(binding, state) {
    if (!binding) return 'Unmapped';
    if (Object.hasOwn(binding, 'static')) return 'Static value';
    if (binding.source) return state.sources[binding.source]?.label || 'Local value';
    const connection = state.connections[binding.connection],
      pick = binding.selection;
    if (connection?.sheetRange) {
      const metadata = connection.sheetRange, book = state.workbooks?.[metadata.workbook];
      const address = pick.kind === 'cell' ? pick.cell : pick.kind === 'collection' ? pick.range : pick.valueColumn;
      return [book?.label, book?.groups[metadata.group]?.label, connection.label, address].filter(Boolean).join(' › ');
    }
    if (pick.kind === 'collection')
      return `${connection?.label || 'Unavailable source'} › Stories (${pick.format === 'sheet' ? pick.range : pick.pointer || 'root array'})`;
    return `${connection?.label || 'Unavailable source'} › ${pick.kind === 'cell' ? pick.cell : pick.kind === 'json' ? pick.pointer || '/' : pick.valueColumn + ' where ' + pick.keyColumn + ' = ' + pick.keyValue}`;
  },
  leaves({ state, sourceId, tableMode, headerRow, dataRow }) {
    if (sourceId?.startsWith('local:')) {
      const id = sourceId.slice(6);
      return [
        {
          name: state.sources[id]?.label || 'Local value',
          value: state.sources[id]?.value,
          binding: { source: id }
        }
      ];
    }
    const connection = state.connections[sourceId];
    if (!connection) return [];
    if (window.YCSSourceTypes.isJSON(connection)) {
      const result = [];
      const walk = (value, path, depth) => {
        if (result.length >= 1500 || depth > 20) return;
        if (value !== null && typeof value === 'object') {
          for (const [key, child] of Object.entries(value))
            walk(child, window.YCSDataContract.appendJsonPointer(path, key), depth + 1);
        } else
          result.push({
            name: path.split('/').pop() || 'Value',
            path,
            value,
            binding: { connection: sourceId, selection: { kind: 'json', pointer: path } }
          });
      };
      walk(connection.data, '', 0);
      return result;
    }
    const rows = connection.rows || [],
      rowNumber = (cell) => Number(cell?.address.match(/\d+$/)?.[0]);
    const header = headerRow || rowNumber(rows[0]?.[0]) || 1;
    const headers = rows.find((row) => rowNumber(row[0]) === header) || [];
    if (tableMode) {
      const record = rows.find((row) => rowNumber(row[0]) === (dataRow || header + 1)) || [];
      return record.map((cell, index) => ({
        name: headers[index]?.value || cell.address,
        path: cell.address,
        value: cell.value,
        binding: { connection: sourceId, selection: { kind: 'cell', cell: cell.address } }
      }));
    }
    return rows
      .flat()
      .filter((cell) => cell.value !== '')
      .map((cell) => ({
        name: cell.address,
        path: cell.address,
        value: cell.value,
        binding: { connection: sourceId, selection: { kind: 'cell', cell: cell.address } }
      }));
  }
});
