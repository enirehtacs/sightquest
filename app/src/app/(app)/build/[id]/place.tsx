import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';

import { Button, Chip, Field, Icon, MonoLabel, Screen, Tabs, Txt, useToast } from '@/components';
import { PlacePicker } from '@/features/build/PlacePicker';
import { useBuild } from '@/features/build/useBuild';
import { useAuth } from '@/lib/auth';
import { addPost, deletePost, newId, postPlatform, queueMoment, queueSpot } from '@/lib/build';
import { pickPhotos, preparePhoto, type PickedPhoto } from '@/lib/photos';
import type { PlaceHit } from '@/lib/places';
import { SPOT_KIND } from '@/lib/routeFormat';
import { fonts, radius, space, useTheme } from '@/theme';

type Tab = 'spots' | 'moments' | 'posts';

const KINDS: [string, string][] = [
  ['food', 'Food'], ['cafe', 'Cafe'], ['bar', 'Bar'], ['arts', 'Arts'], ['history', 'History'], ['culture', 'Culture'],
  ['entertainment', 'Entertainment'], ['wellness', 'Wellness'], ['viewpoint', 'Viewpoint'], ['beach', 'Beach'],
  ['hike', 'Hike'], ['shopping', 'Shopping'], ['accommodation', 'Accommodation'],
];
const TAGS = ['FOOD', 'VIEWPOINT', 'HIKE', 'BOAT', 'MARKET', 'SWIM', 'CULTURE', 'NIGHT'];
const PLATFORM: Record<string, string> = { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube' };

/** Spots, moments and posts for one stop: design/prototype/EditPlace.dc.html and DayMoment.dc.html. */
export default function EditPlace() {
  const params = useLocalSearchParams<{ id: string; tab?: string; day?: string }>();
  const { uid, preview } = useAuth();
  const { c } = useTheme();
  const toast = useToast();
  const { data, days, ops, reload } = useBuild(params.id);
  const [tab, setTab] = useState<Tab>(params.tab === 'moments' || params.tab === 'posts' ? params.tab : 'spots');
  const [dayId, setDayId] = useState<string | null>(params.day ?? null);

  // Spot form
  const [spotName, setSpotName] = useState('');
  const [spotWhere, setSpotWhere] = useState<PlaceHit | null>(null);
  const [kind, setKind] = useState('food');
  const [why, setWhy] = useState('');
  // Moment form
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [caption, setCaption] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [starred, setStarred] = useState(false);
  const [saving, setSaving] = useState(false);
  // Post form
  const [url, setUrl] = useState('');
  const [postCaption, setPostCaption] = useState('');
  const [postDay, setPostDay] = useState<string | null>(params.tab === 'posts' ? params.day ?? null : null);

  const back = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/build/[id]', params: { id: params.id } }));
  if (!data) return <Screen>{null}</Screen>;

  const r = data.card;
  const day = days.find((d) => d.id === dayId) ?? days[days.length - 1] ?? null;
  const near = day && day.lat != null && day.lng != null ? { lat: day.lat, lng: day.lng } : null;
  const pendingSpots = ops.flatMap((o) => (o.kind === 'spot' ? [o.spot] : []));
  const spots = [...data.spots, ...pendingSpots.filter((p) => !data.spots.some((s) => s.id === p.id))];
  const momentsHere = day ? [...data.moments.filter((m) => m.day_id === day.id)] : [];
  const pendingMoments = ops.flatMap((o) => (o.kind === 'moment' && o.moment.day_id === day?.id ? [o] : []));
  const platform = postPlatform(url);
  const badLink = url.trim().length > 8 && !platform;

  async function addSpot() {
    if (!spotName.trim() || !uid) return;
    await queueSpot({
      id: newId(),
      route_id: r.id,
      day_id: day && !day.pending ? day.id : null,
      sort: spots.length,
      name: spotName.trim().slice(0, 80),
      kind,
      why: why.trim() || null,
      where_name: spotWhere?.name ?? day?.place_name ?? null,
      lat: spotWhere?.lat ?? null,
      lng: spotWhere?.lng ?? null,
    });
    toast(`${spotName.trim()} recommended`);
    setSpotName('');
    setSpotWhere(null);
    setWhy('');
  }

  async function choosePhotos() {
    try {
      const picked = await pickPhotos({ max: 3 });
      if (picked.length) setPhotos(picked.slice(0, 3));
    } catch {
      toast('Couldn’t open your photos. Check Sightquest can use them in your settings.');
    }
  }

  async function addMoment() {
    if (!day || (!photos.length && !caption.trim())) return;
    setSaving(true);
    try {
      const prepared = [];
      for (const p of photos) prepared.push(await preparePhoto(p));
      const first = photos.find((p) => p.lat != null) ?? null;
      const taken = photos.find((p) => p.taken)?.taken ?? null;
      await queueMoment(
        {
          id: newId(),
          day_id: day.id,
          route_id: r.id,
          caption: caption.trim() || null,
          tag,
          taken_at: taken ? `${taken}:00` : null,
          local_time: taken ? taken.slice(11, 16) : null,
          // Pinned where the photo was taken; otherwise at the day's place.
          lat: first?.lat ?? day.lat,
          lng: first?.lng ?? day.lng,
          starred,
        },
        prepared,
      );
      toast('Added to your diary');
      setPhotos([]);
      setCaption('');
      setTag(null);
      setStarred(false);
    } catch {
      toast('Couldn’t read those photos. Try different ones?');
    } finally {
      setSaving(false);
    }
  }

  async function linkPost() {
    if (!platform || !uid) return;
    if (preview) return toast('Preview mode: nothing is saved.');
    setSaving(true);
    try {
      await addPost(r.id, uid, url, postDay, postCaption.trim() || null);
      toast(`${PLATFORM[platform]} post linked`);
      setUrl('');
      setPostCaption('');
      reload();
    } catch {
      toast('Couldn’t link that. Linking posts needs signal.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen contentStyle={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} style={{ width: 44, height: 44, marginLeft: -12, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={22} strokeWidth={2.2} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <MonoLabel numberOfLines={1}>{r.title}</MonoLabel>
          <Txt accessibilityRole="header" numberOfLines={1} style={{ fontFamily: fonts.heavy, fontSize: 20, lineHeight: 24 }}>{day?.place_name ?? 'Your route'}</Txt>
        </View>
        <Pressable accessibilityRole="button" onPress={back} hitSlop={8}>
          <Txt color="act" style={{ fontFamily: fonts.bold, fontSize: 15 }}>Done</Txt>
        </Pressable>
      </View>

      {days.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.gutter }} contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Stop on your route">
          {days.map((d) => (
            <Chip key={d.id} label={`Day ${d.day_number} · ${d.place_name}`} selected={day?.id === d.id} onPress={() => setDayId(d.id)} />
          ))}
        </ScrollView>
      )}

      <Tabs
        variant="pill"
        tabs={[
          { key: 'spots', label: `Spots · ${spots.length}` },
          { key: 'moments', label: 'Moments' },
          { key: 'posts', label: `Posts · ${data.posts.length}` },
        ]}
        value={tab}
        onChange={setTab}
        accessibilityLabel="What to add"
      />

      {tab === 'spots' && (
        <View style={{ gap: 12 }}>
          {spots.length === 0 ? (
            <Txt color="mu">Nothing recommended yet. What would you tell a friend?</Txt>
          ) : (
            spots.map((s) => (
              <View key={s.id} style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.card, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln }}>
                <Icon name={(SPOT_KIND[s.kind] ?? SPOT_KIND.other).icon} size={18} color="act" strokeWidth={1.9} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt style={{ fontFamily: fonts.bold, fontSize: 15 }}>{s.name}</Txt>
                  {s.why ? <Txt variant="small">{s.why}</Txt> : null}
                  <MonoLabel size={10}>{[(SPOT_KIND[s.kind]?.label ?? s.kind).toUpperCase(), s.where_name?.toUpperCase()].filter(Boolean).join(' · ')}</MonoLabel>
                </View>
                {pendingSpots.some((p) => p.id === s.id) && <MonoLabel bold color="warn">⟳</MonoLabel>}
              </View>
            ))
          )}
          <View style={{ gap: 12, padding: 14, borderRadius: radius.card, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln }}>
            <Txt style={{ fontFamily: fonts.bold, fontSize: 16 }}>Recommend a place</Txt>
            <Field label="NAME" value={spotName} onChangeText={setSpotName} placeholder="What should people look for?" maxLength={80} />
            <PlacePicker
              label="WHERE IS IT"
              value={spotWhere}
              onChange={setSpotWhere}
              near={near}
              placeholder="Search a place name or address"
              pinHint="For stalls and spots with no address"
              types="address,street,neighborhood,locality,place"
            />
            <View style={{ gap: 8 }}>
              <MonoLabel bold>WHAT KIND OF PLACE</MonoLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {KINDS.map(([k, l]) => (
                  <Chip key={k} label={l} selected={kind === k} onPress={() => setKind(k)} />
                ))}
              </View>
            </View>
            <Field label="WHY GO" value={why} onChangeText={setWhy} placeholder="One line. What to order, when to go…" maxLength={200} />
            <Button label={spotName.trim() ? `Recommend ${spotName.trim()}` : 'Recommend it'} block disabled={!spotName.trim()} onPress={addSpot} />
          </View>
        </View>
      )}

      {tab === 'moments' && (
        <View style={{ gap: 12 }}>
          {!day ? (
            <Txt color="mu">Add a day first, then its moments.</Txt>
          ) : (
            <>
              {momentsHere.length + pendingMoments.length === 0 && <Txt color="mu">No moments on Day {day.day_number} yet.</Txt>}
              {momentsHere.map((m) => (
                <View key={m.id} style={{ flexDirection: 'row', gap: 10, padding: 10, borderRadius: radius.card, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln }}>
                  <View style={{ width: 52, height: 52, borderRadius: 10, overflow: 'hidden', backgroundColor: c.ph2 }}>
                    {day.photos.find((p) => m.photo_paths.includes(p.key))?.uri ? (
                      <Image source={{ uri: day.photos.find((p) => m.photo_paths.includes(p.key))!.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : null}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <MonoLabel bold color="act">DAY {m.day_number}{m.tag ? ` · ${m.tag}` : ''}</MonoLabel>
                    <Txt style={{ fontSize: 14, lineHeight: 20 }}>{m.caption}</Txt>
                  </View>
                </View>
              ))}
              {pendingMoments.map((o) => (
                <View key={o.id} style={{ flexDirection: 'row', gap: 10, padding: 10, borderRadius: radius.card, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln }}>
                  <View style={{ width: 52, height: 52, borderRadius: 10, overflow: 'hidden', backgroundColor: c.ph2 }}>
                    {o.photos[0] ? <Image source={{ uri: o.photos[0].base64 ? `data:image/jpeg;base64,${o.photos[0].base64}` : o.photos[0].uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <MonoLabel bold color={o.error ? 'danger' : 'warn'}>{o.error ? 'COULDN’T SYNC' : '⟳ SAVED ON PHONE'}</MonoLabel>
                    <Txt style={{ fontSize: 14, lineHeight: 20 }}>{o.moment.caption}</Txt>
                  </View>
                </View>
              ))}
              <View style={{ gap: 12, padding: 14, borderRadius: radius.card, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln }}>
                <Txt style={{ fontFamily: fonts.bold, fontSize: 16 }}>Add a story moment</Txt>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <Button label={photos.length ? 'Change photos' : 'Photos'} icon="camera" variant="ghost" size="sm" onPress={choosePhotos} />
                  {photos.map((p) => (
                    <Image key={p.key} source={{ uri: p.uri }} style={{ width: 52, height: 52, borderRadius: 10 }} contentFit="cover" />
                  ))}
                  {!photos.length && <Txt variant="small" style={{ flex: 1 }}>Up to 3</Txt>}
                </View>
                {photos.length > 0 && !photos.some((p) => p.lat != null) && (
                  <Txt variant="small">No location in these photos, so the moment pins to {day.place_name}.</Txt>
                )}
                <View style={{ gap: 8 }}>
                  <MonoLabel bold>WHICH DAY</MonoLabel>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {days.map((d) => (
                      <Chip key={d.id} label={`Day ${d.day_number}`} selected={day.id === d.id} onPress={() => setDayId(d.id)} />
                    ))}
                  </View>
                </View>
                <Field label="WHAT HAPPENED" value={caption} onChangeText={setCaption} placeholder="One or two lines for your diary" maxLength={400} multiline />
                <View style={{ gap: 8 }}>
                  <MonoLabel bold>TAG (OPTIONAL)</MonoLabel>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {TAGS.map((t) => (
                      <Chip key={t} label={t[0] + t.slice(1).toLowerCase()} selected={tag === t} onPress={() => setTag(tag === t ? null : t)} />
                    ))}
                  </View>
                </View>
                <Chip label={starred ? '★ Best bit of the day' : '☆ Best bit of the day'} selected={starred} onPress={() => setStarred(!starred)} />
                <Txt variant="small">Moments pin to the map where the photo was taken, so they show up in your map diary.</Txt>
                <Button label="Add to diary" block loading={saving} disabled={!photos.length && !caption.trim()} onPress={addMoment} />
              </View>
            </>
          )}
        </View>
      )}

      {tab === 'posts' && (
        <View style={{ gap: 12 }}>
          <View style={{ gap: 12, padding: 14, borderRadius: radius.card, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln }}>
            <Txt style={{ fontFamily: fonts.bold, fontSize: 16 }}>Link a post</Txt>
            <Field label="POST LINK" value={url} onChangeText={setUrl} placeholder="Paste an Instagram, TikTok or YouTube link" autoCapitalize="none" autoCorrect={false} keyboardType="url" error={badLink ? 'That link doesn’t look like Instagram, TikTok or YouTube Shorts.' : null} />
            {platform && <MonoLabel bold color="act">{PLATFORM[platform].toUpperCase()} · FOUND</MonoLabel>}
            <Field label="CAPTION (OPTIONAL)" value={postCaption} onChangeText={setPostCaption} placeholder="What’s in it?" maxLength={200} />
            <View style={{ gap: 8 }}>
              <MonoLabel bold>ATTACH TO</MonoLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Chip label="Whole route" selected={postDay === null} onPress={() => setPostDay(null)} />
                {days.filter((d) => !d.pending).map((d) => (
                  <Chip key={d.id} label={`Day ${d.day_number}`} selected={postDay === d.id} onPress={() => setPostDay(d.id)} />
                ))}
              </View>
            </View>
            <Button label="Link this post" block disabled={!platform} loading={saving} onPress={linkPost} />
          </View>
          <Txt variant="h2">Linked posts</Txt>
          {data.posts.length === 0 && <Txt color="mu">No posts yet. Linking one sends people to your account for the full video.</Txt>}
          {data.posts.map((p) => {
            const d = days.find((x) => x.id === p.day_id);
            return (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.card, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln }}>
                <Icon name={p.platform} size={20} color="act" strokeWidth={1.9} />
                <Pressable accessibilityRole="link" onPress={() => Linking.openURL(p.url)} style={{ flex: 1, minWidth: 0 }}>
                  <Txt numberOfLines={1} style={{ fontFamily: fonts.semibold, fontSize: 14 }}>{p.caption || p.url}</Txt>
                  <MonoLabel size={10}>{PLATFORM[p.platform].toUpperCase()} · {d ? `DAY ${d.day_number}` : 'WHOLE ROUTE'}</MonoLabel>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove this post"
                  onPress={async () => {
                    try {
                      await deletePost(p.id);
                      reload();
                    } catch {
                      toast('Couldn’t remove it. Check your signal?');
                    }
                  }}
                  hitSlop={8}
                >
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: c.danger }}>Remove</Text>
                </Pressable>
              </View>
            );
          })}
          <Txt variant="small">Viewers see a preview on your route. Tapping it opens the post in its own app, so the views count on your account.</Txt>
        </View>
      )}
    </Screen>
  );
}
