import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { clearRecentlyViewed, recentlyViewed, type RouteCard } from '@/lib/routes';

/** Search → Recently viewed: refreshed each time you come back, with Clear. */
export function useRecentlyViewed(uid: string | null) {
  const [recent, setRecent] = useState<RouteCard[]>([]);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      if (uid) recentlyViewed(uid).then((r) => live && setRecent(r)).catch(() => {});
      return () => {
        live = false;
      };
    }, [uid]),
  );

  const clear = async () => {
    setRecent([]);
    if (uid) await clearRecentlyViewed(uid);
  };

  return { recent, clear };
}
