import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { BottomNav, Chip, Icon, MonoLabel, Screen, Txt } from '@/components';
import { FeedRouteCard, Nudge } from '@/features/route/cards';
import { useNav } from '@/features/nav/useNav';
import { useSaves } from '@/features/route/useSaves';
import { MONTHS, offbeatLabel } from '@/lib/routeFormat';
import { bestIn, hiddenGems, type RouteCard } from '@/lib/routes';
import { fonts, radius, space, useTheme } from '@/theme';

type Kind = 'best' | 'gems';

const CHIPS: Record<Kind, { label: string; value: string | null }[]> = {
  best: [
    { label: 'All', value: null },
    { label: 'Mountains', value: 'mountains' },
    { label: 'Cities', value: 'cities' },
    { label: 'Islands', value: 'islands' },
    { label: 'Rivers', value: 'rivers' },
  ],
  gems: [
    { label: 'All', value: null },
    { label: 'Few have been', value: 'few_have_been' },
    { label: 'Off the map', value: 'off_the_map' },
  ],
};

/** Collection pages: design/prototype/Collection.dc.html and CollectionGems.dc.html. */
export default function Collection() {
  const params = useLocalSearchParams<{ kind: string; month?: string }>();
  const kind: Kind = params.kind === 'gems' ? 'gems' : 'best';
  const month = Math.min(12, Math.max(1, Number(params.month) || ((new Date().getMonth() + 1) % 12) + 1));
  const { c } = useTheme();
  const nav = useNav();
  const saves = useSaves();
  const [chip, setChip] = useState<string | null>(null);
  const [routes, setRoutes] = useState<RouteCard[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
      let live = true;
      (kind === 'best' ? bestIn(month, chip) : hiddenGems(chip))
        .then((r) => {
          if (!live) return;
          setRoutes(r);
          setFailed(false);
        })
        .catch(() => live && setFailed(true));
      return () => {
        live = false;
      };
    }, [kind, month, chip]);
  // Refresh when you come back; "Try again" calls it directly.
  useFocusEffect(load);

  const head =
    kind === 'best'
      ? { icon: '☀', title: `Best in ${MONTHS[month - 1]}`, sub: `Weather’s on your side. Creators went in ${MONTHS[month - 1]} or say it’s the time to go.` }
      : { icon: '◆', title: 'Hidden gems', sub: 'Off-beat routes few people have done. Possible, just quieter.' };

  return (
    <Screen withNav overlay={<BottomNav active="explore" onNavigate={nav} />}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -4 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Explore"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/explore'))}
          style={{ width: 44, height: 44, marginLeft: -12, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="back" size={22} strokeWidth={2.2} />
        </Pressable>
        <Txt color="mu" style={{ fontFamily: fonts.semibold, fontSize: 14 }}>Explore</Txt>
      </View>

      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', padding: 14, borderRadius: 20, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln }}>
        <View style={{ width: 52, height: 52, borderRadius: radius.card, backgroundColor: c.sf2, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 24, color: c.act }}>{head.icon}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Txt accessibilityRole="header" numberOfLines={1} style={{ fontFamily: fonts.heavy, fontSize: 22, lineHeight: 26 }}>{head.title}</Txt>
          <Txt color="mu" style={{ fontSize: 14, lineHeight: 19 }}>{head.sub}</Txt>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.gutter }} contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 8 }}>
        {CHIPS[kind].map((x) => (
          <Chip key={x.label} label={x.label} selected={chip === x.value} onPress={() => setChip(x.value)} />
        ))}
      </ScrollView>

      {routes && <MonoLabel>{routes.length} {routes.length === 1 ? 'ROUTE' : 'ROUTES'}</MonoLabel>}

      {failed && !routes ? (
        <Nudge text="Couldn’t load these routes. Check your connection." action={{ label: 'Try again', onPress: () => load() }} />
      ) : routes === null ? (
        [0, 1].map((i) => <View key={i} style={{ height: 200, borderRadius: 20, backgroundColor: c.sf }} />)
      ) : routes.length === 0 ? (
        <Nudge
          text={kind === 'best' ? `Nothing here for ${MONTHS[month - 1]} yet. Try another kind of trip.` : 'No hidden gems like that yet. Try All.'}
          action={{ label: 'Show all', onPress: () => setChip(null) }}
        />
      ) : (
        <View style={{ gap: 18 }}>
          {routes.map((r) => (
            <FeedRouteCard
              key={r.id}
              r={r}
              chip={kind === 'best' ? `☀ ${r.season_note ?? 'GOOD WEATHER'}` : offbeatLabel(r.offbeat).toUpperCase()}
              chipColor={kind === 'best' ? 'act' : 'tx'}
              saved={saves.saved.has(r.id)}
              onSave={() => saves.ask({ id: r.id, title: r.title })}
            />
          ))}
        </View>
      )}
      {saves.sheet}
    </Screen>
  );
}
