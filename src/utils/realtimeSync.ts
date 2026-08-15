import { useEffect, useRef } from 'react';

type RealtimeCallback = (data: any) => void;

class RealtimeSyncManager {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<RealtimeCallback>> = new Map();
  private reconnectTimer: any = null;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
      this.setupFocusAndVisibilitySync();
    }
  }

  private init() {
    if (typeof window === 'undefined' || !window.EventSource) return;
    if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) return;
    if (this.isConnecting) return;

    this.isConnecting = true;
    try {
      this.eventSource = new EventSource('/api/events');

      this.eventSource.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.notify('REALTIME_CONNECTED', { time: Date.now() });
      };

      this.eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const eventType = payload.event || 'DATA_UPDATED';
          this.notify(eventType, payload.data || payload);
          this.notify('*', payload);
        } catch (e) {
          // ignore non-json ping
        }
      };

      this.eventSource.onerror = () => {
        this.isConnecting = false;
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        this.scheduleReconnect();
      };
    } catch (err) {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.init();
    }, delay);
  }

  private setupFocusAndVisibilitySync() {
    // When user returns to tab or window gains focus, trigger instant resync
    const handleReactivation = () => {
      if (document.visibilityState === 'visible') {
        this.notify('TAB_FOCUSED', { time: Date.now() });
        this.notify('*', { event: 'TAB_FOCUSED' });
        if (!this.eventSource || this.eventSource.readyState === EventSource.CLOSED) {
          this.init();
        }
      }
    };

    window.addEventListener('focus', handleReactivation);
    document.addEventListener('visibilitychange', handleReactivation);
    window.addEventListener('online', handleReactivation);
  }

  public subscribe(eventNames: string | string[], callback: RealtimeCallback): () => void {
    const events = Array.isArray(eventNames) ? eventNames : [eventNames];
    events.forEach(event => {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set());
      }
      this.listeners.get(event)!.add(callback);
    });

    // Make sure connection is alive
    if (!this.eventSource || this.eventSource.readyState === EventSource.CLOSED) {
      this.init();
    }

    return () => {
      events.forEach(event => {
        const set = this.listeners.get(event);
        if (set) {
          set.delete(callback);
          if (set.size === 0) {
            this.listeners.delete(event);
          }
        }
      });
    };
  }

  public notify(eventName: string, data: any = {}) {
    const set = this.listeners.get(eventName);
    if (set) {
      set.forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in realtime subscriber for ${eventName}:`, e);
        }
      });
    }
  }

  public emitLocal(eventName: string, data: any = {}) {
    this.notify(eventName, data);
    this.notify('*', { event: eventName, data });
  }
}

export const realtimeSync = new RealtimeSyncManager();

/**
 * React hook to listen for realtime server/client events and automatically trigger fresh data loading.
 */
export function useRealtimeSync(
  eventNames: string | string[],
  callback: () => void | Promise<void>,
  deps: any[] = []
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    let timeoutId: any = null;
    const debouncedCallback = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (callbackRef.current) {
          callbackRef.current();
        }
      }, 150); // slight debounce to avoid multiple rapid queries
    };

    const unsubscribe = realtimeSync.subscribe(eventNames, debouncedCallback);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [Array.isArray(eventNames) ? eventNames.join(',') : eventNames, ...deps]);
}
