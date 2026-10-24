import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';

import { Button, Icon, MonoLabel, Screen, Sheet, Tabs, Toggle, Txt, useToast } from '@/components';
import { useAuth } from '@/lib/auth';
import { getSowoEligible, setSowoEligible } from '@/lib/build';
import { myBlockedAccounts, updateMyProfile, type MyProfile, type ProfilePatch } from '@/lib/profiles';
import { fonts, radius, useTheme, type AppearancePref } from '@/theme';

const LIVE_LABEL: Record<MyProfile['live_default'], string> = { private: 'Only me', followers: 'Followers', public: 'Everyone' };

/**
 * Settings — design/prototype/Settings.dc.html (SettingsLight for light).
 * Phase 1 covers Account, Privacy & safety, Preferences and Log out.
 * Subscription, Spotify, Notifications and Your data arrive with their phases.
 */
export default function Settings() {
  const { c } = useTheme();
  const toast = useToast();
  const { session, uid, profile, setProfile, signOut, preview } = useAuth();
  const { preference, setPreference } = useTheme();
  const [loc, setLoc] = useState<string>('…');
  const [blocked, setBlocked] = useState<number | null>(null);
  const [liveSheet, setLiveSheet] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const [sowo, setSowo] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      Location.getForegroundPermissionsAsync()
        .then((p) => setLoc(p.granted ? 'While using' : p.canAskAgain ? 'Not asked' : 'Off'))
        .catch(() => setLoc('Off'));
      if (!preview) myBlockedAccounts().then((b) => setBlocked(b.length)).catch(() => setBlocked(null));
      else setBlocked(0);
      if (!preview && uid) getSowoEligible(uid).then(setSowo).catch(() => {});
    }, [preview, uid]),
  );

  if (!profile || !uid) return <Screen>{null}</Screen>;

  async function patch(p: ProfilePatch) {
    const before = profile!;
    setProfile({ ...before, ...p });
    if (preview) return;
    try {
      setProfile(await updateMyProfile(uid!, p));
    } catch {
      setProfile(before);
      toast('Couldn’t save that. Try again?');
    }
  }

  async function locationAccess() {
    const p = await Location.getForegroundPermissionsAsync().catch(() => null);
    if (p && !p.granted && p.canAskAgain) {
      const r = await Location.requestForegroundPermissionsAsync().catch(() => null);
      setLoc(r?.granted ? 'While using' : 'Off');
    } else if (Platform.OS !== 'web') Linking.openSettings();
    else toast('Change location access in your browser’s site settings.');
  }

  const user = session?.user;
  const providers: string[] = (user?.app_metadata?.providers as string[] | undefined) ?? (preview ? ['email'] : []);
  const signIn = providers.map((p) => (p === 'apple' ? 'Apple' : p === 'google' ? 'Google' : 'Email')).join(' · ') || 'Email';
  const version = Constants.expoConfig?.version ?? '0.1';

  return (
    <Screen contentStyle={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/me'))}
          style={{ width: 44, height: 44, marginLeft: -12, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="back" size={22} strokeWidth={2.2} />
        </Pressable>
        <Txt accessibilityRole="header" style={{ fontFamily: fonts.heavy, fontSize: 22, lineHeight: 26 }}>Settings</Txt>
      </View>

      <Group title="ACCOUNT">
        <Row label="Email" value={user?.email ? (user.email_confirmed_at ? 'Verified' : 'Not verified') : preview ? 'Verified' : ''} sub={user?.email ?? (preview ? 'vivi@example.com' : undefined)} />
        <Row label="Sign-in" value={signIn} />
        {providers.includes('email') && <Row label="Change password" onPress={() => router.push('/settings/password')} />}
      </Group>

      <Group title="PRIVACY & SAFETY">
        <Row label="Location access" value={loc} sub="For nearby routes and your spot on the map. Never shown to others." onPress={locationAccess} />
        <Row label="New live routes start as" value={LIVE_LABEL[profile.live_default]} onPress={() => setLiveSheet(true)} />
        <SwitchRow label="Share live days 24h late" sub="People see yesterday, never today" on={profile.live_delay} onToggle={() => patch({ live_delay: !profile.live_delay })} />
        <SwitchRow label="Blur where I sleep" sub="Overnight stops show as a 2 km area" on={profile.blur_sleep} onToggle={() => patch({ blur_sleep: !profile.blur_sleep })} />
        <SwitchRow label="Hide my home city" sub="Your profile shows the country only" on={profile.hide_home_city} onToggle={() => patch({ hide_home_city: !profile.hide_home_city })} />
        <Row label="Exact trip dates" value="Only me" sub="Others see the month you went, and Day 1, Day 2…" />
        <SwitchRow
          label="I’m a woman (for SOWO)"
          sub="Private. Lets you rate how a route felt solo when you finish it. Never shown on your profile."
          on={!!sowo}
          onToggle={async () => {
            const next = !sowo;
            setSowo(next);
            if (preview) return;
            try {
              await setSowoEligible(uid, next);
            } catch {
              setSowo(!next);
              toast('Couldn’t save that. Try again?');
            }
          }}
        />
        <Row label="Blocked accounts" value={blocked === null ? '' : String(blocked)} onPress={() => router.push('/settings/blocked')} />
      </Group>

      <Group title="PREFERENCES">
        <SegRow label="Appearance">
          <Tabs<AppearancePref>
            variant="segment"
            accessibilityLabel="Appearance"
            value={preference}
            onChange={setPreference}
            tabs={[
              { key: 'system', label: 'System' },
              { key: 'light', label: 'Light' },
              { key: 'dark', label: 'Dark' },
            ]}
          />
        </SegRow>
        <SegRow label="Distance">
          <Tabs<'km' | 'mi'>
            variant="segment"
            accessibilityLabel="Distance"
            value={profile.distance_unit}
            onChange={(u) => patch({ distance_unit: u })}
            tabs={[
              { key: 'km', label: 'km' },
              { key: 'mi', label: 'mi' },
            ]}
          />
        </SegRow>
      </Group>

      <Button label="Log out" variant="ghost" block onPress={() => setConfirmOut(true)} />
      <Pressable
        accessibilityRole="button"
        onPress={() => toast('We’ll ask you to confirm by email first. Coming soon.')}
        style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: c.danger }}>Delete account</Text>
      </Pressable>
      <MonoLabel size={10} style={{ textAlign: 'center' }}>SIGHTQUEST · VERSION {version}</MonoLabel>

      <Sheet visible={liveSheet} onClose={() => setLiveSheet(false)} title="New live routes start as">
        {(Object.keys(LIVE_LABEL) as MyProfile['live_default'][]).map((k) => (
          <Pressable
            key={k}
            accessibilityRole="radio"
            accessibilityState={{ checked: profile.live_default === k }}
            onPress={() => {
              patch({ live_default: k });
              setLiveSheet(false);
            }}
            style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Txt>{LIVE_LABEL[k]}</Txt>
            {profile.live_default === k && <Icon name="check" size={20} color="act" strokeWidth={2.4} />}
          </Pressable>
        ))}
      </Sheet>

      <Sheet visible={confirmOut} onClose={() => setConfirmOut(false)} title="Log out?">
        <Txt color="mu">Your routes stay safe. Log back in any time.</Txt>
        <Button
          label="Log out"
          block
          onPress={async () => {
            setConfirmOut(false);
            await signOut();
            router.replace('/splash');
          }}
        />
        <Button label="Cancel" variant="ghost" block onPress={() => setConfirmOut(false)} />
      </Sheet>
    </Screen>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const { c } = useTheme();
  const rows = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <View style={{ gap: 6 }}>
      <MonoLabel bold style={{ paddingLeft: 4 }}>{title}</MonoLabel>
      <View style={{ backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln, borderRadius: radius.card, overflow: 'hidden' }}>
        {rows.map((r, i) => (
          <View key={i} style={{ borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderBottomColor: c.ln }}>
            {r}
          </View>
        ))}
      </View>
    </View>
  );
}

