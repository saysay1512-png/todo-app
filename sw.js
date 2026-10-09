/* Service worker: lets the installed app open without a connection.
   App files (page, css, icons): network first, so an online phone always gets the newest version;
   the cached copy is used only when the network fails or takes longer than NET_WAIT.
   Font files (fonts/…woff2) never change: cache first, each piece cached the first time a character needs it.
   Bump CACHE when the list of app files changes. */
'use strict';

const CACHE = 'halil-v3';
const NET_WAIT = 4000; // ms to wait for the network before falling back to the saved copy
const SHELL = [
  './',
  './index.html',
  './fonts/fonts.css',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
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
  if (url.origin !== self.location.origin) return;

  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const saved = () => cache.match(req, { ignoreSearch: true })
      .then((hit) => hit || (req.mode === 'navigate' ? cache.match('./index.html') : undefined));

    if (url.pathname.endsWith('.woff2')) {
      const hit = await cache.match(req);
      if (hit) return hit;
    }

    // `no-cache` makes the browser ask the server whether the file changed instead of trusting its own HTTP cache.
    const net = fetch(req, { cache: 'no-cache' }).then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    });
    const slow = new Promise((resolve) => setTimeout(resolve, NET_WAIT));
    try {
      const res = await Promise.race([net, slow.then(() => undefined)]);
      if (res) return res;
      // Network is slow: show the saved copy now, but let the download finish so the cache is fresh next time.
      e.waitUntil(net.catch(() => {}));
      return (await saved()) || await net;
    } catch (err) {
      return (await saved()) ||
        new Response('오프라인이에요.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
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
