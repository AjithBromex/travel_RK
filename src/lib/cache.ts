// High-performance in-memory Stale-While-Revalidate (SWR) cache with safety timeout

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  isFetching?: boolean;
}

const cacheStore = new Map<string, CacheEntry<unknown>>();

export interface CacheOptions<T> {
  /** Time in ms the cache is considered fresh (default: 30 seconds) */
  ttlMs?: number;
  /** Max time in ms stale data can be served while revalidating in background (default: 5 minutes) */
  staleMs?: number;
  /** Timeout in ms to prevent hanging Firestore network calls (default: 2500ms) */
  timeoutMs?: number;
  /** Fallback data to return if fetch fails and no cache exists */
  fallback: T;
}

/**
 * Executes a fetcher function with SWR caching and a fallback timeout.
 * - If cache is fresh (< ttlMs): returns cached data in <1ms.
 * - If cache is stale (< staleMs): returns stale data instantly and revalidates in the background.
 * - If no cache: executes fetcher with timeout protection.
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions<T>
): Promise<T> {
  const {
    ttlMs = 30000,
    staleMs = 300000,
    timeoutMs = 2500,
    fallback,
  } = options;

  const now = Date.now();
  const cached = cacheStore.get(key) as CacheEntry<T> | undefined;

  // 1. Fresh cache hit -> return immediately
  if (cached && now - cached.timestamp < ttlMs) {
    return cached.data;
  }

  const runWithTimeout = async (): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<T>((resolve) => {
      timer = setTimeout(() => {
        resolve(cached ? cached.data : fallback);
      }, timeoutMs);
    });

    try {
      const data = await Promise.race([fetcher(), timeoutPromise]);
      cacheStore.set(key, { data, timestamp: Date.now(), isFetching: false });
      return data;
    } catch (err) {
      console.warn(`[Cache] Fetch failed for "${key}", using fallback:`, err);
      return cached ? cached.data : fallback;
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  // 2. Stale cache hit -> return stale data immediately, revalidate asynchronously
  if (cached && now - cached.timestamp < staleMs) {
    if (!cached.isFetching) {
      cached.isFetching = true;
      runWithTimeout()
        .catch(() => {})
        .finally(() => {
          const entry = cacheStore.get(key);
          if (entry) entry.isFetching = false;
        });
    }
    return cached.data;
  }

  // 3. Cache miss or deeply expired -> fetch synchronously with timeout protection
  return runWithTimeout();
}

/**
 * Invalidate all cache entries matching a given prefix, or all entries if no prefix is given.
 */
export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    cacheStore.clear();
    return;
  }
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
}
