This folder contains archived PWA-related files removed from the active app when switching to desktop-only packaging.

- manifest.json
- service-worker.js

These were moved here to keep a reversible history in the repository. If you need to restore PWA support, move the files back to the project root and restore references in `index.html` and build configs.
