import { useEffect, useRef, useCallback } from 'react';
import { useOffline } from '@/context/OfflineContext';

interface CacheableItem {
  id: string;
  [key: string]: unknown;
}

const SW_MESSAGES = {
  CACHE_POSTS: 'CACHE_POSTS',
  CACHE_FLYERS: 'CACHE_FLYERS',
  CACHE_BOOKS: 'CACHE_BOOKS',
};

async function readCache<T>(key: string): Promise<T[] | null> {
  try {
    const cache = await caches.open(`grace-book-v2-${key}`);
    const response = await cache.match(`/${key}-cache.json`);
    if (!response) return null;
    return (await response.json()) as T[];
  } catch {
    return null;
  }
}

export function useOfflineCache<T extends CacheableItem>(
  cacheKey: 'posts' | 'flyers' | 'books',
  maxItems = 50,
) {
  const { isOnline } = useOffline();
  const lastFetchRef = useRef<number>(0);

  const cacheItems = useCallback(
    (items: T[]) => {
      if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
      const messageType =
        cacheKey === 'posts'
          ? SW_MESSAGES.CACHE_POSTS
          : cacheKey === 'flyers'
            ? SW_MESSAGES.CACHE_FLYERS
            : SW_MESSAGES.CACHE_BOOKS;
      navigator.serviceWorker.controller.postMessage({
        type: messageType,
        items: items.slice(0, maxItems),
      });
    },
    [cacheKey, maxItems],
  );

  const loadFromCache = useCallback(async (): Promise<T[] | null> => {
    return readCache<T>(cacheKey);
  }, [cacheKey]);

  const shouldRefresh = useCallback(() => {
    return isOnline && Date.now() - lastFetchRef.current > 60_000;
  }, [isOnline]);

  useEffect(() => {
    if (isOnline) {
      lastFetchRef.current = Date.now();
    }
  }, [isOnline]);

  return { cacheItems, loadFromCache, shouldRefresh, isOnline };
}
