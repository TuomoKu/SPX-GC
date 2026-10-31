(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.YCSRundownSummary = factory();
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  function text(fields, value = field => field.value) {
    return (fields || [])
      .filter(field => field.ftype === 'textfield' && !field.ycsCollection)
      .map(field => String(value(field) ?? '').trim())
      .filter(Boolean).slice(0, 3).join(' | ');
  }
  function description(templatePath, definitions) {
    const matches = (definitions || []).filter(item => item.relpath === templatePath);
    return matches.length === 1 ? String(matches[0].description ?? '') : '';
  }
  return { text, description };
});
