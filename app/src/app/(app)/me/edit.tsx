import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Avatar, Button, Field, Icon, MonoLabel, Screen, Sheet, Txt, useToast } from '@/components';
import { useAuth } from '@/lib/auth';
import {
  formatDate,
  LINK_KEYS,
  LINK_LABEL,
  nextUsernameChange,
  updateMyProfile,
  uploadAvatar,
  usernameError,
  usernameStatus,
  USERNAME_RE,
  type LinkKey,
  type Links,
  type UsernameStatus,
} from '@/lib/profiles';
import { fonts, radius, useTheme } from '@/theme';

const BIO_MAX = 120;

/** Edit profile — design/prototype/EditProfile.dc.html. */
export default function EditProfile() {
  const { c } = useTheme();
  const toast = useToast();
  const { uid, profile, setProfile, preview } = useAuth();

  const [name, setName] = useState(profile?.display_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [homeBase, setHomeBase] = useState(profile?.home_base ?? '');
  const [country, setCountry] = useState(profile?.home_country ?? '');
  const [links, setLinks] = useState<Links>(profile?.links ?? {});
  const [photo, setPhoto] = useState<{ uri: string; base64: string } | null>(null);
  // Result of the last server check, for the handle it was about.
  const [checked, setChecked] = useState<{ handle: string; status: UsernameStatus } | null>(null);
  const [saving, setSaving] = useState(false);
  const [usernameErr, setUsernameErr] = useState<string | null>(null);
  const [adding, setAdding] = useState<LinkKey | null>(null);
  const [linkDraft, setLinkDraft] = useState('');

  const locked = useMemo(() => nextUsernameChange(profile?.username_changed_at ?? null), [profile?.username_changed_at]);
  const handle = username.trim().toLowerCase();
  const changed = handle !== (profile?.username ?? '');

  const formatOk = USERNAME_RE.test(handle);
  const status: UsernameStatus | 'checking' | null = !changed
    ? null
    : !formatOk
      ? 'invalid'
      : preview
        ? 'ok'
        : checked?.handle === handle
          ? checked.status
          : 'checking';

  // Ask the database whether it's free, after a short pause in typing.
  useEffect(() => {
    if (!changed || !formatOk || preview) return;
    let live = true;
    const t = setTimeout(() => {
      usernameStatus(handle)
        .then((s) => live && setChecked({ handle, status: s }))
        .catch(() => {});
    }, 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [handle, changed, formatOk, preview]);

  if (!profile || !uid) return <Screen>{null}</Screen>;

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (res.canceled || !res.assets[0]) return;
    // Square, 512px, JPEG at ~80%. Re-encoding drops EXIF (and any GPS) too.
    const out = await ImageManipulator.manipulateAsync(res.assets[0].uri, [{ resize: { width: 512, height: 512 } }], {
      compress: 0.8,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    if (out.base64) setPhoto({ uri: out.uri, base64: out.base64 });
  }

  const statusText: Record<string, { t: string; color: 'act' | 'mu' | 'danger' }> = {
    checking: { t: 'Checking…', color: 'mu' },
    ok: { t: '✓ Available', color: 'act' },
    taken: { t: 'Taken', color: 'danger' },
    reserved: { t: 'Reserved', color: 'danger' },
    invalid: { t: '', color: 'danger' },
  };

  const usernameHint = locked
    ? `You can change this again on ${formatDate(locked)}.`
    : 'You can change your username once every 30 days. Your old one stays reserved for 14 days so no one grabs it.';

  const usernameProblem =
    usernameErr ??
    (status === 'invalid'
      ? '3–20 characters: lowercase letters, numbers, dots and underscores.'
      : status === 'taken'
        ? 'Someone already has that username.'
        : status === 'reserved'
          ? 'That username is reserved for now. Try another.'
          : null);

  const canSave = !saving && (!changed || status === 'ok') && bio.length <= BIO_MAX;

  async function save() {
    if (!canSave || !uid) return;
    if (preview) {
      toast('Preview mode: nothing is saved.');
      return router.back();
    }
    setSaving(true);
    try {
      const avatar_url = photo ? await uploadAvatar(uid, photo.base64) : profile!.avatar_url;
      const clean: Links = {};
      for (const k of LINK_KEYS) if (links[k]?.trim()) clean[k] = links[k]!.trim();
      const next = await updateMyProfile(uid, {
        display_name: name.trim() || null,
        bio: bio.trim() || null,
        home_base: homeBase.trim() || null,
        home_country: country.trim() || null,
        links: clean,
        avatar_url,
        ...(changed ? { username: handle } : {}),
      });
      setProfile(next);
      toast('Profile saved');
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? '');
      const u = usernameError(msg);
      if (u) setUsernameErr(u);
      else toast('Couldn’t save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen contentStyle={{ gap: 20, paddingBottom: 40 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          onPress={() => router.back()}
          style={{ width: 44, height: 44, marginLeft: -12, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="back" size={22} strokeWidth={2.2} />
        </Pressable>
        <Txt accessibilityRole="header" style={{ flex: 1, fontFamily: fonts.heavy, fontSize: 22, lineHeight: 26 }}>Edit profile</Txt>
        <Button label="Save" size="sm" onPress={save} loading={saving} disabled={!canSave} />
      </View>

      <View style={{ alignItems: 'center', gap: 10 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Change photo" onPress={pickPhoto} style={{ width: 104, height: 104 }}>
          <View style={{ borderRadius: 999, borderWidth: 3, borderColor: c.act }}>
            <Avatar uri={photo?.uri ?? profile.avatar_url} name={name || profile.username || ''} size={98} />
          </View>
          <View
            style={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              width: 36,
              height: 36,
              borderRadius: 999,
              borderWidth: 3,
              borderColor: c.bg,
              backgroundColor: c.ac,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="camera" size={16} color="on" strokeWidth={2.2} />
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={pickPhoto} hitSlop={10}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: c.act }}>Change photo</Text>
        </Pressable>
      </View>

      <Field label="NAME" value={name} onChangeText={setName} maxLength={60} autoComplete="name" />

      <Field
        label="USERNAME"
        prefix="@"
        value={username}
        onChangeText={(t) => {
          setUsernameErr(null);
          setUsername(t.toLowerCase().replace(/\s/g, ''));
        }}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={20}
        editable={!locked}
        error={usernameProblem}
        hint={usernameHint}
        suffix={
          status && statusText[status]?.t ? (
            <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: c[statusText[status].color] }}>{statusText[status].t}</Text>
          ) : null
        }
      />
      {!!usernameProblem && <Txt variant="small" style={{ fontSize: 12, marginTop: -12 }}>{usernameHint}</Txt>}

      <Field
        label="BIO"
        counter={`${bio.length} / ${BIO_MAX}`}
        value={bio}
        onChangeText={setBio}
        maxLength={BIO_MAX}
        multiline
        placeholder="Will hike for noodles. Gets lost on purpose. Has strong opinions about sleeper buses."
      />

      <Field
        label="HOME BASE"
        value={homeBase}
        onChangeText={setHomeBase}
        placeholder="City"
        hint={'Shows as the country only if "Hide my home city" is on in Privacy.'}
      />
      <Field label="COUNTRY" value={country} onChangeText={setCountry} placeholder="Country" autoComplete="country" />

      <View style={{ gap: 8 }}>
        <MonoLabel bold>LINKS</MonoLabel>
        <Txt variant="small" style={{ fontSize: 12 }}>Only the ones you add show on your profile, as icons.</Txt>
        <View style={{ backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln, borderRadius: radius.card, overflow: 'hidden' }}>
          {LINK_KEYS.map((k, i) => {
            const val = links[k]?.trim();
            return (
              <View
                key={k}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderBottomWidth: i < LINK_KEYS.length - 1 ? 1 : 0,
                  borderBottomColor: c.ln,
                }}
              >
                <View style={{ width: 34, height: 34, borderRadius: 999, borderWidth: 1, borderColor: c.ln, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={k} size={17} color="act" strokeWidth={2} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                  <Txt variant="bodyStrong">{LINK_LABEL[k]}</Txt>
                  <Txt variant="small" numberOfLines={1} style={{ fontSize: 12 }}>{val || 'Not added'}</Txt>
                </View>
                {val ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${LINK_LABEL[k]}`}
                    onPress={() => setLinks({ ...links, [k]: '' })}
                    hitSlop={6}
                    style={{ height: 32, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: c.ln, justifyContent: 'center' }}
                  >
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: c.mu }}>Remove</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${LINK_LABEL[k]}`}
                    onPress={() => {
                      setLinkDraft('');
                      setAdding(k);
                    }}
                    hitSlop={6}
                    style={{ height: 32, paddingHorizontal: 12, borderRadius: 999, backgroundColor: c.tx, justifyContent: 'center' }}
                  >
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: c.bg }}>Add</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      </View>

      <Sheet visible={!!adding} onClose={() => setAdding(null)} title={adding ? `Add ${LINK_LABEL[adding]}` : ''}>
        <Field
          label="YOUR HANDLE OR LINK"
          value={linkDraft}
          onChangeText={setLinkDraft}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={adding === 'alltrails' || adding === 'strava' ? 'Profile link or username' : '@yourhandle'}
          autoFocus
          onSubmitEditing={() => {
            if (adding && linkDraft.trim()) setLinks({ ...links, [adding]: linkDraft.trim() });
            setAdding(null);
          }}
        />
        <Button
          label="Add"
          block
          disabled={!linkDraft.trim()}
          onPress={() => {
            if (adding) setLinks({ ...links, [adding]: linkDraft.trim() });
            setAdding(null);
          }}
        />
      </Sheet>
    </Screen>
  );
}
