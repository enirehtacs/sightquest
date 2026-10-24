import { View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { useTheme, type Colors } from '@/theme';

// Every path below is copied from design/prototype. Line icons on a 24 grid.
type El =
  | string // path d
  | { c: [number, number, number] } // circle cx cy r
  | { e: [number, number, number, number]; rot?: number } // ellipse cx cy rx ry
  | { r: [number, number, number, number, number] }; // rect x y w h rx

const LOGO_WAVES = [
  { c: [12, 12, 10] },
  'M2.3 10.4c3.4-2.6 6.6 1.8 9.8-.6s5.8-2.8 9.6.2',
  'M2.2 14c3.4-2.2 6.8 1.8 10.2-.3s5.4-2.1 9.4.4',
  'M4.6 18c2.8-1.5 5.8 1.2 8.6-.2s4.2-1.3 6.4.2',
  'M5.2 6.1c2.4-1 4.6.8 7-.2s3.6-1 6 .2',
] satisfies El[];

export const ICONS = {
  // Brand + bottom nav
  logo: LOGO_WAVES,
  explore: [
    'M5.5 10a4.5 4.5 0 014.5-4.5h4a4.5 4.5 0 014.5 4.5v9a2 2 0 01-2 2h-9a2 2 0 01-2-2z',
    'M9.5 5.5V4.5a2.5 2.5 0 015 0v1',
    'M8.5 21v-4a1.5 1.5 0 011.5-1.5h4a1.5 1.5 0 011.5 1.5v4',
  ],
  search: [{ c: [11, 11, 7] }, 'M20 20l-4-4'],
  friends: [
    { c: [12, 12, 1.8] },
    { e: [12, 12, 10, 4] },
    { e: [12, 12, 10, 4], rot: 60 },
    { e: [12, 12, 10, 4], rot: 120 },
  ],
  me: [{ c: [12, 8, 4] }, 'M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8'],

  // Actions + UI
  bell: ['M6 9a6 6 0 0112 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z', 'M10 20a2 2 0 004 0'],
  back: ['M15 5l-7 7 7 7'],
  next: ['M9 5l7 7-7 7'],
  chevronDown: ['M6 9l6 6 6-6'],
  close: ['M6 6l12 12M18 6L6 18'],
  plus: ['M12 5v14M5 12h14'],
  minus: ['M5 12h14'],
  check: ['M5 12l4 4 10-10'],
  send: ['M5 12h14M13 6l6 6-6 6'],
  save: ['M6 3h12v18l-6-4-6 4z'],
  download: ['M12 4v11M7 10l5 5 5-5M5 20h14'],
  share: ['M12 15V3M7 8l5-5 5 5', 'M5 12v8h14v-8'],
  external: ['M14 4h6v6M20 4l-9 9M18 14v6H4V6h6'],
  remix: ['M8 4h11v11', 'M19 4L9 14', 'M14 20H5V11'],
  link: ['M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1'],
  lock: [{ r: [5, 11, 14, 10, 2] }, 'M8 11V8a4 4 0 018 0v3'],
  shield: ['M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z'],
  shieldAlert: ['M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z', 'M12 8v5M12 16h.01'],
  settings: [
    { c: [12, 12, 3] },
    'M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  ],
  camera: ['M4 8h3l2-3h6l2 3h3v11H4z', { c: [12, 13, 3.5] }],
  filter: ['M4 6h16M7 12h10M10 18h4'],
  list: ['M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01'],
  more: ['M6 12h.01M12 12h.01M18 12h.01'],
  clock: [{ c: [12, 12, 8] }, 'M12 8v4l3 2'],
  star: ['M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z'],
  play: ['M8 5l11 7-11 7z'],
  music: ['M9 18V5l11-2v13', { c: [6, 18, 3] }, { c: [17, 16, 3] }],
  message: ['M4 5h16v11H9l-5 4z'],

  // Maps + places
  pin: ['M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21z', { c: [12, 9.5, 2.5] }],
  map: ['M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z', 'M9 4v14M15 6v14'],
  diary: ['M4 5l5-2 6 2 5-2v16l-5 2-6-2-5 2z', 'M9 3v16M15 5v16'],
  globe: [
    { c: [12, 12, 9] },
    'M3 12h18',
    'M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z',
  ],
  locate: [{ c: [12, 12, 4] }, 'M12 2v3M12 19v3M2 12h3M19 12h3'],
  navigate: ['M21 3L3 10.5l7.5 3 3 7.5z'],
  fit: ['M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'],
  offline: ['M2 8.5a15 15 0 0120 0M5 12a10 10 0 0114 0M8.5 15.5a5 5 0 017 0', 'M3 3l18 18'],
  sun: [{ c: [12, 12, 4] }, 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'],

  // Spot kinds (Route → Spots, copied from Route.dc.html)
  spotFood: ['M4 3v7a2 2 0 002 2v9M8 3v7M6 3v7M17 21V3c-2 0-3 2-3 5v6h3'],
  spotViewpoint: ['M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0'],
  spotStay: ['M3 18V7M3 13h18v5M21 13a3 3 0 00-3-3h-8v3M5.0 10.5a1.5 1.5 0 1 0 3.0 0a1.5 1.5 0 1 0 -3.0 0'],
  spotHike: ['M3 20l6-10 4 6 3-4 5 8z'],
  spotCafe: ['M4 9h13v5a5 5 0 01-5 5H9a5 5 0 01-5-5zM17 10h1a2.5 2.5 0 010 5h-1M8 3v3M12 3v3'],
  spotCulture: ['M3 21h18M5 21V10M19 21V10M9 21v-6h6v6M2 10l10-6 10 6z'],
  spotBeach: ['M3 20c3-2 6-2 9 0s6 2 9 0', 'M12 17V7M12 7c-3 0-5 1.5-6 4h12c-1-2.5-3-4-6-4z'],
  spotOther: ['M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21z', { c: [12, 9.5, 2.5] }],

  // Social links (profiles show only the ones the user added)
  tiktok: ['M14 3v11.5a4 4 0 11-4-4M14 3c.6 2.6 2.6 4.6 5.5 4.8'],
  instagram: ['M4 4h16v16H4zM8 12a4 4 0 108 0 4 4 0 10-8 0M17 7v.01'],
  youtube: ['M3 7.5C3 6 4 5 5.5 5h13C20 5 21 6 21 7.5v9c0 1.5-1 2.5-2.5 2.5h-13C4 19 3 18 3 16.5zM10 9v6l5-3z'],
  alltrails: ['M2 20l7-12 4 6 3-4 6 10zM9 8l1.5 2.5'],
  strava: ['M9 3L4 13h3.5L9 9.8 10.6 13H14zM14 13l-1.7 3.4L10.6 13H8.6l3.7 7.5 3.7-7.5z'],

  // Must-know categories (always drawn in `act`)
  mkVisa: ['M6 3h12v18H6zM9 17h6M9 10a3 3 0 1 0 6 0a3 3 0 1 0 -6 0'],
  mkPermits: ['M3 7h18v3a2 2 0 000 4v3H3v-3a2 2 0 000-4zM14 7v10'],
  mkLicence: ['M3 5h18v14H3zM14 10h4M14 14h3M6 16c.5-1.5 1.6-2.4 3-2.4s2.5.9 3 2.4M7 10a2 2 0 1 0 4 0a2 2 0 1 0 -4 0'],
  mkCash: ['M3 6h18v12H3zM9.4 12a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0M6.5 9v.01M17.5 15v.01'],
  mkSim: ['M7 2h10v20H7zM11 18h2'],
  mkBook: ['M4 5h16v16H4zM4 10h16M8 3v4M16 3v4'],
  mkRoads: ['M8 3L5 21M16 3l3 18M12 5v2M12 11v2M12 17v2'],
  mkWater: ['M12 3c-3 4.5-6 7.5-6 11a6 6 0 0012 0c0-3.5-3-6.5-6-11z'],
  mkScams: ['M12 3L2 21h20zM12 10v5M12 18v.01'],
  mkDress: ['M8.5 3L3 6l2 4.5 3-1.2V21h8V9.3l3 1.2L21 6l-5.5-3c-.4 1.6-1.8 2.6-3.5 2.6S8.9 4.6 8.5 3z'],
  mkWildlife: [
    'M4.9 10.5a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M8.4 6.5a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M12.4 6.5a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M15.9 10.5a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M8 17c0-2.6 1.9-4.6 4-4.6s4 2 4 4.6c0 2-1.6 3-4 3s-4-1-4-3z',
  ],
  mkPack: [
    'M5.5 10a4.5 4.5 0 014.5-4.5h4a4.5 4.5 0 014.5 4.5v9a2 2 0 01-2 2h-9a2 2 0 01-2-2zM9.5 5.5V4.5a2.5 2.5 0 015 0v1M8.5 21v-4a1.5 1.5 0 011.5-1.5h4a1.5 1.5 0 011.5 1.5v4',
  ],
} satisfies Record<string, El[]>;

export type IconName = keyof typeof ICONS;

type Props = {
  name: IconName;
  size?: number;
  /** A theme token name. Defaults to `tx`. */
  color?: keyof Colors;
  strokeWidth?: number;
  /** Fill the shape (e.g. a saved bookmark). */
  filled?: boolean;
  accessibilityLabel?: string;
};

export function Icon({ name, size = 24, color = 'tx', strokeWidth = 1.8, filled, accessibilityLabel }: Props) {
  const { c } = useTheme();
  const stroke = c[color];
  const fill = filled ? stroke : 'none';
  const els = ICONS[name] as El[];
  const svg = (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {els.map((el, i) => {
        if (typeof el === 'string') return <Path key={i} d={el} fill={fill} />;
        if ('c' in el) return <Circle key={i} cx={el.c[0]} cy={el.c[1]} r={el.c[2]} />;
        if ('e' in el)
          return (
            <Ellipse
              key={i}
              cx={el.e[0]}
              cy={el.e[1]}
              rx={el.e[2]}
              ry={el.e[3]}
              transform={el.rot ? `rotate(${el.rot} 12 12)` : undefined}
            />
          );
        return <Rect key={i} x={el.r[0]} y={el.r[1]} width={el.r[2]} height={el.r[3]} rx={el.r[4]} />;
      })}
    </Svg>
  );
  // Decorative by default; a labelled icon is announced as an image.
  if (!accessibilityLabel) return svg;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      {svg}
    </View>
  );
}
