## Contributing to Session Wizard

Thank you for your interest in improving Session Wizard. This project is a static, browser‑only toolkit (no Electron runtime) intended to stay lightweight, dependency‑minimal, and easily auditable.

### Core Principles
1. Zero external runtime dependencies (no build step required).
2. Keep tools self‑contained but share common DOM utilities where duplication would otherwise occur.
3. Offline capability has been archived for desktop builds. If you need to re-enable the PWA, restore `service-worker.js` and `manifest.json` from `_archived_cleanout/pwa/` and update `index.html` and build config accordingly.
4. Favor progressive enhancement: all critical interactions should degrade gracefully without JavaScript.
5. Accessibility (a11y) and semantic HTML are first‑class: use appropriate roles, labels, and keyboard operability.

### Repository Layout (Active)
```
index.html                # Dashboard
assets/                   # Shared styling, icons, fonts, core scripts
tools/
  goal-builder/           # SMART + Goal Attainment Scale combined tool
  progress-monitor/       # Longitudinal performance tracking
  <!-- Note: Progress Monitor is currently hidden/experimental. To re-enable (and PWA), follow README and restore PWA files from `_archived_cleanout/pwa/` then re-add Progress Monitor entries to `service-worker.js` `urlsToCache` and bump `CACHE_NAME`. -->
  therapy-data-session-taker/  # Session data capture & export
service-worker.js         # Offline caching
```

Archived / legacy content (Electron bundles, prior tool splits) lives under `_archived_cleanout/` and should remain untouched unless re‑auditing historical context.

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| IDs  | kebab or camel only if legacy; prefer tool‑scoped (`pmDateRow`) | `pmDateRow` |
| Classes | dash/kebab; use tool prefixes when cross‑tool collision possible | `sgb-drop-block`, `gas-table` |
| JS Functions | lowerCamelCase | `autoResizeTextarea` |
| Constants | SCREAMING_SNAKE_CASE | `CACHE_NAME` |
| Files | kebab-case | `goal-builder.js` |

Avoid reusing generic IDs (e.g. `goalDate`) across unrelated tools—prefer prefixing (`pmCreatedDate`). If changing an existing ID could break stored user state or clipboard formats, document the preferred future name instead of performing a breaking rename.

### JavaScript Guidelines
1. Each major file starts with a header comment describing purpose and side effects.
2. Avoid polluting the global scope: wrap tool logic in IIFEs if adding more globals would cause collisions.
3. Shared logic belongs in `assets/js/` (e.g., `dom-utils.js`). Keep utility modules stateless.
4. Long files (e.g., `therapy-data-session-taker.js`) should use region divider comments: `// === MODULE: Print Export ===`.
5. Use feature detection before using APIs (e.g., `if (navigator?.clipboard)`).
6. Prefer event delegation for dynamic lists (tables, generated rows) to reduce listener churn.

### CSS Guidelines
1. Use CSS variables defined in `:root` for colors/spacing.
2. Avoid inline styles except for dynamic print HTML generation.
3. Dark theme: rely on `[data-theme="dark"]` scope, do not duplicate entire rule sets unnecessarily.

### Service Worker Updates
When adding or removing any top‑level asset or tool entry page:
1. Increment `CACHE_NAME` in `service-worker.js`.
2. Add/remove its path in `urlsToCache`.
3. Keep list minimal—do not precache large, rarely used exports unless essential offline.

### Adding a New Tool
1. Create a folder under `tools/<new-tool>/` with `index.html`, `<new-tool>.js`, optional `<new-tool>.css`.
2. Use existing patterns for layout (`tool-container`, `meta-row`).
3. Add navigation button to root `index.html`.
4. Update service worker precache manifest.
5. Document the tool briefly in `README.md` and (if architectural impact) in `ARCHITECTURE.md`.

### Code Style
Minimal linting is enforced socially—keep formatting consistent with existing files (2 spaces, semicolons optional but consistent per file—current code uses semicolons in utilities; match local style).
## Contributing to Session Wizard

Thank you for your interest in improving Session Wizard. This repository now targets desktop-first distribution via Electron; however, we keep the code modular so individual tools remain easy to develop and test in the browser during development.

### Core Principles
1. Keep tools small and self-contained; share common utilities in `assets/js/` when appropriate.
2. Progressive enhancement: critical functionality should work without JavaScript where reasonable.
3. Accessibility (a11y) first: semantic HTML, ARIA roles when needed, and full keyboard support.
4. Desktop-first packaging: PWA/web offline artifacts have been archived (see notes below). Development should assume the Electron environment unless you are explicitly working on web/PWA features.

### PWA/archive note
- The web manifest and service worker are archived in `_archived_cleanout/pwa/`. If you're restoring web/PWA support you'll need to:
  1. Move `manifest.json` and `service-worker.js` back to the project root.
  2. Re-add the `<link rel="manifest">` line to `index.html` and restore service worker registration (the original implementation is available in the archive for reference).
  3. Update `session-wizard-desktop-build` packaging (if needed) and CI to include/exclude files appropriately.

### Repository layout (active)
```
index.html                # Dashboard
assets/                   # Shared styling, icons, fonts, core scripts
tools/                    # Individual tool modules
session-wizard-desktop-build/  # Electron wrapper and build scripts
```

Archival content is stored in `_archived_cleanout/`.

### Naming & style conventions (short)
- IDs: tool-scoped when possible (`pmCreatedDate`)
- Classes: kebab-case with optional tool prefix (`sgb-drop-block`)
- JS: lowerCamelCase for functions, SCREAMING_SNAKE_CASE for constants
- Files: kebab-case (`goal-builder.js`)

### JavaScript guidelines
1. Each top-level script should include a header comment explaining purpose and side effects.
2. Avoid global scope pollution; prefer module patterns or closures.
3. Put truly shared code in `assets/js/` (e.g., `dom-utils.js`, `data-utils.js`).
4. Use feature detection before using browser APIs.

### CSS guidelines
1. Prefer CSS variables for theme/colors.
2. Scope dark-theme rules using `[data-theme="dark"]`.

### Adding a new tool (summary)
1. Create `tools/<new-tool>/` with `index.html`, `<tool>.js`, and optional `<tool>.css`.
2. Follow existing layout patterns and accessibility conventions.
3. Add a navigation entry to `index.html` and ensure assets are included in the desktop build if the tool should ship with the app.
4. Document the tool in `docs/README.md` and in the top-level `CHANGELOG.md` for release notes.

### Desktop packaging notes
- When adding files that must be included in the distributable, update `session-wizard-desktop-build/package.json` (`build.files`) and/or `session-wizard-desktop-build/electron-builder.yml`.

### Commit message guidance
Use short, scoped messages when possible, e.g. `feat(goal-builder): add gas export` or `fix(homework-tracker): printing layout`.

### Testing checklist (manual)
1. Launch Electron locally (`session-wizard-desktop-build` → `npm run start`).
2. Load each tool and exercise key flows (print/export, clipboard, saving templates).
3. Test keyboard-only navigation and basic a11y expectations.

### Reporting bugs & PR etiquette
- Open an issue with steps to reproduce, expected vs actual, environment (OS, Electron/version if relevant), and console output if applicable.
- PRs should target `main` with a clear summary and, where relevant, a short list of manual test steps.

---
Thanks for contributing — keep changes small, documented, and accessible.
