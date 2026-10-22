import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, useTheme } from '@/theme';
import { Icon } from './Icon';

type Show = (text: string) => void;
const ToastContext = createContext<Show>(() => {});

/** `const toast = useToast(); toast('Link copied')` */
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback<Show>((t) => {
    clearTimeout(timer.current);
    setText(t);
    timer.current = setTimeout(() => setText(null), 2400);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {text && <ToastPill text={text} />}
    </ToastContext.Provider>
  );
}

function ToastPill({ text }: { text: string }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [fade] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [fade, text]);
  return (
    // Sits above the floating BottomNav.
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 92, alignItems: 'center', zIndex: 100, elevation: 100 }}>
      <Animated.View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={{
          opacity: fade,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderRadius: 999,
          backgroundColor: c.tx,
        }}
      >
        <Icon name="check" size={16} color="bg" strokeWidth={2.6} />
        <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: c.bg }}>{text}</Text>
      </Animated.View>
    </View>
  );
}
