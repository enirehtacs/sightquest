import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Avatar, Button, Card, Chip, Icon, MonoLabel, SocialLinks, Tabs, Txt, useToast } from '@/components';
import type { SampleAtlas, SampleSaved } from '@/data/seed';
import type { Links } from '@/lib/profiles';
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
  atlas: SampleAtlas | null;
  saved?: SampleSaved[];
  /** Showing sample content (until real routes arrive in Phase 2). */
  sample?: boolean;
};

type TabKey = 'routes' | 'saved' | 'achievements';

export function ProfileBody({ owner, name, username, place, bio, avatarUrl, links, actions, atlas, saved = [], sample }: Props) {
  const { c } = useTheme();
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>('routes');
  const [list, setList] = useState<'All' | 'Next trip' | 'Someday'>('All');
  const soon = () => toast('Route pages are coming soon.');

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

  const stats = atlas?.stats ?? { routes: 0, countries: 0, km: '0', badges: 0 };

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
            [stats.routes, 'ROUTES'],
            [stats.countries, 'COUNTRIES'],
            [stats.km, 'KM'],
            [stats.badges, 'BADGES'],
          ] as const
        ).map(([v, l]) => (
          <View key={l} style={{ flex: 1, minWidth: 0, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln, borderRadius: radius.cardSm, paddingVertical: 8, paddingHorizontal: 8 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: c.tx }}>{v}</Text>
            <MonoLabel size={10} numberOfLines={1} style={{ letterSpacing: 0.2 }}>{l}</MonoLabel>
          </View>
        ))}
      </View>

      <Tabs variant="pill" tabs={tabs} value={tab} onChange={setTab} accessibilityLabel="Profile sections" />

      {tab === 'routes' &&
        (atlas && atlas.routes.length ? (
          <View style={{ gap: 10 }}>
            {sample && (
              <MonoLabel size={10} style={{ textAlign: 'center' }}>
                {owner ? 'SAMPLE ROUTES · YOURS SHOW UP HERE ONCE YOU POST' : 'SAMPLE ROUTES'}
              </MonoLabel>
            )}
            {owner && atlas.inProgress && (
              <>
                <Pressable
                  accessibilityRole="button"
                  onPress={soon}
                  style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: c.sf, borderWidth: 1, borderColor: c.act, borderRadius: radius.card, paddingVertical: 12, paddingHorizontal: 14 }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: c.ph1 }} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <View style={{ alignSelf: 'flex-start', backgroundColor: c.ac, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <MonoLabel size={10} bold color="on">IN PROGRESS · DAY {atlas.inProgress.day}</MonoLabel>
                    </View>
                    <Txt variant="bodyStrong" numberOfLines={1}>{atlas.inProgress.title}</Txt>
                    <Txt variant="small">Private · add today’s day</Txt>
                  </View>
                </Pressable>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: -4 }}>
                  <View style={{ flex: 1 }}><Button label="Share route" icon="share" variant="ghost" size="sm" onPress={soon} block /></View>
                  <View style={{ flex: 1 }}><Button label="Tags & moments" variant="ghost" size="sm" onPress={soon} block /></View>
                </View>
              </>
            )}
            {owner && atlas.draft && (
              <Pressable
                accessibilityRole="button"
                onPress={soon}
                style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: c.sf, borderWidth: 1, borderStyle: 'dashed', borderColor: c.ln, borderRadius: radius.card, paddingVertical: 12, paddingHorizontal: 14 }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: c.mu }} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <MonoLabel size={10} bold>DRAFT</MonoLabel>
                  <Txt variant="bodyStrong" numberOfLines={1}>{atlas.draft.title}</Txt>
                  <Txt variant="small">{atlas.draft.legs} legs · finish and post</Txt>
                </View>
              </Pressable>
            )}
            <MonoLabel bold style={{ marginTop: 4 }}>{atlas.completedLabel}</MonoLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {atlas.routes.map((r) => (
                <Pressable
                  key={r.title}
                  accessibilityRole="button"
                  accessibilityLabel={`${r.title}, ${r.meta}`}
                  onPress={soon}
                  style={({ pressed }) => ({
                    width: '48.5%',
                    flexGrow: 1,
                    height: 120,
                    padding: 10,
                    borderRadius: radius.card,
                    backgroundColor: c[`ph${r.tone}` as const],
                    justifyContent: 'space-between',
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <View style={{ alignSelf: 'flex-start', backgroundColor: c.scrim, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <MonoLabel size={10} bold color="tx">{r.tag}</MonoLabel>
                  </View>
                  <View>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 14, lineHeight: 17, color: c.tx }}>{r.title}</Text>
                    <MonoLabel size={10} color="tx" style={{ opacity: 0.85 }}>{r.meta}</MonoLabel>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <Nudge
            text={owner ? 'Your routes live here. Start with a weekend you loved.' : `@${username} hasn’t posted a route yet. Follow them to see the first one.`}
            action={owner ? { label: 'Build a route', onPress: () => toast('Building routes is coming soon.') } : undefined}
          />
        ))}

      {tab === 'saved' && owner && (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['All', 'Next trip', 'Someday'] as const).map((f) => (
                <Chip key={f} label={f} selected={list === f} onPress={() => setList(f)} />
              ))}
            </View>
          </View>
          {sample && <MonoLabel size={10} style={{ textAlign: 'center' }}>SAMPLE SAVES · YOURS SHOW UP HERE</MonoLabel>}
          {saved
            .filter((r) => list === 'All' || r.list === list)
            .map((r) => (
              <Card key={r.title} onPress={soon} accessibilityLabel={`${r.title} by ${r.who}`} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 10 }}>
                <View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: c[`ph${r.tone}` as const] }} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Txt variant="bodyStrong" numberOfLines={1}>{r.title}</Txt>
                  <Pressable accessibilityRole="link" onPress={() => router.push(`/u/${r.who.slice(1)}`)} hitSlop={6}>
                    <Txt variant="small">{r.who}</Txt>
                  </Pressable>
                  <MonoLabel size={10}>{r.meta}</MonoLabel>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Icon name="save" size={18} color="act" filled />
                  <Txt variant="small" style={{ fontSize: 11 }}>{r.list}</Txt>
                </View>
              </Card>
            ))}
        </View>
      )}

      {tab === 'achievements' && (
        <Nudge
          text={owner ? 'Badges and personal bests show up here as you post routes, days and moments.' : `@${username}’s badges and personal bests show up here.`}
          action={owner ? { label: 'Build a route', onPress: () => toast('Building routes is coming soon.') } : undefined}
        />
      )}
    </View>
  );
}

/** A friendly empty state with one action: never a dead end. */
function Nudge({ text, action }: { text: string; action?: { label: string; onPress: () => void } }) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: 22, gap: 12 }}>
      <Icon name="logo" size={32} color="act" strokeWidth={1.4} />
      <Txt color="mu" style={{ textAlign: 'center', maxWidth: 300 }}>{text}</Txt>
      {action && (
        <View style={{ alignSelf: 'center' }}>
          <Button label={action.label} size="sm" onPress={action.onPress} />
        </View>
      )}
    </Card>
  );
}
