## Contributing to Session Wizard

Thank you for your interest in improving Session Wizard. This project is a static, browser‑only toolkit (no Electron runtime) intended to stay lightweight, dependency‑minimal, and easily auditable.

### Core Principles
1. Zero external runtime dependencies (no build step required).
2. Keep tools self‑contained but share common DOM utilities where duplication would otherwise occur.
3. Preserve offline capability (update `service-worker.js` when adding/removing shipped assets).
4. Favor progressive enhancement: all critical interactions should degrade gracefully without JavaScript.
5. Accessibility (a11y) and semantic HTML are first‑class: use appropriate roles, labels, and keyboard operability.

### Repository Layout (Active)
```
index.html                # Dashboard
assets/                   # Shared styling, icons, fonts, core scripts
tools/
  goal-builder/           # SMART + Goal Attainment Scale combined tool
  progress-monitor/       # Longitudinal performance tracking
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

### Commit Messages
Format (recommended, not enforced):
```
feat(tool): short description
fix(progress-monitor): handle empty date import
docs: add contribution guidelines
refactor: extract textarea auto-resize
chore: bump cache version
```

### Performance & Size
Given fully static hosting, prioritize:
* Avoiding large inlined base64 assets.
* Bounding script parse cost—defer splitting giant files only if maintainability demands it.

### Testing Manual Checklist (Until Automated Tests Added)
After changes:
1. Load each tool directly.
2. Use textarea operations (auto-resize still works).
3. Trigger print/clipboard exports.
4. Toggle theme (once re-enabled) to ensure no regressions.
5. Reload offline (after first load) to verify service worker still serves shell.

### Reporting Issues
Open an issue describing:
* Expected vs actual behavior
* Steps to reproduce
* Browser + version
* Console errors (if any)

### Future Enhancements (Not Commitments)
* Break up `therapy-data-session-taker.js` into modules.
* Add automated smoke tests (Playwright) for core workflows.
* Add accessible skip links & ARIA refinements.

---
Thank you for keeping the project lean, clear, and clinician-friendly.