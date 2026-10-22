import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, useTheme } from '@/theme';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** Surface with a 1px border. Light mode adds a very soft shadow. */
export function Card({ children, onPress, accessibilityLabel, style }: Props) {
  const { c } = useTheme();
  const base: ViewStyle = {
    backgroundColor: c.sf,
    borderColor: c.ln,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 14,
    gap: 10,
    boxShadow: [{ offsetX: 0, offsetY: 1, blurRadius: 3, color: c.shadow }],
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [base, pressed && { opacity: 0.8 }, style]}
    >
      {children}
    </Pressable>
  );
}
