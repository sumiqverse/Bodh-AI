'use client';

import { useEffect } from 'react';

/**
 * Registers the Workbox Service Worker (/sw.js) only in production on non-localhost.
 * In development or on localhost, purges old service workers and caches to prevent stale chunk errors.
 */
export function ServiceWorkerRegister(): null {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.endsWith('.local');

    if (process.env.NODE_ENV !== 'production' || isLocalhost) {
      // Unregister any active service workers on localhost to avoid stale cache chunk errors
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
      if ('caches' in window) {
        caches.keys().then((keys) => {
          for (const key of keys) {
            caches.delete(key);
          }
        });
      }
      return;
    }

    // Only in production on deployed domains:
    import('workbox-window').then(({ Workbox }) => {
      const wb = new Workbox('/sw.js');
      wb.addEventListener('waiting', () => {
        wb.messageSkipWaiting();
      });
      wb.addEventListener('controlling', () => {
        window.location.reload();
      });
      wb.register().catch((err: unknown) => {
        console.warn('BodhAI Service Worker registration failed:', err);
      });
    });
  }, []);

  return null;
}
