bump-and-build
================

This tiny script updates the desktop packaging version and runs the Windows NSIS build.

Usage

From the repository root:

node tools/version-bump/bump-and-build.cjs 1.2.3

Options:

--dry-run  : preview changes without writing files or running the build

What it does

- Updates `session-wizard-desktop-build/package.json` version and `build.extraMetadata.version`.
- Updates the `about.html` Version line.
- Runs `npm run build` inside `session-wizard-desktop-build`.
