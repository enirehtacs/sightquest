import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Field, Icon, Screen, Txt, useToast } from '@/components';
import { supabase } from '@/lib/supabase';
import { fonts } from '@/theme';

/** Set a new password (also where a "Forgot your password?" link lands). */
export default function ChangePassword() {
  const toast = useToast();
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (pw.length < 8) return setError('Use at least 8 characters.');
    setBusy(true);
    const { error: e } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (e) return setError(e.message);
    toast('Password updated');
    router.replace('/settings');
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings'))} style={{ width: 44, height: 44, marginLeft: -12, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={22} strokeWidth={2.2} />
        </Pressable>
        <Txt accessibilityRole="header" style={{ fontFamily: fonts.heavy, fontSize: 22, lineHeight: 26 }}>New password</Txt>
      </View>
      <Field label="NEW PASSWORD" value={pw} onChangeText={setPw} secureTextEntry autoComplete="new-password" textContentType="newPassword" error={error} hint="At least 8 characters." onSubmitEditing={save} />
      <Button label="Save password" onPress={save} loading={busy} block />
    </Screen>
  );
}
