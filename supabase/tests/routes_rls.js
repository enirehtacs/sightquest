// Checks the Phase 2 visibility rule (docs/DATA.md → Routes) with three people:
// an owner, a follower and a stranger. Runs against the real database inside
// one transaction that is rolled back, so nothing is kept.
// Run: node supabase/tests/routes_rls.js "<db url>"   (needs the `pg` package)
// To test a migration before pushing it: PRELOAD=path/to/file.sql,… runs those
// files inside the same rolled-back transaction first.
const { Client } = require('pg');
const fs = require('fs');

const OWNER = '00000000-0000-4000-a000-0000000000d1';
const FOLLOWER = '00000000-0000-4000-a000-0000000000d2';
const STRANGER = '00000000-0000-4000-a000-0000000000d3';
const R = {
  pub: '00000000-0000-4000-b000-000000000001', // public, complete
  fol: '00000000-0000-4000-b000-000000000002', // followers only
  priv: '00000000-0000-4000-b000-000000000003', // private
  draft: '00000000-0000-4000-b000-000000000004', // public but still a draft
  live: '00000000-0000-4000-b000-000000000005', // live, public, delay on
};
const D = {
  fol1: '00000000-0000-4000-c000-000000000001',
  liveYesterday: '00000000-0000-4000-c000-000000000002',
  liveToday: '00000000-0000-4000-c000-000000000003',
  pub1: '00000000-0000-4000-c000-000000000004',
};
let failed = 0;

