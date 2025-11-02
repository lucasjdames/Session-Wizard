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


release.cjs
===========

Automates the full release workflow (version bump, build, git tag, push, and GitHub release upload).

Usage (from the repository root):

```
npm run release -- <version>
```

Examples:

- Dry run to preview commands: `npm run release -- 1.2.2 --dry-run`
- Release with custom notes file: `npm run release -- 1.2.2 --notes-file docs/RELEASE_NOTES.md`

Main steps performed:

- Updates root and desktop `package.json` + lockfiles via `npm version --no-git-tag-version`.
- Refreshes `about.html` and `assets/js/app-meta.js` with the new version string.
- Runs `npm run clean` and the Electron build (unless `--skip-build` is passed).
- Commits changes, tags `v<version>`, and pushes to `origin` (unless `--skip-push`).
- Creates a GitHub release attaching the latest NSIS installer and blockmap (unless `--skip-upload`).
- Cleans local `dist/` artifacts unless `--keep-dist` is supplied.

Release notes default to the `docs/CHANGELOG.md` section for the requested version; override with `--notes` or `--notes-file`.
