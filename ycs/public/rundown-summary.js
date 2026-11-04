(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.YCSRundownSummary = factory();
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  function text(fields, value = field => field.value) {
    return (fields || [])
      .filter(field => field.ftype === 'textfield' && !field.ycsCollection)
      .filter(field => !/(?:image|logo|flag|artwork|background|url|path)/i.test(field.title || ''))
      .map(field => String(value(field) ?? '').trim())
      .filter(value => value && !/^(?:https?:|file:|[a-z]:[\\/]|\\\\|\.{1,2}[\\/]|\/)/i.test(value) && !/\.(?:png|jpe?g|webp|gif|svg|avif)(?:[?#].*)?$/i.test(value))
      .slice(0, 3).join(' · ');
  }
  function description(templatePath, definitions) {
    const matches = (definitions || []).filter(item => item.relpath === templatePath);
    return matches.length === 1 ? String(matches[0].description ?? '') : '';
  }
  return { text, description };
});
