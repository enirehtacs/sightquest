-- Phase 0: profiles, one row per auth user (docs/DATA.md → Users).
-- RLS is on, with explicit policies, in this same migration.

create extension if not exists citext;

-- Shared helper: keep updated_at fresh on every update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  -- Chosen during onboarding (Phase 1), so empty right after sign-up.
  username            citext unique
                        check (username ~ '^[a-z0-9._]{3,30}$'),
  display_name        text check (char_length(display_name) <= 60),
  avatar_url          text,
  bio                 text check (char_length(bio) <= 160),
  home_base           text,
  home_country        text,
  -- Only these five keys are allowed: TikTok, Instagram, YouTube, AllTrails, Strava.
  links               jsonb not null default '{}'::jsonb
                        check (
                          jsonb_typeof(links) = 'object'
                          and links - array['tiktok','instagram','youtube','alltrails','strava'] = '{}'::jsonb
                        ),
  username_changed_at timestamptz,
  appearance          text not null default 'system'
                        check (appearance in ('system','light','dark')),
  distance_unit       text not null default 'km'
                        check (distance_unit in ('km','mi')),
  role                text not null default 'user'
                        check (role in ('user','admin')),
  status              text not null default 'active'
                        check (status in ('active','warned','suspended')),
  -- Privacy settings
  live_default        text not null default 'private'
                        check (live_default in ('private','followers','public')),
  live_delay          boolean not null default true,
  blur_sleep          boolean not null default true,
  hide_home_city      boolean not null default false,
  notification_prefs  jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create the profile row automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Row Level Security ─────────────────────────────────────────────
alter table public.profiles enable row level security;

-- The full row (privacy settings, notification prefs, role) is for its owner.
-- Everyone else reads public columns through the public_profiles view below.
create policy "profiles: owner can read own row"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "profiles: owner can update own row"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No insert or delete policies: rows are made by the sign-up trigger and
-- removed by the delete-account function (service role).

-- Signed-out visitors get nothing. Signed-in users may only update the
-- columns they own; role, status and username_changed_at stay with the
-- service role.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (
  username, display_name, avatar_url, bio, home_base, home_country, links,
  appearance, distance_unit, live_default, live_delay, blur_sleep,
  hide_home_city, notification_prefs
) on public.profiles to authenticated;

-- Public face of a profile, for any signed-in user.
-- home_base is hidden when hide_home_city is on. Suspended accounts are hidden.
-- (Phase 1 adds the blocks filter here.)
create view public.public_profiles
with (security_invoker = false) as
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    case when p.hide_home_city then null else p.home_base end as home_base,
    p.home_country,
    p.links,
    p.created_at
  from public.profiles p
  where p.status <> 'suspended'
    and auth.role() = 'authenticated';

revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to authenticated;
