Session Wizard — Electron Desktop Build

This folder contains a minimal Electron wrapper and build configuration using electron-builder.

Quick dev start (from PowerShell):

```powershell
# From the `session-wizard-desktop-build` folder
npm install
# Run the app (loads index.html from the project root)
npm run start
```

Build a Windows installer (requires code-signing if distributing widely):

Print preview example
---------------------
To show a native print preview (PDF) window from the renderer:

```javascript
async function showPreview() {
	if (window.electron?.printPreview) {
		const res = await window.electron.printPreview();
		if (!res.success) console.error('Preview failed', res.error);
	} else {
		alert('Print preview is unavailable in this environment.');
	}
}
```

PDF-rendered preview (Electron)
--------------------------------
If you'd like the printable HTML rendered to a PDF preview inside Electron (recommended):

```javascript
async function previewPdfFromHtml(title, headHtml, bodyHtml) {
	if (window.electron?.printHtmlToPdfPreview) {
		const res = await window.electron.printHtmlToPdfPreview({ title, headHtml, bodyHtml });
		if (!res.success) console.error('Preview failed', res.error);
	} else {
		// fallback to the regular print preview
		showPreview();
	}
}
```

Note: For reliable styling in PDFs, the renderer now sends linked stylesheet hrefs and inline <style> content to the main process which inlines them before rendering the PDF. This avoids file:// fetch restrictions and ensures the PDF matches Preview Mode styles.

```powershell
npm install
npm run build
```

Notes
- The Electron main process forcibly unregisters any service workers and clears CacheStorage after the renderer finishes loading. The web app also includes a guard to avoid re-registering the service worker when running inside Electron.
- The packaged app will include the top-level `index.html`, `assets`, and `tools` directories so the web app works offline without registration of the service worker.
- If you prefer to serve the web app from a secure protocol, replace `loadFile` with a custom protocol registration and load via `app://-`.

Renderer usage examples
-----------------------
From any renderer script (e.g., an export button handler), use the exposed API on `window.electron`.

Save a CSV:

```javascript
async function saveCsv(filename, csvText) {
	if (window.electron?.saveFile) {
		const res = await window.electron.saveFile({ defaultPath: filename, filters: [{ name: 'CSV', extensions: ['csv'] }], data: csvText });
		if (!res.canceled) console.log('Saved to', res.filePath);
	} else {
		// Fallback to in-browser download
		const a = document.createElement('a');
		a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvText);
		a.download = filename;
		a.click();
	}
}
```

Print current view to PDF and save:

```javascript
async function exportPdf(defaultName = 'session.pdf') {
	if (window.electron?.printToPDF) {
		const res = await window.electron.printToPDF({});
		if (res.success) {
			// Prompt to save the PDF
			const save = await window.electron.saveFile({ defaultPath: defaultName, filters: [{ name: 'PDF', extensions: ['pdf'] }], data: res.data, encoding: 'binary' });
			if (!save.canceled) console.log('PDF saved to', save.filePath);
		} else {
			console.error('PDF generation failed', res.error);
		}
	} else {
		window.print();
	}
}
```
