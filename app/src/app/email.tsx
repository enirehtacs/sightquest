import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Card, Field, Icon, MonoLabel, Screen, Txt } from '@/components';
import { authRedirectUrl } from '@/lib/oauth';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { fonts } from '@/theme';

type Mode = 'signup' | 'login' | 'reset';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Sign up / log in with email and password. Not in the prototype (it links straight on). */
export default function EmailSignIn() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>(params.mode === 'login' ? 'login' : 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<null | 'confirm' | 'reset'>(null);

  const emailOk = EMAIL_RE.test(email.trim());
  const passwordOk = mode === 'reset' || password.length >= 8;

  async function submit() {
    setError(null);
    if (!emailOk) return setError('That email doesn’t look right.');
    if (!passwordOk) return setError('Use at least 8 characters for your password.');
    setBusy(true);
    try {
      const addr = email.trim().toLowerCase();
      if (mode === 'signup') {
        const { data, error: e } = await supabase.auth.signUp({
          email: addr,
          password,
          options: { emailRedirectTo: authRedirectUrl() },
        });
        if (e) throw e;
        // With "Confirm email" on, there's no session until they tap the link.
        if (!data.session) setSent('confirm');
        else router.replace('/');
      } else if (mode === 'login') {
        const { error: e } = await supabase.auth.signInWithPassword({ email: addr, password });
        if (e) throw e;
        router.replace('/');
      } else {
        const { error: e } = await supabase.auth.resetPasswordForEmail(addr, { redirectTo: `${authRedirectUrl()}?next=/settings/password` });
        if (e) throw e;
        setSent('reset');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (/invalid login credentials/i.test(msg)) setError('That email and password don’t match.');
      else if (/email not confirmed/i.test(msg)) setError('Check your inbox and tap the link to confirm your email first.');
      else if (/already registered/i.test(msg)) setError('There’s already an account with that email. Try logging in.');
      else if (/rate limit/i.test(msg)) setError('Too many tries. Wait a minute and try again.');
      else setError(msg || 'Something went wrong. Try again?');
    } finally {
      setBusy(false);
    }
  }

  const { uid } = useAuth();
  if (uid) return <Redirect href="/" />;

  const title = mode === 'signup' ? 'Sign up with email' : mode === 'login' ? 'Welcome back' : 'Reset your password';

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/splash'))}
          style={{ width: 44, height: 44, marginLeft: -12, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="back" size={22} strokeWidth={2.2} />
        </Pressable>
        <Txt variant="h1" style={{ fontSize: 22 }}>{title}</Txt>
      </View>

      {sent ? (
        <Card>
          <MonoLabel bold color="act">CHECK YOUR INBOX</MonoLabel>
          <Txt>
            {sent === 'confirm'
              ? `We sent a link to ${email.trim()}. Tap it on this device to finish signing up.`
              : `If there’s an account for ${email.trim()}, a reset link is on its way.`}
          </Txt>
          <Button label="Back to log in" variant="ghost" onPress={() => { setSent(null); setMode('login'); }} block />
        </Card>
      ) : (
        <>
          <Field
            label="EMAIL"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="you@example.com"
            returnKeyType="next"
          />
          {mode !== 'reset' && (
            <Field
              label="PASSWORD"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              textContentType={mode === 'signup' ? 'newPassword' : 'password'}
              hint={mode === 'signup' ? 'At least 8 characters.' : undefined}
              onSubmitEditing={submit}
              returnKeyType="go"
            />
          )}
          {error ? <Txt variant="small" color="danger" accessibilityLiveRegion="polite">{error}</Txt> : null}
          <Button
            label={mode === 'signup' ? 'Create account' : mode === 'login' ? 'Log in' : 'Send reset link'}
            onPress={submit}
            loading={busy}
            disabled={!email}
            block
          />
          <View style={{ alignItems: 'center', gap: 2 }}>
            {mode === 'login' && (
              <Pressable accessibilityRole="button" onPress={() => { setError(null); setMode('reset'); }} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Txt variant="small" style={{ fontSize: 14 }}>Forgot your password?</Txt>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => { setError(null); setMode(mode === 'signup' ? 'login' : 'signup'); }}
              style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Txt variant="small" style={{ fontSize: 14 }}>{mode === 'signup' ? 'Already exploring?' : 'New here?'}</Txt>
              <Txt color="act" style={{ fontFamily: fonts.bold, fontSize: 14 }}>{mode === 'signup' ? 'Log in' : 'Sign up'}</Txt>
            </Pressable>
          </View>
        </>
      )}
    </Screen>
  );
}
