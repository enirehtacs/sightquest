// Checks the Phase 1 username rules against the real database, as two signed-in
// users, inside one transaction that is rolled back (nothing is left behind).
// Run: node supabase/tests/username_rules.js "<db url>"   (needs the `pg` package)
const { Client } = require('pg');

const A = '00000000-0000-4000-a000-00000000000a';
const B = '00000000-0000-4000-a000-00000000000b';
let failed = 0;

(async () => {
  const c = new Client({ connectionString: process.argv[2], ssl: { rejectUnauthorized: false } });
  await c.connect();
  const as = async (uid) => {
    await c.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uid, role: 'authenticated' })]);
    await c.query('set local role authenticated');
  };
  const reset = () => c.query('reset role');
  async function expect(name, sql, params, wantError) {
    await c.query('savepoint t');
    try {
      const r = await c.query(sql, params);
      if (wantError) { failed++; console.log(`✗ ${name}: expected "${wantError}", but it worked`); }
      else console.log(`✓ ${name}`);
      await c.query('release savepoint t');
      return r;
    } catch (e) {
      await c.query('rollback to savepoint t');
      if (wantError && e.message.includes(wantError)) console.log(`✓ ${name} → refused: ${e.message}`);
      else { failed++; console.log(`✗ ${name}: ${e.message}`); }
    }
  }

  await c.query('begin');
  await c.query(`insert into auth.users (id, email, raw_user_meta_data, aud, role) values
    ($1, 'a@test.invalid', '{"full_name":"Test Alpha"}', 'authenticated', 'authenticated'),
    ($2, 'b@test.invalid', '{}', 'authenticated', 'authenticated')`, [A, B]);
  const { rows } = await c.query('select id, username, display_name from public.profiles where id in ($1,$2) order by id', [A, B]);
  console.log('Starter usernames from the sign-up trigger:', rows.map((r) => r.username).join(', '));

  await as(A);
  await expect('A picks a new username right after sign-up', `update profiles set username='alpha.first' where id=$1`, [A]);
  await expect('A changes again the same day (30-day rule)', `update profiles set username='alpha.second' where id=$1`, [A], 'username_too_soon');
  await expect('A cannot set username_changed_at directly', `update profiles set username_changed_at=now()-interval '60 days' where id=$1`, [A], 'permission denied');
  await reset();

  // Pretend A's last change was 31 days ago.
  await c.query(`alter table profiles disable trigger profiles_username_rules`);
  await c.query(`update profiles set username_changed_at = now() - interval '31 days' where id=$1`, [A]);
  await c.query(`alter table profiles enable trigger profiles_username_rules`);

  await as(A);
  await expect('A changes after 31 days', `update profiles set username='alpha.third' where id=$1`, [A]);
  await reset();
  const res = await c.query(`select handle, released_at::date - now()::date as days from reserved_usernames where user_id=$1`, [A]);
  console.log('Reserved for A:', res.rows.map((r) => `${r.handle} (${r.days} days)`).join(', '));

  await as(B);
  const st = await c.query(`select username_status('alpha.first') as s`);
  console.log(`username_status('alpha.first') for B = ${st.rows[0].s}`);
  await expect('B grabs A’s old handle while it’s reserved', `update profiles set username='alpha.first' where id=$1`, [B], 'username_reserved');
  await expect('Capital letters are refused', `update profiles set username='Bravo' where id=$1`, [B], 'profiles_username_check');
  await expect('Too short is refused', `update profiles set username='bo' where id=$1`, [B], 'profiles_username_check');
  await expect('B grabs A’s current handle', `update profiles set username='alpha.third' where id=$1`, [B], 'duplicate key');
  await reset();

  // 15 days later the old handle is free again.
  await c.query(`update reserved_usernames set released_at = now() - interval '1 day' where user_id=$1`, [A]);
  await as(B);
  await expect('B takes the handle once 14 days have passed', `update profiles set username='alpha.first' where id=$1`, [B]);
  await reset();

  await c.query('rollback');
  await c.end();
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll username checks passed');
  process.exitCode = failed ? 1 : 0;
})();
