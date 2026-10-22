// Every colour in the app comes from here (docs/THEME.md, "Trail marker" palette). Components read
// them through useTheme(); never put a raw hex value in a component.

export type Scheme = 'dark' | 'light';
export type AppearancePref = 'system' | 'light' | 'dark';

const dark = {
  bg: '#121611',
  sf: '#1A2019',
  sf2: '#242B22',
  ln: '#30382E',
  tx: '#EDEBDD',
  mu: '#A1A592',
  ac: '#F4C24A',
  on: '#1E1603',
  act: '#F6CC62',
  rt: '#F4C24A',
  cnt: '#2B3329',
  bd: '#3D4A3B',
  sea: '#10181B',
  land: '#1F271E',
  ph1: '#3A4838',
  ph2: '#4A3F35',
  ph3: '#35434C',
  ph4: '#4A4652',
  scrim: 'rgba(18,22,17,0.78)',
  ring: '#000000',
  ok: '#9CCB6B',
  warn: '#FF9A4D',
  danger: '#F08A7E',
  info: '#8FB9E6',
  // Badge tiers: icon colour only.
  bronze: '#C8895A',
  silver: '#B9C0C6',
  gold: '#E8C25A',
  // Spotify's own green, only for the "Play on Spotify" button (their brand rules).
  spotify: '#1DB954',
  onSpotify: '#0B1F12',
  // Cards get no shadow in dark mode; the floating + button does.
  shadow: 'transparent',
  fabShadow: 'rgba(0,0,0,0.35)',
};

export type Colors = typeof dark;

const light: Colors = {
  bg: '#F5F2E6',
  sf: '#FFFFFF',
  sf2: '#ECE8D8',
  ln: '#DFDAC6',
  tx: '#1C1E16',
  mu: '#5F6252',
  ac: '#F4C24A', // fill only, never text: use `act` for yellow text
  on: '#1E1603',
  act: '#7E5900',
  rt: '#A87A00',
  cnt: '#E4E0CF',
  bd: '#B9B49C',
  sea: '#D6E2E4',
  land: '#F3F1E6',
  ph1: '#C8D4C0',
  ph2: '#DCCFC0',
  ph3: '#C5D2DB',
  ph4: '#D3CEDA',
  scrim: 'rgba(255,255,255,0.86)',
  ring: '#1C1E16',
  ok: '#3F6E1A',
  warn: '#A84A0C',
  danger: '#B33A2B',
  info: '#2B65A3',
  // Tiers darkened ~15% so they stay visible on white.
  bronze: '#AA754D',
  silver: '#9DA3A8',
  gold: '#C5A54D',
  spotify: '#1DB954',
  onSpotify: '#0B1F12',
  shadow: 'rgba(0,0,0,0.06)',
  fabShadow: 'rgba(0,0,0,0.12)',
};

export const palettes: Record<Scheme, Colors> = { dark, light };

/** A token colour at lower opacity, for glows and tints (e.g. `alpha(c.ac, 0.15)`). */
export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Font family names as registered with expo-font in the root layout.
export const fonts = {
  regular: 'Archivo_400Regular',
  medium: 'Archivo_500Medium',
  semibold: 'Archivo_600SemiBold',
  bold: 'Archivo_700Bold',
  heavy: 'Archivo_800ExtraBold',
  mono: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_600SemiBold',
} as const;

export const radius = {
  chip: 999,
  card: 16,
  cardSm: 14,
  sheet: 22,
} as const;

export const space = {
  gutter: 16,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

// Minimum tap target.
export const TAP = 44;
