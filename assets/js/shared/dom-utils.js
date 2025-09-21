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

