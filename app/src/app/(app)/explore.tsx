import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Avatar, BottomNav, Icon, MonoLabel, Screen, Txt, useToast } from '@/components';
import { BigRouteCard, MiniRouteCard, Nudge, RouteRow, SectionHead } from '@/features/route/cards';
import { useNav } from '@/features/nav/useNav';
import { useAuth } from '@/lib/auth';
import { geocode } from '@/lib/places';
import { listCreators, myFollowingIds, placeLine, type PublicProfile } from '@/lib/profiles';
import { MONTHS, offbeatLabel, vibeTag } from '@/lib/routeFormat';
import { bestIn, buildingNow, easyWins, hiddenGems, mySaves, recommended, type RouteCard } from '@/lib/routes';
import { fonts, radius, space, useTheme } from '@/theme';

type Feed = {
  building: RouteCard[];
  recommended: RouteCard[];
  easy: RouteCard[];
  best: RouteCard[];
  gems: RouteCard[];
  savedTitle: string | null;
  near: string | null;
};

/** Next month in your own time zone (1–12). */
const nextMonth = () => ((new Date().getMonth() + 1) % 12) + 1;

/** Explore ("For you"): design/prototype/Main.dc.html, SPEC section 2. */
export default function Explore() {
  const { profile, uid, preview } = useAuth();
  const { c } = useTheme();
  const nav = useNav();
  const toast = useToast();
  const [feed, setFeed] = useState<Feed | null>(null);
  const [failed, setFailed] = useState(false);
  const [people, setPeople] = useState<PublicProfile[] | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const month = nextMonth();
  const homeBase = profile ? placeLine(profile) || profile.home_country : null;

  // Refresh when you come back (after saving or following someone).
  const load = useCallback(() => {
      if (!uid) return;
      let live = true;
      (async () => {
        try {
          const home = await geocode(homeBase);
          const [building, rec, easy, best, gems, saves] = await Promise.all([
            buildingNow(),
            recommended(8),
            easyWins(home, 4),
            bestIn(month, null, 8),
            hiddenGems(null, 8),
            mySaves(uid),
          ]);
          if (!live) return;
          setFeed({ building, recommended: rec, easy, best, gems, savedTitle: saves[0]?.title ?? null, near: home ? homeBase : null });
          setFailed(false);
        } catch {
          if (live) setFailed(true);
        }
      })();
      listCreators(uid)
        .then((p) => live && setPeople(p))
        .catch(() => live && setPeople([]));
      if (!preview) myFollowingIds(uid).then((s) => live && setFollowingIds(s)).catch(() => {});
      return () => {
        live = false;
      };
    }, [uid, preview, month, homeBase]);
  // Refresh when you come back; "Try again" calls it directly.
  useFocusEffect(load);

  const first = (profile?.display_name || profile?.username || 'traveller').split(' ')[0];
  const short = (t: string) => t.split(',')[0];

  return (
    <Screen withNav overlay={<BottomNav active="explore" onNavigate={nav} />} contentStyle={{ gap: 0 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="logo" size={26} color="act" strokeWidth={1.6} />
          <Text style={{ fontFamily: fonts.heavy, fontSize: 16, color: c.tx }}>Sightquest</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Inbox"
            onPress={() => toast('Your inbox is coming soon.')}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="bell" size={22} strokeWidth={2} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Your atlas" onPress={() => router.navigate('/me')} hitSlop={2}>
            <View style={{ borderRadius: 999, borderWidth: 2, borderColor: c.act }}>
              <Avatar uri={profile?.avatar_url} name={first} size={36} tone={2} />
            </View>
          </Pressable>
        </View>
      </View>

      <View style={{ gap: 6, marginTop: 12 }}>
        <Txt accessibilityRole="header" style={{ fontFamily: fonts.heavy, fontSize: 24, lineHeight: 28 }}>For you, {first}</Txt>
        <Txt color="mu">
          {feed?.savedTitle ? 'Picked from the routes you’ve saved and the ones you’ve done.' : 'A few good ones to start with. Save what you like and this gets smarter.'}
        </Txt>
      </View>

      {failed && !feed ? (
        <View style={{ marginTop: 16 }}>
          <Nudge text="Couldn’t load routes just now. Check your connection and try again." action={{ label: 'Try again', onPress: () => load() }} />
        </View>
      ) : null}

      {feed?.building.map((r) => (
        <View key={r.id} style={{ marginTop: 16, borderRadius: 20, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Building now: ${r.title}`}
            onPress={() => router.push({ pathname: '/build/[id]', params: { id: r.id } })}
            style={({ pressed }) => ({ gap: 10, paddingHorizontal: 14, paddingVertical: 12, paddingRight: 120, opacity: pressed ? 0.85 : 1 })}
          >
            <MonoLabel size={10} bold color="act">● BUILDING NOW</MonoLabel>
            <View style={{ minWidth: 0, gap: 2 }}>
              <Txt numberOfLines={1} style={{ fontFamily: fonts.heavy, fontSize: 17, lineHeight: 22 }}>{r.title}</Txt>
              <Txt variant="small" numberOfLines={1}>
                {[r.partner ? `With @${r.partner.username}` : null, `Day ${r.day_count}`, r.to_name].filter(Boolean).join(' · ')}
              </Txt>
            </View>
          </Pressable>
          <View pointerEvents="none" style={{ position: 'absolute', top: 10, right: 14, flexDirection: 'row' }}>
            <Avatar uri={profile?.avatar_url} name={first} size={22} tone={1} ring="ring" />
            {r.partner && (
              <View style={{ marginLeft: -7 }}>
                <Avatar uri={r.partner.avatar_url} name={r.partner.username} size={22} tone={2} ring="ring" />
              </View>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add day ${r.day_count + 1} to ${r.title}`}
            onPress={() => router.push({ pathname: '/build/[id]', params: { id: r.id, add: '1' } })}
            style={{ position: 'absolute', right: 14, bottom: 14, height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: c.ac, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: c.on }}>+ Add day</Text>
          </Pressable>
        </View>
      ))}

      {/* Recommended for you */}
      <View style={{ marginTop: 20 }}>
        <SectionHead
          title="Recommended for you"
          sub={feed?.savedTitle ? `Because you saved ${short(feed.savedTitle)}` : 'Well-loved routes to start with'}
        />
      </View>
      <Row loading={!feed} h={220} w={250}>
        {feed?.recommended.map((r) => <BigRouteCard key={r.id} r={r} chip={vibeTag(r)} />)}
      </Row>
      {feed && feed.recommended.length === 0 && (
        <Nudge text="Save a route or two and we’ll find more like them." action={{ label: 'Search routes', onPress: () => router.navigate('/search') }} />
      )}

      {/* Easy wins this weekend */}
      <View style={{ marginTop: 20 }}>
        <SectionHead title="Easy wins this weekend" sub={feed?.near ? `Short, cheap, close to ${feed.near}` : 'Short, cheap and easy'} />
      </View>
      <View style={{ paddingTop: 4 }}>
        {feed ? (
          feed.easy.length ? (
            feed.easy.map((r, i) => <RouteRow key={r.id} r={r} first={i === 0} />)
          ) : (
            <Nudge text="No easy weekenders near you yet. Know one? You could be the first to post it." action={{ label: 'Search routes', onPress: () => router.navigate('/search') }} />
          )
        ) : (
          <Placeholder h={44} n={3} />
        )}
      </View>

      {/* Best in {next month} */}
      <View style={{ marginTop: 20 }}>
        <SectionHead
          title={`Best in ${MONTHS[month - 1]}`}
          sub="Weather’s on your side next month"
          onSeeAll={() => router.push({ pathname: '/collection/[kind]', params: { kind: 'best', month: String(month) } })}
        />
      </View>
      <Row loading={!feed} h={150} w={160}>
        {feed?.best.map((r) => <MiniRouteCard key={r.id} r={r} chip={`☀ ${r.season_note ?? 'GOOD WEATHER'}`} chipColor="act" />)}
      </Row>
      {feed && feed.best.length === 0 && (
        <Nudge text={`Nobody’s posted a ${MONTHS[month - 1]} route yet. Search for something else to dream about.`} action={{ label: 'Search routes', onPress: () => router.navigate('/search') }} />
      )}

      {/* Hidden gems */}
      <View style={{ marginTop: 20 }}>
        <SectionHead
          title="Hidden gems"
          sub={feed?.savedTitle ? 'Few have been. Your saves lean off-beat.' : 'Few have been. Off-beat, but possible.'}
          onSeeAll={() => router.push({ pathname: '/collection/[kind]', params: { kind: 'gems' } })}
        />
      </View>
      <Row loading={!feed} h={150} w={160}>
        {feed?.gems.map((r) => <MiniRouteCard key={r.id} r={r} chip={offbeatLabel(r.offbeat).toUpperCase() || 'HIDDEN GEM'} />)}
      </Row>
      {feed && feed.gems.length === 0 && (
        <Nudge text="No hidden gems yet. The off-beat routes show up here first." action={{ label: 'Search routes', onPress: () => router.navigate('/search') }} />
      )}

      {/* People to follow (followers-only routes find you once you follow) */}
      <View style={{ marginTop: 20, gap: 10 }}>
        <SectionHead title="People to follow" sub="Some routes are for followers only" />
        {people === null ? (
          <Placeholder h={68} n={2} />
        ) : people.length === 0 ? (
          <Nudge text="Nobody to suggest yet. Invite a friend who travels." />
        ) : (
          people.map((p, i) => (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityLabel={`${p.display_name || p.username}, @${p.username}`}
              onPress={() => router.push(`/u/${p.username}`)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                borderRadius: radius.card,
                borderWidth: 1,
                borderColor: c.ln,
                backgroundColor: c.sf,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Avatar uri={p.avatar_url} name={p.display_name || p.username} size={44} tone={((i % 4) + 1) as 1 | 2 | 3 | 4} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Txt variant="bodyStrong" numberOfLines={1}>{p.display_name || p.username}</Txt>
                <MonoLabel size={10} style={{ textTransform: 'none' }} numberOfLines={1}>
                  @{p.username}
                  {placeLine(p) ? ` · ${placeLine(p).toUpperCase()}` : ''}
                </MonoLabel>
              </View>
              {followingIds.has(p.id) ? <MonoLabel bold color="act">FOLLOWING</MonoLabel> : <Icon name="next" size={18} color="mu" strokeWidth={2.2} />}
            </Pressable>
          ))
        )}
      </View>
    </Screen>
  );
}

/** A sideways row of cards that bleeds to the screen edge. */
function Row({ children, loading, h, w }: { children: React.ReactNode; loading: boolean; h: number; w: number }) {
  const { c } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -space.gutter, marginTop: 12 }}
      contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 12 }}
    >
      {loading
        ? [0, 1, 2].map((i) => <View key={i} style={{ width: w, height: h, borderRadius: 20, backgroundColor: c.sf }} />)
        : children}
    </ScrollView>
  );
}

function Placeholder({ h, n }: { h: number; n: number }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {Array.from({ length: n }, (_, i) => (
        <View key={i} style={{ height: h, borderRadius: 14, backgroundColor: c.sf }} />
      ))}
    </View>
  );
}
