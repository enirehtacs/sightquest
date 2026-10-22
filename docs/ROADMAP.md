# Roadmap — build in this order

Each phase ends with a "done when" checklist. Don't start the next phase until every box is ticked, the work is committed, and Vivi has tried it on her phone.

**Copy-paste prompt for every phase:**
> Read CLAUDE.md and docs/ROADMAP.md. We're doing Phase N. Restate what it delivers, list anything you need from me first, then build it. Check each screen against its prototype file and SPEC.md, and in both light and dark mode. Finish by running the "done when" checks.

---

## Phase 0 — Foundations
- Set up the repo with `app/` (Expo + Expo Router + TypeScript), `admin/` (Next.js), `supabase/` (CLI and migrations), and `.env.example`.
- Theme system:
  - tokens from THEME.md
  - `useTheme()`
  - System/Light/Dark switching
  - fonts (Archivo, JetBrains Mono)
- Base components: Screen, Card, Chip, Button (primary/ghost/danger), Sheet, Tabs, Avatar, MonoLabel, Toast, BottomNav, Icon set (SVGs copied from the prototype).
- A `/dev/components` screen that shows every component in both themes.
- Supabase project linked; first migration with `profiles` + RLS.
- Web deploy: the Expo web build goes to Vercel or Netlify on every push to `main`.

**Done when**
- [ ] The app runs in Expo Go on Vivi's phone and in a browser.
- [ ] The components page looks right in light and dark, and the toggle works instantly.
- [ ] The web build is live at a URL.

## Phase 1 — Sign-up and profiles
- Screens: Splash (with the globe), Welcome, Pledge + PledgeDone, Location, Me (Routes tab with seeded data), Edit profile, Creator profile, Settings (Account, Privacy, Appearance, Log out).
- Auth: Apple, Google, email. Tables: `pledges`, `follows`, `blocks`, username rules.

**Done when**
- [ ] A new account goes Splash → Welcome → Pledge → Location → Explore.
- [ ] The username 30/14-day rules are enforced by the database, not just the UI.
- [ ] Social icons show only the links that were added.

## Phase 2 — Routes you can read
- Tables: routes, days, legs, spots, must_knows, moments (read only), saves, route_views. Seed 10–15 routes from the prototype content.
- Screens: Route (all tabs, Save, Save offline stub, SOWO popup, Trip tunes popup showing static data), Explore, Collection pages, Search (list + map + filter sheet), Map diary, Atlas.
- Mapbox dark and light styles.

**Done when**
- [ ] Every Explore section and the Search filters return real query results.
- [ ] The visibility RLS is tested with 3 users: owner, follower, stranger.

## Phase 3 — Building routes
- Screens: New route, Day-by-day builder, Add moment, Spots & posts (no Pro gating yet), Must-know editor, Finish-your-route checklist, Mark complete (with the SOWO question), Build from photos.
- Photo upload pipeline: EXIF on the device, compress, strip GPS, upload.
- Offline queue for days, moments and pins.
- Privacy: live visibility, delay, blur where I sleep, exact dates private.

**Done when**
- [ ] Vivi builds a real 3-day route from her own photos on her phone.
- [ ] With airplane mode on she adds a day, and it syncs later.
- [ ] A stranger never sees today's day when delay is on.

## Phase 4 — Community
- Campfire (with the kindness nudge and creator replies), Updates + Post an update, +1s, Steal, Share (image card), Friends feed + Shared with you, Inbox + push notifications, SOWO ratings + score trigger, Report → moderation queue, image-safety scan.

**Done when**
- [ ] Only builders can reply in Campfire.
- [ ] SOWO shows APPROVED only when ≥80% with ≥5 ratings.
- [ ] Inbox pages through 10 at a time.
- [ ] A reported comment appears in the `reports` table.

## Phase 5 — Admin website + sidequests
- Admin: login and role check, Overview (KPIs + auto-completing to-dos), Sidequests (editor, scheduling, entries with filters and bulk actions), Moderation (Keep/Hide/Warn + log), Badges editor, basic Users.
- In the app: the Quest screen, the Join sheet, featured entries on Explore.
- Badge computation + the Achievements grid.

**Done when**
- [ ] Vivi schedules next week's sidequest in admin, and the to-do auto-completes.
- [ ] It goes live in the app on its start date.
- [ ] Hiding a comment in admin removes it from the app.

## Phase 6 — Beta launch (web)
- Real Terms + Privacy pages (Vivi supplies the text after legal review). Delete account, Download my data.
- Analytics (PostHog or similar, privacy-friendly) and crash reporting (Sentry).
- Invite 20–50 testers to the web app. Fix what they find.

**Done when**
- [ ] 2 weeks of beta with no data-loss bugs.
- [ ] The moderation queue has been handled daily.

## Phase 7 — App stores
- EAS Build for iOS and Android, TestFlight + Google Play internal testing.
- App icons, splash, store screenshots (light and dark).
- Native maps, photo library and push checked on real devices.
- Store review prep: account deletion in-app, a privacy nutrition label, user-generated content rules (report + block exist ✓).

## Phase 8 — Pro and extras (after launch)
- RevenueCat: monthly/yearly, 1-month free trial, promo codes, restore, cancel. Day-level post linking gated by `is_pro`.
- Trip tunes with real Spotify connect.
- Reel export (Playback → video).
- Co-building (invite/accept) if it wasn't done in Phase 3.
- Admin: Pro & promos, Content, Numbers; in-app admin shortcuts.
- **2026 Unpacked**: build and test it with a date override in dev only. Must be live by 1 Dec.

---

## Decisions Vivi still needs to make
Claude Code: ask about these when you reach the phase that needs them. Don't guess.
1. **Where users declare "I'm a woman" for SOWO** (Phase 3). Suggestion: an optional private question the first time they mark a route complete, which they can change in Settings → Privacy.
2. **Minimum ratings before SOWO shows** (Phase 4). The spec says 5; confirm.
3. **Pro price** (monthly and yearly, SGD/USD) (Phase 8).
4. **Domain and support email** (Phase 0/6), e.g. sightquest.app. Check the name is free first.
5. **Terms, Privacy and Community guidelines text** (Phase 6).
6. **Which cities and routes to seed at launch** so new users don't find an empty app.
