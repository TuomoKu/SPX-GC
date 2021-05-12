
# SPX-GC Release Notes
> Most recent updates are at the top.

---

## **1.0.13** (Apr 27 2021)
- Fixed a complex rundown issue when items duplicated + sorted. (Bug found right after v.1.0.12 release)
- Binary packages v1.0.13:
    [Windows](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_13_win64.zip),
    [Linux](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_13_linux64.zip),
    [Mac](https://storage.googleapis.com/spx-gc-bucket-fi/installers/1.0/SPX-GC_1_0_13_linux64.zip)


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

