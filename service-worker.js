const CACHE_NAME = 'session-wizard-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/css/main.css',
  '/assets/css/inter-local.css',
  '/assets/js/main.js',
  '/tools/goal-attainment-scale-builder/index.html',
  '/tools/goal-attainment-scale-builder/gas-builder.css',
  '/tools/goal-attainment-scale-builder/gas-builder.js',
  '/tools/goal-attainment-scale-builder/auto-resize.js',
  '/tools/progress-monitor/index.html',
  '/tools/progress-monitor/progress-monitor.css',
  '/tools/progress-monitor/progress-monitor.js',
  '/tools/smart-goal-builder/index.html',
  '/tools/smart-goal-builder/smart-goal-builder.css',
  '/tools/smart-goal-builder/smart-goal-builder.js',
  '/tools/therapy-data-session-taker/index.html',
  '/tools/therapy-data-session-taker/therapy-data-session-taker-clean.css',
  '/tools/therapy-data-session-taker/therapy-data-session-taker-new.css',
  '/tools/therapy-data-session-taker/therapy-data-session-taker.css',
  '/tools/therapy-data-session-taker/therapy-data-session-taker.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  // Prefer network for HTML/JS, fallback to cache
  if (event.request.destination === 'document' || event.request.destination === 'script') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Optionally update cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
});
