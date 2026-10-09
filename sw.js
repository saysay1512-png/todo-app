/* Service worker: lets the installed app open without a connection.
   App files: answer from cache at once, then refresh the cache in the background
   (so a new version shows up the next time the app is opened).
   Google Fonts: cache on first use. Bump CACHE when the list of app files changes. */
'use strict';

const CACHE = 'halil-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !isFont) return;

  e.respondWith(caches.open(CACHE).then(async (cache) => {
    // Opening the app at any page path falls back to the cached index.html.
    const cached = await cache.match(req, { ignoreSearch: true }) ||
      (req.mode === 'navigate' ? await cache.match('./index.html') : undefined);
    const fresh = fetch(req).then((res) => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(() => undefined);
    if (cached) {
      e.waitUntil(fresh);
      return cached;
    }
    return (await fresh) || new Response('오프라인이에요.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }));
});

// Tapping an alarm notification brings the app forward (or opens it).
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const win = list.find((c) => 'focus' in c);
    return win ? win.focus() : self.clients.openWindow('./');
  }));
});
