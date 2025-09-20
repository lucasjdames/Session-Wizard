/**
 * Service Worker for Session Wizard
 *
 * Strategy:
 *  - Precache core shell + active tool entry points (cache-first for offline readiness)
 *  - Runtime update: network-first for HTML & JS with background cache refresh
 *  - Static assets (icons, CSS) served from cache if available
 *
 * Versioning:
 *  - Increment CACHE_NAME when the precache manifest changes to force old caches to purge.
 *  - Keep list limited to currently shipped assets (exclude legacy / archived tools).
 */
// Bump this when changing precache list to force clients to refresh their cache
// Release-note: cache bumped to v6 on 2025-09-20 to force clients to fetch updated assets and SW logic
const CACHE_NAME = 'session-wizard-cache-v6';
const urlsToCache = [
  '/',
  '/index.html',
  // Core assets
  '/assets/css/main.css',
  '/assets/css/inter-local.css',
  '/assets/js/main.js',
  '/assets/js/theme.js',
  // Icons
  '/assets/img/icon-192.png',
  '/assets/img/icon-512.png',
  // Goal Builder (includes SMART + GAS)
  '/tools/goal-builder/index.html',
  '/tools/goal-builder/goal-builder.css',
  '/tools/goal-builder/goal-builder.js',
  // Progress Monitor
  '/tools/progress-monitor/index.html',
  '/tools/progress-monitor/progress-monitor.css',
  '/tools/progress-monitor/progress-monitor.js',
  // Therapy Session Data Taker
  '/tools/therapy-data-session-taker/index.html',
  '/tools/therapy-data-session-taker/therapy-data-session-taker.css',
  '/tools/therapy-data-session-taker/therapy-data-session-taker.js',
  // Homework Tracker
  '/tools/homework-tracker/index.html',
  '/tools/homework-tracker/homework-tracker.css',
  '/tools/homework-tracker/homework-tracker.js'

];

self.addEventListener('install', event => {
  // Immediately take over the old service worker when this one is installed
  self.skipWaiting();
  const start = Date.now();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(urlsToCache);
    if (self.__TRACE_ENABLED__) console.log('[SW] install completed in', Date.now() - start, 'ms');
  })());
});

// Tracing control: clients can postMessage({ type: 'trace', enabled: true }) to toggle verbose logs
self.__TRACE_ENABLED__ = false;
self.addEventListener('message', event => {
  try {
    const d = event.data || {};
    if (d && d.type === 'trace') {
      self.__TRACE_ENABLED__ = !!d.enabled;
      console.log('[SW] trace enabled =', self.__TRACE_ENABLED__);
    }
  } catch (e) { /* ignore malformed messages */ }
});

self.addEventListener('fetch', event => {
  const fetchStart = performance ? performance.now() : Date.now();
  const req = event.request;
  const url = new URL(req.url);

  // If this is a navigation or a document request, serve from cache-first (stale-while-revalidate)
  // so the page renders instantly from cache and we update the cache in the background.
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);

      // If navigation preload provided a response (faster in some browsers), use it immediately
      try {
        const preloadResp = await event.preloadResponse;
        if (preloadResp) {
          // update cache asynchronously if the response body hasn't already been consumed
          (async () => {
            try {
              if (preloadResp && preloadResp.ok && !preloadResp.bodyUsed) {
                try {
                  await cache.put(req, preloadResp.clone());
                } catch (e) {
                  // clone failed (body already used) — fallback to refetch and cache fresh response
                  try {
                    const fresh = await fetch(req);
                    if (fresh && fresh.ok) await cache.put(req, fresh.clone());
                  } catch (e2) { /* ignore fallback errors */ }
                }
              }
            } catch (e) { /* ignore caching errors */ }
          })();
          return preloadResp;
        }
      } catch (e) {
        // ignore preload errors
      }

      const cached = await cache.match('/' + (url.pathname.replace(/^\//, '') || 'index.html')) || await cache.match(req);
      // Start network fetch to update cache, but don't wait for it to return
      fetch(req).then(async res => {
        try {
          if (res && res.ok && !res.bodyUsed) {
            try {
              await cache.put(req, res.clone());
            } catch (e) {
              // clone failed: fallback to refetch and cache fresh response
              try {
                const fresh = await fetch(req);
                if (fresh && fresh.ok) await cache.put(req, fresh.clone());
              } catch (e2) { /* ignore fallback errors */ }
            }
          }
        } catch (e) {
          // ignore clone/put errors
        }
        return res;
      }).catch(() => null);

      // Return cached if present; otherwise wait for network, else fallback to index
      const resp = cached || await fetch(req).catch(() => caches.match('/index.html'));
      if (self.__TRACE_ENABLED__) console.log('[SW] navigation', url.pathname, 'served from', cached ? 'cache' : 'network', 'fetchTimeMs=', (performance ? performance.now() : Date.now()) - fetchStart);
      return resp;
    })());
    return;
  }

  // For scripts/styles/images use the cache-first strategy to improve performance
  if (req.destination === 'script' || req.destination === 'style' || req.destination === 'image' || req.destination === 'font') {
    event.respondWith((async () => {
      const response = await caches.match(req);
      if (response) {
        if (self.__TRACE_ENABLED__) console.log('[SW] cache-hit', req.url);
        return response;
      }
      try {
        const res = await fetch(req);
        try {
          if (res && res.ok && !res.bodyUsed) {
            try {
              const c = await caches.open(CACHE_NAME);
              await c.put(req, res.clone());
            } catch (eInner) {
              // clone failed (body already used) — try refetch and cache fresh response
              try {
                const fresh = await fetch(req);
                if (fresh && fresh.ok) {
                  const c2 = await caches.open(CACHE_NAME);
                  await c2.put(req, fresh.clone());
                }
              } catch (e2) { /* ignore fallback errors */ }
            }
          }
        } catch (e) { /* ignore */ }
        if (self.__TRACE_ENABLED__) console.log('[SW] fetched', req.url, 'status', res.status);
        return res;
      } catch (e) {
        if (self.__TRACE_ENABLED__) console.warn('[SW] fetch failed for', req.url, e && e.message);
        return response;
      }
    })());
    return;
  }

  // Default fallback: network first then cache
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});

self.addEventListener('activate', event => {
  // Claim any clients immediately so the new service worker starts controlling pages
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

// Enable navigation preload so browsers can start the network fetch in parallel with
// the service worker bootup, reducing white flashes on navigations.
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try {
      if (self.registration && self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
    } catch (e) { /* ignore */ }
  })());
});
