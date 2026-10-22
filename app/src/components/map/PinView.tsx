import { Pressable, Text, View } from 'react-native';

import { fonts, useTheme } from '@/theme';

import type { MapPin } from './types';

/** How a pin looks (THEME.md → Maps). Used by the native and fallback maps; web draws the same in DOM. */
export function PinView({ pin }: { pin: MapPin }) {
  const { c } = useTheme();
  const body = (() => {
    switch (pin.kind) {
      case 'photo': {
        const d = pin.selected ? 34 : 28;
        return (
          <View style={{ width: d, height: d, borderRadius: 999, borderWidth: 2, borderColor: c.ac, backgroundColor: c[`ph${pin.tone ?? 1}` as const], boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 2, color: c.ring }] }}>
            {!!pin.count && pin.count > 1 && (
              <View style={{ position: 'absolute', top: -8, right: -8, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 999, backgroundColor: c.ac, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: fonts.heavy, fontSize: 11, color: c.on }}>{pin.count}</Text>
              </View>
            )}
          </View>
        );
      }
      case 'me':
        return (
          <View style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ position: 'absolute', width: 38, height: 38, borderRadius: 999, backgroundColor: c.info, opacity: 0.22 }} />
            <View style={{ width: 18, height: 18, borderRadius: 999, backgroundColor: c.info, borderWidth: 3, borderColor: c.sf }} />
          </View>
        );
      case 'route': {
        // The dot sits on the point; the label hangs to its right.
        const d = pin.selected ? 18 : 14;
        return (
          <View style={{ width: d, height: d, borderRadius: 999, backgroundColor: pin.selected ? c.ac : c.tx, borderWidth: 3, borderColor: c.ring }}>
            {pin.label ? (
              <Text
                numberOfLines={1}
                style={{ position: 'absolute', left: d + 2, top: -4, width: 150, fontFamily: fonts.bold, fontSize: 12, color: pin.selected ? c.act : c.tx, textShadowColor: c.bg, textShadowRadius: 3 }}
              >
                {pin.label}
              </Text>
            ) : null}
          </View>
        );
      }
      default: {
        const end = pin.kind === 'end';
        const d = end ? 14 : 10;
        return <View style={{ width: d, height: d, borderRadius: 999, backgroundColor: end ? c.rt : c.tx, borderWidth: 2, borderColor: c.ring }} />;
      }
    }
  })();
  if (!pin.onPress) return body;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={pin.accessibilityLabel ?? pin.label} onPress={pin.onPress} hitSlop={10}>
      {body}
    </Pressable>
  );
}
