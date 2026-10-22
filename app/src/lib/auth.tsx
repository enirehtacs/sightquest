import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { PREVIEW_PROFILE } from '@/data/seed';
import { getMyProfile, hasPledged, type MyProfile } from './profiles';
import { supabase } from './supabase';

type AuthValue = {
  /** False until we know whether someone is signed in. */
  ready: boolean;
  session: Session | null;
  /** The signed-in user's id (or "preview" in dev preview mode). */
  uid: string | null;
  profile: MyProfile | null;
  setProfile: (p: MyProfile) => void;
  /** Has this account taken the pledge? null while unknown. */
  pledged: boolean | null;
  setPledged: (v: boolean) => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Dev only: look at signed-in screens in a local browser without an
   * account (open http://localhost:8081/?preview). Nothing is saved.
   */
  preview: boolean;
};

const AuthContext = createContext<AuthValue | null>(null);

const PREVIEW_KEY = 'sq.preview';

function detectPreview(): boolean {
  if (!__DEV__ || Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const host = window.location.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') return false;
  try {
    if (/[?&]preview\b/.test(window.location.search)) window.sessionStorage.setItem(PREVIEW_KEY, '1');
    return window.sessionStorage.getItem(PREVIEW_KEY) === '1';
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [preview] = useState(detectPreview);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<MyProfile | null>(preview ? PREVIEW_PROFILE : null);
  const [pledged, setPledged] = useState<boolean | null>(preview ? true : null);

  const uid = session?.user.id ?? (preview ? 'preview' : null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  const load = useCallback(async () => {
    if (!userId) return;
    const [p, pl] = await Promise.all([getMyProfile(userId), hasPledged(userId)]);
    setProfile(p);
    setPledged(pl);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      if (!preview) {
        setProfile(null);
        setPledged(null);
      }
      return;
    }
    setPledged(null);
    load().catch(() => setPledged(false));
  }, [userId, load, preview]);

  const value = useMemo<AuthValue>(
    () => ({
      ready,
      session,
      uid,
      profile,
      setProfile,
      pledged,
      setPledged,
      refreshProfile: load,
      signOut: async () => {
        if (preview) {
          try {
            window.sessionStorage.removeItem(PREVIEW_KEY);
          } catch {}
        }
        await supabase.auth.signOut();
      },
      preview: preview && !session,
    }),
    [ready, session, uid, profile, pledged, load, preview],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth() must be used inside <AuthProvider>');
  return v;
}
