import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { palettes, type AppearancePref, type Colors, type Scheme } from './tokens';

const STORAGE_KEY = 'sq.appearance';

type ThemeValue = {
  /** What the user picked in Settings → Appearance. */
  preference: AppearancePref;
  setPreference: (p: AppearancePref) => void;
  /** The mode actually on screen. */
  scheme: Scheme;
  c: Colors;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPref] = useState<AppearancePref>('system');

  // Restore the saved choice. Phase 1 also syncs it with profiles.appearance.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setPref(v);
      })
      .catch(() => {});
  }, []);

  const scheme: Scheme =
    preference === 'system' ? (system === 'light' ? 'light' : 'dark') : preference;

  const value = useMemo<ThemeValue>(
    () => ({
      preference,
      setPreference: (p) => {
        setPref(p);
        AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
      },
      scheme,
      c: palettes[scheme],
    }),
    [preference, scheme],
  );

  // Keep the browser page behind the app in step with the theme.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.style.backgroundColor = value.c.bg;
    document.documentElement.style.colorScheme = scheme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', value.c.bg);
  }, [value.c.bg, scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Forces one mode for everything inside it. Used by /dev/components to show
 * light and dark side by side; the app itself never needs it.
 */
export function ThemeScope({ scheme, children }: { scheme: Scheme; children: ReactNode }) {
  const parent = useTheme();
  const value = useMemo(() => ({ ...parent, scheme, c: palettes[scheme] }), [parent, scheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const v = useContext(ThemeContext);
  if (!v) throw new Error('useTheme() must be used inside <ThemeProvider>');
  return v;
}
