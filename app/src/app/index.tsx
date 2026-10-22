import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { useAuth } from '@/lib/auth';
import { useTheme } from '@/theme';

/**
 * Where the app opens. New people see Splash; signed-in people who haven't
 * taken the pledge continue onboarding; everyone else goes to Explore.
 */
export default function Gate() {
  const { ready, uid, pledged } = useAuth();
  const { c } = useTheme();

  if (!ready || (uid && pledged === null)) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  if (!uid) return <Redirect href="/splash" />;
  if (!pledged) return <Redirect href="/onboarding/welcome" />;
  return <Redirect href="/explore" />;
}
