
# SPX Release Notes
> Updated 2025-04-26<br>
<small>Most recent updates are at the top.</small>

<BR>

**⚠ PLEASE UNDERSTAND:** Features and changes below may not fully work as the source code is constantly under development. For a stable and more tested version, please use the published binary releases below.

## Coming up later...
- Add several (not all) templates to a rundown at once
- spxpack import/export
- ctrl+drag rundown items to make them children
- OSC implementation
- Rundown Variables (does not remove prVar from profile if no users)

<BR>
<BR>

# Current dev notes v.1.3.4
* Working on a new optional, section to **rundown datafiles** for rundown specific, static, information banner at the top of the rundown. This can become useful for tutorials, and such. Currently this must be added to the rundown files manually. All values are optional, except "body". Supported types: `info` (green accents) and `warn` (red). See example below:
```json
  "notification": {
    "type": "info",
    "head": "Rundown comment",
    "body": "Lorem ipsum dolor sit amet!",
    "pict": "https://static.spxcloud.app/controller-notification/STORE-BLACK-FRIDAY-50-OFF.png",
    "link": "https://spxgc.tawk.help/article/some-page",
    "text": "Read more"
  }
```
* Ignore HTML and CVS files while browsing if filename starts with "_" or "."
* If a loaded templatename starts with "_" it's protected and others will not load.
* Fix a minor "double slash" issue in template paths/URLs.
* Fix a minor "leading slash" issue in `getFileList` API handler.
* Adds a support for multiple file extensions in the `filelist` -field.
* Improved `templateDefinitionMissing` error handler.


These are in a broken, work-in-progress, state:

* API/feedproxy post handler `executePOSTRequest()`
* Drag and drop an image to the local renderer to set the static background using "setRendererBackgroundImage" -handler
* All demo/production extensions must be redone, with public APIs and apikey config option!

<BR>
<BR>


# Published releases

