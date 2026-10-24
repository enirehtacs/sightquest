import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, MonoLabel, Txt, useToast } from '@/components';
import { useAuth } from '@/lib/auth';
import { setSowoEligible } from '@/lib/build';
import { fonts, radius, useTheme } from '@/theme';

// The optional, private SOWO question (ROADMAP decision 1: asked during
// sign-up). Saved in profile_private, never shown anywhere, only used to
// decide who can rate a route's SOWO score. Changeable in Settings → Privacy.
export default function AboutYou() {
  const { c } = useTheme();
  const { uid, preview } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState<boolean | null>(null);

  const next = () => router.replace('/onboarding/location');

  async function answer(woman: boolean) {
    if (!uid || preview) return next();
    setBusy(woman);
    try {
      await setSowoEligible(uid, woman);
    } catch {
      toast('Couldn’t save that. You can set it later in Settings › Privacy.');
    }
    next();
  }

  const option = (woman: boolean, label: string, sub: string) => (
    <Pressable
      accessibilityRole="button"
      onPress={() => answer(woman)}
      disabled={busy !== null}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.card, borderWidth: 1, borderColor: busy === woman ? c.act : c.ln, backgroundColor: c.sf, opacity: pressed ? 0.8 : 1 })}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Txt style={{ fontFamily: fonts.bold, fontSize: 16 }}>{label}</Txt>
        <Txt variant="small">{sub}</Txt>
      </View>
      <Icon name="next" size={18} color="mu" strokeWidth={2.2} />
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 24 }}>
        <View style={{ flex: 1, justifyContent: 'center', gap: 22 }}>
          <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: c.sf2 }}>
            <Icon name="lock" size={14} color="act" strokeWidth={2} />
            <MonoLabel bold color="act">PRIVATE · OPTIONAL</MonoLabel>
          </View>
          <View style={{ gap: 12 }}>
            <Txt accessibilityRole="header" style={{ fontFamily: fonts.heavy, fontSize: 26, lineHeight: 30 }}>One private question</Txt>
            <Txt color="mu" style={{ fontSize: 15, lineHeight: 22 }}>
              Women who travel solo rate how a route felt, so other women can plan with real experiences. That’s the SOWO score.
            </Txt>
            <Txt color="mu" style={{ fontSize: 15, lineHeight: 22 }}>
              Your answer never shows on your profile or anywhere else. It only decides whether we ask you that question when you finish a route.
            </Txt>
          </View>
          <View style={{ gap: 10 }}>
            {option(true, 'I’m a woman', 'Ask me when I finish a route')}
            {option(false, 'I’m not', 'Don’t ask me')}
          </View>
        </View>
        <View style={{ gap: 6, paddingBottom: 24, paddingTop: 12 }}>
          <Pressable accessibilityRole="button" onPress={next} style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: c.mu }}>Rather not say</Text>
          </Pressable>
          <Txt variant="small" style={{ fontSize: 12, textAlign: 'center' }}>Change this any time in Settings › Privacy & safety</Txt>
        </View>
      </View>
    </SafeAreaView>
  );
}
