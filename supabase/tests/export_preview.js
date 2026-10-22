// Takes a snapshot of real query results, as @maya.goes, for the app's dev
// preview mode (localhost/?preview), which has no signed-in session.
// Read only: runs in a transaction that is rolled back.
// Run: node supabase/tests/export_preview.js "<db url>"   (needs the `pg` package)
// Writes app/src/data/preview.json.
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const MAYA = '5eed0000-0000-4000-a000-000000000001';
const OTHERS = ['5eed0000-0000-4000-a000-000000000002', '5eed0000-0000-4000-a000-000000000003', '5eed0000-0000-4000-a000-000000000004'];
const SINGAPORE = [1.3521, 103.8198];

(async () => {
  const c = new Client({ connectionString: process.argv[2], ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query('begin');
  await c.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: MAYA, role: 'authenticated' })]);
  await c.query('set local role authenticated');
  const list = async (sql, params = []) => (await c.query(sql, params)).rows.map((r) => r.j);

  const month = (new Date().getMonth() + 1) % 12 + 1;
  const all = await list(`select to_jsonb(r) j from route_cards r order by r.created_at desc`);
  const snap = {
    as: '@maya.goes',
    recommended: await list(`select j from explore_recommended(8) j`),
    easyWins: await list(`select j from explore_easy_wins($1, $2, 4) j`, SINGAPORE),
    bestIn: { month, routes: await list(`select to_jsonb(r) j from explore_best_in($1, null, 20) r`, [month]) },
    gems: await list(`select to_jsonb(r) j from explore_hidden_gems(null, 20) r`),
    buildingNow: await list(`select j from building_now() j`),
    all,
    mine: await list(`select to_jsonb(r) j from profile_routes($1) r`, [MAYA]),
    byOwner: {},
    saves: (await c.query(`select route_id, list from saves where user_id = $1 order by created_at desc`, [MAYA])).rows,
    routes: {},
  };
  for (const o of OTHERS) snap.byOwner[o] = await list(`select to_jsonb(r) j from profile_routes($1) r`, [o]);

  for (const card of all) {
    const id = card.id;
    const days = await list(
      `select to_jsonb(d) || jsonb_build_object('legs', coalesce((
         select jsonb_agg(jsonb_build_object('id', l.id, 'sort', l.sort, 'mode', l.mode, 'from_name', l.from_name, 'to_name', l.to_name,
                'duration_text', l.duration_text, 'note', l.note) order by l.sort)
         from legs l where l.day_id = d.id), '[]')) j
       from (select id, day_number, place_name, lat, lng, weather, note from days where route_id = $1 order by day_number) d`,
      [id],
    );
    const byDay = Object.fromEntries(days.map((d) => [d.id, d]));
    const moments = (await list(`select to_jsonb(m) j from (select id, day_id, caption, tag, local_time, lat, lng, starred, photo_paths from moments where route_id = $1) m`, [id]))
      .filter((m) => byDay[m.day_id])
      .map((m) => ({ ...m, day_number: byDay[m.day_id].day_number, place_name: byDay[m.day_id].place_name }))
      .sort((a, b) => a.day_number - b.day_number || String(a.local_time).localeCompare(String(b.local_time)));
    const builders = await list(
      `select jsonb_build_object('user_id', b.user_id, 'role', b.role, 'username', p.username, 'avatar_url', p.avatar_url) j
       from route_builders b left join public_profiles p on p.id = b.user_id where b.route_id = $1 and b.status = 'accepted'`,
      [id],
    );
    snap.routes[id] = {
      card,
      days,
      moments,
      spots: await list(`select to_jsonb(s) j from spots s where route_id = $1 order by sort`, [id]),
      mustKnows: await list(`select to_jsonb(m) j from must_knows m where route_id = $1 order by sort`, [id]),
      tunes: (await list(`select to_jsonb(t) j from trip_tunes t where route_id = $1`, [id]))[0] ?? null,
      builders,
    };
  }

  await c.query('rollback');
  await c.end();
  const out = path.join(__dirname, '../../app/src/data/preview.json');
  fs.writeFileSync(out, JSON.stringify(snap) + '\n');
  console.log(`wrote ${path.relative(process.cwd(), out)}: ${all.length} routes, ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
})();
