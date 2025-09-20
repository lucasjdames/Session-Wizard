# Changelog

All notable changes to this project will be documented in this file.

The format loosely follows Keep a Changelog (unreleased header optional) and adheres to semantic, human-readable descriptions. Versions not yet established—initial development phase.

## [0.6] - 2025-09-20
### Added
- Light mode re-implemented with theme toggle.

### Changed
- Aesthetic updates to the Therapy Session Data Taker dropzone + sidebar.
- Included a new Custom Data Table.
- Default Session Template: removed the redundant "Practice Data Text Box".

### Fixed
- Drag & drop and click behavior for Group components rendered inside template-specific sidebar views — groups now reliably append/insert their template components into the Dropzone.

## [0.51] - 2025-09-18
### Added
- Shared DOM utilities at `assets/js/shared/dom-utils.js`:
	- `autoResizeTextareas(options)` with optional MutationObserver-based `{ observe: true }` support.
	- `initDefaultDates(idsOrSelectors)` for initializing date inputs to today.
	- `copyToClipboard(text, { button, successText, resetText, timeout })` with a legacy fallback using a temporary `<textarea>` and `document.execCommand('copy')` when the modern Clipboard API is unavailable.
	- `openPrintWindow({ title, bodyHtml, headHtml, autoPrint })` for a consistent print flow.
	- `getDefaultPrintHead()` providing minimal, light-theme-safe print CSS for typography and tables.
	- `getVerticalAfterElement(container, y, itemSelector)` to help with drag/drop reordering.
- Shared CSV utilities at `assets/js/shared/data-utils.js`:
	- `formatCSVField(value)` and `parseCSV(text)` used by Progress Monitor for export/import.

### Changed
- Tools now load shared utilities before tool-specific scripts (explicit, non-breaking wiring):
	- Updated `tools/*/index.html` to include `assets/js/shared/dom-utils.js`, and for Progress Monitor, `assets/js/shared/data-utils.js`.
- Standardized textarea auto-resize and date initialization across tools via `DomUtils` (kept explicit calls; observer is available but not default).
- Progress Monitor switched its CSV handling to `DataUtils` with safe local fallbacks and triggers an explicit auto-resize after CSV import.
- Printing for Goal Builder and Progress Monitor now uses `DomUtils.openPrintWindow` and passes `DomUtils.getDefaultPrintHead()` explicitly.

### Fixed
- SMART Goal Builder: restored drag-and-drop ordering and ensured the GAS (Goal Attainment Scaling) table renders reliably after the refactor. Re-introduced required DOM queries, drag state, and guarded initialization.
- Clipboard reliability improved by adding a legacy copy fallback for environments without `navigator.clipboard`.

### Notes
- Behavior remains intentionally explicit to avoid runtime surprises; observer-based auto-resize is opt-in.
- Affected areas: Goal Builder, Progress Monitor, Homework Tracker, Therapy Data Session Taker (shared helpers adoption varies by tool complexity).
- Quick QA: Static error checks on updated JS files passed; Goal Builder drag/drop, GAS table, and printing smoke-tested.

### Rollback guidance
If issues arise, you can revert this consolidation with minimal surface area changes:
- Remove shared script tags from affected tool HTMLs and restore the previous tool-local implementations, or revert the following paths:
	- `assets/js/shared/dom-utils.js`
	- `assets/js/shared/data-utils.js`
	- `tools/goal-builder/goal-builder.js` and `tools/goal-builder/index.html`
	- `tools/progress-monitor/progress-monitor.js` and `tools/progress-monitor/index.html`
	- `tools/homework-tracker/homework-tracker.js` and `tools/homework-tracker/index.html`
	- `tools/therapy-data-session-taker/therapy-data-session-taker.js` and `tools/therapy-data-session-taker/index.html`

## [0.5]
### Added
- `CONTRIBUTING.md` with contribution standards and maintenance guidelines.
- `ARCHITECTURE.md` outlining directory structure, runtime model, and future modularization targets.
- `CHANGELOG.md` (this file).

### Changed
- Cleaned `index.html`: removed duplicate nested `<body>` tag; moved inline layout styles to existing CSS class.
- Updated `service-worker.js` (cache version bump to `v3`) removing legacy tool references and adding icon + active tool assets only.

### Removed
- (Planned) Legacy tool folders (`goal-attainment-scale-builder`, `smart-goal-builder`) retained only in archival area—not part of active runtime precache.
- Stale cache manifest entries referencing non-existent CSS variants (`therapy-data-session-taker-clean.css`, `therapy-data-session-taker-new.css`).

### Pending / Next
- Introduce shared utility script (`dom-utils.js`) for textarea auto-resize, date initialization, and standardized print/export helpers.
- Add header comments and lightweight JSDoc to major tool scripts.

---
Historical Electron distribution artifacts remain quarantined under `_archived_cleanout/` and are out of scope for current functional maintenance.