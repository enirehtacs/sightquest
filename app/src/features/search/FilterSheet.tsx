import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip, Icon, MonoLabel, Toggle, Txt } from '@/components';
import { BUDGET_NAMES, CONTINENTS, EFFORT_HINTS, EFFORT_NAMES, LENGTHS, MODES, MONTHS, OFFBEAT, STYLES, TERRAIN, VIBES } from '@/lib/routeFormat';
import type { Filters } from '@/lib/routes';
import { fonts, radius, space, useTheme } from '@/theme';

// The Search filter sheet: design/prototype/Search.dc.html, SPEC section 3.

type ListKey = 'continents' | 'vibes' | 'terrain' | 'styles' | 'modes' | 'offbeat' | 'lengths';

/** How many options are on, in total and per quick chip. */
export function filterCounts(f: Filters) {
  const n = (k: ListKey) => f[k]?.length ?? 0;
  const per = {
    Continent: n('continents'),
    'SOWO approved': f.sowo ? 1 : 0,
    Effort: f.effort_max ? 1 : 0,
    Budget: f.budgets?.length ?? 0,
    When: f.month ? 1 : 0,
    'Travel length': n('lengths'),
    Vibe: n('vibes'),
    Terrain: n('terrain'),
    Style: n('styles'),
    'Getting around': n('modes'),
    'Off the map': n('offbeat'),
  };
  return { per, total: Object.values(per).reduce((a, b) => a + b, 0) };
}

export const QUICK = ['Continent', 'SOWO approved', 'Effort', 'Budget', 'When', 'Travel length', 'Vibe', 'Terrain', 'Style', 'Getting around', 'Off the map'] as const;

type Props = {
  visible: boolean;
  filters: Filters;
  onChange: (f: Filters) => void;
  onClose: () => void;
  /** How many routes match right now (null while counting). */
  count: number | null;
};

