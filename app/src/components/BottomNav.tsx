import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { Icon, type IconName } from './Icon';

export type NavKey = 'explore' | 'search' | 'create' | 'friends' | 'me';

const SIDE: { key: Exclude<NavKey, 'create'>; icon: IconName; label: string }[] = [
  { key: 'explore', icon: 'explore', label: 'Explore' },
  { key: 'search', icon: 'search', label: 'Search' },
  { key: 'friends', icon: 'friends', label: 'Friends' },
  { key: 'me', icon: 'me', label: 'My profile' },
];

type Props = {
  active?: NavKey;
  onNavigate: (key: NavKey) => void;
  /** Lay it out in normal flow instead of floating (used on the components page). */
  inline?: boolean;
};

/** Floating pill: Explore · Search · + · Friends · Me. */
export function BottomNav({ active, onNavigate, inline }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  const item = (s: (typeof SIDE)[number]) => {
    const on = s.key === active;
    return (
      <Pressable
        key={s.key}
        accessibilityRole="tab"
        accessibilityLabel={s.label}
        accessibilityState={{ selected: on }}
        onPress={() => onNavigate(s.key)}
        style={({ pressed }) => ({
          width: 48,
          height: 48,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Icon name={s.icon} color={on ? 'act' : 'mu'} strokeWidth={2} />
      </Pressable>
    );
  };

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel="Main"
      style={[
        {
          height: 60,
          borderRadius: 999,
          backgroundColor: c.sf,
          borderWidth: 1,
          borderColor: c.ln,
          flexDirection: 'row',
          justifyContent: 'space-evenly',
          alignItems: 'center',
          paddingHorizontal: 14,
        },
        inline
          ? { marginTop: 6 }
          : { position: 'absolute', left: 12, right: 12, bottom: insets.bottom + 12, maxWidth: 480, alignSelf: 'center' },
      ]}
    >
      {item(SIDE[0])}
      {item(SIDE[1])}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Build a route"
        onPress={() => onNavigate('create')}
        style={({ pressed }) => ({
          width: 66,
          height: 66,
          borderRadius: 999,
          backgroundColor: c.ac,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
          boxShadow: [{ offsetX: 0, offsetY: 6, blurRadius: 18, color: c.fabShadow }],
        })}
      >
        <Icon name="logo" size={34} color="on" strokeWidth={1.4} />
      </Pressable>
      {item(SIDE[2])}
      {item(SIDE[3])}
    </View>
  );
}
