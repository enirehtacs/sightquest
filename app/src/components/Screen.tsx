import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { space, useTheme } from '@/theme';

type Props = {
  children: ReactNode;
  /** Wrap content in a ScrollView (default true). */
  scroll?: boolean;
  /** Leave room at the bottom for the floating BottomNav. */
  withNav?: boolean;
  /** Something pinned over the content, like the BottomNav. */
  overlay?: ReactNode;
  contentStyle?: ViewStyle;
};

/** Every screen sits in one of these: theme background, safe areas, 16px gutter. */
export function Screen({ children, scroll = true, withNav, overlay, contentStyle }: Props) {
  const { c, scheme } = useTheme();
  const pad: ViewStyle = {
    paddingHorizontal: space.gutter,
    paddingTop: space.md,
    paddingBottom: withNav ? 100 : space.xl,
    gap: space.lg,
  };
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {scroll ? (
        <ScrollView contentContainerStyle={[pad, contentStyle]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, pad, contentStyle]}>{children}</View>
      )}
      {overlay}
    </SafeAreaView>
  );
}
