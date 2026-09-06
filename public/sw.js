// Refra Cinema PWA Service Worker
const CACHE_NAME = 'refra-cinema-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Pass through non-GET requests or streaming video / audio requests
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Skip caching for stream proxies, video chunks, and external media streams
  if (
    url.pathname.startsWith('/api/stream') ||
    url.pathname.startsWith('/api/pixeldrain') ||
    url.hostname.includes('pixeldrain') ||
    url.hostname.includes('vidsrc') ||
    url.hostname.includes('youtube') ||
    url.hostname.includes('googlevideo')
  ) {
    return;
  }

  // Network-first with fallback to cache for pages and APIs
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Optionally cache successful responses for static assets
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.origin === self.location.origin || url.hostname.includes('fonts.'))
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        return new Response('Network unavailable', { status: 503, statusText: 'Offline' });
      })
  );
});
