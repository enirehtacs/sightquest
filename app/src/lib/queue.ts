import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';

import { uploadPhoto } from './photos';
import { supabase } from './supabase';

// The offline queue (SPEC → Day-by-day builder → Offline).
// Days, moments (with their photos), spots and small edits are saved on the
// phone first, then sent in order whenever there's signal. Every op carries an
// id made on the phone, so a retry never creates a double, and later ops (a
// moment on a new day) can point at earlier ones before they're synced.
// Kept in AsyncStorage so it survives closing the app.

export type DayRow = {
  id: string;
  route_id: string;
  day_number: number;
  date: string | null;
  place_name: string;
  lat: number | null;
  lng: number | null;
  weather: string | null;
  note: string | null;
  created_by: string;
};
export type LegRow = { id: string; day_id: string; sort: number; mode: string; from_name: string | null; to_name: string | null; duration_text: string | null; note: string | null };
export type MomentRow = {
  id: string;
  day_id: string;
  route_id: string;
  caption: string | null;
  tag: string | null;
  taken_at: string | null;
  local_time: string | null;
  lat: number | null;
  lng: number | null;
  starred: boolean;
};
export type SpotRow = { id: string; route_id: string; day_id: string | null; sort: number; name: string; kind: string; why: string | null; where_name: string | null; lat: number | null; lng: number | null };

export type Op = { id: string; routeId: string; at: number; error?: string } & (
  | { kind: 'day'; day: DayRow; leg: LegRow | null }
  | { kind: 'moment'; moment: MomentRow; photos: { uri: string; base64?: string }[] }
  | { kind: 'spot'; spot: SpotRow }
  | { kind: 'update'; table: 'days' | 'routes'; rowId: string; patch: Record<string, unknown> }
);

const KEY = 'sq.queue.v1';
let ops: Op[] = [];
let loaded = false;
let flushing = false;
let offline = false;
const listeners = new Set<() => void>();
let snapshot = { ops, offline };

function emit() {
  snapshot = { ops, offline };
  listeners.forEach((l) => l());
}

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) ops = [...(JSON.parse(raw) as Op[]), ...ops];
  } catch {}
  emit();
}

async function save() {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(ops));
  } catch {
    // Storage full (lots of photos on the web): keep them in memory for now.
  }
}

const isNetworkError = (e: unknown) =>
  /network|fetch|load failed|timed? ?out|offline|connection/i.test(String((e as { message?: string })?.message ?? e));
// Already sent by an earlier try: the same id is in (a primary-key clash),
// not a different row that happens to clash on something else.
const isDuplicate = (e: { code?: string; message?: string } | null) => e?.code === '23505' && /_pkey/.test(e.message ?? '');

async function run(op: Op) {
  switch (op.kind) {
    case 'day': {
      const { error } = await supabase.from('days').insert(op.day);
      if (error && !isDuplicate(error)) throw error;
      if (op.leg) {
        const { error: e2 } = await supabase.from('legs').insert(op.leg);
        if (e2 && !isDuplicate(e2)) throw e2;
      }
      return;
    }
    case 'moment': {
      const paths: string[] = [];
      for (let i = 0; i < op.photos.length; i++) paths.push(await uploadPhoto(op.routeId, `${op.moment.id}-${i}`, op.photos[i]));
      const { error } = await supabase.from('moments').insert({ ...op.moment, photo_paths: paths });
      if (error && !isDuplicate(error)) throw error;
      return;
    }
    case 'spot': {
      const { error } = await supabase.from('spots').insert(op.spot);
      if (error && !isDuplicate(error)) throw error;
      return;
    }
    case 'update': {
      const { error } = await supabase.from(op.table).update(op.patch).eq('id', op.rowId);
      if (error) throw error;
    }
  }
}

/** Send everything waiting, in order. Stops at the first network failure. */
export async function flush() {
  await load();
  if (flushing || !ops.length) return;
  flushing = true;
  try {
    for (const op of [...ops]) {
      if (op.error) continue;
      try {
        await run(op);
        ops = ops.filter((o) => o.id !== op.id);
        offline = false;
      } catch (e) {
        if (isNetworkError(e)) {
          offline = true;
          break;
        }
        // Refused for another reason: keep it, flagged, so nothing is lost silently.
        ops = ops.map((o) => (o.id === op.id ? { ...o, error: String((e as { message?: string })?.message ?? e) } : o));
      }
      await save();
      emit();
    }
  } finally {
    flushing = false;
    await save();
    emit();
  }
}

/** Save it on the phone, then try to send it straight away. */
export async function enqueue(op: Op) {
  await load();
  ops = [...ops, op];
  await save();
  emit();
  flush();
}

/** Try the ones that were refused once more (e.g. after signing in again). */
export async function retryFailed() {
  ops = ops.map(({ error: _e, ...o }) => o as Op);
  await save();
  emit();
  return flush();
}

// Keep trying: every 20 s while something waits, when the app comes back,
// and when the network says it's back.
let started = false;
export function startQueue() {
  if (started) return;
  started = true;
  load().then(flush);
  setInterval(() => ops.length && flush(), 20000);
  AppState.addEventListener('change', (s) => s === 'active' && flush());
  try {
    Network.addNetworkStateListener((s) => {
      const down = s.isConnected === false || s.isInternetReachable === false;
      if (down !== offline) {
        offline = down;
        emit();
      }
      if (!down) flush();
    });
  } catch {}
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.addEventListener('online', () => flush());
    window.addEventListener('offline', () => {
      offline = true;
      emit();
    });
    if (typeof navigator !== 'undefined' && navigator.onLine === false) offline = true;
  }
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Everything waiting on this phone, and whether we look offline. */
export function useQueue() {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}
