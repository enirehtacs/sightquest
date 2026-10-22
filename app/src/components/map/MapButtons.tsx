import { Pressable, View, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { useTheme, type Colors } from '@/theme';

type Btn = { icon: IconName; label: string; onPress: () => void; color?: keyof Colors };

/** The stack of 44px square buttons on a map: zoom in, zoom out, fit / locate. */
export function MapButtons({ buttons, style }: { buttons: Btn[]; style?: ViewStyle }) {
  const { c } = useTheme();
  return (
    <View style={[{ gap: 8 }, style]}>
      {buttons.map((b) => (
        <Pressable
          key={b.label}
          accessibilityRole="button"
          accessibilityLabel={b.label}
          onPress={b.onPress}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: c.ln,
            backgroundColor: c.scrim,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <Icon name={b.icon} size={20} color={b.color ?? 'tx'} strokeWidth={2.2} />
        </Pressable>
      ))}
    </View>
  );
}
