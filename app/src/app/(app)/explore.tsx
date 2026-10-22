import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Avatar, BottomNav, Card, Icon, MonoLabel, Screen, Txt, useToast } from '@/components';
import { useNav } from '@/features/nav/useNav';
import { useAuth } from '@/lib/auth';
import { listCreators, myFollowingIds, placeLine, type PublicProfile } from '@/lib/profiles';
import { fonts, radius, useTheme } from '@/theme';

/**
 * Explore — the end of onboarding. Phase 2 fills it with real routes
 * (design/prototype/Main.dc.html); for now it greets you and suggests people.
 */
export default function Explore() {
  const { profile, uid, preview } = useAuth();
  const { c } = useTheme();
  const nav = useNav();
  const toast = useToast();
  const [people, setPeople] = useState<PublicProfile[] | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  // Refresh when you come back, e.g. after following someone.
  useFocusEffect(
    useCallback(() => {
      if (!uid) return;
      listCreators(uid)
        .then(setPeople)
        .catch(() => setPeople([]));
      if (!preview) myFollowingIds(uid).then(setFollowingIds).catch(() => {});
    }, [uid, preview]),
  );

  const first = (profile?.display_name || profile?.username || 'traveller').split(' ')[0];

  return (
    <Screen withNav overlay={<BottomNav active="explore" onNavigate={nav} />}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="logo" size={26} color="act" strokeWidth={1.6} />
          <Text style={{ fontFamily: fonts.heavy, fontSize: 18, color: c.tx }}>Sightquest</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Inbox"
          onPress={() => toast('Your inbox is coming soon.')}
          style={{ width: 44, height: 44, marginRight: -10, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="bell" size={22} strokeWidth={2} />
        </Pressable>
      </View>

      <Txt accessibilityRole="header" style={{ fontFamily: fonts.heavy, fontSize: 24, lineHeight: 28 }}>For you, {first}</Txt>

      <Card style={{ gap: 8 }}>
        <MonoLabel bold color="act">ROUTES ARE ON THE WAY</MonoLabel>
        <Txt>Day-by-day routes from real travellers land here very soon. Meanwhile, follow a few people so their routes find you first.</Txt>
      </Card>

      <View style={{ gap: 10 }}>
        <Txt variant="h2">People to follow</Txt>
        {people === null ? (
          <Txt color="mu">Finding people…</Txt>
        ) : people.length === 0 ? (
          <Card><Txt color="mu">Nobody to suggest yet. Invite a friend who travels.</Txt></Card>
        ) : (
          people.map((p, i) => (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={`${p.display_name || p.username}, @${p.username}`}
              onPress={() => router.push(`/u/${p.username}`)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                borderRadius: radius.card,
                borderWidth: 1,
                borderColor: c.ln,
                backgroundColor: c.sf,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Avatar uri={p.avatar_url} name={p.display_name || p.username} size={44} tone={((i % 4) + 1) as 1 | 2 | 3 | 4} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Txt variant="bodyStrong" numberOfLines={1}>{p.display_name || p.username}</Txt>
                <MonoLabel size={10} style={{ textTransform: 'none' }} numberOfLines={1}>
                  @{p.username}
                  {placeLine(p) ? ` · ${placeLine(p).toUpperCase()}` : ''}
                </MonoLabel>
              </View>
              {followingIds.has(p.id) ? <MonoLabel bold color="act">FOLLOWING</MonoLabel> : <Icon name="next" size={18} color="mu" strokeWidth={2.2} />}
            </Pressable>
          ))
        )}
      </View>
    </Screen>
  );
}
