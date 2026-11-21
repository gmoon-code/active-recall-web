/* Zero-cost offline caching for the GitHub Pages static application. */
const CACHE_NAME = 'active-recall-web-v4-44';
const STATIC_FILES = ['./', './index.html', './health.html', './styles.css', './moon-theme.css', './intelligence.js', './pdf-lite.js', './document-import.js', './qa-import.js', './study-rhythm.js', './month-calendar.js', './human-review.js', './paired-review.js', './review-packets.js', './review-packets-ui.js', './reviewer-offline.html', './reference-first.js', './reference-first-ui.js', './reviewer-pilot.js', './reviewer-pilot-ui.js', './reviewer-training.js', './reviewer-training-ui.js', './reviewer-training-offline.html', './reviewer-usability.js', './reviewer-usability-ui.js', './reviewer-usability-offline.html', './reference-reviewer-offline.html', './paired-review-ui.js', './core.js', './vendor/fsrs-7-shadow-vendor.js', './fsrs-shadow.js', './storage.js', './app.js', './manifest.webmanifest', './favicon.svg', './favicon.svg?v=4-41', './icon-192.png', './icon-192.png?v=4-41', './icon-512.png', './icon-512.png?v=4-41'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('active-recall-web-') && key !== CACHE_NAME).map(key => caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // Always check for a new release when online; still work offline after one successful load.
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok && response.type === 'basic') {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {});
    }
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached || (event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
