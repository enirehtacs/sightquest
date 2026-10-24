import { previewSnapshot } from './preview';
import { supabase } from './supabase';

// Reading routes (Phase 2). Shapes match supabase/migrations/…_phase2_routes.sql.
// Every read goes through the visibility rule in the database; nothing here
// decides who can see what.

export type LngLat = [number, number];
export type SaveList = 'next_trip' | 'someday';

/** One row of the route_cards view: what lists, cards and pins show. */
export type RouteCard = {
  id: string;
  slug: string;
  title: string;
  owner_id: string;
  owner_username: string | null;
  owner_name: string | null;
  owner_avatar: string | null;
  status: 'draft' | 'live' | 'complete';
  visibility: 'private' | 'followers' | 'public';
  live_delay: boolean;
  went_month: number | null;
  went_year: number | null;
  country_codes: string[];
  country_names: string[];
  continent: string | null;
  budget: number | null;
  effort: number | null;
  vibes: string[];
  terrain: string[];
  styles: string[];
  modes: string[];
  offbeat: 'comfortable' | 'off_the_map' | 'few_have_been' | null;
  best_months: number[];
  weather_note: string | null;
  season_note: string | null;
  cover_url: string | null;
  save_count: number;
  view_count: number;
  steal_count: number;
  distance_km: number | null;
  sowo_score: number | null;
  sowo_count: number;
  sowo_approved: boolean;
  day_count: number;
  from_name: string | null;
  to_name: string | null;
  start_lat: number | null;
  start_lng: number | null;
  /** The route drawn through its days, [[lng, lat], …]. */
  line: LngLat[];
  created_at: string;
  updated_at: string;
  /** Recommended for you: why ("Like Ha Giang, the long way"). */
  reason?: string;
  /** Search and Easy wins: km from where you are. */
  distance_from_km?: number | null;
  /** Building now: who you're building with. */
  partner?: { id: string; username: string; avatar_url: string | null } | null;
};

export type Leg = {
  id: string;
  sort: number;
  mode: string;
  from_name: string | null;
  to_name: string | null;
  duration_text: string | null;
  note: string | null;
};

export type Day = {
  id: string;
  day_number: number;
  place_name: string;
  lat: number | null;
  lng: number | null;
  weather: string | null;
  note: string | null;
  legs: Leg[];
};

export type Moment = {
  id: string;
  day_id: string;
  caption: string | null;
  tag: string | null;
  local_time: string | null;
  lat: number | null;
  lng: number | null;
  starred: boolean;
  photo_paths: string[];
  /** Filled in here from the day, for labels. */
  day_number: number;
  place_name: string;
};

export type Spot = {
  id: string;
  day_id: string | null;
  sort: number;
  name: string;
  kind: string;
  why: string | null;
  where_name: string | null;
  lat: number | null;
  lng: number | null;
};

export type MustKnow = {
  id: string;
  category: string;
  custom_label: string | null;
  chips: string[];
  note: string | null;
  sort: number;
};

export type TripTunes = {
  title: string;
  kind: 'playlist' | 'track';
  spotify_url: string;
  track_count: number | null;
  duration_text: string | null;
  note: string | null;
  preview_tracks: { title: string; artist: string; length: string }[];
};

export type PostLink = { id: string; day_id: string | null; platform: 'instagram' | 'tiktok' | 'youtube'; url: string; caption: string | null };

export type Builder = { user_id: string; role: 'owner' | 'co'; username: string | null; avatar_url: string | null };

export type RouteDetail = {
  card: RouteCard;
  days: Day[];
  moments: Moment[];
  spots: Spot[];
  mustKnows: MustKnow[];
  tunes: TripTunes | null;
  builders: Builder[];
  posts: PostLink[];
};

const DAY_COLS = 'id, day_number, place_name, lat, lng, weather, note, legs(id, sort, mode, from_name, to_name, duration_text, note)';
const MOMENT_COLS = 'id, day_id, caption, tag, local_time, lat, lng, starred, photo_paths';

function must<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

