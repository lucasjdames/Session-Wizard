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
