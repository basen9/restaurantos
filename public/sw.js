/* RestaurantOS service worker — instalowalność PWA + lekki cache powłoki.
   Strategia: network-first dla nawigacji (świeże dane), z fallbackiem offline;
   cache-first dla statycznych zasobów. Nigdy nie cache'ujemy /api (dane wrażliwe/żywe). */
const CACHE = 'ros-v2'
const OFFLINE_URL = '/offline.html'
const PRECACHE = ['/offline.html', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

// Cache'ujemy WYŁĄCZNIE bezpieczne, niezależne od użytkownika zasoby statyczne.
// HTML/dokumenty i payloady RSC (nawigacje App Routera) zawierają dane konkretnego
// użytkownika/najemcy — nigdy ich nie cache'ujemy (ryzyko wycieku na współdzielonym tablecie).
function isStaticAsset(url, req) {
  if (url.pathname.startsWith('/_next/static')) return true
  if (['style', 'script', 'font', 'image'].includes(req.destination)) return true
  return /\.(?:css|js|woff2?|ttf|png|jpg|jpeg|svg|webp|ico|gif)$/i.test(url.pathname)
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  // Nigdy nie przechwytujemy API ani autoryzacji — zawsze sieć.
  if (url.pathname.startsWith('/api')) return

  // Nawigacje: network-first z fallbackiem offline (bez zapisu do cache).
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)))
    return
  }

  // Payloady RSC / dokumenty / dane użytkownika — zawsze sieć, nigdy cache.
  const isRsc = req.headers.get('RSC') === '1' || url.searchParams.has('_rsc') || req.destination === 'document'
  if (isRsc || !isStaticAsset(url, req)) {
    event.respondWith(fetch(req))
    return
  }

  // Tylko zasoby statyczne: cache-first z odświeżeniem w tle.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)) }
        return res
      }).catch(() => cached)
      return cached || network
    }),
  )
})
