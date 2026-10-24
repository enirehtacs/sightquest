import * as Crypto from 'expo-crypto';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { supabase } from './supabase';

// The photo pipeline (docs/DATA.md → Storage buckets):
// 1. Read the date and GPS from each photo ON THE PHONE.
// 2. Shrink to 2048px on the long edge, JPEG ~80%. Re-encoding drops every
//    bit of EXIF, so the uploaded file has no location in it.
// 3. Upload to the private `moments` bucket under {route_id}/.
// Location lives only in the database columns (and is hidden by the
// visibility rules there).

export type PickedPhoto = {
  key: string;
  /** For showing on the phone before upload. */
  uri: string;
  width: number;
  height: number;
  /** Wall-clock time the photo was taken, "2026-09-12T08:02", or null. */
  taken: string | null;
  /** True when the date came from the file, not the camera (maybe AirDropped). */
  guessedDate: boolean;
  lat: number | null;
  lng: number | null;
  /** Web only: the original file, for reading EXIF. */
  file?: File;
};

const pad = (n: number) => String(n).padStart(2, '0');
const localStamp = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** "2026:09:12 08:02:11" → "2026-09-12T08:02" */
function exifStamp(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const m = v.match(/^(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}` : null;
}

/** A GPS value as a number: 1.42, "1.42", [1, 25, 12.3] or "1/1,25/1,123/10". */
function gpsNumber(v: unknown): number | null {
  if (typeof v === 'number') return v;
  if (Array.isArray(v) && v.length === 3) return Number(v[0]) + Number(v[1]) / 60 + Number(v[2]) / 3600;
  if (typeof v === 'string') {
    if (/^-?\d+(\.\d+)?$/.test(v.trim())) return Number(v);
    const parts = v.split(',').map((p) => {
      const [a, b] = p.split('/').map(Number);
      return b ? a / b : a;
    });
    if (parts.length === 3 && parts.every((x) => !Number.isNaN(x))) return parts[0] + parts[1] / 60 + parts[2] / 3600;
  }
  return null;
}

function signed(v: number | null, ref: unknown, neg: string) {
  if (v == null) return null;
  return typeof ref === 'string' && ref.toUpperCase().startsWith(neg) ? -Math.abs(v) : v;
}

/** iOS nests EXIF under {Exif} and {GPS}; Android keeps it flat. */
function fromNativeExif(exif: Record<string, unknown> | null | undefined) {
  if (!exif) return { taken: null, lat: null, lng: null };
  const e = (exif['{Exif}'] as Record<string, unknown>) ?? exif;
  const g = (exif['{GPS}'] as Record<string, unknown>) ?? exif;
  const taken = exifStamp(e.DateTimeOriginal ?? e.DateTimeDigitized ?? exif.DateTime);
  const lat = signed(gpsNumber(g.Latitude ?? g.GPSLatitude), g.LatitudeRef ?? g.GPSLatitudeRef, 'S');
  const lng = signed(gpsNumber(g.Longitude ?? g.GPSLongitude), g.LongitudeRef ?? g.GPSLongitudeRef, 'W');
  return { taken, lat: lat && lng ? lat : null, lng: lat && lng ? lng : null };
}

async function fromWebFile(file: File | undefined) {
  if (!file) return { taken: null, lat: null, lng: null };
  try {
    const exifr = (await import('exifr')).default;
    const x = await exifr.parse(file, { gps: true, pick: ['DateTimeOriginal', 'CreateDate', 'GPSLatitude', 'GPSLongitude', 'GPSLatitudeRef', 'GPSLongitudeRef'] });
    const d: Date | undefined = x?.DateTimeOriginal ?? x?.CreateDate;
    return {
      taken: d instanceof Date && !Number.isNaN(d.getTime()) ? localStamp(d) : null,
      lat: typeof x?.latitude === 'number' ? x.latitude : null,
      lng: typeof x?.longitude === 'number' ? x.longitude : null,
    };
  } catch {
    return { taken: null, lat: null, lng: null };
  }
}

/** Open the photo library. Reads dates and places here on the phone. */
export async function pickPhotos(opts: { max?: number } = {}): Promise<PickedPhoto[]> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: (opts.max ?? 50) > 1,
    selectionLimit: opts.max ?? 50,
    exif: true,
    quality: 1,
  });
  if (res.canceled) return [];
  return Promise.all(
    res.assets.map(async (a) => {
      const meta = Platform.OS === 'web' ? await fromWebFile(a.file) : fromNativeExif(a.exif as Record<string, unknown> | null);
      const fileDate = a.file?.lastModified ? localStamp(new Date(a.file.lastModified)) : null;
      return {
        key: Crypto.randomUUID(),
        uri: a.uri,
        width: a.width,
        height: a.height,
        taken: meta.taken ?? fileDate,
        guessedDate: !meta.taken && !!fileDate,
        lat: meta.lat,
        lng: meta.lng,
        file: a.file,
      };
    }),
  );
}

/**
 * Shrink and strip. Returns what the offline queue keeps until upload:
 * on the phone a file in the app's cache, on the web the JPEG as base64.
 */
export async function preparePhoto(p: { uri: string; width: number; height: number }): Promise<{ uri: string; base64?: string }> {
  const long = Math.max(p.width, p.height);
  const resize = long > 2048 ? [{ resize: p.width >= p.height ? { width: 2048 } : { height: 2048 } }] : [];
  const out = await ImageManipulator.manipulateAsync(p.uri, resize, {
    compress: 0.8,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: Platform.OS === 'web',
  });
  return Platform.OS === 'web' ? { uri: out.uri, base64: out.base64 } : { uri: out.uri };
}

function base64ToBytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Upload one prepared photo to {routeId}/{name}.jpg. Safe to retry. */
export async function uploadPhoto(routeId: string, name: string, photo: { uri: string; base64?: string }) {
  const path = `${routeId}/${name}.jpg`;
  let b64 = photo.base64;
  if (!b64) {
    // Re-read the already-shrunk file from the cache as base64 (no new EXIF).
    b64 = (await ImageManipulator.manipulateAsync(photo.uri, [], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true })).base64;
  }
  if (!b64) throw new Error('photo_unreadable');
  const { error } = await supabase.storage.from('moments').upload(path, base64ToBytes(b64), { contentType: 'image/jpeg', upsert: false });
  // Already there from an earlier try: that's fine.
  if (error && !/exists|duplicate/i.test(error.message)) throw error;
  return path;
}

const urlCache = new Map<string, { url: string; until: number }>();

/** Short-lived links to private moment photos (only for routes you can see). */
export async function photoUrls(paths: string[]): Promise<Record<string, string>> {
  const now = Date.now();
  const need = paths.filter((p) => (urlCache.get(p)?.until ?? 0) <= now);
  if (need.length) {
    const { data } = await supabase.storage.from('moments').createSignedUrls(need, 3600);
    (data ?? []).forEach((d) => d.signedUrl && d.path && urlCache.set(d.path, { url: d.signedUrl, until: now + 50 * 60 * 1000 }));
  }
  return Object.fromEntries(paths.flatMap((p) => (urlCache.get(p) ? [[p, urlCache.get(p)!.url]] : [])));
}
