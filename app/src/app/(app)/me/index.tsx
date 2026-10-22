import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Share, View } from 'react-native';

import { BottomNav, Button, Icon, Screen, Txt } from '@/components';
import { ProfileBody } from '@/features/profile/ProfileBody';
import { useNav } from '@/features/nav/useNav';
import { useAuth } from '@/lib/auth';
import { placeLine, PROFILE_URL } from '@/lib/profiles';
import { mySaves, profileRoutes, type RouteCard, type SavedRoute } from '@/lib/routes';
import { fonts } from '@/theme';

/** My profile — design/prototype/Me.dc.html (MeLight for light mode). */
export default function Me() {
  const { profile, uid } = useAuth();
  const nav = useNav();
  const [routes, setRoutes] = useState<RouteCard[] | null>(null);
  const [saved, setSaved] = useState<SavedRoute[] | null>(null);

  // Refresh when you come back (after saving a route somewhere else).
  useFocusEffect(
    useCallback(() => {
      if (!uid) return;
      let live = true;
      profileRoutes(uid).then((r) => live && setRoutes(r)).catch(() => live && setRoutes([]));
      mySaves(uid).then((s) => live && setSaved(s)).catch(() => live && setSaved([]));
      return () => {
        live = false;
      };
    }, [uid]),
  );
  if (!profile) return <Screen>{null}</Screen>;
  const username = profile.username ?? '';

  return (
    <Screen withNav overlay={<BottomNav active="me" onNavigate={nav} />}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt accessibilityRole="header" style={{ fontFamily: fonts.heavy, fontSize: 22, lineHeight: 26 }}>Your atlas</Txt>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={() => router.push('/settings')}
          style={{ width: 44, height: 44, marginRight: -10, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="settings" size={22} strokeWidth={2} />
        </Pressable>
      </View>
      <ProfileBody
        owner
        name={profile.display_name || username}
        username={username}
        place={placeLine(profile)}
        bio={profile.bio}
        avatarUrl={profile.avatar_url}
        links={profile.links}
        routes={routes}
        saved={saved}
        actions={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Button label="Edit profile" variant="ghost" size="sm" onPress={() => router.push('/me/edit')} block />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Share atlas"
                variant="ghost"
                size="sm"
                onPress={() => Share.share({ message: `My routes on Sightquest: ${PROFILE_URL}${username}`, url: `${PROFILE_URL}${username}` }).catch(() => {})}
                block
              />
            </View>
          </View>
        }
      />
    </Screen>
  );
}
