'use client';

import { useEffect } from 'react';
import { Workbox } from 'workbox-window';

/**
 * Registers the Workbox Service Worker (/sw.js) on client-side mount.
 * Enables PWA installability, app shell caching, and offline interception.
 */
export function ServiceWorkerRegister(): null {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      const wb = new Workbox('/sw.js');

      wb.addEventListener('waiting', () => {
        // Automatically prompt waiting worker to skip waiting and activate
        wb.messageSkipWaiting();
      });

      wb.addEventListener('controlling', () => {
        // Reload page once new service worker takes control
        window.location.reload();
      });

      wb.register().catch((err: unknown) => {
        // Gracefully ignore registration failure in unsupported environments
        console.warn('BodhAI Service Worker registration failed:', err);
      });
    }
  }, []);

  return null;
}
