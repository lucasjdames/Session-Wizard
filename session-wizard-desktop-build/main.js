const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

// Determine a platform-appropriate runtime icon once and reuse it for all
// programmatically-created windows (prevents Electron's default icon from
// appearing for transient print/preview windows on Windows).
const runtimeIcon = (() => {
  let icon = path.join(__dirname, '..', 'assets', 'img', 'icon-512.png');
  try {
    if (process.platform === 'win32') icon = path.join(__dirname, '..', 'assets', 'img', 'icon-192.ico');
    else if (process.platform === 'darwin') icon = path.join(__dirname, '..', 'assets', 'img', 'icon-512.icns');
  } catch (e) {}
  return icon;
})();

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
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    // Platform-appropriate icon for runtime
    icon: runtimeIcon,
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
  return win;
}

// Optional automated smoke test (no dialogs) when SW_SMOKE_TEST=1 is set in env
async function runSmokeTest(win) {
  try {
    console.log('SW: smoke test starting');
    // Give renderer a moment to fully initialize
    await new Promise(r => setTimeout(r, 800));
    // Ask renderer to produce a snapshot
    const snap = await win.webContents.executeJavaScript('window.TherapyDataSnapshot && window.TherapyDataSnapshot.prepareSnapshot ? window.TherapyDataSnapshot.prepareSnapshot() : null');
    if (!snap) { console.log('SW: no snapshot object returned'); return; }
    console.log('SW: snapshot received, components:', (snap.components || []).length);

    // Clear dropzone in renderer
    await win.webContents.executeJavaScript("(function(){const dz=document.getElementById('templateDropzone'); if(dz){ while(dz.firstChild) dz.removeChild(dz.firstChild);} return true; })()");
    console.log('SW: dropzone cleared');

    // Restore snapshot in renderer by injecting the snapshot JSON
    const snapJson = JSON.stringify(snap);
    const restored = await win.webContents.executeJavaScript(`(function(s){ try{ return !!(window.TherapyDataSnapshot && window.TherapyDataSnapshot.restoreSnapshot(s)); } catch(e) { return { error: String(e) }; } })(${snapJson})`);
    console.log('SW: restore result ->', restored);
  } catch (e) {
    console.error('SW: smoke test error', e);
  }
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

// Application menu (File > Save Session / Load Session) + Developer Tools
try {
  const { Menu } = require('electron');
  const isMac = process.platform === 'darwin';
  const template = [
    // App menu (macOS)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Save Page...',
          accelerator: isMac ? 'CmdOrCtrl+S' : 'Ctrl+S',
          click: (menuItem, browserWindow) => {
            if (browserWindow && browserWindow.webContents) browserWindow.webContents.send('menu:save-session');
          }
        },
        {
          label: 'Load Page...',
          accelerator: isMac ? 'CmdOrCtrl+O' : 'Ctrl+O',
          click: (menuItem, browserWindow) => {
            if (browserWindow && browserWindow.webContents) browserWindow.webContents.send('menu:load-session');
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit', label: 'Exit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
} catch (e) {
  // If menu building fails, continue silently
}

// Add Help menu (cross-platform) with About and Online Documentation
try {
  const { shell, Menu, MenuItem } = require('electron');
  const isMac = process.platform === 'darwin';
  const helpMenu = {
    label: 'Help',
    submenu: [
      {
        label: 'About',
        click: async (menuItem, browserWindow) => {
          try {
            // Determine current UI theme from the focused renderer (localStorage/data-theme/matchMedia)
            let uiTheme = 'light';
            try {
              const sourceWin = browserWindow || BrowserWindow.getFocusedWindow();
              if (sourceWin && !sourceWin.isDestroyed() && sourceWin.webContents) {
                try {
                  uiTheme = await sourceWin.webContents.executeJavaScript(`(function(){
                    try{
                      const k = 'session-wizard-theme';
                      try { const v = localStorage.getItem(k); if (v) return v; } catch(e) {}
                      try { const attr = document.documentElement && document.documentElement.getAttribute && document.documentElement.getAttribute('data-theme'); if (attr) return attr; } catch(e) {}
                      try { if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'; } catch(e) {}
                    } catch(e) {}
                    return 'light';
                  })()`);
                } catch (e) { uiTheme = 'light'; }
              }
            } catch (e) { uiTheme = 'light'; }
            // Read package metadata (prefer desktop-build package.json)
            let pkg = null;
            try {
              const desktopPkgPath = path.join(__dirname, 'package.json');
              if (fs.existsSync(desktopPkgPath)) pkg = JSON.parse(fs.readFileSync(desktopPkgPath, 'utf8'));
            } catch (e) {}
            if (!pkg) {
              try { const rootPkgPath = path.join(__dirname, '..', 'package.json'); if (fs.existsSync(rootPkgPath)) pkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8')); } catch (e) {}
            }
            const appName = (pkg && (pkg.productName || pkg.name)) || 'Session Wizard';
            const appVersion = (pkg && pkg.version) || '0.0.0';
            const appLicense = (pkg && pkg.license) || '';
            const appAuthor = (pkg && (pkg.author || pkg.author && pkg.author.name)) || '';

            // Choose a PNG/ICO for embedding in the HTML (use PNG as data URL for consistent in-renderer display)
            let iconFile = path.join(__dirname, '..', 'assets', 'img', 'icon-512.png');
            try { if (process.platform === 'win32') iconFile = path.join(__dirname, '..', 'assets', 'img', 'icon-192.png'); } catch (e) {}
            let iconDataUrl = '';
            try {
              if (fs.existsSync(iconFile)) {
                const buf = fs.readFileSync(iconFile);
                const mime = 'image/png';
                iconDataUrl = `data:${mime};base64,${buf.toString('base64')}`;
              }
            } catch (e) { iconDataUrl = ''; }

            // Build theme-appropriate CSS
            const isDark = String(uiTheme || '').toLowerCase() === 'dark';
            const css = isDark ? `:root{color-scheme: dark} body{font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial; margin:20px; color:#ddd; background:#0d0d0f} .card{max-width:760px;margin:0 auto;padding:20px;border-radius:12px;background:#0f1113;box-shadow:0 6px 22px rgba(0,0,0,0.6);} .header{display:flex;gap:16px;align-items:center} .logo{width:72px;height:72px;border-radius:12px;background:#0f1113;display:flex;align-items:center;justify-content:center;overflow:hidden} .logo img{width:100%;height:100%;object-fit:contain} h1{margin:0;font-size:20px} .meta{color:#aaa;margin-top:6px;font-size:13px} p{line-height:1.45;color:#ddd;margin-top:14px} .footer{margin-top:18px;border-top:1px solid rgba(255,255,255,0.04);padding-top:12px;color:#bbb;font-size:13px;display:flex;justify-content:space-between;align-items:center} a{color:#7fb1ff}` : `:root{color-scheme: light} body{font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial; margin:20px; color:#222; background: #f7f7f8} .card{max-width:760px;margin:0 auto;padding:20px;border-radius:12px;background:#ffffff;box-shadow:0 6px 22px rgba(0,0,0,0.08);} .header{display:flex;gap:16px;align-items:center} .logo{width:72px;height:72px;border-radius:12px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden} .logo img{width:100%;height:100%;object-fit:contain} h1{margin:0;font-size:20px} .meta{color:#666;margin-top:6px;font-size:13px} p{line-height:1.45;color:#333;margin-top:14px} .footer{margin-top:18px;border-top:1px solid rgba(0,0,0,0.06);padding-top:12px;color:#555;font-size:13px;display:flex;justify-content:space-between;align-items:center} a{color:#0060df}`;

            const aboutHtml = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>About ${escapeHtmlForFile(appName)}</title><style>${css}</style></head><body><div class="card"><div class="header"><div class="logo">${iconDataUrl?`<img src="${iconDataUrl}" alt="icon">`:' '}</div><div><h1>${escapeHtmlForFile(appName)}</h1><div class="meta">Version ${escapeHtmlForFile(appVersion)}${appAuthor?` — ${escapeHtmlForFile(appAuthor)}`:''}</div></div></div>
            <p>
              The Session Wizard is a toolkit designed to help clinicians with setting therapy goals, taking data in and outside of sessions, and tracking clients' progress. The tools provided are built to be cross-applicable for different clinical settings and interventions, but some components are intended for specific interventions from the world of speech-language pathology and cognitive rehabilitation.
            </p>
            <p>For full documentation and source code, visit <a href="https://github.com/lucasjdames/Session-Wizard" target="_blank" rel="noreferrer noopener">GitHub — Session Wizard</a>.</p>
            <div class="footer"><div>${appLicense?`License: ${escapeHtmlForFile(appLicense)}`:''}</div><div><a href="#" id="close">Close</a></div></div></div>
            <script>document.getElementById('close').addEventListener('click',()=>{ window.close(); });</script></body></html>`;

            // Create the about window. Prefer loading the local about.html file if it exists
            // so manual edits to about.html are immediately reflected. If not present,
            // fall back to the generated HTML data URL (previous behavior).
            const aboutWin = new BrowserWindow({
              width: 660,
              height: 420,
              resizable: false,
              minimizable: false,
              maximizable: false,
              title: `About ${appName}`,
              autoHideMenuBar: true,
              ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' } : {}),
              icon: iconFile,
              webPreferences: { contextIsolation: true, nodeIntegration: false }
            });
            aboutWin.setMenuBarVisibility(false);
            aboutWin.removeMenu && aboutWin.removeMenu();
            const aboutPath = path.join(__dirname, '..', 'about.html');
            try {
              if (fs.existsSync(aboutPath)) {
                // Load the local about.html so your manual edits are used
                aboutWin.loadFile(aboutPath).catch(() => {
                  // fallback to generated HTML if loading file fails for some reason
                  const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(aboutHtml);
                  aboutWin.loadURL(dataUrl).catch(()=>{});
                });
              } else {
                const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(aboutHtml);
                aboutWin.loadURL(dataUrl).catch(()=>{});
              }
            } catch (e) {
              // If fs checks throw for any reason, try the data URL as a fallback
              const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(aboutHtml);
              aboutWin.loadURL(dataUrl).catch(()=>{});
            }
          } catch (e) { /* ignore errors opening about */ }
        }
      },
      {
        label: 'Online Documentation',
        click: () => { try { shell.openExternal('https://github.com/lucasjdames/Session-Wizard'); } catch (e) {} }
      }
    ]
  };

  // Try to append the Help menu to the existing application menu if present,
  // otherwise set a new menu containing Help.
  try {
    const currentMenu = Menu.getApplicationMenu();
    if (currentMenu) {
      currentMenu.append(new MenuItem(helpMenu));
      Menu.setApplicationMenu(currentMenu);
    } else {
      const newMenu = Menu.buildFromTemplate([helpMenu]);
      Menu.setApplicationMenu(newMenu);
    }
  } catch (e) {
    // ignore menu manipulation errors
  }
} catch (e) { /* ignore help menu setup errors */ }

// Allow renderer to request reading a file path (sync via main process)
ipcMain.handle('file:read', async (event, filePath, encoding = 'utf8') => {
  try {
    if (!filePath) return { success: false, error: 'No filePath provided' };
    const data = await fs.promises.readFile(filePath, { encoding });
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

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
  const offscreen = new BrowserWindow({ show: false, icon: runtimeIcon, webPreferences: { offscreen: false, contextIsolation: true, nodeIntegration: false } });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtmlForFile(title)}</title>${headHtml}</head><body>${bodyHtml}</body></html>`;
    const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
    await offscreen.loadURL(dataUrl);
    await new Promise(resolve => setTimeout(resolve, 250));
    const pdfBuffer = await offscreen.webContents.printToPDF({ printBackground: true });
    const tmpDir = os.tmpdir();
    const tmpName = `session-wizard-pdf-${crypto.randomBytes(6).toString('hex')}.pdf`;
    const tmpPath = path.join(tmpDir, tmpName);
    await fs.promises.writeFile(tmpPath, pdfBuffer);
  const preview = new BrowserWindow({ width: 1000, height: 800, icon: runtimeIcon, webPreferences: { contextIsolation: true, nodeIntegration: false } });
    await preview.loadURL(`file://${tmpPath}`);
    preview.on('closed', () => { try { fs.unlinkSync(tmpPath); } catch (e) {} });
    try { offscreen.close(); } catch (e) {}
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
});

// Temporary snapshot storage (silent, background save/load to OS temp dir)
const SNAPSHOT_PREFIX = 'session-wizard-tmp-snap-';
function snapshotPathForKey(key) {
  const safe = (key || '').replace(/[^a-zA-Z0-9-_\.]/g, '_');
  const name = `${SNAPSHOT_PREFIX}${safe}.json`;
  return path.join(os.tmpdir(), name);
}

ipcMain.handle('snapshot:tempSave', async (event, key, data) => {
  try {
    const p = snapshotPathForKey(key);
    await fs.promises.writeFile(p, typeof data === 'string' ? data : JSON.stringify(data), { encoding: 'utf8' });
    return { success: true, path: p };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('snapshot:tempLoad', async (event, key) => {
  try {
    const p = snapshotPathForKey(key);
    const exists = fs.existsSync(p);
    if (!exists) return { success: false, missing: true };
    const txt = await fs.promises.readFile(p, { encoding: 'utf8' });
    try { return { success: true, data: JSON.parse(txt) }; } catch (e) { return { success: true, data: txt }; }
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('snapshot:tempClearAll', async () => {
  try {
    const tmp = os.tmpdir();
    const files = await fs.promises.readdir(tmp);
    const matches = files.filter(f => f && f.indexOf(SNAPSHOT_PREFIX) === 0);
    await Promise.all(matches.map(f => fs.promises.unlink(path.join(tmp, f)).catch(()=>{})));
    return { success: true, removed: matches.length };
  } catch (err) { return { success: false, error: err.message }; }
});

// Try to clear temp snapshots when app is quitting
try {
  const clearTempOnExit = async () => {
    try { const tmp = os.tmpdir(); const files = await fs.promises.readdir(tmp); const matches = files.filter(f => f && f.indexOf(SNAPSHOT_PREFIX) === 0); for (const f of matches) { try { await fs.promises.unlink(path.join(tmp, f)); } catch(e){} } } catch(e){}
  };
  app.on('before-quit', clearTempOnExit);
  app.on('window-all-closed', clearTempOnExit);
} catch (e) {}

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
  const offscreen = new BrowserWindow({ show: false, icon: runtimeIcon, webPreferences: { offscreen: false, contextIsolation: true, nodeIntegration: false } });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtmlForFile(title)}</title>${combinedHead}</head><body>${bodyHtml}</body></html>`;
    const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
    await offscreen.loadURL(dataUrl);
    await new Promise(resolve => setTimeout(resolve, 300));
    const pdfBuffer = await offscreen.webContents.printToPDF({ printBackground: true });
    const tmpDir = os.tmpdir();
    const tmpName = `session-wizard-pdf-${crypto.randomBytes(6).toString('hex')}.pdf`;
    const tmpPath = path.join(tmpDir, tmpName);
    await fs.promises.writeFile(tmpPath, pdfBuffer);
  const preview = new BrowserWindow({ width: 1000, height: 800, icon: runtimeIcon, webPreferences: { contextIsolation: true, nodeIntegration: false } });
    await preview.loadURL(`file://${tmpPath}`);
    preview.on('closed', () => { try { fs.unlinkSync(tmpPath); } catch (e) {} });
    try { offscreen.close(); } catch (e) {}
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
});
