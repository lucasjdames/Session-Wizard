const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

// Small utilities
function escapeHtmlForFile(str){
  return String(str || '').replace(/[&<>"']/g, function(c){
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
  });
}
function locationHrefForMain() { try { return `file://${path.join(__dirname, '..', 'index.html')}`; } catch (e) { return 'file://'; } }

async function fetchTextFromUrl(url) {
  return new Promise((resolve) => {
    try {
      const lib = url.startsWith('https') ? require('https') : require('http');
      lib.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk.toString());
        res.on('end', () => resolve(data));
      }).on('error', () => resolve(''));
    } catch (e) { resolve(''); }
  });
}

async function fetchBinaryFromUrl(url) {
  return new Promise((resolve) => {
    try {
      const lib = url.startsWith('https') ? require('https') : require('http');
      lib.get(url, (res) => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', () => resolve(null));
    } catch (e) { resolve(null); }
  });
}

function mimeTypeForFilename(name){
  const ext = String(name || '').split('.').pop().toLowerCase();
  switch(ext){
    case 'woff2': return 'font/woff2';
    case 'woff': return 'font/woff';
    case 'ttf': return 'font/ttf';
    case 'otf': return 'font/otf';
    case 'eot': return 'application/vnd.ms-fontobject';
    case 'svg': return 'image/svg+xml';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    default: return 'application/octet-stream';
  }
}

async function inlineFontsInCss(cssText, baseHref) {
  if (!cssText) return cssText || '';
  // avoid inlining entire HTML if accidentally passed
  if (/\<\s*html/i.test(cssText)) return '';
  const urlRegex = /url\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let m;
  while ((m = urlRegex.exec(cssText)) !== null) {
    parts.push(cssText.slice(lastIndex, m.index));
    lastIndex = m.index + m[0].length;
    let raw = m[1].trim().replace(/^['\"]|['\"]$/g, '');
    try {
      if (raw.startsWith('//')) raw = 'https:' + raw;
      let resolved = raw;
      if (baseHref) { try { resolved = new URL(raw, baseHref).toString(); } catch(e) { resolved = raw; } }
      if (/^data:/i.test(resolved)) { parts.push(`url("${resolved}")`); continue; }

      // local file path (file:// or absolute)
      if (/^file:\/\//i.test(resolved) || path.isAbsolute(resolved)) {
        let local = resolved.replace(/^file:\/\//i, '');
        if (process.platform === 'win32' && local.startsWith('/')) local = local.slice(1);
        if (fs.existsSync(local)) { const buf = fs.readFileSync(local); const mime = mimeTypeForFilename(local); const dataUrl = `data:${mime};base64,${buf.toString('base64')}`; parts.push(`url("${dataUrl}")`); continue; }
      }

      // project relative
      const projectRoot = path.resolve(__dirname, '..');
      const candidateLocal = path.join(projectRoot, raw.replace(/^[./\\]+/, ''));
      if (fs.existsSync(candidateLocal)) { const buf = fs.readFileSync(candidateLocal); const mime = mimeTypeForFilename(candidateLocal); const dataUrl = `data:${mime};base64,${buf.toString('base64')}`; parts.push(`url("${dataUrl}")`); continue; }

      // remote fetch
      if (/^https?:\/\//i.test(resolved)) {
        const bin = await fetchBinaryFromUrl(resolved);
        if (bin && bin.length > 0) { const mime = mimeTypeForFilename(resolved); const dataUrl = `data:${mime};base64,${bin.toString('base64')}`; parts.push(`url("${dataUrl}")`); continue; }
      }

      // fallback: keep original
      parts.push(`url("${raw}")`);
    } catch (e) { parts.push(`url("${raw}")`); }
  }
  parts.push(cssText.slice(lastIndex));
  return parts.join('');
}

// Create main application window
function createWindow() {
  // Choose platform-appropriate icon: ICO for Windows, ICNS for macOS, PNG fallback for others
  let windowIcon = path.join(__dirname, '..', 'assets', 'img', 'icon-512.png');
  try {
    if (process.platform === 'win32') windowIcon = path.join(__dirname, '..', 'assets', 'img', 'icon-192.ico');
    else if (process.platform === 'darwin') windowIcon = path.join(__dirname, '..', 'assets', 'img', 'icon-512.icns');
  } catch (e) {}

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    // Platform-appropriate icon for runtime
    icon: windowIcon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  const indexPath = path.join(__dirname, '..', 'index.html');
  win.loadFile(indexPath).catch(() => win.loadURL(locationHrefForMain()));

  // Ensure the webContents regain focus when the window is shown, restored, or focused.
  // This helps avoid a state on some platforms where inputs become uneditable until
  // the window is minimized/restored (which forces a focus change).
  const refocus = () => {
    try {
      if (!win.isDestroyed()) {
        // First ensure the native window has focus
        try { win.focus(); } catch (e) {}
        // Then ensure the renderer receives keyboard focus
        try { win.webContents.focus(); } catch (e) {}
      }
    } catch (e) { /* ignore */ }
  };

  win.on('show', refocus);
  win.on('restore', refocus);
  win.on('focus', refocus);
}

app.whenReady().then(() => { createWindow(); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); }); });
// When any BrowserWindow gains focus, make sure its webContents are focused too.
app.on('browser-window-focus', (event, window) => {
  try {
    if (window && !window.isDestroyed()) {
      try { window.focus(); } catch (e) {}
      try { window.webContents && window.webContents.focus(); } catch (e) {}
    }
  } catch (e) {}
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// Dialog handlers
ipcMain.handle('dialog:openFile', async (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const res = await dialog.showOpenDialog(win, Object.assign({ properties: ['openFile'] }, options));
  if (res.canceled) return { canceled: true, filePaths: [] };
  return { canceled: false, filePaths: res.filePaths };
});

ipcMain.handle('dialog:saveFile', async (event, { defaultPath, filters, data, encoding = 'utf8' }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const res = await dialog.showSaveDialog(win, { defaultPath, filters });
  if (res.canceled || !res.filePath) return { canceled: true };
  try { await fs.promises.writeFile(res.filePath, data, { encoding }); return { canceled: false, filePath: res.filePath }; } catch (err) { return { canceled: true, error: err.message }; }
});

ipcMain.handle('window:printToPDF', async (event, options = {}) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  try { const pdfData = await win.webContents.printToPDF(Object.assign({ printBackground: true }, options)); return { success: true, data: pdfData }; } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('window:printHtmlToPdfPreview', async (event, { title = 'Print', headHtml = '', bodyHtml = '' } = {}) => {
  try {
    const offscreen = new BrowserWindow({ show: false, webPreferences: { offscreen: false, contextIsolation: true, nodeIntegration: false } });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtmlForFile(title)}</title>${headHtml}</head><body>${bodyHtml}</body></html>`;
    const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
    await offscreen.loadURL(dataUrl);
    await new Promise(resolve => setTimeout(resolve, 250));
    const pdfBuffer = await offscreen.webContents.printToPDF({ printBackground: true });
    const tmpDir = os.tmpdir();
    const tmpName = `session-wizard-pdf-${crypto.randomBytes(6).toString('hex')}.pdf`;
    const tmpPath = path.join(tmpDir, tmpName);
    await fs.promises.writeFile(tmpPath, pdfBuffer);
    const preview = new BrowserWindow({ width: 1000, height: 800, webPreferences: { contextIsolation: true, nodeIntegration: false } });
    await preview.loadURL(`file://${tmpPath}`);
    preview.on('closed', () => { try { fs.unlinkSync(tmpPath); } catch (e) {} });
    try { offscreen.close(); } catch (e) {}
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
});

// More robust preview that inlines stylesheets and fonts
ipcMain.handle('window:printHtmlToPdfPreviewFiles', async (event, { title = 'Print', headHtml = '', bodyHtml = '', stylesheetHrefs = [] } = {}) => {
  try {
    const projectRoot = path.resolve(__dirname, '..');
    let combinedHead = `<base href="${locationHrefForMain()}">` + (headHtml || '');

    // Prioritize known homework tracker and main app styles and google fonts
    const prioritized = [];
    (stylesheetHrefs || []).forEach(h => { const s = String(h || '').toLowerCase(); if (s.includes('homework-tracker.css') || s.includes('/assets/css/main.css') || s.includes('fonts.googleapis.com')) prioritized.push(h); });
    prioritized.push(path.join(projectRoot, 'tools', 'homework-tracker', 'homework-tracker.css'));
    prioritized.push(path.join(projectRoot, 'assets', 'css', 'main.css'));

    const combinedList = Array.from(new Set([ ...prioritized.filter(Boolean), ...(stylesheetHrefs || []) ]));

    for (let rawHref of combinedList) {
      try {
        if (!rawHref) continue;
        let href = String(rawHref).split('#')[0].split('?')[0].trim();

        // absolute/local path
        if (href && (href.includes(path.sep) || path.isAbsolute(href) || /^[a-zA-Z]:\\/.test(href))) {
          if (fs.existsSync(href)) { const txt = await fs.promises.readFile(href, 'utf8'); const inlined = await inlineFontsInCss(txt, locationHrefForMain()); combinedHead += `<style>${inlined}</style>`; continue; }
        }

        // remote CSS
        if (/^https?:\/\//i.test(href)) { const text = await fetchTextFromUrl(href); if (text) { const inlined = await inlineFontsInCss(text, href); combinedHead += `<style>${inlined}</style>`; } continue; }

        // file://
        if (href.startsWith('file://')) { const local = href.replace(/^file:\/\//i, ''); const candidate = process.platform === 'win32' && local.startsWith('/') ? local.slice(1) : local; if (fs.existsSync(candidate)) { const rawtxt = await fs.promises.readFile(candidate, 'utf8'); const inlined = await inlineFontsInCss(rawtxt, locationHrefForMain()); combinedHead += `<style>${inlined}</style>`; continue; } }

        // try some project-relative candidates
        const clean = href.replace(/^[./\\]+/, '');
        const candidates = [ path.join(projectRoot, clean), path.join(projectRoot, 'assets', clean), path.resolve(projectRoot, href) ];
        if (path.isAbsolute(href)) candidates.push(href);

        let found = false;
        for (const candidate of candidates) {
          if (candidate && fs.existsSync(candidate)) { try { const txt = await fs.promises.readFile(candidate, 'utf8'); const inlined = await inlineFontsInCss(txt, locationHrefForMain()); combinedHead += `<style>${inlined}</style>`; found = true; break; } catch (e) {} }
        }

        if (!found) {
          try { const base = locationHrefForMain(); const abs = new URL(href, base).toString(); if (/^https?:\/\//i.test(abs)) { const text = await fetchTextFromUrl(abs); if (text) { const inlined = await inlineFontsInCss(text, abs); combinedHead += `<style>${inlined}</style>`; } } } catch (e) {}
        }
      } catch (e) { /* ignore per-stylesheet errors */ }
    }

    // final html render
    const offscreen = new BrowserWindow({ show: false, webPreferences: { offscreen: false, contextIsolation: true, nodeIntegration: false } });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtmlForFile(title)}</title>${combinedHead}</head><body>${bodyHtml}</body></html>`;
    const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
    await offscreen.loadURL(dataUrl);
    await new Promise(resolve => setTimeout(resolve, 300));
    const pdfBuffer = await offscreen.webContents.printToPDF({ printBackground: true });
    const tmpDir = os.tmpdir();
    const tmpName = `session-wizard-pdf-${crypto.randomBytes(6).toString('hex')}.pdf`;
    const tmpPath = path.join(tmpDir, tmpName);
    await fs.promises.writeFile(tmpPath, pdfBuffer);
    const preview = new BrowserWindow({ width: 1000, height: 800, webPreferences: { contextIsolation: true, nodeIntegration: false } });
    await preview.loadURL(`file://${tmpPath}`);
    preview.on('closed', () => { try { fs.unlinkSync(tmpPath); } catch (e) {} });
    try { offscreen.close(); } catch (e) {}
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
});