function Label({ label, sub }: { label: string; sub?: string }) {
  return (
    <View style={{ flex: 1, gap: 1, paddingVertical: 8 }}>
      <Txt style={{ fontSize: 15 }}>{label}</Txt>
      {sub ? <Txt variant="small" style={{ fontSize: 12, lineHeight: 16 }}>{sub}</Txt> : null}
    </View>
  );
}

function Row({ label, value, sub, onPress }: { label: string; value?: string; sub?: string; onPress?: () => void }) {
  const { c } = useTheme();
  const inner = (
    <>
      <Label label={label} sub={sub} />
      {value ? <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: c.mu }}>{value}</Text> : null}
      {onPress && <Icon name="next" size={16} color="mu" strokeWidth={2.2} />}
    </>
  );
  const style = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, minHeight: 48, paddingHorizontal: 14 };
  if (!onPress) return <View style={style}>{inner}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [style, pressed && { opacity: 0.7 }]}>
      {inner}
    </Pressable>
  );
}

function SwitchRow({ label, sub, on, onToggle }: { label: string; sub?: string; on: boolean; onToggle: () => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
      onPress={onToggle}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14 }}
    >
      <Label label={label} sub={sub} />
      <Toggle on={on} />
    </Pressable>
  );
}

function SegRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, paddingVertical: 6 }}>
      <Txt style={{ flex: 1, fontSize: 15 }}>{label}</Txt>
      {children}
    </View>
  );
}
