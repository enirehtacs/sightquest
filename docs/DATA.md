# Data model (Supabase / Postgres)

Use `uuid` primary keys (`gen_random_uuid()`), plus `created_at timestamptz default now()` and `updated_at` columns. Turn on **RLS on every table**. "Owner" means `auth.uid()`. Treat this as the starting shape: refine it in migrations, but keep the rules.

## Users
**`profiles`**: one row per auth user, created by a trigger on sign-up.
- `id` = auth.users.id
- `username` (unique, citext)
- `display_name`, `avatar_url`, `bio`
- `home_base` (city text), plus `home_country`
- `links` jsonb `{tiktok, instagram, youtube, alltrails, strava}`
- `username_changed_at`
- `appearance` ('system'|'light'|'dark')
- `distance_unit`
- `role` ('user'|'admin')
- `status` ('active'|'warned'|'suspended')
- Privacy settings: `live_default`, `live_delay`, `blur_sleep`, `hide_home_city`
- Notification prefs (jsonb)

RLS:
- Anyone signed in can read public columns.
- Only the owner can update their row.
- `role` and `status` can only be changed by the service role.
- Hide `home_base` when `hide_home_city`: expose a `public_profiles` view.

**`profile_private`**: `user_id`, `sowo_eligible boolean` (the self-declared "I'm a woman", optional), `spotify_refresh_token` (encrypted, or kept in Vault).
- RLS: owner only. Never joined into public views.

**`reserved_usernames`**: `handle`, `user_id`, `released_at` (= change time + 14 days).
- A trigger on a username change checks the 30-day rule and inserts the old handle here.

**`pledges`**: `user_id`, `version`, `accepted_at`.
- Posting needs a row here (enforce it in the RLS insert policies of content tables via a `has_pledged()` helper).

**`follows`**: `follower_id`, `followee_id`. Unique on the pair.

**`blocks`**: `blocker_id`, `blocked_id`.
- Blocked users can't see each other's content, comments or profile.

## Routes
**`routes`**
- `owner_id`, `title`, `slug`
- `status` ('draft'|'live'|'complete')
- `visibility` ('private'|'followers'|'public')
- `live_delay boolean`
- `start_date`, `end_date` (private). `went_month`, `went_year` are public.
- `country_codes text[]`, `continent`
- `budget smallint 1–4`, `effort smallint 1–5`
- `vibes text[]`, `terrain text[]`, `styles text[]`, `modes text[]`, `offbeat` ('comfortable'|'off_the_map'|'few_have_been')
- `best_months int[]`
- `cover_url`
- `stolen_from_route_id`, `steal_count`, `save_count`, `view_count`
- `distance_km`, `geom` (PostGIS line, built from the days)
- `sowo_score numeric`, `sowo_count int` (kept up to date by a trigger)

**`route_builders`**: `route_id`, `user_id`, `role` ('owner'|'co'), `status` ('invited'|'accepted'|'declined').
- At most one co row per route (partial unique index).
- Owner and accepted co can edit the route and everything under it.

**`days`**: `route_id`, `day_number`, `date` (private), `place_name`, `lat`, `lng`, `stay_lat/lng` (blurred to a 2 km area in public reads when `blur_sleep`), `weather`, `note`, `created_by`.

**`legs`**: `day_id`, `mode`, `from_name`, `to_name`, `duration_text`, `note`, `started_at` (for the "Night mover" badge).

**`moments`**: `day_id`, `route_id`, `photo_paths text[]` (max 3), `caption`, `taken_at`, `lat`, `lng`, `starred`, `moderation` ('pending'|'ok'|'hidden').

**`spots`**: `route_id`, `day_id`, `name`, `kind`, `why`, `lat`, `lng`, `elevation_m`.

**`must_knows`**: `route_id`, `category` (key from SPEC section 7, or 'custom'), `custom_label`, `chips text[]`, `note`.

**`trip_tunes`**: `route_id`, `spotify_uri`, `title`, `track_count`, `duration_text`, `note`, `preview_tracks jsonb` (first 3).

**`post_links`**: `route_id`, `day_id` (null = whole route), `platform`, `url`, `thumb_url`, `caption`, `view_count_text`.
- Only Pro users can insert a row with a `day_id` set. Check `is_pro(auth.uid())` in the RLS policy.

**`saves`**: `user_id`, `route_id`, `list` ('next_trip'|'someday').

**`shares`**: `from_user`, `to_user`, `route_id`, `note`. This feeds "Shared with you".

**`route_views`**: `user_id`, `route_id`, `viewed_at`. Feeds Recently viewed and hidden-gem scoring.

**Visibility rule (RLS on routes and every child table).** A row is readable when one of these is true:
- you're a builder; or
- `visibility = 'public'` and status ≠ draft; or
- `visibility = 'followers'` and you follow the owner.

