# Companion setup

Use the standard **Generic: HTTP Requests** connection in Companion. No custom SPX module, generated buttons or import files are needed. Each separate Companion installation needs this module/connection available and configured. A computer only displaying an SPX browser output needs neither Companion nor this module. Stream Decks connected to a central Companion installation, including through Satellite, use that installation's connections.

## Create a button

1. In Companion's Connections, add **Generic: HTTP Requests**. Install its module through Companion if it is not already available.
2. Open the item in the SPX rundown. In its **Companion** row, choose an action and click the copy icon.
3. Add a **GET** action to the Companion button's **Press** actions and paste the copied URL. No body or Content Type is needed. Leave Release empty. Existing POST actions with JSON body **{}** still work at the same URL.

The copied URL is complete, so Generic HTTP ignores its optional Base URL. The controller's Preview, Program and Companion copy buttons use the SPX server's detected network IP and configured port, including when the controller is opened through localhost. Reload the controller after the server's network address changes. See the module's [official guide](https://github.com/bitfocus/companion-module-generic-http/blob/master/companion/HELP.md).

For token-free LAN control, set `ycs.allowUnauthenticatedCompanion` to `true` in the server configuration and restart SPX. Copied item command URLs then accept GET or POST without a key, login or Authorization header. This setting applies only to the public item commands below; operator login and internal API authentication remain unchanged. The server must listen on a reachable LAN address and its port must be allowed through the firewall.

When this option is absent or false, remote Companion requests require the existing `ycs.apiKey` setting and an `Authorization: Bearer YOUR_KEY` action header unless authenticated as an operator. Do not put private tokens in URLs.

## Item API

Use GET, or POST with an empty JSON object, at the same address:

    http://SPX-PC:5660/api/PROJECT/RUNDOWN/ITEM_ID/play
    http://SPX-PC:5660/api/PROJECT/RUNDOWN/ITEM_ID/stop
    http://SPX-PC:5660/api/PROJECT/RUNDOWN/ITEM_ID/toggle
    http://SPX-PC:5660/api/PROJECT/RUNDOWN/ITEM_ID/update
    http://SPX-PC:5660/api/PROJECT/RUNDOWN/ITEM_ID/focus
    http://SPX-PC:5660/api/PROJECT/RUNDOWN/ITEM_ID/preview
    http://SPX-PC:5660/api/PROJECT/RUNDOWN/ITEM_ID/continue

- **Focus** uses `/focus`; `/select` remains an alias for older buttons. It prepares the item in that output's Preview using saved fields and current mappings, then highlights the matching row in open controllers and selects their Preview monitor. It works even if no controller is open. Program and saved rundown bytes are unchanged. Local unsaved editor values remain intact; a brief message reminds you to save them before Companion Play. A failed preview does not move focus. Reconnecting does not replay old focus commands.
- **Play** uses saved fields and current mappings. Repeated Play updates the active item without replaying its entrance.
- **Stop** removes that item from program.
- **Toggle** checks actual program inside the output queue and chooses Play or Stop. Use one Press action, with no Release action. A second Toggle for the same item within 400 ms is ignored and returns the current state with `"repeated": true`, so a double press or Companion's automatic GET retry does not toggle twice. Press again after the window to toggle back. Opening or refreshing a Toggle URL in the browser executes it again if more than 400 ms have passed.
- **Update** applies saved changes to an active item; it does not start a stopped item.
- **Preview** previews saved data. It is separate from Focus and from a local editor's unsaved draft.
- **Continue** advances a running template with continuation steps; unsupported or inactive items return an error. A repeated Continue for the same item within 400 ms is ignored, like Toggle. Outputs that reload return to the current step.
- **Stop** and **Toggle** (when it stops) take the item off air even if the show files on the server cannot be read or written; the on-air flag is saved when the disk recovers.

Project and rundown must match exactly one configured output in `ycs.stages`. Unknown/unconfigured pairs return 404; ambiguous pairs return 409. This address format does not automatically provision outputs for new projects. Native editor, data and renderer internals retain existing stage routes for compatibility. The public item API does not accept field edits. GET and POST share the same authorization and playback queue. Responses are marked no-store; HEAD and other methods return 405 without executing commands.

Nickname changes and reordering do not change the item ID. Deleting and re-adding an item creates a different ID, so copy its new URL. The compact copy control never executes an action. Hover the icon to inspect its target; selectable text appears if clipboard access is blocked. An item without an output slot disables action copying until a slot is assigned.

Errors are JSON (`{"error": "..."}`) with the HTTP status, never an HTML page. Companion's Generic HTTP module retries failed GET requests automatically; Play, Stop and Focus are idempotent, and Toggle/Continue ignore repeats within 400 ms. Successful HTTP responses describe server state, not vMix broadcast tally. Check failed/non-2xx commands in Companion's connection status/log. Test on the separate rehearsal first. Venue LAN/vMix and physical surfaces still need validation.
