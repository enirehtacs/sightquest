import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

// Where you are (device location, only if you allowed it) and where a place
// name is (Mapbox geocoding, for your home base). Nothing here is stored on
// our servers: positions stay on the device.

export const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

export type Place = { lat: number; lng: number; name: string };

const memo = new Map<string, Place | null>();

/** "Singapore" → its centre. Cached on the device. */
export async function geocode(text: string | null | undefined): Promise<Place | null> {
  const q = (text ?? '').trim();
  if (!q || !MAPBOX_TOKEN) return null;
  const key = `sq.geo.${q.toLowerCase()}`;
  if (memo.has(key)) return memo.get(key)!;
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      const p = JSON.parse(cached) as Place;
      memo.set(key, p);
      return p;
    }
  } catch {}
  try {
    const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(q)}&limit=1&types=place,region,country&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    const json = await res.json();
    const f = json?.features?.[0];
    const p: Place | null = f ? { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], name: f.properties?.name ?? q } : null;
    memo.set(key, p);
    if (p) AsyncStorage.setItem(key, JSON.stringify(p)).catch(() => {});
    return p;
  } catch {
    return null;
  }
}

/** The town or city at a point, for "Starting within 80 km of {city}". */
export async function cityAt(lat: number, lng: number): Promise<string | null> {
  if (!MAPBOX_TOKEN) return null;
  try {
    const url = `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lng}&latitude=${lat}&types=place&limit=1&access_token=${MAPBOX_TOKEN}`;
    const json = await (await fetch(url)).json();
    return json?.features?.[0]?.properties?.name ?? null;
  } catch {
    return null;
  }
}

export type Here = { status: 'granted' | 'denied' | 'undetermined'; place: Place | null };

/**
 * Your position, if location is allowed. `ask` shows the OS prompt when you
 * haven't answered yet (only after a tap, never on its own).
 */
export async function whereAmI(ask = false): Promise<Here> {
  try {
    let perm = await Location.getForegroundPermissionsAsync();
    if (perm.status === 'undetermined' && ask) perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return { status: perm.status === 'denied' ? 'denied' : 'undetermined', place: null };
    const pos =
      (await Location.getLastKnownPositionAsync({ maxAge: 30 * 60 * 1000 }).catch(() => null)) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    const { latitude: lat, longitude: lng } = pos.coords;
    return { status: 'granted', place: { lat, lng, name: (await cityAt(lat, lng)) ?? 'you' } };
  } catch {
    return { status: 'denied', place: null };
  }
}
