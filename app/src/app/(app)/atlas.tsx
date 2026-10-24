import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, MonoLabel, Txt } from '@/components';
import { Map, MapButtons, type LngLat, type MapHandle, type MapPin } from '@/components/map';
import { Nudge } from '@/features/route/cards';
import { useAuth } from '@/lib/auth';
import { getPublicProfile } from '@/lib/profiles';
import { dots, kmLabel, MON, toneOf } from '@/lib/routeFormat';
import { getRoute, profileRoutes, type Moment, type RouteCard } from '@/lib/routes';
import { fonts, radius, space, useTheme } from '@/theme';

/** Atlas: every trip on one map. design/prototype/Atlas.dc.html, SPEC section 8. */
export default function Atlas() {
  const { user } = useLocalSearchParams<{ user?: string }>();
  const { uid, profile, preview } = useAuth();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const map = useRef<MapHandle>(null);
  const [trips, setTrips] = useState<RouteCard[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [moments, setMoments] = useState<Record<string, Moment[]>>({});
  const mine = !user || user === profile?.username;

  useEffect(() => {
    if (!uid) return;
    let live = true;
    (async () => {
      try {
        const who = mine ? uid : preview ? null : (await getPublicProfile(user!))?.id;
        const rows = who ? await profileRoutes(who) : [];
        if (live) setTrips(rows.filter((r) => r.status !== 'draft' && r.line.length > 0));
      } catch {
        if (live) setTrips([]);
      }
    })();
    return () => {
      live = false;
    };
  }, [uid, user, mine, preview]);

  // Load a trip's moments the first time it's opened.
  useEffect(() => {
    if (!open || moments[open]) return;
    let live = true;
    getRoute(open).then((d) => live && d && setMoments((m) => ({ ...m, [open]: d.moments }))).catch(() => {});
    return () => {
      live = false;
    };
  }, [open, moments]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/me'));
  const all = trips ?? [];
  const t = all.find((x) => x.id === open) ?? null;
  const countries = new Set(all.flatMap((x) => x.country_codes)).size;
  const liveN = all.filter((x) => x.status === 'live').length;
  const world: LngLat[] = all.flatMap((x) => x.line);

  const pins: MapPin[] = all.map((x) => {
    const mid = x.line[Math.floor(x.line.length / 2)];
    return { id: x.id, coord: mid, kind: 'route', label: x.title.split(',')[0], selected: x.id === open, onPress: () => openTrip(x) };
  });

  function openTrip(x: RouteCard) {
    setOpen(x.id);
    map.current?.fit(x.line);
  }

  const tm = t ? moments[t.id] ?? [] : [];
  const best = tm.find((m) => m.starred)?.caption ?? tm[0]?.caption ?? t?.weather_note ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Map
        ref={map}
        style={{ position: 'absolute', inset: 0 }}
        lines={all.map((x) => ({ id: x.id, coords: x.line, dim: !!open && x.id !== open, bold: x.id === open }))}
        pins={pins}
        fitTo={world}
        maxFitZoom={6}
        padding={{ top: insets.top + 90, bottom: open ? 400 : 110, left: 40, right: 150 }}
        scrollZoom
        onPress={() => setOpen(null)}
        accessibilityLabel={mine ? 'Your atlas' : `@${user}'s atlas`}
      />

      <View style={{ position: 'absolute', top: insets.top + 12, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={mine ? 'Back to your profile' : 'Back to the profile'} onPress={back} style={{ width: 44, height: 44, borderRadius: 999, backgroundColor: c.scrim, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={20} strokeWidth={2.2} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, backgroundColor: c.scrim }}>
          <Txt numberOfLines={1} style={{ fontFamily: fonts.bold, fontSize: 15, lineHeight: 19 }}>{mine ? 'Your atlas' : `@${user}’s atlas`}</Txt>
          <MonoLabel size={10}>
            {all.length} {all.length === 1 ? 'TRIP' : 'TRIPS'} · {countries} {countries === 1 ? 'COUNTRY' : 'COUNTRIES'}
            {liveN ? ` · ${liveN} LIVE` : ''}
          </MonoLabel>
        </View>
      </View>
      <MapButtons
        style={{ position: 'absolute', right: 12, top: insets.top + 76 }}
        buttons={[
          { icon: 'plus', label: 'Zoom in', onPress: () => map.current?.zoomIn() },
          { icon: 'minus', label: 'Zoom out', onPress: () => map.current?.zoomOut() },
          {
            icon: 'globe',
            label: 'Show every trip',
            color: 'act',
            onPress: () => {
              setOpen(null);
              map.current?.fit(world);
            },
          },
        ]}
      />

      {trips && all.length === 0 ? (
        <View style={{ position: 'absolute', left: space.gutter, right: space.gutter, bottom: insets.bottom + 24 }}>
          <Nudge
            text={mine ? 'Your trips draw themselves here, one line each. Post your first route and watch the map fill up.' : `@${user} hasn’t shared a trip with you yet.`}
            action={mine ? { label: 'Build a route', onPress: () => router.push('/build/new') } : { label: 'Back to the profile', onPress: back }}
          />
        </View>
      ) : !t ? (
        <View style={{ position: 'absolute', left: 12, right: 12, bottom: insets.bottom + 20, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.card, backgroundColor: c.scrim, borderWidth: 1, borderColor: c.ln }}>
          <View style={{ width: 18, height: 4, borderRadius: 999, backgroundColor: c.rt }} />
          <Txt style={{ flex: 1, fontSize: 13, lineHeight: 18 }}>{mine ? 'Your trips are the yellow lines. Tap one to look back on it.' : 'Each yellow line is a trip. Tap one to look at it.'}</Txt>
        </View>
      ) : (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxWidth: 560, width: '100%', alignSelf: 'center', backgroundColor: c.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: space.gutter, paddingTop: 16, paddingBottom: insets.bottom + 22, gap: 12, boxShadow: [{ offsetX: 0, offsetY: -10, blurRadius: 30, color: c.fabShadow }] }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <MonoLabel bold color="act">{t.went_month ? `${MON[t.went_month - 1]} ${t.went_year ?? ''}`.trim().toUpperCase() : ''}</MonoLabel>
                {t.status === 'live' && (
                  <View style={{ backgroundColor: c.ac, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 }}>
                    <MonoLabel size={10} bold color="on">LIVE</MonoLabel>
                  </View>
                )}
              </View>
              <Txt style={{ fontFamily: fonts.heavy, fontSize: 20, lineHeight: 24 }}>{t.title}</Txt>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setOpen(null)} style={{ width: 44, height: 44, marginTop: -8, marginRight: -8, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="close" size={20} strokeWidth={2.2} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Stat value={String(t.day_count)} label="DAYS" />
            <Stat value={kmLabel(t.distance_km)} label="KM" />
            <Stat value={t.budget ? '$'.repeat(t.budget) : '–'} label="BUDGET" />
            <Stat value={dots(t.effort)} label="EFFORT" accent />
          </View>
          {tm.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {tm.slice(0, 3).map((m, i) => (
                <View key={m.id} style={{ flex: 1, height: 84, borderRadius: radius.cardSm, padding: 8, alignItems: 'flex-end', justifyContent: 'flex-end', backgroundColor: c[`ph${toneOf(m.id)}` as const] }}>
                  {i === 2 && tm.length > 3 ? <MonoLabel bold color="tx">+{tm.length - 3}</MonoLabel> : null}
                </View>
              ))}
            </View>
          )}
          {best ? (
            <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.cardSm, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln }}>
              <MonoLabel size={10} bold color="act" style={{ paddingTop: 2 }}>BEST BIT</MonoLabel>
              <Txt style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>{best}</Txt>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/route/[id]/diary', params: { id: t.id } })}
            style={({ pressed }) => ({ height: 48, borderRadius: 999, backgroundColor: c.ac, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}
          >
            <Icon name="diary" size={18} color="on" strokeWidth={2} />
            <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: c.on }}>Open trip diary</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, minWidth: 0, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln, borderRadius: radius.cardSm, paddingVertical: 8, paddingHorizontal: 10 }}>
      <Text numberOfLines={1} style={{ fontFamily: accent ? fonts.monoBold : fonts.bold, fontSize: accent ? 12 : 16, lineHeight: 20, color: accent ? c.act : c.tx }}>{value}</Text>
      <MonoLabel size={10}>{label}</MonoLabel>
    </View>
  );
}
