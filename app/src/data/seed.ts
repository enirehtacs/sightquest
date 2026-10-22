// Sample content from the prototype (design/prototype/Me.dc.html) so profile
// screens never look empty before routes exist. Phase 2 replaces the routes
// here with real rows from the `routes` table.

import type { MyProfile } from '@/lib/profiles';

export type SampleRoute = {
  title: string;
  meta: string;
  tag: string;
  tone: 1 | 2 | 3 | 4;
};

export type SampleSaved = {
  title: string;
  who: string;
  meta: string;
  list: 'Next trip' | 'Someday';
  tone: 1 | 2 | 3 | 4;
};

export type SampleAtlas = {
  stats: { routes: number; countries: number; km: string; badges: number };
  inProgress?: { title: string; day: number };
  draft?: { title: string; legs: number };
  completedLabel: string;
  routes: SampleRoute[];
};

/** Your own profile, while you have no routes of your own yet. */
export const MY_SAMPLE: SampleAtlas = {
  stats: { routes: 14, countries: 9, km: '6.4k', badges: 11 },
  inProgress: { title: 'Vietnam, south to north', day: 12 },
  draft: { title: 'Penang hawker crawl', legs: 3 },
  completedLabel: 'COMPLETED · 12',
  routes: [
    { title: 'Annapurna, no jeep', meta: 'NEPAL · OCT · 14D', tag: 'WILD ●●●●●', tone: 4 },
    { title: 'Java end to end', meta: 'INDONESIA · JUL · 21D', tag: 'MIXED ●●●○○', tone: 1 },
    { title: 'Bangkok to Saigon', meta: '3 COUNTRIES · JAN · 16D', tag: 'SOCIAL ●●○○○', tone: 3 },
    { title: 'Batam by bike', meta: 'INDONESIA · MAY · 1D', tag: 'CHILL ●○○○○', tone: 2 },
  ],
};

export const MY_SAVED: SampleSaved[] = [
  { title: 'Ha Giang, the long way', who: '@nomadgoblin', meta: 'VIETNAM · MAR · 9D · $$', list: 'Next trip', tone: 1 },
  { title: 'Pamir Highway by any truck', who: '@dustbunny', meta: 'TAJIKISTAN · JUL · 14D · $', list: 'Someday', tone: 2 },
  { title: 'Island hopping the Togeans', who: '@dustbunny', meta: 'INDONESIA · AUG · 8D · $$', list: 'Next trip', tone: 3 },
  { title: 'Laos by slow boat', who: '@saltandsole', meta: 'LAOS · NOV · 3D · $', list: 'Someday', tone: 4 },
];

/** Creators seeded in supabase/seed/people.sql, by username. */
export const CREATOR_SAMPLES: Record<string, SampleAtlas> = {
  nomadgoblin: {
    stats: { routes: 23, countries: 11, km: '9.1k', badges: 17 },
    completedLabel: 'ROUTES · 23',
    routes: [
      { title: 'Ha Giang, the long way', meta: 'VIETNAM · MAR · 9D', tag: 'SCENIC ●●●○○', tone: 1 },
      { title: 'Laos by slow boat', meta: 'LAOS · NOV · 3D', tag: 'CHILL ●○○○○', tone: 3 },
      { title: 'Hoi An by bicycle', meta: 'VIETNAM · FEB · 2D', tag: 'FOODIE ●●○○○', tone: 2 },
      { title: 'Annapurna, no jeep', meta: 'NEPAL · OCT · 14D', tag: 'WILD ●●●●●', tone: 4 },
    ],
  },
  'maya.goes': {
    stats: { routes: 6, countries: 4, km: '2.3k', badges: 7 },
    completedLabel: 'ROUTES · 6',
    routes: [
      { title: 'Laos by slow boat', meta: 'LAOS · NOV · 3D', tag: 'CHILL ●○○○○', tone: 3 },
      { title: 'Luang Prabang loops', meta: 'LAOS · DEC · 4D', tag: 'SCENIC ●●○○○', tone: 1 },
    ],
  },
  saltandsole: {
    stats: { routes: 9, countries: 6, km: '3.8k', badges: 9 },
    completedLabel: 'ROUTES · 9',
    routes: [
      { title: 'Laos by slow boat', meta: 'LAOS · NOV · 3D', tag: 'CHILL ●○○○○', tone: 4 },
      { title: 'Siargao, slowly', meta: 'PHILIPPINES · APR · 6D', tag: 'CHILL ●○○○○', tone: 2 },
    ],
  },
  dustbunny: {
    stats: { routes: 12, countries: 8, km: '7.7k', badges: 12 },
    completedLabel: 'ROUTES · 12',
    routes: [
      { title: 'Pamir Highway by any truck', meta: 'TAJIKISTAN · JUL · 14D', tag: 'WILD ●●●●○', tone: 2 },
      { title: 'Island hopping the Togeans', meta: 'INDONESIA · AUG · 8D', tag: 'CHILL ●○○○○', tone: 3 },
    ],
  },
};

/** Used only by dev preview mode (localhost/?preview), never in a real build. */
export const PREVIEW_PROFILE: MyProfile = {
  id: 'preview',
  username: 'vivi.wanders',
  display_name: 'Vivi',
  avatar_url: null,
  bio: 'Weekend sidequests, month-long detours.',
  home_base: 'Singapore',
  home_country: 'Singapore',
  links: { tiktok: '@vivi.wanders', instagram: '@vivi.wanders' },
  username_changed_at: null,
  appearance: 'system',
  distance_unit: 'km',
  live_default: 'private',
  live_delay: true,
  blur_sleep: true,
  hide_home_city: false,
};
