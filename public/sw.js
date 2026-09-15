const VERSION = 'v3';
const PRECACHE_CACHE = `grace-book-precache-${VERSION}`;
const RUNTIME_CACHE = `grace-book-runtime-${VERSION}`;
const IMAGE_CACHE = `grace-book-images-${VERSION}`;
const API_CACHE = `grace-book-api-${VERSION}`;
const BIBLE_CACHE = 'grace-book-bible-permanent';

const BIBLE_URL = '/amharic_bible.json';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  BIBLE_URL,
];

// If a Workbox build injects a manifest, include those revisioned assets too.
const INJECTED_MANIFEST = Array.isArray(self.__WB_MANIFEST) ? self.__WB_MANIFEST : [];
const MANIFEST_URLS = INJECTED_MANIFEST
  .map((entry) => (typeof entry === 'string' ? entry : entry && entry.url))
  .filter(Boolean);

const OFFLINE_FALLBACK = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="theme-color" content="#7c3aed" />
    <title>Grace Book — Offline</title>
    <style>
      :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #fafafa; color: #292133; }
      main { max-width: 32rem; padding: 2rem; text-align: center; }
      h1 { margin-bottom: .5rem; color: #7c3aed; }
      p { line-height: 1.6; }
    </style>
  </head>
  <body>
    <main>
      <h1>Grace Book</h1>
      <p>You’re offline right now. Reconnect to load new content, or return to the app when your connection is restored.</p>
    </main>
  </body>
</html>`;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const shellCache = await caches.open(PRECACHE_CACHE);
    await Promise.allSettled([
      ...[...new Set([...PRECACHE_URLS, ...MANIFEST_URLS])].map((url) => cacheUrl(shellCache, url)),
      precacheDiscoveredShellAssets(shellCache),
    ]);

    // Keep the Bible in its own cache so version rotations never remove it.
    const bibleCache = await caches.open(BIBLE_CACHE);
    await cacheUrl(bibleCache, BIBLE_URL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const currentCaches = new Set([
      PRECACHE_CACHE,
      RUNTIME_CACHE,
      IMAGE_CACHE,
      API_CACHE,
      BIBLE_CACHE,
    ]);
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith('grace-book-') && !currentCaches.has(key))
        .map((key) => caches.delete(key)),
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isNavigation = request.mode === 'navigate';
  const isBible = url.origin === self.location.origin && url.pathname === BIBLE_URL;
  const isImage = isImageRequest(request, url);
  const isSupabaseApi = isSupabaseApiRequest(url);

  if (isNavigation) {
    event.respondWith(networkFirstNavigation(request));
  } else if (isBible) {
    event.respondWith(cacheFirst(request, BIBLE_CACHE));
  } else if (isImage) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
  } else if (isSupabaseApi) {
    event.respondWith(networkFirst(request, API_CACHE));
  } else if (url.origin === self.location.origin && isAppAsset(request)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
  }
});

async function cacheUrl(cache, url) {
  try {
    const request = new Request(new URL(url, self.location.origin), { cache: 'no-cache' });
    const response = await fetch(request);
    if (isCacheable(response)) await cache.put(request, response.clone());
    return response;
  } catch {
    return null;
  }
}

async function precacheDiscoveredShellAssets(cache) {
  try {
    const response = await fetch('/index.html', { cache: 'no-cache' });
    if (!isCacheable(response)) return;
    await cache.put('/index.html', response.clone());
    const html = await response.text();
    const urls = extractHtmlAssetUrls(html);
    await Promise.allSettled(urls.map((url) => cacheUrl(cache, url)));

    // CSS commonly contains the font files and icon assets needed by the shell.
    const cssUrls = urls.filter((url) => /\.css(?:$|[?#])/i.test(url));
    for (const cssUrl of cssUrls) {
      try {
        const cssResponse = await fetch(cssUrl, { cache: 'no-cache' });
        if (!isCacheable(cssResponse)) continue;
        const css = await cssResponse.clone().text();
        await cache.put(cssUrl, cssResponse);
        await Promise.allSettled(
          extractCssAssetUrls(css, cssUrl).map((url) => cacheUrl(cache, url)),
        );
      } catch {
        // A missing optional font or icon must not abort installation.
      }
    }
  } catch {
    // The static manifest still installs even when the network is unavailable.
  }
}

function extractHtmlAssetUrls(html) {
  const urls = new Set();
  const attributePattern = /<(?:script|link)[^>]+(?:src|href)=["']([^"']+)["'][^>]*>/gi;
  for (const match of html.matchAll(attributePattern)) urls.add(match[1]);
  return [...urls].filter((url) => !url.startsWith('data:') && !url.startsWith('#'));
}

function extractCssAssetUrls(css, baseUrl) {
  const urls = new Set();
  const pattern = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  for (const match of css.matchAll(pattern)) {
    const url = match[1].trim();
    if (!url.startsWith('data:') && !url.startsWith('#')) {
      urls.add(new URL(url, new URL(baseUrl, self.location.origin)).href);
    }
  }
  return [...urls];
}

function isCacheable(response) {
  return Boolean(response && (response.ok || response.type === 'opaque'));
}

function isImageRequest(request, url) {
  return request.destination === 'image'
    || /(?:cloudinary\.com|res\.cloudinary\.com)$/i.test(url.hostname)
    || (isSupabaseHost(url) && /\/storage\/v1\/object\/(?:public|sign)/i.test(url.pathname));
}

function isSupabaseApiRequest(url) {
  return isSupabaseHost(url) && !/\/storage\/v1\/object\/(?:public|sign)/i.test(url.pathname);
}

function isSupabaseHost(url) {
  return /(?:^|\.)supabase\.(?:co|in)$/i.test(url.hostname);
}

function isAppAsset(request) {
  return ['script', 'style', 'font', 'manifest'].includes(request.destination)
    || /\.(?:js|mjs|css|woff2?|ttf|otf|svg|ico)(?:$|[?#])/i.test(new URL(request.url).pathname);
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (isCacheable(response)) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await caches.match(request))
      || (await caches.match('/index.html'))
      || offlineResponse();
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (isCacheable(response)) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request))
      || new Response(JSON.stringify({ error: 'Offline', message: 'This request is unavailable without a network connection.' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (isCacheable(response)) await cache.put(request, response.clone());
    return response;
  } catch {
    return offlineResponse();
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const update = fetch(request)
    .then((response) => {
      if (isCacheable(response)) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached || offlineResponse());
  return cached || update;
}

function offlineResponse() {
  return new Response(OFFLINE_FALLBACK, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
