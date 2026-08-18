// Minimal, hand-written service worker — deliberately does not use a
// caching library (Serwist/next-pwa require a Turbopack-specific
// integration path; a plain public/sw.js needs none, per Next.js's own
// PWA guide).
//
// Scope is intentionally narrow: this only exists to (a) satisfy PWA
// installability and (b) show a graceful offline page for navigations.
// It never caches page data, API responses, or RSC payloads — every
// non-navigation request passes straight through to the network
// untouched, so there is no risk of serving stale or private data from
// the cache. Bump CACHE_NAME to invalidate the (tiny) precache on deploy.

const CACHE_NAME = "lifeos-shell-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_URL])),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // Only ever intervene for page navigations; everything else (data
  // fetches, static assets, RSC payloads) is left alone.
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL)),
  );
});
