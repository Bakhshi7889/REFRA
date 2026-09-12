// Refra Cinema PWA Service Worker v8 - Direct CDN & High Performance Offline-First
const SHELL_CACHE = 'refra-shell-v8';
const ASSETS_CACHE = 'refra-assets-v8';
const ICONS_IMAGES_CACHE = 'refra-icons-images-v8';
const DATA_CACHE = 'refra-api-data-v8';

const CURRENT_CACHES = [SHELL_CACHE, ASSETS_CACHE, ICONS_IMAGES_CACHE, DATA_CACHE];

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/refra_logo_vector.svg',
  '/favicon.svg',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/penguplay-icon.png',
  '/icons/thepiratebay.png',
  '/icons/torrentclaw.png',
  '/icons/torrentio.png',
  '/icons/torrentsdb.svg',
  '/icons/comet.png'
];

// Precache essential static shell assets safely
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('[PWA SW] Precache warning for ' + asset + ':', err);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// Clean up previous cache generations and claim all open clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => !CURRENT_CACHES.includes(key)).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Listen for explicit skipWaiting and cache purge messages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'PURGE_ALL_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(keys.map((k) => caches.delete(k)));
      }).then(() => self.skipWaiting())
    );
  }
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Bypass streaming video chunks, torrent resolvers, and external video embeds
  if (
    url.pathname.startsWith('/api/stream') ||
    url.pathname.startsWith('/api/pixeldrain') ||
    url.hostname.includes('pixeldrain') ||
    url.hostname.includes('vidsrc') ||
    url.hostname.includes('youtube') ||
    url.hostname.includes('googlevideo') ||
    url.hostname.includes('webtor')
  ) {
    return;
  }

  // 1. Navigation requests: Network with 1.8s timeout, then instant fallback to cached shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Fast timeout fetch for slow mobile connections
          const fetchPromise = fetch(event.request);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Navigation timeout')), 1800)
          );

          const response = await Promise.race([fetchPromise, timeoutPromise]);
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, clone));
            return response;
          }
        } catch {
          // Network failed or timed out — serve cached shell instantly
        }

        const cached = await caches.match(event.request);
        if (cached) return cached;

        const shell = (await caches.match('/')) || (await caches.match('/index.html'));
        if (shell) return shell;

        return new Response('<!DOCTYPE html><html><body>Offline - Refra Cinema</body></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      })()
    );
    return;
  }

  // 2. Cross-origin TMDB and anime CDNs: bypass Service Worker interception so that native browser network errors
  // cleanly trigger React <img onError> and route immediately via /api/image server proxy
  if (
    url.hostname.includes('image.tmdb.org') ||
    url.hostname.includes('anilist.co') ||
    url.hostname.includes('myanimelist.net')
  ) {
    return;
  }

  // 3. Icons, Posters, Images & Fonts: CACHE-FIRST Strategy (Zero bandwidth when cached)
  const isImageOrIcon =
    event.request.destination === 'image' ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|gif)$/i) ||
    url.pathname.includes('/icons/') ||
    url.pathname.startsWith('/api/image') ||
    url.hostname.includes('images.unsplash.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('fonts.googleapis.com');

  if (isImageOrIcon) {
    event.respondWith(
      caches.match(event.request).then(async (cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          // Safeguard against Chrome only-if-cached error on cross-origin requests
          const fetchPromise =
            event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin'
              ? fetch(event.request.url)
              : fetch(event.request);

          const networkResponse = await fetchPromise;
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            // Only cache local static assets and server image proxy to conserve mobile cache quota
            if (!url.hostname.includes('image.tmdb.org') || url.pathname.startsWith('/api/image')) {
              try {
                const clone = networkResponse.clone();
                caches.open(ICONS_IMAGES_CACHE).then((cache) => cache.put(event.request, clone)).catch(() => {});
              } catch {}
            }
          }
          return networkResponse;
        } catch {
          // Return HTTP 504 Gateway Timeout so browser <img> tags trigger onError handlers
          // and gracefully switch to server proxy or refined inline cinema artwork
          return new Response('Image network request failed', {
            status: 504,
            statusText: 'Gateway Timeout',
            headers: { 'Content-Type': 'text/plain' },
          });
        }
      })
    );
    return;
  }

  // 3. API Data Requests (TMDB proxy, discover, providers, AniList, reviews):
  // Stale-While-Revalidate with fast return
  const isApiRequest =
    url.pathname.startsWith('/api/tmdb') ||
    url.pathname.startsWith('/api/discover') ||
    url.pathname.startsWith('/api/watch-providers') ||
    url.pathname.startsWith('/api/reviews') ||
    url.hostname.includes('api.themoviedb.org') ||
    url.hostname.includes('graphql.anilist.co');

  if (isApiRequest) {
    event.respondWith(
      caches.match(event.request).then(async (cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then(async (networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              const cache = await caches.open(DATA_CACHE);
              cache.put(event.request, clone);
            }
            return networkResponse;
          })
          .catch(() => {
            if (cachedResponse) return cachedResponse;
            return new Response(JSON.stringify({ results: [], offline: true }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          });

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 4. Bundled JS / CSS / Static assets: Stale-While-Revalidate / Cache-First
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(ASSETS_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse || new Response('Asset unavailable offline', { status: 503 }));

      return cachedResponse || fetchPromise;
    })
  );
});

