# YCS SPX: stage playback and public Google Sheets linking

For repeatable Windows setup, template-picker connections, LAN access and release
checks, see [installation instructions](ycs/INSTALLATION.md).

## Grouped spreadsheet sources

Sources → Add spreadsheet creates one source for a Google spreadsheet URL. Add
named groups, then named ranges inside each group. A group has a default worksheet;
each range can choose another worksheet. Add/Edit range uses the existing worksheet
selector and visual cell-range picker. Groups and ranges have stable IDs, so renaming
them does not change saved mappings. In-use range targets cannot be moved or deleted.

Refresh interval belongs to the spreadsheet source and accepts any finite positive
number of seconds, including fractions. There is no five-second minimum or one-hour
maximum. The scheduler checks grouped sources every 100 ms; actual refresh cadence
also depends on request duration and error backoff. No overlapping refresh runs are
started for the same spreadsheet. With the Google Sheets API reader, all due ranges
are submitted together and batches contain at most 32 reads. Tabs in the same
spreadsheet share a batch. The public query compatibility reader still makes its
separate range/header requests; batching requires enabling the API reader.

The spreadsheet summary shows Last sync (the last successful refresh of all its
ranges) and Requests/min (actual outbound requests for that spreadsheet during the
last 60 seconds, including metadata, test/picker reads and failed requests). The
counter resets when the server restarts. Failed reads preserve last valid values.

The existing three-panel Mappings view now has Source → Group → Named range in
the source panel. Groups matching the selected output's stage are preferred, and
the last chosen range is remembered per group for the current page session. Source
options show green Google Sheets icons or gray JSON/CSV icons, including keyboard
navigation in the custom source selector. Existing local values, JSON, CSV and
ungrouped legacy connections remain available.

A named range can enable Use header labels, choose its header row and default data
row, and still use the raw cell browser when needed. Header browsing displays the
column label with the selected row's value; bindings continue to use the value cell's
absolute address. For example CUSTOM / FALSE maps to C2, not header cell C1. Story
mapping starts with the named range's configured header row and retains its existing
collection controls. No new header setting is inferred for existing source entries.

This feature adds workbook/group metadata to the existing version-2 data document;
named ranges remain normal range connections internally. It does not migrate or
delete existing experimental connections. Use Add spreadsheet for the grouped flow.

