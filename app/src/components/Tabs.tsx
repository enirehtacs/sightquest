import { Pressable, Text, View } from 'react-native';

import { fonts, useTheme } from '@/theme';

type Props<K extends string> = {
  tabs: { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
  /**
   * `underline`: Route tabs (Itinerary · Must-know · …).
   * `pill`: Profile tabs (Routes · Saved · Achievements).
   * `segment`: compact switch, e.g. Settings → Appearance.
   */
  variant?: 'underline' | 'pill' | 'segment';
  accessibilityLabel?: string;
};

export function Tabs<K extends string>({ tabs, value, onChange, variant = 'underline', accessibilityLabel }: Props<K>) {
  const { c } = useTheme();

  if (variant === 'underline') {
    return (
      <View
        accessibilityRole="tablist"
        accessibilityLabel={accessibilityLabel}
        style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: c.ln }}
      >
        {tabs.map((t) => {
          const on = t.key === value;
          return (
            <Pressable
              key={t.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(t.key)}
              style={{
                height: 44,
                justifyContent: 'center',
                borderBottomWidth: 2,
                borderBottomColor: on ? c.act : 'transparent',
                marginBottom: -1,
              }}
            >
              <Text style={{ fontFamily: on ? fonts.bold : fonts.semibold, fontSize: 14, color: on ? c.tx : c.mu }}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  const seg = variant === 'segment';
  return (
    <View
      accessibilityRole={seg ? 'radiogroup' : 'tablist'}
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: 'row',
        gap: 4,
        padding: 4,
        borderRadius: 999,
        backgroundColor: c.sf2,
        alignSelf: seg ? 'flex-start' : 'stretch',
      }}
    >
      {tabs.map((t) => {
        const on = t.key === value;
        return (
          <Pressable
            key={t.key}
            accessibilityRole={seg ? 'radio' : 'tab'}
            accessibilityState={seg ? { checked: on } : { selected: on }}
            onPress={() => onChange(t.key)}
            hitSlop={seg ? 4 : 0}
            style={{
              flex: seg ? undefined : 1,
              minHeight: seg ? 36 : 44,
              minWidth: 44,
              paddingHorizontal: 12,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? c.tx : 'transparent',
            }}
          >
            <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: on ? c.bg : c.mu }}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
