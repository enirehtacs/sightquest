import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
} from '@expo-google-fonts/archivo';
import { JetBrainsMono_500Medium, JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';

import { ToastProvider } from '@/components';
import { AuthProvider, useAuth } from '@/lib/auth';
import { updateMyProfile } from '@/lib/profiles';
import { ThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppearanceSync />
          <ThemedStack />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function ThemedStack() {
  const { c } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />;
}

/**
 * Appearance follows the account across devices: when a profile loads, its
 * saved choice wins; when the choice changes here, it's saved to the profile.
 */
function AppearanceSync() {
  const { profile, uid, preview, setProfile } = useAuth();
  const { preference, setPreference } = useTheme();
  // Whose saved appearance we've already applied, so we only do it once per sign-in.
  const appliedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    if (appliedFor.current !== profile.id) {
      appliedFor.current = profile.id;
      if (profile.appearance !== preference) setPreference(profile.appearance);
      return;
    }
    if (!uid || preview || profile.appearance === preference) return;
    updateMyProfile(uid, { appearance: preference })
      .then(setProfile)
      .catch(() => {});
  }, [preference, profile, uid, preview, setPreference, setProfile]);

  return null;
}
