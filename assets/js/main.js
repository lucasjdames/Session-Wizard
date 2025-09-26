/*
 * Session Wizard: main.js
 * Purpose: Lightweight dashboard bootstrap logic (e.g., dynamic year stamp)
 * Scope: Runs on the root index.html only; no side effects beyond DOM content updates.
 */
console.log('Session Wizard main.js loaded');

// Set the current year in footer
function setYear() {
    const yearSpan = document.getElementById('year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setYear();
});

// Prefetch tool assets on user intent (hover or touchstart)
// Low-priority prefetch to improve perceived navigation speed.
(function addToolPrefetching() {
    if (!('document' in self) || !document.querySelectorAll) return;
    const prefetched = new Set();

    function addPrefetch(url, as) {
        if (!url || prefetched.has(url)) return;
        prefetched.add(url);
        try {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = url;
            if (as) link.as = as;
            // set crossOrigin for fonts if needed
            document.head.appendChild(link);
        } catch (e) {
            // ignore failures
            console.warn('prefetch failed for', url, e);
        }
    }

    // Helper to resolve relative hrefs against current location
    function resolve(href) {
        try { return new URL(href, location.href).pathname; } catch (e) { return href; }
    }

    const cards = document.querySelectorAll('.tool-card');
    if (!cards.length) return;

    cards.forEach(btn => {
        // attempt to extract href from onclick or data attributes
        let href = btn.getAttribute('data-href') || btn.getAttribute('data-url');
        if (!href) {
            const onclick = btn.getAttribute('onclick') || '';
            const m = onclick.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/);
            href = m ? m[1] : null;
        }
        if (!href) return;

        const basePath = resolve(href);

        const onIntent = () => {
            // Prefetch the HTML entrypoint
            addPrefetch(basePath, 'document');
            // Try to prefetch a JS file adjacent to the index.html (common pattern)
            // e.g., /tools/foo/index.html -> /tools/foo/foo.js
            const parts = basePath.split('/').filter(Boolean);
            const folder = parts.slice(0, -1).join('/');
            const candidateJs = folder ? `/${folder}/${parts[parts.length-2] || parts[parts.length-1]}.js` : null;
            if (candidateJs) addPrefetch(candidateJs, 'script');
            // Also prefetch likely CSS
            const candidateCss = candidateJs ? candidateJs.replace(/\.js$/, '.css') : null;
            if (candidateCss) addPrefetch(candidateCss, 'style');
        };

        btn.addEventListener('mouseenter', onIntent, { passive: true });
        btn.addEventListener('touchstart', onIntent, { passive: true });
    });
})();

/* Navigation prefetch: warm the browser & SW caches for tool entry pages to reduce
   white flashes and speed navigation. Runs during idle or after a short delay,
   respects save-data and poor connections. */
(function addNavigationPrefetch() {
    const PREFETCH_URLS = [
        '/',
        '/tools/goal-builder/index.html',
        '/tools/therapy-data-session-taker/index.html',
        '/tools/homework-tracker/index.html'
    ];

    function shouldPrefetch() {
        try {
            if ('connection' in navigator) {
                const c = navigator.connection || {};
                if (c.saveData) return false;
                // avoid on slow networks
                if (c.effectiveType && (c.effectiveType.includes('2g') || c.effectiveType.includes('slow-2g'))) return false;
            }
        } catch (e) {}
        return navigator.onLine !== false;
    }

    function doPrefetch() {
        if (!shouldPrefetch()) return;
        PREFETCH_URLS.forEach(url => {
            try {
                // Add a rel=prefetch link (non-blocking) — good for browsers that honor it
                const l = document.createElement('link');
                l.rel = 'prefetch';
                l.href = url;
                l.as = 'document';
                document.head.appendChild(l);
            } catch (e) {}

            // Also fetch in the background to warm HTTP cache and trigger SW runtime caching
            try { fetch(url, { credentials: 'same-origin' }).then(r => { /* noop */ }).catch(() => {}); } catch (e) {}
        });
    }

    // Run during idle if available, else a short timeout after load
    function schedulePrefetch() {
        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(doPrefetch, { timeout: 2000 });
        } else {
            setTimeout(doPrefetch, 1500);
        }
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') schedulePrefetch();
    else document.addEventListener('DOMContentLoaded', schedulePrefetch, { once: true });
})();
