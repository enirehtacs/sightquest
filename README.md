# Sightquest — starter kit

## What's in here
- `CLAUDE.md`: the project brief Claude Code reads at the start of every session
- `docs/ROADMAP.md`: build phases with the prompt to paste for each one
- `docs/SPEC.md`: every screen and button
- `docs/DATA.md`: database and security rules
- `docs/THEME.md`: light and dark colours, type, icons
- `design/prototype/`: the prototype screens, for reference
- `.env.example`: the keys you'll fill in

## Before your first session (about 30 minutes, all free to start)
1. Install **Node.js** (LTS) and **Git** on your computer, if you haven't already for your websites.
2. Make accounts on:
   - **GitHub**: one private repo called `sightquest`.
   - **Supabase**: one project in the Singapore region. Note the Project URL and anon key.
   - **Mapbox**: copy your public access token.
   - **Expo**: and install the **Expo Go** app on your phone.
   - **Vercel** or **Netlify**: for the web version (you probably have one already).
3. Unzip this folder, put it where you keep your projects, and open it with Claude Code.
4. Copy `.env.example` to `.env` and paste in your keys. Never share or commit `.env`.
5. In Claude Code, paste:
   > Read CLAUDE.md and docs/ROADMAP.md. We're doing Phase 0. Restate what it delivers, list anything you need from me first, then build it. Check each screen against its prototype file and SPEC.md, and in both light and dark mode. Finish by running the "done when" checks.

## Later (not needed yet)
- **Apple Developer Program** (about US$99/year) and **Google Play Console** (about US$25 once): only when you reach Phase 7.
- **RevenueCat** and **Spotify developer app**: Phase 8.
- A lawyer's review of the Terms, Privacy policy and the SOWO wording: before Phase 6.

## Tips
- Do one phase per session. Test it on your phone before moving on.
- If a session gets long or confused, start a fresh one with the same prompt. CLAUDE.md carries the context.
- When you change your mind about the design, update `docs/SPEC.md` first, then ask Claude Code to build from it. That way the spec stays the source of truth.
