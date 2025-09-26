# Session Wizard Architecture

This document provides a high-level overview of the structure and runtime flow of the Session Wizard web toolkit.

## 1. Runtime Model
The application is a static, multi-page web app (no client-side router). Each tool lives in its own folder under `tools/` and is accessed via standard browser navigation. No build process or bundler is required. All scripts are loaded directly by the browser.

Offline capability was previously provided by a service worker (`service-worker.js`) that precached the shell and used a network-first strategy. PWA/support has been archived for desktop packaging — the archived files live in `_archived_cleanout/pwa/` if you need to restore this behavior.

## 2. Directory Layout (Active)
```
index.html                  # Dashboard landing page
assets/
	css/                      # Core styling and font declarations
	js/                       # Shared scripts (main shell + theme + future utilities)
	img/                      # Icons used for PWA and UI
tools/
	goal-builder/             # Combined SMART Goal + Goal Attainment Scale tool
	progress-monitor/         # Longitudinal performance tracking & CSV import/export (hidden/experimental)
	therapy-data-session-taker/  # Complex data capture (discourse, swallowing, timers, etc.)
service-worker.js
```

Legacy/archived Electron distributions and split tools are moved under `_archived_cleanout/` and excluded from the current runtime.

## 3. Core Pages
| File | Purpose |
|------|---------|
| `index.html` | Launch point; links to tools; sets up header/footer; will host future modules panel. |
| `tools/goal-builder/index.html` | Provides SMART goal drag/drop composition + Goal Attainment Scale table generation. |
| `tools/progress-monitor/index.html` | Tabular multi-date performance tracking with CSV import/export and print formatter. |
| `tools/therapy-data-session-taker/index.html` | Highly dynamic session component builder (print/export heavy). |

## 4. Shared Behavior
Currently repeated behaviors (pending consolidation):
* Textarea auto-resize via inline helper duplicated in several tool scripts.
* Date initialization pattern (`goalDate` inputs).
* Print/export patterns constructing an HTML document in a new window and invoking `window.print()`.

These will be candidates for a shared `dom-utils.js` module.

## 5. Service Worker Strategy
* Precache list includes only active assets—legacy tool paths removed.
* Version bump of `CACHE_NAME` invalidates prior caches.
* HTML/JS: network-first to ensure latest logic; fallback to cached response offline.
* Static assets (icons/CSS) served from cache when available.

## 6. Data Persistence
The current implementation relies on in-memory state only. Clipboard export, print output, and CSV import/export handle user data portability. No IndexedDB or localStorage is used for tool-specific state (theme selection uses `localStorage`).

## 7. Accessibility Considerations
* Semantic sections (`header`, `main`, `nav`, etc.) used in dashboard.
* Some toggles manually manage `aria-expanded`; future refactor could unify.
* Further improvements planned: skip link, focus management on navigation, consistent `aria-label` usage on icon buttons.

## 8. Security / Privacy
* All processing is local—no network requests besides static asset retrieval.
* Clipboard and print features operate entirely in-browser.
* No PII is persisted by default.

## 9. Future Modularization Targets
| Module | Rationale |
|--------|-----------|
| `therapy-data-session-taker.js` split | File size (~5k lines) impairs maintainability; should segment by feature cluster. |
| Shared print/export builder | Standardize HTML layout & style tokens. |
| Shared textarea + auto-growing inputs | Remove duplication and reduce listener overhead. |

## 10. Non-Goals (Current Phase)
* No dynamic module loading / bundling.
* No server rendering or API integration.
* No framework adoption (keep plain JS for transparency and offline reliability).

## 11. Change Management
When adding a new tool or significant feature:
1. Create folder in `tools/`.
2. Add navigation button to `index.html`.
3. Add assets to service worker precache (if offline-critical) and bump `CACHE_NAME`.
4. Update `README.md` and (if structural) this document.
5. Optionally add a CHANGELOG entry.

---
This document should remain concise—prefer linking to `CONTRIBUTING.md` for process detail.
