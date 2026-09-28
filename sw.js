const VERSION = 'mechcalc-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/main.js',
  './js/ui.js',
  './js/units.js',
  './js/store.js',
  './js/tables.js',
  './js/materials.js',
  './js/materialsui.js',
  './js/gcode.js',
  './js/registry.js',
  './js/selftest.js',
  './js/calc/formulas.js',
  './js/calc/matfield.js',
  './js/calc/rpm.js',
  './js/calc/tablefeed.js',
  './js/calc/feedrev.js',
  './js/calc/boltcircle.js',
  './js/calc/drill.js',
  './js/calc/threads.js',
  './js/calc/mrr.js',
  './js/calc/fractions.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

// addAll rejects the whole batch if a single file 404s, which would leave the app
// with no offline copy at all. Cache each file on its own so one bad path cannot
// take the rest down with it.
self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(VERSION)
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  ev.respondWith(
    caches.match(req).then((hit) => {
      if (hit) {
        fetch(req).then((res) => {
          if (res && res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()));
        }).catch(() => {});
        return hit;
      }
      return fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    }),
  );
});
