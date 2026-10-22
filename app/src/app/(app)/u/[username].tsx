import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';

import { Button, Icon, MonoLabel, Screen, Sheet, Txt, useToast } from '@/components';
import { CREATOR_SAMPLES, PREVIEW_CREATOR } from '@/data/seed';
import { ProfileBody } from '@/features/profile/ProfileBody';
import { useAuth } from '@/lib/auth';
import {
  block,
  follow,
  getFollow,
  getPublicProfile,
  placeLine,
  PROFILE_URL,
  setNotify,
  unfollow,
  type PublicProfile,
} from '@/lib/profiles';
import { fonts, radius, useTheme } from '@/theme';

/** Creator profile — design/prototype/Profile.dc.html (Me in visitor view). */
export default function CreatorProfile() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { uid, profile: me, preview } = useAuth();
  const { c } = useTheme();
  const toast = useToast();
  const [p, setP] = useState<PublicProfile | null | undefined>(undefined);
  const [following, setFollowing] = useState(false);
  const [notify, setNotifyState] = useState(false);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);

  useEffect(() => {
    if (!username) return;
    let live = true;
    (async () => {
      try {
        const prof = preview ? (username === PREVIEW_CREATOR.username ? PREVIEW_CREATOR : null) : await getPublicProfile(username);
        if (!live) return;
        setP(prof);
        if (prof && uid && !preview) {
          const f = await getFollow(uid, prof.id);
          if (!live) return;
          setFollowing(f.following);
          setNotifyState(f.notify);
        }
      } catch {
        if (live) setP(null);
      }
    })();
    return () => {
      live = false;
    };
  }, [username, uid, preview]);

  if (me?.username && username?.toLowerCase() === me.username) return <Redirect href="/me" />;

  const back = () => (router.canGoBack() ? router.back() : router.replace('/explore'));

  async function toggleFollow() {
    if (!p || !uid) return;
    if (preview) return toast('Preview mode: nothing is saved.');
    setBusy(true);
    const next = !following;
    setFollowing(next);
    if (!next) setNotifyState(false);
    try {
      if (next) await follow(uid, p.id);
      else await unfollow(uid, p.id);
      setP({ ...p, follower_count: p.follower_count + (next ? 1 : -1) });
    } catch {
      setFollowing(!next);
      toast('Couldn’t update that. Try again?');
    } finally {
      setBusy(false);
    }
  }

  async function toggleBell() {
    if (!p || !uid) return;
    if (preview) return toast('Preview mode: nothing is saved.');
    if (!following) return toast(`Follow @${p.username} first to get their new routes.`);
    const next = !notify;
    setNotifyState(next);
    try {
      await setNotify(uid, p.id, next);
      toast(next ? `We’ll tell you when @${p.username} posts a route.` : 'Notifications off.');
    } catch {
      setNotifyState(!next);
      toast('Couldn’t update that. Try again?');
    }
  }

  async function doBlock() {
    if (!p || !uid) return;
    setConfirmBlock(false);
    if (preview) return toast('Preview mode: nothing is saved.');
    try {
      await block(uid, p.id);
      toast(`Blocked @${p.username}. You won’t see each other’s routes or profiles.`);
      back();
    } catch {
      toast('Couldn’t block. Try again?');
    }
  }

  const header = (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} style={{ width: 44, height: 44, marginLeft: -12, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="back" size={22} strokeWidth={2.2} />
      </Pressable>
      <MonoLabel bold style={{ fontSize: 12, textTransform: 'none' }}>@{username}</MonoLabel>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="More options"
        onPress={() => p && setMenu(true)}
        style={{ width: 44, height: 44, marginRight: -12, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="more" size={22} strokeWidth={2.4} />
      </Pressable>
    </View>
  );

  if (p === undefined) return <Screen>{header}</Screen>;

  if (p === null)
    return (
      <Screen>
        {header}
        <View style={{ gap: 12, alignItems: 'center', paddingTop: 40 }}>
          <Txt variant="h2">This profile isn’t here</Txt>
          <Txt color="mu" style={{ textAlign: 'center' }}>The username may have changed. Find more people on Explore.</Txt>
          <Button label="Go to Explore" onPress={() => router.replace('/explore')} />
        </View>
      </Screen>
    );

  return (
    <Screen>
      {header}
      <ProfileBody
        owner={false}
        name={p.display_name || p.username}
        username={p.username}
        place={placeLine(p)}
        bio={p.bio}
        avatarUrl={p.avatar_url}
        links={p.links}
        sample
        atlas={CREATOR_SAMPLES[p.username] ?? null}
        actions={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: following, busy }}
              onPress={toggleFollow}
              disabled={busy}
              style={({ pressed }) => ({
                flex: 1,
                height: 44,
                borderRadius: radius.chip,
                borderWidth: 1,
                borderColor: following ? c.ln : c.ac,
                backgroundColor: following ? c.sf : c.ac,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: following ? c.tx : c.on }}>{following ? 'Following' : 'Follow'}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notify me about new routes"
              accessibilityState={{ selected: notify }}
              onPress={toggleBell}
              style={{ width: 52, height: 44, borderRadius: radius.chip, borderWidth: 1, borderColor: notify ? c.act : c.ln, backgroundColor: c.sf, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="bell" size={20} color={notify ? 'act' : 'tx'} strokeWidth={2} />
            </Pressable>
          </View>
        }
      />
      <MonoLabel style={{ textAlign: 'center' }}>{p.follower_count} FOLLOWERS · {p.following_count} FOLLOWING</MonoLabel>

      <Sheet visible={menu} onClose={() => setMenu(false)}>
        <Button
          label="Share profile"
          icon="share"
          variant="ghost"
          block
          onPress={() => {
            setMenu(false);
            Share.share({ message: `@${p.username} on Sightquest: ${PROFILE_URL}${p.username}`, url: `${PROFILE_URL}${p.username}` }).catch(() => {});
          }}
        />
        <Button label={`Block @${p.username}`} variant="danger" block onPress={() => { setMenu(false); setConfirmBlock(true); }} />
      </Sheet>
      <Sheet visible={confirmBlock} onClose={() => setConfirmBlock(false)} title={`Block @${p.username}?`}>
        <Txt color="mu">
          You won’t see each other’s routes, comments or profiles, and any follows between you end. They aren’t told. You can unblock in Settings › Blocked accounts.
        </Txt>
        <Button label="Block" variant="danger" block onPress={doBlock} />
        <Button label="Cancel" variant="ghost" block onPress={() => setConfirmBlock(false)} />
      </Sheet>
    </Screen>
  );
}
