#!/usr/bin/env node
// Release automation script for Session Wizard
// Usage: npm run release -- <version> [options]
// Options:
//   --dry-run           : Preview commands without writing files or running builds
//   --skip-build        : Skip build steps
//   --skip-push         : Skip git push/tag
//   --skip-upload       : Skip GitHub release upload
//   --keep-dist         : Keep generated dist/ artifacts
//   --notes <text>      : Inline release notes text
//   --notes-file <path> : Path to markdown file with release notes

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: npm run release -- <version> [options]');
  process.exit(1);
}

const versionArgIndex = args.findIndex(arg => !arg.startsWith('--'));
if (versionArgIndex === -1) {
  console.error('Error: version argument (e.g. 1.3.0) is required.');
  process.exit(1);
}

const targetVersion = args[versionArgIndex];
const flags = new Set(args.filter(arg => arg.startsWith('--')));
const getFlagValue = (flagName) => {
  const idx = args.indexOf(flagName);
  if (idx === -1 || idx === args.length - 1) return null;
  return args[idx + 1];
};

const dryRun = flags.has('--dry-run');
const skipBuild = flags.has('--skip-build');
const skipPush = flags.has('--skip-push');
const skipUpload = flags.has('--skip-upload');
const keepDist = flags.has('--keep-dist');
const allowDirty = flags.has('--allow-dirty');
const notesFlag = getFlagValue('--notes');
const notesFileFlag = getFlagValue('--notes-file');

if (!/^\d+\.\d+\.\d+(?:-.+)?$/.test(targetVersion)) {
  console.error('Error: version should look like MAJOR.MINOR.PATCH (e.g. 1.3.0)');
  process.exit(2);
}

const repoRoot = path.resolve(__dirname, '..', '..');
const desktopDir = path.join(repoRoot, 'session-wizard-desktop-build');
const distDir = path.join(desktopDir, 'dist');

