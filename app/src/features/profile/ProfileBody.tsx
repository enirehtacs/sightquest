import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';

import { Avatar, Button, Chip, Icon, MonoLabel, RouteThumb, SocialLinks, Tabs, Txt } from '@/components';
import { Nudge, openRoute } from '@/features/route/cards';
import { LIST_LABEL } from '@/features/route/useSaves';
import type { Links } from '@/lib/profiles';
import { kmLabel, metaLine, toneOf, vibeTag } from '@/lib/routeFormat';
import type { RouteCard, SavedRoute } from '@/lib/routes';
import { fonts, radius, useTheme } from '@/theme';

// The body of a profile, shared by Me (owner) and a creator profile (visitor).
// Layout from design/prototype/Me.dc.html.

type Props = {
  owner: boolean;
  name: string;
  username: string;
  place: string;
  bio: string | null;
  avatarUrl: string | null;
  links: Links;
  /** Buttons under the links: Edit/Share for you, Follow/bell for others. */
  actions: React.ReactNode;
  /** Their routes (only the ones you're allowed to see), null while loading. */
  routes: RouteCard[] | null;
  /** Your saves (owner only), null while loading. */
  saved?: SavedRoute[] | null;
};

type TabKey = 'routes' | 'saved' | 'achievements';

const ROUTE_URL = 'https://sightquest-app.vercel.app/route/';

