/* Atlas energetických míst — service worker (offline shell + rychlé spuštění) */
const CACHE = 'atlas-v2';

const SHELL = [
  '/', '/misto', '/o-projektu', '/sprava',
  '/styles.css', '/header.js', '/auth.js', '/data.js',
  '/app.js', '/misto.js', '/sprava.js',
  '/img/logo.png', '/img/icon-192.png', '/img/icon-512.png',
  '/img/hero-brana.jpg', '/img/brana-svit.jpg',
  '/manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))  // jeden 404 nezhodí instalaci
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;                       // POST/RPC do Supabase necháme být
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // CDN, satelitní dlaždice, Supabase — přímo ze sítě

  // HTML / navigace: nejdřív síť (ať se projeví nasazení), offline fallback z cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then(r => r || caches.match('/')))
    );
    return;
  }

  // statické soubory: vrať z cache hned, na pozadí obnov (stale-while-revalidate)
  event.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req)
        .then(res => { if (res && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; })
        .catch(() => cached);
      return cached || net;
    })
  );
});
