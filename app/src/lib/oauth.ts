import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

/**
 * Where Supabase sends people back after Apple, Google or an email link.
 * Web: https://<site>/auth/callback. Expo Go: exp://…/--/auth/callback.
 * Store builds: sightquest://auth/callback. All of these must be listed in
 * Supabase → Authentication → URL Configuration → Redirect URLs.
 */
export function authRedirectUrl() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.origin}/auth/callback`;
  return Linking.createURL('auth/callback');
}

/** Swap the one-time code in a callback URL for a session. */
export async function finishSignIn(url: string) {
  const parsed = new URL(url);
  const err = parsed.searchParams.get('error_description');
  if (err) throw new Error(err);
  const code = parsed.searchParams.get('code');
  if (!code) return false;
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
  return true;
}

/** Is this provider switched on in Supabase? (Public endpoint; no secrets.) */
async function providerEnabled(provider: 'apple' | 'google') {
  try {
    const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '' },
    });
    const json = (await res.json()) as { external?: Record<string, boolean> };
    return json.external?.[provider] !== false;
  } catch {
    return true; // Can't tell: let Supabase answer.
  }
}

export async function signInWithProvider(provider: 'apple' | 'google') {
  const redirectTo = authRedirectUrl();
  if (!(await providerEnabled(provider))) throw new Error('provider is not enabled');

  if (Platform.OS === 'web') {
    // The browser leaves for Apple/Google and comes back to /auth/callback.
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) throw error;
    return;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'success') await finishSignIn(result.url);
}