export function ProfileBody({ owner, name, username, place, bio, avatarUrl, links, actions, routes, saved = [] }: Props) {
  const { c } = useTheme();
  const [tab, setTab] = useState<TabKey>('routes');
  const [list, setList] = useState<'all' | 'next_trip' | 'someday'>('all');

  const tabs: { key: TabKey; label: string }[] = owner
    ? [
        { key: 'routes', label: 'Routes' },
        { key: 'saved', label: 'Saved' },
        { key: 'achievements', label: 'Achievements' },
      ]
    : [
        { key: 'routes', label: 'Routes' },
        { key: 'achievements', label: 'Achievements' },
      ];

  const posted = (routes ?? []).filter((r) => r.status !== 'draft');
  const live = posted.filter((r) => r.status === 'live');
  const done = posted.filter((r) => r.status === 'complete');
  const drafts = (routes ?? []).filter((r) => r.status === 'draft');
  const countries = new Set(posted.flatMap((r) => r.country_codes)).size;
  const km = posted.reduce((sum, r) => sum + (r.distance_km ?? 0), 0);
  const grid = owner ? done : posted;

  const atlasLine = [
    `${posted.length} ${posted.length === 1 ? 'trip' : 'trips'}`,
    `${countries} ${countries === 1 ? 'country' : 'countries'}`,
    live.length ? `${live.length} live` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <View style={{ borderRadius: 999, borderWidth: 3, borderColor: c.act }}>
          <Avatar uri={avatarUrl} name={name} size={58} tone={2} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Txt numberOfLines={1} style={{ fontFamily: fonts.heavy, fontSize: 20, lineHeight: 24 }}>{name}</Txt>
          <MonoLabel style={{ textTransform: 'none' }}>
            @{username}
            {place ? ` · ${place.toUpperCase()}` : ''}
          </MonoLabel>
          {bio ? <Txt color="mu" style={{ fontSize: 14, lineHeight: 20 }}>{bio}</Txt> : null}
        </View>
      </View>

      <SocialLinks links={links} owner={owner} />

      {actions}

      <View style={{ flexDirection: 'row', gap: 6 }}>
        {(
          [
            [routes ? posted.length : '–', 'ROUTES'],
            [routes ? countries : '–', 'COUNTRIES'],
            [routes ? kmLabel(km) : '–', 'KM'],
            [0, 'BADGES'],
          ] as const
        ).map(([v, l]) => (
          <View key={l} style={{ flex: 1, minWidth: 0, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln, borderRadius: radius.cardSm, paddingVertical: 8, paddingHorizontal: 8 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: c.tx }}>{v}</Text>
            <MonoLabel size={10} numberOfLines={1} style={{ letterSpacing: 0.2 }}>{l}</MonoLabel>
          </View>
        ))}
      </View>

      {/* Atlas card: every trip on one map. */}
      {posted.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open the atlas full screen. ${atlasLine}`}
          onPress={() => router.push(owner ? '/atlas' : { pathname: '/atlas', params: { user: username } })}
          style={({ pressed }) => ({ height: 140, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: c.ln, opacity: pressed ? 0.88 : 1 })}
        >
          <RouteThumb lines={posted.map((r) => r.line)} style={{ flex: 1 }} inset={{ top: 18, bottom: 40, left: 24, right: 24 }} />
          <View style={{ position: 'absolute', left: 12, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: c.scrim }}>
            <View style={{ width: 14, height: 4, borderRadius: 999, backgroundColor: c.rt }} />
            <Txt style={{ fontFamily: fonts.semibold, fontSize: 13 }}>{atlasLine}</Txt>
          </View>
          <View style={{ position: 'absolute', right: 12, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: c.scrim }}>
            <Icon name="fit" size={12} color="act" strokeWidth={2.4} />
            <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: c.act }}>Explore</Text>
          </View>
        </Pressable>
      )}

      <Tabs variant="pill" tabs={tabs} value={tab} onChange={setTab} accessibilityLabel="Profile sections" />

      {tab === 'routes' &&
        (routes === null ? (
          <View style={{ height: 120, borderRadius: radius.card, backgroundColor: c.sf }} />
        ) : routes.length === 0 ? (
          <Nudge
            text={owner ? 'Your routes live here. Start with a weekend you loved.' : `@${username} hasn’t shared a route with you yet. Follow them to see their followers-only routes.`}
            action={owner ? { label: 'Build a route', onPress: () => router.push('/build/new') } : undefined}
          />
        ) : (
          <View style={{ gap: 10 }}>
            {owner &&
              live.map((r) => (
                <View key={r.id} style={{ gap: 8 }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`In progress: ${r.title}`}
                    onPress={() => router.push({ pathname: '/build/[id]', params: { id: r.id } })}
                    style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: c.sf, borderWidth: 1, borderColor: c.act, borderRadius: radius.card, paddingVertical: 12, paddingHorizontal: 14 }}
                  >
                    <RouteThumb line={r.line} style={{ width: 44, height: 44, borderRadius: 12 }} inset={{ top: 8, right: 8, bottom: 8, left: 8 }} />
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <View style={{ alignSelf: 'flex-start', backgroundColor: c.ac, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <MonoLabel size={10} bold color="on">IN PROGRESS · DAY {r.day_count}</MonoLabel>
                      </View>
                      <Txt variant="bodyStrong" numberOfLines={1}>{r.title}</Txt>
                      <Txt variant="small">{r.visibility === 'private' ? 'Private' : r.visibility === 'followers' ? 'Followers' : 'Everyone'} · add today’s day</Txt>
                    </View>
                  </Pressable>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Button
                        label="Share route"
                        icon="share"
                        variant="ghost"
                        size="sm"
                        block
                        onPress={() => Share.share({ message: `${r.title} on Sightquest: ${ROUTE_URL}${r.id}`, url: `${ROUTE_URL}${r.id}` }).catch(() => {})}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button label="Tags & moments" variant="ghost" size="sm" block onPress={() => router.push({ pathname: '/build/[id]', params: { id: r.id } })} />
                    </View>
                  </View>
                </View>
              ))}
            {owner &&
              drafts.map((r) => (
                <Pressable
                  key={r.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Draft: ${r.title}`}
                  onPress={() => router.push({ pathname: '/build/[id]', params: { id: r.id } })}
                  style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: c.sf, borderWidth: 1, borderStyle: 'dashed', borderColor: c.ln, borderRadius: radius.card, paddingVertical: 12, paddingHorizontal: 14 }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: c.mu }} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <MonoLabel size={10} bold>DRAFT</MonoLabel>
                    <Txt variant="bodyStrong" numberOfLines={1}>{r.title}</Txt>
                    <Txt variant="small">{r.day_count} {r.day_count === 1 ? 'day' : 'days'} · finish and post</Txt>
                  </View>
                </Pressable>
              ))}
            {grid.length > 0 && (
              <>
                <MonoLabel bold style={{ marginTop: 4 }}>{owner ? `COMPLETED · ${grid.length}` : `ROUTES · ${grid.length}`}</MonoLabel>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {grid.map((r) => (
                    <Pressable
                      key={r.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${r.title}, ${metaLine(r, { budget: false })}`}
                      onPress={() => openRoute(r.id)}
                      style={({ pressed }) => ({
                        width: '48.5%',
                        flexGrow: 1,
                        height: 120,
                        padding: 10,
                        borderRadius: radius.card,
                        backgroundColor: c[`ph${toneOf(r.id)}` as const],
                        justifyContent: 'space-between',
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      <View style={{ alignSelf: 'flex-start', backgroundColor: c.scrim, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <MonoLabel size={10} bold color="tx">{vibeTag(r)}</MonoLabel>
                      </View>
                      <View>
                        <Text numberOfLines={2} style={{ fontFamily: fonts.bold, fontSize: 14, lineHeight: 17, color: c.tx }}>{r.title}</Text>
                        <MonoLabel size={10} color="tx" numberOfLines={1} style={{ opacity: 0.85 }}>{metaLine(r, { budget: false })}</MonoLabel>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </View>
        ))}

      {tab === 'saved' && owner && (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {(
              [
                ['all', 'All'],
                ['next_trip', 'Next trip'],
                ['someday', 'Someday'],
              ] as const
            ).map(([k, l]) => (
              <Chip key={k} label={l} selected={list === k} onPress={() => setList(k)} />
            ))}
          </View>
          {saved === null ? (
            <View style={{ height: 84, borderRadius: radius.card, backgroundColor: c.sf }} />
          ) : saved.filter((r) => list === 'all' || r.list === list).length === 0 ? (
            <Nudge
              text={list === 'all' ? 'Save routes you love to Next trip or Someday. They wait for you here.' : `Nothing in ${LIST_LABEL[list]} yet.`}
              action={{ label: 'Find routes', onPress: () => router.navigate('/search') }}
            />
          ) : (
            saved
              .filter((r) => list === 'all' || r.list === list)
              .map((r) => (
                <Pressable
                  key={r.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${r.title} by @${r.owner_username}`}
                  onPress={() => openRoute(r.id)}
                  style={({ pressed }) => ({ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 10, borderRadius: radius.card, borderWidth: 1, borderColor: c.ln, backgroundColor: c.sf, opacity: pressed ? 0.85 : 1 })}
                >
                  <RouteThumb line={r.line} style={{ width: 64, height: 64, borderRadius: 12 }} inset={{ top: 10, right: 10, bottom: 10, left: 10 }} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Txt variant="bodyStrong" numberOfLines={1}>{r.title}</Txt>
                    <Txt variant="small">@{r.owner_username}</Txt>
                    <MonoLabel size={10} numberOfLines={1}>{metaLine(r)}</MonoLabel>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Icon name="save" size={18} color="act" filled />
                    <Txt variant="small" style={{ fontSize: 11 }}>{LIST_LABEL[r.list]}</Txt>
                  </View>
                </Pressable>
              ))
          )}
        </View>
      )}

      {tab === 'achievements' && (
        <Nudge
          text={owner ? 'Badges and personal bests show up here as you post routes, days and moments.' : `@${username}’s badges and personal bests show up here.`}
          action={owner ? { label: 'Build a route', onPress: () => router.push('/build/new') } : { label: 'See their routes', onPress: () => setTab('routes') }}
        />
      )}
    </View>
  );
}
