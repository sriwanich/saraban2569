import { lazy, ComponentType } from 'react';

/**
 * Enhanced lazy loader with automatic retry and auto-reload on chunk load failure.
 * Retries dynamic import in-memory with exponential backoff before falling back to session reload.
 * Gracefully extracts default or matching named exports.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T } | { [key: string]: any }>,
  componentName?: string
) {
  return lazy(async () => {
    const attempts = 3;
    let lastError: any = null;

    for (let i = 0; i < attempts; i++) {
      try {
        const module = await factory();
        if (module && 'default' in module && module.default) {
          return { default: module.default as T };
        }
        // If exported as named export matching componentName or default fallback
        if (module && typeof module === 'object') {
          if (componentName && (module as any)[componentName]) {
            return { default: (module as any)[componentName] as T };
          }
          const values = Object.values(module);
          const firstComponent = values.find(
            (v) => typeof v === 'function' || (typeof v === 'object' && v !== null && '$$typeof' in v)
          );
          if (firstComponent) {
            return { default: firstComponent as T };
          }
        }
        return module as { default: T };
      } catch (error: any) {
        lastError = error;
        console.warn(
          `[lazyWithRetry] Attempt ${i + 1}/${attempts} failed for ${componentName || 'component'}:`,
          error?.message || error
        );
        if (i < attempts - 1) {
          // Exponential backoff wait before retrying dynamic import
          await new Promise((resolve) => setTimeout(resolve, (i + 1) * 300));
        }
      }
    }

    // If all in-memory attempts failed, check session reload recovery
    const recoveryKey = `dynamic_import_recovered_${componentName || 'general'}`;
    const hasRetried = typeof window !== 'undefined' ? sessionStorage.getItem(recoveryKey) === 'true' : true;

    if (!hasRetried && typeof window !== 'undefined') {
      sessionStorage.setItem(recoveryKey, 'true');
      window.location.reload();
      return new Promise<{ default: T }>(() => {});
    }

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(recoveryKey);
    }
    throw lastError;
  });
}
