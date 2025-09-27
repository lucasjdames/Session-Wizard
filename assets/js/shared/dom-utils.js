/*
 * DOM Utilities (shared across tools)
 * Features:
 *  - Textarea auto-resize (idempotent, global and scoped)
 *  - Default date initialization for common date inputs
 *  - Clipboard helper with button feedback
 *  - Standardized print window helper
 *  - Drag/drop helper: compute after-element for vertical reordering
 */
(function(global){
	const DomUtils = {};

	// --- Internal: one-time init guard
	let initialized = false;

	// --- Textarea Auto-Resize ---
	function resizeTextarea(el){
		if (!el || el.tagName !== 'TEXTAREA') return;
		el.style.height = 'auto';
		// Prefer scrollHeight, fallback to default rows height
		const sh = el.scrollHeight;
		el.style.height = (sh > 0 ? sh : (el.rows || 2) * 20) + 'px';
	}

		DomUtils.autoResizeTextareas = function(options = {}){
		const {
			root = document,
			selector = 'textarea',
				initializeExisting = true,
				observe = false
		} = options;

		// Attach a single input handler per root
		const handlerKey = '__domutils_auto_resize_bound';
		if (!root[handlerKey]) {
			root.addEventListener('input', (e) => {
				if (e.target && e.target.tagName === 'TEXTAREA') {
					resizeTextarea(e.target);
				}
			});
			root[handlerKey] = true;
		}

		if (initializeExisting) {
			root.querySelectorAll(selector).forEach(resizeTextarea);
		}

			if (observe && 'MutationObserver' in window) {
				const mo = new MutationObserver((mutations) => {
					for (const m of mutations) {
						if (m.type === 'childList') {
							m.addedNodes.forEach(node => {
								if (!(node instanceof HTMLElement)) return;
								if (node.matches && node.matches(selector) && node.tagName === 'TEXTAREA') {
									resizeTextarea(node);
								}
								node.querySelectorAll && node.querySelectorAll(selector).forEach(el => {
									if (el.tagName === 'TEXTAREA') resizeTextarea(el);
								});
							});
						}
					}
				});
				mo.observe(root === document ? document.body : root, { childList: true, subtree: true });
			}
	};

	// --- Default Date Initialization ---
	function todayStr(){
		const d = new Date();
		const yyyy = d.getFullYear();
		const mm = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		return `${yyyy}-${mm}-${dd}`;
	}

	DomUtils.initDefaultDates = function(idsOrSelectors = ['#goalDate', '#startDate', '#sessionDate']){
		const date = todayStr();
		idsOrSelectors.forEach((sel) => {
			let inputs = [];
			if (sel.startsWith('#') || sel.startsWith('.') || sel.includes('[')) {
				inputs = document.querySelectorAll(sel);
			} else {
				// treat as raw id
				const el = document.getElementById(sel);
				if (el) inputs = [el];
			}
			inputs.forEach((el) => {
				if (el && el.tagName === 'INPUT' && el.type === 'date' && !el.value) {
					el.value = date;
				}
			});
		});
	};

	// --- Clipboard Helper ---
		DomUtils.copyToClipboard = async function(text, options = {}){
			const { button = null, successText = 'Copied!', resetText = (button ? button.textContent : ''), timeout = 1200 } = options;
			const succeed = () => {
				if (button) {
					const prev = button.textContent;
					button.textContent = successText;
					setTimeout(() => { button.textContent = resetText || prev; }, timeout);
				}
				return true;
			};
			const fail = (err) => {
				console.error('Clipboard copy failed:', err);
				alert('Copy failed. Your browser may block clipboard access.');
				return false;
			};
			try {
				if (navigator.clipboard && navigator.clipboard.writeText) {
					await navigator.clipboard.writeText(text || '');
					return succeed();
				}
			} catch (err) {
				// fall through to legacy path
			}
			// Legacy fallback
			try {
				const textarea = document.createElement('textarea');
				textarea.value = text || '';
				textarea.style.position = 'fixed';
				textarea.style.left = '-1000px';
				textarea.style.top = '-1000px';
				document.body.appendChild(textarea);
				textarea.focus();
				textarea.select();
				const ok = document.execCommand('copy');
				document.body.removeChild(textarea);
				return ok ? succeed() : fail('execCommand returned false');
			} catch (err) { return fail(err); }
		};

	// --- Print Window Helper ---
	// Usage: DomUtils.openPrintWindow({ title: 'Title', bodyHtml: '<div>...</div>', headHtml: '<style>...</style>' })
	DomUtils.openPrintWindow = function({ title = 'Print', bodyHtml = '', headHtml = '', autoPrint = true } = {}){
		// If running inside Electron and the bridge is available, use the native preview flow.
		try {
			if (window.electron && typeof window.electron.printHtmlToPdfPreviewFiles === 'function') {
				// Collect stylesheet hrefs and send to main for inlining (safer for file:// origins)
				const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href).filter(Boolean);
				// Include inline <style> tags as headHtml as well
				let inlineHead = headHtml || '';
				document.querySelectorAll('style').forEach(s => { inlineHead += `<style>${s.innerHTML}</style>`; });
				window.electron.printHtmlToPdfPreviewFiles({ title, headHtml: inlineHead, bodyHtml, stylesheetHrefs: links }).then(res => {
					if (!res || !res.success) console.error('PDF preview failed', res && res.error);
				}).catch(err => console.error('PDF preview error', err));
				return;
			}
		} catch (e) {
			// continue to web flow
		}

		const win = window.open('', '_blank');
		if (!win) {
			alert('Popup blocked. Please allow popups to print.');
			return;
		}
		const doc = win.document;
		doc.open();
		doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>${headHtml}</head><body style="background:#f7fafd;">${bodyHtml}</body></html>`);
		doc.close();
		if (autoPrint) {
			win.onload = function(){
				try { win.focus(); } catch(e){}
				try { win.print(); } catch(e){}
			};
		}

		// Shared minimal print CSS for tables/typography
		DomUtils.getDefaultPrintHead = function(){
			return `
				<meta charset="utf-8">
				<style>
					html, body { background: #fff; color: #111; font-family: Segoe UI, Arial, sans-serif; }
					h1, h2, h3 { color: #222; }
					table { width: 100%; border-collapse: collapse; }
					th, td { border: 1px solid #bbb; padding: 0.6em 0.4em; vertical-align: top; }
					th { background: #e9eef5; }
					@media print { body { padding: 12px; } }
				</style>
			`;
		};
	};

		function escapeHtml(str){
			const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
			return String(str).replace(/[&<>"']/g, (c) => map[c]);
		}

	// --- Drag/Drop Helper: vertical insertion reference ---
	// Returns the first element whose middle is below y (suitable for insertBefore)
	DomUtils.getVerticalAfterElement = function(container, y, itemSelector){
		const sel = itemSelector || '*';
		const children = Array.from(container.querySelectorAll(sel)).filter(el => el.offsetParent !== null);
		for (let i = 0; i < children.length; i++) {
			const rect = children[i].getBoundingClientRect();
			if (y < rect.top + rect.height / 2) return children[i];
		}
		return null;
	};

	// --- One-time auto init on DOMContentLoaded ---
	function autoInit(){
		if (initialized) return;
		initialized = true;
		DomUtils.autoResizeTextareas();
		DomUtils.initDefaultDates();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', autoInit, { once: true });
	} else {
		autoInit();
	}

	// Expose
	global.DomUtils = DomUtils;
})(window);

// --- Theme helpers on DomUtils ---
(function(global){
	if (!global.DomUtils) global.DomUtils = {};
	const Du = global.DomUtils;

	const THEME_KEY = 'session-wizard-theme';

	Du.getTheme = function(){
		try { const s = localStorage.getItem(THEME_KEY); if (s) return s; } catch(e) {}
		const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
		return prefersDark ? 'dark' : 'light';
	};

	Du.setTheme = function(theme){
		if (!theme) return;
		try { document.documentElement.setAttribute('data-theme', theme); } catch(e) {}
		try { localStorage.setItem(THEME_KEY, theme); } catch(e) {}
		// Update any theme toggle icons if present
		const evt = new CustomEvent('session-wizard:theme-changed', { detail: { theme } });
		try { window.dispatchEvent(evt); } catch(e) {}
	};

	Du.toggleTheme = function(){
		const current = document.documentElement.getAttribute('data-theme') || Du.getTheme() || 'light';
		const next = current === 'light' ? 'dark' : 'light';
		Du.setTheme(next);
		return next;
	};

	// Convenience: enable dark mode immediately (for quick dev/testing)
	Du.enableDarkMode = function(){ Du.setTheme('dark'); };
})(window);

// --- Confirm Warning Modal (reusable) ---
// Usage: DomUtils.confirmWarning({ title, message, confirmText, cancelText }) -> Promise<boolean>
(function(global){
	if (!global.DomUtils) global.DomUtils = {};
	const Du = global.DomUtils;

	Du.confirmWarning = function({ title = 'Warning', message = 'This action cannot be undone.', confirmText = 'Yes, clear', cancelText = 'Cancel' } = {}){
		return new Promise((resolve) => {
			// Create overlay
			const overlay = document.createElement('div');
			overlay.className = 'domutils-confirm-overlay';
			overlay.style.cssText = `
				position: fixed; inset: 0; background: rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; z-index: 99999;
			`;

			// Modal
			const modal = document.createElement('div');
			modal.className = 'domutils-confirm-modal';
			// Use CSS variables so the modal inherits dark/light theme styling
			modal.setAttribute('role', 'dialog');
			modal.setAttribute('aria-modal', 'true');
			modal.style.cssText = `
				width: 520px; max-width: calc(100% - 40px); background: var(--color-surface, #fff); border-radius: 10px; padding: 20px; box-shadow: 0 12px 30px rgba(0,0,0,0.25); display:flex; gap:16px; align-items:center; border: 1px solid var(--color-border, #cfd8e3);
				font-family: var(--font-sans, Segoe UI, Roboto, Arial, sans-serif); color: var(--color-text, #111);
			`;

			const imgWrap = document.createElement('div');
			// Larger left column for a prominent icon
			imgWrap.style.cssText = 'flex: 0 0 140px; display:flex; align-items:center; justify-content:center; padding-right:6px;';
			const img = document.createElement('img');
			img.src = '../../assets/img/icon-512-warning.png';
			img.alt = 'Warning';
			img.style.cssText = 'width:120px; height:120px; object-fit:contain; display:block;';
			imgWrap.appendChild(img);

			const content = document.createElement('div');
			content.style.cssText = 'flex:1;';
			const h = document.createElement('h3');
			h.textContent = title;
			h.style.margin = '0 0 8px 0';
			h.style.fontSize = '1.1rem';
			h.id = 'domutils-confirm-title';
			const p = document.createElement('p');
			p.innerHTML = message;
			p.style.margin = '0 0 16px 0';
			p.style.color = 'var(--color-text-muted, #5f6e7a)';
			p.id = 'domutils-confirm-desc';
			modal.setAttribute('aria-labelledby', h.id);
			modal.setAttribute('aria-describedby', p.id);

			const actions = document.createElement('div');
			actions.style.cssText = 'display:flex; gap:8px; justify-content:flex-end;';
			const cancelBtn = document.createElement('button');
			cancelBtn.type = 'button';
			cancelBtn.textContent = cancelText;
			cancelBtn.style.cssText = 'background:transparent; border:1px solid var(--color-border, #cfd8e3); padding:8px 12px; border-radius:6px; cursor:pointer; color:var(--color-text);';
			const confirmBtn = document.createElement('button');
			confirmBtn.type = 'button';
			confirmBtn.textContent = confirmText;
			confirmBtn.style.cssText = 'background: var(--color-error, #ef4444); color: white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; font-weight:600; box-shadow: var(--shadow-sm);';

			actions.appendChild(cancelBtn);
			actions.appendChild(confirmBtn);

			content.appendChild(h);
			content.appendChild(p);
			content.appendChild(actions);

			modal.appendChild(imgWrap);
			modal.appendChild(content);
			overlay.appendChild(modal);
			document.body.appendChild(overlay);

			// Focus management
			confirmBtn.focus();

			const cleanup = (result) => {
				try { document.body.removeChild(overlay); } catch (e) {}
				resolve(Boolean(result));
			};

			cancelBtn.addEventListener('click', () => cleanup(false));
			overlay.addEventListener('click', (e) => {
				if (e.target === overlay) cleanup(false);
			});
			confirmBtn.addEventListener('click', () => cleanup(true));

			// Keyboard handling
			const keyHandler = (e) => {
				if (e.key === 'Escape') { cleanup(false); }
				if (e.key === 'Enter') { cleanup(true); }
			};
			document.addEventListener('keydown', keyHandler, { once: true });
		});
	};
})(window);

