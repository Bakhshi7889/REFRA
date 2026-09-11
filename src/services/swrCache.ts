import { useState, useEffect, useRef, useCallback } from 'react';
import { areMovieListsDifferent } from './movieCache';
import { getIndexedDbSetting, saveIndexedDbSetting } from './indexedDb';

export interface SWREntry<T> {
  data: T;
  timestamp: number;
}

export interface SWROptions<T> {
  /** Callback fired whenever background revalidation completes with genuinely new/changed data */
  onRevalidate?: (freshData: T) => void;
  /** Custom comparator to determine if fresh data differs from stale cache. Default uses smart comparator. */
  isDifferent?: (cached: T, fresh: T) => boolean;
  /** Force network revalidation even if cache is fresh */
  forceRevalidate?: boolean;
  /** Maximum soft age in ms before background revalidation is recommended. Default: 6 hours */
  ttl?: number;
  /** Optional fallback data if neither cache nor network succeeds */
  fallbackData?: T;
}

const DEFAULT_TTL = 6 * 60 * 60 * 1000; // 6 hours

// In-memory Level-1 SWR cache for 0ms synchronous access
const memoryCache = new Map<string, SWREntry<any>>();

// Map to deduplicate concurrent in-flight revalidations for the same key
const inFlightRequests = new Map<string, Promise<any>>();

// Pub/Sub listener map for background revalidation updates
const listeners = new Map<string, Set<(data: any) => void>>();

/**
 * Smart structural comparator for cinema data (Movie[], Review[], WatchProvider[], Movie, or objects).
 * Returns true if incoming data has meaningful differences.
 */
export function isDataDifferent<T>(current: T, incoming: T): boolean {
  if (current === incoming) return false;
  if (!current || !incoming) return true;

  // Handle arrays
  if (Array.isArray(current) && Array.isArray(incoming)) {
    if (current.length !== incoming.length) return true;
    if (current.length === 0) return false;

    // Check if array elements are Movies (have 'id' and 'score' or 'title')
    const firstCur = current[0];
    const firstInc = incoming[0];
    if (firstCur && firstInc && typeof firstCur === 'object') {
      if ('score' in firstCur || 'director' in firstCur) {
        return areMovieListsDifferent(current as any, incoming as any);
      }

      // Check for Reviews (have author, rating, or score)
      if ('author' in firstCur && 'rating' in firstCur) {
        for (let i = 0; i < incoming.length; i++) {
          const c = current[i];
          const n = incoming[i];
          if (!c || !n || c.id !== n.id || c.rating !== n.rating || c.content !== n.content) {
            return true;
          }
        }
        return false;
      }

      // Check for WatchProviders (have provider_id or id)
      if ('provider_id' in firstCur || 'provider_name' in firstCur) {
        for (let i = 0; i < incoming.length; i++) {
          const c = current[i];
          const n = incoming[i];
          if (!c || !n || c.provider_id !== n.provider_id) {
            return true;
          }
        }
        return false;
      }
    }

    // Default array comparison
    return JSON.stringify(current) !== JSON.stringify(incoming);
  }

  // Handle single Movie or detailed object
  if (typeof current === 'object' && typeof incoming === 'object') {
    const curObj = current as Record<string, any>;
    const incObj = incoming as Record<string, any>;
    if (curObj.id !== incObj.id) return true;
    if (curObj.score !== incObj.score) return true;
    if (curObj.title !== incObj.title) return true;
    if (curObj.synopsis !== incObj.synopsis) return true;
    if (Array.isArray(curObj.episodes) && Array.isArray(incObj.episodes)) {
      if (curObj.episodes.length !== incObj.episodes.length) return true;
    }
    return false;
  }

  return current !== incoming;
}

/**
 * Synchronously retrieves cached data for immediate 0ms UI rendering.
 * Checks memory first, then localStorage.
 */
export function getCachedSWR<T>(key: string): T | null {
  // 1. Check Level-1 memory cache
  const inMem = memoryCache.get(key);
  if (inMem && inMem.data !== undefined) {
    return inMem.data as T;
  }

  // 2. Check Level-2 localStorage cache
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`refra_swr_${key}`);
      if (raw) {
        const parsed: SWREntry<T> = JSON.parse(raw);
        if (parsed && parsed.data !== undefined) {
          // Promote to memory cache
          memoryCache.set(key, parsed);
          return parsed.data;
        }
      }
    } catch {
      // Storage unavailable or parsing error
    }
  }

  return null;
}