## **1.3.3** (Dec 31 2024)
 >See also [Latest changes Knowledge Base article](https://spxgc.tawk.help/article/latest-changes) for selected feature highlights. 

 1.3.3 is a maintenance release with some bug fixes and a few security and API
 improvements.

 **Changes**

* Dependencies updated
* Added a feature to open CSV folder when exporting a CSV file
* Added a manually configurable `notification` option to rundowns, such as
```json
  "notification":{
    "type": "warn",
    "head": "PLEASE NOTE",
    "body": "The ticker on this rundown requires an API-KEY.",
    "link": "https://knowledge.base/instructions",
    "text": "How to change the API-KEY",
    "pict": "https://cdn-icons-png.flaticon.com/128/159/159469.png"
  }
```

* Improved CONTINUE button UI-logic
* Added `runScript` URL parameter handler to renderer loader
* Fixed a type check bug in `httpPost()`


<br>

## **1.3.2** (Oct 31 2024)
 >See also [Latest changes Knowledge Base article](https://spxgc.tawk.help/article/latest-changes) for selected feature highlights. 

 1.3.2 is a maintenance release with some bug fixes and a few security and API
 improvements.

 **Changes**

* Fixed a "special characters bug" in `directplayout` API endpoint
* If a username/password is configured, then `apikey` is also required
* added project/rundown to the global state (for `/api/v1/rundown/get`)
* Added new optional "updateRundownItem" -parameter to `directplayout` API call. If the UI is open and has an item by the same value and both the request and rundown item refers the same template file, it's Play/Stop indicator is changed to match the API request's command.
* Added `reloadRendererWithLayers` handler to renderer for SPX Zoom Connector plugin (required url args `&remote=true&name=<validName>`) [for SPX Graphics's internal integrations]

<br>


## **1.3.1** (Aug 10 2024)
 >See also [Latest changes Knowledge Base article](https://spxgc.tawk.help/article/latest-changes) for selected feature highlights.
 **Release description:**

Version 1.3.1 is a patch release with a some security iprovements and bug fixes for API and Light Mode functionalities.

**Changes**:

- When non-default `config.general.dataroot` folder path value was used for Projects and Rundowns, some API functions were assuming default values and failed to store or return data correctly. Four separate features were effected and are now fixed.
- "Light Mode" had a bug which prevented correct functionality when used in an iFrame.
- Removed optional `fps` url attribute support from the renderer. This has not been used and can be misleadling, as implementation needs to be handled in the template level and this setting does not have any effect on the renderer anyway.
- A new config property `config.general.disableOpenFolderCommand = true` added. This disables the "Open Folder" -utility button in the Controller / Item editor view and the underlying private API endpoint. When SPX is used in a local environment, this can be enabled to speed up work, but for security reasons is disabled by default.
- Some security measures added to the `feedproxy` and `load` API endpoints.

Thanks **Merbin Russel** and **Mohsin Khan** for discovering and reporting potential SSRF, Blind RCE and XSS vulnerabilities that have now been patched.

- Fixed a timing setting related bug in the Ticker RSS and Ticker Manual -templates.

<br>

## **1.3.0** (Jun 10 2024)

 **Release description:**

Version 1.2.1 has been very stable and is used in production in many places and we have collected a lot of feedback from users and version 1.3.0 is a big step forward with a lot of power-user features for production professionals, including workflow and system integration improvements, bug fixes, API changes and a long list of bug fixes.

Please read the following list to get an overview of changes and improvements.


**Changes**:
- Improved API, documentation and response messages
- Enabling **CAPS LOCK** will display rundown item's layers and other useful info
- Added a feature to automatically play rundown items that were played before. This helps in synchronizing local renderer to better match with external output renderers. There is a config setting `general.autoplayLocalRenderer = true` to enable this. Disabled by default. Users can set this in Options panel under the local renderer.
- Added `/allrundowns` endpoint to the API that returns all projects and their run
- Added `/feedproxy` POST endpoint for supporting custom headers for outgoing GET requests
- Added `/executeScript?file=<myScript.bat>` API endpoint for running scripts from `ASSETS/scripts` -folder
- Added `rundown/json?project=<projectName>&rundown=<rundownName>` API endpoint that returns data from a given rundown
- Added `rundown/json` POST API endpoint for saving (externally generated) rundown to a project
- Added `invokeExtensionFunction?function=<function>&params=<args>` API endpoint for executing functions within extensions.
- Added `getFileList?assetsfolder=<folder>` API endpoint for getting a list of files in `ASSETS/<folder>`
- Added `saveCustomJSON` POST API endpoint for saving arbitrary JSON data to `ASSETS/json/<folder>/<file>`
- Fixed a major bug in rundown caching mechanism when using `/controlRundownItemByID` API call. Cached rundown was conflicting with the API call. Manually triggering rundown items AND API calls could get cache to a broken state. Now these calls are identified better and the caching works more reliably. Enable `verbose` log level to observe the internal runtime logic.
- Added support for timed "out" modes when using `controlRundownItemByID` or `directplayout` API endpoints.
- Added `general.hideRendererCursor = true|false` setting to config.json 
- Added new renderer size preset to App Config. Available options are now `HD, 4K, AUTO`. Autowide scales to full height and width of the output device. Please remember, this is just the renderer size. The templates loaded onto the renderer will need to support that size and/or aspect ratio as well. 
- Improved UI scaling and main menu by making it scrollable
- Improved Stop All -plugin reliability. (But it sh/could be re-written altogether)
- Added project- and rundown name validations to user inputs (no special characters allowed)
- Folders and files are sorted alphabetically (case insensitive) in template browser
- Extra tabs added to template browser to SPX Store, Loopic and StreamShapers' Ferryman
- Fixed a minor bug in detach/dock local renderer slider UI component
- Ignore projects (folder names) that start with dot (.) or underscore (_)
- Renderer url params are passed to individual layers for custom work
- Added "custom content repository" detection to header (see source code for details)
- Added `light` rundown mode (add `/light` to the end of rundown URL's). This is still an **experimental feature** and may have bugs.
- Added default dataformat from `XML` to `JSON` at import (if not given)
- Changed default webplayout layer from `-`  to `20` at import (if not given)
- Binary packager pkg@5.8.0 replaced with `npm install -g @yao-pkg/pkg`

<br>

**Known Issues** (a.k.a bugs)
- Some API calls fail if user/password is set in config.json (discovered by Brad). Text information is shown in the console to explain this issue.
- In some situations rundown files may get corrupted, and there might be extra characters at the end of the JSON files. The user facing symptom is that rundown loads empty! This is easy to fix manually by editing the rundown file, but is very cumbersome and we are looking for a fix to this issue!


- For latest builds visit ▶ [spx.graphics/pricing](https://spx.graphics/download)
    
<br>


## **1.2.1** (Sep 20 2023)
- This patch fixes a bug in the example rundown file `HelloWorld/MyFirstRundown` that caused SPX server to hang when navigating off that rundown view. The bug does not effect any other created rundown files, but was annoying for first time users. 
- Binary packages v1.2.1:
    [Windows](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.2/SPX_1_2_1_win64.zip),
    [  Linux](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.2/SPX_1_2_1_linux64.zip),
        [Mac](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.2/SPX_1_2_1_macos64.zip)

<br>

## **1.2.0** (Sep 05 2023)
- Added "Several SPX Controllers are connected" warning to the user interface and a corresponding config entry `general.disableSeveralControllersWarning` 
- Added "Disable Local Renderer" toggle to the UI and corresponding config entry `general.disableLocalRenderer`. This can come in handy when computer resources are limited.
- Added support for API key in the config.json to allow external triggers only with matching `apikey` url parameter
- Improved security of customTemplate function invocations. Only functions found at runtime will be executed. This prevents running any arbitrary JS code in the renderer.
- Improved the "Import Errors notification" text in the Server Console.
- Added functionality to import several templates to a project at once by Ctrl+Click or by using the All/None toggle button added into the template browser user interface.
- Added functionality to add all project's templates to a rundown with a single click in the "Add template to rundown" -view.
- Changed bit.do links to use bit.ly URLs instead
- Added `allow="autoplay"` to all renderers (see info regarding Chrome's `chrome.exe --autoplay-policy=no-user-gesture-required` command line switch at https://goo.gl/xX8pDD)
- Added API edpoint `executeScript?file=file.bat` to run a shell script/batch file from ASSETS/scripts -folder.
- Added API edpoint `gettemplates?project=MyProject` to return all templates, and their settings, of a given project.
- Added API edpoint `rundown/focusByID/12345678` to set focus to a specified item on the opened rundown.
- Improved API return messages also format changed to JSON (from strings). NOTE! This may be a **BREAKING CHANGE** if your own apps utilize SPX API commands and are expecting (parsing) responses in a strictly defined format.
- Improved `layers`  URL parameter functionality of the renderer (type matching).
- Improved `panic` functionality to overdrive restricted layers -filter.
- Improved `onPlay` and `onStop` template event handlers. (This feature hasn't been documented intentionally since it was mostly untested. Now it has been improved to be able to create more functionality with it, like CasparCG video playback commands etc. Documentation is still pending.)
- Improved stability if dataroot- or project folder(s) are missing they are generated on the fly
- Added `onNext` template event handler. See above item also.
- Added '...FOR OPERATOR ONLY' message to the scalable renderer to clear confusion about its purpose.
- Fixed bugs in API play/continue/stop by ID routines, that would control the first item incorrectly on the rundown when the given ID was not found
- pkg updated from 4.4.9 to 5.8.0 (due to updated Node16)
- Binary packages v1.2.0:
    [Windows](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.2/SPX_1_2_0_win64.zip),
    [  Linux](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.2/SPX_1_2_0_linux64.zip),
        [Mac](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.2/SPX_1_2_0_macos64.zip)

<br>


## **1.1.3** (Jun 29 2022)
> Version 1.1.3 was never released publicly as binaries. These features will be present in the future releases.
- New url parameter added to the renderer to pass a desired refresh rate to templates `renderer/?fps=30`. This will require modifications to the templates with controllable update rates, such as the scrolling tickers, using **gsap** animation library (or similar.) See _Google Sheet Ticker_ -template for an example.
- Minor fixes to registration view (remove Discord, not needed) and enable email checkbox always

<br>


## **1.1.2** (Jun 20 2022)
>See also [Latest changes Knowledge Base article](https://spxgc.tawk.help/article/latest-changes) for selected feature highlights.
- Added API endpoint `getprojects` that returns all project names in SPX.
- Added API edpoint `getrundowns?project=MyProject` that returns all rundowns of given project.
- Added width and height url params to renderer (`/renderer?width=1000&height=500&preview=true`).
- Added a link to API endpoint list to app config.
- Added `disableConfigUI` boolean to config.json. If `true` config menu is hidden and config page gets locked.
- Added `allowstats` boolean config flag. If `false` anonymous user stats posting is disabled.
- Added `registration{}` to config and a menu option for it (url `/register`).
- Added `open template folder` button to rundown item editor (mostly to help template developers). 
- Added function to change `out` mode of an opened rundown item. (Change duration, for instance)
- Added function to change `webplayout` layer of an opened rundown item. 
- Added `color` ftype and a color picker UI into the template item editor.
- Added `spacer` ftype.
- Added better error messages if template file is not found.
- Added preview: `none` option to configuration
- Fixed a major path detection bug that appeared after re-importing a template and prevented importing more templates (before server restart). 
- Fixed a minor bug in filelist field (did not add trailing "/" in filepath).
- Fixed a bug in rundown item duplication routine (when clicking on the icon - had a clash with preview function).
- Fixed a "play duplicated rundown item" -bug.
- Fixed a spacebar bug (play) after editing several rundown items.
- Fixed "import CSV" functionality to generate a bunch of items onto the rundown in one go.
- Changed `spxgc-ip-address` to `spx-ip-address`
- Improved default templates to use dynamic themes dropdown selector.
- Improved preview mechanism (prevent subsequent previews of the same item).
- Improved UI by reverting gcinput margin-top fixed back to 5px from zero.
- Improved controller UX / speed by doing init with DOMcontentLoaded rather than onLoad event.
- Improved template import error handler to prevent SPX crash when errors in template's JS-code. 
- Improved error handling and error message displays.
- Binary packages v1.1.2:
    [Windows](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.1/SPX_1_1_2_win64.zip),
    [Linux](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.1/SPX_1_1_2_linux64.zip),
    [Mac](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.1/SPX_1_1_2_macos64.zip)

<br>


## **1.1.0** (Feb 23 2022)
>See also [Latest changes Knowledge Base article](https://spxgc.tawk.help/article/latest-changes) for selected feature highlights.
- Changed default port to **5656** to avoid clash with Apple Airplay receiver process. (Thanks Chris 'Lower' Fenwick, for in-depth troubleshooting 😉)
- Added preview functionality and required UI changes. Preview functionality is **very much WIP** and `Take-next-on-play` -preview mode is disabled due to bugs.
- Added "renderer options" area below the renderer to move local renderer to a popup window. Renderer options area also has buttons to copy Program and Preview URLs.
- Added 4K support to app config and renderer(s). Please note, most templates are done for fixed HD resolution and may appear in 1/4th size in the output.
- Added filtering to Projects view (visible when there are 5 projects or more)
- Added `/api/v1/controlRundownItemByID` -API endpoint (see http://localhost:5656/api/v1)
- Added `/api/v1/panic` -API endpoint (see http://localhost:5656/api/v1)

- Added "disable" toggle to CasparCG servers to temporarily prevent playout commands sending.
- Added recent files to the main dropdown menu (saved to config.json)
- Improved `/api/v1/invokeTemplateFunction` -API endpoint with url encoded strings.
- Improved startup sequence on macOS
- Improvements in various file reading / writing functions. Overall stability and cleanup.
- Improved locale files (english, finnish, portuguese, dutch)
- Improved "links to other stuff" globalExtra from config/createConfig to a plugin in ASSETS/plugins/spxLinks/
- Improved file browsers to skip dot-files (".file.ext", mostly on mac)
- Bug fix: a cross platform issue in the template browser navigation mechanism refactored.
- Binary packages v1.1.0:
    [Windows](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.1/SPX_1_1_0_win64.zip),
    [Linux](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.1/SPX_1_1_0_linux64.zip),
    [Mac](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.1/SPX_1_1_0_macos64.zip)

<br>

## **1.0.15** (Oct 24 2021)
- Renamed the app from "SPX-GC" to "SPX". Website: http://spx.graphics
- Added General Settings > Static Background Image to Project Settings (feature suggested by Rotem Kish)
- Added rundown item rename functionality to the ID-button
- Added "import CSV file" option to rundown > add template dialog
- Added help section to Knowledge Base and linked help() -function to those
- Added relative path (using template's root folder) filelist option, see README.
- Added "imported timestamp" to profile items for future version comparisions on the rundowns.
- Improved performance by prioritizing memory usage over disk I/O (multiple code changes)
- Improved initialization and startup folder detection
- Improved project file management by removing absolute path reference
- Fixed re-import bug (absolute file path was invalid)
- Binary packages v1.0.15:
    [Windows](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX_1_0_15_win64.zip),
    [Linux](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX_1_0_15_linux64.zip),
    [Mac](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX_1_0_15_linux64.zip)

<BR>

## **1.0.14** (Oct 01 2021)
- Added functionality required by "SPX-GC CasparCG MediaPlayer -extension" (CCG commands)
- Added tooltips to template fields in the editor view of the rundown
- Added `/feedproxy` helper API-endpoint for CORS data sources with "SPX-GC SocialPlayout -extension".
- Changed the rundown autoScroll parameters (to block: nearest, behavior: auto)
- Fixed template re-import functionality (in project settings)
- Fixed the "invisible rundown item -bug" when a template without DataFields was added
- Added scalable webrender pop-up window command to controller menu
- Added export CSV-file option to template editor (import function will be added in 1.0.15)
- Disabled Chrome autostart by default in config.json ("launchchrome": false)
- Binary packages v1.0.14:
    [Windows](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_14_win64.zip),
    [Linux](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_14_linux64.zip),
    [Mac](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_14_linux64.zip)

<BR>

## **1.0.13** (Apr 27 2021)
- Fixed a complex rundown issue when items duplicated + sorted. (Bug found right after v.1.0.12 release)
- Binary packages v1.0.13:
    [Windows](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_13_win64.zip),
    [Linux](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_13_linux64.zip),
    [Mac](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_13_linux64.zip)

<BR>

## **1.0.12** (Apr 25 2021)
- Added new direct API commands, such as `invokeTemplateFunction` to enable custom template function triggering from StreamDeck
- Added a welcomeOverlay -plugin for onboarding (localStorage flag 'SPXGC_WelcomeScreenDisplayed').
- Added an ID button to item editor for copying itemID's (to be used with API parameters)
- Added `openchrome` flag to config.general
- Added Dutch language file
- Removed OVERLAY CasparCG server from the generated default config. See README for instructions in adding CasparCG servers.
- Improved performance by skipping unnecessary CasparCG functions when no CCG servers configured
- Improved clearOutputs functionality
- Fixed issue #3 incorrect start-up folder detection (on binary macOS version).
- Fixed issue #18 complex rundown issue when items deleted + sorted. 
- Fixed issue #32 (renderer parameter ?layers=[1,5,19]) was not working correctly.
- Fixed "looping templates issue" when auto-out was used and several templates played at same time.
- Several minor tweaks and stability and performance improvements.
- Binary packages v1.0.12:
    [Windows](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_12_win64.zip),
    [Linux](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_12_linux64.zip),
    [Mac](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_12_linux64.zip)

<BR>

## **1.0.11** (Mar 25 2021)
- Added a "button" ftype to template definition 
- Added ASSETS/plugins functionality for custom plugins. See README > plugins for info.
- Help feature points globally to Knowledge Base. Content sections ignored for now.
- Added a "re-import template" functionality to templates in the project settings
- A bunch of stability imporovements and minor bug fixes
- Binary packages v1.0.11:
    [Windows](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_11_win64.zip),
    [Linux](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_11_linux64.zip),
    [Mac](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_11_linux64.zip)

<BR>

## **1.0.10** (Jan 23 2021)
- Added a "checkbox" ftype to template definition 

<BR>

## **1.0.9** (Jan 08 2021)
<!-- NOPE!!! Fixes Mac binary package installation folder [issue (#3)](/../../issues/3). -->
- Fixes a bug in timed Stop animations (in v1.0.4 - 1.0.8)
- Fixes get-file-list bug (Excel file list) in binary package versions
- Build process reconfigured. Some build zip files were corruputed in 1.0.8.
- Fixes a playout issue with other CasparCG servers than "localhost"
- Added a configuration option `general.templatesource` to configure CasparCG template playout to use either file or http protocol: 
  * `spxgc-ip-address` is the default and uses SPX-GC **http** server to host templates for both CasparCG and web playout
  * `casparcg-template-path` uses CasparCG config's template-path and **file://** -protocol
- Tiny other fixes and code cleanup
- Binary packages v1.0.9:
    [Windows](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_9_win64.zip),
    [Linux](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_9_linux64.zip),
    [Mac](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_9_linux64.zip)

<BR>

## **1.0.8** (Dec 30 2020)
- Added `/api/v1` endpoint for external commands (for Elgato Stream Deck and other similar use cases)
- Binary packages v1.0.8:
    [Windows](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_8_win64.zip),
    [Linux](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_8_linux64.zip),
    [Mac](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_8_linux64.zip)

<BR>

## **1.0.7** (Dec 20 2020)
- Templates loaded to CasparCG via http:// protocol (and not file://)
- Bugfixes in project / rundown file management functions (empty selections ignored)
- Added Excel reading API capability for templates via ajax call (such as news ticker). Also added a demo template SPX1_TICKER_EXCEL.html
- Added a "number" ftype to template definition
- selected layers rendering (for external renderers, such os OBS) with `layers` parameter `/renderer/?layers=[2,4,20]`
- improved collapsed rundown data preview
- __NOTE: Issue found.__ Special-characters-fix (in 1.0.4) may break existing templates with multiline text areas and html sequences renders as text. Effected templates must be fixed with `DOMParser()` -logic which will interpret escaped characters (such as `&lt;BR&gt;`) back to valid HTML tags (`<BR>`) for correct rendering. (See this article for an example: https://www.codegrepper.com/code-examples/whatever/how+to+convert++text+to++html+document+javascript+DOMParser)

<BR>

## **1.0.6** (Dec 18 2020)
- Improved `filelist` field type functionality
- Added `instruction` field type
- Binary packages v1.0.6:
    [Windows](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_6_win64.zip),
    [Linux](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_6_linux64.zip),
    [Mac](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_6_linux64.zip)

<BR>

## **1.0.5** (Oct 19 2020)
- Added support for INVOKE handler for custom template commands.

<BR>

## **1.0.4** (Oct 19 2020)
- Rundown items changed from index based to ID-based. This is a major internal change and improves app stability, enable further development and cleanup spaghetti code.
- Added playlist item duplication.
- Continue button only active if template definition "steps" > 1
- Update button removed from main UI and is now only in the item editor
- Minor UI tweaks and some orphan code purged
- Allow special characters in template fields (",'/\&#<>)

<BR>

## **1.0.3** (Oct 17 2020)
- added support for "filelist" dropdown selector for choosing a file of specific type (such as 'png') from a specific Asset -folder (such as '/media/image/logo/')
- added messages.dbggreet logic to view-home.handlebars for msg debugging.
- improved "continue" button logic in UI and added "steps" parameter to template definition
- moved templates/empty.html from a file to internal route
- implemented duplicate and rename rundown -buttons in the rundown list view

<BR>

## **1.0.2** (Sept 21 2020)
- added support for multiline "textarea" fields
- Binary packages v1.0.2:
    [Windows](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_2_win64.zip),
    [Linux](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_2_linux64.zip),
    [Mac](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_2_linux64.zip)

<BR>

## **1.0.1** (Sept 5 2020)
- fixes #4 (wrong output url)
- show template folder at startup info
- Binary packages v1.0.0.1:
    [Windows](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_0_1_win64.zip),
    [Linux](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_0_1_linux64.zip),
    [Mac](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_0_1_linux64.zip)

<BR>

## **1.0.0** (Sept 05 2020)
- Initial release. Known issues listed in README.md
- Binary packages v1.0.0:
    [Windows](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_0_win64.zip),
    [Linux](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_0_linux64.zip),
    [Mac](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_0_linux64.zip)

