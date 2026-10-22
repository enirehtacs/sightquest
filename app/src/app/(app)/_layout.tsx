import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';

import { useAuth } from '@/lib/auth';
import { useTheme } from '@/theme';

/** Everything in here needs someone signed in. */
export default function SignedInLayout() {
  const { ready, uid } = useAuth();
  const { c } = useTheme();
  if (!ready) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  if (!uid) return <Redirect href="/splash" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />;
}
