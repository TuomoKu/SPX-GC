module.exports = {
  apps : [
    {
    'name': 'GC1',
    'script': 'server.js',
    'args': 'config.json'
    },
    {
      'name': 'GC2',
      'script': 'server.js',
      'args': 'config2.json'
      }
  ]
};
