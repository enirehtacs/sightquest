// Checks Phase 1 RLS on pledges, follows and blocks against the real database,
// inside one transaction that is rolled back. Needs supabase/seed/people.sql.
// Run: node supabase/tests/people_rls.js "<db url>"   (needs the `pg` package)
const { Client } = require('pg');

const X = '00000000-0000-4000-a000-0000000000cc'; // a fresh test user
const MAI = '5eed0000-0000-4000-a000-000000000002'; // @nomadgoblin (seed)
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
      console.log(`${ok ? '✓' : '✗'} ${name}`);
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

  await c.query('begin');
  await c.query(`insert into auth.users (id, email, aud, role) values ($1, 'x@test.invalid', 'authenticated', 'authenticated')`, [X]);

  await as(X);
  await check('X takes the pledge', `insert into pledges (user_id) values ($1)`, [X], works);
  await check('X cannot pledge for someone else', `insert into pledges (user_id) values ($1)`, [MAI], refused);
  await check('X cannot read someone else’s pledge', `select * from pledges where user_id=$1`, [MAI], (r) => r && r.rowCount === 0);
  await check('X sees @nomadgoblin’s public profile', `select * from public_profiles where id=$1`, [MAI], (r) => r && r.rowCount === 1);
  await check('X cannot read @nomadgoblin’s private settings', `select * from profiles where id=$1`, [MAI], (r) => r && r.rowCount === 0);
  await check('X follows @nomadgoblin', `insert into follows (follower_id, followee_id) values ($1,$2)`, [X, MAI], works);
  await check('X cannot make @nomadgoblin follow X', `insert into follows (follower_id, followee_id) values ($2,$1)`, [X, MAI], refused);
  await check('X cannot block on someone else’s behalf', `insert into blocks (blocker_id, blocked_id) values ($2,$1)`, [X, MAI], refused);

  await as(MAI);
  await check('@nomadgoblin blocks X', `insert into blocks (blocker_id, blocked_id) values ($1,$2)`, [MAI, X], works);

  await as(X);
  await check('…X’s follow was removed', `select * from follows where follower_id=$1 and followee_id=$2`, [X, MAI], (r) => r && r.rowCount === 0);
  await check('…X can no longer see @nomadgoblin', `select * from public_profiles where id=$1`, [MAI], (r) => r && r.rowCount === 0);
  await check('…X cannot follow again', `insert into follows (follower_id, followee_id) values ($1,$2)`, [X, MAI], refused);
  await check('…X cannot see that they were blocked', `select * from blocks where blocked_id=$1`, [X], (r) => r && r.rowCount === 0);

  await as(MAI);
  await check('@nomadgoblin sees X in their blocked list', `select * from my_blocked_accounts()`, [], (r) => r && r.rows.some((x) => x.id === X));
  await check('@nomadgoblin unblocks X', `delete from blocks where blocker_id=$1 and blocked_id=$2`, [MAI, X], (r) => r && r.rowCount === 1);

  await c.query('rollback');
  await c.end();
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll pledge/follow/block checks passed');
  process.exitCode = failed ? 1 : 0;
})();
