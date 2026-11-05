'use strict';

// No-login operators must open an operator page. Output pages never grant this.
function grant(request) {
  if (request.session) request.session.ycsOperator = true;
}
function allowed(request, config) {
  const user = request.session?.user;
  return Boolean(config.general.username
    ? user === config.general.username
    : user === 'default' && request.session?.ycsOperator === true);
}
module.exports = { grant, allowed };
