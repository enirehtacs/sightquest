import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Button, Chip, Icon, MonoLabel, Screen, Txt, useToast } from '@/components';
import { prettyDate } from '@/components/DateField';
import { useAuth } from '@/lib/auth';
import { createRoute, newId, queueDay, queueMoment, queueUpdate } from '@/lib/build';
import { pickPhotos, preparePhoto, type PickedPhoto } from '@/lib/photos';
import { placeAt, searchPlaces, type PlaceHit } from '@/lib/places';
import { clock } from '@/lib/routeFormat';
import { fonts, radius, space, useTheme } from '@/theme';

type PDay = { key: string; date: string | null; place: string; lat: number | null; lng: number | null; country: string | null; mode: string };
type Pic = PickedPhoto & { day: string; star: boolean };

const MODES: [string, string][] = [['stayed', 'Stayed put'], ['walk', 'Walk'], ['bus', 'Bus'], ['moto', 'Moto'], ['train', 'Train'], ['boat', 'Boat'], ['plane', 'Plane']];

/** Build from photos: design/prototype/Photos.dc.html and LivePhotos.dc.html. Everything is read on the phone. */
export default function BuildFromPhotos() {
  const { title } = useLocalSearchParams<{ title?: string }>();
  const { uid, profile, preview } = useAuth();
  const { c } = useTheme();
  const toast = useToast();
  const [days, setDays] = useState<PDay[]>([]);
  const [pics, setPics] = useState<Pic[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/build/new'));

  async function choose() {
    setReading(true);
    try {
      const picked = await pickPhotos({ max: 60 });
      if (!picked.length) return;
      // Sort into days by the date each photo was taken.
      const byDate = new Map<string, PickedPhoto[]>();
      for (const p of [...picked].sort((a, b) => (a.taken ?? '9').localeCompare(b.taken ?? '9'))) {
        const k = p.taken?.slice(0, 10) ?? 'none';
        byDate.set(k, [...(byDate.get(k) ?? []), p]);
      }
      const nextDays: PDay[] = [];
      const nextPics: Pic[] = [];
      for (const [date, list] of byDate) {
        const key = newId();
        const gps = list.find((p) => p.lat != null);
        const here = gps ? await placeAt(gps.lat!, gps.lng!) : null;
        nextDays.push({ key, date: date === 'none' ? null : date, place: here?.name ?? '', lat: gps?.lat ?? null, lng: gps?.lng ?? null, country: here?.countryCode ?? null, mode: nextDays.length ? 'bus' : 'stayed' });
        list.forEach((p) => nextPics.push({ ...p, day: key, star: false }));
      }
      setDays(nextDays);
      setPics(nextPics);
    } catch {
      toast('Couldn’t open your photos. Check Sightquest can use them in your settings.');
    } finally {
      setReading(false);
    }
  }

  const upd = (key: string, patch: Partial<Pic>) => setPics(pics.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  const updDay = (key: string, patch: Partial<PDay>) => setDays(days.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  const nMom = pics.filter((p) => p.star).length;
  const noGps = pics.filter((p) => p.lat == null).length;
  const named = days.every((d) => d.place.trim());
  const dated = days.filter((d) => d.date).map((d) => d.date!).sort();

  async function build() {
    if (!uid || !title) return;
    if (preview) return toast('Preview mode: sign in to build a route.');
    setProgress('Making your route…');
    try {
      const routeId = await createRoute({
        ownerId: uid,
        title,
        live: false,
        startDate: dated[0] ?? null,
        endDate: dated[dated.length - 1] ?? null,
        blur: profile?.blur_sleep ?? true,
        delay: profile?.live_delay ?? true,
      });
      const codes: string[] = [];
      let prev: { place: string; lat: number | null; lng: number | null } | null = null;
      let n = 0;
      for (const d of days) {
        n++;
        let { lat, lng } = d;
        // Typed a place for a day with no GPS photos: look it up.
        if (lat == null && d.place.trim()) {
          const near: { lat: number; lng: number } | null = prev && prev.lat != null && prev.lng != null ? { lat: prev.lat, lng: prev.lng } : null;
          const hits: PlaceHit[] = await searchPlaces(d.place, near);
          const hit = hits[0];
          if (hit) {
            lat = hit.lat;
            lng = hit.lng;
            if (hit.countryCode && !codes.includes(hit.countryCode)) codes.push(hit.countryCode);
          }
        }
        if (d.country && !codes.includes(d.country)) codes.push(d.country);
        const dayId = newId();
        await queueDay(
          { id: dayId, route_id: routeId, day_number: n, date: d.date, place_name: d.place.trim().slice(0, 80), lat, lng, weather: null, note: null, created_by: uid },
          prev && d.mode !== 'stayed' ? { mode: d.mode, from_name: prev.place, to_name: d.place.trim(), duration_text: null, note: null } : d.mode === 'stayed' && prev ? { mode: 'stayed', from_name: null, to_name: null, duration_text: null, note: null } : null,
        );
        const stars = pics.filter((p) => p.day === d.key && p.star);
        for (let i = 0; i < stars.length; i++) {
          setProgress(`Getting photos ready · Day ${n}`);
          const p = stars[i];
          await queueMoment(
            {
              id: newId(),
              day_id: dayId,
              route_id: routeId,
              caption: null,
              tag: null,
              taken_at: p.taken ? `${p.taken}:00` : null,
              local_time: p.taken ? p.taken.slice(11, 16) : null,
              lat: p.lat ?? lat,
              lng: p.lng ?? lng,
              starred: i === 0,
            },
            [await preparePhoto(p)],
          );
        }
        prev = { place: d.place.trim(), lat, lng };
      }
      if (codes.length) await queueUpdate(routeId, 'routes', routeId, { country_codes: codes });
      router.replace({ pathname: '/build/[id]', params: { id: routeId } });
    } catch {
      setProgress(null);
      toast('Couldn’t make the route. Check your signal and try again.');
    }
  }

  return (
    <Screen
      contentStyle={{ gap: 14, paddingBottom: 120 }}
      overlay={
        days.length > 0 ? (
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 24, backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.ln, gap: 6 }}>
            <Button
              label={progress ?? `Build ${days.length} ${days.length === 1 ? 'day' : 'days'} · ${nMom} ${nMom === 1 ? 'moment' : 'moments'}`}
              block
              loading={!!progress}
              disabled={!named || !!progress}
              onPress={build}
            />
            {!named && <Txt variant="small" style={{ textAlign: 'center' }}>Give every day a place first.</Txt>}
          </View>
        ) : undefined
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} style={{ width: 44, height: 44, marginLeft: -12, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={22} strokeWidth={2.2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Txt accessibilityRole="header" style={{ fontFamily: fonts.heavy, fontSize: 22, lineHeight: 26 }}>Build from photos</Txt>
          {title ? <MonoLabel numberOfLines={1}>{title}</MonoLabel> : null}
        </View>
      </View>

      {days.length === 0 ? (
        <View style={{ gap: 14, padding: 16, borderRadius: radius.card, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln, alignItems: 'center' }}>
          <Icon name="camera" size={32} color="act" strokeWidth={1.6} />
          <Txt style={{ textAlign: 'center', fontSize: 15, lineHeight: 22 }}>Pick photos from the trip. A few from each day is enough. We sort them into days using the date and place saved in each photo.</Txt>
          <Txt variant="small" style={{ textAlign: 'center' }}>This all happens on your phone. Photos stay private. Only the ones you star become moments and get posted, without their location data.</Txt>
          <Button label="Choose photos" icon="camera" onPress={choose} loading={reading} />
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.card, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln }}>
            <Text style={{ fontFamily: fonts.heavy, fontSize: 16, color: c.act }}>✓</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt style={{ fontFamily: fonts.bold, fontSize: 15 }}>{pics.length} photos → {days.length} {days.length === 1 ? 'day' : 'days'}</Txt>
              <Txt variant="small">Sorted by the date each photo was taken. AirDropped or saved photos can carry the wrong date: tap one to move it.</Txt>
            </View>
          </View>

          {days.map((d, i) => {
            const mine = pics.filter((p) => p.day === d.key);
            const selected = mine.find((p) => p.key === sel);
            return (
              <View key={d.key} style={{ gap: 10, padding: 12, borderRadius: radius.card, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <MonoLabel bold color="act">DAY {i + 1}</MonoLabel>
                  <TextInput
                    accessibilityLabel={`Place for day ${i + 1}`}
                    value={d.place}
                    onChangeText={(t) => updDay(d.key, { place: t })}
                    placeholder="Where were you?"
                    placeholderTextColor={c.mu}
                    maxLength={80}
                    style={{ flex: 1, minWidth: 0, height: 40, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: d.place.trim() ? c.ln : c.act, backgroundColor: c.bg, fontFamily: fonts.bold, fontSize: 15, color: c.tx, outlineStyle: 'none' } as object}
                  />
                  <MonoLabel>{d.date ? prettyDate(d.date).slice(0, -5).toUpperCase() : 'NO DATE'}</MonoLabel>
                </View>
                {mine.length === 0 ? (
                  <Txt variant="small">No photos on this day. Tap a photo and move it here, or keep it as a day with just a note.</Txt>
                ) : (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {mine.map((p) => (
                      <Pressable
                        key={p.key}
                        accessibilityRole="button"
                        accessibilityLabel={`Photo options${p.star ? ', a moment' : ''}`}
                        onPress={() => setSel(sel === p.key ? null : p.key)}
                        style={{ width: 74, height: 74, borderRadius: 12, overflow: 'hidden', borderWidth: sel === p.key ? 3 : p.star ? 2 : 1, borderColor: sel === p.key ? c.tx : p.star ? c.ac : c.ln }}
                      >
                        <Image source={{ uri: p.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                        <View style={{ position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: p.star ? c.ac : c.scrim }}>
                          <Text style={{ fontSize: 12, color: p.star ? c.on : c.mu }}>★</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}
                {selected && (
                  <View style={{ gap: 8, padding: 10, borderRadius: 12, backgroundColor: c.sf2 }}>
                    <MonoLabel>
                      {selected.taken ? `TAKEN ${prettyDate(selected.taken.slice(0, 10)).slice(0, -5).toUpperCase()} · ${clock(`${selected.taken.slice(11)}:00`)}` : 'NO DATE IN THIS PHOTO'}
                      {selected.guessedDate ? ' · SAVED DATE, MAYBE AIRDROPPED' : ''}
                      {selected.lat == null ? ' · NO LOCATION' : ''}
                    </MonoLabel>
                    <Button label={selected.star ? '★ Moment · tap to undo' : '☆ Make it a moment'} variant={selected.star ? 'primary' : 'ghost'} size="sm" block onPress={() => upd(selected.key, { star: !selected.star })} />
                    <Txt variant="small">Wrong day? Move to</Txt>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {days.map((x, j) => (
                        <Chip key={x.key} label={`Day ${j + 1}`} selected={x.key === d.key} onPress={() => x.key !== d.key && upd(selected.key, { day: x.key })} />
                      ))}
                      <Chip
                        label="+ New day"
                        onPress={() => {
                          const key = newId();
                          setDays([...days, { key, date: selected.taken?.slice(0, 10) ?? null, place: '', lat: selected.lat, lng: selected.lng, country: null, mode: 'bus' }]);
                          upd(selected.key, { day: key });
                        }}
                      />
                    </ScrollView>
                  </View>
                )}
                {i > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -2 }} contentContainerStyle={{ gap: 6 }}>
                    {MODES.map(([k, l]) => (
                      <Chip key={k} label={l} selected={d.mode === k} onPress={() => updDay(d.key, { mode: k })} />
                    ))}
                  </ScrollView>
                )}
              </View>
            );
          })}

          <Pressable
            accessibilityRole="button"
            onPress={() => setDays([...days, { key: newId(), date: null, place: '', lat: null, lng: null, country: null, mode: 'bus' }])}
            style={{ minHeight: 48, borderRadius: radius.card, borderWidth: 1, borderStyle: 'dashed', borderColor: c.ln, alignItems: 'center', justifyContent: 'center' }}
          >
            <Txt color="act" style={{ fontFamily: fonts.semibold, fontSize: 14 }}>+ Add a day</Txt>
          </Pressable>

          {noGps > 0 && (
            <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.card, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln }}>
              <Icon name="pin" size={18} color="warn" strokeWidth={2} />
              <Txt variant="small" style={{ flex: 1, lineHeight: 18 }}>
                {noGps} {noGps === 1 ? 'photo has' : 'photos have'} no location. Their day pins to the place you type.
              </Txt>
            </View>
          )}
          <Txt variant="small" style={{ marginHorizontal: space.xs }}>Tap a photo to make it a moment or move it to another day. Photos that aren’t moments stay on your phone and only help place the day.</Txt>
        </>
      )}
    </Screen>
  );
}
