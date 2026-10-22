import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Icon, MonoLabel, RouteThumb, Txt } from '@/components';
import { dots, metaLine, toneOf } from '@/lib/routeFormat';
import type { RouteCard } from '@/lib/routes';
import { fonts, radius, useTheme, type Colors } from '@/theme';

// Route cards, in the sizes the prototype uses (Main, Collection, Search, Me).

export const openRoute = (id: string) => router.push(`/route/${id}`);

function Chip({ text, color = 'tx' }: { text: string; color?: keyof Colors }) {
  const { c } = useTheme();
  return (
    <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: c.scrim, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, maxWidth: '75%' }}>
      <MonoLabel size={10} bold color={color} numberOfLines={1}>{text}</MonoLabel>
    </View>
  );
}

/** Recommended for you: 250 × 220, map on top, title panel at the bottom. */
export function BigRouteCard({ r, chip }: { r: RouteCard; chip: string }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${r.title}. ${r.reason ?? ''}`}
      onPress={() => openRoute(r.id)}
      style={({ pressed }) => ({ width: 250, height: 220, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: c.ln, opacity: pressed ? 0.85 : 1 })}
    >
      <RouteThumb line={r.line} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 72 }} inset={{ top: 40 }} />
      <Chip text={chip} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: c.sf, gap: 2 }}>
        <Text numberOfLines={1} style={{ fontFamily: fonts.bold, fontSize: 16, lineHeight: 20, color: c.tx }}>{r.title}</Text>
        <MonoLabel numberOfLines={1} style={{ textTransform: 'none' }}>{metaLine(r, { budget: false, creator: true })}</MonoLabel>
        {r.reason ? <Txt numberOfLines={1} color="act" style={{ fontSize: 12, lineHeight: 16 }}>{r.reason}</Txt> : null}
      </View>
    </Pressable>
  );
}

/** Best in {month} / Hidden gems rows: 160 wide, 110 map tile, title, meta. */
export function MiniRouteCard({ r, chip, chipColor }: { r: RouteCard; chip: string; chipColor?: keyof Colors }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${r.title}, ${metaLine(r, { month: false })}`}
      onPress={() => openRoute(r.id)}
      style={({ pressed }) => ({ width: 160, gap: 6, opacity: pressed ? 0.85 : 1 })}
    >
      <View style={{ height: 110, borderRadius: 18, overflow: 'hidden' }}>
        <RouteThumb line={r.line} style={{ flex: 1 }} inset={{ top: 34, left: 16, right: 16, bottom: 14 }} />
        <Chip text={chip} color={chipColor} />
      </View>
      <Txt numberOfLines={1} style={{ fontFamily: fonts.bold, fontSize: 14, lineHeight: 18 }}>{r.title}</Txt>
      <MonoLabel size={10} numberOfLines={1} style={{ marginTop: -4 }}>{metaLine(r, { month: false })}</MonoLabel>
    </Pressable>
  );
}

/** A list row: 44px tile, title, meta, effort dots (Easy wins, Recently viewed). */
export function RouteRow({ r, first, right, sub, icon }: { r: RouteCard; first?: boolean; right?: string; sub?: string; icon?: 'clock' }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${r.title}, ${sub ?? metaLine(r)}`}
      onPress={() => openRoute(r.id)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
        paddingVertical: 8,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: c.ln,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View style={{ width: 44, height: 44, borderRadius: 12, overflow: 'hidden', backgroundColor: c[`ph${toneOf(r.id)}` as const], alignItems: 'center', justifyContent: 'center' }}>
        {icon ? <Icon name={icon} size={18} color="mu" strokeWidth={2} /> : <RouteThumb line={r.line} style={{ width: 44, height: 44 }} inset={{ top: 8, right: 8, bottom: 8, left: 8 }} />}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt numberOfLines={1} style={{ fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 }}>{r.title}</Txt>
        {sub ? <Txt variant="small" numberOfLines={1}>{sub}</Txt> : <MonoLabel numberOfLines={1}>{metaLine(r, { days: true, anyTime: true })}</MonoLabel>}
      </View>
      <MonoLabel color={right ? 'mu' : 'act'}>{right ?? dots(r.effort)}</MonoLabel>
    </Pressable>
  );
}

/** Collection pages and Search: full width, 150 map, chip, bookmark, title + effort, meta. */
export function FeedRouteCard({
  r,
  chip,
  chipColor,
  saved,
  onSave,
  note,
}: {
  r: RouteCard;
  chip: string;
  chipColor?: keyof Colors;
  saved?: boolean;
  onSave?: () => void;
  note?: string;
}) {
  const { c } = useTheme();
  // The card and the bookmark are siblings: a button can't sit inside a button on the web.
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${r.title}, ${metaLine(r, { creator: true })}`}
        onPress={() => openRoute(r.id)}
        style={({ pressed }) => ({ gap: 8, opacity: pressed ? 0.88 : 1 })}
      >
        <View style={{ height: 150, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: c.ln }}>
          <RouteThumb line={r.line} style={{ flex: 1 }} inset={{ top: 44, right: 56 }} />
          <Chip text={chip} color={chipColor} />
          {note ? (
            <View style={{ position: 'absolute', left: 10, right: 10, bottom: 10, padding: 8, borderRadius: 14, backgroundColor: c.scrim }}>
              <Txt numberOfLines={1} style={{ fontSize: 13 }}>{note}</Txt>
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
          <Txt numberOfLines={1} style={{ flex: 1, fontFamily: fonts.bold, fontSize: 16, lineHeight: 20 }}>{r.title}</Txt>
          <MonoLabel color="act">{dots(r.effort)}</MonoLabel>
        </View>
        <MonoLabel numberOfLines={1} style={{ marginTop: -6, textTransform: 'none' }}>{metaLine(r, { creator: true, anyTime: true })}</MonoLabel>
      </Pressable>
      {onSave && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saved ? `Saved. Change where ${r.title} is saved` : `Save ${r.title}`}
          onPress={onSave}
          hitSlop={6}
          style={{ position: 'absolute', top: 8, right: 8, width: 38, height: 38, borderRadius: 999, backgroundColor: c.scrim, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="save" size={16} color={saved ? 'act' : 'tx'} filled={saved} strokeWidth={2} />
        </Pressable>
      )}
    </View>
  );
}

/** Section heading with an optional subtitle and "See all" (Main.dc.html). */
export function SectionHead({ title, sub, onSeeAll }: { title: string; sub?: string; onSeeAll?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Txt variant="h2" numberOfLines={1}>{title}</Txt>
        {sub ? <Txt variant="small" numberOfLines={1}>{sub}</Txt> : null}
      </View>
      {onSeeAll && (
        <Pressable accessibilityRole="link" onPress={onSeeAll} hitSlop={10}>
          <Txt color="act" style={{ fontFamily: fonts.semibold, fontSize: 14 }}>See all</Txt>
        </Pressable>
      )}
    </View>
  );
}

/** Rule 10: never a dead empty state. A friendly line and one action. */
export function Nudge({ text, action }: { text: string; action?: { label: string; onPress: () => void } }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 12, paddingVertical: 22, paddingHorizontal: 14, backgroundColor: c.sf, borderRadius: radius.card, borderWidth: 1, borderColor: c.ln }}>
      <Icon name="logo" size={30} color="act" strokeWidth={1.4} />
      <Txt color="mu" style={{ textAlign: 'center', maxWidth: 300 }}>{text}</Txt>
      {action && (
        <Pressable
          accessibilityRole="button"
          onPress={action.onPress}
          style={({ pressed }) => ({ height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: c.ac, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}
        >
          <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: c.on }}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}
