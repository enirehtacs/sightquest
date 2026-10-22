-- Phase 1: sign-up and profiles (docs/DATA.md → Users).
-- Adds pledges, follows, blocks, reserved_usernames and the username rules,
-- plus the avatars bucket. RLS is on, with explicit policies, for every table here.

-- ── Profiles: tighten to the spec ──────────────────────────────────
-- Usernames: 3–20 characters, lowercase letters, numbers, dots, underscores.
-- (Cast to text: a regex on citext ignores case, which would let capitals in.)
alter table public.profiles drop constraint if exists profiles_username_check;
alter table public.profiles
  add constraint profiles_username_check check (username::text ~ '^[a-z0-9._]{3,20}$');

-- Bio is 120 characters in Edit profile.
alter table public.profiles drop constraint if exists profiles_bio_check;
alter table public.profiles
  add constraint profiles_bio_check check (char_length(bio) <= 120);

-- ── Reserved usernames ─────────────────────────────────────────────
-- When someone changes their username, the old one is held for 14 days
-- so nobody else can grab it.
create table public.reserved_usernames (
  handle      citext primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  released_at timestamptz not null,
  created_at  timestamptz not null default now()
);

alter table public.reserved_usernames enable row level security;

-- You can see the handles you are holding. Nobody else reads this table
-- directly; availability goes through username_status() below.
create policy "reserved_usernames: owner can read"
  on public.reserved_usernames for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.reserved_usernames from anon, authenticated;
grant select on public.reserved_usernames to authenticated;
-- Rows are written only by the trigger below (security definer).

-- ── The username rules, enforced by the database ───────────────────
-- 1. A username can change once every 30 days (the first pick after sign-up
--    counts as a change, the auto-made one does not).
-- 2. The old handle is reserved for 14 days.
-- 3. Nobody else can take a handle while it's reserved.
create or replace function public.enforce_username_rules()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.username is not distinct from old.username then
    return new;
  end if;

  if new.username is null then
    raise exception 'A username is required.' using errcode = '23514';
  end if;

  if old.username_changed_at is not null
     and now() < old.username_changed_at + interval '30 days' then
    raise exception 'username_too_soon: You can change your username again on %.',
      to_char(old.username_changed_at + interval '30 days', 'DD Mon YYYY')
      using errcode = 'P0001',
            hint = to_char(old.username_changed_at + interval '30 days', 'YYYY-MM-DD"T"HH24:MI:SSOF');
  end if;

  if exists (
    select 1 from public.reserved_usernames r
    where r.handle = new.username
      and r.released_at > now()
      and r.user_id <> new.id
  ) then
    raise exception 'username_reserved: That username is reserved for now.' using errcode = 'P0001';
  end if;

  -- Taking back your own reserved handle frees it.
  delete from public.reserved_usernames where handle = new.username and user_id = new.id;

  if old.username is not null then
    insert into public.reserved_usernames (handle, user_id, released_at)
    values (old.username, new.id, now() + interval '14 days')
    on conflict (handle) do update
      set user_id = excluded.user_id, released_at = excluded.released_at;
  end if;

  new.username_changed_at = now();
  return new;
end;
$$;

create trigger profiles_username_rules
  before update of username on public.profiles
  for each row execute function public.enforce_username_rules();

-- Is this handle free for me? Returns 'ok', 'invalid', 'taken' or 'reserved'.
create or replace function public.username_status(p_handle text)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when p_handle !~ '^[a-z0-9._]{3,20}$' then 'invalid'
    when exists (select 1 from public.profiles p
                 where p.username = p_handle::citext and p.id <> auth.uid()) then 'taken'
    when exists (select 1 from public.reserved_usernames r
                 where r.handle = p_handle::citext and r.released_at > now()
                   and r.user_id <> auth.uid()) then 'reserved'
    else 'ok'
  end;
$$;

revoke all on function public.username_status(text) from public, anon;
grant execute on function public.username_status(text) to authenticated;

-- ── New users get a starter username ───────────────────────────────
-- Sign-up goes Splash → Welcome → Pledge → Location → Explore with no
-- "pick a username" step, so we make one from their name or email.
-- They can change it in Edit profile (that first change starts the 30-day clock).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  meta  jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  name  text  := nullif(trim(coalesce(meta->>'full_name', meta->>'name', '')), '');
  base  text;
  candidate text;
  tries int := 0;
begin
  base := lower(coalesce(name, split_part(coalesce(new.email, ''), '@', 1), ''));
  base := regexp_replace(base, '\s+', '.', 'g');
  base := regexp_replace(base, '[^a-z0-9._]', '', 'g');
  base := left(base, 14);
  if char_length(base) < 3 then base := 'traveller'; end if;

  candidate := base;
  while exists (select 1 from public.profiles where username = candidate::citext)
     or exists (select 1 from public.reserved_usernames
                where handle = candidate::citext and released_at > now()) loop
    tries := tries + 1;
    candidate := left(base, 14) || '.' || (floor(random() * 9000) + 1000)::int;
    exit when tries > 20;
  end loop;

  insert into public.profiles (id, username, display_name)
  values (new.id, candidate, left(coalesce(name, split_part(coalesce(new.email, ''), '@', 1)), 60));
  return new;