const run = (command, options = {}) => {
  const opts = { stdio: 'inherit', shell: true, ...options };
  if (dryRun) {
    console.log(`[dry-run] ${command}`);
    return { status: 0 };
  }
  console.log(`$ ${command}`);
  const result = spawnSync(command, { ...opts });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command}`);
  }
  return result;
};

const readFile = (filePath) => fs.readFileSync(filePath, 'utf8');
const writeFile = (filePath, contents) => {
  if (dryRun) {
    console.log(`[dry-run] write ${filePath}`);
  } else {
    fs.writeFileSync(filePath, contents, 'utf8');
  }
};

const ensureCleanGit = () => {
  if (allowDirty) {
    console.log('Skipping clean git check (--allow-dirty)');
    return;
  }
  const status = execSync('git status --porcelain', { cwd: repoRoot }).toString().trim();
  if (status) {
    console.error('Git working tree is not clean. Commit or stash changes before releasing.');
    console.error(status);
    process.exit(3);
  }
};

const bumpRootPackageVersion = () => {
  const pkgPath = path.join(repoRoot, 'package.json');
  const pkg = JSON.parse(readFile(pkgPath));
  pkg.version = targetVersion;
  writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  const lockPath = path.join(repoRoot, 'package-lock.json');
  if (fs.existsSync(lockPath)) {
    const lock = JSON.parse(readFile(lockPath));
    lock.version = targetVersion;
    if (lock.packages && lock.packages['']) {
      lock.packages[''].version = targetVersion;
    }
    writeFile(lockPath, JSON.stringify(lock, null, 2) + '\n');
  }
};

const bumpDesktopPackageVersion = () => {
  const pkgPath = path.join(desktopDir, 'package.json');
  const pkg = JSON.parse(readFile(pkgPath));
  pkg.version = targetVersion;
  if (!pkg.build) pkg.build = {};
  if (!pkg.build.extraMetadata) pkg.build.extraMetadata = {};
  pkg.build.extraMetadata.version = targetVersion;
  writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  const lockPath = path.join(desktopDir, 'package-lock.json');
  if (fs.existsSync(lockPath)) {
    const lock = JSON.parse(readFile(lockPath));
    lock.version = targetVersion;
    if (lock.packages && lock.packages['']) {
      lock.packages[''].version = targetVersion;
    }
    writeFile(lockPath, JSON.stringify(lock, null, 2) + '\n');
  }
};

const updateAboutHtml = () => {
  const aboutPath = path.join(repoRoot, 'about.html');
  let html = readFile(aboutPath);
  const regex = /(>\s*Version\s*)([0-9xA-Za-z+\-.]+)(\s*<)/i;
  if (!regex.test(html)) {
    console.warn('Warning: could not find version line in about.html');
    return;
  }
  html = html.replace(regex, `$1${targetVersion}$3`);
  writeFile(aboutPath, html);
};

const updateAppMeta = () => {
  const metaPath = path.join(repoRoot, 'assets', 'js', 'app-meta.js');
  let contents = readFile(metaPath);
  contents = contents.replace(/version = '([^']+)'/, `version = '${targetVersion}'`);
  writeFile(metaPath, contents);
};

const collectReleaseNotes = () => {
  if (notesFlag) return notesFlag;
  if (notesFileFlag) {
    const notesPath = path.resolve(repoRoot, notesFileFlag);
    if (!fs.existsSync(notesPath)) {
      throw new Error(`Notes file not found: ${notesPath}`);
    }
    return readFile(notesPath);
  }

  const changelogPath = path.join(repoRoot, 'docs', 'CHANGELOG.md');
  if (!fs.existsSync(changelogPath)) {
    return `Release ${targetVersion}`;
  }
  const changelog = readFile(changelogPath);
  const escapedVersion = targetVersion.replace(/\./g, '\\.');
  const sectionRegex = new RegExp('## \\[' + escapedVersion + '\\][\\s\\S]*?(?=\\n## \\[|$)', 'm');
  const match = changelog.match(sectionRegex);
  if (match) {
    return match[0];
  }
  return `Release ${targetVersion}`;
};

const runBuild = () => {
  if (skipBuild) {
    console.log('Skipping build (--skip-build)');
    return;
  }
  run('npm run clean', { cwd: repoRoot });
  run('npm install --production', { cwd: desktopDir });
  run('npm run build', { cwd: desktopDir });
};

const gitCommitAndTag = () => {
  run('git add .', { cwd: repoRoot });
  let staged = '';
  try {
    staged = execSync('git diff --cached --name-only', { cwd: repoRoot }).toString().trim();
  } catch (err) {
    staged = '';
  }
  if (staged) {
    run(`git commit -m "chore(release): v${targetVersion}"`, { cwd: repoRoot });
  } else {
    console.log('No staged changes to commit; skipping commit step.');
  }
  run(`git tag -f v${targetVersion}`, { cwd: repoRoot });
  if (!skipPush) {
    run('git push', { cwd: repoRoot });
    run(`git push origin v${targetVersion} --force`, { cwd: repoRoot });
  } else {
    console.log('Skipping git push (--skip-push)');
  }
};

const createGitHubRelease = (notes) => {
  if (skipUpload) {
    console.log('Skipping GitHub release upload (--skip-upload)');
    return;
  }
  if (!fs.existsSync(distDir)) {
    console.warn('dist directory not found; skipping GitHub release upload');
    return;
  }
  const entries = fs.readdirSync(distDir)
    .filter(name => !name.endsWith('.yaml'))
    .map(name => ({
      name,
      fullPath: path.join(distDir, name),
    }));
  const files = entries.filter(entry => {
    const isFile = fs.statSync(entry.fullPath).isFile();
    if (!isFile) {
      console.log(`Skipping non-file artifact: ${entry.name}`);
    }
    return isFile;
  });
  if (files.length === 0) {
    console.warn('No files found in dist/ to upload. Skipping GitHub release.');
    return;
  }
  const ghToken = process.env.GITHUB_TOKEN;
  const remoteUrl = execSync('git config --get remote.origin.url', { cwd: repoRoot }).toString().trim();
  const repoMatch = remoteUrl.match(/github.com[:/](.+)\/(.+?)(\.git)?$/i);
  if (!ghToken || !repoMatch) {
    console.warn('Missing GITHUB_TOKEN or cannot parse GitHub repo; skipping upload.');
    return;
  }
  const owner = repoMatch[1];
  const repo = repoMatch[2].replace(/\.git$/, '');
  const tagName = `v${targetVersion}`;

  const bodyFile = path.join(distDir, `release-notes-${targetVersion}.md`);
  writeFile(bodyFile, notes);

  const assetArgs = files.map(f => `"${f.fullPath}"`);
  const ghCmd = `gh release create ${tagName} ${assetArgs.join(' ')} --title "Session Wizard ${targetVersion}" --notes-file "${bodyFile}"`;
  run(ghCmd, { cwd: repoRoot, env: { ...process.env, GITHUB_TOKEN: ghToken } });
};

const cleanDist = () => {
  if (keepDist || dryRun) {
    console.log(keepDist ? 'Keeping dist/ (--keep-dist)' : 'Dry-run: keeping dist/');
    return;
  }
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
    console.log('Removed dist/ artifacts');
  }
};

(async () => {
  try {
    console.log(`Starting release v${targetVersion}${dryRun ? ' (dry-run)' : ''}`);
    ensureCleanGit();

    bumpRootPackageVersion();
    bumpDesktopPackageVersion();
    updateAboutHtml();
    updateAppMeta();

    runBuild();

    const releaseNotes = collectReleaseNotes();

    gitCommitAndTag();
    createGitHubRelease(releaseNotes);
    cleanDist();

    console.log('Release workflow complete.');
  } catch (err) {
    console.error('Release failed:', err.message);
    process.exit(1);
  }
})();
