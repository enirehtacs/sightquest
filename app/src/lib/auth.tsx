import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { router } from 'expo-router';

import { PREVIEW_PROFILE } from '@/data/seed';
import { leavePreview, PREVIEW_REQUESTED } from './preview';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const preview = PREVIEW_REQUESTED;
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  // What we loaded, and for whom. Only shown while that person is signed in.
  const [loaded, setLoaded] = useState<{ uid: string; profile: MyProfile | null; pledged: boolean | null } | null>(null);

  const uid = session?.user.id ?? (preview ? 'preview' : null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setReady(true);
      // Came back from a "Forgot your password?" email: let them set a new one.
      if (event === 'PASSWORD_RECOVERY') setTimeout(() => router.replace('/settings/password'), 50);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  const fetchFor = useCallback(
    (id: string) =>
      Promise.all([getMyProfile(id), hasPledged(id)])
        .then(([p, pl]) => ({ uid: id, profile: p as MyProfile | null, pledged: pl as boolean | null }))
        .catch(() => ({ uid: id, profile: null, pledged: false })),
    [],
  );

  useEffect(() => {
    if (!userId) return;
    let live = true;
    fetchFor(userId).then((l) => live && setLoaded(l));
    return () => {
      live = false;
    };
  }, [userId, fetchFor]);

  const load = useCallback(async () => {
    if (userId) setLoaded(await fetchFor(userId));
  }, [userId, fetchFor]);

  const mine = userId && loaded?.uid === userId ? loaded : null;
  const profile = mine ? mine.profile : preview && !userId ? PREVIEW_PROFILE : null;
  const pledged = mine ? mine.pledged : preview && !userId ? true : null;

  const setProfile = useCallback(
    (p: MyProfile) => setLoaded((l) => (l && l.uid === p.id ? { ...l, profile: p } : l)),
    [],
  );
  const setPledged = useCallback(
    (v: boolean) => setLoaded((l) => (l ? { ...l, pledged: v } : l)),
    [],
  );

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
        if (preview) leavePreview();
        await supabase.auth.signOut();
      },
      preview: preview && !session,
    }),
    [ready, session, uid, profile, pledged, setProfile, setPledged, load, preview],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth() must be used inside <AuthProvider>');
  return v;
}
