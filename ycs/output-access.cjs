'use strict';
const identifier = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,95}$/;
function scope(stage, mode) {
  return typeof stage === 'string' &&
    identifier.test(stage) &&
    ['program', 'preview'].includes(mode)
    ? stage + ':' + mode
    : null;
}
function grant(request, stage, mode) {
  const key = scope(stage, mode);
  if (!request.session || !key) return;
  request.session.ycsOutputs = [...new Set([...(request.session.ycsOutputs || []), key])].slice(
    -40
  );
}
// SPX CheckLogin stores the configured user, or 'default' when login is off.
function operator(request, config) {
  const user = request.session?.user;
  return Boolean(user) && user === (config.general.username || 'default');
}
function allowed(request, config, stage, mode) {
  const key = scope(stage, mode);
  return Boolean(operator(request, config) && key && request.session?.ycsOutputs?.includes(key));
}
module.exports = { scope, grant, allowed, operator };
