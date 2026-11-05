'use strict';
const { validJsonPointer, readJsonPointer } = require('./data-contract.cjs');
const { parseRange, usable } = require('./public-sheets.cjs');
function fail(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}
function selection(input, settings) {
  if (input?.kind === 'collection')
    return require('./collections.cjs').normalizeSelection(input, settings);
  if (input?.kind === 'json') {
    if (!validJsonPointer(input.pointer)) fail('Select a JSON property');
    return { kind: 'json', pointer: input.pointer };
  }
  if (input?.kind === 'cell') {
    const cell = parseRange(input.cell),
      range = parseRange(settings.range);
    if (
      cell.firstRow !== cell.lastRow ||
      cell.firstColumn !== cell.lastColumn ||
      cell.firstRow < range.firstRow ||
      cell.lastRow > range.lastRow ||
      cell.firstColumn < range.firstColumn ||
      cell.lastColumn > range.lastColumn
    )
      fail('Choose a cell inside the connection range');
    return { kind: 'cell', cell: cell.a1 };
  }
  if (
    input?.kind !== 'row' ||
    !['keyColumn', 'keyValue', 'valueColumn'].every(
      (key) => typeof input[key] === 'string' && input[key].trim() && input[key].length <= 300
    )
  )
    fail('Choose a key column, row value and value column');
  const range = parseRange(settings.range),
    headerRow = Number(input.headerRow || range.firstRow);
  if (!Number.isInteger(headerRow) || headerRow < range.firstRow || headerRow >= range.lastRow)
    fail('The header row must be inside the connection range, before its data rows');
  return {
    kind: 'row',
    headerRow,
    keyColumn: input.keyColumn,
    keyValue: input.keyValue,
    valueColumn: input.valueColumn
  };
}
function resolve(rows, pick) {
  if (pick.kind === 'json') {
    const value = readJsonPointer(rows, pick.pointer);
    if (value === undefined) throw new Error('JSON property is missing');
    if (
      value === null ||
      value === undefined ||
      typeof value === 'object' ||
      !usable(String(value))
    )
      throw new Error('Select a nonempty text, number or boolean value');
    return String(value);
  }
  if (!Array.isArray(rows)) throw new Error('Waiting for the first successful read');
  let cell;
  if (pick.kind === 'cell') cell = rows.flat().find((cell) => cell.address === pick.cell);
  else {
    const headers = rows.find((row) =>
      row.some((cell) => Number(cell.address.match(/\d+$/)?.[0]) === pick.headerRow)
    );
    if (!headers) throw new Error('Header row is missing');
    const column = (name) => {
      const matches = headers
        .map((cell, index) => (cell.value === name ? index : -1))
        .filter((index) => index >= 0);
      if (matches.length !== 1) throw new Error('Column is missing or duplicated: ' + name);
      return matches[0];
    };
    const key = column(pick.keyColumn),
      value = column(pick.valueColumn);
    const matches = rows.filter(
      (row) =>
        Number(row[0]?.address.match(/\d+$/)?.[0]) > pick.headerRow &&
        row[key]?.value === pick.keyValue
    );
    if (matches.length !== 1)
      throw new Error(
        matches.length ? 'More than one row matches this key' : 'No row matches this key'
      );
    cell = matches[0][value];
  }
  if (!cell || !usable(cell.value) || cell.usable === false)
    throw new Error('Selected value is empty or exceeds 300 characters');
  return cell.value;
}
function transform(value, input) {
  const kind = input?.kind || 'none',
    text = String(value);
  if (kind === 'none') return text;
  if (kind === 'uppercase') return text.toUpperCase();
  if (kind === 'lowercase') return text.toLowerCase();
  if (kind === 'trim') return text.trim();
  if (kind === 'prefix') return input.value + text;
  if (kind === 'completed-game') {
    // A game count of wins + 1 is one past the game that just ended. It is 1 before any
    // result is in, when game 1 is the only game a winner could be shown for.
    const count = Number(text);
    if (!text.trim() || !Number.isInteger(count)) throw new Error('Expected a whole game count');
    return String(Math.max(1, count - 1));
  }
  throw new Error('Unsupported transform');
}
function normalizeTransform(input) {
  if (!input || input.kind === 'none') return undefined;
  if (!['uppercase', 'lowercase', 'trim', 'prefix', 'completed-game'].includes(input.kind))
    fail('Unsupported transform');
  if (input.kind === 'prefix' && (typeof input.value !== 'string' || input.value.length > 200))
    fail('Enter a prefix up to 200 characters');
  return { kind: input.kind, ...(input.kind === 'prefix' ? { value: input.value } : {}) };
}
module.exports = { selection, resolve, transform, normalizeTransform };
