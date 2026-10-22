import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, space, useTheme } from '@/theme';
import { Txt } from './Txt';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

/** Bottom sheet: scrim behind, 22px top corners, slides up in 220ms. */
export function Sheet({ visible, onClose, title, children }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const [anim] = useState(() => new Animated.Value(0));

  // Mount as soon as it's asked to open; unmount after the close animation.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        Animated.timing(anim, {
          toValue: visible ? 1 : 0,
          duration: reduce ? 0 : 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished && !visible) setMounted(false);
        });
      });
    return () => {
      cancelled = true;
    };
  }, [visible, anim]);

  if (!mounted) return null;

  return (
    <Modal transparent visible onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={{ flex: 1, opacity: anim }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          style={{ flex: 1, backgroundColor: c.scrim }}
        />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          maxWidth: 520,
          width: '100%',
          alignSelf: 'center',
          backgroundColor: c.sf,
          borderTopLeftRadius: radius.sheet,
          borderTopRightRadius: radius.sheet,
          borderWidth: 1,
          borderBottomWidth: 0,
          borderColor: c.ln,
          paddingHorizontal: space.gutter,
          paddingTop: 10,
          paddingBottom: insets.bottom + space.xl,
          gap: space.md,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }) }],
        }}
      >
        <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 999, backgroundColor: c.ln }} />
        {title && <Txt variant="h2">{title}</Txt>}
        {children}
      </Animated.View>
    </Modal>
  );
}
