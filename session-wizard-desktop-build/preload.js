const { contextBridge, ipcRenderer } = require('electron');

// Minimal, safe API surface. Extend only as needed.
contextBridge.exposeInMainWorld('electron', {
  isElectron: true,
  platform: process.platform,
  openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
  saveFile: (opts) => ipcRenderer.invoke('dialog:saveFile', opts),
  printToPDF: (opts) => ipcRenderer.invoke('window:printToPDF', opts),
  printPreview: (opts) => ipcRenderer.invoke('window:printPreview', opts),
  openPrintableHtml: (opts) => ipcRenderer.invoke('window:openPrintableHtml', opts),
  printHtmlToPdfPreview: (opts) => ipcRenderer.invoke('window:printHtmlToPdfPreview', opts),
  printHtmlToPdfPreviewFiles: (opts) => ipcRenderer.invoke('window:printHtmlToPdfPreviewFiles', opts)
});

// Add on(...) and readFile(...) helpers for renderer to receive menu events and request file reads
contextBridge.exposeInMainWorld('electronOn', {
  on: (channel, listener) => {
    // whitelist channels the renderer is allowed to listen to
    const allowed = ['menu:save-session', 'menu:load-session'];
    if (!allowed.includes(channel)) return;
    ipcRenderer.on(channel, (event, ...args) => listener(...args));
  },
  readFile: async (filePath, encoding = 'utf8') => {
    return await ipcRenderer.invoke('file:read', filePath, encoding);
  }
});
