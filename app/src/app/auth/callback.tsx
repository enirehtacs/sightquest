import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { Button, Screen, Txt } from '@/components';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

/**
 * Apple, Google and email links come back here with a one-time code.
 * On the web the Supabase client swaps it for a session by itself; in the
 * app we swap it here. Then the gate decides where to go.
 */
export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string; error_description?: string; next?: string }>();
  const { session } = useAuth();
  const [error, setError] = useState<string | null>(params.error_description ?? null);

  useEffect(() => {
    if (Platform.OS === 'web' || !params.code) return;
    supabase.auth.exchangeCodeForSession(params.code).then(({ error: e }) => e && setError(e.message));
  }, [params.code]);

  useEffect(() => {
    // Only a known in-app path, never somewhere a link tells us to go.
    if (session) router.replace(params.next === '/settings/password' ? '/settings/password' : '/');
  }, [session, params.next]);

  useEffect(() => {
    if (params.code || params.error_description) return;
    const t = setTimeout(() => setError('That link didn’t work. It may have expired.'), 8000);
    return () => clearTimeout(t);
  }, [params.code, params.error_description]);

  return (
    <Screen scroll={false} contentStyle={{ justifyContent: 'center', alignItems: 'center' }}>
      {error ? (
        <View style={{ gap: 14, alignItems: 'center', maxWidth: 340 }}>
          <Txt variant="h2">Couldn’t sign you in</Txt>
          <Txt color="mu" style={{ textAlign: 'center' }}>{error}</Txt>
          <Button label="Back to the start" onPress={() => router.replace('/splash')} />
        </View>
      ) : (
        <Txt color="mu">Signing you in…</Txt>
      )}
    </Screen>
  );
}
