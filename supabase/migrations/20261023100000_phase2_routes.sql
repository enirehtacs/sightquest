-- Phase 2: routes you can read (docs/DATA.md → Routes).
-- Adds countries, routes, route_builders, days, legs, spots, must_knows,
-- moments (read only for now), trip_tunes, saves and route_views, plus the
-- visibility rule, the route_cards view and the Explore/Search queries.
-- RLS is on, with explicit policies, for every table here.
--
-- Writing routes (the builder) arrives in Phase 3, so content tables only get
-- read policies here. Saves and route views are the only things the app writes.
--
-- Private columns (exact dates, where you sleep, when a photo was taken) are
-- kept out of reach with column grants: the app can't select them at all.

-- ── Helpers ────────────────────────────────────────────────────────
-- Distance in km between two points (haversine). Good enough for "nearby".
create or replace function public.km_between(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision
language sql
immutable
parallel safe
set search_path = ''
as $$
  select 6371 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- ── Countries (reference data) ─────────────────────────────────────
create table public.countries (
  code      text primary key check (code ~ '^[A-Z]{2}$'),
  name      text not null,
  continent text not null check (continent in ('Asia','Europe','Africa','North America','South America','Oceania','Antarctica'))
);

alter table public.countries enable row level security;

create policy "countries: signed-in users can read"
  on public.countries for select
  to authenticated
  using (true);

revoke all on public.countries from anon, authenticated;
grant select on public.countries to authenticated;

insert into public.countries (code, name, continent) values
  ('AF','Afghanistan','Asia'), ('AL','Albania','Europe'), ('AR','Argentina','South America'),
  ('AM','Armenia','Asia'), ('AU','Australia','Oceania'), ('AT','Austria','Europe'),
  ('AZ','Azerbaijan','Asia'), ('BD','Bangladesh','Asia'), ('BE','Belgium','Europe'),
  ('BT','Bhutan','Asia'), ('BO','Bolivia','South America'), ('BA','Bosnia and Herzegovina','Europe'),
  ('BW','Botswana','Africa'), ('BR','Brazil','South America'), ('BN','Brunei','Asia'),
  ('BG','Bulgaria','Europe'), ('KH','Cambodia','Asia'), ('CA','Canada','North America'),
  ('CL','Chile','South America'), ('CN','China','Asia'), ('CO','Colombia','South America'),
  ('CR','Costa Rica','North America'), ('HR','Croatia','Europe'), ('CU','Cuba','North America'),
  ('CZ','Czechia','Europe'), ('DK','Denmark','Europe'), ('EC','Ecuador','South America'),
  ('EG','Egypt','Africa'), ('EE','Estonia','Europe'), ('ET','Ethiopia','Africa'),
  ('FJ','Fiji','Oceania'), ('FI','Finland','Europe'), ('FR','France','Europe'),
  ('GE','Georgia','Asia'), ('DE','Germany','Europe'), ('GH','Ghana','Africa'),
  ('GR','Greece','Europe'), ('GT','Guatemala','North America'), ('HU','Hungary','Europe'),
  ('IS','Iceland','Europe'), ('IN','India','Asia'), ('ID','Indonesia','Asia'),
  ('IE','Ireland','Europe'), ('IL','Israel','Asia'), ('IT','Italy','Europe'),
  ('JP','Japan','Asia'), ('JO','Jordan','Asia'), ('KZ','Kazakhstan','Asia'),
  ('KE','Kenya','Africa'), ('KG','Kyrgyzstan','Asia'), ('LA','Laos','Asia'),
  ('LV','Latvia','Europe'), ('LT','Lithuania','Europe'), ('MG','Madagascar','Africa'),
  ('MY','Malaysia','Asia'), ('MV','Maldives','Asia'), ('MX','Mexico','North America'),
  ('MN','Mongolia','Asia'), ('ME','Montenegro','Europe'), ('MA','Morocco','Africa'),
  ('MZ','Mozambique','Africa'), ('MM','Myanmar','Asia'), ('NA','Namibia','Africa'),
  ('NP','Nepal','Asia'), ('NL','Netherlands','Europe'), ('NZ','New Zealand','Oceania'),
  ('NI','Nicaragua','North America'), ('NO','Norway','Europe'), ('OM','Oman','Asia'),
  ('PK','Pakistan','Asia'), ('PA','Panama','North America'), ('PG','Papua New Guinea','Oceania'),
  ('PY','Paraguay','South America'), ('PE','Peru','South America'), ('PH','Philippines','Asia'),
  ('PL','Poland','Europe'), ('PT','Portugal','Europe'), ('RO','Romania','Europe'),
  ('RW','Rwanda','Africa'), ('WS','Samoa','Oceania'), ('SN','Senegal','Africa'),
  ('RS','Serbia','Europe'), ('SG','Singapore','Asia'), ('SK','Slovakia','Europe'),
  ('SI','Slovenia','Europe'), ('ZA','South Africa','Africa'), ('KR','South Korea','Asia'),
  ('ES','Spain','Europe'), ('LK','Sri Lanka','Asia'), ('SE','Sweden','Europe'),
  ('CH','Switzerland','Europe'), ('TW','Taiwan','Asia'), ('TJ','Tajikistan','Asia'),
  ('TZ','Tanzania','Africa'), ('TH','Thailand','Asia'), ('TL','Timor-Leste','Asia'),
  ('TO','Tonga','Oceania'), ('TN','Tunisia','Africa'), ('TR','Türkiye','Asia'),
  ('UG','Uganda','Africa'), ('GB','United Kingdom','Europe'), ('US','United States','North America'),
  ('UY','Uruguay','South America'), ('UZ','Uzbekistan','Asia'), ('VU','Vanuatu','Oceania'),
  ('VN','Vietnam','Asia'), ('ZM','Zambia','Africa'), ('ZW','Zimbabwe','Africa'),
  ('AQ','Antarctica','Antarctica')
on conflict (code) do nothing;

-- ── Routes ─────────────────────────────────────────────────────────
create table public.routes (
  id                   uuid primary key default gen_random_uuid(),
  owner_id             uuid not null references auth.users (id) on delete cascade,
  title                text not null check (char_length(title) between 1 and 80),
  slug                 text not null check (slug ~ '^[a-z0-9-]{1,90}$'),
  status               text not null default 'draft' check (status in ('draft','live','complete')),
  visibility           text not null default 'private' check (visibility in ('private','followers','public')),
  -- "People see yesterday, never today" while the route is live.
  live_delay           boolean not null default false,
  -- The route's local time, for the delay rule.
  timezone             text not null default 'UTC',
  -- Private: only builders see exact dates (column grants below).
  start_date           date,
  end_date             date,
  -- Public: the month and year you went.
  went_month           smallint check (went_month between 1 and 12),
  went_year            smallint check (went_year between 1990 and 2100),
  country_codes        text[] not null default '{}',
  continent            text check (continent in ('Asia','Europe','Africa','North America','South America','Oceania','Antarctica')),
  budget               smallint check (budget between 1 and 4),
  effort               smallint check (effort between 1 and 5),
  vibes                text[] not null default '{}'
                         check (vibes <@ array['chill','scenic','wild','foodie','social','romantic','mixed']),
  terrain              text[] not null default '{}'
                         check (terrain <@ array['mountains','beaches','islands','jungle','desert','snow','rivers','cities']),
  styles               text[] not null default '{}'
                         check (styles <@ array['slow_travel','road_trip','hikey','citey']),
  modes                text[] not null default '{}'
                         check (modes <@ array['walk','bicycle','moto','bus','train','boat','plane','hitch','horse']),
  offbeat              text check (offbeat in ('comfortable','off_the_map','few_have_been')),
  best_months          smallint[] not null default '{}',
  -- "Went in March. Mostly sunny…" at the top of the itinerary.
  weather_note         text check (char_length(weather_note) <= 240),
  -- Short chip for "Best in {month}" cards, e.g. "DRY SEASON".
  season_note          text check (char_length(season_note) <= 24),
  cover_url            text,
  stolen_from_route_id uuid references public.routes (id) on delete set null,
  steal_count          int not null default 0,
  save_count           int not null default 0,
  view_count           int not null default 0,
  distance_km          numeric(8,1),
  sowo_score           numeric(5,2),
  sowo_count           int not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (owner_id, slug)
);

create index routes_owner_idx on public.routes (owner_id);
create index routes_best_months_idx on public.routes using gin (best_months);

create trigger routes_set_updated_at
  before update on public.routes
  for each row execute function public.set_updated_at();

-- ── Route builders (owner + at most one co-builder) ────────────────
create table public.route_builders (
  route_id   uuid not null references public.routes (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('owner','co')),
  status     text not null default 'invited' check (status in ('invited','accepted','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (route_id, user_id)
);

-- Max one co-builder per route (a declined invite doesn't count).
create unique index route_builders_one_co
  on public.route_builders (route_id)
  where role = 'co' and status in ('invited','accepted');
create index route_builders_user_idx on public.route_builders (user_id);

create trigger route_builders_set_updated_at
  before update on public.route_builders
  for each row execute function public.set_updated_at();

-- The owner is always a builder.
create or replace function public.add_owner_builder()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.route_builders (route_id, user_id, role, status)
  values (new.id, new.owner_id, 'owner', 'accepted')
  on conflict (route_id, user_id) do nothing;
  return new;
end;
$$;

create trigger routes_add_owner_builder
  after insert on public.routes
  for each row execute function public.add_owner_builder();

-- ── The visibility rule ────────────────────────────────────────────
-- Owner or accepted co-builder?
create or replace function public.is_route_builder(p_route uuid, p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.routes r where r.id = p_route and r.owner_id = p_uid)
      or exists (select 1 from public.route_builders b
                 where b.route_id = p_route and b.user_id = p_uid and b.status = 'accepted');
$$;

-- Does the signed-in person follow this user?
create or replace function public.i_follow(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.follows f
                 where f.follower_id = auth.uid() and f.followee_id = p_user);
$$;

-- A route is readable when you build it, or it isn't a draft and it's public
-- (or followers-only and you follow the owner) and nobody blocked anybody.
create or replace function public.can_read_route(p_route uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.routes r
    where r.id = p_route
      and (
        public.is_route_builder(r.id)
        or (
          r.status <> 'draft'
          and not public.is_blocked(auth.uid(), r.owner_id)
          and (r.visibility = 'public' or (r.visibility = 'followers' and public.i_follow(r.owner_id)))
        )
      )
  );
$$;

alter table public.routes enable row level security;

create policy "routes: visibility rule"
  on public.routes for select
  to authenticated
  using (
    public.is_route_builder(id)
    or (
      status <> 'draft'
      and not public.is_blocked((select auth.uid()), owner_id)
      and (visibility = 'public' or (visibility = 'followers' and public.i_follow(owner_id)))
    )
  );

revoke all on public.routes from anon, authenticated;
-- Everything except the exact dates.
grant select (
  id, owner_id, title, slug, status, visibility, live_delay, timezone,
  went_month, went_year, country_codes, continent, budget, effort,
  vibes, terrain, styles, modes, offbeat, best_months, weather_note, season_note,
  cover_url, stolen_from_route_id, steal_count, save_count, view_count,
  distance_km, sowo_score, sowo_count, created_at, updated_at
) on public.routes to authenticated;

alter table public.route_builders enable row level security;

-- Who built a route is public with the route ("With @maya.goes").
-- You can also see your own invites.
create policy "route_builders: readable with the route"
  on public.route_builders for select
  to authenticated
  using (user_id = (select auth.uid()) or public.can_read_route(route_id));

revoke all on public.route_builders from anon, authenticated;
grant select on public.route_builders to authenticated;

-- ── Days ───────────────────────────────────────────────────────────
create table public.days (
  id          uuid primary key default gen_random_uuid(),
  route_id    uuid not null references public.routes (id) on delete cascade,
  day_number  smallint not null check (day_number between 1 and 400),
  -- Private: others see "Day 1, Day 2…".
  date        date,
  place_name  text not null check (char_length(place_name) between 1 and 80),
  lat         double precision check (lat between -90 and 90),
  lng         double precision check (lng between -180 and 180),
  -- Private for now (Phase 3 adds a blurred 2 km version for public reads).
  stay_lat    double precision check (stay_lat between -90 and 90),
  stay_lng    double precision check (stay_lng between -180 and 180),
  weather     text check (weather in ('sunny','cloudy','rainy','stormy','misty','hot','cold')),
  note        text check (char_length(note) <= 280),
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (route_id, day_number)
);

create trigger days_set_updated_at
  before update on public.days
  for each row execute function public.set_updated_at();

-- A day is readable when its route is, and (if the delay is on) the day is
-- before today in the route's local time. Builders always see every day.
create or replace function public.can_read_day(p_day uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.days d
    join public.routes r on r.id = d.route_id
    where d.id = p_day
      and public.can_read_route(r.id)
      and (
        not r.live_delay
        or d.date is null
        or d.date < (now() at time zone r.timezone)::date
        or public.is_route_builder(r.id)
      )
  );
$$;

alter table public.days enable row level security;

create policy "days: visibility rule + live delay"
  on public.days for select
  to authenticated
  using (public.can_read_day(id));

revoke all on public.days from anon, authenticated;
grant select (
  id, route_id, day_number, place_name, lat, lng, weather, note, created_by, created_at, updated_at
) on public.days to authenticated;

-- ── Legs (how you got there) ───────────────────────────────────────
create table public.legs (
  id            uuid primary key default gen_random_uuid(),
  day_id        uuid not null references public.days (id) on delete cascade,
  sort          smallint not null default 0,
  mode          text not null check (mode in ('stayed','day_trip','walk','bicycle','moto','bus','train','boat','plane','hitch','horse')),
  from_name     text check (char_length(from_name) <= 80),
  to_name       text check (char_length(to_name) <= 80),
  duration_text text check (char_length(duration_text) <= 20),
  note          text check (char_length(note) <= 280),
  -- For the "Night mover" badge later. Private like every exact time.
  started_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index legs_day_idx on public.legs (day_id);

create trigger legs_set_updated_at
  before update on public.legs
  for each row execute function public.set_updated_at();

alter table public.legs enable row level security;

create policy "legs: readable with their day"
  on public.legs for select
  to authenticated
  using (public.can_read_day(day_id));

revoke all on public.legs from anon, authenticated;
grant select (
  id, day_id, sort, mode, from_name, to_name, duration_text, note, created_at, updated_at
) on public.legs to authenticated;

-- ── Moments (photos with a story; read only until Phase 3) ─────────
create table public.moments (
  id          uuid primary key default gen_random_uuid(),
  day_id      uuid not null references public.days (id) on delete cascade,
  route_id    uuid not null references public.routes (id) on delete cascade,
  photo_paths text[] not null default '{}' check (cardinality(photo_paths) <= 3),
  caption     text check (char_length(caption) <= 400),
  -- FOOD, VIEWPOINT…: the little tag on the photo.
  tag         text check (tag ~ '^[A-Z ]{2,16}$'),
  -- Private: the full timestamp would give away the exact date.
  taken_at    timestamptz,
  -- Public: the local time of day ("6:30am").
  local_time  time,
  lat         double precision check (lat between -90 and 90),
  lng         double precision check (lng between -180 and 180),
  starred     boolean not null default false,
  moderation  text not null default 'pending' check (moderation in ('pending','ok','hidden')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index moments_route_idx on public.moments (route_id);
create index moments_day_idx on public.moments (day_id);

create trigger moments_set_updated_at
  before update on public.moments
  for each row execute function public.set_updated_at();

alter table public.moments enable row level security;

-- Readable with their day, once moderation passed (builders see their own).
create policy "moments: readable with their day"
  on public.moments for select
  to authenticated
  using (
    public.can_read_day(day_id)
    and (moderation = 'ok' or public.is_route_builder(route_id))
  );

revoke all on public.moments from anon, authenticated;
grant select (
  id, day_id, route_id, photo_paths, caption, tag, local_time, lat, lng, starred, moderation, created_at, updated_at
) on public.moments to authenticated;

-- ── Spots (recommended places) ─────────────────────────────────────
create table public.spots (
  id          uuid primary key default gen_random_uuid(),
  route_id    uuid not null references public.routes (id) on delete cascade,
  day_id      uuid references public.days (id) on delete set null,
  sort        smallint not null default 0,
  name        text not null check (char_length(name) between 1 and 80),
  kind        text not null check (kind in ('accommodation','viewpoint','food','cafe','hike','culture','market','beach','nightlife','transport','other')),
  why         text check (char_length(why) <= 200),
  where_name  text check (char_length(where_name) <= 80),
  lat         double precision check (lat between -90 and 90),
  lng         double precision check (lng between -180 and 180),
  elevation_m int,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index spots_route_idx on public.spots (route_id);

create trigger spots_set_updated_at
  before update on public.spots
  for each row execute function public.set_updated_at();

alter table public.spots enable row level security;

create policy "spots: readable with the route (and their day)"
  on public.spots for select
  to authenticated
  using (public.can_read_route(route_id) and (day_id is null or public.can_read_day(day_id)));

revoke all on public.spots from anon, authenticated;
grant select on public.spots to authenticated;

-- ── Must-knows (SPEC section 7) ────────────────────────────────────
create table public.must_knows (
  id           uuid primary key default gen_random_uuid(),
  route_id     uuid not null references public.routes (id) on delete cascade,
  category     text not null check (category in ('visa','permits','wheels','cash','sim','book','roads','water','scams','dress','wildlife','pack','custom')),
  custom_label text check (char_length(custom_label) <= 30),
  chips        text[] not null default '{}',
  note         text check (char_length(note) <= 280),
  sort         smallint not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check ((category = 'custom') = (custom_label is not null))
);

-- One card per standard category on a route; custom ones can repeat.
create unique index must_knows_one_per_category
  on public.must_knows (route_id, category) where category <> 'custom';

create trigger must_knows_set_updated_at
  before update on public.must_knows
  for each row execute function public.set_updated_at();

alter table public.must_knows enable row level security;

create policy "must_knows: readable with the route"
  on public.must_knows for select
  to authenticated
  using (public.can_read_route(route_id));

revoke all on public.must_knows from anon, authenticated;
grant select on public.must_knows to authenticated;

-- ── Trip tunes (static until Spotify connect in Phase 8) ───────────
create table public.trip_tunes (
  id             uuid primary key default gen_random_uuid(),
  route_id       uuid not null unique references public.routes (id) on delete cascade,
  kind           text not null default 'playlist' check (kind in ('playlist','track')),
  spotify_url    text not null check (spotify_url ~ '^https://open\.spotify\.com/'),
  title          text not null check (char_length(title) <= 80),
  track_count    int,
  duration_text  text check (char_length(duration_text) <= 20),
  note           text check (char_length(note) <= 200),
  -- First 3 tracks: [{ "title", "artist", "length" }]
  preview_tracks jsonb not null default '[]'::jsonb check (jsonb_typeof(preview_tracks) = 'array'),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger trip_tunes_set_updated_at
  before update on public.trip_tunes
  for each row execute function public.set_updated_at();

alter table public.trip_tunes enable row level security;

create policy "trip_tunes: readable with the route"
  on public.trip_tunes for select
  to authenticated
  using (public.can_read_route(route_id));

revoke all on public.trip_tunes from anon, authenticated;
grant select on public.trip_tunes to authenticated;

-- ── Saves (Next trip / Someday) ────────────────────────────────────
create table public.saves (
  user_id    uuid not null references auth.users (id) on delete cascade,
  route_id   uuid not null references public.routes (id) on delete cascade,
  list       text not null default 'next_trip' check (list in ('next_trip','someday')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, route_id)
);

create index saves_route_idx on public.saves (route_id);

create trigger saves_set_updated_at
  before update on public.saves
  for each row execute function public.set_updated_at();

alter table public.saves enable row level security;

-- Your saves are yours alone. You can only save a route you can see.
create policy "saves: owner can read"
  on public.saves for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "saves: save a route you can see"
  on public.saves for insert
  to authenticated
  with check (user_id = (select auth.uid()) and public.can_read_route(route_id));

create policy "saves: move between lists"
  on public.saves for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "saves: unsave"
  on public.saves for delete
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.saves from anon, authenticated;
grant select, insert, delete on public.saves to authenticated;
grant update (list) on public.saves to authenticated;

-- Keep routes.save_count in step.
create or replace function public.bump_save_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.routes set save_count = save_count + 1 where id = new.route_id;
  elsif tg_op = 'DELETE' then
    update public.routes set save_count = greatest(save_count - 1, 0) where id = old.route_id;
  end if;
  return null;
end;
$$;

create trigger saves_bump_count
  after insert or delete on public.saves
  for each row execute function public.bump_save_count();

-- ── Route views (Recently viewed + hidden-gem scoring) ─────────────
create table public.route_views (
  user_id   uuid not null references auth.users (id) on delete cascade,
  route_id  uuid not null references public.routes (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, route_id)
);

create index route_views_recent_idx on public.route_views (user_id, viewed_at desc);

alter table public.route_views enable row level security;

create policy "route_views: owner can read"
  on public.route_views for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Writes go through record_route_view() below. "Clear" deletes your own rows.
create policy "route_views: clear your own"
  on public.route_views for delete
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.route_views from anon, authenticated;
grant select, delete on public.route_views to authenticated;

-- Opened a route: remember it for Recently viewed, and count a new viewer.
-- (Clearing your list doesn't lower the count: view_count is unique viewers ever.)
create table public.route_viewers (
  user_id  uuid not null references auth.users (id) on delete cascade,
  route_id uuid not null references public.routes (id) on delete cascade,
  primary key (user_id, route_id)
);

alter table public.route_viewers enable row level security;
-- No policies: nobody reads or writes this directly, only record_route_view().
revoke all on public.route_viewers from anon, authenticated;

create or replace function public.record_route_view(p_route uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  n  int;
begin
  if me is null or not public.can_read_route(p_route) then
    return;
  end if;

  insert into public.route_views (user_id, route_id, viewed_at)
  values (me, p_route, now())
  on conflict (user_id, route_id) do update set viewed_at = excluded.viewed_at;

  if not public.is_route_builder(p_route, me) then
    insert into public.route_viewers (user_id, route_id) values (me, p_route)
    on conflict do nothing;
    get diagnostics n = row_count;
    if n > 0 then
      update public.routes set view_count = view_count + 1 where id = p_route;
    end if;
  end if;
end;
$$;

revoke all on function public.record_route_view(uuid) from public, anon;
grant execute on function public.record_route_view(uuid) to authenticated;

-- ── route_cards: what every list, card and pin shows ───────────────
-- security_invoker: it reads through the RLS above, as the person asking.
-- `line` is the route drawn from its days, as [[lng, lat], …]. A one-day
-- route draws through its spots instead.
create view public.route_cards
with (security_invoker = true) as
  select
    r.id,
    r.slug,
    r.title,
    r.owner_id,
    p.username::text as owner_username,
    p.display_name   as owner_name,
    p.avatar_url     as owner_avatar,
    r.status,
    r.visibility,
    r.live_delay,
    r.went_month,
    r.went_year,
    r.country_codes,
    coalesce((
      select array_agg(c.name order by array_position(r.country_codes, c.code))
      from public.countries c where c.code = any (r.country_codes)
    ), '{}') as country_names,
    r.continent,
    r.budget,
    r.effort,
    r.vibes,
    r.terrain,
    r.styles,
    r.modes,
    r.offbeat,
    r.best_months,
    r.weather_note,
    r.season_note,
    r.cover_url,
    r.save_count,
    r.view_count,
    r.steal_count,
    r.distance_km,
    r.sowo_score,
    r.sowo_count,
    (r.sowo_count >= 5 and r.sowo_score >= 80) as sowo_approved,
    coalesce(d.day_count, 0) as day_count,
    d.from_name,
    d.to_name,
    d.start_lat,
    d.start_lng,
    case
      when jsonb_array_length(coalesce(d.line, '[]')) >= 2 then d.line
      when jsonb_array_length(coalesce(s.line, '[]')) >= 2 then s.line
      else coalesce(d.line, '[]'::jsonb)
    end as line,
    r.created_at,
    r.updated_at
  from public.routes r
  left join public.public_profiles p on p.id = r.owner_id
  left join lateral (
    select
      count(*)::int as day_count,
      (array_agg(dd.place_name order by dd.day_number))[1]      as from_name,
      (array_agg(dd.place_name order by dd.day_number desc))[1] as to_name,
      (array_agg(dd.lat order by dd.day_number) filter (where dd.lat is not null))[1] as start_lat,
      (array_agg(dd.lng order by dd.day_number) filter (where dd.lat is not null))[1] as start_lng,
      jsonb_agg(jsonb_build_array(round(dd.lng::numeric, 4), round(dd.lat::numeric, 4)) order by dd.day_number)
        filter (where dd.lat is not null) as line
    from public.days dd
    where dd.route_id = r.id
  ) d on true
  left join lateral (
    select jsonb_agg(jsonb_build_array(round(ss.lng::numeric, 4), round(ss.lat::numeric, 4)) order by ss.sort)
             filter (where ss.lat is not null) as line
    from public.spots ss
    where ss.route_id = r.id
  ) s on true;

revoke all on public.route_cards from anon, authenticated;
grant select on public.route_cards to authenticated;

-- ── Explore ────────────────────────────────────────────────────────
-- Recommended for you. Version 1, plain SQL (SPEC section 2): score other
-- people's routes by tag overlap with what you saved or completed, plus
-- country overlap, plus freshness, plus a nudge for popular ones.
-- Each row is a route card with a `reason`.
create or replace function public.explore_recommended(p_limit int default 8)
returns setof jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  with taste as (
    select r.id, r.title, r.vibes || r.terrain || r.styles || r.modes as tags, r.country_codes
    from public.route_cards r
    where r.id in (select s.route_id from public.saves s where s.user_id = auth.uid())
       or (r.owner_id = auth.uid() and r.status = 'complete')
  ),
  cand as (
    select c,
      coalesce((select max(cardinality(array(select unnest(t.tags) intersect select unnest(c.vibes || c.terrain || c.styles || c.modes)))) from taste t), 0) as tag_score,
      coalesce((select max(cardinality(array(select unnest(t.country_codes) intersect select unnest(c.country_codes)))) from taste t), 0) as country_score,
      greatest(0, 1 - extract(epoch from now() - c.created_at) / (86400 * 365.0)) as fresh,
      (select t.title from taste t
        order by cardinality(array(select unnest(t.tags) intersect select unnest(c.vibes || c.terrain || c.styles || c.modes)))
               + 2 * cardinality(array(select unnest(t.country_codes) intersect select unnest(c.country_codes))) desc
        limit 1) as like_title
    from public.route_cards c
    where c.status <> 'draft'
      and c.owner_id <> auth.uid()
      and c.id not in (select id from taste)
      and c.day_count > 0
  )
  select to_jsonb(c) || jsonb_build_object(
    'reason',
    case
      when tag_score + country_score > 0 and like_title is not null then 'Like ' || like_title
      when (c).save_count > 1 then 'Saved by ' || (c).save_count || ' travellers'
      else 'Fresh on Sightquest'
    end)
  from cand
  order by tag_score + 2 * country_score + fresh + ln(1 + (c).save_count) * 0.5 desc, (c).created_at desc
  limit p_limit;
$$;

-- Easy wins this weekend: short (≤ 3 days), cheap (≤ $$), easy (≤ 2/5),
-- closest to where you are (or your home base) first.
create or replace function public.explore_easy_wins(p_lat double precision default null, p_lng double precision default null, p_limit int default 5)
returns setof jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  select to_jsonb(c) || jsonb_build_object(
    'distance_from_km',
    case when p_lat is null or c.start_lat is null then null
         else round(public.km_between(p_lat, p_lng, c.start_lat, c.start_lng)::numeric, 0) end)
  from public.route_cards c
  where c.status <> 'draft'
    and c.day_count between 1 and 3
    and coalesce(c.effort, 1) <= 2
    and coalesce(c.budget, 1) <= 2
  order by
    case when p_lat is null or c.start_lat is null then null
         else public.km_between(p_lat, p_lng, c.start_lat, c.start_lng) end asc nulls last,
    c.save_count desc
  limit p_limit;
$$;

-- Best in {month}: picked by best_months. Routes from people who went in
-- that month come first, so the weather matches. Optional terrain chip.
create or replace function public.explore_best_in(p_month int, p_terrain text default null, p_limit int default 20)
returns setof public.route_cards
language sql
stable
set search_path = public, pg_temp
as $$
  select c.*
  from public.route_cards c
  where c.status <> 'draft'
    and c.best_months @> array[p_month::smallint]
    and (p_terrain is null or p_terrain = any (c.terrain))
  order by (c.went_month = p_month) desc, c.save_count desc, c.created_at desc
  limit p_limit;
$$;

-- Hidden gems: few views, good saves, and creators say it's off the beaten track.
create or replace function public.explore_hidden_gems(p_offbeat text default null, p_limit int default 20)
returns setof public.route_cards
language sql
stable
set search_path = public, pg_temp
as $$
  select c.*
  from public.route_cards c
  where c.status <> 'draft'
    and c.offbeat in ('off_the_map', 'few_have_been')
    and (p_offbeat is null or c.offbeat = p_offbeat)
  order by (c.save_count + 1)::numeric / (c.view_count + 10) desc, c.created_at desc
  limit p_limit;
$$;

-- Building now: your live routes, and ones you co-build.
create or replace function public.building_now()
returns setof jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  select to_jsonb(c) || jsonb_build_object(
    'partner', (
      select jsonb_build_object('id', pp.id, 'username', pp.username, 'avatar_url', pp.avatar_url)
      from public.route_builders b
      join public.public_profiles pp on pp.id = b.user_id
      where b.route_id = c.id and b.status = 'accepted' and b.user_id <> auth.uid()
      limit 1))
  from public.route_cards c
  where c.status = 'live'
    and public.is_route_builder(c.id)
  order by c.updated_at desc
  limit 3;
$$;

-- A profile's routes: the ones they own plus the ones they co-built.
create or replace function public.profile_routes(p_user uuid)
returns setof public.route_cards
language sql
stable
set search_path = public, pg_temp
as $$
  select c.*
  from public.route_cards c
  where c.owner_id = p_user
     or exists (select 1 from public.route_builders b
                where b.route_id = c.id and b.user_id = p_user and b.role = 'co' and b.status = 'accepted')
  order by
    case c.status when 'live' then 0 when 'draft' then 1 else 2 end,
    coalesce(c.went_year, 0) desc, coalesce(c.went_month, 0) desc, c.created_at desc;
$$;

-- ── Search ─────────────────────────────────────────────────────────
-- p_q matches a route title, a place on the route, a country or a creator.
-- p_filters (all optional; within a group it's "any of", groups are "and"):
--   continents[], vibes[], terrain[], styles[], modes[], offbeat[], budgets[] (1–4),
--   lengths[] ('weekend','short','1-2w','3-4w','1-3m','3m+'), effort_max (1–5),
--   month (1–12), sowo (true = SOWO approved only)
-- p_lat/p_lng + p_radius_km: only routes starting that close, nearest first.
create or replace function public.search_routes(
  p_q text default '',
  p_filters jsonb default '{}'::jsonb,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km double precision default null,
  p_limit int default 60
)
returns setof jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  with f as (
    select
      nullif(trim(coalesce(p_q, '')), '') as q,
      array(select jsonb_array_elements_text(coalesce(p_filters->'continents', '[]'))) as continents,
      array(select jsonb_array_elements_text(coalesce(p_filters->'vibes', '[]')))      as vibes,
      array(select jsonb_array_elements_text(coalesce(p_filters->'terrain', '[]')))    as terrain,
      array(select jsonb_array_elements_text(coalesce(p_filters->'styles', '[]')))     as styles,
      array(select jsonb_array_elements_text(coalesce(p_filters->'modes', '[]')))      as modes,
      array(select jsonb_array_elements_text(coalesce(p_filters->'offbeat', '[]')))    as offbeat,
      array(select jsonb_array_elements_text(coalesce(p_filters->'lengths', '[]')))    as lengths,
      array(select (jsonb_array_elements_text(coalesce(p_filters->'budgets', '[]')))::int) as budgets,
      (p_filters->>'effort_max')::int as effort_max,
      (p_filters->>'month')::int as month,
      coalesce((p_filters->>'sowo')::boolean, false) as sowo
  ),
  hits as (
    select c,
      case when p_lat is null or c.start_lat is null then null
           else public.km_between(p_lat, p_lng, c.start_lat, c.start_lng) end as km
    from public.route_cards c, f
    where c.status <> 'draft'
      and (f.q is null
           or c.title ilike '%' || f.q || '%'
           or c.owner_username ilike '%' || ltrim(f.q, '@') || '%'
           or array_to_string(c.country_names, ' ') ilike '%' || f.q || '%'
           or exists (select 1 from public.days d where d.route_id = c.id and d.place_name ilike '%' || f.q || '%'))
      and (cardinality(f.continents) = 0 or c.continent = any (f.continents))
      and (cardinality(f.vibes) = 0 or c.vibes && f.vibes)
      and (cardinality(f.terrain) = 0 or c.terrain && f.terrain)
      and (cardinality(f.styles) = 0 or c.styles && f.styles)
      and (cardinality(f.modes) = 0 or c.modes && f.modes)
      and (cardinality(f.offbeat) = 0 or c.offbeat = any (f.offbeat))
      and (cardinality(f.budgets) = 0 or c.budget = any (f.budgets))
      and (f.effort_max is null or coalesce(c.effort, 1) <= f.effort_max)
      and (f.month is null or c.best_months @> array[f.month::smallint] or c.went_month = f.month)
      and (not f.sowo or c.sowo_approved)
      and (cardinality(f.lengths) = 0
           or ('weekend' = any (f.lengths) and c.day_count between 1 and 3)
           or ('short'   = any (f.lengths) and c.day_count between 4 and 7)
           or ('1-2w'    = any (f.lengths) and c.day_count between 8 and 14)
           or ('3-4w'    = any (f.lengths) and c.day_count between 15 and 31)
           or ('1-3m'    = any (f.lengths) and c.day_count between 32 and 92)
           or ('3m+'     = any (f.lengths) and c.day_count > 92))
  )
  select to_jsonb(c) || jsonb_build_object('distance_from_km', round(km::numeric, 0))
  from hits, f
  where p_radius_km is null or (km is not null and km <= p_radius_km)
  order by
    (f.month is not null and (c).went_month = f.month) desc,
    km asc nulls last,
    (f.q is not null and (c).title ilike f.q || '%') desc,
    (c).save_count desc,
    (c).created_at desc
  limit p_limit;
$$;

revoke all on function public.explore_recommended(int) from public, anon;
revoke all on function public.explore_easy_wins(double precision, double precision, int) from public, anon;
revoke all on function public.explore_best_in(int, text, int) from public, anon;
revoke all on function public.explore_hidden_gems(text, int) from public, anon;
revoke all on function public.building_now() from public, anon;
revoke all on function public.profile_routes(uuid) from public, anon;
revoke all on function public.search_routes(text, jsonb, double precision, double precision, double precision, int) from public, anon;
grant execute on function public.explore_recommended(int) to authenticated;
grant execute on function public.explore_easy_wins(double precision, double precision, int) to authenticated;
grant execute on function public.explore_best_in(int, text, int) to authenticated;
grant execute on function public.explore_hidden_gems(text, int) to authenticated;
grant execute on function public.building_now() to authenticated;
grant execute on function public.profile_routes(uuid) to authenticated;
grant execute on function public.search_routes(text, jsonb, double precision, double precision, double precision, int) to authenticated;

revoke all on function public.is_route_builder(uuid, uuid) from public, anon;
revoke all on function public.i_follow(uuid) from public, anon;
revoke all on function public.can_read_route(uuid) from public, anon;
revoke all on function public.can_read_day(uuid) from public, anon;
grant execute on function public.is_route_builder(uuid, uuid) to authenticated;
grant execute on function public.i_follow(uuid) to authenticated;
grant execute on function public.can_read_route(uuid) to authenticated;
grant execute on function public.can_read_day(uuid) to authenticated;
