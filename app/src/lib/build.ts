import * as Crypto from 'expo-crypto';

import { enqueue, type DayRow, type LegRow, type MomentRow, type Op, type SpotRow } from './queue';
import { getRoute, type PostLink, type RouteDetail } from './routes';
import { supabase } from './supabase';

// Building routes (Phase 3). Creating a route needs signal; days, moments and
// pins go through the offline queue (lib/queue.ts).

export const newId = () => Crypto.randomUUID();

/** "Bac Ha loop, the scenic way" → "bac-ha-loop-the-scenic-way-x7k2" */
export function slugify(title: string) {
  const base = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);
  return `${base || 'route'}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Today's date where you are, "2026-10-24". */
export function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const deviceTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

export type NewRoute = {
  ownerId: string;
  title: string;
  live: boolean;
  startDate: string | null;
  endDate: string | null;
  blur: boolean;
  delay: boolean;
};

/** Make the route (private to start with). Returns its id. */
export async function createRoute(r: NewRoute) {
  const id = newId();
  const { error } = await supabase.from('routes').insert({
    id,
    owner_id: r.ownerId,
    title: r.title.trim(),
    slug: slugify(r.title),
    status: r.live ? 'live' : 'draft',
    visibility: 'private',
    live_delay: r.delay,
    blur_sleep: r.blur,
    timezone: deviceTimezone(),
    start_date: r.startDate,
    end_date: r.endDate,
  });
  if (error) throw error;
  return id;
}

export type RoutePatch = Partial<{
  title: string;
  status: 'draft' | 'live' | 'complete';
  visibility: 'private' | 'followers' | 'public';
  live_delay: boolean;
  blur_sleep: boolean;
  start_date: string | null;
  end_date: string | null;
  budget: number;
  effort: number;
  vibes: string[];
  terrain: string[];
  styles: string[];
  country_codes: string[];
  weather_note: string | null;
}>;

export async function updateRoute(id: string, patch: RoutePatch) {
  const { error } = await supabase.from('routes').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteRoute(id: string) {
  const { error } = await supabase.from('routes').delete().eq('id', id);
  if (error) throw error;
}

/** Builders only: exact dates and exact pins (everyone else gets blurred ones). */
export type RoutePrivate = { start_date: string | null; end_date: string | null; days: { id: string; date: string | null; lat: number | null; lng: number | null }[] };

export type BuildData = RouteDetail & {
  priv: RoutePrivate | null;
  /** The route row's own settings, which route_cards doesn't carry. */
  blur_sleep: boolean;
};

export async function getBuild(id: string): Promise<BuildData | null> {
  const [detail, priv, row] = await Promise.all([
    getRoute(id),
    supabase.rpc('route_private', { p_route: id }),
    supabase.from('routes').select('blur_sleep').eq('id', id).maybeSingle(),
  ]);
  if (!detail) return null;
  return {
    ...detail,
    priv: (priv.data as RoutePrivate | null) ?? null,
    blur_sleep: (row.data as { blur_sleep: boolean } | null)?.blur_sleep ?? true,
  };
}

// ── Through the offline queue ─────────────────────────────────────
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
const op = (o: DistributiveOmit<Op, 'id' | 'at'>) => ({ ...o, id: newId(), at: Date.now() }) as Op;

export function queueDay(day: DayRow, leg: Omit<LegRow, 'id' | 'day_id' | 'sort'> | null) {
  return enqueue(op({ kind: 'day', routeId: day.route_id, day, leg: leg ? { ...leg, id: newId(), day_id: day.id, sort: 0 } : null }));
}

export function queueMoment(moment: MomentRow, photos: { uri: string; base64?: string }[]) {
  return enqueue(op({ kind: 'moment', routeId: moment.route_id, moment, photos }));
}

export function queueSpot(spot: SpotRow) {
  return enqueue(op({ kind: 'spot', routeId: spot.route_id, spot }));
}

export function queueUpdate(routeId: string, table: 'days' | 'routes', rowId: string, patch: Record<string, unknown>) {
  return enqueue(op({ kind: 'update', routeId, table, rowId, patch }));
}

// ── Must-knows, trip tunes, posts (need signal) ───────────────────
export async function saveMustKnow(routeId: string, m: { id?: string; category: string; custom_label?: string | null; chips: string[]; note: string | null; sort: number }) {
  if (m.id) {
    const { error } = await supabase.from('must_knows').update({ chips: m.chips, note: m.note, custom_label: m.custom_label ?? null, sort: m.sort }).eq('id', m.id);
    if (error) throw error;
    return m.id;
  }
  const id = newId();
  const { error } = await supabase.from('must_knows').insert({ id, route_id: routeId, category: m.category, custom_label: m.custom_label ?? null, chips: m.chips, note: m.note, sort: m.sort });
  if (error) throw error;
  return id;
}

export async function deleteMustKnow(id: string) {
  const { error } = await supabase.from('must_knows').delete().eq('id', id);
  if (error) throw error;
}

export async function saveTunes(routeId: string, t: { title: string; spotify_url: string; note: string | null; kind: 'playlist' | 'track' }, exists: boolean) {
  const q = exists
    ? supabase.from('trip_tunes').update(t).eq('route_id', routeId)
    : supabase.from('trip_tunes').insert({ ...t, route_id: routeId });
  const { error } = await q;
  if (error) throw error;
}

/** Which platform a link is from, or null if it isn't one we support. */
export function postPlatform(url: string): PostLink['platform'] | null {
  const u = url.trim();
  if (!/^https:\/\//i.test(u)) return null;
  if (/^https:\/\/([a-z0-9-]+\.)*instagram\.com\//i.test(u)) return 'instagram';
  if (/^https:\/\/([a-z0-9-]+\.)*tiktok\.com\//i.test(u)) return 'tiktok';
  if (/^https:\/\/([a-z0-9-]+\.)*(youtube\.com|youtu\.be)\//i.test(u)) return 'youtube';
  return null;
}

export type { PostLink };

export async function addPost(routeId: string, uid: string, url: string, dayId: string | null, caption: string | null) {
  const platform = postPlatform(url);
  if (!platform) throw new Error('bad_link');
  const { error } = await supabase.from('post_links').insert({ id: newId(), route_id: routeId, day_id: dayId, platform, url: url.trim(), caption, created_by: uid });
  if (error) throw error;
}

export async function deletePost(id: string) {
  const { error } = await supabase.from('post_links').delete().eq('id', id);
  if (error) throw error;
}

// ── SOWO (private) ────────────────────────────────────────────────
export async function getSowoEligible(uid: string): Promise<boolean | null> {
  const { data } = await supabase.from('profile_private').select('sowo_eligible').eq('user_id', uid).maybeSingle();
  return (data as { sowo_eligible: boolean | null } | null)?.sowo_eligible ?? null;
}

export async function setSowoEligible(uid: string, value: boolean) {
  const now = new Date().toISOString();
  const { error } = await supabase.from('profile_private').insert({ user_id: uid, sowo_eligible: value, answered_at: now });
  if (!error) return;
  if (error.code !== '23505') throw error;
  const { error: e2 } = await supabase.from('profile_private').update({ sowo_eligible: value, answered_at: now }).eq('user_id', uid);
  if (e2) throw e2;
}

export type SowoAnswer = 'comfortable' | 'stay_alert' | 'wouldnt_solo' | 'didnt_solo';

export async function rateSowo(routeId: string, uid: string, answer: SowoAnswer) {
  const { error } = await supabase.from('sowo_ratings').insert({ route_id: routeId, user_id: uid, answer });
  if (!error) return;
  if (error.code !== '23505') throw error;
  const { error: e2 } = await supabase.from('sowo_ratings').update({ answer }).eq('route_id', routeId).eq('user_id', uid);
  if (e2) throw e2;
}
