import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Icon, MonoLabel, Screen, Txt } from '@/components';
import { supabase } from '@/lib/supabase';

type Status = 'checking' | 'ok' | 'error';

// Phase 0 placeholder home. Phase 1 replaces it with Splash → Welcome → Explore.
export default function Home() {
  const [db, setDb] = useState<Status>('checking');

  useEffect(() => {
    // A signed-out read. Profiles are closed to signed-out visitors, so
    // "permission denied" (42501) means we reached the database and it's locked.
    // A normal GET, not a HEAD request: HEAD replies carry no error code.
    supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .then(({ error }) => setDb(!error || error.code === '42501' ? 'ok' : 'error'));
  }, []);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8 }}>
        <Icon name="logo" size={28} color="act" strokeWidth={1.6} />
        <Txt variant="title" style={{ fontSize: 16 }}>Sightquest</Txt>
      </View>
      <View style={{ gap: 6 }}>
        <Txt variant="h1">Foundations are in.</Txt>
        <Txt color="mu">The real screens arrive in Phase 1. For now, here’s the kit they’ll be built from.</Txt>
      </View>
      <Card>
        <MonoLabel bold color={db === 'ok' ? 'act' : db === 'error' ? 'danger' : 'mu'}>
          {db === 'ok' ? '● DATABASE CONNECTED' : db === 'error' ? '● DATABASE NOT REACHABLE' : '○ CHECKING DATABASE…'}
        </MonoLabel>
        <Txt variant="small">Supabase, with row-level security switched on.</Txt>
      </Card>
      <Button label="Open the components page" icon="next" onPress={() => router.push('/dev/components')} block />
    </Screen>
  );
}
