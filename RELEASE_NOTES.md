
# SPX-GC Release Notes
> Most recent updated are at the top of this document.

---
## **1.0.6** (Dec 18 2020)
- Improved 'filelist' field type functionality
- Added 'instruction' field type

## **1.0.5** (Oct 19 2020)
- Added support for INVOKE handler for custom template commands.


## **1.0.4** (Oct 19 2020)
- Rundown items changed from index based to ID-based. This is a major internal change and improves app stability, enable further development and cleanup spaghetti code.
- Added playlist item duplication.
- Continue button only active if template definition "steps" > 1
- Update button removed from main UI and is now only in the item editor
- Minor UI tweaks and some orphan code purged
- Allow special characters in template fields (",'/\&#<>)

## **1.0.3** (Oct 17 2020)
- added support for "filelist" dropdown selector for choosing a file of specific type (such as 'png') from a specific Asset -folder (such as '/media/image/logo/')
- added messages.dbggreet logic to view-home.handlebars for msg debugging.
- improved "continue" button logic in UI and added "steps" parameter to template definition
- moved templates/empty.html from a file to internal route
- implemented duplicate and rename rundown -buttons in the rundown list view

## **1.0.2** (Sept 21 2020)
- added support for multiline "textarea" fields

---
## **1.0.1** (Sept 5 2020)
- fixes #4 (wrong output url)
- show template folder at startup info

---

## **1.0.0** (Sept 05 2020)
- Initial release. Known issues listed in README.md