/**
 * Saves data into SWR cache (Memory + LocalStorage + IndexedDB backup).
 */
export function setCachedSWR<T>(key: string, data: T): void {
  if (data === undefined) return;

  const entry: SWREntry<T> = {
    data,
    timestamp: Date.now(),
  };

  // Level 1: Memory
  memoryCache.set(key, entry);

  // Level 2: LocalStorage (synchronous)
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`refra_swr_${key}`, JSON.stringify(entry));
    } catch {
      // Quota exceeded; ignore safely
    }
  }

  // Level 3: IndexedDB (asynchronous background persistence)
  saveIndexedDbSetting(`swr_${key}`, entry).catch(() => {});
}

/**
 * Subscribes to background revalidations for a key.
 * Returns an unsubscribe function.
 */
export function subscribeSWR<T>(key: string, listener: (data: T) => void): () => void {
  let keyListeners = listeners.get(key);
  if (!keyListeners) {
    keyListeners = new Set();
    listeners.set(key, keyListeners);
  }
  keyListeners.add(listener);

  return () => {
    keyListeners?.delete(listener);
    if (keyListeners?.size === 0) {
      listeners.delete(key);
    }
  };
}

/**
 * Emits updated data to all active subscribers for a key.
 */
function emitSWRUpdate<T>(key: string, data: T): void {
  const keyListeners = listeners.get(key);
  if (keyListeners) {
    keyListeners.forEach((listener) => {
      try {
        listener(data);
      } catch (err) {
        console.warn('SWR listener error:', err);
      }
    });
  }
}

/**
 * Invalidates cached entry for a key, or clears all SWR caches if no key is provided.
 */
export function invalidateSWR(key?: string): void {
  if (key) {
    memoryCache.delete(key);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`refra_swr_${key}`);
      } catch {
        // storage error
      }
    }
  } else {
    memoryCache.clear();
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('refra_swr_')) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {
        // storage error
      }
    }
  }
}

/**
 * Core Stale-While-Revalidate fetch function.
 *
 * 1. Checks memory & localStorage for cached data.
 * 2. If cached data exists:
 *    - Resolves IMMEDIATELY with cached data (0ms load time).
 *    - Initiates background revalidation against fetcher().
 *    - Deduplicates concurrent in-flight requests for the same key.
 *    - When revalidation returns:
 *      - If incoming data is different, updates cache and fires onRevalidate + subscribers.
 *      - If incoming data is identical, touches timestamp without triggering UI updates.
 * 3. If no cached data exists:
 *    - Awaits fetcher(), saves to cache, and returns fresh data.
 */
export async function swrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: SWROptions<T> = {}
): Promise<T> {
  const {
    onRevalidate,
    isDifferent = isDataDifferent,
    forceRevalidate = false,
    ttl = DEFAULT_TTL,
    fallbackData,
  } = options;

  const cachedData = getCachedSWR<T>(key);
  const memEntry = memoryCache.get(key);
  const isStale = !memEntry || Date.now() - memEntry.timestamp > ttl;

  // Background revalidation executor (deduplicated across calls)
  const executeRevalidation = (): Promise<T> => {
    if (inFlightRequests.has(key)) {
      return inFlightRequests.get(key)!;
    }

    const revalidatePromise = (async () => {
      try {
        const freshData = await fetcher();

        // If fresh data is valid
        if (freshData !== undefined && freshData !== null) {
          const currentData = getCachedSWR<T>(key);
          const hasChanged = currentData === null || isDifferent(currentData, freshData);

          if (hasChanged) {
            setCachedSWR(key, freshData);
            emitSWRUpdate(key, freshData);
            if (onRevalidate) {
              try {
                onRevalidate(freshData);
              } catch (err) {
                console.warn('SWR onRevalidate callback error:', err);
              }
            }
          } else if (memEntry) {
            // Touch timestamp silently
            memEntry.timestamp = Date.now();
          }

          return freshData;
        }

        return cachedData ?? (fallbackData as T);
      } catch (error) {
        console.warn(`SWR revalidation failed for [${key}]:`, error);
        return cachedData ?? (fallbackData as T);
      } finally {
        inFlightRequests.delete(key);
      }
    })();

    inFlightRequests.set(key, revalidatePromise);
    return revalidatePromise;
  };

  // Case A: Cached content exists and we're not explicitly forcing a blocking revalidation
  if (cachedData !== null && !forceRevalidate) {
    // If cache is stale or background update desired, trigger revalidation silently
    if (isStale || onRevalidate || listeners.has(key)) {
      // Run revalidation in the background without blocking the caller
      setTimeout(() => {
        executeRevalidation().catch(() => {});
      }, 0);
    }
    // Return cached content immediately!
    return cachedData;
  }

  // Case B: No cached content or forceRevalidate is true -> execute fetcher now
  try {
    const fresh = await executeRevalidation();
    return fresh ?? (fallbackData as T);
  } catch (err) {
    if (cachedData !== null) {
      return cachedData;
    }
    if (fallbackData !== undefined) {
      return fallbackData;
    }
    throw err;
  }
}

