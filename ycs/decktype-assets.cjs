'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');

// A flat, read-only PNG namespace. Folder order defines duplicate precedence.
module.exports = function registerDecktypeAssets(app, folders = []) {
  if (!Array.isArray(folders) || folders.some(folder => typeof folder !== 'string' || !folder.trim()))
    throw new TypeError('ycs.decktypeFolders must be an array of folder paths');
  const roots = folders.map(folder => path.resolve(folder));
  app.get('/decktypes/:file', async (req, res) => {
    const file = req.params.file;
    res.set('Cache-Control', 'no-cache');
    if (file.length > 244 || !/\.png$/i.test(file) || file.startsWith('.') ||
        /[<>:"/\\|?*\u0000-\u001f\u007f]/.test(file) || file.length <= 4) {
      return res.status(400).end();
    }
    for (const root of roots) {
      try {
        const resolvedRoot = await fs.realpath(root);
        const resolvedFile = await fs.realpath(path.join(resolvedRoot, file));
        const relative = path.relative(resolvedRoot, resolvedFile);
        // Resolve symlinks before serving; a shortcut cannot expose another folder.
        if (relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) continue;
        if (!(await fs.stat(resolvedFile)).isFile()) continue;
        // Serve relative to the folder: dotfiles checks then cover only the file's
        // own name, so a folder such as .local\decktypes still works.
        return res.sendFile(relative, { root: resolvedRoot, dotfiles: 'deny', cacheControl: false }, error => {
          if (error && !res.headersSent && !res.destroyed) res.status(error.status || 503).end();
        });
      } catch {
        // An unavailable drive or missing file must not prevent lower-priority matches.
      }
    }
    res.set('Cache-Control', 'no-store').status(404).end();
  });
};
