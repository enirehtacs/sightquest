// Dev preview mode people (localhost/?preview). Real routes come from the
// database; preview mode shows a snapshot of them (data/preview.json).

import type { MyProfile, PublicProfile } from '@/lib/profiles';

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

/** Dev preview mode only: a creator to look at without signing in. */
export const PREVIEW_CREATOR: PublicProfile = {
  // @nomadgoblin's real id, so preview shows her real routes.
  id: '5eed0000-0000-4000-a000-000000000002',
  username: 'nomadgoblin',
  display_name: 'Mai Tran',
  avatar_url: null,
  bio: 'Ex-accountant. Now I count mountains and noodle stalls.',
  home_base: 'Hanoi',
  home_country: 'Vietnam',
  links: { tiktok: '@nomadgoblin', instagram: '@nomadgoblin', youtube: '@nomadgoblin', alltrails: 'nomadgoblin', strava: 'nomadgoblin' },
  follower_count: 3,
  following_count: 1,
};
