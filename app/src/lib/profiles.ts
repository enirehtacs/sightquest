import { supabase } from './supabase';

// Shapes of the rows Phase 1 reads (see supabase/migrations).

export const LINK_KEYS = ['tiktok', 'instagram', 'youtube', 'alltrails', 'strava'] as const;
export type LinkKey = (typeof LINK_KEYS)[number];
export type Links = Partial<Record<LinkKey, string>>;

export const LINK_LABEL: Record<LinkKey, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  alltrails: 'AllTrails',
  strava: 'Strava',
};

/** The owner's own row: everything, including privacy settings. */
export type MyProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  home_base: string | null;
  home_country: string | null;
  links: Links;
  username_changed_at: string | null;
  appearance: 'system' | 'light' | 'dark';
  distance_unit: 'km' | 'mi';
  live_default: 'private' | 'followers' | 'public';
  live_delay: boolean;
  blur_sleep: boolean;
  hide_home_city: boolean;
};

/** What anyone signed in can see (public_profiles view). */
export type PublicProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  home_base: string | null;
  home_country: string | null;
  links: Links;
  follower_count: number;
  following_count: number;
};

export type ProfilePatch = Partial<
  Omit<MyProfile, 'id' | 'username_changed_at'>
>;

/** Only keys we know, only non-empty values: what shows on a profile. */
export function addedLinks(links: Links | null | undefined): [LinkKey, string][] {
  return LINK_KEYS.filter((k) => !!links?.[k]?.trim()).map((k) => [k, links![k]!.trim()]);
}

/** Turn what someone typed (a handle or a full link) into a link that opens. */
export function linkUrl(key: LinkKey, value: string): string {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  const h = v.replace(/^@/, '');
  switch (key) {
    case 'tiktok':
      return `https://www.tiktok.com/@${h}`;
    case 'instagram':
      return `https://www.instagram.com/${h}`;
    case 'youtube':
      return `https://www.youtube.com/@${h}`;
    case 'alltrails':
      return `https://www.alltrails.com/members/${h}`;
    case 'strava':
      return `https://www.strava.com/athletes/${h}`;
  }
}

/** "@vivi.wanders · SINGAPORE": city, or country only when the city is hidden. */
export function placeLine(p: { home_base: string | null; home_country: string | null; hide_home_city?: boolean }) {
  const city = p.hide_home_city ? null : p.home_base;
  return (city || p.home_country || '').trim();
}

/** Public link to a profile (the web app). */
export const PROFILE_URL = 'https://sightquest-app.vercel.app/u/';

export const USERNAME_RE = /^[a-z0-9._]{3,20}$/;
export const CHANGE_EVERY_DAYS = 30;

/** When the owner may next change their username, or null if they can now. */
export function nextUsernameChange(changedAt: string | null): Date | null {
  if (!changedAt) return null;
  const next = new Date(new Date(changedAt).getTime() + CHANGE_EVERY_DAYS * 86400000);
  return next > new Date() ? next : null;
}

export function formatDate(d: Date) {
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export type UsernameStatus = 'ok' | 'invalid' | 'taken' | 'reserved';

export async function usernameStatus(handle: string): Promise<UsernameStatus> {
  const { data, error } = await supabase.rpc('username_status', { p_handle: handle });
  if (error) throw error;
  return data as UsernameStatus;
}

/** Turn a database refusal into words for the Edit profile screen. */
export function usernameError(message: string): string | null {
  if (message.includes('username_too_soon')) return message.replace(/^.*username_too_soon:\s*/, '');
  if (message.includes('username_reserved')) return 'That username is reserved for now. Try another.';
  if (message.includes('profiles_username_key')) return 'Someone already has that username.';
  if (message.includes('profiles_username_check')) return 'Use 3–20 characters: a–z, 0–9, dots and underscores.';
  return null;
}

export async function getMyProfile(uid: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single();
  if (error) throw error;
  return data as MyProfile;
}

export async function updateMyProfile(uid: string, patch: ProfilePatch) {
  const { data, error } = await supabase.from('profiles').update(patch).eq('id', uid).select('*').single();
  if (error) throw error;
  return data as MyProfile;
}

export async function getPublicProfile(username: string) {
  const { data, error } = await supabase
    .from('public_profiles')
    .select('*')
    .eq('username', username.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data as PublicProfile | null;
}

export async function listCreators(excludeId: string, limit = 6) {
  const { data, error } = await supabase
    .from('public_profiles')
    .select('*')
    .neq('id', excludeId)
    .order('follower_count', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as PublicProfile[];
}

// ── Pledge ────────────────────────────────────────────────────────
export const PLEDGE_VERSION = 1;

export async function hasPledged(uid: string) {
  const { count, error } = await supabase
    .from('pledges')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', uid);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function takePledge(uid: string) {
  const { error } = await supabase
    .from('pledges')
    .upsert({ user_id: uid, version: PLEDGE_VERSION }, { onConflict: 'user_id,version', ignoreDuplicates: true });
  if (error) throw error;
}

// ── Follows ───────────────────────────────────────────────────────
export async function getFollow(me: string, them: string) {
  const { data, error } = await supabase
    .from('follows')
    .select('notify')
    .eq('follower_id', me)
    .eq('followee_id', them)
    .maybeSingle();
  if (error) throw error;
  return data ? { following: true, notify: data.notify as boolean } : { following: false, notify: false };
}

export async function myFollowingIds(me: string) {
  const { data, error } = await supabase.from('follows').select('followee_id').eq('follower_id', me);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.followee_id as string));
}

export async function follow(me: string, them: string) {
  const { error } = await supabase.from('follows').insert({ follower_id: me, followee_id: them });
  if (error && error.code !== '23505') throw error;
}

export async function unfollow(me: string, them: string) {
  const { error } = await supabase.from('follows').delete().eq('follower_id', me).eq('followee_id', them);
  if (error) throw error;
}

export async function setNotify(me: string, them: string, notify: boolean) {
  const { error } = await supabase
    .from('follows')
    .update({ notify })
    .eq('follower_id', me)
    .eq('followee_id', them);
  if (error) throw error;
}

// ── Blocks ────────────────────────────────────────────────────────
export type BlockedAccount = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  blocked_at: string;
};

export async function block(me: string, them: string) {
  const { error } = await supabase.from('blocks').insert({ blocker_id: me, blocked_id: them });
  if (error && error.code !== '23505') throw error;
}

export async function unblock(me: string, them: string) {
  const { error } = await supabase.from('blocks').delete().eq('blocker_id', me).eq('blocked_id', them);
  if (error) throw error;
}

export async function myBlockedAccounts() {
  const { data, error } = await supabase.rpc('my_blocked_accounts');
  if (error) throw error;
  return (data ?? []) as BlockedAccount[];
}

// ── Avatar upload ─────────────────────────────────────────────────
function base64ToBytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Upload an already-compressed JPEG (base64) and return its public URL. */
export async function uploadAvatar(uid: string, jpegBase64: string) {
  const path = `${uid}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, base64ToBytes(jpegBase64), { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}
