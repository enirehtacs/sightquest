import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { useAuth } from '@/lib/auth';
import { startQueue } from '@/lib/queue';
import { useTheme } from '@/theme';

/** Everything in here needs someone signed in. */
export default function SignedInLayout() {
  const { ready, uid, session } = useAuth();
  const { c } = useTheme();
  // Days, moments and pins saved on the phone get sent whenever there's signal.
  const signedIn = !!session;
  useEffect(() => {
    if (signedIn) startQueue();
  }, [signedIn]);
  if (!ready) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  if (!uid) return <Redirect href="/splash" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />;
}