end;
$$;

-- ── Pledges ("the initiation") ─────────────────────────────────────
create table public.pledges (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  version     int  not null default 1,
  accepted_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (user_id, version)
);

alter table public.pledges enable row level security;

create policy "pledges: owner can read"
  on public.pledges for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "pledges: owner can pledge"
  on public.pledges for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- No update or delete: a pledge is a record of what you agreed to and when.
revoke all on public.pledges from anon, authenticated;
grant select, insert on public.pledges to authenticated;

-- Used by the insert policies of every content table (routes, comments…).
create or replace function public.has_pledged(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.pledges where user_id = uid);
$$;

revoke all on function public.has_pledged(uuid) from public, anon;
grant execute on function public.has_pledged(uuid) to authenticated;

-- ── Blocks ─────────────────────────────────────────────────────────
create table public.blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;

-- Only you see who you blocked. Nobody is told they were blocked.
create policy "blocks: owner can read"
  on public.blocks for select
  to authenticated
  using (blocker_id = (select auth.uid()));

create policy "blocks: owner can block"
  on public.blocks for insert
  to authenticated
  with check (blocker_id = (select auth.uid()));

create policy "blocks: owner can unblock"
  on public.blocks for delete
  to authenticated
  using (blocker_id = (select auth.uid()));

revoke all on public.blocks from anon, authenticated;
grant select, insert, delete on public.blocks to authenticated;

-- True if either person blocked the other. Used by every visibility rule.
create or replace function public.is_blocked(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;

revoke all on function public.is_blocked(uuid, uuid) from public, anon;
grant execute on function public.is_blocked(uuid, uuid) to authenticated;

-- ── Follows ────────────────────────────────────────────────────────
create table public.follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  followee_id uuid not null references auth.users (id) on delete cascade,
  -- The bell on a creator profile: notify me about their new routes.
  notify      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index follows_followee_idx on public.follows (followee_id);

create trigger follows_set_updated_at
  before update on public.follows
  for each row execute function public.set_updated_at();

alter table public.follows enable row level security;

-- Follows are public (they make the follower counts), except between
-- people who blocked each other.
create policy "follows: signed-in users can read"
  on public.follows for select
  to authenticated
  using (
    not public.is_blocked((select auth.uid()), follower_id)
    and not public.is_blocked((select auth.uid()), followee_id)
  );

create policy "follows: follow someone"
  on public.follows for insert
  to authenticated
  with check (
    follower_id = (select auth.uid())
    and not public.is_blocked(follower_id, followee_id)
  );

create policy "follows: change your bell"
  on public.follows for update
  to authenticated
  using (follower_id = (select auth.uid()))
  with check (follower_id = (select auth.uid()));

create policy "follows: unfollow"
  on public.follows for delete
  to authenticated
  using (follower_id = (select auth.uid()));

revoke all on public.follows from anon, authenticated;
grant select, insert, delete on public.follows to authenticated;
grant update (notify) on public.follows to authenticated;

-- Blocking someone also ends any follow between you, both ways.
create or replace function public.drop_follows_on_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and followee_id = new.blocked_id)
     or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  return new;
end;
$$;

create trigger blocks_drop_follows
  after insert on public.blocks
  for each row execute function public.drop_follows_on_block();

-- ── Public profiles: now hides people who blocked each other ───────
create or replace view public.public_profiles
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
    p.created_at,
    (select count(*) from public.follows f where f.followee_id = p.id)::int as follower_count,
    (select count(*) from public.follows f where f.follower_id = p.id)::int as following_count
  from public.profiles p
  where p.status <> 'suspended'
    and auth.role() = 'authenticated'
    and not public.is_blocked(auth.uid(), p.id);

revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to authenticated;

-- People I blocked, with their handle, for Settings → Blocked accounts.
-- (They're hidden from public_profiles, so this is the only way to see them.)
create or replace function public.my_blocked_accounts()
returns table (id uuid, username text, display_name text, avatar_url text, blocked_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.username::text, p.display_name, p.avatar_url, b.created_at
  from public.blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
$$;

revoke all on function public.my_blocked_accounts() from public, anon;
grant execute on function public.my_blocked_accounts() to authenticated;

-- ── Avatars bucket (public read, you write only your own folder) ────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars: upload to own folder"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: replace own files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: delete own files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ── Daily clean-up: release reserved usernames after 14 days ───────
-- (The rules above already ignore expired rows; this just tidies up.)
create extension if not exists pg_cron;

select cron.schedule(
  'release-reserved-usernames',
  '17 3 * * *',
  $$delete from public.reserved_usernames where released_at <= now()$$
);
