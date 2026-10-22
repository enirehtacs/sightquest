import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Text, TextInput, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomNav, Chip, Icon, MonoLabel, Screen, Txt, useToast } from '@/components';
import { Map, MapButtons, type LngLat, type MapHandle, type MapPin } from '@/components/map';
import { FeedRouteCard, Nudge, openRoute, RouteRow } from '@/features/route/cards';
import { useSaves } from '@/features/route/useSaves';
import { useNav } from '@/features/nav/useNav';
import { filterCounts, FilterSheet, QUICK } from '@/features/search/FilterSheet';
import { useRecentlyViewed } from '@/features/search/useRecentlyViewed';
import { useAuth } from '@/lib/auth';
import { geocode, whereAmI, type Place } from '@/lib/places';
import { placeLine } from '@/lib/profiles';
import { metaLine, offbeatLabel, toneOf } from '@/lib/routeFormat';
import { searchRoutes, type Filters, type RouteCard } from '@/lib/routes';
import { fonts, radius, space, useTheme } from '@/theme';

const NEAR_KM = 80;
const CARD_W = 300;
const GAP = 10;

/** Search: design/prototype/Search.dc.html (SearchLight), SPEC section 3. Works like AllTrails. */
export default function Search() {
  const { uid, profile } = useAuth();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNav();
  const toast = useToast();
  const saves = useSaves();
  const map = useRef<MapHandle>(null);
  const carousel = useRef<ScrollView>(null);

  const [q, setQ] = useState('');
  const [query, setQuery] = useState(''); // q, a moment after typing stops
  const [filters, setFilters] = useState<Filters>({});
  const [sheet, setSheet] = useState(false);
  const [mode, setMode] = useState<'list' | 'map'>('list');
  const [results, setResults] = useState<RouteCard[] | null>(null);
  const [everywhere, setEverywhere] = useState<RouteCard[] | null>(null);
  const { recent, clear: clearRecent } = useRecentlyViewed(uid);
  const [here, setHere] = useState<{ status: 'granted' | 'denied' | 'undetermined'; place: Place | null } | null>(null);
  const [home, setHome] = useState<Place | null>(null);
  const [locNudge, setLocNudge] = useState(true);
  const [nearby, setNearby] = useState<RouteCard[] | null>(null);
  const [sel, setSel] = useState(0);

  const { per, total } = filterCounts(filters);
  const active = query.trim().length > 0 || total > 0;
  const homeName = profile ? placeLine(profile) || profile.home_country : null;

  useEffect(() => {
    const t = setTimeout(() => setQuery(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Where are you? Never asks on its own: only reads a permission you already gave.
  useEffect(() => {
    let live = true;
    whereAmI(false).then((h) => live && setHere(h));
    geocode(homeName).then((p) => live && setHome(p));
    return () => {
      live = false;
    };
  }, [homeName]);

  // Nearby: from where you are, or from your home base when location is off.
  const centre = here?.place ?? (here ? home : null);
  const nearName = here?.place ? here.place.name : home ? homeName : null;
  const cLat = centre?.lat;
  const cLng = centre?.lng;

  useEffect(() => {
    if (cLat == null || cLng == null) return;
    let live = true;
    searchRoutes('', {}, { lat: cLat, lng: cLng, radiusKm: NEAR_KM })
      .then((r) => live && setNearby(r))
      .catch(() => live && setNearby([]));
    return () => {
      live = false;
    };
  }, [cLat, cLng]);

  // Results for the search bar and filters.
  useEffect(() => {
    if (!active) return;
    let live = true;
    const near = here?.place ? { lat: here.place.lat, lng: here.place.lng } : null;
    searchRoutes(query, filters, near)
      .then((r) => {
        if (!live) return;
        setResults(r);
        setSel(0);
      })
      .catch(() => live && setResults([]));
    return () => {
      live = false;
    };
  }, [active, query, filters, here?.place]);


  // The map (and the sheet's count) with nothing typed or picked: every route.
  useEffect(() => {
    if ((mode !== 'map' && !sheet) || everywhere) return;
    let live = true;
    searchRoutes('', {}).then((r) => live && setEverywhere(r)).catch(() => {});
    return () => {
      live = false;
    };
  }, [mode, sheet, everywhere]);

  async function locate() {
    const h = await whereAmI(true);
    setHere(h);
    if (h.place) {
      setLocNudge(false);
      map.current?.flyTo([h.place.lng, h.place.lat], 9);
    } else {
      setLocNudge(true);
    }
  }

  async function openSettings() {
    if (Platform.OS === 'web') {
      const h = await whereAmI(true);
      setHere(h);
      if (!h.place) toast('Turn location on for this site in your browser’s settings.');
    } else Linking.openSettings().catch(() => {});
  }

  const onMap = active ? results ?? [] : everywhere ?? [];
  const pick = (i: number, scroll = true) => {
    const r = onMap[i];
    if (!r) return;
    setSel(i);
    if (scroll) carousel.current?.scrollTo({ x: i * (CARD_W + GAP), animated: true });
    if (r.start_lat != null && r.start_lng != null) map.current?.flyTo([r.start_lng, r.start_lat], 8);
  };
  const onCarousel = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / (CARD_W + GAP));
    if (i !== sel) pick(i, false);
  };

  const locationOff = here && here.status !== 'granted' && locNudge;

  const header = (
    <View style={{ gap: 10, paddingTop: mode === 'map' ? insets.top + 12 : 0, paddingHorizontal: mode === 'map' ? space.gutter : 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 14, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln, borderRadius: 999 }}>
        <Icon name="search" size={20} strokeWidth={2} />
        <TextInput
          accessibilityLabel="Search"
          value={q}
          onChangeText={setQ}
          placeholder="Places, routes, creators"
          placeholderTextColor={c.mu}
          returnKeyType="search"
          autoCorrect={false}
          style={{ flex: 1, minWidth: 0, fontFamily: fonts.regular, fontSize: 16, color: c.tx, outlineStyle: 'none' } as object}
        />
        {q ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQ('')} hitSlop={10}>
            <Icon name="close" size={18} color="mu" strokeWidth={2.2} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.gutter }} contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 8 }}>
        <Chip label="Filters" icon="filter" selected count={total || undefined} onPress={() => setSheet(true)} />
        {QUICK.map((k) => (
          <Chip key={k} label={k} count={per[k] || undefined} onPress={() => setSheet(true)} />
        ))}
      </ScrollView>
    </View>
  );

  const toggle = (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 90, alignItems: 'center' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={mode === 'list' ? 'Show the map' : 'Show the list'}
        onPress={() => setMode(mode === 'list' ? 'map' : 'list')}
        style={({ pressed }) => ({ height: 44, paddingHorizontal: 18, borderRadius: 999, backgroundColor: c.tx, flexDirection: 'row', alignItems: 'center', gap: 8, opacity: pressed ? 0.85 : 1, boxShadow: [{ offsetX: 0, offsetY: 6, blurRadius: 18, color: c.fabShadow }] })}
      >
        <Icon name={mode === 'list' ? 'map' : 'list'} size={18} color="bg" strokeWidth={2} />
        <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: c.bg }}>{mode === 'list' ? 'Map' : 'List'}</Text>
      </Pressable>
    </View>
  );

  const sheetEl = <FilterSheet visible={sheet} filters={filters} onChange={setFilters} onClose={() => setSheet(false)} count={active ? results?.length ?? null : everywhere?.length ?? null} />;

  const locCard = locationOff ? (
    <View style={{ padding: 14, gap: 8, borderRadius: radius.card, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln }}>
      <Txt style={{ fontFamily: fonts.bold, fontSize: 14 }}>Location is off</Txt>
      <Txt variant="small">Turn it on to see where you are and what’s close by. Nobody else sees where you are.</Txt>
      <View style={{ flexDirection: 'row', gap: 18 }}>
        <Pressable accessibilityRole="button" onPress={openSettings} hitSlop={8}>
          <Txt color="act" style={{ fontFamily: fonts.bold, fontSize: 14 }}>Open settings</Txt>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setLocNudge(false)} hitSlop={8}>
          <Txt color="mu" style={{ fontSize: 14 }}>Not now</Txt>
        </Pressable>
      </View>
    </View>
  ) : null;

  // ── Map ──
  if (mode === 'map') {
    const pins: MapPin[] = onMap
      .filter((r) => r.start_lat != null)
      .map((r, i) => ({
        id: r.id,
        coord: [r.start_lng!, r.start_lat!] as LngLat,
        kind: 'route',
        label: r.title.split(',')[0],
        selected: i === sel,
        onPress: () => pick(i),
      }));
    if (here?.place) pins.push({ id: 'me', coord: [here.place.lng, here.place.lat], kind: 'me' });
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <Map
          ref={map}
          style={{ position: 'absolute', inset: 0 }}
          pins={pins}
          lines={onMap[sel] ? [{ id: onMap[sel].id, coords: onMap[sel].line }] : []}
          fitTo={pins.filter((p) => p.kind === 'route').map((p) => p.coord)}
          padding={{ top: insets.top + 150, bottom: 320, left: 40, right: 80 }}
          maxFitZoom={9}
          scrollZoom
          accessibilityLabel="Map of routes"
        />
        {header}
        <MapButtons
          style={{ position: 'absolute', right: space.gutter, top: insets.top + 132 }}
          buttons={[
            { icon: 'plus', label: 'Zoom in', onPress: () => map.current?.zoomIn() },
            { icon: 'minus', label: 'Zoom out', onPress: () => map.current?.zoomOut() },
            { icon: 'navigate', label: 'Find my location', onPress: locate, color: here?.place ? 'info' : 'mu' },
          ]}
        />
        {locationOff && <View style={{ position: 'absolute', left: space.gutter, right: 76, top: insets.top + 132 }}>{locCard}</View>}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 146 }}>
          {onMap.length === 0 ? (
            <View style={{ marginHorizontal: space.gutter }}>
              <Nudge text={active ? 'No routes match. Try fewer filters.' : 'Finding routes…'} action={active ? { label: 'Reset filters', onPress: () => { setFilters({}); setQ(''); } } : undefined} />
            </View>
          ) : (
            <ScrollView
              ref={carousel}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={CARD_W + GAP}
              decelerationRate="fast"
              onMomentumScrollEnd={onCarousel}
              onScrollEndDrag={Platform.OS === 'web' ? onCarousel : undefined}
              contentContainerStyle={{ paddingHorizontal: space.gutter, gap: GAP, paddingVertical: 6 }}
            >
              {onMap.map((r, i) => (
                <Pressable
                  key={r.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${r.title}, by @${r.owner_username}. Open route`}
                  onPress={() => (i === sel ? openRoute(r.id) : pick(i))}
                  style={{ width: CARD_W, flexDirection: 'row', gap: 12, alignItems: 'center', padding: 10, borderRadius: 20, backgroundColor: c.sf, borderWidth: 1, borderColor: i === sel ? c.act : c.ln, opacity: i === sel ? 1 : 0.75 }}
                >
                  <View style={{ width: 64, height: 64, borderRadius: 14, backgroundColor: c[`ph${toneOf(r.id)}` as const] }} />
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <Txt numberOfLines={1} style={{ fontFamily: fonts.bold, fontSize: 15 }}>{r.title}</Txt>
                    <MonoLabel numberOfLines={1}>{[r.distance_km ? `${Math.round(r.distance_km)} KM` : null, `${r.day_count}D`, r.budget ? '$'.repeat(r.budget) : null].filter(Boolean).join(' · ')}</MonoLabel>
                    <Txt variant="small" numberOfLines={1} style={{ fontSize: 12 }}>by @{r.owner_username}</Txt>
                  </View>
                  <View style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: c.sf2, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="next" size={18} strokeWidth={2.2} />
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
        {toggle}
        <BottomNav active="search" onNavigate={nav} />
        {sheetEl}
      </View>
    );
  }

  // ── List ──
  return (
    <Screen withNav overlay={<>{toggle}<BottomNav active="search" onNavigate={nav} /></>}>
      {header}

      {active ? (
        <View style={{ gap: 14 }}>
          <MonoLabel>{results === null ? 'SEARCHING…' : `${results.length} ${results.length === 1 ? 'ROUTE' : 'ROUTES'}`}</MonoLabel>
          {results?.length === 0 && (
            <Nudge text="No routes match that yet. Try fewer filters, or another place." action={{ label: 'Reset filters', onPress: () => { setFilters({}); setQ(''); } }} />
          )}
          {results?.map((r) => (
            <FeedRouteCard
              key={r.id}
              r={r}
              chip={r.distance_from_km != null ? `${r.distance_from_km} KM AWAY` : r.sowo_approved ? '✓ SOWO APPROVED' : offbeatLabel(r.offbeat).toUpperCase() || metaLine(r, { days: false, budget: false })}
              saved={saves.saved.has(r.id)}
              onSave={() => saves.ask({ id: r.id, title: r.title })}
            />
          ))}
        </View>
      ) : (
        <>
          {recent.length > 0 && (
            <View style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Txt variant="h2">Recently viewed</Txt>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => clearRecent().catch(() => toast('Couldn’t clear that. Try again?'))}
                  hitSlop={10}
                >
                  <Txt color="act" style={{ fontFamily: fonts.semibold, fontSize: 14 }}>Clear</Txt>
                </Pressable>
              </View>
              {recent.map((r, i) => (
                <RouteRow key={r.id} r={r} first={i === 0} icon="clock" sub={`by @${r.owner_username}`} right={`${r.day_count}D`} />
              ))}
            </View>
          )}

          <View style={{ gap: 12 }}>
            <View style={{ gap: 2 }}>
              <Txt variant="h2">Nearby routes</Txt>
              {centre && nearName ? <Txt variant="small">Starting within {NEAR_KM} km of {nearName}</Txt> : null}
            </View>
            {locCard}
            {here && !centre && (
              <Nudge text="Add your home base to see routes that start near you." action={{ label: 'Edit profile', onPress: () => router.push('/me/edit') }} />
            )}
            {centre && nearby === null && <View style={{ height: 200, borderRadius: 20, backgroundColor: c.sf }} />}
            {centre && nearby?.length === 0 && (
              <Nudge text={`Nothing starts within ${NEAR_KM} km of ${nearName} yet. Search a place you’d like to go instead.`} action={{ label: 'Open filters', onPress: () => setSheet(true) }} />
            )}
            {nearby?.map((r) => (
              <FeedRouteCard
                key={r.id}
                r={r}
                chip={`${r.distance_from_km ?? 0} KM AWAY`}
                saved={saves.saved.has(r.id)}
                onSave={() => saves.ask({ id: r.id, title: r.title })}
              />
            ))}
          </View>
        </>
      )}
      {sheetEl}
      {saves.sheet}
    </Screen>
  );
}