export function FilterSheet({ visible, filters: f, onChange, onClose, count }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [monthOpen, setMonthOpen] = useState(false);

  const toggle = (k: ListKey, v: string) => {
    const cur = f[k] ?? [];
    onChange({ ...f, [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  };
  const multi = (k: ListKey, opts: [string, string][] | string[]) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {opts.map((o) => {
        const [key, label] = typeof o === 'string' ? [o, o] : o;
        return <Chip key={key} label={label} selected={(f[k] ?? []).includes(key)} onPress={() => toggle(k, key)} />;
      })}
    </View>
  );

  const box = (on: boolean) => ({
    flex: 1,
    height: 46,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: on ? c.ac : c.ln,
    backgroundColor: on ? c.ac : c.sf,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  });

  const effort = f.effort_max ?? 0;

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: c.scrim }}>
        <View style={{ flex: 1, marginTop: insets.top + 40, maxWidth: 560, width: '100%', alignSelf: 'center', backgroundColor: c.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, borderColor: c.ln }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.gutter, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.ln }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={onClose} style={{ width: 44, height: 44, marginLeft: -12, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="close" size={22} strokeWidth={2.2} />
            </Pressable>
            <Txt accessibilityRole="header" style={{ fontFamily: fonts.heavy, fontSize: 17 }}>Filters</Txt>
            <Pressable accessibilityRole="button" onPress={() => onChange({})} hitSlop={10} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Txt color="act" style={{ fontFamily: fonts.semibold, fontSize: 14 }}>Reset</Txt>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: space.gutter, paddingBottom: 110, gap: 18 }}>
            <Section title="Continent">{multi('continents', CONTINENTS)}</Section>
            <Section title="What’s the vibe?">{multi('vibes', VIBES)}</Section>

            <Section title="How much effort?" right={effort ? `UP TO ${effort}/5` : 'ANY'}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable
                    key={n}
                    accessibilityRole="button"
                    accessibilityLabel={`Effort up to ${n}: ${EFFORT_NAMES[n - 1]}`}
                    accessibilityState={{ selected: n === effort }}
                    onPress={() => onChange({ ...f, effort_max: n === effort ? undefined : n })}
                    style={box(!!effort && n <= effort)}
                  >
                    <Text style={{ fontFamily: fonts.monoBold, fontSize: 16, color: effort && n <= effort ? c.on : c.tx }}>{n}</Text>
                  </Pressable>
                ))}
              </View>
              {effort ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Txt color="act" style={{ fontFamily: fonts.bold, fontSize: 16 }}>{EFFORT_NAMES[effort - 1]}</Txt>
                  <Txt color="mu" style={{ fontSize: 14 }}>{EFFORT_HINTS[effort - 1]}</Txt>
                </View>
              ) : null}
            </Section>

            <Section title="Terrain">{multi('terrain', TERRAIN)}</Section>
            <Section title="Style">{multi('styles', STYLES)}</Section>
            <Section title="Getting around">{multi('modes', MODES)}</Section>
            <Section title="How off the map">{multi('offbeat', OFFBEAT)}</Section>
            <Section title="Travel length" right="pick any">{multi('lengths', LENGTHS)}</Section>

            <Section title="When">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`When: ${f.month ? MONTHS[f.month - 1] : 'Any month'}`}
                accessibilityState={{ expanded: monthOpen }}
                onPress={() => setMonthOpen(!monthOpen)}
                style={{ height: 46, borderRadius: radius.card, borderWidth: 1, borderColor: c.ln, backgroundColor: c.sf, paddingLeft: 16, paddingRight: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Txt style={{ fontSize: 15 }}>{f.month ? MONTHS[f.month - 1] : 'Any month'}</Txt>
                <Icon name="chevronDown" size={18} color="mu" strokeWidth={2.2} />
              </Pressable>
              {monthOpen && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Chip label="Any month" selected={!f.month} onPress={() => { onChange({ ...f, month: undefined }); setMonthOpen(false); }} />
                  {MONTHS.map((m, i) => (
                    <Chip key={m} label={m.slice(0, 3)} selected={f.month === i + 1} onPress={() => { onChange({ ...f, month: i + 1 }); setMonthOpen(false); }} />
                  ))}
                </View>
              )}
              {f.month ? <Txt variant="small">Routes from people who went in {MONTHS[f.month - 1]} show first, so the weather matches.</Txt> : null}
            </Section>

            <Section title="Budget" right="rated by creators">
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {BUDGET_NAMES.map((name, i) => {
                  const on = (f.budgets ?? []).includes(i + 1);
                  return (
                    <Pressable
                      key={name}
                      accessibilityRole="button"
                      accessibilityLabel={name}
                      accessibilityState={{ selected: on }}
                      onPress={() => {
                        const cur = f.budgets ?? [];
                        onChange({ ...f, budgets: on ? cur.filter((x) => x !== i + 1) : [...cur, i + 1] });
                      }}
                      style={box(on)}
                    >
                      <Text style={{ fontFamily: fonts.monoBold, fontSize: 13, color: on ? c.on : c.tx }}>{'$'.repeat(i + 1)}</Text>
                      <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: on ? c.on : c.mu }}>{name.toUpperCase()}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Section>

            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: !!f.sowo }}
              onPress={() => onChange({ ...f, sowo: !f.sowo || undefined })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.card, backgroundColor: c.sf, borderWidth: 1, borderColor: c.ln }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Txt style={{ fontFamily: fonts.bold, fontSize: 16 }}>SOWO approved</Txt>
                <Txt variant="small">80% or more of solo women felt comfortable, from at least 5 ratings. Shared experiences, not a safety guarantee.</Txt>
              </View>
              <Toggle on={!!f.sowo} />
            </Pressable>
          </ScrollView>

          <View style={{ position: 'absolute', left: space.gutter, right: space.gutter, bottom: insets.bottom + 20 }}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => ({ height: 48, borderRadius: 999, backgroundColor: c.ac, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}
            >
              <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: c.on }}>
                {count === null ? 'Counting…' : count === 0 ? 'No routes match yet' : `Show ${count} ${count === 1 ? 'route' : 'routes'}`}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Section({ title, right, children }: { title: string; right?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Txt style={{ fontFamily: fonts.bold, fontSize: 16 }}>{title}</Txt>
        {right ? (right === right.toUpperCase() ? <MonoLabel bold>{right}</MonoLabel> : <Txt variant="small">{right}</Txt>) : null}
      </View>
      {children}
    </View>
  );
}
