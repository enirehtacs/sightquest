import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { CloseX, Icon, MonoLabel, Popup, Txt } from '@/components';
import { clock, LEG_MODE, MUST_KNOW, SPOT_KIND, toneOf } from '@/lib/routeFormat';
import type { Day, Moment, MustKnow, RouteCard, Spot, TripTunes } from '@/lib/routes';
import { fonts, radius, useTheme } from '@/theme';

// The pieces of the Route screen (design/prototype/Route.dc.html, SPEC section 4).

const cell = { flexBasis: '48%', flexGrow: 1, minWidth: 0 } as const;

// ── Itinerary ─────────────────────────────────────────────────────
export function Itinerary({ route, days }: { route: RouteCard; days: Day[] }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      {route.weather_note ? (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 10, marginBottom: 4, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.cardSm, backgroundColor: c.sf }}>
          <Icon name="sun" size={16} color="act" strokeWidth={2} />
          <Txt variant="small" style={{ flex: 1, lineHeight: 19 }}>{route.weather_note}</Txt>
        </View>
      ) : null}
      {days.length === 0 && (
        <Txt color="mu" style={{ paddingVertical: 12 }}>
          {route.live_delay ? 'Day 1 shows up here tomorrow. People see yesterday, never today.' : 'No days on this route yet.'}
        </Txt>
      )}
      {days.map((d, i) => (
        <View key={d.id} style={{ paddingVertical: 9, gap: 6, borderBottomWidth: i === days.length - 1 ? 0 : 1, borderBottomColor: c.ln }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <MonoLabel bold color="act" numberOfLines={1} style={{ flex: 1 }}>DAY {d.day_number} · {d.place_name}</MonoLabel>
          </View>
          {d.legs.length === 0 && d.note ? <Txt color="mu" style={{ fontSize: 14, lineHeight: 20 }}>{d.note}</Txt> : null}
          {d.legs.map((l) => (
            <View key={l.id} style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ width: 62, height: 26, borderRadius: 999, backgroundColor: c.sf2, alignItems: 'center', justifyContent: 'center' }}>
                <MonoLabel bold color="act" numberOfLines={1} style={{ fontSize: 10 }}>{LEG_MODE[l.mode] ?? l.mode.toUpperCase()}</MonoLabel>
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Txt style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 }}>
                    {l.from_name && l.to_name ? `${l.from_name} → ${l.to_name}` : l.mode === 'stayed' ? `Stayed in ${d.place_name}` : d.place_name}
                  </Txt>
                  {l.duration_text ? <MonoLabel style={{ fontSize: 12, textTransform: 'none' }}>{l.duration_text}</MonoLabel> : null}
                </View>
                {l.note || d.note ? <Txt color="mu" style={{ fontSize: 14, lineHeight: 20 }}>{l.note ?? d.note}</Txt> : null}
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Must-know ─────────────────────────────────────────────────────
export function MustKnowGrid({ items }: { items: MustKnow[] }) {
  const { c } = useTheme();
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 6);
  return (
    <View style={{ gap: 10, paddingTop: 14 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {shown.map((m) => {
          const meta = MUST_KNOW[m.category] ?? MUST_KNOW.custom;
          return (
            <View key={m.id} style={[cell, { backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln, borderRadius: radius.card, paddingVertical: 10, paddingHorizontal: 12, gap: 4 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name={meta.icon} size={15} color="act" strokeWidth={1.9} />
                <MonoLabel size={10} bold numberOfLines={1} style={{ flex: 1 }}>{m.category === 'custom' ? m.custom_label : meta.label}</MonoLabel>
              </View>
              {m.chips.length ? <Txt style={{ fontFamily: fonts.bold, fontSize: 14, lineHeight: 18 }}>{m.chips.join(', ')}</Txt> : null}
              {m.note ? <Txt variant="small" style={{ fontSize: 12, lineHeight: 16 }}>{m.note}</Txt> : null}
            </View>
          );
        })}
      </View>
      {items.length > 6 && <OutlineButton label={all ? 'Show less' : `See all ${items.length} must-knows`} onPress={() => setAll(!all)} />}
    </View>
  );
}

// ── Spots ─────────────────────────────────────────────────────────
export function SpotsGrid({ spots, onPick }: { spots: Spot[]; onPick: (s: Spot) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 14 }}>
      {spots.map((s) => {
        const k = SPOT_KIND[s.kind] ?? SPOT_KIND.other;
        return (
          <Pressable
            key={s.id}
            accessibilityRole="button"
            accessibilityLabel={`${s.name}, ${k.label}. Show on the map`}
            onPress={() => onPick(s)}
            style={({ pressed }) => [cell, { backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln, borderRadius: radius.card, paddingVertical: 10, paddingHorizontal: 12, gap: 4, opacity: pressed ? 0.8 : 1 }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name={k.icon} size={15} color="act" strokeWidth={1.9} />
              <MonoLabel size={10} bold numberOfLines={1}>{k.label}</MonoLabel>
            </View>
            <Txt style={{ fontFamily: fonts.bold, fontSize: 14, lineHeight: 18 }}>{s.name}</Txt>
            <Txt variant="small" style={{ fontSize: 12, lineHeight: 16 }}>{[s.where_name, s.why].filter(Boolean).join(' · ')}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Moments ───────────────────────────────────────────────────────
export function MomentsGrid({ moments, onOpen, onSeeAll }: { moments: Moment[]; onOpen: (i: number) => void; onSeeAll: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 10, paddingTop: 14 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {moments.slice(0, 6).map((m, i) => (
          <Pressable
            key={m.id}
            accessibilityRole="button"
            accessibilityLabel={`Open moment: ${m.caption ?? m.tag ?? ''}`}
            onPress={() => onOpen(i)}
            style={({ pressed }) => ({
              flexBasis: '31%',
              flexGrow: 1,
              height: 130,
              borderRadius: radius.card,
              padding: 10,
              justifyContent: 'flex-end',
              backgroundColor: c[`ph${toneOf(m.id)}` as const],
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <MonoLabel size={10} bold color="tx" numberOfLines={2}>{m.tag ?? `DAY ${m.day_number}`}</MonoLabel>
          </Pressable>
        ))}
      </View>
      <OutlineButton label={`See all ${moments.length} moments`} onPress={onSeeAll} />
    </View>
  );
}

export function OutlineButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ height: 42, borderRadius: 999, borderWidth: 1, borderColor: c.ln, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}
    >
      <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: c.tx }}>{label}</Text>
    </Pressable>
  );
}

// ── SOWO popup ────────────────────────────────────────────────────
export function SowoPopup({ route, visible, onClose }: { route: RouteCard; visible: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const n = route.sowo_count;
  const score = route.sowo_score != null ? Math.round(route.sowo_score) : null;
  const enough = n >= 5 && score != null;
  return (
    <Popup visible={visible} onClose={onClose} label="SOWO score">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={{ fontFamily: fonts.bold, fontSize: 16 }}>SOWO score</Txt>
          <Txt variant="small" style={{ fontSize: 12 }}>Solo women rate the route</Txt>
        </View>
        {route.sowo_approved && (
          <View style={{ backgroundColor: c.ac, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 }}>
            <MonoLabel size={10} bold color="on">✓ SOWO APPROVED</MonoLabel>
          </View>
        )}
        <CloseX onPress={onClose} />
      </View>
      {enough ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontFamily: fonts.heavy, fontSize: 32, lineHeight: 34, color: c.tx }}>{score}%</Text>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ height: 8, borderRadius: 999, backgroundColor: c.sf2, overflow: 'hidden' }}>
                <View style={{ width: `${score}%`, height: '100%', backgroundColor: c.ac }} />
                <View style={{ position: 'absolute', left: '80%', top: 0, bottom: 0, width: 2, backgroundColor: c.bg }} />
              </View>
              <MonoLabel size={10}>{n} RATINGS · APPROVED FROM 80%</MonoLabel>
            </View>
          </View>
          <Txt style={{ fontSize: 14, lineHeight: 20 }}>{score}% of women who did this route solo felt comfortable.</Txt>
        </>
      ) : (
        <Txt style={{ fontSize: 14, lineHeight: 20 }}>
          {n === 0
            ? 'No solo women have rated this route yet.'
            : `${n} ${n === 1 ? 'rating' : 'ratings'} so far. The score shows from 5 ratings, and it’s approved from 80%.`}
        </Txt>
      )}
      <Txt variant="small" style={{ fontSize: 12, lineHeight: 17 }}>Shared experiences, not a safety guarantee.</Txt>
    </Popup>
  );
}

/** The SOWO pill under the stats. */
export function SowoPill({ route, onPress }: { route: RouteCard; onPress: () => void }) {
  const { c } = useTheme();
  const enough = route.sowo_count >= 5 && route.sowo_score != null;
  const sub = route.sowo_approved ? '✓ Approved' : enough ? `${route.sowo_count} ratings` : route.sowo_count ? 'Not enough ratings yet' : 'No ratings yet';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`SOWO ${enough ? `${Math.round(route.sowo_score!)}%` : ''}. ${sub}. Shared experiences, not a safety guarantee.`}
      onPress={onPress}
      style={({ pressed }) => ({ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 52, borderRadius: radius.card, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln, opacity: pressed ? 0.8 : 1 })}
    >
      <View style={{ width: 26, height: 26, borderRadius: 999, backgroundColor: c.sf2, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.heavy, fontSize: 13, color: c.act }}>♀</Text>
      </View>
      <View style={{ minWidth: 0, flex: 1 }}>
        <Text numberOfLines={1} style={{ fontFamily: fonts.bold, fontSize: 14, color: c.tx }}>SOWO {enough ? `${Math.round(route.sowo_score!)}%` : '–'}</Text>
        <Text numberOfLines={1} style={{ fontFamily: fonts.regular, fontSize: 11, color: route.sowo_approved ? c.act : c.mu }}>{sub}</Text>
      </View>
    </Pressable>
  );
}

// ── Trip tunes popup (static data until Spotify connect, Phase 8) ─
export function TunesPopup({ tunes, ownerAvatarTone, visible, onClose }: { tunes: TripTunes; ownerAvatarTone: 1 | 2 | 3 | 4; visible: boolean; onClose: () => void }) {
  const { c } = useTheme();
  const more = (tunes.track_count ?? 0) - tunes.preview_tracks.length;
  return (
    <Popup visible={visible} onClose={onClose} label="Trip tunes">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <MonoLabel bold color="act">TRIP TUNES</MonoLabel>
        <CloseX onPress={onClose} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={{ width: 76, height: 76, borderRadius: 12, backgroundColor: c.ph1, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="music" size={22} color="act" strokeWidth={2} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Txt style={{ fontFamily: fonts.heavy, fontSize: 17, lineHeight: 21 }}>{tunes.title}</Txt>
          <Txt variant="small">{[tunes.kind === 'playlist' ? 'Playlist' : 'Song', tunes.track_count ? `${tunes.track_count} songs` : null, tunes.duration_text].filter(Boolean).join(' · ')}</Txt>
          <Txt variant="smallStrong" style={{ fontSize: 12 }}>● Spotify</Txt>
        </View>
      </View>
      {tunes.note ? (
        <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.cardSm, backgroundColor: c.sf2 }}>
          <View style={{ width: 24, height: 24, borderRadius: 999, backgroundColor: c[`ph${ownerAvatarTone}` as const] }} />
          <Txt style={{ flex: 1, fontSize: 14, lineHeight: 20, fontStyle: 'italic' }}>“{tunes.note}”</Txt>
        </View>
      ) : null}
      <View style={{ gap: 10 }}>
        {tunes.preview_tracks.map((t, i) => (
          <View key={t.title} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <MonoLabel style={{ width: 16 }}>{i + 1}</MonoLabel>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt numberOfLines={1} style={{ fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18 }}>{t.title}</Txt>
              <Txt variant="small" style={{ fontSize: 12 }}>{t.artist}</Txt>
            </View>
            <MonoLabel>{t.length}</MonoLabel>
          </View>
        ))}
      </View>
      {more > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Txt color="mu" style={{ width: 16, letterSpacing: 1 }}>···</Txt>
          <Txt variant="small">+ {more} more songs</Txt>
        </View>
      )}
      <Pressable
        accessibilityRole="link"
        onPress={() => Linking.openURL(tunes.spotify_url)}
        style={({ pressed }) => ({ height: 48, borderRadius: 999, backgroundColor: c.spotify, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}
      >
        <Text style={{ fontFamily: fonts.heavy, fontSize: 15, color: c.onSpotify }}>▶ Play on Spotify</Text>
      </Pressable>
    </Popup>
  );
}

// ── Moment viewer ─────────────────────────────────────────────────
export function MomentViewer({ routeId, moments, index, onIndex, onClose }: { routeId: string; moments: Moment[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const { c } = useTheme();
  const m = moments[index];
  if (!m) return null;
  const go = (d: number) => onIndex((index + d + moments.length) % moments.length);
  return (
    <Popup visible onClose={onClose} label="Moments">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt numberOfLines={1} style={{ fontFamily: fonts.bold, fontSize: 16 }}>{m.place_name}</Txt>
          <MonoLabel bold color="act">DAY {m.day_number}{m.local_time ? ` · ${clock(m.local_time)}` : ''}</MonoLabel>
        </View>
        <MonoLabel>{index + 1} / {moments.length}</MonoLabel>
        <CloseX onPress={onClose} />
      </View>
      <View style={{ height: 280, borderRadius: radius.card, overflow: 'hidden', backgroundColor: c[`ph${toneOf(m.id)}` as const], justifyContent: 'center' }}>
        {m.tag ? (
          <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: c.scrim, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 }}>
            <MonoLabel size={10} bold color="tx">{m.tag}</MonoLabel>
          </View>
        ) : null}
        {moments.length > 1 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 }}>
            {(['back', 'next'] as const).map((dir) => (
              <Pressable
                key={dir}
                accessibilityRole="button"
                accessibilityLabel={dir === 'back' ? 'Previous moment' : 'Next moment'}
                onPress={() => go(dir === 'back' ? -1 : 1)}
                style={{ width: 44, height: 44, borderRadius: 999, backgroundColor: c.scrim, alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name={dir} size={18} strokeWidth={2.4} />
              </Pressable>
            ))}
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        {moments.map((x, i) => (
          <View key={x.id} style={{ width: i === index ? 20 : 8, height: 8, borderRadius: 999, backgroundColor: i === index ? c.act : c.ln }} />
        ))}
      </View>
      {m.caption ? <Txt style={{ fontSize: 15, lineHeight: 21 }}>{m.caption}</Txt> : null}
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          onClose();
          router.push({ pathname: '/route/[id]/diary', params: { id: routeId, moment: m.id } });
        }}
        style={({ pressed }) => ({ height: 46, borderRadius: 999, borderWidth: 1, borderColor: c.ln, backgroundColor: c.bg, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}
      >
        <Icon name="diary" size={18} color="act" strokeWidth={2} />
        <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: c.tx }}>See it on the map diary</Text>
      </Pressable>
    </Popup>
  );
}

