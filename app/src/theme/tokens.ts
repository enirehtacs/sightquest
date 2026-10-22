// Every colour in the app comes from here (docs/THEME.md). Components read
// them through useTheme(); never put a raw hex value in a component.

export type Scheme = 'dark' | 'light';
export type AppearancePref = 'system' | 'light' | 'dark';

const dark = {
  bg: '#131512',
  sf: '#1C1F1B',
  sf2: '#262A24',
  ln: '#31362F',
  tx: '#E6E8E1',
  mu: '#9CA295',
  ac: '#B9DE5C',
  on: '#131512',
  act: '#B9DE5C',
  rt: '#B9DE5C',
  cnt: '#31362F',
  bd: '#3A4A3F',
  sea: '#131A1D',
  land: '#27312B',
  ph1: '#3A4838',
  ph2: '#4A3F35',
  ph3: '#35434C',
  ph4: '#4A4652',
  scrim: 'rgba(19,21,18,0.78)',
  ring: '#000000',
  warn: '#F0B45A',
  danger: '#F08A7E',
  info: '#8FB9E6',
  // Badge tiers: icon colour only.
  bronze: '#C8895A',
  silver: '#B9C0C6',
  gold: '#E8C25A',
  // Cards get no shadow in dark mode.
  shadow: 'transparent',
};

export type Colors = typeof dark;

const light: Colors = {
  bg: '#F3F2EC',
  sf: '#FFFFFF',
  sf2: '#E9E8E1',
  ln: '#DCDBD2',
  tx: '#1B1D19',
  mu: '#5D6257',
  ac: '#C6E86E', // fill only, never text: use `act` for green text
  on: '#1B1D19',
  act: '#4F7212',
  rt: '#5E8A0F',
  cnt: '#D6D9CE',
  bd: '#AFBDA5',
  sea: '#D2E1EA',
  land: '#F2F5EC',
  ph1: '#C8D4C0',
  ph2: '#DCCFC0',
  ph3: '#C5D2DB',
  ph4: '#D3CEDA',
  scrim: 'rgba(255,255,255,0.86)',
  ring: '#1B1D19',
  warn: '#9A5F00',
  danger: '#B33A2B',
  info: '#2B65A3',
  // Tiers darkened ~15% so they stay visible on white.
  bronze: '#AA754D',
  silver: '#9DA3A8',
  gold: '#C5A54D',
  shadow: 'rgba(0,0,0,0.06)',
};

export const palettes: Record<Scheme, Colors> = { dark, light };

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
