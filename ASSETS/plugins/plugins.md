# SPX-GC plugins
> From v.1.0.10 onwards.

---

Each subfolder in `/ASSETS/plugins` -folder is a considered a plugin. Plugins are injected to client side using `<script>` tags.

## Naming conventions
- **folder name** is the name of the plugin, such as `spxSocial`
- folders starting with an underscore are not loaded (ext `_spxSocialOldVersion`)
- Each folder must contain at least
  - `init.js` (see existing files for reference)
  - `files` subfolder for html, js, css

## Plugin hooks in SPX-GC
The following views will load plugins from here.
- 1.0.10 Controller

