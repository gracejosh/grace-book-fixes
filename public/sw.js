const CACHE_VERSION = 'grace-book-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const BIBLE_CACHE = `${CACHE_VERSION}-bible`;
const POSTS_CACHE = `${CACHE_VERSION}-posts`;
const FLYERS_CACHE = `${CACHE_VERSION}-flyers`;
const BOOKS_CACHE = `${CACHE_VERSION}-books`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/grace-logo.png',
];

const BIBLE_URL = '/amharic_bible.json';

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL).catch(() => {})),
      caches.open(BIBLE_CACHE).then((cache) => cache.add(BIBLE_URL).catch(() => {})),
    ])
  );
  self.skipWaiting();
});

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

self.addEventListener('message', (event) => {
  if (event.data?.type === 'CACHE_POSTS') {
    cacheJsonData(POSTS_CACHE, event.data.items, 'posts');
  } else if (event.data?.type === 'CACHE_FLYERS') {
    cacheJsonData(FLYERS_CACHE, event.data.items, 'flyers');
  } else if (event.data?.type === 'CACHE_BOOKS') {
    cacheJsonData(BOOKS_CACHE, event.data.items, 'books');
  } else if (event.data?.type === 'CACHE_BIBLE') {
    caches.open(BIBLE_CACHE).then((cache) => cache.add(BIBLE_URL).catch(() => {}));
  } else if (event.data?.type === 'CLEAR_RUNTIME') {
    caches.delete(RUNTIME_CACHE);
  }
});

async function cacheJsonData(cacheName, items, label) {
  try {
    const cache = await caches.open(cacheName);
    const response = new Response(JSON.stringify(items), {
      headers: { 'Content-Type': 'application/json' },
    });
    await cache.put(`/${label}-cache.json`, response);
  } catch (e) {
    // ignore
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Bible JSON — cache-first
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

  // Same-origin static assets — cache-first with network update
  if (url.origin === location.origin) {
    // Don't cache Supabase API calls
    if (url.pathname.startsWith('/rest/') || url.pathname.startsWith('/realtime/')) return;

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
    return;
  }

  // Cross-origin (Cloudinary, etc.) — stale-while-revalidate
  if (url.hostname.includes('cloudinary.com') || url.hostname.includes('supabase.co')) {
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
  }
});
