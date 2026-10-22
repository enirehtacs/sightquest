import type { Ref } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type LngLat = [number, number];

export type MapLine = {
  id: string;
  coords: LngLat[];
  /** Fade it back (another trip is selected). */
  dim?: boolean;
  /** Draw it thicker (the selected trip). */
  bold?: boolean;
};

export type MapPin = {
  id: string;
  coord: LngLat;
  /**
   * `stop`: a day on the route. `end`: the last day.
   * `photo`: a moment (28px circle with a yellow ring).
   * `route`: a route on Search or Atlas, with a label.
   * `me`: where you are.
   */
  kind: 'stop' | 'end' | 'photo' | 'route' | 'me';
  label?: string;
  count?: number;
  selected?: boolean;
  tone?: 1 | 2 | 3 | 4;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export type Padding = { top: number; right: number; bottom: number; left: number };

export type MapHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  /** Frame these points (or the `fitTo` points). */
  fit: (coords?: LngLat[]) => void;
  flyTo: (coord: LngLat, zoom?: number) => void;
};

export type MapProps = {
  lines?: MapLine[];
  pins?: MapPin[];
  /** What to frame first, and what fit() goes back to. */
  fitTo?: LngLat[];
  padding?: Partial<Padding>;
  /** Furthest the camera zooms in when framing (default 11). */
  maxFitZoom?: number;
  /** Mouse-wheel zoom on web. Off for maps inside a scrolling page. */
  scrollZoom?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  ref?: Ref<MapHandle>;
};

export const pad = (p?: Partial<Padding>): Padding => ({ top: 40, right: 40, bottom: 40, left: 40, ...p });

/** [[west, south], [east, north]] around some points, or null. */
export function boundsOf(coords: LngLat[]): [LngLat, LngLat] | null {
  if (!coords.length) return null;
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const [x, y] of coords) {
    if (x < w) w = x;
    if (x > e) e = x;
    if (y < s) s = y;
    if (y > n) n = y;
  }
  return [[w, s], [e, n]];
}

export const allCoords = (lines: MapLine[] = [], pins: MapPin[] = []): LngLat[] => [
  ...lines.flatMap((l) => l.coords),
  ...pins.map((p) => p.coord),
];

// Web Mercator, for the drawn fallback map and the little route thumbnails.
const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (Math.max(-85, Math.min(85, lat)) * Math.PI) / 360));

/**
 * A function from [lng, lat] to [x, y] pixels that frames `coords` inside a
 * w × h box (with padding). `zoom` > 1 zooms in around `center`.
 */
export function projector(coords: LngLat[], w: number, h: number, p: Padding, zoom = 1, center?: LngLat) {
  const b = boundsOf(coords) ?? [[-180, -60], [180, 75]];
  let [x0, x1] = [b[0][0], b[1][0]];
  let [y0, y1] = [mercY(b[0][1]), mercY(b[1][1])];
  // Never frame tighter than ~1 km, so one-point routes still look like a map.
  const minSpan = 0.01;
  if (x1 - x0 < minSpan) [x0, x1] = [(x0 + x1) / 2 - minSpan, (x0 + x1) / 2 + minSpan];
  if (y1 - y0 < minSpan * 0.0175) [y0, y1] = [(y0 + y1) / 2 - minSpan * 0.0175, (y0 + y1) / 2 + minSpan * 0.0175];
  const iw = Math.max(1, w - p.left - p.right);
  const ih = Math.max(1, h - p.top - p.bottom);
  const kx = iw / ((x1 - x0) * (Math.PI / 180));
  const ky = ih / (y1 - y0);
  const k = Math.min(kx, ky) * zoom;
  const cx = center ? (center[0] * Math.PI) / 180 : (((x0 + x1) / 2) * Math.PI) / 180;
  const cy = center ? mercY(center[1]) : (y0 + y1) / 2;
  const ox = p.left + iw / 2;
  const oy = p.top + ih / 2;
  return (c: LngLat): [number, number] => [ox + ((c[0] * Math.PI) / 180 - cx) * k, oy - (mercY(c[1]) - cy) * k];
}
