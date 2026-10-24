// Checks Phase 3 (building routes) against the real database, inside one
// transaction that is rolled back. Writes go in the same way the app sends
// them: ids made on the phone, no read-back in the same request.
// Run: node supabase/tests/building_rls.js "<db url>"   (needs the `pg` package)
// PRELOAD=file.sql,… runs those files inside the transaction first.
const { Client } = require('pg');
const fs = require('fs');

const OWNER = '00000000-0000-4000-a000-0000000000b1';
const FOLLOWER = '00000000-0000-4000-a000-0000000000b2';
const STRANGER = '00000000-0000-4000-a000-0000000000b3';
const NOPLEDGE = '00000000-0000-4000-a000-0000000000b4';
const ROUTE = '00000000-0000-4000-b000-0000000000a1';
const D1 = '00000000-0000-4000-c000-0000000000a1'; // yesterday
const D2 = '00000000-0000-4000-c000-0000000000a2'; // today
let failed = 0;

(async () => {
  const c = new Client({ connectionString: process.argv[2], ssl: { rejectUnauthorized: false } });
  await c.connect();
  const as = async (uid) => {
    await c.query('reset role');
    await c.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uid, role: 'authenticated' })]);
    await c.query('set local role authenticated');
  };
  async function check(name, sql, params, test) {
    await c.query('savepoint t');
    try {
      const r = await c.query(sql, params);
      const ok = test(r, null);
      console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : ' → got ' + JSON.stringify(r.rows).slice(0, 200)}`);
      if (!ok) failed++;
      await c.query('release savepoint t');
    } catch (e) {
      await c.query('rollback to savepoint t');
      const ok = test(null, e);
      console.log(`${ok ? '✓' : '✗'} ${name}${ok ? ' → refused' : ': ' + e.message}`);
      if (!ok) failed++;
    }
  }
  const works = (r, e) => !e;
  const refused = (r, e) => !!e || (r && r.rowCount === 0);
  const rows = (n) => (r) => r && r.rowCount === n;
  const today = `(now() at time zone 'Asia/Singapore')::date`;

  await c.query('begin');
  for (const f of (process.env.PRELOAD || '').split(',').filter(Boolean)) await c.query(fs.readFileSync(f, 'utf8'));
  for (const [id, n] of [[OWNER, 'owner'], [FOLLOWER, 'follower'], [STRANGER, 'stranger'], [NOPLEDGE, 'nopledge']]) {
    await c.query(`insert into auth.users (id, email, aud, role) values ($1, $2, 'authenticated', 'authenticated')`, [id, `${n}@test.invalid`]);
    if (id !== NOPLEDGE) await c.query(`insert into pledges (user_id) values ($1)`, [id]);
  }
  await c.query(`insert into follows (follower_id, followee_id) values ($1, $2)`, [FOLLOWER, OWNER]);

  console.log('\nCreating a route');
  await as(NOPLEDGE);
  await check('no pledge, no route', `insert into routes (id, owner_id, title, slug) values (gen_random_uuid(), $1, 'Nope', 'nope')`, [NOPLEDGE], refused);
  await as(STRANGER);
  await check('nobody creates a route for someone else', `insert into routes (id, owner_id, title, slug) values (gen_random_uuid(), $1, 'Nope', 'nope2')`, [OWNER], refused);
  await as(OWNER);
  await check('the owner creates a live route (starts private)',
    `insert into routes (id, owner_id, title, slug, status, visibility, live_delay, blur_sleep, timezone, start_date)
     values ($1, $2, 'Test live trip', 'test-live-trip', 'live', 'private', true, true, 'Asia/Singapore', ${today} - 1)`, [ROUTE, OWNER], works);
  await check('…and can read it straight back', `select id from routes where id = $1`, [ROUTE], rows(1));
  await check('the app can’t set counters or SOWO', `update routes set save_count = 999 where id = $1`, [ROUTE], refused);
  await check('…or hand the route to someone else', `update routes set owner_id = $2 where id = $1`, [ROUTE, STRANGER], refused);

  console.log('\nAdding days, legs, moments, spots, must-knows, tunes, posts');
  await check('day 1 (yesterday), exact pin', `insert into days (id, route_id, day_number, date, place_name, lat, lng, weather, note, created_by) values ($1, $2, 1, ${today} - 1, 'Pulau Ubin', 1.41234, 103.95678, 'sunny', 'Bumboat over', $3)`, [D1, ROUTE, OWNER], works);
  await check('day 2 (today)', `insert into days (id, route_id, day_number, date, place_name, lat, lng, created_by) values ($1, $2, 2, ${today}, 'Changi', 1.389, 103.987, $3)`, [D2, ROUTE, OWNER], works);
  await check('a leg', `insert into legs (day_id, mode, from_name, to_name) values ($1, 'boat', 'Changi', 'Ubin')`, [D1], works);
  await check('a leg on today', `insert into legs (day_id, mode, from_name, to_name) values ($1, 'walk', 'Ubin', 'Changi')`, [D2], works);
  await check('a moment yesterday', `insert into moments (day_id, route_id, caption, photo_paths, local_time) values ($1, $2, 'Crabs everywhere', array[$3::text], '09:30')`, [D1, ROUTE, `${ROUTE}/a.jpg`], works);
  await check('a moment today', `insert into moments (day_id, route_id, caption) values ($1, $2, 'Right now')`, [D2, ROUTE], works);
  await check('a moment can’t claim another route’s day', `insert into moments (day_id, route_id, caption) values ($1, '5eed0001-0000-4000-a000-000000000001', 'x')`, [D1], refused);
  await check('a spot', `insert into spots (route_id, day_id, name, kind, why) values ($1, $2, 'Chek Jawa', 'viewpoint', 'Low tide')`, [ROUTE, D1], works);
  await check('a must-know', `insert into must_knows (route_id, category, chips, note) values ($1, 'cash', '{Cash only}', 'Bring coins')`, [ROUTE], works);
  await check('trip tunes', `insert into trip_tunes (route_id, spotify_url, title) values ($1, 'https://open.spotify.com/playlist/x', 'Ubin')`, [ROUTE], works);
  await check('a linked post on today', `insert into post_links (route_id, day_id, platform, url) values ($1, $2, 'tiktok', 'https://www.tiktok.com/@me/video/1')`, [ROUTE, D2], works);
  await check('a link that isn’t IG, TikTok or YouTube is refused', `insert into post_links (route_id, platform, url) values ($1, 'tiktok', 'https://evil.example/x')`, [ROUTE], refused);

  console.log('\nOther people can’t write');
  for (const [who, uid] of [['follower', FOLLOWER], ['stranger', STRANGER]]) {
    await as(uid);
    await check(`${who} can’t edit the route`, `update routes set title = 'Mine now' where id = $1`, [ROUTE], refused);
    await check(`${who} can’t add a day`, `insert into days (id, route_id, day_number, place_name) values (gen_random_uuid(), $1, 9, 'X')`, [ROUTE], refused);
    await check(`${who} can’t add a moment`, `insert into moments (day_id, route_id, caption) values ($1, $2, 'x')`, [D1, ROUTE], refused);
    await check(`${who} can’t add a spot`, `insert into spots (route_id, name, kind) values ($1, 'x', 'food')`, [ROUTE], refused);
    await check(`${who} can’t delete a day`, `delete from days where id = $1`, [D1], refused);
  }

  console.log('\nBlur where I sleep');
  await as(OWNER);
  await check('the public pin is moved to a ~2 km square', `select lat, lng from days where id = $1`, [D1], (r) =>
    r && Math.abs(r.rows[0].lat - 1.41234) > 0.0001 && Math.abs(r.rows[0].lat - 1.41234) < 0.01 && Math.abs(r.rows[0].lng - 103.95678) < 0.02);
  await check('builders still get the exact pin and dates', `select route_private($1) j`, [ROUTE], (r) => {
    const j = r && r.rows[0].j;
    return j && j.start_date && j.days[0].lat === 1.41234 && j.days[0].lng === 103.95678 && j.days[0].date;
  });
  await as(STRANGER);
  await check('nobody else gets route_private()', `select route_private($1) j`, [ROUTE], (r) => r && r.rows[0].j === null);

  console.log('\nGoing live: a stranger never sees today’s day when delay is on');
  await as(STRANGER);
  await check('while it’s private, the stranger sees nothing', `select id from routes where id = $1`, [ROUTE], rows(0));
  await as(OWNER);
  await check('the owner shares it with everyone (delay on)', `update routes set visibility = 'public' where id = $1`, [ROUTE], rows(1));
  await as(STRANGER);
  await check('stranger sees the route', `select id from routes where id = $1`, [ROUTE], rows(1));
  await check('stranger sees yesterday only', `select id from days where route_id = $1`, [ROUTE], (r) => r && r.rowCount === 1 && r.rows[0].id === D1);
  await check('…not today’s leg', `select id from legs where day_id = $1`, [D2], rows(0));
  await check('…not today’s moment', `select id from moments where day_id = $1`, [D2], rows(0));
  await check('…not today’s linked post', `select id from post_links where day_id = $1`, [D2], rows(0));
  await check('…and the day count says 1', `select day_count from route_cards where id = $1`, [ROUTE], (r) => r && r.rows[0].day_count === 1);
  await as(FOLLOWER);
  await check('followers don’t see today either', `select id from days where route_id = $1`, [ROUTE], rows(1));
  await as(OWNER);
  await check('the owner turns the delay off', `update routes set live_delay = false where id = $1`, [ROUTE], rows(1));
  await as(STRANGER);
  await check('…then today shows', `select id from days where route_id = $1`, [ROUTE], rows(2));

  console.log('\nSOWO: private opt-in, rate only your completed route');
  await as(STRANGER);
  await check('nobody can read someone else’s opt-in', `select * from profile_private where user_id = $1`, [OWNER], rows(0));
  await as(OWNER);
  await check('the owner says (privately) she’s a woman', `insert into profile_private (user_id, sowo_eligible, answered_at) values ($1, true, now())`, [OWNER], works);
  await check('can’t rate before the route is complete', `insert into sowo_ratings (route_id, user_id, answer) values ($1, $2, 'comfortable')`, [ROUTE, OWNER], refused);
  await check('marks the route complete with price and effort', `update routes set status = 'complete', budget = 1, effort = 2 where id = $1`, [ROUTE], rows(1));
  await check('…then rates it', `insert into sowo_ratings (route_id, user_id, answer) values ($1, $2, 'comfortable')`, [ROUTE, OWNER], works);
  await as(STRANGER);
  await check('nobody else can read that rating', `select * from sowo_ratings where route_id = $1`, [ROUTE], rows(0));
  await check('someone who didn’t opt in can’t rate', `insert into sowo_ratings (route_id, user_id, answer) values ($1, $2, 'comfortable')`, [ROUTE, STRANGER], refused);
  await as(FOLLOWER);
  await c.query(`insert into profile_private (user_id, sowo_eligible) values ($1, true)`, [FOLLOWER]);
  await check('an opted-in woman can’t rate a route she didn’t do', `insert into sowo_ratings (route_id, user_id, answer) values ($1, $2, 'comfortable')`, [ROUTE, FOLLOWER], refused);
  await check('opt-ins never show on public profiles', `select * from public_profiles where id = $1`, [OWNER], (r) => r && !Object.keys(r.rows[0] ?? {}).some((k) => /sowo|woman|eligible/.test(k)));

  console.log('\nPhoto bucket');
  await as(OWNER);
  await check('builders can upload into their route’s folder', `select public.can_build(public.try_uuid($1))`, [ROUTE], (r) => r && r.rows[0].can_build === true);
  await as(STRANGER);
  await check('others can’t', `select public.can_build(public.try_uuid($1))`, [ROUTE], (r) => r && r.rows[0].can_build === false);
  await check('a junk folder name is just "no"', `select public.can_build(public.try_uuid('not-a-uuid'))`, [], (r) => r && r.rows[0].can_build === false);

  await c.query('rollback');
  await c.end();
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll building checks passed');
  process.exitCode = failed ? 1 : 0;
})();