// ── One route ─────────────────────────────────────────────────────
/** Everything the Route screen shows, or null if you can't see it. */
export async function getRoute(id: string): Promise<RouteDetail | null> {
  const snap = await previewSnapshot();
  if (snap) return snap.routes[id] ? { ...snap.routes[id], posts: snap.routes[id].posts ?? [] } : null;

  const [card, days, moments, spots, mustKnows, tunes, builders, posts] = await Promise.all([
    supabase.from('route_cards').select('*').eq('id', id).maybeSingle(),
    supabase.from('days').select(DAY_COLS).eq('route_id', id).order('day_number'),
    supabase.from('moments').select(MOMENT_COLS).eq('route_id', id),
    supabase.from('spots').select('*').eq('route_id', id).order('sort'),
    supabase.from('must_knows').select('*').eq('route_id', id).order('sort'),
    supabase.from('trip_tunes').select('*').eq('route_id', id).maybeSingle(),
    supabase.from('route_builders').select('user_id, role').eq('route_id', id).eq('status', 'accepted'),
    supabase.from('post_links').select('id, day_id, platform, url, caption').eq('route_id', id).order('created_at'),
  ]);
  const c = must(card) as RouteCard | null;
  if (!c) return null;
  const dayRows = (must(days) as Day[]).map((d) => ({ ...d, legs: [...(d.legs ?? [])].sort((a, b) => a.sort - b.sort) }));
  const byDay = new Map(dayRows.map((d) => [d.id, d]));
  const momentRows = (must(moments) as Omit<Moment, 'day_number' | 'place_name'>[])
    .filter((m) => byDay.has(m.day_id))
    .map((m) => ({ ...m, day_number: byDay.get(m.day_id)!.day_number, place_name: byDay.get(m.day_id)!.place_name }))
    .sort((a, b) => a.day_number - b.day_number || (a.local_time ?? '').localeCompare(b.local_time ?? ''));
  const b = must(builders) as { user_id: string; role: 'owner' | 'co' }[];
  const { data: people } = b.length
    ? await supabase.from('public_profiles').select('id, username, avatar_url').in('id', b.map((x) => x.user_id))
    : { data: [] };
  return {
    card: c,
    days: dayRows,
    moments: momentRows,
    spots: must(spots) as Spot[],
    mustKnows: must(mustKnows) as MustKnow[],
    tunes: (must(tunes) as TripTunes | null) ?? null,
    builders: b.map((x) => {
      const p = (people ?? []).find((q) => q.id === x.user_id);
      return { ...x, username: p?.username ?? null, avatar_url: p?.avatar_url ?? null };
    }),
    posts: (posts.data ?? []) as PostLink[],
  };
}

/** Opened a route: Recently viewed, and the creator's view count. */
export async function recordView(id: string) {
  if (await previewSnapshot()) return;
  await supabase.rpc('record_route_view', { p_route: id });
}

// ── Explore ───────────────────────────────────────────────────────
export async function recommended(limit = 8): Promise<RouteCard[]> {
  const snap = await previewSnapshot();
  if (snap) return snap.recommended;
  return must(await supabase.rpc('explore_recommended', { p_limit: limit })) as RouteCard[];
}

export async function easyWins(near: { lat: number; lng: number } | null, limit = 4): Promise<RouteCard[]> {
  const snap = await previewSnapshot();
  if (snap) return snap.easyWins;
  return must(await supabase.rpc('explore_easy_wins', { p_lat: near?.lat ?? null, p_lng: near?.lng ?? null, p_limit: limit })) as RouteCard[];
}

export async function bestIn(month: number, terrain: string | null = null, limit = 20): Promise<RouteCard[]> {
  const snap = await previewSnapshot();
  if (snap) return snap.bestIn.routes.filter((r) => r.best_months.includes(month) && (!terrain || r.terrain.includes(terrain)));
  return must(await supabase.rpc('explore_best_in', { p_month: month, p_terrain: terrain, p_limit: limit })) as RouteCard[];
}

export async function hiddenGems(offbeat: string | null = null, limit = 20): Promise<RouteCard[]> {
  const snap = await previewSnapshot();
  if (snap) return snap.gems.filter((r) => !offbeat || r.offbeat === offbeat);
  return must(await supabase.rpc('explore_hidden_gems', { p_offbeat: offbeat, p_limit: limit })) as RouteCard[];
}

export async function buildingNow(): Promise<RouteCard[]> {
  const snap = await previewSnapshot();
  if (snap) return snap.buildingNow;
  return must(await supabase.rpc('building_now')) as RouteCard[];
}

// ── Profiles ──────────────────────────────────────────────────────
/** Routes someone owns or co-built (only the ones you're allowed to see). */
export async function profileRoutes(userId: string): Promise<RouteCard[]> {
  const snap = await previewSnapshot();
  if (snap) return userId === 'preview' ? snap.mine : snap.byOwner[userId] ?? [];
  return must(await supabase.rpc('profile_routes', { p_user: userId })) as RouteCard[];
}

// ── Saves ─────────────────────────────────────────────────────────
export type SavedRoute = RouteCard & { list: SaveList };

export async function mySaves(uid: string): Promise<SavedRoute[]> {
  const snap = await previewSnapshot();
  const saves = snap
    ? snap.saves
    : (must(await supabase.from('saves').select('route_id, list').eq('user_id', uid).order('created_at', { ascending: false })) as {
        route_id: string;
        list: SaveList;
      }[]);
  if (!saves.length) return [];
  const cards = snap
    ? snap.all
    : (must(await supabase.from('route_cards').select('*').in('id', saves.map((s) => s.route_id))) as RouteCard[]);
  return saves.flatMap((s) => {
    const c = cards.find((x) => x.id === s.route_id);
    return c ? [{ ...c, list: s.list }] : [];
  });
}

