// Cache version rotates on every deploy via build-time injection.
// Falls back to a timestamp-based version if not replaced.
const CACHE_VERSION = 'grace-book-v3-' + (self.registration?.scope || '') + '-' + Date.now();
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const BIBLE_CACHE = `${CACHE_VERSION}-bible`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const IMAGE_CACHE = `${CACHE_VERSION}-image`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/grace-logo.png',
];

const BIBLE_URL = '/amharic_bible.json';

// === INSTALL: pre-cache app shell ===
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL).catch(() => {})),
      caches.open(BIBLE_CACHE).then((cache) => cache.add(BIBLE_URL).catch(() => {})),
    ])
  );
  self.skipWaiting();
});

// === ACTIVATE: clean up ALL old caches, take control immediately ===
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// === Message handler: skip waiting + custom cache messages ===
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data?.type === 'CLEAR_RUNTIME') {
    caches.delete(RUNTIME_CACHE);
  } else if (event.data?.type === 'CACHE_BIBLE') {
    caches.open(BIBLE_CACHE).then((cache) => cache.add(BIBLE_URL).catch(() => {}));
  }
});

// === FETCH: route by request type ===
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // --- Navigation requests (HTML pages): network-first, NEVER cache HTML at runtime ---
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Never cache HTML at runtime — always serve fresh from network
          return response;
        })
        .catch(() => {
          // Offline fallback: serve cached index.html if available
          return caches.match('/index.html').then(
            (cached) =>
              cached ||
              caches.match(request) ||
              new Response('Offline', {
                status: 503,
                headers: { 'Content-Type': 'text/html' },
              })
          );
        })
    );
    return;
  }

  // --- Bible JSON: cache-first (large file, changes rarely) ---
  if (url.pathname === BIBLE_URL) {
    event.respondWith(
      caches.match(BIBLE_URL).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(BIBLE_CACHE).then((cache) => cache.put(BIBLE_URL, clone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // --- API calls (Supabase REST, realtime, etc.): network-first ---
  if (
    url.pathname.startsWith('/rest/') ||
    url.pathname.startsWith('/realtime/') ||
    url.pathname.startsWith('/functions/') ||
    url.hostname.includes('supabase.co')
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // --- Images (including cross-origin Cloudinary): cache-first ---
  if (request.destination === 'image' || url.hostname.includes('cloudinary.com')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(IMAGE_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // --- Static assets (JS, CSS, fonts, workers): cache-first with version ---
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'worker'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // --- Default same-origin: network-first ---
  if (url.origin === location.origin) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // --- Other cross-origin: stale-while-revalidate ---
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
