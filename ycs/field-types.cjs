'use strict';
const { checkboxValue, finiteNumber } = require('./data-contract.cjs');
const { schema, normalizeValue } = require('./collections.cjs');
const types = {
  textfield: 'Text',
  textarea: 'Text',
  number: 'Number',
  checkbox: 'Boolean',
  dropdown: 'Choice',
  filelist: 'Image / file',
  color: 'Colour'
};
function linkable(item, field) {
  return item.DataFields.some((def) => def.field === field && Object.hasOwn(types, def.ftype));
}
function normalizeField(field, value, { manual = false } = {}) {
  if (schema(field)) return normalizeValue(field, value);
  if (value === undefined || value === null || typeof value === 'object')
    throw new Error('Select a single compatible value');
  const text = String(value);
  const limit = manual && field.ftype === 'textarea' ? 65536 : 300;
  if (text.length > limit) throw new Error('Value exceeds ' + limit + ' characters');
  if (field.required === true && !text.trim()) throw new Error('A value is required');
  if (field.ftype === 'number') {
    const number = finiteNumber(text);
    if (field.min !== undefined && Number.isFinite(Number(field.min)) && number < Number(field.min))
      throw new Error('Minimum value is ' + field.min);
    if (field.max !== undefined && Number.isFinite(Number(field.max)) && number > Number(field.max))
      throw new Error('Maximum value is ' + field.max);
    return String(number);
  }
  if (field.ftype === 'checkbox') {
    return checkboxValue(value);
  }
  if (field.ftype === 'color' && !/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(text))
    throw new Error('Expected a hex colour');
  if (field.ftype === 'filelist' && /^\s*(?:javascript|data|vbscript):/i.test(text))
    throw new Error('Unsupported asset URL');
  if (
    field.ftype === 'dropdown' &&
    Array.isArray(field.items) &&
    !field.items.some((item) => String(item.value ?? item.text ?? item) === text)
  )
    throw new Error('Value is not in the template choices');
  return text;
}
// A source sends '' for a value it does not have. Number and checkbox fields show that as
// blank and unticked although they reject blank when typed. Dropdown, colour and required
// fields still refuse it, so they keep their last value and the graphic is not rejected.
function normalizeLinked(field, value) {
  if (value === '' && !schema(field) && field.required !== true) {
    if (field.ftype === 'number') return '';
    if (field.ftype === 'checkbox') return '0';
  }
  return normalizeField(field, value);
}
module.exports = { types, linkable, normalizeField, normalizeLinked };
