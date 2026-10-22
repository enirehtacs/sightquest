import type { IconName } from '@/components';

import type { RouteCard } from './routes';

// Words and labels for routes: the keys stored in the database (docs/DATA.md)
// and how they read in the app (docs/SPEC.md).

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MON = MONTHS.map((m) => m.slice(0, 3));

export const EFFORT_NAMES = ['Easygoing', 'Cruisy', 'Up for it', 'Big effort', 'Epic'];
export const EFFORT_HINTS = ['flip-flops ok', 'a bit of walking', 'some early alarms', 'proper legs needed', 'plan, train, go'];
export const BUDGET_NAMES = ['Shoestring', 'Budget', 'Mid-range', 'Splurge'];

export const CONTINENTS = ['Asia', 'Europe', 'Africa', 'North America', 'South America', 'Oceania', 'Antarctica'];

export const VIBES: [string, string][] = [
  ['chill', 'Chill'], ['scenic', 'Scenic'], ['wild', 'Wild'], ['foodie', 'Foodie'],
  ['social', 'Social'], ['romantic', 'Romantic'], ['mixed', 'Mixed bag'],
];
export const TERRAIN: [string, string][] = [
  ['mountains', 'Mountains'], ['beaches', 'Beaches'], ['islands', 'Islands'], ['jungle', 'Jungle'],
  ['desert', 'Desert'], ['snow', 'Snow'], ['rivers', 'Rivers'], ['cities', 'Cities'],
];
export const STYLES: [string, string][] = [
  ['slow_travel', 'Slow travel'], ['road_trip', 'Road trip'], ['hikey', 'Hikey'], ['citey', 'Citey'],
];
export const MODES: [string, string][] = [
  ['walk', 'Walk'], ['bicycle', 'Bicycle'], ['moto', 'Moto'], ['bus', 'Bus'], ['train', 'Train'],
  ['boat', 'Boat'], ['plane', 'Plane'], ['hitch', 'Hitch'], ['horse', 'Horse'],
];
export const OFFBEAT: [string, string][] = [
  ['comfortable', 'Comfortable'], ['off_the_map', 'Off the map'], ['few_have_been', 'Few have been'],
];
export const LENGTHS: [string, string][] = [
  ['weekend', 'Weekend · 1–3 days'], ['short', 'Short trip · 4–7 days'], ['1-2w', '1–2 weeks'],
  ['3-4w', '3–4 weeks'], ['1-3m', '1–3 months'], ['3m+', '3 months+'],
];

const label = (list: [string, string][], key: string | null | undefined) => list.find(([k]) => k === key)?.[1] ?? '';
export const vibeLabel = (k: string | null | undefined) => label(VIBES, k);
export const offbeatLabel = (k: string | null | undefined) => label(OFFBEAT, k);

/** Leg pills on the itinerary: BUS, MOTO, WALK, BOAT… */
export const LEG_MODE: Record<string, string> = {
  stayed: 'STAY', day_trip: 'DAY TRIP', walk: 'WALK', bicycle: 'BIKE', moto: 'MOTO', bus: 'BUS',
  train: 'TRAIN', boat: 'BOAT', plane: 'PLANE', hitch: 'HITCH', horse: 'HORSE',
};

export const WEATHER: Record<string, string> = {
  sunny: '☀', cloudy: '☁', rainy: '☂', stormy: '⚡', misty: '≋', hot: '☀', cold: '❄',
};

/** Must-know categories, in SPEC section 7 order. */
export const MUST_KNOW: Record<string, { label: string; icon: IconName }> = {
  visa: { label: 'Visa & entry', icon: 'mkVisa' },
  permits: { label: 'Permits & fees', icon: 'mkPermits' },
  wheels: { label: 'Licence & wheels', icon: 'mkLicence' },
  cash: { label: 'Cash & cards', icon: 'mkCash' },
  sim: { label: 'SIM & signal', icon: 'mkSim' },
  book: { label: 'Book ahead?', icon: 'mkBook' },
  roads: { label: 'Roads & trails', icon: 'mkRoads' },
  water: { label: 'Water & health', icon: 'mkWater' },
  scams: { label: 'Scams & fines', icon: 'mkScams' },
  dress: { label: 'Dress code', icon: 'mkDress' },
  wildlife: { label: 'Wildlife', icon: 'mkWildlife' },
  pack: { label: 'Pack this', icon: 'mkPack' },
  custom: { label: '', icon: 'plus' },
};
export const MUST_KNOW_ORDER = Object.keys(MUST_KNOW);

