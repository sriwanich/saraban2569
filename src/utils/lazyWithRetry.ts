import { lazy, ComponentType } from 'react';

/**
 * Enhanced lazy loader with automatic retry and auto-reload on chunk load failure.
 * This solves "TypeError: Failed to fetch dynamically imported module" gracefully.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T } | { [key: string]: any }>
) {
  return lazy(async () => {
    try {
      const module = await factory();
      if ('default' in module && module.default) {
        return { default: module.default as T };
      }
      // If exported as named export or default fallback
      const values = Object.values(module);
      const firstComponent = values.find(
        (v) => typeof v === 'function' || (typeof v === 'object' && v !== null && '$$typeof' in v)
      );
      if (firstComponent) {
        return { default: firstComponent as T };
      }
      return module as { default: T };
    } catch (error: any) {
      console.warn('Dynamic import failed, attempting recovery:', error);

      // Check if we already tried recovering during this session
      const hasRetried = sessionStorage.getItem('dynamic_import_recovered');

      if (!hasRetried) {
        sessionStorage.setItem('dynamic_import_recovered', 'true');
        // Small delay then reload page to fetch latest build chunks
        window.location.reload();
        // Return a pending promise while page reloads
        return new Promise<{ default: T }>(() => {});
      }

      // If already retried and still fails, rethrow so ErrorBoundary handles it
      sessionStorage.removeItem('dynamic_import_recovered');
      throw error;
    }
  });
}
