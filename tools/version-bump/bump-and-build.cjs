#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

function usage() {
  console.log('Usage: node bump-and-build.cjs <version> [--dry-run]');
  console.log('\nUpdates session-wizard-desktop-build/package.json and about.html to the given version, then runs the desktop build.');
}

const args = process.argv.slice(2);
if (args.length === 0) {
  usage();
  process.exit(1);
}

const newVersion = args[0];
const dryRun = args.includes('--dry-run');

// Basic semver-ish check
if (!/^\d+\.\d+\.\d+(?:-.+)?$/.test(newVersion)) {
  console.error('Error: version should look like MAJOR.MINOR.PATCH (e.g. 1.2.3)');
  process.exit(2);
}

const repoRoot = path.resolve(__dirname, '..', '..');
const desktopPkgPath = path.join(repoRoot, 'session-wizard-desktop-build', 'package.json');
const aboutPath = path.join(repoRoot, 'about.html');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

console.log('Version bump script');
console.log('Target version:', newVersion);
console.log(dryRun ? 'Dry run: no files will be written.' : 'Applying changes...');

// Update desktop package.json
const desktopPkg = readJson(desktopPkgPath);
const desktopPkgOldVersion = desktopPkg.version || '(none)';
console.log('Desktop package.json current version:', desktopPkgOldVersion);

desktopPkg.version = newVersion;
if (!desktopPkg.build) desktopPkg.build = {};
if (!desktopPkg.build.extraMetadata) desktopPkg.build.extraMetadata = {};
desktopPkg.build.extraMetadata.version = newVersion;

if (dryRun) {
  console.log('\n[DRY RUN] Would write to', desktopPkgPath);
  console.log(JSON.stringify({version: desktopPkg.version, extraMetadataVersion: desktopPkg.build.extraMetadata.version}, null, 2));
} else {
  writeJson(desktopPkgPath, desktopPkg);
  console.log('Wrote', desktopPkgPath);
}

// Update about.html version text
let aboutHtml = fs.readFileSync(aboutPath, 'utf8');
const versionLineRe = /(>\s*Version\s*)([0-9xA-Za-z+\-.]+)(\s*<)/i;
if (!versionLineRe.test(aboutHtml)) {
  console.warn('Warning: version line not found in about.html; no change made to about.html');
} else {
  aboutHtml = aboutHtml.replace(versionLineRe, `$1${newVersion}$3`);
  if (dryRun) {
    console.log('\n[DRY RUN] Would update about.html version line to:', newVersion);
  } else {
    fs.writeFileSync(aboutPath, aboutHtml, 'utf8');
    console.log('Updated about.html');
  }
}

// Run build
if (!dryRun) {
  console.log('\nRunning desktop build... (this may take a while)');
  try {
    child_process.execSync('npm run build', {cwd: path.join(repoRoot, 'session-wizard-desktop-build'), stdio: 'inherit'});
    console.log('\nBuild finished. Check session-wizard-desktop-build/dist for artifacts.');
  } catch (e) {
    console.error('\nBuild failed. See output above for details.');
    process.exit(e.status || 1);
  }
} else {
  console.log('\nDry run: skipping build.');
}

console.log('\nDone.');
