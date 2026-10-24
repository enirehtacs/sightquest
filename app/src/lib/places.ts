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

export type PlaceHit = { name: string; region: string; lat: number; lng: number; countryCode: string | null };

type Feature = {
  geometry: { coordinates: [number, number] };
  properties: { name?: string; place_formatted?: string; context?: { country?: { country_code?: string } } };
};

const toHit = (f: Feature): PlaceHit => ({
  name: f.properties.name ?? '',
  region: f.properties.place_formatted ?? '',
  lng: f.geometry.coordinates[0],
  lat: f.geometry.coordinates[1],
  countryCode: f.properties.context?.country?.country_code?.toUpperCase() ?? null,
});

/** Town, beach, trailhead…: suggestions as you type, nearest to `near` first. */
export async function searchPlaces(q: string, near?: { lat: number; lng: number } | null): Promise<PlaceHit[]> {
  const text = q.trim();
  if (text.length < 2 || !MAPBOX_TOKEN) return [];
  const prox = near ? `&proximity=${near.lng},${near.lat}` : '';
  const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(text)}&autocomplete=true&limit=5&types=place,locality,neighborhood,district,region,country${prox}&access_token=${MAPBOX_TOKEN}`;
  try {
    const json = await (await fetch(url)).json();
    return ((json?.features ?? []) as Feature[]).map(toHit).filter((h) => h.name);
  } catch {
    return [];
  }
}

/** The place (and country) at a point: for dropped pins and photo days. */
export async function placeAt(lat: number, lng: number): Promise<PlaceHit | null> {
  if (!MAPBOX_TOKEN) return null;
  try {
    const url = `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lng}&latitude=${lat}&types=place,locality,neighborhood&limit=1&access_token=${MAPBOX_TOKEN}`;
    const f = ((await (await fetch(url)).json())?.features ?? [])[0] as Feature | undefined;
    return f ? { ...toHit(f), lat, lng } : null;
  } catch {
    return null;
  }
}
