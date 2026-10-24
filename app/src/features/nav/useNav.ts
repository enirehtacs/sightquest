import { router } from 'expo-router';

import { useToast, type NavKey } from '@/components';

/** Bottom nav taps. Friends arrives in a later phase. */
export function useNav() {
  const toast = useToast();
  return (key: NavKey) => {
    if (key === 'explore') router.navigate('/explore');
    else if (key === 'me') router.navigate('/me');
    else if (key === 'search') router.navigate('/search');
    else if (key === 'create') router.push('/build/new');
    else toast('Friends is coming soon.');
  };
}
