/**
 * BodhAI Service Worker with Workbox Runtime Strategies.
 * Features:
 * - App shell precaching (offline.html, manifest.json, icons)
 * - CacheFirst for static assets, scripts, stylesheets, and fonts
 * - StaleWhileRevalidate for curriculum metadata and skill definitions
 * - NetworkFirst with offline.html fallback for navigation routes
 * - NetworkOnly for sync endpoints, authentication, and attempt mutations
 */

importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

// If running on localhost or dev server, self-purge all caches to avoid stale chunks and hydration errors
if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .then(() => self.registration.unregister())
        .then(() => self.clients.claim()),
    );
  });
} else if (self.workbox) {
  // Precache app shell and offline assets
  const PRECACHE_ASSETS = [
    { url: '/offline.html', revision: 'v1.0.0' },
    { url: '/manifest.json', revision: 'v1.0.0' },
    { url: '/icons/icon-192.svg', revision: 'v1.0.0' },
    { url: '/icons/icon-512.svg', revision: 'v1.0.0' },
  ];

  workbox.precaching.precacheAndRoute(PRECACHE_ASSETS);

  // CacheFirst strategy for static images and assets
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image' || request.destination === 'font',
    new workbox.strategies.CacheFirst({
      cacheName: 'bodhai-media-cache-v1',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    }),
  );

  // CacheFirst strategy for JS and CSS bundles
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'style' || request.destination === 'script',
    new workbox.strategies.CacheFirst({
      cacheName: 'bodhai-static-resources-v1',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 80,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 Days
        }),
      ],
    }),
  );

  // StaleWhileRevalidate for curriculum read endpoints
  workbox.routing.registerRoute(
    ({ url, request }) =>
      request.method === 'GET' &&
      (url.pathname.startsWith('/api/v1/curricula') ||
        url.pathname.startsWith('/api/v1/skills') ||
        url.pathname.startsWith('/api/v1/chapters')),
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'bodhai-api-curricula-v1',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 24 * 60 * 60, // 24 Hours
        }),
      ],
    }),
  );

  // NetworkOnly for sync, auth, attempts
  workbox.routing.registerRoute(
    ({ url }) =>
      url.pathname.startsWith('/api/v1/sync') ||
      url.pathname.startsWith('/api/v1/auth') ||
      url.pathname.startsWith('/api/v1/attempts'),
    new workbox.strategies.NetworkOnly(),
  );

  // NetworkFirst with offline fallback for navigation requests
  const navigationHandler = new workbox.strategies.NetworkFirst({
    cacheName: 'bodhai-pages-cache-v1',
    networkTimeoutSeconds: 3,
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60,
      }),
    ],
  });

  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    async (params) => {
      try {
        return await navigationHandler.handle(params);
      } catch {
        return (await caches.match('/offline.html')) || Response.error();
      }
    },
  );

  // Listen for skipWaiting message from client
  self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  });
} else {
  // Fallback vanilla service worker implementation if Workbox CDN unavailable
  const CACHE_NAME = 'bodhai-fallback-v1';
  const CORE_ASSETS = [
    '/offline.html',
    '/manifest.json',
    '/icons/icon-192.svg',
    '/icons/icon-512.svg',
  ];

  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then((cache) => cache.addAll(CORE_ASSETS))
        .then(() => self.skipWaiting()),
    );
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches
        .keys()
        .then((keys) =>
          Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
        )
        .then(() => self.clients.claim()),
    );
  });

  self.addEventListener('fetch', (event) => {
    if (event.request.mode === 'navigate') {
      event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
    }
  });
}
