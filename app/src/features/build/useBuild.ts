import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { getBuild, type BuildData } from '@/lib/build';
import { photoUrls } from '@/lib/photos';
import { useQueue, type Op } from '@/lib/queue';
import type { LngLat } from '@/lib/routes';

/** A day as the builder shows it: from the server, or still waiting on the phone. */
export type BDay = {
  id: string;
  day_number: number;
  date: string | null;
  place_name: string;
  /** Exact pin (builders always see their own exact pins). */
  lat: number | null;
  lng: number | null;
  weather: string | null;
  note: string | null;
  leg: { mode: string; from_name: string | null; to_name: string | null } | null;
  /** Saved on the phone, not sent yet. */
  pending: boolean;
  /** Sending was refused (kept so nothing is lost). */
  failed: string | null;
  photos: { key: string; uri: string; starred: boolean }[];
};

/** Everything the builder needs for one route, live-merged with the offline queue. */
export function useBuild(id: string | undefined) {
  const [data, setData] = useState<BuildData | null | undefined>(undefined);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const queue = useQueue();
  const mine = queue.ops.filter((o) => o.routeId === id);
  const waiting = mine.length;

  const load = useCallback(() => {
    if (!id) return;
    let live = true;
    getBuild(id)
      .then(async (d) => {
        if (!live) return;
        setData(d);
        const paths = d?.moments.flatMap((m) => m.photo_paths) ?? [];
        if (paths.length) {
          const u = await photoUrls(paths);
          if (live) setUrls(u);
        }
      })
      .catch(() => live && setData(null));
    return () => {
      live = false;
    };
  }, [id]);

  useFocusEffect(load);
  // Something just synced: read the server again.
  useEffect(() => {
    if (waiting === 0) load();
  }, [waiting, load]);

  const days = data ? mergeDays(data, mine, urls) : [];
  const line: LngLat[] = days.filter((d) => d.lat != null && d.lng != null).map((d) => [d.lng!, d.lat!]);
  return { data, days, line, ops: mine, offline: queue.offline, reload: load };
}

function mergeDays(data: BuildData, ops: Op[], urls: Record<string, string>): BDay[] {
  const exact = new Map((data.priv?.days ?? []).map((d) => [d.id, d]));
  const notes = new Map<string, string | null>();
  ops.forEach((o) => {
    if (o.kind === 'update' && o.table === 'days' && 'note' in o.patch) notes.set(o.rowId, o.patch.note as string | null);
  });
  const server: BDay[] = data.days.map((d) => {
    const p = exact.get(d.id);
    const leg = d.legs[0] ?? null;
    return {
      id: d.id,
      day_number: d.day_number,
      date: p?.date ?? null,
      place_name: d.place_name,
      lat: p?.lat ?? d.lat,
      lng: p?.lng ?? d.lng,
      weather: d.weather,
      note: notes.has(d.id) ? notes.get(d.id)! : d.note,
      leg: leg ? { mode: leg.mode, from_name: leg.from_name, to_name: leg.to_name } : null,
      pending: false,
      failed: null,
      photos: data.moments
        .filter((m) => m.day_id === d.id)
        .flatMap((m) => m.photo_paths.map((path) => ({ key: path, uri: urls[path] ?? '', starred: m.starred }))),
    };
  });
  const known = new Set(server.map((d) => d.id));
  const queued: BDay[] = ops.flatMap((o) =>
    o.kind === 'day' && !known.has(o.day.id)
      ? [
          {
            ...o.day,
            leg: o.leg ? { mode: o.leg.mode, from_name: o.leg.from_name, to_name: o.leg.to_name } : null,
            pending: true,
            failed: o.error ?? null,
            photos: [],
          },
        ]
      : [],
  );
  const all = [...server, ...queued];
  // Moments still waiting show their photos from the phone.
  ops.forEach((o) => {
    if (o.kind !== 'moment') return;
    const d = all.find((x) => x.id === o.moment.day_id);
    if (!d) return;
    d.pending = true;
    if (o.error) d.failed = o.error;
    o.photos.forEach((p, i) => d.photos.push({ key: `${o.id}-${i}`, uri: p.base64 ? `data:image/jpeg;base64,${p.base64}` : p.uri, starred: o.moment.starred }));
  });
  return all.sort((a, b) => a.day_number - b.day_number);
}