export const SPOT_KIND: Record<string, { label: string; icon: IconName }> = {
  accommodation: { label: 'Accommodation', icon: 'spotStay' },
  viewpoint: { label: 'Viewpoint', icon: 'spotViewpoint' },
  food: { label: 'Food', icon: 'spotFood' },
  cafe: { label: 'Cafe', icon: 'spotCafe' },
  hike: { label: 'Hike', icon: 'spotHike' },
  culture: { label: 'Culture', icon: 'spotCulture' },
  market: { label: 'Market', icon: 'spotFood' },
  beach: { label: 'Beach', icon: 'spotBeach' },
  nightlife: { label: 'Nightlife', icon: 'music' },
  transport: { label: 'Transport', icon: 'navigate' },
  other: { label: 'Good to know', icon: 'spotOther' },
};

export const dots = (effort: number | null | undefined) => {
  const e = Math.max(0, Math.min(5, effort ?? 0));
  return '●'.repeat(e) + '○'.repeat(5 - e);
};

/** "VIETNAM", "LAOS + 1", or "3 COUNTRIES". */
export function countryLine(r: Pick<RouteCard, 'country_names'>) {
  const n = r.country_names ?? [];
  if (n.length === 0) return '';
  if (n.length === 1) return n[0];
  if (n.length === 2) return `${n[0]} + ${n[1]}`;
  return `${n.length} countries`;
}

/** The mono meta line: "VIETNAM · MAR · 9D · $$" (options drop parts). */
export function metaLine(
  r: RouteCard,
  opt: { month?: boolean; days?: boolean; budget?: boolean; creator?: boolean; anyTime?: boolean } = {},
) {
  const { month = true, days = true, budget = true, creator = false, anyTime = false } = opt;
  const parts = [countryLine(r)];
  if (month) {
    if (anyTime && r.best_months?.length === 12) parts.push('ANY TIME');
    else if (r.went_month) parts.push(MON[r.went_month - 1]);
  }
  if (days && r.day_count) parts.push(`${r.day_count}D`);
  if (budget && r.budget) parts.push('$'.repeat(r.budget));
  if (creator && r.owner_username) parts.push(`@${r.owner_username}`);
  return parts.filter(Boolean).join(' · ').toUpperCase().replace(/@[A-Z0-9._]+$/, (h) => h.toLowerCase());
}

/** "SCENIC · ●●●○○" */
export function vibeTag(r: RouteCard) {
  const v = vibeLabel(r.vibes?.[0]);
  return [v.toUpperCase(), dots(r.effort)].filter(Boolean).join(' · ');
}

/** "Hanoi → Lung Cu · Mar 2026" */
export function fromToLine(r: RouteCard) {
  const way = r.from_name && r.to_name && r.from_name !== r.to_name ? `${r.from_name} → ${r.to_name}` : r.from_name ?? '';
  const when = r.went_month ? `${MON[r.went_month - 1]}${r.went_year ? ` ${r.went_year}` : ''}` : '';
  return [way, when].filter(Boolean).join(' · ');
}

/** A steady placeholder colour (ph1–ph4) for a route without photos. */
export function toneOf(id: string, offset = 0): 1 | 2 | 3 | 4 {
  let h = offset;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 4) + 1) as 1 | 2 | 3 | 4;
}

/** "6:30AM" from "06:30:00". */
export function clock(t: string | null | undefined) {
  if (!t) return '';
  const [hh, mm] = t.split(':').map(Number);
  const h = hh % 12 === 0 ? 12 : hh % 12;
  return `${h}:${String(mm).padStart(2, '0')}${hh < 12 ? 'AM' : 'PM'}`;
}

export function kmLabel(km: number | null | undefined) {
  if (km == null) return '–';
  return km >= 1000 ? `${(km / 1000).toFixed(km >= 10000 ? 0 : 1)}k` : String(Math.round(km));
}
