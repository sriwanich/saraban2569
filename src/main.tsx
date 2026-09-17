
// Suppress benign Firebase offline warnings in the preview iframe
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' && 
    (args[0].includes('Could not reach Cloud Firestore backend') || args[0].includes('[code=unavailable]'))
  ) {
    return;
  }
  originalConsoleError(...args);
};

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// 1. Force unregister any lingering service workers and clear CacheStorage to guarantee zero static asset caching
if (typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then(() => {
          console.log('[CacheGuard] Unregistered legacy service worker.');
        });
      }
    });
  }
  if ('caches' in window) {
    caches.keys().then((keys) => {
      keys.forEach((key) => {
        caches.delete(key);
      });
    });
  }

  // 2. Patch global window.fetch safely without throwing if fetch is getter-only
  try {
    const originalFetch = window.fetch;
    if (originalFetch) {
      const customFetch = function (this: any, input: RequestInfo | URL, init?: RequestInit) {
        let url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);

        // Check if user configured a custom backend API URL (e.g. http://server-ip:3000 or https://api.domain.com)
        try {
          const customApiBase = localStorage.getItem('edms_custom_api_url');
          if (customApiBase && (url.startsWith('/api/') || url === '/api')) {
            url = customApiBase.replace(/\/+$/, '') + url;
          }
        } catch (e) {}

        if (url.startsWith('/api/') || url.includes('/api/')) {
          const separator = url.includes('?') ? '&' : '?';
          if (!url.includes('_t=')) {
            url = `${url}${separator}_t=${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          }
          init = {
            cache: 'no-store',
            ...init,
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
              ...(init?.headers || {})
            }
          };
        }
        return originalFetch.call(this, url, init);
      };

      try {
        window.fetch = customFetch;
      } catch (e) {
        Object.defineProperty(window, 'fetch', {
          value: customFetch,
          writable: true,
          configurable: true,
          enumerable: true
        });
      }
    }
  } catch (err) {
    console.warn('[CacheGuard] Could not override fetch:', err);
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