(async () => {
  const c = new Client({ connectionString: process.argv[2], ssl: { rejectUnauthorized: false } });
  await c.connect();
  const as = async (uid) => {
    await c.query('reset role');
    await c.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uid, role: 'authenticated' })]);
    await c.query('set local role authenticated');
  };
  const asAdmin = () => c.query('reset role');
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
  const ids = (...want) => (r) => r && r.rows.map((x) => x.id).sort().join() === want.sort().join();
  const mine = `id in ('${Object.values(R).join("','")}')`;

  await c.query('begin');
  for (const f of (process.env.PRELOAD || '').split(',').filter(Boolean)) await c.query(fs.readFileSync(f, 'utf8'));
  // ── Set up: three people, five routes, all as the database owner ──
  for (const [id, n] of [[OWNER, 'owner'], [FOLLOWER, 'follower'], [STRANGER, 'stranger']]) {
    await c.query(`insert into auth.users (id, email, aud, role) values ($1, $2, 'authenticated', 'authenticated')`, [id, `${n}@test.invalid`]);
  }
  await c.query(`insert into follows (follower_id, followee_id) values ($1, $2)`, [FOLLOWER, OWNER]);
  const route = (id, title, status, visibility, delay = false) =>
    c.query(
      `insert into routes (id, owner_id, title, slug, status, visibility, live_delay, timezone, start_date, best_months, vibes, effort, budget)
       values ($1, $2, $3, $4, $5, $6, $7, 'Asia/Singapore', current_date - 10, '{11}', '{scenic}', 2, 1)`,
      [id, OWNER, title, id.slice(-6), status, visibility, delay],
    );
  await route(R.pub, 'Test public', 'complete', 'public');
  await route(R.fol, 'Test followers', 'complete', 'followers');
  await route(R.priv, 'Test private', 'complete', 'private');
  await route(R.draft, 'Test draft', 'draft', 'public');
  await route(R.live, 'Test live', 'live', 'public', true);
  const day = (id, routeId, n, dateSql) =>
    c.query(`insert into days (id, route_id, day_number, date, place_name, lat, lng) values ($1, $2, $3, ${dateSql}, 'Somewhere', 1.3, 103.8)`, [id, routeId, n]);
  await day(D.pub1, R.pub, 1, 'current_date - 10');
  await day(D.fol1, R.fol, 1, 'current_date - 10');
  // "Today" in the route's own time zone (Singapore).
  await day(D.liveYesterday, R.live, 1, `(now() at time zone 'Asia/Singapore')::date - 1`);
  await day(D.liveToday, R.live, 2, `(now() at time zone 'Asia/Singapore')::date`);
  for (const d of Object.values(D)) {
    await c.query(`insert into legs (day_id, mode, from_name, to_name) values ($1, 'bus', 'A', 'B')`, [d]);
    await c.query(`insert into moments (day_id, route_id, caption, moderation, taken_at) select id, route_id, 'hi', 'ok', now() from days where id = $1`, [d]);
  }
  await c.query(`insert into moments (day_id, route_id, caption, moderation) values ($1, $2, 'not checked yet', 'pending')`, [D.pub1, R.pub]);
  for (const r of [R.pub, R.fol]) {
    await c.query(`insert into spots (route_id, name, kind) values ($1, 'A spot', 'food')`, [r]);
    await c.query(`insert into must_knows (route_id, category, chips) values ($1, 'cash', '{Cash only}')`, [r]);
    await c.query(`insert into trip_tunes (route_id, spotify_url, title) values ($1, 'https://open.spotify.com/x', 'Tunes')`, [r]);
  }

  // ── Routes ──
  console.log('\nWho sees which route');
  await as(OWNER);
  await check('owner sees all five of their routes (incl. private and draft)', `select id from routes where ${mine}`, [], ids(...Object.values(R)));
  await as(FOLLOWER);
  await check('follower sees public, followers-only and live', `select id from routes where ${mine}`, [], ids(R.pub, R.fol, R.live));
  await as(STRANGER);
  await check('stranger sees public and live only', `select id from routes where ${mine}`, [], ids(R.pub, R.live));
  await check('stranger sees the same through route_cards', `select id from route_cards where ${mine}`, [], ids(R.pub, R.live));
  await check('stranger can’t open the private route by id', `select id from routes where id = $1`, [R.priv], rows(0));

  // ── Child tables follow the route ──
  console.log('\nDays, legs, moments, spots, must-knows and tunes follow the route');
  await as(FOLLOWER);
  await check('follower reads the followers-only day', `select id from days where id = $1`, [D.fol1], rows(1));
  await check('follower reads its legs', `select l.id from legs l where l.day_id = $1`, [D.fol1], rows(1));
  await check('follower reads its moments', `select id from moments where route_id = $1`, [R.fol], rows(1));
  await check('follower reads its spots', `select id from spots where route_id = $1`, [R.fol], rows(1));
  await check('follower reads its must-knows', `select id from must_knows where route_id = $1`, [R.fol], rows(1));
  await check('follower reads its trip tunes', `select id from trip_tunes where route_id = $1`, [R.fol], rows(1));
  await as(STRANGER);
  await check('stranger can’t read the followers-only day', `select id from days where id = $1`, [D.fol1], rows(0));
  await check('…or its legs', `select id from legs where day_id = $1`, [D.fol1], rows(0));
  await check('…or its moments', `select id from moments where route_id = $1`, [R.fol], rows(0));
  await check('…or its spots', `select id from spots where route_id = $1`, [R.fol], rows(0));
  await check('…or its must-knows', `select id from must_knows where route_id = $1`, [R.fol], rows(0));
  await check('…or its trip tunes', `select id from trip_tunes where route_id = $1`, [R.fol], rows(0));
  await check('…or who built it', `select user_id from route_builders where route_id = $1`, [R.fol], rows(0));
  await check('stranger reads the public route’s builders', `select user_id from route_builders where route_id = $1`, [R.pub], rows(1));
  await check('stranger sees only moderated moments', `select caption from moments where route_id = $1`, [R.pub], (r) => r && r.rowCount === 1 && r.rows[0].caption === 'hi');
  await as(OWNER);
  await check('owner sees their own moment while it waits for moderation', `select id from moments where route_id = $1`, [R.pub], rows(2));

  // ── Live delay ──
  console.log('\nLive delay: people see yesterday, never today');
  await as(STRANGER);
  await check('stranger sees yesterday’s day', `select id from days where route_id = $1`, [R.live], ids(D.liveYesterday));
  await check('…not today’s legs', `select id from legs where day_id = $1`, [D.liveToday], rows(0));
  await check('…not today’s moments', `select id from moments where day_id = $1`, [D.liveToday], rows(0));
  await check('route_cards counts 1 day for the stranger', `select day_count from route_cards where id = $1`, [R.live], (r) => r && r.rows[0]?.day_count === 1);
  await as(FOLLOWER);
  await check('follower doesn’t see today either', `select id from days where route_id = $1`, [R.live], ids(D.liveYesterday));
  await as(OWNER);
  await check('owner sees today', `select id from days where route_id = $1`, [R.live], ids(D.liveYesterday, D.liveToday));

  // ── Private columns ──
  console.log('\nExact dates stay private');
  await as(STRANGER);
  await check('nobody can select routes.start_date', `select start_date from routes where id = $1`, [R.pub], refused);
  await check('nobody can select days.date', `select date from days where id = $1`, [D.pub1], refused);
  await check('nobody can select where you slept', `select stay_lat from days where id = $1`, [D.pub1], refused);
  await check('nobody can select moments.taken_at', `select taken_at from moments where route_id = $1`, [R.pub], refused);

  // ── Saves and views ──
  console.log('\nSaves and route views');
  await as(FOLLOWER);
  await check('follower saves the followers-only route to Next trip', `insert into saves (user_id, route_id, list) values ($1, $2, 'next_trip')`, [FOLLOWER, R.fol], works);
  await check('saving it again is a duplicate (the app then moves it)', `insert into saves (user_id, route_id, list) values ($1, $2, 'someday')`, [FOLLOWER, R.fol], (r, e) => !!e && e.code === '23505');
  await check('an upsert is refused (saves only lets you change the list)', `insert into saves (user_id, route_id, list) values ($1, $2, 'someday') on conflict (user_id, route_id) do update set user_id = excluded.user_id, route_id = excluded.route_id, list = excluded.list`, [FOLLOWER, R.fol], refused);
  await check('…and moves it to Someday', `update saves set list = 'someday' where user_id = $1 and route_id = $2`, [FOLLOWER, R.fol], rows(1));
  await check('follower can’t save for someone else', `insert into saves (user_id, route_id) values ($1, $2)`, [STRANGER, R.pub], refused);
  await check('opening a route records a view', `select record_route_view($1)`, [R.fol], works);
  await check('…and it shows in Recently viewed', `select route_id from route_views where user_id = $1`, [FOLLOWER], rows(1));
  await check('opening it again doesn’t count twice', `select record_route_view($1)`, [R.fol], works);
  await as(STRANGER);
  await check('stranger can’t save the followers-only route', `insert into saves (user_id, route_id) values ($1, $2)`, [STRANGER, R.fol], refused);
  await check('stranger can’t see the follower’s saves', `select * from saves where user_id = $1`, [FOLLOWER], rows(0));
  await check('stranger can’t record a view of a hidden route', `select record_route_view($1)`, [R.priv], works);
  await check('…so nothing was recorded', `select * from route_views where user_id = $1`, [STRANGER], rows(0));
  await check('stranger can’t write to route_views directly', `insert into route_views (user_id, route_id) values ($1, $2)`, [STRANGER, R.pub], refused);
  await asAdmin();
  await check('save_count and view_count went up once', `select save_count, view_count from routes where id = $1`, [R.fol], (r) => r && r.rows[0].save_count === 1 && r.rows[0].view_count === 1);

  // ── Search and Explore read through the same rule ──
  console.log('\nSearch and Explore use the same rule');
  await as(FOLLOWER);
  await check('search finds the followers-only route for the follower', `select x->>'id' id from search_routes('Test followers') x`, [], ids(R.fol));
  await as(STRANGER);
  await check('…but not for the stranger', `select x->>'id' id from search_routes('Test followers') x`, [], rows(0));
  await check('best-in-November skips drafts and hidden routes', `select id from explore_best_in(11) where ${mine}`, [], ids(R.pub, R.live));

  // ── Co-builders ──
  console.log('\nCo-builders');
  await asAdmin();
  await c.query(`insert into route_builders (route_id, user_id, role, status) values ($1, $2, 'co', 'invited')`, [R.priv, STRANGER]);
  await as(STRANGER);
  await check('an invited co-builder can’t see the private route yet', `select id from routes where id = $1`, [R.priv], rows(0));
  await check('…but can see their own invite', `select * from route_builders where route_id = $1 and user_id = $2`, [R.priv, STRANGER], rows(1));
  await asAdmin();
  await c.query(`update route_builders set status = 'accepted' where route_id = $1 and user_id = $2`, [R.priv, STRANGER]);
  await as(STRANGER);
  await check('once accepted, they see it', `select id from routes where id = $1`, [R.priv], rows(1));
  await asAdmin();
  await check('only one co-builder per route', `insert into route_builders (route_id, user_id, role, status) values ($1, $2, 'co', 'invited')`, [R.priv, FOLLOWER], refused);

  // ── Blocks ──
  console.log('\nBlocks');
  await as(OWNER);
  await c.query(`insert into blocks (blocker_id, blocked_id) values ($1, $2)`, [OWNER, FOLLOWER]);
  await as(FOLLOWER);
  await check('once blocked, the follower sees none of the owner’s routes', `select id from routes where ${mine}`, [], rows(0));
  await check('…or their days', `select id from days where route_id = $1`, [R.pub], rows(0));

  await c.query('rollback');
  await c.end();
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll route visibility checks passed');
  process.exitCode = failed ? 1 : 0;
})();
