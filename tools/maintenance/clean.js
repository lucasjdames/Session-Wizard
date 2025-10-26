#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const targets = [
  path.join(repoRoot, 'session-wizard-desktop-build', 'dist'),
  path.join(repoRoot, 'session-wizard-desktop-build', 'builder-debug.yml'),
  path.join(repoRoot, 'session-wizard-desktop-build', 'builder-effective-config.yaml'),
  path.join(repoRoot, 'session-wizard-desktop-build', 'Session Wizard Setup *.exe'),
  path.join(repoRoot, 'session-wizard-desktop-build', 'Session Wizard Setup *.exe.blockmap')
];

function removeTarget(targetPath) {
  if (targetPath.includes('*')) {
  const dir = path.dirname(targetPath);
  const escaped = path.basename(targetPath).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp('^' + escaped.replace(/\\\*/g, '.*') + '$');
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      if (pattern.test(entry)) {
        remove(fullPath);
      }
    }
    return;
  }
  remove(targetPath);
}

function remove(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return;
  }
  const stats = fs.statSync(targetPath);
  if (stats.isDirectory()) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  } else {
    fs.rmSync(targetPath, { force: true });
  }
  console.log('Removed', path.relative(repoRoot, targetPath));
}

targets.forEach(removeTarget);

console.log('Cleanup complete.');
