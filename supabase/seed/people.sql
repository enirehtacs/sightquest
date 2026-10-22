-- Development seed: the creators from the prototype, so Explore and creator
-- profiles never look empty. They can't log in (no password, .invalid emails).
-- Safe to run more than once. To remove them later:
--   delete from auth.users where email like '%@seed.sightquest.invalid';

alter table public.profiles disable trigger profiles_username_rules;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('5eed0000-0000-4000-a000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'maya.goes@seed.sightquest.invalid',   '{"full_name":"Maya"}', now(), now()),
  ('5eed0000-0000-4000-a000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nomadgoblin@seed.sightquest.invalid', '{"full_name":"Mai Tran"}', now(), now()),
  ('5eed0000-0000-4000-a000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'saltandsole@seed.sightquest.invalid', '{"full_name":"Sol"}', now(), now()),
  ('5eed0000-0000-4000-a000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dustbunny@seed.sightquest.invalid',   '{"full_name":"Dusty"}', now(), now())
on conflict (id) do nothing;

update public.profiles set
  username = 'maya.goes', display_name = 'Maya',
  bio = 'Slow boats, slower mornings. Will share snacks.',
  home_base = 'Melbourne', home_country = 'Australia',
  links = '{"instagram":"@maya.goes","strava":"maya.goes"}'
where id = '5eed0000-0000-4000-a000-000000000001';

update public.profiles set
  username = 'nomadgoblin', display_name = 'Mai Tran',
  bio = 'Ex-accountant. Now I count mountains and noodle stalls.',
  home_base = 'Hanoi', home_country = 'Vietnam',
  links = '{"tiktok":"@nomadgoblin","instagram":"@nomadgoblin","youtube":"@nomadgoblin","alltrails":"nomadgoblin","strava":"nomadgoblin"}'
where id = '5eed0000-0000-4000-a000-000000000002';

update public.profiles set
  username = 'saltandsole', display_name = 'Sol',
  bio = 'Beaches, buses, and the occasional bad decision.',
  home_base = 'Lisbon', home_country = 'Portugal',
  links = '{"youtube":"@saltandsole"}'
where id = '5eed0000-0000-4000-a000-000000000003';

update public.profiles set
  username = 'dustbunny', display_name = 'Dusty',
  bio = 'Hitching the long way round. Mostly lost, never in a hurry.',
  home_base = 'Tbilisi', home_country = 'Georgia', hide_home_city = true,
  links = '{}'
where id = '5eed0000-0000-4000-a000-000000000004';

alter table public.profiles enable trigger profiles_username_rules;

insert into public.pledges (user_id, version)
select id, 1 from auth.users where email like '%@seed.sightquest.invalid'
on conflict do nothing;

insert into public.follows (follower_id, followee_id) values
  ('5eed0000-0000-4000-a000-000000000001', '5eed0000-0000-4000-a000-000000000002'),
  ('5eed0000-0000-4000-a000-000000000003', '5eed0000-0000-4000-a000-000000000002'),
  ('5eed0000-0000-4000-a000-000000000004', '5eed0000-0000-4000-a000-000000000002'),
  ('5eed0000-0000-4000-a000-000000000002', '5eed0000-0000-4000-a000-000000000001')
on conflict do nothing;
