/**
 * Wardi Pro — Service Worker
 * Provides offline caching for App Shell, Fonts, and Quran responses.
 * Fully compatible with GitHub Pages subpath deployments.
 */

const CACHE_NAME = 'wardi-pro-v5';

// Essential App Shell assets
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/style.css',
  './assets/js/storage.js',
  './assets/js/history.js',
  './assets/js/prayer.js',
  './assets/js/quran.js',
  './assets/js/tasbeeh.js',
  './assets/js/duas.js',
  './assets/js/app.js',
  './data/duas.json',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

/* ------------------------------------------------------------------ */
/*  Install Event: Pre-cache App Shell                                */
/* ------------------------------------------------------------------ */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline shell');
      // Use addAll with graceful per-item catch so single missing file doesn't abort install
      return Promise.allSettled(
        PRECACHE_ASSETS.map(url => cache.add(url).catch(err => console.warn(`[ServiceWorker] Cache fail for ${url}:`, err)))
      );
    }).then(() => self.skipWaiting())
  );
});

/* ------------------------------------------------------------------ */
/*  Activate Event: Clean up outdated caches                          */
/* ------------------------------------------------------------------ */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

/* ------------------------------------------------------------------ */
/*  Fetch Event: Stale-While-Revalidate & API Caching                 */
/* ------------------------------------------------------------------ */
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1. AlQuran Cloud API responses -> Cache First / Stale-While-Revalidate
  if (url.origin.includes('alquran.cloud')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(req);
        if (cachedResponse) {
          // Return cache immediately, refresh in background
          fetch(req).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(req, networkResponse.clone());
            }
          }).catch(() => {});
          return cachedResponse;
        }

        // Not cached yet, fetch from network and cache
        return fetch(req).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(req, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // If network failed and not in cache, return graceful error JSON
          return new Response(JSON.stringify({
            code: 503,
            status: "Unavailable Offline",
            data: null
          }), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          });
        });
      })
    );
    return;
  }

  // 2. Google Fonts (Amiri, Noto Sans Arabic)
  if (url.origin.includes('fonts.googleapis.com') || url.origin.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const networkResponse = await fetch(req);
          if (networkResponse.status === 200) {
            cache.put(req, networkResponse.clone());
          }
          return networkResponse;
        } catch (e) {
          return cached || new Response('', { status: 408 });
        }
      })
    );
    return;
  }

  // 3. App Shell & local assets -> Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkResponse;
      }).catch((fetchErr) => {
        // Fallback to index.html for navigation requests if offline
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
        throw fetchErr;
      });

      return cachedResponse || fetchPromise;
    })
  );
});

