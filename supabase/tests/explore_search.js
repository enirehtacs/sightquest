// Checks that every Explore section and every Search filter returns real
// results from the seed routes (supabase/seed/routes.sql), as a signed-in
// person. Runs inside one transaction that is rolled back.
// Run: node supabase/tests/explore_search.js "<db url>"   (needs the `pg` package)
// PRELOAD=file.sql,… runs those files inside the transaction first.
const { Client } = require('pg');
const fs = require('fs');

const ME = '00000000-0000-4000-a000-0000000000e1'; // a fresh person in Singapore
const MAYA = '5eed0000-0000-4000-a000-000000000001';
const MAI = '5eed0000-0000-4000-a000-000000000002';
const HA_GIANG = '5eed0001-0000-4000-a000-000000000001';
const SINGAPORE = [1.3521, 103.8198];
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
    try {
      const r = await c.query(sql, params);
      const list = r.rows.map((x) => x.j ?? x);
      const ok = list.length > 0 && test(list);
      const titles = list.map((x) => x.title).slice(0, 6).join(' · ');
      console.log(`${ok ? '✓' : '✗'} ${name} (${list.length}): ${titles}`);
      if (!ok) failed++;
    } catch (e) {
      console.log(`✗ ${name}: ${e.message}`);
      failed++;
    }
  }
  const search = (q, filters = {}, near = null, radius = null) => [
    `select j from search_routes($1, $2::jsonb, $3, $4, $5) j`,
    [q, JSON.stringify(filters), near?.[0] ?? null, near?.[1] ?? null, radius],
  ];
  const all = (fn) => (list) => list.every(fn);

  await c.query('begin');
  for (const f of (process.env.PRELOAD || '').split(',').filter(Boolean)) await c.query(fs.readFileSync(f, 'utf8'));
  await c.query(`insert into auth.users (id, email, aud, role) values ($1, 'me@test.invalid', 'authenticated', 'authenticated')`, [ME]);
  await c.query(`update profiles set home_base = 'Singapore', home_country = 'Singapore' where id = $1`, [ME]);

  await as(ME);
  await c.query(`insert into saves (user_id, route_id) values ($1, $2)`, [ME, HA_GIANG]);

  console.log('\nExplore');
  await check('Recommended for you (saved Ha Giang)', `select j from explore_recommended(8) j`, [], (l) =>
    l.every((x) => x.owner_id !== ME && x.id !== HA_GIANG && x.status !== 'draft') && l[0].reason.startsWith('Like Ha Giang'));
  await check('Easy wins near Singapore', `select j from explore_easy_wins($1, $2, 5) j`, SINGAPORE, (l) =>
    l.every((x) => x.day_count <= 3 && x.effort <= 2 && x.budget <= 2) && l[0].distance_from_km < 30);
  await check('Best in November', `select to_jsonb(r) j from explore_best_in(11) r`, [], all((x) => x.best_months.includes(11)));
  await check('Best in November · Mountains chip', `select to_jsonb(r) j from explore_best_in(11, 'mountains') r`, [], all((x) => x.terrain.includes('mountains')));
  await check('Hidden gems', `select to_jsonb(r) j from explore_hidden_gems() r`, [], all((x) => ['off_the_map', 'few_have_been'].includes(x.offbeat)));
  await check('Hidden gems · Few have been chip', `select to_jsonb(r) j from explore_hidden_gems('few_have_been') r`, [], all((x) => x.offbeat === 'few_have_been'));
  await as(MAYA);
  await check('Building now (as @maya.goes, co-built with @nomadgoblin)', `select j from building_now() j`, [], (l) =>
    l[0].title === 'Luang Prabang loops' && l[0].partner.username === 'nomadgoblin');
  await as(ME);
  await check('A profile’s routes include co-built ones', `select to_jsonb(r) j from profile_routes($1) r`, [MAI], (l) =>
    l.some((x) => x.title === 'Luang Prabang loops') && l.every((x) => x.status !== 'draft'));
  await check('…and hide followers-only routes from non-followers', `select to_jsonb(r) j from profile_routes($1) r`, [MAI], (l) =>
    !l.some((x) => x.visibility === 'followers'));

  console.log('\nSearch: the search bar');
  await check('a route title: “ha giang”', ...search('ha giang'), (l) => l[0].id === HA_GIANG);
  await check('a place on the route: “Dong Van”', ...search('Dong Van'), (l) => l.some((x) => x.id === HA_GIANG));
  await check('a creator: “@dustbunny”', ...search('@dustbunny'), all((x) => x.owner_username === 'dustbunny'));
  await check('a country: “Laos”', ...search('Laos'), all((x) => x.country_names.includes('Laos')));

  console.log('\nSearch: each filter');
  await check('Continent: Asia', ...search('', { continents: ['Asia'] }), all((x) => x.continent === 'Asia'));
  await check('SOWO approved', ...search('', { sowo: true }), all((x) => x.sowo_approved && x.sowo_count >= 5 && x.sowo_score >= 80));
  await check('Effort: up to 1/5', ...search('', { effort_max: 1 }), all((x) => x.effort <= 1));
  await check('Budget: Shoestring', ...search('', { budgets: [1] }), all((x) => x.budget === 1));
  await check('When: March (people who went in March first)', ...search('', { month: 3 }), (l) =>
    l[0].went_month === 3 && l.every((x) => x.best_months.includes(3) || x.went_month === 3));
  await check('Travel length: Weekend · 1–3 days', ...search('', { lengths: ['weekend'] }), all((x) => x.day_count >= 1 && x.day_count <= 3));
  await check('Travel length: 1–2 weeks', ...search('', { lengths: ['1-2w'] }), all((x) => x.day_count >= 8 && x.day_count <= 14));
  await check('Vibe: Chill', ...search('', { vibes: ['chill'] }), all((x) => x.vibes.includes('chill')));
  await check('Terrain: Islands', ...search('', { terrain: ['islands'] }), all((x) => x.terrain.includes('islands')));
  await check('Style: Road trip', ...search('', { styles: ['road_trip'] }), all((x) => x.styles.includes('road_trip')));
  await check('Getting around: Hitch', ...search('', { modes: ['hitch'] }), all((x) => x.modes.includes('hitch')));
  await check('How off the map: Few have been', ...search('', { offbeat: ['few_have_been'] }), all((x) => x.offbeat === 'few_have_been'));
  await check('Several at once: Asia + Chill + Shoestring', ...search('', { continents: ['Asia'], vibes: ['chill'], budgets: [1] }), all((x) =>
    x.continent === 'Asia' && x.vibes.includes('chill') && x.budget === 1));
  await check('Nearby: starting within 80 km of Singapore', ...search('', {}, SINGAPORE, 80), (l) =>
    l.every((x) => x.distance_from_km <= 80) && l.length >= 3);
  await c.query(`select record_route_view($1)`, [HA_GIANG]);
  await check('Recently viewed after opening a route', `select to_jsonb(r) j from route_cards r join route_views v on v.route_id = r.id where v.user_id = $1`, [ME], (l) =>
    l[0].id === HA_GIANG);

  await c.query('rollback');
  await c.end();
  console.log(failed ? `\n${failed} check(s) failed` : '\nEvery Explore section and Search filter returned real results');
  process.exitCode = failed ? 1 : 0;
})();
