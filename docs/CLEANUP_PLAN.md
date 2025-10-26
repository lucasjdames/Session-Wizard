# Storage Optimization Plan

This document lists the actions taken to reduce the installer footprint without altering runtime behaviour.

## Completed Actions

- Removed editor backup artefacts (`assets/img/*~`) that duplicated shipping icons.
- Tightened the Electron packaging manifest so the installer now bundles only the runtime HTML, assets, tool scripts, and preload files. Development collateral such as `_archive/`, `docs/`, build outputs, local node modules, and log files are now excluded.
- Dropped the unused `jsdom` dependency from the root project and added `npm run clean` to clear build artefacts (`tools/maintenance/clean.js`).
- Removed the legacy `service-worker.js` to avoid shipping unused PWA code in desktop builds.

## Verification Checklist

After each cleanup pass, run the following to confirm nothing regressed:

1. `npm install` (root and `session-wizard-desktop-build/`) if dependencies changed.
2. Launch the desktop shell from `session-wizard-desktop-build/` with `npm run start`; ensure tools and icons load correctly.
3. Exercise print/export flows in Progress Monitor and Therapy Data Session Taker.
4. Build the installer with `npm run build` and launch the generated setup once to confirm installation succeeds.

## Future Opportunities

- Lossless compression for PNG/ICO assets (e.g., `oxipng --strip safe assets/img/*.png`).
- Lazy-load large datasets (Speech Deck stimuli) from JSON files to shrink the JS bundle.
- Add a CI size budget that alerts when the installer exceeds the agreed target.
