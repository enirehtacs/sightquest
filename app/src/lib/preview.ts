import { Platform } from 'react-native';

import type { RouteCard, RouteDetail, SaveList } from './routes';
import { supabase } from './supabase';

// Dev preview mode: look at signed-in screens in a local browser without an
// account (open http://localhost:8081/?preview). Dev builds on localhost only.
// Screens show a snapshot of real query results (src/data/preview.json, made
// by supabase/tests/export_preview.js) instead of reading the database.

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

/** Asked for with ?preview (it only counts while nobody is signed in). */
export const PREVIEW_REQUESTED = detectPreview();

export function leavePreview() {
  try {
    window.sessionStorage.removeItem(PREVIEW_KEY);
  } catch {}
}

/** The preview snapshot, or null when we should read the real database. */
export async function previewSnapshot(): Promise<PreviewSnapshot | null> {
  if (!PREVIEW_REQUESTED) return null;
  const { data } = await supabase.auth.getSession();
  if (data.session) return null;
  // Written as `if (__DEV__)` so release builds drop the snapshot entirely.
  if (__DEV__) return require('@/data/preview.json') as PreviewSnapshot;
  return null;
}

// Shapes are the same as the real queries (see lib/routes.ts).
export type PreviewSnapshot = {
  /** Whose eyes the snapshot was taken through (@maya.goes). */
  as: string;
  recommended: RouteCard[];
  easyWins: RouteCard[];
  bestIn: { month: number; routes: RouteCard[] };
  gems: RouteCard[];
  buildingNow: RouteCard[];
  all: RouteCard[];
  mine: RouteCard[];
  byOwner: Record<string, RouteCard[]>;
  saves: { route_id: string; list: SaveList }[];
  routes: Record<string, RouteDetail>;
};
