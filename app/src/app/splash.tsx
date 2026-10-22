import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Globe, Txt, useToast } from '@/components';
import { signInWithProvider } from '@/lib/oauth';
import { useAuth } from '@/lib/auth';
import { fonts, radius, space, useTheme, type Colors } from '@/theme';

type Look = { bg: keyof Colors; fg: keyof Colors; border?: keyof Colors };

/** Splash — design/prototype/Splash.dc.html. */
export default function Splash() {
  const { c, scheme } = useTheme();
  const toast = useToast();
  const { width, height } = useWindowDimensions();
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null);

  // 340px globe on a 390-wide phone; smaller on short screens so the buttons fit.
  const globe = Math.min(340, width - 50, Math.max(220, height - 500));

  async function go(provider: 'apple' | 'google') {
    setBusy(provider);
    try {
      await signInWithProvider(provider);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      toast(
        /provider is not enabled|Unsupported provider/i.test(msg)
          ? `${provider === 'apple' ? 'Apple' : 'Google'} sign-in isn't switched on yet. Try email for now.`
          : 'Couldn’t sign in. Try again?',
      );
    } finally {
      setBusy(null);
    }
  }

  const { uid } = useAuth();
  if (uid) return <Redirect href="/" />;

  const btn = (label: string, look: Look, onPress: () => void, loading?: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: !!loading }}
      disabled={!!busy}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 48,
        borderRadius: radius.chip,
        backgroundColor: c[look.bg],
        borderWidth: look.border ? 1 : 0,
        borderColor: look.border ? c[look.border] : undefined,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed || loading ? 0.75 : 1,
      })}
    >
      <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: c[look.fg] }}>{loading ? 'Opening…' : label}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <View style={{ flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: space.gutter }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <Globe size={globe} />
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Txt style={{ fontFamily: fonts.heavy, fontSize: 36, lineHeight: 40 }} accessibilityRole="header">
              Sightquest
            </Txt>
            <Txt color="mu" style={{ fontSize: 16, lineHeight: 23, textAlign: 'center' }}>
              Find routes. Share yours.{'\n'}Get a little lost.
            </Txt>
          </View>
        </View>
        <View style={{ gap: 10, paddingBottom: 20 }}>
          {btn('Continue with Apple', { bg: 'tx', fg: 'bg' }, () => go('apple'), busy === 'apple')}
          {btn('Continue with Google', { bg: 'sf', fg: 'tx', border: 'ln' }, () => go('google'), busy === 'google')}
          {btn('Sign up with email', { bg: 'ac', fg: 'on' }, () => router.push('/email?mode=signup'))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Already exploring? Log in"
            onPress={() => router.push('/email?mode=login')}
            style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}
          >
            <Txt variant="small" style={{ fontSize: 14 }}>Already exploring?</Txt>
            <Txt color="act" style={{ fontFamily: fonts.bold, fontSize: 14 }}>Log in</Txt>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
