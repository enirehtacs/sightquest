import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, MonoLabel, Screen, Txt, useToast } from '@/components';
import { Map, MapButtons, type LngLat, type MapHandle, type MapPin } from '@/components/map';
import { Nudge } from '@/features/route/cards';
import { clock, toneOf } from '@/lib/routeFormat';
import { getRoute, type Moment, type RouteDetail } from '@/lib/routes';
import { fonts, space, useTheme } from '@/theme';

type Focus = { by: 'place'; key: string } | { by: 'day'; key: number } | null;

/** Map diary: design/prototype/Diary.dc.html (DiaryLight), SPEC section 10. */
export default function Diary() {
  const { id, moment } = useLocalSearchParams<{ id: string; moment?: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const map = useRef<MapHandle>(null);
  const [data, setData] = useState<RouteDetail | null | undefined>(undefined);
  const [by, setBy] = useState<'place' | 'day'>('place');
  const [focus, setFocus] = useState<Focus>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!id) return;
    let live = true;
    getRoute(id)
      .then((d) => {
        if (!live) return;
        setData(d);
        // Opened from a moment: start on that moment's place.
        const m = d?.moments.find((x) => x.id === moment);
        if (m && d) {
          const seq = d.moments.filter((x) => x.place_name === m.place_name && x.lat != null);
          setFocus({ by: 'place', key: m.place_name });
          setIdx(Math.max(0, seq.indexOf(m)));
        }
      })
      .catch(() => live && setData(null));
    return () => {
      live = false;
    };
  }, [id, moment]);

  const back = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/route/[id]', params: { id: id! } }));

  if (!data)
    return (
      <Screen>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} style={{ width: 44, height: 44, marginLeft: -12, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={22} strokeWidth={2.2} />
        </Pressable>
        {data === null && (
          <View style={{ gap: 12, alignItems: 'center', paddingTop: 40 }}>
            <Txt variant="h2">This diary isn’t here</Txt>
            <Button label="Go to Explore" onPress={() => router.replace('/explore')} />
          </View>
        )}
      </Screen>
    );

  const r = data.card;
  const moments = data.moments.filter((m) => m.lat != null && m.lng != null);
  const places: { name: string; ms: Moment[] }[] = [];
  moments.forEach((m) => {
    const p = places.find((x) => x.name === m.place_name);
    if (p) p.ms.push(m);
    else places.push({ name: m.place_name, ms: [m] });
  });
  const days = [...new Set(moments.map((m) => m.day_number))];

  const seq: Moment[] = !focus ? [] : focus.by === 'place' ? moments.filter((m) => m.place_name === focus.key) : moments.filter((m) => m.day_number === focus.key);
  const cur = seq[Math.min(idx, seq.length - 1)] ?? null;
  const pos = cur ? seq.indexOf(cur) : 0;
  const last = seq.length > 0 && pos >= seq.length - 1;

  const go = (f: Focus, i = 0) => {
    setFocus(f);
    setIdx(i);
  };
  const whole = () => {
    go(null);
    map.current?.fit(r.line);
  };

  function next() {
    if (!last) return setIdx(pos + 1);
    if (focus?.by === 'day') {
      const di = days.indexOf(focus.key);
      return di < days.length - 1 ? go({ by: 'day', key: days[di + 1] }) : whole();
    }
    const pi = places.findIndex((p) => p.name === focus?.key);
    return pi < places.length - 1 ? go({ by: 'place', key: places[pi + 1].name }) : whole();
  }
  function prev() {
    if (pos > 0) return setIdx(pos - 1);
    if (focus?.by === 'day') {
      const di = days.indexOf(focus.key);
      if (di > 0) go({ by: 'day', key: days[di - 1] }, moments.filter((m) => m.day_number === days[di - 1]).length - 1);
      return;
    }
    const pi = places.findIndex((p) => p.name === focus?.key);
    if (pi > 0) go({ by: 'place', key: places[pi - 1].name }, places[pi - 1].ms.length - 1);
  }
  let nextLabel = 'Next';
  if (last && focus?.by === 'day') {
    const di = days.indexOf(focus.key);
    nextLabel = di < days.length - 1 ? `Day ${days[di + 1]}` : 'Whole route';
  } else if (last && focus?.by === 'place') {
    const pi = places.findIndex((p) => p.name === focus.key);
    nextLabel = pi < places.length - 1 ? places[pi + 1].name : 'Whole route';
  }

  const pins: MapPin[] = focus
    ? seq.map((m, i) => ({
        id: m.id,
        coord: [m.lng!, m.lat!] as LngLat,
        kind: 'photo',
        tone: toneOf(m.id),
        selected: i === pos,
        accessibilityLabel: m.caption ?? `Moment ${i + 1}`,
        onPress: () => setIdx(i),
      }))
    : places.map((p) => ({
        id: p.name,
        coord: [p.ms[0].lng!, p.ms[0].lat!] as LngLat,
        kind: 'photo',
        count: p.ms.length,
        tone: toneOf(p.ms[0].id),
        accessibilityLabel: `${p.ms.length} moments at ${p.name}`,
        onPress: () => go({ by: 'place', key: p.name }),
      }));

  const meta = !focus
    ? ''
    : focus.by === 'day'
      ? `${seq.length} ${seq.length === 1 ? 'MOMENT' : 'MOMENTS'} · ${[...new Set(seq.map((m) => m.place_name))].join(' → ').toUpperCase()}`
      : `DAY ${seq[0]?.day_number}${seq.length && seq[seq.length - 1].day_number !== seq[0].day_number ? `–${seq[seq.length - 1].day_number}` : ''} · ${seq.length} ${seq.length === 1 ? 'MOMENT' : 'MOMENTS'}`;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Map
        ref={map}
        style={{ position: 'absolute', inset: 0 }}
        lines={[{ id: r.id, coords: r.line, dim: !!focus }]}
        pins={pins}
        fitTo={focus ? seq.map((m) => [m.lng!, m.lat!] as LngLat) : r.line}
        maxFitZoom={focus ? 14 : 11}
        padding={{ top: insets.top + 80, bottom: focus ? 440 : 400, left: 50, right: 70 }}
        scrollZoom
        accessibilityLabel={`Map diary of ${r.title}`}
      />

      <View style={{ position: 'absolute', top: insets.top + 12, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to route" onPress={back} style={{ width: 44, height: 44, borderRadius: 999, backgroundColor: c.scrim, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={20} strokeWidth={2.2} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, backgroundColor: c.scrim }}>
          <Txt numberOfLines={1} style={{ fontFamily: fonts.bold, fontSize: 14, lineHeight: 18 }}>{r.title}</Txt>
          <MonoLabel size={10} style={{ textTransform: 'none' }}>MAP DIARY · @{r.owner_username}</MonoLabel>
        </View>
      </View>
      <MapButtons
        style={{ position: 'absolute', right: 12, top: insets.top + 76 }}
        buttons={[
          { icon: 'plus', label: 'Zoom in', onPress: () => map.current?.zoomIn() },
          { icon: 'minus', label: 'Zoom out', onPress: () => map.current?.zoomOut() },
          { icon: 'fit', label: 'Fit the whole route', onPress: whole, color: 'act' },
        ]}
      />

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxWidth: 560, width: '100%', alignSelf: 'center', backgroundColor: c.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: space.gutter, paddingTop: 16, paddingBottom: insets.bottom + 22, gap: 10, boxShadow: [{ offsetX: 0, offsetY: -8, blurRadius: 24, color: c.fabShadow }] }}>
        {moments.length === 0 ? (
          <Nudge text="No moments on this route yet. They show up here as photos pinned where they were taken." action={{ label: 'Back to the route', onPress: back }} />
        ) : !focus ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Txt style={{ fontFamily: fonts.heavy, fontSize: 18 }}>Map diary</Txt>
              <MonoLabel>{moments.length} MOMENTS · {places.length} PLACES</MonoLabel>
            </View>
            <Txt color="mu" style={{ fontSize: 14, lineHeight: 20 }}>Zoom into a place, or pick a place or a day, to read what happened.</Txt>
            <View accessibilityRole="radiogroup" accessibilityLabel="Browse moments" style={{ alignSelf: 'flex-start', flexDirection: 'row', gap: 2, backgroundColor: c.sf2, borderRadius: 999, padding: 3 }}>
              {(
                [
                  ['place', 'By place'],
                  ['day', 'By day'],
                ] as const
              ).map(([k, l]) => (
                <Pressable key={k} accessibilityRole="radio" accessibilityState={{ checked: by === k }} onPress={() => setBy(k)} style={{ minHeight: 36, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center', backgroundColor: by === k ? c.tx : 'transparent' }}>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: by === k ? c.bg : c.mu }}>{l}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(by === 'day'
                ? days.map((d) => ({ key: `d${d}`, label: `Day ${d}`, n: moments.filter((m) => m.day_number === d).length, onPress: () => go({ by: 'day', key: d }) }))
                : places.map((p) => ({ key: p.name, label: p.name, n: p.ms.length, onPress: () => go({ by: 'place', key: p.name }) }))
              ).map((x) => (
                <Pressable key={x.key} accessibilityRole="button" onPress={x.onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: c.ln, backgroundColor: c.sf, opacity: pressed ? 0.8 : 1 })}>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: c.tx }}>{x.label}</Text>
                  <View style={{ minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 999, backgroundColor: c.ac, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: fonts.monoBold, fontSize: 11, color: c.on }}>{x.n}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
            <Button label="Replay the trip" icon="play" block onPress={() => toast('Trip replays are coming soon.')} />
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                <Txt numberOfLines={1} style={{ fontFamily: fonts.heavy, fontSize: 18, lineHeight: 22 }}>{focus.by === 'day' ? `Day ${focus.key}` : focus.key}</Txt>
                <MonoLabel numberOfLines={1}>{meta}</MonoLabel>
              </View>
              <Button label="Whole route" variant="ghost" size="sm" onPress={whole} />
            </View>
            {focus.by === 'day' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} accessibilityRole="radiogroup" accessibilityLabel="Pick a day">
                {days.map((d) => {
                  const on = d === focus.key;
                  return (
                    <Pressable key={d} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => go({ by: 'day', key: d })} style={{ minHeight: 34, paddingHorizontal: 10, borderRadius: 999, justifyContent: 'center', borderWidth: 1, borderColor: on ? c.ac : c.ln, backgroundColor: on ? c.ac : c.sf }}>
                      <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: on ? c.on : c.tx }}>
                        Day {d} · {moments.filter((m) => m.day_number === d).length}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
            {cur && (
              <View style={{ borderRadius: 18, overflow: 'hidden', backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln }}>
                <View style={{ height: 128, backgroundColor: c[`ph${toneOf(cur.id)}` as const] }}>
                  {cur.tag ? <Tag text={cur.tag} style={{ left: 10 }} /> : null}
                  <Tag text={`${pos + 1} / ${seq.length}`} style={{ right: 10 }} />
                </View>
                <View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12, gap: 4 }}>
                  <MonoLabel bold color="act">
                    {focus.by === 'day' ? cur.place_name.toUpperCase() : `DAY ${cur.day_number}`}
                    {cur.local_time ? ` · ${clock(cur.local_time)}` : ''}
                  </MonoLabel>
                  {cur.caption ? <Txt style={{ fontSize: 15, lineHeight: 21 }}>{cur.caption}</Txt> : null}
                </View>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Pressable accessibilityRole="button" accessibilityLabel="Previous moment" onPress={prev} style={{ width: 46, height: 46, borderRadius: 999, borderWidth: 1, borderColor: c.ln, backgroundColor: c.sf, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="back" size={18} strokeWidth={2.2} />
              </Pressable>
              <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                {seq.map((m, i) => (
                  <View key={m.id} style={{ width: i === pos ? 20 : 8, height: 8, borderRadius: 999, backgroundColor: i === pos ? c.act : c.ln }} />
                ))}
              </View>
              <Pressable accessibilityRole="button" onPress={next} style={{ height: 46, paddingHorizontal: 16, borderRadius: 999, backgroundColor: c.ac, flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 180 }}>
                <Text numberOfLines={1} style={{ fontFamily: fonts.bold, fontSize: 14, color: c.on, flexShrink: 1 }}>{nextLabel}</Text>
                <Icon name="next" size={16} color="on" strokeWidth={2.4} />
              </Pressable>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function Tag({ text, style }: { text: string; style: { left?: number; right?: number } }) {
  const { c } = useTheme();
  return (
    <View style={[{ position: 'absolute', top: 10, backgroundColor: c.scrim, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }, style]}>
      <MonoLabel size={10} bold color="tx">{text}</MonoLabel>
    </View>
  );
}