Also: you're not blocked, and if `live_delay` is on, the day's `date` is before today (in the route's local time).

## Community
**`comments`** (Campfire)
- `route_id`, `user_id`, `kind` ('question'|'tip'|'been_here'), `body`
- `parent_id`: only builders of the route may set it, and the parent must be a top-level comment
- `hidden boolean`

**`updates`**
- `route_id`, `spot_id`, `leg_id`, `user_id`, `kind` ('heads_up'|'all_good'|'sorted'), `body`, `photo_paths` (max 2)
- `resolved_by_update_id`, `confirm_count`

**`update_confirms`**: `update_id`, `user_id` (unique).

**`sowo_ratings`**: `route_id`, `user_id`, `answer` ('comfortable'|'stay_alert'|'wouldnt_solo'|'didnt_solo').
- Insert only if `sowo_eligible` AND the user has completed this route (their own route, or a steal of it marked complete).
- Score = comfortable ÷ (all answers except didnt_solo).
- **Approved** when ≥ 80% and count ≥ 5.
- Individual ratings are never readable by anyone except the rater.

**`reports`** (moderation queue)
- `type` ('SIDEQUEST'|'COMMENT'|'UPDATE'|'SOWO'|'USER'|'MOMENT')
- `target_id`, `reporter_id`, `reason`, `status` ('open'|'kept'|'hidden'|'warned')
- `handled_by`, `handled_at`

**`moderation_log`**: `admin_id`, `action`, `target_type`, `target_id`, `note`, `at`.

## Sidequests
**`quests`**: `title`, `brief`, `cover_url`, `starts_at`, `ends_at`, `status` ('draft'|'scheduled'|'live'|'ended'), `created_by`.

**`quest_entries`**: `quest_id`, `user_id`, `story` (required), `photo_paths` (max 3), `when_text`, `featured`, `hidden`, `like_count`.

**`quest_likes`**: `entry_id`, `user_id`.

## Badges
**`badges`**
- `key`, `name`, `icon`, `kind` ('tiered'|'one_off')
- `metric` (e.g. 'distance_km', 'countries', 'boat_legs')
- `thresholds int[3]` (bronze, silver, gold) or a one-off condition
- `is_live`, `sort`

**`user_badges`**: `user_id`, `badge_key`, `level` (0–3), `progress numeric`, `earned_at`.
- Recomputed by a function when a route completes, a day is added, or an update is posted.
- **No metric may count sidequest activity.**

**`personal_bests`**: a view computed from routes, days and legs.

## Notifications
**`notifications`**: `user_id`, `type`, `actor_id`, `route_id`, `payload jsonb`, `read_at`.
- Created by DB triggers or Edge Functions. Push is sent by an Edge Function that respects the user's prefs.
- Reads are paged: 10 at a time.

**`push_tokens`**: `user_id`, `token`, `platform`.

## Money
**`subscriptions`**: `user_id`, `status` ('trial'|'active'|'cancelled'|'expired'), `plan` ('monthly'|'yearly'), `platform`, `expires_at`.
- Written only by a RevenueCat webhook (Edge Function using the service role).
- `is_pro(uid)` = status in (trial, active) and `expires_at` > now().

**`promo_codes`** (admin, later).

## Admin
**`admin_tasks`**
- `title`, `due_at`
- `auto_rule` (e.g. 'quest_scheduled_for_next_week', 'moderation_queue_empty'), or null for manual tasks
- `done_at`, `done_by`
- A cron job or trigger marks auto tasks done when the rule becomes true.

## Unpacked
**`unpacked`**: `user_id`, `year`, `data jsonb`, `generated_at`.
- Generated by cron on 30 Nov.
- RLS: owner only, AND the current date is between 1 Dec and 15 Jan.

## Storage buckets
- `avatars` (public read)
- `moments` (read follows the route's visibility, via signed URLs)
- `updates`
- `quests`
- `covers`

Strip EXIF GPS from uploaded images **after** reading it on the device; store location only in the DB columns. Max 2048px on the long edge, WebP or JPEG at about 80% quality.

## Scheduled jobs (Supabase cron)
- Hourly: publish scheduled quests and end old ones; auto-complete admin tasks.
- Daily: expire stale heads-ups (60 days without a confirm); recompute recommendations; release reserved usernames.
- 30 Nov: generate Unpacked.

## Edge Functions
- `revenuecat-webhook`
- `send-push`
- `image-safety` (scans new uploads and flags items for moderation)
- `link-preview` (fetches the oEmbed thumbnail for IG, TikTok and YouTube)
- `spotify-auth` / `spotify-playlist`
- `delete-account`
- `export-data` / `export-gpx`
- `render-reel` (later)
