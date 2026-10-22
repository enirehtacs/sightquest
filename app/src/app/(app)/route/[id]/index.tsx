import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Button, Icon, MonoLabel, Screen, Tabs, Txt, useToast } from '@/components';
import { Map, MapButtons, type LngLat, type MapHandle, type MapPin } from '@/components/map';
import { Nudge } from '@/features/route/cards';
import { Itinerary, MomentsGrid, MomentViewer, MustKnowGrid, SowoPill, SowoPopup, SpotsGrid, TunesPopup } from '@/features/route/RouteParts';
import { useSaves } from '@/features/route/useSaves';
import { useAuth } from '@/lib/auth';
import { follow, getFollow, unfollow } from '@/lib/profiles';
import { EFFORT_NAMES, fromToLine, MON, toneOf, WEATHER } from '@/lib/routeFormat';
import { getRoute, recordView, type RouteDetail } from '@/lib/routes';
import { fonts, radius, space, useTheme } from '@/theme';

type TabKey = 'legs' | 'must' | 'spots' | 'moments' | 'posts';
const MAP_H = 300;
const ROUTE_URL = 'https://sightquest-app.vercel.app/route/';

/** Route: design/prototype/Route.dc.html (RouteLight for light mode), SPEC section 4. */
export default function RouteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { uid, preview } = useAuth();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const saves = useSaves();
  const map = useRef<MapHandle>(null);
  const [data, setData] = useState<RouteDetail | null | undefined>(undefined);
  const [tab, setTab] = useState<TabKey>('legs');
  const [layer, setLayer] = useState<'route' | 'moments'>('route');
  const [sowo, setSowo] = useState(false);
  const [tunes, setTunes] = useState(false);
  const [moment, setMoment] = useState(-1);
  const [following, setFollowing] = useState<boolean | null>(null);

  useEffect(() => {
    if (!id) return;
    let live = true;
    getRoute(id)
      .then((d) => {
        if (!live) return;
        setData(d);
        if (d) recordView(id).catch(() => {});
        if (d && uid && !preview && d.card.owner_id !== uid) getFollow(uid, d.card.owner_id).then((f) => live && setFollowing(f.following)).catch(() => {});
      })
      .catch(() => live && setData(null));
    return () => {
      live = false;
    };
  }, [id, uid, preview]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/explore'));

  if (data === undefined) return <Screen>{<RoundButton icon="back" label="Back" onPress={back} />}</Screen>;
  if (data === null)
    return (
      <Screen>
        <RoundButton icon="back" label="Back" onPress={back} />
        <View style={{ gap: 12, alignItems: 'center', paddingTop: 40 }}>
          <Txt variant="h2">This route isn’t here</Txt>
          <Txt color="mu" style={{ textAlign: 'center', maxWidth: 320 }}>
            It may be private, for the creator’s followers only, or no longer shared.
          </Txt>
          <Button label="Go to Explore" onPress={() => router.replace('/explore')} />
        </View>
      </Screen>
    );

  const r = data.card;
  const mine = r.owner_id === uid || data.builders.some((b) => b.user_id === uid);
  const co = data.builders.find((b) => b.role === 'co');
  const saved = saves.saved.get(r.id);
  const geoMoments = data.moments.filter((m) => m.lat != null && m.lng != null);

  // Day stops for the route layer; moment photos grouped by place for the moments layer.
  const stops: MapPin[] = data.days
    .filter((d) => d.lat != null && d.lng != null)
    .map((d, i, all) => ({ id: d.id, coord: [d.lng!, d.lat!] as LngLat, kind: i === all.length - 1 ? 'end' : 'stop' }));
  const groups: { key: string; coord: LngLat; first: number; n: number; tone: 1 | 2 | 3 | 4; place: string }[] = [];
  geoMoments.forEach((m) => {
    const idx = data.moments.indexOf(m);
    const g = groups.find((x) => x.place === m.place_name);
    if (g) g.n++;
    else groups.push({ key: m.id, coord: [m.lng!, m.lat!], first: idx, n: 1, tone: toneOf(m.id), place: m.place_name });
  });
  const photoPins: MapPin[] = groups.map((g) => ({
    id: g.key,
    coord: g.coord,
    kind: 'photo',
    count: g.n,
    tone: g.tone,
    accessibilityLabel: `Moments at ${g.place}`,
    onPress: () => setMoment(g.first),
  }));

  async function toggleFollow() {
    if (!uid) return;
    if (preview) return toast('Preview mode: nothing is saved.');
    const next = !following;
    setFollowing(next);
    try {
      if (next) await follow(uid, r.owner_id);
      else await unfollow(uid, r.owner_id);
    } catch {
      setFollowing(!next);
      toast('Couldn’t update that. Try again?');
    }
  }

  const share = () =>
    Share.share({ message: `${r.title} on Sightquest: ${ROUTE_URL}${r.id}`, url: `${ROUTE_URL}${r.id}` }).catch(() => {});

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'legs', label: 'Itinerary' },
    { key: 'must', label: 'Must-know' },
    { key: 'spots', label: 'Spots' },
    { key: 'moments', label: 'Moments' },
    { key: 'posts', label: 'Posts' },
  ];
  const firstWeather = data.days.find((d) => d.weather)?.weather;

  return (
    <Screen
      withNav
      contentStyle={{ paddingTop: 0, gap: 0 }}
      overlay={
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.gutter, paddingTop: 10, paddingBottom: insets.bottom + 16, backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.ln, flexDirection: 'row', gap: 10 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => toast('Route replays are coming soon.')}
            style={({ pressed }) => ({ flex: 2, height: 48, borderRadius: 999, backgroundColor: c.ac, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}
          >
            <Icon name="play" size={18} color="on" filled />
            <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: c.on }}>Play route</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => toast(mine ? 'This one’s yours already.' : 'Stealing routes is coming soon.')}
            style={({ pressed }) => ({ flex: 1.3, height: 48, borderRadius: 999, borderWidth: 1, borderColor: c.ln, backgroundColor: c.sf, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}
          >
            <Icon name="steal" size={18} strokeWidth={2} />
            <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: c.tx }}>Steal it</Text>
          </Pressable>
        </View>
      }
    >
      {/* Map */}
      <View style={{ height: MAP_H, marginHorizontal: -space.gutter, backgroundColor: c.land }}>
        {/* The map stops where the sheet starts, so the Mapbox logo stays visible. */}
        <Map
          ref={map}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 22 }}
          lines={[{ id: r.id, coords: r.line }]}
          pins={layer === 'route' ? stops : photoPins}
          fitTo={r.line}
          padding={{ top: 70, bottom: 50, left: 40, right: 70 }}
          accessibilityLabel={`Map of ${r.title}`}
        />
        <View style={{ position: 'absolute', top: 14, left: 14 }}>
          <RoundButton icon="back" label="Back" onPress={back} />
        </View>
        <View style={{ position: 'absolute', top: 14, right: 14, flexDirection: 'row', gap: 8 }}>
          <RoundButton icon="share" label="Share route" onPress={share} />
          <RoundButton icon="save" label={saved ? 'Saved. Change list' : 'Save route'} filled={!!saved} onPress={() => saves.ask({ id: r.id, title: r.title })} />
        </View>
        <View accessibilityRole="radiogroup" accessibilityLabel="Map layer" style={{ position: 'absolute', left: 14, bottom: 58, flexDirection: 'row', gap: 2, padding: 3, borderRadius: 999, backgroundColor: c.scrim, borderWidth: 1, borderColor: c.ln }}>
          {(
            [
              ['route', 'Route'],
              ['moments', `Moments · ${geoMoments.length}`],
            ] as const
          ).map(([k, l]) => (
            <Pressable
              key={k}
              accessibilityRole="radio"
              accessibilityState={{ checked: layer === k }}
              onPress={() => setLayer(k)}
              hitSlop={4}
              style={{ height: 36, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center', backgroundColor: layer === k ? c.ac : 'transparent' }}
            >
              <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: layer === k ? c.on : c.tx }}>{l}</Text>
            </Pressable>
          ))}
        </View>
        <MapButtons
          style={{ position: 'absolute', right: 14, bottom: 58 }}
          buttons={[
            { icon: 'plus', label: 'Zoom in', onPress: () => map.current?.zoomIn() },
            { icon: 'minus', label: 'Zoom out', onPress: () => map.current?.zoomOut() },
            { icon: 'fit', label: 'Fit the whole route', onPress: () => map.current?.fit(), color: 'act' },
          ]}
        />
      </View>

      {/* Sheet */}
      <View style={{ marginTop: -22, marginHorizontal: -space.gutter, paddingHorizontal: space.gutter, paddingTop: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: c.bg, gap: 10 }}>
        <Txt accessibilityRole="header" style={{ fontFamily: fonts.heavy, fontSize: 22, lineHeight: 26 }}>{r.title}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`@${r.owner_username}'s profile`}
            onPress={() => r.owner_username && router.push(`/u/${r.owner_username}`)}
            style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }}
          >
            <Avatar uri={r.owner_avatar} name={r.owner_username ?? ''} size={38} tone={2} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt numberOfLines={1} style={{ fontFamily: fonts.bold, fontSize: 15 }}>
                @{r.owner_username}
                {co?.username ? <Text style={{ fontFamily: fonts.regular, color: c.mu }}> with @{co.username}</Text> : null}
              </Txt>
              <Txt variant="small" numberOfLines={1}>{fromToLine(r)}</Txt>
            </View>
          </Pressable>
          {!mine && following !== null && (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: following }}
              onPress={toggleFollow}
              style={({ pressed }) => ({ height: 40, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', backgroundColor: following ? c.sf : c.tx, borderWidth: 1, borderColor: following ? c.ln : c.tx, opacity: pressed ? 0.8 : 1 })}
            >
              <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: following ? c.tx : c.bg }}>{following ? 'Following' : 'Follow'}</Text>
            </Pressable>
          )}
        </View>

        {r.status === 'live' && (
          <MonoLabel bold color="act">● LIVE{r.live_delay ? ' · PEOPLE SEE YESTERDAY, NEVER TODAY' : ''}</MonoLabel>
        )}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Stat value={String(r.day_count)} label={r.day_count === 1 ? 'DAY' : 'DAYS'} />
          <Stat
            value={
              <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: c.tx }}>
                {'$'.repeat(r.budget ?? 0)}
                <Text style={{ color: c.mu, opacity: 0.45 }}>{'$'.repeat(4 - (r.budget ?? 0))}</Text>
              </Text>
            }
            label="BUDGET"
          />
          <Stat
            value={
              <Text style={{ fontFamily: fonts.bold, fontSize: 13, lineHeight: 21, letterSpacing: 1, color: c.act }}>
                {'●'.repeat(r.effort ?? 0)}
                <Text style={{ color: c.mu, opacity: 0.45 }}>{'●'.repeat(5 - (r.effort ?? 0))}</Text>
              </Text>
            }
            label={r.effort ? EFFORT_NAMES[r.effort - 1].toUpperCase() : 'EFFORT'}
          />
          <Stat value={`${r.went_month ? MON[r.went_month - 1] : '–'} ${firstWeather ? WEATHER[firstWeather] : ''}`.trim()} label="WENT" />
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => toast('Saving routes for offline is coming soon.')}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 52, borderRadius: radius.card, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln, opacity: pressed ? 0.8 : 1 })}
          >
            <Icon name="download" size={18} strokeWidth={2} />
            <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: c.tx }}>Save offline</Text>
          </Pressable>
          <SowoPill route={r} onPress={() => setSowo(true)} />
          {data.tunes && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Trip tunes"
              onPress={() => setTunes(true)}
              style={({ pressed }) => ({ width: 52, height: 52, borderRadius: radius.card, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}
            >
              <Icon name="music" size={20} color="act" strokeWidth={2} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={{ marginTop: 14 }}>
        <Tabs tabs={tabs} value={tab} onChange={setTab} accessibilityLabel="Route sections" />
      </View>

      {tab === 'legs' && (
        <>
          <Itinerary route={r} days={data.days} />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => toast('Updates from the road are coming soon.')}
              style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 14, borderRadius: radius.cardSm, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln, opacity: pressed ? 0.8 : 1 })}
            >
              <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: c.ok }} />
              <View style={{ flex: 1 }}>
                <Txt style={{ fontFamily: fonts.bold, fontSize: 14 }}>Updates · 0</Txt>
                <Txt variant="small" style={{ fontSize: 12 }}>No heads-ups. Been lately? Tell people how it was.</Txt>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => toast('Posting updates is coming soon.')}
              style={({ pressed }) => ({ height: 48, paddingHorizontal: 14, borderRadius: radius.cardSm, borderWidth: 1, borderStyle: 'dashed', borderColor: c.ln, justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}
            >
              <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: c.act }}>+ Update</Text>
            </Pressable>
          </View>
        </>
      )}
      {tab === 'must' &&
        (data.mustKnows.length ? (
          <MustKnowGrid items={data.mustKnows} />
        ) : (
          <TabNudge text={`@${r.owner_username} hasn’t added must-knows yet.`} />
        ))}
      {tab === 'spots' &&
        (data.spots.length ? (
          <SpotsGrid
            spots={data.spots}
            onPick={(s) => {
              if (s.lat == null || s.lng == null) return;
              setLayer('route');
              map.current?.flyTo([s.lng, s.lat], 13);
              toast(`${s.name} is on the map above.`);
            }}
          />
        ) : (
          <TabNudge text={`@${r.owner_username} hasn’t recommended any spots yet.`} />
        ))}
      {tab === 'moments' &&
        (data.moments.length ? (
          <MomentsGrid
            moments={data.moments}
            onOpen={setMoment}
            onSeeAll={() => router.push({ pathname: '/route/[id]/diary', params: { id: r.id } })}
          />
        ) : (
          <TabNudge text="No moments on this route yet. They show up here as photos with a story." />
        ))}
      {tab === 'posts' && (
        <View style={{ paddingTop: 14 }}>
          <Nudge
            text={`Posts that @${r.owner_username} links to this route show up here. They open in TikTok, Instagram or YouTube, so the views go to the creator.`}
            action={r.owner_username ? { label: `See @${r.owner_username}`, onPress: () => router.push(`/u/${r.owner_username}`) } : undefined}
          />
        </View>
      )}

      {/* Campfire */}
      <View style={{ marginTop: 22, marginHorizontal: -space.gutter, paddingHorizontal: space.gutter, paddingTop: 16, borderTopWidth: 8, borderTopColor: c.sf, gap: 10 }}>
        <View style={{ gap: 2 }}>
          <Txt style={{ fontFamily: fonts.bold, fontSize: 16 }}>
            Campfire <Text style={{ color: c.mu, fontFamily: fonts.semibold }}>· 0</Text>
          </Txt>
          <Txt variant="small" style={{ fontSize: 12 }}>Ask the creator and people who went</Txt>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => toast('Campfire opens soon.')}
          style={({ pressed }) => ({ height: 46, paddingHorizontal: 16, borderRadius: 999, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln, justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}
        >
          <Txt color="mu" style={{ fontSize: 14 }}>Ask, share a tip or say you loved it…</Txt>
        </Pressable>
      </View>

      <SowoPopup route={r} visible={sowo} onClose={() => setSowo(false)} />
      {data.tunes && <TunesPopup tunes={data.tunes} ownerAvatarTone={2} visible={tunes} onClose={() => setTunes(false)} />}
      {moment >= 0 && <MomentViewer routeId={r.id} moments={data.moments} index={moment} onIndex={setMoment} onClose={() => setMoment(-1)} />}
      {saves.sheet}
    </Screen>
  );
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, minWidth: 0, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln, borderRadius: radius.card, paddingVertical: 8, paddingHorizontal: 10 }}>
      {typeof value === 'string' ? <Text numberOfLines={1} style={{ fontFamily: fonts.bold, fontSize: 16, color: c.tx }}>{value}</Text> : value}
      <MonoLabel size={10} numberOfLines={1} style={{ letterSpacing: 0.2 }}>{label}</MonoLabel>
    </View>
  );
}

function RoundButton({ icon, label, onPress, filled }: { icon: 'back' | 'save' | 'share'; label: string; onPress: () => void; filled?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 999, backgroundColor: c.scrim, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}
    >
      <Icon name={icon} size={20} color={filled ? 'act' : 'tx'} filled={filled} strokeWidth={2.2} />
    </Pressable>
  );
}

function TabNudge({ text }: { text: string }) {
  const toast = useToast();
  return (
    <View style={{ paddingTop: 14 }}>
      <Nudge text={text} action={{ label: 'Ask in Campfire', onPress: () => toast('Campfire opens soon.') }} />
    </View>
  );
}
