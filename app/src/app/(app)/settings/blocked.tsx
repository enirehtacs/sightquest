import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar, Button, Card, Icon, MonoLabel, Screen, Txt, useToast } from '@/components';
import { useAuth } from '@/lib/auth';
import { myBlockedAccounts, unblock, type BlockedAccount } from '@/lib/profiles';
import { fonts } from '@/theme';

/** Settings › Blocked accounts. Only you see this list; nobody is told they were blocked. */
export default function Blocked() {
  const { uid, preview } = useAuth();
  const toast = useToast();
  const [list, setList] = useState<BlockedAccount[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (preview) return setList([]);
      myBlockedAccounts().then(setList).catch(() => setList([]));
    }, [preview]),
  );

  async function undo(b: BlockedAccount) {
    if (!uid) return;
    try {
      await unblock(uid, b.id);
      setList((l) => (l ?? []).filter((x) => x.id !== b.id));
      toast(`Unblocked @${b.username}`);
    } catch {
      toast('Couldn’t unblock. Try again?');
    }
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={{ width: 44, height: 44, marginLeft: -12, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={22} strokeWidth={2.2} />
        </Pressable>
        <Txt accessibilityRole="header" style={{ fontFamily: fonts.heavy, fontSize: 22, lineHeight: 26 }}>Blocked accounts</Txt>
      </View>
      {list === null ? null : list.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: 22 }}>
          <Icon name="shield" size={28} color="act" />
          <Txt color="mu" style={{ textAlign: 'center' }}>
            You haven’t blocked anyone. If someone ever makes Sightquest feel less kind, block them from the ··· on their profile.
          </Txt>
          <Button label="Back to settings" size="sm" variant="ghost" onPress={() => router.back()} />
        </Card>
      ) : (
        list.map((b) => (
          <Card key={b.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar uri={b.avatar_url} name={b.display_name || b.username || ''} size={40} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt variant="bodyStrong" numberOfLines={1}>{b.display_name || b.username}</Txt>
              <MonoLabel size={10} style={{ textTransform: 'none' }}>@{b.username}</MonoLabel>
            </View>
            <Button label="Unblock" size="sm" variant="ghost" onPress={() => undo(b)} />
          </Card>
        ))
      )}
    </Screen>
  );
}
