/* Atlas energetických míst — service worker (offline shell + rychlé spuštění) */
const CACHE = 'atlas-v45';
/* knihovny z cizích adres (mapa, databázový klient, písma) — mění se zřídka, přežívají nové verze Atlasu */
const KNIHOVNY = 'atlas-knihovny-v1';
const CIZI = ['cdn.jsdelivr.net', 'unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

const SHELL = [
  '/', '/misto', '/o-projektu', '/napoveda', '/sprava', '/objevit', '/denik', '/podminky',
  '/styles.css', '/header.js', '/auth.js', '/data.js',
  '/app.js', '/misto.js', '/i18n.js', '/sprava.js', '/objevit.js', '/denik.js',
  '/foto.js', '/geo.js', '/koncepty.js', '/kotvy.js', '/markercluster.js',
  '/img/logo.png', '/img/icon-192.png', '/img/icon-512.png',
  '/img/hero-brana.jpg', '/img/brana-svit.jpg',
  '/manifest.webmanifest', '/instalace-fallback.js'
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
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== KNIHOVNY).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* stránka: nejdřív síť (ať se projeví nasazení); když do 4 s neodpoví a stránku máme uloženou,
   ukáže se hned ta uložená — slabý signál nenechá člověka čekat. Bez sítě vždy z uložených. */
async function stranka(req, url) {
  const c = await caches.open(CACHE);
  const ulozena = async () => (await c.match(req)) || (await c.match(url.pathname)) || (await c.match('/'));
  const sit = fetch(req).then(res => {
    if (res && res.ok) c.put(req, res.clone()).catch(() => {});
    return res;
  });
  sit.catch(() => {});                                   // doběhne-li na pozadí chybou, nic se neděje
  try {
    const prvni = await Promise.race([sit, new Promise(ok => setTimeout(ok, 4000, 'cas'))]);
    if (prvni !== 'cas') return prvni;
    return (await ulozena()) || (await sit);
  } catch (e) {
    const zaloha = await ulozena();
    if (zaloha) return zaloha;
    throw e;
  }
}

/* soubory Atlasu: přesná shoda z cache hned a na pozadí obnovit; nový soubor ze sítě;
   bez sítě poslouží i starší verze téhož souboru (jiné ?v=) */
async function soubor(req) {
  const c = await caches.open(CACHE);
  const presne = await c.match(req);
  if (presne) {
    fetch(req).then(res => { if (res && res.status === 200) c.put(req, res.clone()).catch(() => {}); }).catch(() => {});
    return presne;
  }
  try {
    const res = await fetch(req);
    if (res && res.status === 200) c.put(req, res.clone()).catch(() => {});
    return res;
  } catch (e) {
    const starsi = await c.match(req, { ignoreSearch: true });
    if (starsi) return starsi;
    throw e;
  }
}

/* knihovny a písma: z cache hned, na pozadí obnovit — Atlas se tak rozběhne i bez signálu */
async function knihovna(req) {
  const c = await caches.open(KNIHOVNY);
  const ulozena = await c.match(req);
  const sit = fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()).catch(() => {});
    return res;
  });
  if (ulozena) { sit.catch(() => {}); return ulozena; }
  return sit;
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;                       // POST/RPC do Supabase necháme být
  const url = new URL(req.url);
  if (CIZI.includes(url.hostname)) { event.respondWith(knihovna(req)); return; }
  if (url.origin !== self.location.origin) return;        // satelitní dlaždice, Supabase — přímo ze sítě
  if (url.pathname.startsWith('/api/')) return;           // serverové funkce vždy ze sítě

  if (req.mode === 'navigate') { event.respondWith(stranka(req, url)); return; }
  event.respondWith(soubor(req));
});