/**
 * React hook implementing Stale-While-Revalidate pattern.
 *
 * - Returns cached data synchronously on the very first render (zero flash).
 * - Automatically revalidates in the background if stale or mounted.
 * - Silently updates state ONLY if new data from the API differs from current state.
 */
export function useSWRQuery<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options: {
    initialData?: T;
    isDifferent?: (a: T, b: T) => boolean;
    enabled?: boolean;
    ttl?: number;
  } = {}
) {
  const { initialData, isDifferent = isDataDifferent, enabled = true, ttl } = options;

  // Initialize with cached data synchronously
  const [data, setData] = useState<T | undefined>(() => {
    if (!key) return initialData;
    const cached = getCachedSWR<T>(key);
    return cached !== null ? cached : initialData;
  });

  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const dataRef = useRef<T | undefined>(data);
  dataRef.current = data;

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Manual mutator
  const mutate = useCallback(
    async (newData?: T | Promise<T>) => {
      if (!key) return;
      if (newData !== undefined) {
        const resolved = await Promise.resolve(newData);
        setCachedSWR(key, resolved);
        setData(resolved);
        emitSWRUpdate(key, resolved);
      } else {
        setIsValidating(true);
        try {
          const fresh = await fetcherRef.current();
          if (fresh !== undefined) {
            const current = dataRef.current;
            if (current === undefined || isDifferent(current, fresh)) {
              setCachedSWR(key, fresh);
              setData(fresh);
              emitSWRUpdate(key, fresh);
            }
          }
        } catch (err: any) {
          setError(err);
        } finally {
          setIsValidating(false);
        }
      }
    },
    [key, isDifferent]
  );

  useEffect(() => {
    if (!key || !enabled) return;

    let isMounted = true;

    // Check if we need to update state from cache immediately on key change
    const cached = getCachedSWR<T>(key);
    if (cached !== null && cached !== dataRef.current) {
      setData(cached);
    }

    // Subscribe to external/background updates for this key
    const unsubscribe = subscribeSWR<T>(key, (fresh) => {
      if (!isMounted) return;
      if (dataRef.current === undefined || isDifferent(dataRef.current, fresh)) {
        setData(fresh);
      }
    });

    // Execute SWR fetch
    setIsValidating(true);
    swrFetch<T>(key, () => fetcherRef.current(), {
      isDifferent,
      ttl,
      onRevalidate: (fresh) => {
        if (!isMounted) return;
        if (dataRef.current === undefined || isDifferent(dataRef.current, fresh)) {
          setData(fresh);
        }
      },
    })
      .then((res) => {
        if (!isMounted) return;
        if (dataRef.current === undefined || isDifferent(dataRef.current, res)) {
          setData(res);
        }
        setError(null);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err);
      })
      .finally(() => {
        if (isMounted) setIsValidating(false);
      });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [key, enabled, isDifferent, ttl]);

  return {
    data,
    isLoading: data === undefined && isValidating,
    isValidating,
    error,
    mutate,
  };
}
