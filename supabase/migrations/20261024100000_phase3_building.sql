-- Phase 3: building routes (docs/ROADMAP.md → Phase 3).
-- Builders (the owner and an accepted co-builder) can now write their routes:
-- days, legs, moments, spots, must-knows, trip tunes and linked posts.
-- Adds: profile_private (the private SOWO opt-in), sowo_ratings, post_links,
-- the "blur where I sleep" rule, a private moments photo bucket, and an RPC
-- that gives builders their own private dates and exact pins.
-- RLS is on, with explicit policies, for every new table.

-- ── Small helpers ──────────────────────────────────────────────────
-- The route a day belongs to (for policies on legs and moments).
create or replace function public.day_route(p_day uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select route_id from public.days where id = p_day;
$$;

-- '…' → uuid, or null when it isn't one (storage folder names).
create or replace function public.try_uuid(p text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return p::uuid;
exception when others then
  return null;
end;
$$;

-- Builders who took the pledge may write.
create or replace function public.can_build(p_route uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_route_builder(p_route) and public.has_pledged(auth.uid());
$$;

revoke all on function public.day_route(uuid) from public, anon;
revoke all on function public.can_build(uuid) from public, anon;
grant execute on function public.day_route(uuid) to authenticated;
grant execute on function public.can_build(uuid) to authenticated;
grant execute on function public.try_uuid(text) to authenticated;

-- ── Private SOWO opt-in ("I'm a woman"): never public ──────────────
-- Asked once during sign-up (optional), changeable in Settings → Privacy.
-- Only used to decide who may rate SOWO. Never joined into any public view.
create table public.profile_private (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  sowo_eligible boolean,
  answered_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger profile_private_set_updated_at
  before update on public.profile_private
  for each row execute function public.set_updated_at();

alter table public.profile_private enable row level security;

create policy "profile_private: owner can read"
  on public.profile_private for select to authenticated
  using (user_id = (select auth.uid()));
create policy "profile_private: owner can create"
  on public.profile_private for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "profile_private: owner can change"
  on public.profile_private for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.profile_private from anon, authenticated;
grant select, insert on public.profile_private to authenticated;
grant update (sowo_eligible, answered_at) on public.profile_private to authenticated;

create or replace function public.is_sowo_eligible(p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select sowo_eligible from public.profile_private where user_id = p_uid), false);
$$;
revoke all on function public.is_sowo_eligible(uuid) from public, anon;
grant execute on function public.is_sowo_eligible(uuid) to authenticated;

-- ── Routes: builders write ─────────────────────────────────────────
-- Per-route copy of "Blur where I sleep" (starts from the profile setting).
alter table public.routes add column blur_sleep boolean not null default true;
grant select (blur_sleep) on public.routes to authenticated;

-- The owner always matches by column (no lookup), so a brand-new route is
-- readable by its owner within the same request.
drop policy "routes: visibility rule" on public.routes;
create policy "routes: visibility rule"
  on public.routes for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    or public.is_route_builder(id)
    or (
      status <> 'draft'
      and not public.is_blocked((select auth.uid()), owner_id)
      and (visibility = 'public' or (visibility = 'followers' and public.i_follow(owner_id)))
    )
  );

create policy "routes: create your own (after the pledge)"
  on public.routes for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.has_pledged((select auth.uid())));

create policy "routes: builders edit"
  on public.routes for update to authenticated
  using (public.is_route_builder(id))
  with check (public.is_route_builder(id));

create policy "routes: the owner deletes"
  on public.routes for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Counters, SOWO and the owner are never written by the app.
grant insert (
  id, owner_id, title, slug, status, visibility, live_delay, blur_sleep, timezone,
  start_date, end_date, went_month, went_year, country_codes, continent, budget, effort,
  vibes, terrain, styles, modes, offbeat, best_months, weather_note, season_note, cover_url
) on public.routes to authenticated;
grant update (
  title, slug, status, visibility, live_delay, blur_sleep, timezone,
  start_date, end_date, went_month, went_year, country_codes, continent, budget, effort,
  vibes, terrain, styles, modes, offbeat, best_months, weather_note, season_note, cover_url
) on public.routes to authenticated;
grant delete on public.routes to authenticated;

-- ── Days: builders write; "blur where I sleep" ─────────────────────
-- When blur is on, the exact pin goes into the private stay_lat/stay_lng and
-- the public lat/lng becomes the centre of a ~2 km square. Builders read the
-- exact pins with route_private() below.
create or replace function public.blur_day()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  blur boolean;
  step double precision := 0.018; -- ~2 km of latitude
begin
  select r.blur_sleep into blur from public.routes r where r.id = new.route_id;
  if tg_op = 'UPDATE' and new.lat is not distinct from old.lat and new.lng is not distinct from old.lng then
    return new;
  end if;
  if new.lat is null or new.lng is null then
    new.stay_lat := null;
    new.stay_lng := null;
  elsif blur then
    new.stay_lat := new.lat;
    new.stay_lng := new.lng;
    new.lat := round((new.lat / step)::numeric) * step;
    new.lng := round((new.lng / (step / greatest(cos(radians(new.lat)), 0.1)))::numeric) * (step / greatest(cos(radians(new.lat)), 0.1));
  else
    new.stay_lat := null;
    new.stay_lng := null;
  end if;
  return new;
end;
$$;

create trigger days_blur
  before insert or update of lat, lng on public.days
  for each row execute function public.blur_day();

create policy "days: builders add"
  on public.days for insert to authenticated
  with check (public.can_build(route_id));
create policy "days: builders edit"
  on public.days for update to authenticated
  using (public.can_build(route_id))
  with check (public.can_build(route_id));
create policy "days: builders delete"
  on public.days for delete to authenticated
  using (public.can_build(route_id));

grant insert (id, route_id, day_number, date, place_name, lat, lng, weather, note, created_by) on public.days to authenticated;
grant update (day_number, date, place_name, lat, lng, weather, note) on public.days to authenticated;
grant delete on public.days to authenticated;

-- ── Legs ───────────────────────────────────────────────────────────
create policy "legs: builders add"
  on public.legs for insert to authenticated
  with check (public.can_build(public.day_route(day_id)));
create policy "legs: builders edit"
  on public.legs for update to authenticated
  using (public.can_build(public.day_route(day_id)))
  with check (public.can_build(public.day_route(day_id)));
create policy "legs: builders delete"
  on public.legs for delete to authenticated
  using (public.can_build(public.day_route(day_id)));

grant insert (id, day_id, sort, mode, from_name, to_name, duration_text, note, started_at) on public.legs to authenticated;
grant update (sort, mode, from_name, to_name, duration_text, note, started_at) on public.legs to authenticated;
grant delete on public.legs to authenticated;

-- ── Moments ────────────────────────────────────────────────────────
-- Until the image-safety scan (Phase 4), new moments are visible right away.
alter table public.moments alter column moderation set default 'ok';

create policy "moments: builders add"
  on public.moments for insert to authenticated
  with check (public.can_build(route_id) and public.day_route(day_id) = route_id);
create policy "moments: builders edit"
  on public.moments for update to authenticated
  using (public.can_build(route_id))
  with check (public.can_build(route_id) and public.day_route(day_id) = route_id);
create policy "moments: builders delete"
  on public.moments for delete to authenticated
  using (public.can_build(route_id));

grant insert (id, day_id, route_id, photo_paths, caption, tag, taken_at, local_time, lat, lng, starred) on public.moments to authenticated;
grant update (day_id, photo_paths, caption, tag, local_time, lat, lng, starred) on public.moments to authenticated;
grant delete on public.moments to authenticated;

-- ── Spots ──────────────────────────────────────────────────────────
-- The full list of kinds from the Spots editor (EditPlace.dc.html).
alter table public.spots drop constraint if exists spots_kind_check;
alter table public.spots add constraint spots_kind_check check (kind in (
  'food','cafe','bar','arts','history','culture','entertainment','wellness','viewpoint',
  'beach','hike','shopping','accommodation','market','nightlife','transport','other'));

create policy "spots: builders add"
  on public.spots for insert to authenticated
  with check (public.can_build(route_id) and (day_id is null or public.day_route(day_id) = route_id));
create policy "spots: builders edit"
  on public.spots for update to authenticated
  using (public.can_build(route_id))
  with check (public.can_build(route_id) and (day_id is null or public.day_route(day_id) = route_id));
create policy "spots: builders delete"
  on public.spots for delete to authenticated
  using (public.can_build(route_id));

grant insert, update, delete on public.spots to authenticated;

-- ── Must-knows ─────────────────────────────────────────────────────
create policy "must_knows: builders add"
  on public.must_knows for insert to authenticated
  with check (public.can_build(route_id));
create policy "must_knows: builders edit"
  on public.must_knows for update to authenticated
  using (public.can_build(route_id))
  with check (public.can_build(route_id));
create policy "must_knows: builders delete"
  on public.must_knows for delete to authenticated
  using (public.can_build(route_id));

grant insert, update, delete on public.must_knows to authenticated;

-- ── Trip tunes ─────────────────────────────────────────────────────
create policy "trip_tunes: builders add"
  on public.trip_tunes for insert to authenticated
  with check (public.can_build(route_id));
create policy "trip_tunes: builders edit"
  on public.trip_tunes for update to authenticated
  using (public.can_build(route_id))
  with check (public.can_build(route_id));
create policy "trip_tunes: builders delete"
  on public.trip_tunes for delete to authenticated
  using (public.can_build(route_id));

grant insert, update, delete on public.trip_tunes to authenticated;

-- ── Linked posts (Instagram, TikTok, YouTube) ──────────────────────
-- Linking to a single day is a Pro feature in Phase 8; no gating yet.
create table public.post_links (
  id         uuid primary key default gen_random_uuid(),
  route_id   uuid not null references public.routes (id) on delete cascade,
  day_id     uuid references public.days (id) on delete cascade,
  platform   text not null check (platform in ('instagram','tiktok','youtube')),
  url        text not null check (url ~* '^https://([a-z0-9-]+\.)*(instagram\.com|tiktok\.com|youtube\.com|youtu\.be)/'),
  caption    text check (char_length(caption) <= 200),
  thumb_url  text,
  view_count_text text check (char_length(view_count_text) <= 20),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index post_links_route_idx on public.post_links (route_id);

create trigger post_links_set_updated_at
  before update on public.post_links
  for each row execute function public.set_updated_at();

alter table public.post_links enable row level security;

create policy "post_links: readable with the route (and their day)"
  on public.post_links for select to authenticated
  using (public.can_read_route(route_id) and (day_id is null or public.can_read_day(day_id)));
create policy "post_links: builders add"
  on public.post_links for insert to authenticated
  with check (public.can_build(route_id) and (day_id is null or public.day_route(day_id) = route_id));
create policy "post_links: builders edit"
  on public.post_links for update to authenticated
  using (public.can_build(route_id))
  with check (public.can_build(route_id) and (day_id is null or public.day_route(day_id) = route_id));
create policy "post_links: builders delete"
  on public.post_links for delete to authenticated
  using (public.can_build(route_id));

revoke all on public.post_links from anon, authenticated;
grant select on public.post_links to authenticated;
grant insert (id, route_id, day_id, platform, url, caption, thumb_url, view_count_text, created_by) on public.post_links to authenticated;
grant update (day_id, caption) on public.post_links to authenticated;
grant delete on public.post_links to authenticated;

-- ── SOWO ratings ───────────────────────────────────────────────────
-- Only someone who said privately that they're a woman, about a route they
-- built and marked complete. (Remixes count too once Remix exists, Phase 4.)
-- Nobody but the rater can read a rating. The score trigger is Phase 4.
create table public.sowo_ratings (
  route_id   uuid not null references public.routes (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  answer     text not null check (answer in ('comfortable','stay_alert','wouldnt_solo','didnt_solo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (route_id, user_id)
);

create trigger sowo_ratings_set_updated_at
  before update on public.sowo_ratings
  for each row execute function public.set_updated_at();

alter table public.sowo_ratings enable row level security;

create policy "sowo_ratings: rater reads their own"
  on public.sowo_ratings for select to authenticated
  using (user_id = (select auth.uid()));
create policy "sowo_ratings: eligible builders of a completed route rate"
  on public.sowo_ratings for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_sowo_eligible((select auth.uid()))
    and public.is_route_builder(route_id)
    and exists (select 1 from public.routes r where r.id = route_id and r.status = 'complete')
  );
create policy "sowo_ratings: change your answer"
  on public.sowo_ratings for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.is_sowo_eligible((select auth.uid())));

revoke all on public.sowo_ratings from anon, authenticated;
grant select, insert on public.sowo_ratings to authenticated;
grant update (answer) on public.sowo_ratings to authenticated;

-- ── Builders' private view of their route ──────────────────────────
-- Exact dates and exact pins, which everyone else can't select.
create or replace function public.route_private(p_route uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.is_route_builder(p_route) then
    jsonb_build_object(
      'start_date', r.start_date,
      'end_date', r.end_date,
      'days', coalesce((
        select jsonb_agg(jsonb_build_object('id', d.id, 'date', d.date,
                 'lat', coalesce(d.stay_lat, d.lat), 'lng', coalesce(d.stay_lng, d.lng)) order by d.day_number)
        from public.days d where d.route_id = r.id), '[]'::jsonb))
  end
  from public.routes r where r.id = p_route;
$$;
revoke all on function public.route_private(uuid) from public, anon;
grant execute on function public.route_private(uuid) to authenticated;

-- ── Moment photos: private bucket, path = {route_id}/{file} ────────
-- Builders upload; anyone who can read the route can read (signed URLs).
-- Photos are shrunk and stripped of location on the phone before upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('moments', 'moments', false, 5 * 1024 * 1024, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "moments bucket: builders upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'moments' and public.can_build(public.try_uuid((storage.foldername(name))[1])));

create policy "moments bucket: readable with the route"
  on storage.objects for select to authenticated
  using (bucket_id = 'moments' and public.can_read_route(public.try_uuid((storage.foldername(name))[1])));

create policy "moments bucket: builders delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'moments' and public.can_build(public.try_uuid((storage.foldername(name))[1])));