/** route id → list, for showing filled bookmarks. */
export async function mySaveMap(uid: string): Promise<Map<string, SaveList>> {
  const snap = await previewSnapshot();
  const rows = snap
    ? snap.saves
    : (must(await supabase.from('saves').select('route_id, list').eq('user_id', uid)) as { route_id: string; list: SaveList }[]);
  return new Map(rows.map((r) => [r.route_id, r.list]));
}

/** Save a route, or move it to the other list if it's already saved. */
export async function saveRoute(uid: string, routeId: string, list: SaveList) {
  // Not an upsert: saves only lets you change `list`, and an upsert rewrites every column.
  const { error } = await supabase.from('saves').insert({ user_id: uid, route_id: routeId, list });
  if (!error) return;
  if (error.code !== '23505') throw error;
  const { error: moveError } = await supabase.from('saves').update({ list }).eq('user_id', uid).eq('route_id', routeId);
  if (moveError) throw moveError;
}

export async function unsaveRoute(uid: string, routeId: string) {
  const { error } = await supabase.from('saves').delete().eq('user_id', uid).eq('route_id', routeId);
  if (error) throw error;
}

// ── Search ────────────────────────────────────────────────────────
export type Filters = {
  continents?: string[];
  vibes?: string[];
  terrain?: string[];
  styles?: string[];
  modes?: string[];
  offbeat?: string[];
  budgets?: number[];
  lengths?: string[];
  effort_max?: number;
  month?: number;
  sowo?: boolean;
};

export async function searchRoutes(
  q: string,
  filters: Filters,
  near: { lat: number; lng: number; radiusKm?: number } | null = null,
  limit = 60,
): Promise<RouteCard[]> {
  const snap = await previewSnapshot();
  if (snap) return previewSearch(snap.all, q, filters, near);
  return must(
    await supabase.rpc('search_routes', {
      p_q: q,
      p_filters: filters,
      p_lat: near?.lat ?? null,
      p_lng: near?.lng ?? null,
      p_radius_km: near?.radiusKm ?? null,
      p_limit: limit,
    }),
  ) as RouteCard[];
}

export async function recentlyViewed(uid: string, limit = 5): Promise<RouteCard[]> {
  const snap = await previewSnapshot();
  if (snap) return snap.all.slice(0, 3);
  const views = must(
    await supabase.from('route_views').select('route_id').eq('user_id', uid).order('viewed_at', { ascending: false }).limit(limit),
  ) as { route_id: string }[];
  if (!views.length) return [];
  const cards = must(await supabase.from('route_cards').select('*').in('id', views.map((v) => v.route_id))) as RouteCard[];
  return views.flatMap((v) => cards.filter((c) => c.id === v.route_id));
}

export async function clearRecentlyViewed(uid: string) {
  if (await previewSnapshot()) return;
  const { error } = await supabase.from('route_views').delete().eq('user_id', uid);
  if (error) throw error;
}

/** Dev preview only: a rough copy of search_routes over the snapshot. */
function previewSearch(all: RouteCard[], q: string, f: Filters, near: { lat: number; lng: number; radiusKm?: number } | null) {
  const t = q.trim().toLowerCase().replace(/^@/, '');
  const any = <T,>(want: T[] | undefined, have: T[]) => !want?.length || want.some((w) => have.includes(w));
  return all
    .filter((r) => r.status !== 'draft')
    .filter((r) => !t || [r.title, r.owner_username ?? '', r.country_names.join(' '), r.from_name ?? '', r.to_name ?? ''].join(' ').toLowerCase().includes(t))
    .filter((r) => any(f.continents, [r.continent ?? '']) && any(f.vibes, r.vibes) && any(f.terrain, r.terrain))
    .filter((r) => any(f.styles, r.styles) && any(f.modes, r.modes) && any(f.offbeat, [r.offbeat ?? '']) && any(f.budgets, [r.budget ?? 0]))
    .filter((r) => !f.effort_max || (r.effort ?? 1) <= f.effort_max)
    .filter((r) => !f.month || r.best_months.includes(f.month) || r.went_month === f.month)
    .filter((r) => !f.sowo || r.sowo_approved)
    .map((r) => ({ ...r, distance_from_km: near && r.start_lat != null ? Math.round(kmBetween(near.lat, near.lng, r.start_lat, r.start_lng!)) : null }))
    .filter((r) => !near?.radiusKm || (r.distance_from_km != null && r.distance_from_km <= near.radiusKm))
    .sort((a, b) => (a.distance_from_km ?? 1e9) - (b.distance_from_km ?? 1e9));
}

export function kmBetween(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}