This is a fork of [TuomoKu/SPX-GC](https://github.com/TuomoKu/SPX-GC), based on upstream commit `8bb7ec4e7b969fe7c777d2c2a9b03ed6de3f6981`. The upstream MIT license and notices are retained.

The initial implementation keeps SPX's normal rundown editor and HTML template lifecycle. An optional `ycs` module gives each stage its own program composition and independent preview. Multiple graphics can play together using named display slots. Commands target a stage and graphic ID, independent of controller focus.

## Development setup

### Runtime correctness fixes

Output pages grant their authenticated browser session read access only to the opened stage/mode and its health reports. In the default no-login mode this uses SPX's default session, allowing remote output windows without exposing a command token. Viewer sockets cannot subscribe to another output or controller-focus events, and output grants do not authorize data or playout APIs. Operator/API authorization, origin checks and network binding are unchanged. Reconnect failures renew only the output page session, retaining frames across an in-memory session reset.

The compositor uses independent per-slot workers. Stop/replacement/restart cancels pending mounts before a stale Play can run; active data updates remain serial and preserve their iframe. New frames stay hidden until initial data is ready. A failed slot retains its previous graphic, reports the error, and receives at most three automatic retries (250 ms, 1 s, 3 s) before awaiting another snapshot. Other slots continue; Stop cancels retries. Shutdown aborts pending work and releases frames/timers.

Duplicating from a configured stage waits for the saved copy, fetches fresh native markup, and initializes its editor model, link/nickname handlers and Companion URLs. Original field drafts remain in place; there is no full-page reload or playout. Duplicate-save failures add no unusable row, while a saved copy that fails to load produces an explicit reload message.

Output renderer IDs support ordinary LAN HTTP origins where `crypto.randomUUID` is unavailable. This does not change network binding, authentication, or the need for a later venue/vMix rehearsal.

Editor revisions advance only when saved field values or manual/linked settings change. Companion Play/Stop/Toggle/Update using saved values leaves an open editor valid. Real competing content edits still return 409; preview never advances the saved editor revision.

Mapping drafts carry their stage and graphic identity. Loading another selection disables mapping edits and Save until its model arrives; late responses cannot replace a newer selection or redirect a save. Drafts remain available when returning to their original graphic.

Manual fields and link fallbacks are validated before persistence or playout, including finite numbers, declared numeric bounds, checkbox values, choices, colours, asset URL schemes, text limits and story schemas. Invalid requests return 422 with `fields` errors for the rundown editor, while retaining saved data and program. Manual ordinary textareas retain their existing 64 KB allowance; linked scalar values remain limited to 300 characters.

Unsaved mapping previews resolve selectors without retaining bindings or updating last-good caches. Unused registered references expire after a 60-second grace period. Saved mappings/defaults, legacy source aliases, program, selected preview and pending disk-write descriptors retain their bindings; replacing a mapping still leaves the previous on-air selector live until an explicit Update/Play/Stop.

### Template settings preservation

Saving a template in Project Settings updates only the fields owned by that form. Other imported metadata, including display slots, preview-on-edit policy, steps, OGraf properties and custom extension properties, stays intact. Submitted unknown properties cannot replace that metadata. Existing rundown items are not rewritten by a template-settings save; new items inherit the preserved project definition. Previously lost properties require a separate, backed-up repair from a known-good definition; this save fix does not guess missing values.

### One shared ticker template

All newly generated stage rundowns use `/ycs/ticker/ticker.html`. Each output still mounts its own iframe and commits its own fields and data bindings. The shared ticker loads neutral defaults only, with no broadcast identity, instance registry or stage-specific JSON fetch. Old saved hidden `f0` values remain compatibility metadata and cannot route or select another instance. Numbered entry points have been removed.

Numbered ticker templates and their instance data have been retired. Use the shared ticker.html entry point. The current test shows have no hidden broadcast identity field.

### Companion controls

Use GET `/api/PROJECT/RUNDOWN/ITEM_ID/ACTION`; POST at the identical URL with an empty JSON body remains supported. In each item's compact Companion row, select an action and use the same copy icon as the output controls. Actions include Focus (`focus`), Play, Stop, Toggle, Update, Preview and Continue. Copying never sends a command. No button generators, downloads or import profiles are provided.

GET and POST share authorization and saved-data playback. Responses use no-store; HEAD and other methods cannot execute commands. Project/rundown targets resolve to their configured output. Unknown targets return 404 and ambiguous configurations return 409. Existing stage routes remain for native editor/data/output internals and compatibility. Focus atomically prepares saved values/current mappings in Preview and highlights the item in open matching controllers, leaving Program and saved files unchanged. `/select` remains a compatibility alias. Unsaved local editor values are preserved; pending automatic preview timers are cancelled so they do not replace the focused saved preview. Preview alone remains available without changing controller focus. Play/Update/Toggle use saved data and current mappings; unsaved drafts stay local. See [COMPANION.md](ycs/COMPANION.md) for manual Companion setup and LAN authorization.

### Single-computer Orlando rehearsal

From this checkout, run `node ycs/rehearsal.cjs` (or `npm run ycs:rehearsal`) and open **http://127.0.0.1:5661/rehearsal**. No Stream Deck or vMix installation is required. The separate loopback-only process uses the actual ticker templates from the sibling graphics checkout and the existing test lower third. It creates a fresh disposable show under `.local/rehearsals/run-*`; it never reads the development/production configuration, rundowns, real sheet URLs or saved mappings. It adds no routes to the normal SPX server. Port 5660 is explicitly rejected, and occupied ports are not taken over. Optional arguments are `--port 5662` and `--graphics ABSOLUTE_TICKER_FOLDER`.

All three 1920×1080 outputs are scaled into the rehearsal monitor, while their real output URLs remain full resolution. **Run playback checks** exercises stage-specific round values; simultaneous ticker/lower-third slots; manual preview/save versus Update; restoring linked mode; mapped Sheet-range and JSON-array lists with Published/Order/ID and text transforms; held lists during a source outage; output reloads; transport reconnects; and stage-only Stop. It checks the actual output frames as well as API state, including absence of bundled sample stories before the first Play. The three-stage data feeds are deterministic offline adapters; this does not contact Google or an external API, or measure their response latency.

After playback checks, **Test server restart** stops and replaces the rehearsal worker process on the same port while keeping the browser outputs open. The supervisor retains the disposable show's files; the outputs must reconnect and become stopped, with saved mappings/source values retained. Ordinary transport interruption holds graphics until the authoritative snapshot returns, and does not replay Play. Revision comparisons reset on a fresh WebSocket connection so a new server's revision zero can clear a retained composition. **Stop all test outputs** and per-stage controls operate only on the rehearsal show. Ctrl+C in the launcher terminal stops its worker. Closing the browser does not stop the rehearsal process. Each new launcher invocation creates another disposable show; the normal runtime launcher/process record is untouched.

These checks do not replace a later venue LAN, three-PC/vMix, browser performance or physical control-surface rehearsal. The lower third is a test graphic, not an approved broadcast design. Use the normal stage controller and production output URLs for the event.

Use a current Node.js LTS release. Keep the repositories side by side:

```text
GitHub/
  ycs-graphics/       templates and assets
  ycs-spx/           this controller fork
```

From this repository:

```powershell
npm ci
npm run ycs:demo
node server.js .local/ycs-dev.json
```

If the graphics repository is elsewhere, run `node ycs/setup-demo.cjs ABSOLUTE_PATH_TO_GRAPHICS_TICKER_FOLDER` instead of `npm run ycs:demo`. Setup never copies or edits the graphics repository: Express serves its ticker files from the configured `ycs.graphicsRoot`. Generated configuration and rundown data stay in ignored `.local/`. Rerunning setup preserves existing local data/configuration.

Windows convenience scripts are `ycs/start-dev.ps1` and `ycs/stop-dev.ps1`. Pass `-NodePath` if Node is not on PATH. The start script launches a hidden process and waits for a successful HTTP response.

The development server uses **127.0.0.1:5660**. It does not replace the installed SPX or the earlier linking pilot on ports 5656/5657.

| Stage | Controller | Transparent output | Preview |
|---|---|---|---|
| Stage 1 | `/gc/YCS-Stage-1/Show` | `/output/stage-1/program` | `/output/stage-1/preview` |
| Stage 2 | `/gc/YCS-Stage-2/Show` | `/output/stage-2/program` | `/output/stage-2/preview` |
| Stage 3 | `/gc/YCS-Stage-3/Show` | `/output/stage-3/program` | `/output/stage-3/preview` |

Open a controller URL with the base address `http://127.0.0.1:5660`. Select the ticker and press Play, then select the lower third and press Play. Both remain active. Other stages are independent, including their selected-item previews. The lower third is an intentionally simple test graphic, not a finished broadcast design.

Native Save changes the stage's saved fields. Typing previews pending values; Update commits them to an active program graphic. Updating a stopped graphic saves its data without putting it on air. STOP THIS STAGE clears only that stage. Configured stage playout/save requests bypass upstream's shared rundown cache. Legacy projects outside the configured stage list retain upstream behavior.

## Visual mapping workspace

The Mappings tab uses a three-panel layout: rundown graphics on the left, a real template monitor and field table in the middle, and browsable source values on the right. Project and rundown selectors use the configured SPX stage/project/rundown identities. Existing demo configuration has one SPX project per stage; the selectors do not invent production data or automatically register other SPX projects. Register additional outputs/rundowns under `ycs.stages` to include them. Connection definitions can optionally belong to one configured project; unscoped existing connections remain Shared. Project-specific connections are filtered in the browser and rejected by server mapping validation in another project.

Select a field and click a source value, or drag a source card onto its field row. **Browse cells** exposes the complete saved sheet range, including empty cells; any sheet layout works. **Use a table row** optionally exposes columns from a selected header/data row. **Auto-map by name** fills only currently unmapped fields with a unique exact normalized field-name/header/property match. It does not guess semantic aliases or overwrite existing links. JSON responses appear as expandable property groups; array indexes and escaped object keys are stored as generated [JSON Pointer](https://www.rfc-editor.org/rfc/rfc6901) references.

Each field row has Unmapped, Static value or a selected source binding, a transform, and the server-resolved preview value. Available transforms are None, Uppercase, Lowercase, Trim and Prefix text/media path. Numbers, checkboxes, text, textarea, choices, hex colours and image/file fields retain their native SPX string representations with type validation. Incompatible live values retain the existing on-air field value; mapping preview shows the manual fallback and reason. Hidden identity is protected. Object/array-to-collection mapping, schema transforms and media importing are not implemented; select a scalar JSON property or an individual array element property.

The monitor is an isolated classic-SPX iframe with its own update/play lifecycle. Mapping preview has no output subscription, renderer health report or playout command. Changes update that monitor without replaying its animation. **Save mapping** writes only the selected graphic's changed bindings with the loaded revision. **Revert** reloads that selected graphic. Unsaved drafts are retained separately when switching graphics, projects or rundowns within the page; background polling never advances their configuration revision. A successful save made by this page advances other drafts only when they share that exact prior revision, since the page knows precisely which source or graphic it changed; unrelated concurrent edits still conflict. They are not persisted across page reloads. The rundown's manual/linked modes and explicit Play/Update remain authoritative for program.

Reusable template defaults and row lookup remain under Advanced mapping options. A default belongs to the configured stage/rundown output and template; it does not change every production automatically.

## JSON API connections

Choose JSON API in Add connection, enter a public HTTPS JSON endpoint and refresh interval, optionally assign its project, then Test and Save. The server performs read-only GET requests, requires HTTP 200 with JSON content, follows no redirects and bounds responses to 1 MB with an eight-second timeout. Public DNS addresses are validated in the actual request lookup; loopback/private/link-local hosts and embedded credentials are rejected. LAN API support requires a separately designed explicit host configuration; this connector currently accepts public APIs only.

Optional Bearer authentication uses an environment-variable reference beginning `YCS_DATA_`, such as `YCS_DATA_TOURNAMENT_TOKEN`. Set the variable before starting the server; the saved document/browser receives the variable name, never the token. No credential is embedded in a template. OAuth flows, custom headers and token refresh are not included. A source is polled once for all its fields with the same backoff, pinned bindings and restart caching as Sheets. API test does not create a source or change program.

Additional routes: `POST /api/ycs/data/json/test` accepts `{settings:{url,refreshSeconds,tokenEnv?}}`; `/data/connections` accepts optional `type:'json-api'` and `project`. Field bindings also support `{static:'value',transform?}` or `{connection,selection:{kind:'json',pointer:'/event/name'},transform?}`. A transform is `{kind:'uppercase'|'lowercase'|'trim'}` or `{kind:'prefix',value:'media/guests/'}`. `POST /api/ycs/data/mappings/:stage/:graphic/preview` resolves unsaved edits into a graphic descriptor and field statuses without saving or modifying either stage composition.

## Data Manager and rundown workflow

Open **Data Manager** from any stage panel. It has two views:

- **Sources:** one connection per public Google Sheets range. Cards show health, last successful read, refresh interval and field references. Add/Edit opens a tested connection form with a read-only data preview. Local test values are tucked under a disclosure.
- **Mappings:** select a stage and graphic, then map any ordinary text field. Choose a connection and either a **fixed cell** or a **row key**. For example, use header row `1`, key column `Stage`, row key `STAGE 1`, and value column `Round`. Rearranging the stage rows does not change which stage is selected. Duplicate headers, duplicate keys, missing rows and empty/oversized values retain the last valid field value and show a warning.

Choose **This graphic** for a specific item or **Template default for this stage** to reuse a mapping in other copies of that template on the same stage. **Use template default** removes the graphic override. An explicit Unassigned override keeps that field manual-only even when a default exists. A default does not automatically enable linked mode: each rundown field still has its own chain button. Existing explicit mappings take precedence over new defaults.

Mapping edits save together with an expected document revision. Background polling never replaces an unsaved mapping form or silently advances its revision. If another operator saves first, reload the saved mappings and reapply your edits. A connection editor similarly rejects stale saves.

In the rundown, ordinary content fields have visible labels and a chain button. Hidden broadcast identity stays hidden. The ticker explicitly groups speed, timing, artwork and advanced JSON overrides under **Appearance & timing**. **Manage field mappings** opens Data Manager with this stage and graphic already selected.

1. Type a manual value or click a field's chain to use its assigned data. A linked field is read-only; clicking again restores its saved manual text.
2. Inspect **Preview**. Typing or toggling links does not change program.
3. **Save draft** persists field values and link modes without changing program. A pending badge identifies differences from an active graphic.
4. **Play** or **Update on air** commits the draft and its current field mappings. Later successful source reads update committed linked fields automatically, preserving the ticker iframe and crawl animation.

A mapping change does not rebind an active graphic until Update/Play. Its previous committed selector keeps receiving live data in the meantime. Renaming a connection or changing its interval is allowed while used. Changing its sheet, tab or range is blocked while saved/default/on-air references exist: create a new connection and remap the fields instead. Remove is disabled until saved/default references are unassigned and on-air linked graphics are stopped. No connection deletion writes to Google Sheets.

Native field types are supported, including the ticker's round, status, day/date, location and rounds-remaining text, and lower-third name/title. Checkboxes, numbers, image/file fields and choices can also be linked. Private Sheets, collection mapping and advanced transforms remain future extensions.

## YCS SPX settings page

Open **Data Manager → Settings**, or `/ycs/settings`, on the SPX computer. This page manages the custom settings without hand-editing JSON:

- Google Sheets reader (public query connector or official API), server API key and a public-sheet connection test.
- Ordered decktype image folders and the optional graphics development source folder.
- A read-only list of configured outputs/projects/rundowns and slot names. Output creation/routing is unchanged.
- Save/Revert, a restart-required indicator and **Restart server**.

Changes are saved to the active configuration and apply after restart. YCS settings, stock configuration forms, authentication settings, CasparCG enable/disable and recent-rundown updates share one transaction queue. Each patch reads the latest file inside that queue; atomic replacement retries transient Windows sharing errors. This queue covers server configuration, not rundown editing. Other configuration properties and mappings are retained. Conflicting saves require Reload/Revert; the page keeps an unsuccessful draft. Remote computers can follow the link but cannot read/change these server settings: open it locally on the SPX machine. Normal operator/API authorization and same-origin protections also apply.

A damaged or unreadable saved key is reported on this page without preventing SPX startup. Replace it here, or switch to the public query connector and remove it. Until repaired, official-API connections retain their last valid values; the transport does not silently change.

The Google API key can now be entered on this page. It is stored in `<active-config-file>.sheets-key.json`, outside the static web folders, with restrictive permissions where the filesystem supports them. It is not encrypted; keep access to the server account/folder restricted. The key is never returned by settings responses, and its file is excluded from Git and event exports. Existing environment credentials take precedence; the page shows their status without revealing them. Leaving the field blank keeps the saved key; **Remove saved key** deletes its value. Testing an entered key does not save it or change the running reader. Enable Google Sheets API in the key's Cloud project and keep the sheet publicly viewable. Configure the key again on the event server.

**Restart** is available for a Windows server started with the included launcher (`ycs/start-runtime.ps1`, including event launchers that call it). The hidden helper must acknowledge readiness over IPC before it receives permission to stop SPX. Missing helpers, readiness timeouts and early helper exits release the playback lock automatically while the original server is alive. It uses a detached, hidden helper to verify the recorded process identity, stop only that process and start it again with the same configuration and Node executable. It requires confirmation and refuses while any custom output has Program graphics active. Playback commands are locked while restart is pending, so an operator cannot start a graphic between the check and shutdown. Preview/output connections briefly disconnect; the settings page waits for a new server instance. Program starts stopped. A startup failure is shown on the page when possible; otherwise use the launcher and inspect `.local/runtime-logs`.

Servers started directly with `node server.js`, via an unrelated supervisor, or on non-Windows platforms show Restart as unavailable. No generic kill/respawn endpoint is exposed. Settings requests are read-only until Save/Test/Restart is explicitly pressed. Unsaved changes block Restart and prompt before leaving the page.


## Google Sheets API v1 (public sheets)

The official Sheets API is an optional server-side reader. Existing Google Sheets connections, worksheet gids, ranges, field bindings, ticker lists, manual overrides and last-good caches stay unchanged. No remapping or operator Google sign-in is needed. Without this configuration, the existing public query connector remains active.

1. In a Google Cloud project, enable **Google Sheets API** and create an API key. Restrict the key to Google Sheets API; an IP restriction must use this server's public outbound IP (not its LAN address). The spreadsheet must still be shared **Anyone with the link → Viewer**. Private sheets/OAuth are outside v1.
2. Set `YCS_GOOGLE_SHEETS_API_KEY` in the environment of the SPX server process. For a persistent Windows user variable, use Windows **Edit environment variables for your account**. Then reopen the launcher/terminal so the new process inherits it. Do not put the key in template fields, connection settings, the repository, or browser JavaScript.
3. Add this property inside `ycs` in the server's active configuration (development: `.local/ycs-dev.json`), then restart SPX:

   ```json
   "sheetsAPI": {
     "enabled": true,
     "keyEnv": "YCS_GOOGLE_SHEETS_API_KEY"
   }
   ```

If neither the environment variable nor a saved server key is available, API connection reads show a configuration error while SPX and its settings page remain available. API failures do not silently switch transports: connection cards show the error and linked graphics retain last-good values. Set `enabled` to `false` and restart to return to the compatibility reader. This switch does not change saved connections or mappings. Real keys are not included in event packages; configure the environment again on the event server.

**Runtime:** Due Google Sheets connections are scheduled in groups of up to 32. Reads queued together for the same spreadsheet use `spreadsheets.values.batchGet`, with duplicate identical ranges requested once. Different spreadsheets use separate requests; connections with different refresh intervals only join a batch when due together. This is not a full-workbook download or a guarantee of one request per workbook per interval. At most four Google HTTP requests run simultaneously. Worksheet ids/titles come from `spreadsheets.get`, cached for five minutes; the worksheet picker refreshes that metadata. A renamed tab selected by gid recovers after metadata refresh (an invalid-range response clears its cache for the next attempt).

Cells use formatted values, preserving displayed dates/numbers. Native checkbox booleans become `TRUE`/`FALSE`; mixed text/numeric columns retain their headers without extra header-row requests. Ragged/empty responses are padded to the requested addresses. Existing 200×32 range limits, 5–3600 second intervals, single-cell validation, backoff and restart cache behavior still apply. Each HTTP request has an eight-second timeout and an 8 MB response cap; first use normally needs one metadata request plus one values request. Requests are read-only, sent only to `sheets.googleapis.com`, without cookies or redirects. Keys travel in a request header, and upstream error bodies are not forwarded to clients.

V1 uses polling, not subscriptions. One failing batch retains previous data for all its ranges until a successful retry; use valid, bounded ranges. API request quotas still apply across all servers using the same Cloud project. Live verification requires your own enabled project/key; mocked transport tests cover batching, mapping compatibility, outage retention and worksheet discovery.

Official references: [batchGet](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/batchGet), [API credentials](https://developers.google.com/workspace/guides/create-credentials), [quotas](https://developers.google.com/workspace/sheets/api/limits).


## Public Google Sheets runtime (compatibility connector)

The connector uses Google's documented [public spreadsheet query endpoint](https://developers.google.com/chart/interactive/docs/spreadsheets). Share the original sheet as **Anyone with the link → Viewer**; no Google sign-in, API key or service account is required. The server only reads it.

In Sources, add a connection name, the original `https://docs.google.com/spreadsheets/d/.../edit` sharing URL, an optional worksheet name/numeric gid and an A1 range. The URL's `gid` selects its tab when Worksheet is blank. Ranges are bounded to **200 rows × 32 columns**; the form previews the first ten rows/eight columns. Google Sheets refresh intervals accept **any finite positive number of seconds**. Test before saving; editing the target invalidates the test. The save re-reads the range rather than trusting browser preview data.

The **Worksheet** dropdown loads actual tab names from the public sheet when the URL is entered or a connection is opened. The URL's gid selects the matching tab. Use the refresh button to reload the list. **Enter a tab name or gid…** provides a manual fallback if discovery is unavailable. Discovery reads bounded public HTML metadata, parses only tab-name/gid scalar descriptors, and never evaluates its scripts or follows embedded links. This is a compatibility parser for Google's public viewer, not the authenticated Sheets API; a Google markup change can make discovery unavailable while manual tab selection and normal data reads continue working.

The grid button next to **Data range** opens a read-only **Select data range** dialog. Drag from one cell to another (in either direction), or use Shift + arrow keys, to select a rectangle. **Use range** copies the A1 selection into the connection draft and invalidates its previous connection test; **Cancel** and Escape leave the form untouched. Test and Save still happen in the parent form. No picker action saves configuration, edits the sheet or sends playout commands.

The picker initially loads a bounded neighborhood containing the current selection, usually 100 rows × 26 columns. Sticky row/column headers, scrolling and drag-edge auto-scroll support larger selections. Edit **Preview window** or use row/column navigation buttons to browse farther; each window and saved selection is limited to 200 rows × 32 columns. Empty cells are selectable, allowing a range to include future rows. Existing in-use connection targets remain locked; create another connection to change the sheet, tab or range.

One background read refreshes the connection's dataset for all mapped fields and stages. At most four scheduled reads run together; concurrent refresh requests for a connection are coalesced. Requests time out after eight seconds and failed reads back off up to one hour. Google may cache responses, so last read is not the cell's modification time and the interval does not guarantee instantaneous updates. Cell values use formatted text and must be nonempty and at most 300 characters.

The server loads saved configuration and starts polling without a Data Manager or rundown browser open. `.local/ycs-data.json` (or `ycs.dataFile`) stores version 2 connections, local/legacy sources, stage/graphic mappings and stage/template defaults. Atomic saves advance `revision`; manual external edits must also advance it. Missing/invalid JSON retains the last valid configuration and blocks further saves until repaired.

Version 1 cell sources migrate automatically: identical connection settings are combined, original source IDs and cell selections are preserved, and an exact `.v1-backup.json` is written before migration. Existing mapped cells become direct field selections. Unused original cell aliases remain in the saved document for compatibility; select their connection and cell to reuse them from the new UI.

Last good datasets and resolved field values are cached atomically beside the data file as `.sheets-cache.json`. Cache identity includes the connection target and selection, preventing cross-cell reuse. A missing/damaged cache falls back to each field's saved manual text until a successful read. Program always starts stopped after a server restart. Runtime updates do not advance the configuration revision or store transient live values in the configuration document. These ignored local files, backups and real sheet URLs are never committed.

Publish-to-web `/d/e/...` URLs, restricted sheets and arbitrary HTTP/CSV endpoints are not accepted by the Sheets adapter. Public HTTPS JSON APIs use the separate connector described above. Requests go only to `https://docs.google.com`, without cookies or redirects. Callback payloads are parsed as JSON, never evaluated as JavaScript. No dependency was added.

Additional API routes use the same origin/auth rules as stage commands:

- `GET /api/ycs/data`: configuration, connection health, datasets, usages and resolved source values.
- `POST /api/ycs/data/sheets/worksheets`: `{url}` → public worksheet names and gids, without changing configuration.
- `POST /api/ycs/data/sheets/test`: `{settings:{url,worksheet,range,refreshSeconds}}` → read-only preview.
- `POST /api/ycs/data/connections`: `{id?,label,settings,revision}` → saved connection and snapshot.
- `POST /api/ycs/data/connections/:id/refresh`: immediate refresh.
- `POST /api/ycs/data/connections/:id/remove`: `{revision}` → remove an unused connection.
- `GET /api/ycs/data/mappings/:stage/:graphic`: field definitions and effective/default bindings.
- `POST /api/ycs/data/mappings/:stage/:graphic`: `{revision,edits:[{field,scope,binding}]}` → atomic mapping save. Scope is `override`, `default`, or `inherit`; binding is null, `{source:id}`, or `{connection:id,selection:{kind:'cell',cell:'B2'}}` / `{connection:id,selection:{kind:'row',headerRow:1,keyColumn:'Stage',keyValue:'STAGE 1',valueColumn:'Round'}}`.

The earlier `/data/source`, `/data/mapping`, `/data/sheets` and `/data/sheets/:id/refresh` endpoints remain available for existing integrations. New clients should use connection and mapping APIs rather than create one source per cell.

## Background runtime on Windows

After initial `npm ci` and demo/configuration setup, run from this checkout:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ycs/start-runtime.ps1
# Or select an existing show configuration:
powershell -NoProfile -ExecutionPolicy Bypass -File ycs/start-runtime.ps1 -Config .local/my-show.json
powershell -NoProfile -ExecutionPolicy Bypass -File ycs/stop-runtime.ps1
```

The launcher defaults to the existing `.local/ycs-dev.json`, launches Node hidden, loads saved connections/rundowns without regenerating demo content, and checks readiness. Starting the same recorded configuration again reuses its healthy process. A per-port startup mutex prevents duplicate launches; an unrelated occupied port is rejected. Stop verifies the recorded executable and process start time before stopping anything. Logs and process identity are saved under ignored `.local/runtime-logs/` and `.local/runtime-process.json`. `-NodePath` supports an absolute Node executable. Store configuration files inside this checkout because upstream SPX resolves their paths relative to server.js. Readiness requests use the saved API token when configured, without logging it. `general.launchBrowser` must be false.

This is a background process for the current Windows session, not an installed Windows service. An explicit launcher command can later be registered with Task Scheduler for login startup; no Windows login settings are changed by these scripts. Restart behavior, account credentials and LAN exposure should be validated on the actual host before venue use.

## Compact native editor

Double-click opens a collapsed rundown item and never closes an open editor. Enter can still toggle the editor, and Save draft retains its normal close-on-save behavior.

The active pencil beside the item heading edits its **rundown nickname**. Names are saved separately as `ycsNickname` (up to 100 characters, one line); blank restores the template name, and Cancel changes nothing. The nickname appears in expanded/collapsed item headings and Data Manager. It does not rename the template file, change the item ID used by Companion, alter field data/links, or publish a new program/preview composition. Nickname writes use the stage queue and loaded editor revision; competing saves conflict rather than overwriting newer metadata. Unsaved field edits remain in the editor. The original template-folder shortcut is kept in the footer with a folder icon and still respects SPX's folder-access configuration.

The configured stage rundowns use inline field labels with 29 px text controls and 7 px row spacing. The fields use the full editor width, with the original Save/Update and item tools moved intact to a compact footer. A thin bordered surface, consistent input borders, and locally bundled Lucide link/unlink and edit icons match the compact reference; icon attribution is in `ycs/public/editor-icons.LICENSE.txt`. Linked/manual mode updates the icon as well as its accessible state. Existing title/edit controls and checkboxes share a wrapping header; only source-linked checkboxes show their link toggle there. Source labels and manual/unassigned descriptions are available through the link/input hover titles and accessible descriptions instead of repeated helper lines. A failed linked source retains its visible warning and manual/last-good fallback message. Appearance/timing and manual story JSON remain collapsed disclosures. The original native input elements, names, handlers, values, manual/linked behavior and explicit Save/Preview/Play/Update paths are preserved. Smaller editors wrap the header and use narrower labels; touch pointers get larger controls. Save pending edits before refreshing a rundown to load the compact layout. No server restart is required for these static editor changes.

## Program, preview and renderer status

The monitor has a yellow **PREVIEW** or red **PROGRAM** header and matching output selector below. Selecting either mode changes only the embedded monitor, preserving the original renderer canvas and scaling. It never takes a graphic on air. Each selector has a separate copy button for its absolute stage-specific output URL, based on the server origin used to open the rundown. Copy does not switch modes. On ordinary LAN HTTP pages it falls back to browser copy support or a selectable URL if clipboard access is blocked. Use the SPX server's LAN hostname/IP when opening the controller if copied URLs will be used on other computers; a localhost URL still refers to the receiving computer itself.

Stage navigation and the output-connections disclosure are omitted from this panel. **Stop stage** remains a stage-scoped panic action; Data Manager remains available in the footer. Program membership is reflected by the program indicator and the existing rundown Play/Stop controls. A controller disconnect shows an unconfirmed-state warning. Successful command/copy messages clear automatically; errors remain visible. Refresh a saved rundown page to load the new panel; no server restart or show migration is needed. Opening a rundown or selecting/copying a monitor never starts program playback. Selecting a rundown item can play it inside preview.

Output pages still acknowledge applied snapshots and report template errors through the existing renderer-health API; these details are not displayed in the compact stage panel. Heartbeats expire after 15 seconds; navigation closes the renderer report when possible. A ready renderer confirms that the browser applied the composition, **not** that vMix has put it on the broadcast. The native global Stop shortcut is scoped to the current configured stage.

## Display slots

Slot policies are defined in `ycs.slots` in the local configuration. The demonstration has `ticker` and `lower-third`. Each rundown item declares `ycsSlot`, and its stable `itemID` is the command target. Existing numeric layer metadata is retained for SPX editor compatibility, but the new output compositor uses named slots and configured stacking order.

- Different slots coexist. Each stage has its own complete set of slots.
- A new graphic in a slot replaces the previous graphic in that slot.
- Stop targets the named graphic; stopping an already replaced graphic cannot stop its replacement.
- Repeating Play on the same active graphic does not replay its IN animation.
- Updating a graphic reuses its iframe and applies its data without restarting other graphics.
- A stage preview overlays the selected draft on a copy of the active program composition. It does not change program or another stage's preview.

The first version supports classic SPX HTML templates exposing `update`, `play`, and `stop`. It does not add OGraf rendering support to these new stage endpoints. The stock OGraf path is preserved. Template-specific animation behavior and screen placement remain the template author's responsibility.

## Command API and Companion

See [Companion setup](ycs/COMPANION.md). The API can operate without any controller browser open. Both the native rundown and HTTP API call the same server-owned playback service. Per-stage commands are serialized, validated against that stage's saved rundown, and written atomically before program is changed.

Renderer subscriptions use the existing Socket.IO server's `/ycs-playback` namespace over WebSocket, scoped by stage and preview/program mode. Each controller subscribes to both modes on one socket; each output subscribes to its own mode. This avoids the browser's per-origin HTTP/1 connection limit when multiple stage controllers and previews are open. Authorization uses the shared SPX session, the configured API key, or loopback-only development access, with same-origin checks. Reconnecting receives the complete current snapshot; it does not replay historical commands. Active state is currently in memory. **Restarting the server starts outputs stopped**, even if a rundown contains previous on-air flags. Reloading/reconnecting a renderer while the same server remains running restores the current composition.

Save pending edits before reloading existing rundown/output pages after updating to the WebSocket version. Legacy EventSource subscriptions (`Accept: text/event-stream`) receive HTTP 204 to stop reconnecting and free their HTTP slots; the old page's unsaved fields are not altered. Raw requests without that Accept header can still read the legacy event endpoint. A reverse proxy used in a future deployment must support WebSocket upgrades.

The initial development configuration is loopback-only. Remote API requests require a configured `ycs.apiKey` (Bearer header) or an authenticated SPX operator session. LAN deployment, unattended renderer authentication, Windows service/login startup installation, and testing on the actual vMix machines need a separate validation pass before venue use.

## Verification and remaining work

Run `npm test` for stage isolation, concurrent slots, replacement, preview safety, saved-field commit behavior, command ordering, atomic failures, HTTP command handling, reconnection snapshots, data-link mode transitions, stale writes, invalid source recovery, renderer health and compositor iframe continuity. Sheets tests cover bounded public requests, JSON parsing, invalid/empty reads, polling/backoff, cache recovery, HTTP linking, coalescing and Data Manager draft safety. No browser automation dependency has been added; DOM tests use the existing jsdom dependency.

The browser smoke test covers two native controllers, a ticker and lower third together, independent Stage 2 playout, and the program renderer. Companion integration is tested through its intended HTTP requests; a physical Stream Deck is not required. The Companion application/emulator itself has not yet been configured in this fork's first milestone.

The data-link workflow supports native field types, basic transforms, reusable public Sheets/JSON API datasets, cell/row/property selections, project-scoped sources, defaults and connection editing/removal. Advanced authentication, production/output provisioning, operator-specific preview sessions and final deployment remain subsequent work. Companion's application/emulator is still not configured. No source credentials or user spreadsheet IDs are included in this repository.

Upstream changes are intentionally limited: registration of the optional module, shared session middleware for the stage WebSocket namespace, an optional listener host, stage attributes/script/preview URL in the existing controller view, test scripts, and local-file ignore rules. Keep changes to upstream files small so upstream fixes can be merged.


## Story playlists

The ticker templates in ycs-graphics declare a `Stories` textarea (`f14`) with additive `ycsCollection` metadata. The native SPX type remains textarea; `ycsCollection: {version: 1, fields: [{key, title, required?, aliases?}]}` describes the record fields to the mapper. Other templates can declare their own record keys rather than adopt category/topic/subtopic. JSON text is delivered through the normal SPX field; the ticker adapter validates it and converts it to `tickerItems`. This adds no OGraf compliance claim.

For an existing development install, stop the runtime, update ycs-graphics, run `node ycs/upgrade-ticker-fields.cjs .local/ycs-dev.json`, then start the runtime. The explicit upgrader adds only a missing Stories field to matching imported ticker definitions and project profiles, increments affected editor revisions and writes exact `.before-playlists.json` backups. It preserves existing fields, mappings, link modes and any tickerItems override in f1. It is idempotent. New imports already include the metadata. Reload a rundown after saving its pending edits to see the added field.

In Data Manager, select the ticker and choose **Map story list** on Stories. Pick a saved Sheets or JSON connection. For Sheets, choose a bounded range inside the saved connection range and its header row. For JSON, choose an array; paths into each record are generated by the property browser. Map the template's story fields to unique header names/properties, a fixed value, or Unused. Each source field can have a fallback for missing/blank values. Each story text field also has a Transform dropdown: None, Uppercase, Lowercase, Trim whitespace or Prefix text. The transform applies after reading its source/fixed/fallback value and before required-field, size and playlist validation. It affects the resolved preview and linked playout, not the sheet/API data or manual JSON fallback. Publication, ordering and Story ID selectors are not text-transformed. An optional Published/enabled selector accepts booleans and TRUE/FALSE, 1/0, yes/no, on/off; blank is excluded. Without it all records are enabled. An optional numeric Order selector sorts ascending with source order as a tie breaker. Without it source row/array order is retained. Optional Story IDs must be nonempty and unique among enabled stories. With no ID, the renderer uses content identity.

The preview lists source rows, included/excluded/invalid states, playback positions and validation errors; blank sheet rows are ignored. Names follow headers when columns move. Missing or duplicated mapped headers require explicit remapping, never a guessed column. Required story fields come from template metadata. Disabled rows need not have valid content/order/IDs. The complete playlist is rejected if any enabled row is invalid; the last valid playlist is held. An intentionally empty playlist (all unchecked) is valid and drains the crawler. Lists are bounded to 200 records / 64 KB, with up to 4000 characters per text property. Existing scalar linking retains its 300-character limit.

Google's query response infers column types and can drop a text header above boolean/numeric data. The connector therefore overlays isolated reads of the first range row and requested collection/lookup header rows, preserving their cell addresses. These reads share the connection poll and timeout, rather than polling once per linked field. Up to 16 distinct header rows are supported per connection. Keep each data column's types consistent; Google's query endpoint can still omit incompatible mixed-type data values.

**Use mapping** only updates the workspace draft. **Save mapping** saves the binding without changing the rundown or program. Enable Stories' link in the rundown and explicitly Play/Update to commit it; switching to manual restores its saved JSON fallback. Later valid source refreshes update the same template iframe. Visible/entering crawler nodes and their header timing are retained; only the unseen tail is replaced, continuing after the last retained Story ID when available. This avoids restarting the crawl or waiting through old prefetched repetitions. Saving a different mapping stays pending until an explicit Update.

Collection bindings use `{connection, selection: {kind: 'collection', format: 'sheet', range, headerRow, fields: {subtopic: {kind: 'column', name: 'Subtopic'}}, enabled?: {kind: 'column', name: 'Published'}, order?, id?, required: ['subtopic']}}`. JSON uses `format: 'json'`, `pointer` to the array and `{kind: 'property', pointer: '/message'}` selectors relative to each record. Fixed fields use `{kind: 'static', value: 'text'}`; source selectors may include `fallback`. Required keys are enforced by the template on preview/save and playout. Existing cell/row/scalar mappings remain compatible.


## Mapping code and shared contracts

Mapping and collection code uses separate modules rather than one dense UI class:

- `mapping-state.js` owns per-graphic drafts, selection tokens, revision acceptance and detached save snapshots. `collection-state.js` owns local story selectors, column/property discovery and per-story transforms.
- `mapping-api.js` owns request paths and immutable request bodies, including collection previews and cached worksheet metadata. Its injected transport still handles authentication and HTTP errors.
- `mapping-view.js`, `collection-view.js` and `dom.js` render controls and wire UI events. `mapping-data.js` provides read-only source presentation. Views send edits through their coordinator rather than mutating drafts or requesting data.
- `mapping-workspace.js` and `collection-editor.js` coordinate selection, preview sequencing, Save and dialog lifecycle. Dialog Cancel stays local; Save remains off air. Global listeners, timers and late preview responses are released or invalidated on disposal.

`data-manager.html` loads these classic scripts in dependency order. The native controller loads `data-contract.js` before its module. Browser tests read the actual HTML dependency list so a missing production script fails the tests.

`ycs/data-contract.cjs` and `ycs/public/data-contract.js` are generated from `ycs-graphics/contracts/data-contract.js`; do not edit the generated copies. Both use `ycs/contracts/fixtures.json` and a SHA-256 manifest. This checkout has no sibling runtime dependency. To update the shared source or fixtures, regenerate from the graphics checkout:

```powershell
node scripts/sync-data-contracts.mjs --spx ../ycs-spx
node scripts/sync-data-contracts.mjs --check --spx ../ycs-spx
```

Commit both repositories together, then run the ticker tests and `node --test ycs/tests/*.test.cjs` here. The fork tests its vendored artifact hashes and browser/Node contract behavior even when the graphics source checkout is absent. See the graphics contract README for the distinct checkbox/Published policies and optional story-header defaults.

Mapping and collection modules use Prettier 3.6.2 with `--single-quote --trailing-comma none --print-width 100`; generated contract artifacts retain generator formatting. Formatting is a development tool, not an application dependency.


## Local JSON and CSV connections

Data Manager → Add connection → choose **Local JSON file** or **Local CSV file**, paste the **File path on the SPX computer**, then **Test connection** and **Save connection**. There is no file browser or upload. Examples:

- Local: `C:\ProductionData\ticker.json`
- Network: `\\DATA-PC\ProductionData\ticker.csv`

The file can live outside the SPX installation. Windows **Copy as path** quotes and surrounding whitespace are accepted. Reads happen on the SPX server, even when the operator uses a browser on another computer. The Windows account running SPX must be able to read the file; network shares need both share and filesystem permissions. UNC paths are preferable to drive mappings tied to a particular login session. SPX does not store SMB credentials or mount shares. No network share is configured in the development show; actual SMB access still needs testing on the production machines.

Once saved, the server refreshes automatically at the configured interval (5–3600 seconds). The operator browser can be closed. JSON exposes the same property/array mapping as JSON API connections. CSV exposes the same cell, table-row, keyed-row and story-list mapping as Sheets. Header rows are chosen separately in each mapping. Comma, semicolon and tab delimiters are supported, including quoted delimiters/newlines and doubled quotes. CSV values remain text; conversion happens at the mapped field. Source formulas/HTML are not executed.

Files must be regular JSON/CSV files encoded as UTF-8, up to 1 MB. CSV supports up to 200 rows (including headers), 32 columns and 4000 characters per cell, with mapping bounds A1:AF200. Device paths, alternate streams, parent traversal and file symlinks are rejected. Existing scalar/story-list limits apply. Invalid, missing or temporarily incomplete files hold their last valid data; valid reads recover automatically. Reads time out after five seconds. A timed-out job remains coalesced for the same target until the underlying OS operation settles; independent files remain usable. Restart caches retain last valid values. A valid empty story list intentionally drains the ticker.

Saving a connection or mapping stays off air. Enable the field's link and explicitly Play/Update to commit it; later refreshes update that committed link automatically. In-use file/delimiter targets remain locked; add another connection and remap to change them. Producers should write a temporary file in the same folder, then atomically rename it over the target to avoid partially written snapshots.

Existing connections stored with relative filenames and optional named server locations remain compatible. The editor displays their full resolved path while retaining the original saved target identity until the path is changed. `ycs.localDataRoot` and `ycs.localDataLocations` remain supported for those saved connections, without a location dropdown or folder browser. New full-path connections need no server folder configuration or restart.

API: `POST /api/ycs/data/local/test` accepts `{type:'local-json'|'local-csv',settings:{file,refreshSeconds,delimiter?}}` and previews without saving. `file` is the full server path. Existing connection/mapping APIs save it. Operator/API authorization and same-origin checks remain in place; authorized operators can read any matching JSON/CSV file accessible to the SPX process. Files are not served as static downloads. Legacy `{location?,file}` references still resolve relative to their configured root; `GET /api/ycs/data/local/locations` supplies metadata only for editing those saved references. Folder listing endpoints have been removed.

## Lower-third draft controls

Templates may set `ycsPreviewOnEdit: false` to keep checkbox, text, layout and link edits in the editor until explicit Preview, Play or Update. Other templates retain automatic edit previews. Save keeps Program unchanged; Companion Focus/Play reads saved values. This optional metadata is specific to the YCS fork.

The graphics repository now includes `graphics/lower-third/lower-third.html`: one reusable template with 1–4 fixed nameplate layouts, per-plate Show checkboxes and fitting name/title text. It uses the `lower-third` slot and has no appearance/timing fields. Install its package with shared helpers/fonts intact. The existing `graphicsRoot` ticker development mount also serves sibling `shared` and `lower-third` directories.

## Match status templates

The graphics repository provides separate shuffling.html and siding.html entries in graphics/match-status. Both use the lower-third slot, with fixed captions and one Show rounds remaining checkbox; Siding adds score fields. Templates may mark an individual DataField with ycsPrimary: true to keep an important number or asset selector in the main editor. Existing templates retain the normal Appearance & timing grouping. The development graphics mount includes the sibling match-status directory.

## Application settings persistence

The stock application settings form preserves the existing server-owned ycs configuration when saving and reloading. Posted ycs values are ignored; stock installations without that section remain unchanged. This retains stage routing, graphics/source paths, slot policies and API settings without placing credentials in hidden form fields. The save handler awaits persistence and reload before reporting success.

## Double-click launcher

Run Start SPX.cmd from the repository root, or create a desktop shortcut to it. It starts the saved runtime only when needed and opens the SPX homepage after readiness. The server runs in the background; closing the browser does not stop it. Startup errors remain visible. No dependencies or new settings UI are added. The wrapper uses a process-only PowerShell execution-policy override; system policy is not changed. Advanced arguments: -Config PATH, -NodePath PATH, and -NoBrowser. Node is resolved from PATH or the last runtime's recorded executable.

### Rundown labels and summaries

Configured stage rundown descriptions come from the current project template definition, matched by path. Nicknames remain item-specific. Summaries use the first three nonempty text fields, excluding hidden fields, checkbox values, timing controls and story JSON. Linked fields show their current source value or retained/manual fallback; draft manual edits enter the summary after Save draft. Summaries describe saved editor content, not Program tally.

### Slot assignment and explicit editor sections

Each rundown item's Slot picker saves a routing override independently of content drafts. Template default inherits the current project template's ycsSlot; Default routes unassigned graphics into the shared Default slot. Invalid explicit assignments still show a warning and block Preview/Play/Update. The named slots are BUG, L3 and U3; internal IDs remain stable. Graphics in the same slot replace one another independently on each output. Slot changes leave Program and Preview snapshots untouched until the next explicit command. Play/Update replaces another graphic occupying the destination slot and removes the graphic from its previous slot. Revision conflicts preserve the operator's pending field edits. Project template settings expose Default display slot instead of the unused stock Web playout layer for configured outputs; ordinary SPX projects retain their stock settings.

Templates optionally declare editorSections as an array of objects containing fields (field IDs), title (optional), collapsed (optional boolean) and placement (optional 'header'). For example: editorSections: [{placement:'header',fields:['f2']},{title:'Stories',collapsed:true,fields:['f14']}]. Sections follow declaration order. Unlisted controls stay visible in the plain editor. Templates without this metadata receive a flat layout; no field type automatically creates Appearance & timing or Stories sections. Project definitions supply current sections when available, so section edits do not require rewriting saved field values. Hidden fields remain hidden.

### Mapping lifecycle cleanup

Deleting an item from a configured rundown removes its item-specific mappings after the rundown write succeeds. Active Program items must be stopped first; the controller keeps its row if deletion fails. A deleted preview selection is cleared. Startup reconciliation and a five-second background check remove mapping records only when a readable, structurally valid configured rundown proves the item or field no longer exists. Unavailable/invalid rundowns, unconfigured stages, template defaults, and Program/Preview item references are retained. Reconciliation is serialized with data edits, advances the saved revision only when it removes records, and uses atomic replacement. Interrupted cleanup is retried by reconciliation; connections themselves are never automatically deleted.

## Decktype image folders

Player chips accept a decktype name instead of an image URL. Set `ycs.decktypeFolders`
to an ordered array of local or network directory paths, then restart SPX. The
read-only `/decktypes/NAME.png` route searches each folder directly, first match
wins; unavailable folders fall through. Only PNGs are served, without directory
listing, and file symlinks escaping the folder are rejected. Names with spaces,
@, + and other valid filename punctuation are URL-encoded by the template.

Example: `"decktypeFolders": ["C:/YCS/Decktypes/Event", "H:/Shared drives/YCS 2024/CHARACTERWORKS/ASSETS/DECKTYPES"]`.
Only the SPX computer needs those paths; remote browser outputs use HTTP. On
Windows matching normally ignores filename case. Subfolders are not searched.
Images are revalidated on subsequent requests. Missing images return 404 without
changing graphic text or playback. The folder paths are deployment configuration,
not per-template controls.

## Rundown search and density

Configured stage controllers include a search toolbar above the graphics list.
Search matches nickname, template name/path and the saved or linked summary text;
multiple words must all match. It filters locally and never changes playback or
saved order. Hidden selected rows lose focus and master controls are disabled
until a visible row is selected. Keyboard navigation skips hidden rows. Escape
inside the toolbar clears search rather than stopping the stage. Explicit
Companion Focus clears a filter when needed to reveal its selected item.

Sorting is disabled while a search is active, including through SPX AppState
changes; clearing the query restores sorting subject to normal editor rules.
New items and updated summaries automatically participate in filtering. Field
edit drafts are kept when an item is hidden.

Compact is the default (60px collapsed content); Comfortable uses 76px.
Density is saved in this browser's local storage and does not resize expanded
editors or affect other operators. Summaries show up to three nonempty text
values with middle-dot separators, excluding image/flag/logo fields and file
paths. Stock unconfigured controllers retain their existing layout.
