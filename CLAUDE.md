# Sightquest — project brief for Claude Code

Read this file first, every session. Then read the doc for the phase you're working on.

## What Sightquest is
A community app where backpackers and everyday adventurers share the routes they actually took, day by day, so other people can travel better. It's for people who want fun and good memories, not luxury, and it never glorifies extreme travel. The tone is contemporary, gender-neutral, a little feral, and kind.

The app is called **Sightquest**. A **sidequest** is the weekly challenge set by the Sightquest team ("Take on a sidequest", "This week's sidequest"). Keep those two words exactly as they are and never swap one for the other.

## Docs map
| File | What's in it |
|---|---|
| `docs/ROADMAP.md` | Build phases, in order, with a "done when" checklist for each. **Work one phase at a time.** |
| `docs/SPEC.md` | Every screen: what it shows, what each button does, edge cases |
| `docs/DATA.md` | Database tables, relationships, security (RLS) rules, scheduled jobs |
| `docs/THEME.md` | Dark + light colour tokens, type, spacing, icons, components |
| `design/prototype/` | The clickable prototype the design was made in (one `.dc.html` per screen). It's the source of truth for **layout, copy and mock data**. `*Light.dc.html` files show light mode. See `design/README.md`. |

## Stack (don't change it without asking)
- **Mobile + web app:** Expo (React Native) + TypeScript + Expo Router, in `app/`. Ship it to the web first (as a PWA), then to iOS and Android from the same code.
- **Backend:** Supabase. It handles Postgres, Auth (Apple, Google and email), Storage for photos, Row Level Security, Edge Functions and cron. Migrations go in `supabase/migrations/`.
- **Admin website:** Next.js (App Router) + TypeScript, in `admin/`. It uses the same Supabase project. It's desktop-only, built for 1440×900.
- **Maps:** Mapbox. On native use `@rnmapbox/maps`; on web use `mapbox-gl`. Wrap both behind one `<Map>` component in `app/components/map/`. Use a custom dark style and a custom light style.
- **Payments (later phase):** RevenueCat over the App Store and Google Play subscriptions.
- **Push:** expo-notifications.
- **Photos:** expo-image-picker and expo-media-library. Read the EXIF date and GPS on the device. Compress before upload.
- Use current stable versions. Check the docs instead of guessing APIs.

## Non-negotiable product rules
1. **No DMs. Ever.** No private messaging, no "who's going", no meetups, no live location sharing, no trusted check-ins. Sightquest is a "help you travel" app, not a dating, connection or safety app.
2. **Campfire** (route comments) is public. The kinds are Question / Tip / Been here. Only the route's creator (or co-builder) can reply to a comment, and replies go one level deep. Show the kindness nudge before someone's first post.
3. **SOWO score** ("solo women") is the percentage of women who felt good doing the route. Only users who self-declare as women can rate, and only when they mark a route they did as complete. A route shows **SOWO APPROVED** at ≥80%, once it has at least 5 ratings. The popup must say: *"Shared experiences, not a safety guarantee."* Keep the self-declaration private: it's never shown on profiles and only used for eligibility.
4. **2026 Unpacked** (the year recap) is a surprise. Its card shows on the owner's own profile only, between 1 Dec and 15 Jan (in the user's local time). Never mention it anywhere else: not in onboarding, tooltips, settings, notifications before 1 Dec, or marketing copy in the app.
5. **Badges** never reward sidequests. Cards are all the same size and show the medal, the name and a progress bar only. Earned = green ring; the bronze/silver/gold tier shows only as the icon colour; not earned = greyed out. Never show totals like "12 of 32".
6. **Usernames** can change once every 30 days. The old handle stays reserved for 14 days.
7. **Co-building:** max one co-builder per route. They join by accepting a notification.
8. **Inbox** shows the latest 10, then "See older".
9. **Social links on profiles** are icons only, in one row: TikTok, Instagram, YouTube, AllTrails, Strava. Show only the ones the user added. There's no blog link and no Spotify link on profiles. Spotify connects in Settings and is used only for Trip tunes.
10. **No empty states that feel dead.** Every list either has content or a friendly nudge with one action.
11. **Light and dark mode both ship.** Settings → Appearance has System / Light / Dark, and the default is System. Never hard-code a colour: always use theme tokens from `docs/THEME.md`.

## How to work
- One phase per session. Start by restating what the phase delivers, then build, then run the phase's "done when" checks.
- Before building a screen, open its prototype file in `design/prototype/` and match its layout, spacing, copy and states. If the prototype and `docs/SPEC.md` disagree, **SPEC.md wins**. Mention the mismatch.
- Every new table gets RLS turned on with explicit policies, in the same migration. Never ship a table without RLS.
- Keep secrets in `.env` (see `.env.example`). Never commit keys. Only the public anon key goes into the app; the service role key is for Edge Functions and the admin server only.
- Commit to git after every working step with a clear message.
- Seed data: use the routes, people and copy from the prototype (Ha Giang, Laos by slow boat, Annapurna, @maya.goes…) so screens never look empty in development.
- When something needs Vivi (an account, a key, a store setting, a legal text), stop and tell her exactly what to do, in plain words.
- Vivi is an architect, not a developer. Explain choices in plain language, briefly. Give her commands to copy-paste.
