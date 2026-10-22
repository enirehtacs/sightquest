import { router } from 'expo-router';

import { useToast, type NavKey } from '@/components';

/** Bottom nav taps. Search, + and Friends arrive in later phases. */
export function useNav() {
  const toast = useToast();
  return (key: NavKey) => {
    if (key === 'explore') router.navigate('/explore');
    else if (key === 'me') router.navigate('/me');
    else if (key === 'search') toast('Search is coming soon.');
    else if (key === 'create') toast('Building routes is coming soon.');
    else toast('Friends is coming soon.');
  };
}
