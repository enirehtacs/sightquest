# Sightquest — screen spec

Each section names the prototype file(s) in `design/prototype/`. Open them for exact layout and copy. Every screen must work in **dark and light** mode. Light-mode references exist for Splash, Welcome, Main, Search, Route, Profile, Me, Following, Create, Live, Diary, EditPlace, Playback, Share, Loading and Settings (`*Light.dc.html`). Every other screen uses the same layout, re-skinned with the light tokens.

Bottom nav (on main screens): **Explore · Search · + · Friends · Me**

---

## 1. Sign-up and first open

### Splash — `Splash.dc.html`
- A 3D globe with glowing contour lines, rotating slowly. The logo says "Sightquest", with the tagline "Find routes. Share yours." / "Get a little lost."
- Buttons:
  - **Continue with Apple**
  - **Continue with Google**
  - **Sign up with email**
  - **Log in** link ("Already exploring?")
- New users go to Welcome. Returning users go straight to Explore.

### Welcome — `Welcome.dc.html`
- Four swipeable cards with a Skip button. Card 4 is "Take on a sidequest."
- Never mention the year recap or badges here.

### Pledge, "the initiation" — `Pledge.dc.html`, `PledgeDone.dc.html`
- Six promise bubbles drift and bounce slowly, all on one screen with no scrolling. Tapping a bubble turns it green and locks it.
  1. Help people travel better
  2. Be kind
  3. Only post what's real
  4. Respect people & places
  5. Keep others safe
  6. Stories, not pro advice
- There's no description card.
- When all six are tapped, pause for about 1.3s, then fade in "Welcome to Sightquest" with "By continuing you agree to Terms…" (Terms and Privacy are links) and a continue button.
- Save a `pledges` row with the version and timestamp. The user can't post anything until they've pledged.

### Location permission — `Location.dc.html`
- Title "Find routes near you". Explains that nobody else sees where you are.
- Buttons: **Allow location** (opens the OS prompt) and **Not now**. Then go to Explore.

---

## 2. Explore ("For you") — `Main.dc.html`
Header: the Sightquest logo, then a bell icon that opens the Inbox and shows a dot when there's something unread.

Sections, in order:
1. **"For you, {name}"** intro line.
2. **Building now** card. Only shows when the user has a live or co-built route. Example: "Laos by slow boat · With @maya.goes · Day 2". Its **+ Add day** button opens the builder on the next day.
3. **This week's sidequest** banner. Shows the quest title, "{n} joined", and a **Join** button that opens QuestJoin.
4. **Recommended for you**. Large cards, each with a reason ("Because you saved Ha Giang…").
5. **Easy wins this weekend**: short, cheap routes close to the user's home base.
6. **Best in {next month}** → **See all** opens Collection (`Collection.dc.html`). Picked by `best_months`.
7. **Hidden gems** → **See all** opens CollectionGems. Picked by low view count plus good saves. Label "FEW HAVE BEEN".
8. Featured sidequest entries can appear as cards here (admin decides which).

Recommendation logic for version 1: score routes by tag overlap with the user's saves and completed routes, plus country overlap, plus how fresh the route is. Keep it simple and do it in SQL. Don't build machine learning.

---

## 3. Search — `Search.dc.html`
Works like AllTrails.
- Search bar for a place, route or creator.
- A swipeable row of filter chips: Continent, SOWO approved, Effort, Budget, When, Travel length, Vibe… Tapping a chip opens the filter sheet.
- **Recently viewed** row, with a **Clear** link.
- **Nearby routes**: "Starting within 80 km of {city}". If location is off, show the "Location is off" card with **Open settings** and **Not now**.
- **Map | List** toggle:
  - The map has zoom +/-, a locate-me button and route pins.
  - Swiping the card carousel at the bottom moves the map to that pin.
- **Filter sheet**. Show a count on each chip. **Reset** clears everything. The CTA reads "Show {n} routes".
  - Continent: Asia, Europe, Africa, North America, South America, Oceania, Antarctica
  - Vibe: Chill, Scenic, Wild, Foodie, Social, Romantic, Mixed bag
  - Effort: up to N/5 (Easygoing, Cruisy, Up for it, Big effort, Epic)
  - Terrain: Mountains, Beaches, Islands, Jungle, Desert, Snow, Rivers, Cities
  - Style: Slow travel, Road trip, …
  - Getting around: Walk, Bicycle, Moto, Bus, Train, Boat, Plane, Hitch, Horse
  - How off the map: Comfortable, Off the map, Few have been
  - Travel length: chips
  - When: a month select with the chevron inset from the edge
  - Budget: Shoestring, Budget, Mid-range, Splurge (rated by creators)
  - **SOWO approved** toggle
- When a month is picked, routes from people who went in that month show first.

---

## 4. Route — `Route.dc.html` (+ `RouteShared.dc.html` when opened from a share link)

**Header**
- Cover photo, title, @creator with **Follow**, and "from → to · Mon YYYY".
- Stat row: days · budget `$$` · effort dots · "Mar ☀ Went".

**Top row**
- **Save offline** downloads the route, its maps and photos.
- **SOWO 88%** pill opens a popup:
  - % score, ratings count, "approved from 80%"
  - "{x}% of women who did this route solo felt comfortable."
  - **"Shared experiences, not a safety guarantee."**
- **♪ Trip tunes** opens a popup with the playlist name, the creator's note, the first 3 tracks, "··· + {n} more songs" and **▶ Play on Spotify**.

**Map**
- Toggle **Route | Moments · {n}**. Moments mode shows photo pins.
- **Play route** opens the reel player.

**Tabs: Itinerary · Must-know · Spots · Moments · Posts**. No tab repeats its own name as a heading.
- **Itinerary**:
  - Days and legs: mode (BUS/MOTO/WALK/BOAT…), from → to, duration, the creator's note.
  - A weather line ("Went in March. Mostly sunny…").
  - Heads-up warnings sit inline on the affected leg.
  - Linked posts sit on their day (Pro).
- **Must-know**: category cards. See section 7.
- **Spots**: recommended places, each with a kind (accommodation, viewpoint, food…), a "why go" and a map pin.
- **Moments**: a 3×2 photo grid with "See all {n} moments".
- **Posts**: a 3×2 grid of linked TikTok, IG or YouTube posts with "See all". Tapping one shows a preview, then "Watch on {platform}". It always opens the external app, because views go to the creator.

**Below the tabs**
- **Updates · {n}**: "Latest 3 days ago · {k} heads-ups", with a **+2** badge for new ones. Opens Reports. **+ Update** opens Report.
- **Campfire · {n}**: the 2 latest comments plus an input. **See all** opens Comments.

**Sticky CTA**: **Steal it** opens Steal.

Header actions: back, **Save** (bookmark, fills when saved; choose the list Next trip or Someday), **Share** (opens Share).

---

## 5. Route actions

### Steal — `Steal.dc.html`
- Shows "STOLEN {n} TIMES".
- Fields: name your version; when are you going; pick the days you want (checkboxes, "{k} OF 9").
- Creates a draft route with `stolen_from_route_id` set. The new route shows "Stolen from @creator", and the creator gets a notification.
- Copies days, legs, spots and must-knows. **Never copies** moments, photos or exact dates.

### Campfire — `Comments.dc.html`, `CommentsNudge.dc.html`
- Pick a kind first: **Question / Tip / Been here**.
- Before the user's first-ever comment, show the kindness nudge sheet.
- The creator (and co-builder) can reply; the reply is tagged CREATOR. There are no other replies, no threads and no DMs.
- Long-press a comment to Report it, which sends it to moderation.

### Updates — `Reports.dc.html` and Post an update — `Report.dc.html`
- Kinds:
  - **Heads up** (something's wrong: landslide, closed, price changed)
  - **All good** (checked and it's fine)
  - **Sorted** (a heads-up has been resolved)
- An update links to a route and, optionally, a spot or leg. It has a note and up to 2 photos.
- Other users can **+1** ("4 confirmed").
- A heads-up shows inline on the itinerary until it's marked Sorted, or until 60 days pass with no +1.
- Creators and savers of the route get notified.

---

## 6. Creating routes

### New route — `Create.dc.html`
- Name it.
- **When are you adding it**: Live (I'm travelling now) or Past trip (From/To dates). Only you see exact dates; everyone else sees the month.
- **How do you want to add the days**: **Upload photos** or **Start blank**.
- Visibility starts private.
- **Building with someone? (optional)**: invite one @username. They get an inbox notification, and their **Accept** adds them as co-builder.
- **Next** opens the builder (Live) or Photos.

### Build from photos — `Photos.dc.html`, `LivePhotos.dc.html`
- Pick photos from the gallery. The app reads EXIF date and GPS **on the device** and auto-sorts photos into days by date taken.
- Tap a photo to **★ star** it, **Move to Day X** or **+ New day**. There's also **+ Add a day**.
- Only starred or chosen photos become moments and get uploaded. "Photos stay private. Only the ones you turn into moments get posted."
- LivePhotos then shows each day's moments with a "describe" box per day.

### Day-by-day builder — `Live.dc.html`, `LiveOffline.dc.html`, `DayMoment.dc.html`, `EditPlace.dc.html`
- Header: the route's line on the map, plus "Built with @maya.goes · either of you can add days" (with **Manage**) when there's a co-builder.
- **Who can follow along live?** Only me / Followers / Everyone.
  - Choosing followers or everyone first shows the "Before you go live" sheet. It recommends a delay ("People see yesterday, never today") and blurring where you sleep.
- **Add next day** asks for:
  - which date (exact date private)
  - where to, from a place search or "Not listed? Drop a pin"
  - how you got there: Stayed put, Day trip, Walk, Bicycle, Moto, Bus, Train, Boat, Plane
  - weather: Sunny, Cloudy, Rainy, Stormy, Misty, Hot, Cold
  - a one-line note
  - **Save day {n}**
- Each day card has:
  - **+ Moment**: photos (up to 3), which day, what happened. The moment pins where the photo was taken.
  - **+ Link a post**: Pro. Paste an IG, TikTok or YouTube Shorts URL and the app fetches the thumbnail. A wrong URL shows "That link doesn't look like…".
- **Spots & posts** (EditPlace): recommend a place with name, where, kind and why go.
- **Finish your route** checklist ("2 OF 4 DONE"): Spots · Must-know · Trip tunes · Price & effort.
- **Show all {n} days** opens the map diary.
- **Mark route complete** asks:
  - How pricey was the trip? (a price level, never what you actually spent)
  - How much effort?
  - **Did this solo as a woman?** Optional, only asked to women. Answers: Felt comfortable / Fine, stay alert / Wouldn't go solo / Didn't go solo. This feeds SOWO.
  - Then the share prompt.
- **Offline**:
  - Banner: "No signal, keep building."
  - Days, photos and pins save on the phone, with a "⟳ SAVED ON PHONE" tag, and sync automatically when back online.
  - Build this with a local queue (SQLite or MMKV) from the start.

### Must-know editor — `MustKnow.dc.html`
See section 7.

### Trip tunes — `Soundtrack.dc.html`, `SoundtrackConnect.dc.html`
- Add a Spotify playlist or a single song, plus a note.
- If Spotify isn't connected, show the connect screen. Connecting happens in Settings, or here.

### Loading — `Loading.dc.html`, `LoadingReel.dc.html`
Shows "FROM THE ROAD" while a day posts, and progress while a reel renders.

---

## 7. Must-know categories
Each category has an icon (green line SVG, colour `act`), a status chip and a free note.

| Key | Label | Icon | Example chips |
|---|---|---|---|
| visa | Visa & entry | passport | e-visa, on arrival, not needed |
| permits | Permits & fees | ticket | Ha Giang permit |
| wheels | Licence & wheels | ID card | IDP needed, rent on site |
| cash | Cash & cards | wallet | Mostly cash, Card ok |
| sim | SIM & signal | phone | Viettel SIM, patchy |
| book | Book ahead? | calendar | Weekends only, No need |
| roads | Roads & trails | road | Mixed, Paved, Rough |
| water | Water & health | droplet | Bottled only |
| scams | Scams & fines | alert | Fake fines |
| dress | Dress code | shirt | Cover up at sacred places |
| wildlife | Wildlife | paw | Stray dogs, Monkeys, Leeches |
| pack | Pack this | backpack | waterproof layer, warm layer, sun protection, bug protection, headtorch, bring snacks, bring water |

Plus **custom categories**: the creator adds their own label (e.g. "Tet holiday", "Culture").

- Wildlife must never suggest pepper spray or a walking stick.
- Badge "Full house" = all 12 standard categories filled on one route.

---

## 8. People

### Friends — `Following.dc.html`, `CollectionShared.dc.html`
- **Your people**: an avatar row, plus **Find more**.
- **Shared with you**: routes friends sent you, with their note ("we HAVE to do this in March"). **See all** opens CollectionShared.
- Feed of friends' activity: ● LIVE day updates, new routes, steals with their note, fresh checks (updates).

### Creator profile — `Profile.dc.html`
- Same layout as your own profile, plus **Follow** and the notify bell.
- Social icons row (only the ones added).
- Tabs: Routes · Badges.

### My profile — `Me.dc.html`, `MeDecember.dc.html`
- Avatar, name, @username, bio, home base and social icons.
- Buttons: **Edit profile**, **Share profile** (opens ShareAtlas), Settings (gear).
- Stats: routes, countries, badges.
- Tabs:
  - **Routes**: Routes (23) / Completed / Saved. Saved has two lists, Next trip and Someday.
  - **Achievements**: personal bests and badges in one grid (see rule 5 in CLAUDE.md). Shows 12, then "See all badges and bests".
- **2026 Unpacked card**: only from 1 Dec to 15 Jan, only to the owner (MeDecember shows it). Opens Unpacked.

### Edit profile — `EditProfile.dc.html`
- Fields: photo (**Change photo**), name, username (the 30-day rule shows "You can change this again on {date}"), bio (placeholder "Will hike for noodles…"), home base, links (TikTok, Instagram, YouTube, AllTrails, Strava).
- Validate usernames: 3–20 characters, lowercase letters, numbers, dots and underscores; must be unique; can't use a reserved handle.

### Share atlas — `ShareAtlas.dc.html`, Atlas — `Atlas.dc.html`
- Atlas: a full-screen map of all your trips ("8 TRIPS · 9 COUNTRIES · 1 LIVE"). Tap a trip for its stats and **Open trip diary**.
- ShareAtlas: an image card plus share targets (Instagram, TikTok, WhatsApp, copy link, save image). Use the native share sheet.

### Badges and bests
- Tiered badges (bronze/silver/gold thresholds):
  - Distance
  - Countries
  - Routes posted
  - Days on the road
  - Ways to travel
  - Moments
  - Spots tagged
  - Highest point
  - Routes stolen
  - Live streak
  - Boat legs
  - Updates posted
  - Campfire answers
  - Co-built routes
  - Must-knows complete
- One-off badges:
  - First boat ride
  - First train ride
  - First flight
  - First moto ride
  - First day trip
  - Border crosser
  - Off the map
  - First steal
  - Lone wolf
  - Live from day 1
  - Above the clouds (spot over 3,000 m)
  - Sunrise chaser (moment before 6am)
  - Co-pilot
  - Night mover (leg after midnight)
  - Full house
- Personal bests: Longest route, Longest trip, Highest point, Longest day on the road, Most countries in one trip, Posting streak, Most stolen.
- Badge definitions live in the DB and are edited in admin. Mix tiered and one-off badges together in the grid, earned first.

---

## 9. Sidequests (weekly, set by the team)

### Quest — `Quest.dc.html`
- Shows this week's sidequest: title, brief, dates, "{n} joined", and entries (stories with photos).
- Featured entries are marked.
- **No badges for sidequests.**

### Join sheet — `QuestJoin.dc.html`
- **My story** (required text), up to **3 photos** (optional), and **when** (optional, e.g. "last March").
- You can join any time while the quest is live, and "done one before? It counts."
- Admin can feature entries onto Explore.

---

## 10. Sharing and playback

### Share — `Share.dc.html`
- Image card: route line, place names and stats (days, km, stops, ways to get around), "@handle on Sightquest". The full itinerary stays in the app.
- Choose image or reel. Share targets go through the native share sheet.
- "Preview what a friend sees after downloading" opens RouteShared.

### Reel player — `Playback.dc.html`
- Animates the route line day by day with moments, then shows "ROUTE COMPLETE" stats.
- **Export reel** renders a 9:16 video without the controls. Version 1 can render on a server (Edge Function + ffmpeg, or a hosted render service). Mark it as a later phase.

### Map diary — `Diary.dc.html`
- Map with moments.
- Filter: whole route, a place or a day.
- **Replay the trip**.

---

## 11. Inbox — `Inbox.dc.html`
- Latest 10, then **See older** (paged).
- Types:
  - new route from someone you follow
  - live day update
  - Campfire question/reply on your route
  - update on a route you saved
  - someone stole your route
  - co-builder invite (with **Accept** / **Decline**) and "added a day"
  - badge unlocked
  - new weekly sidequest
  - your entry got featured
- Each type maps to a toggle in Settings → Notifications.

---

## 12. Settings — `Settings.dc.html`, `Subscription.dc.html`

**Account**
- Subscription (opens its own screen)
- Email (Verified)
- Sign-in (Apple/Google)
- Spotify (Connected / Connect)

**Privacy & safety**
- New live routes start as: Only me / Followers / Everyone
- Delay: "People see yesterday, never today"
- Blur where I sleep ("Overnight stops show as a 2 km area")
- Hide my home city ("Your profile shows the country only")
- Exact trip dates: Only me ("Others see the month you went, and Day 1, Day 2…")
- Location access
- Blocked accounts
- Report a safety concern

**Notifications**: one toggle per inbox type.

**Preferences**
- Appearance: **System / Light / Dark**
- Distance: km/mi
- Offline routes

**Your data**
- Download my data
- Export routes as GPX

**Help**
- Community guidelines
- Help centre

**Bottom**
- Log out
- Delete account (confirm by email, then delete within 30 days)
- "SIGHTQUEST · VERSION x.y"

**Subscription screen**
- Plan: Free / Free trial / Yearly / Monthly
- Change plan
- Promo code
- Restore purchases
- Cancel (free trial or subscription)
- Billing note
- **Free trial: 1 month.**

### Pro — `Pro.dc.html`, `EditPro.dc.html`
- What Pro unlocks: **linking posts to individual days**. Linking posts to the whole route is always free.
- Copy: "No charge during your first month. Cancel before it ends in Settings and you pay nothing."

---

## 13. 2026 Unpacked — `Unpacked.dc.html`
- Swipeable story cards for the user's year: km, countries, days on the road, top route, most-used transport, highest point, best moment, and a shareable final card.
- Computed by a cron job on 30 Nov from that year's data. Visible 1 Dec–15 Jan only.
- Never teased anywhere before then.

---

## 14. Admin website — `admin/`
Prototypes: `Admin.dc.html`, `AdminQuests.dc.html`, `AdminModeration.dc.html`, `AdminBadges.dc.html`, `AdminLater.dc.html`

- Desktop only, compact UI, left sidebar.
- Login with Supabase Auth. Access requires `profiles.role = 'admin'`, checked on the server.

### Overview
- KPIs: new users, routes posted, live routes, open moderation items, quest entries.
- **To do with deadlines**:
  - Auto tasks complete themselves when the action happens (e.g. "Schedule next week's sidequest" completes when a quest is scheduled). They turn grey with a strikethrough and "DONE · TODAY h:mm".
  - Manual tasks have a **Mark done** button.
  - There are no tick boxes.

### Sidequests
- Quest table with status Draft / Scheduled / Live / Ended.
- Editor: title, brief, cover, start/end, **Schedule**, **Save draft**.
- Entries list:
  - Filters: All, Most liked, Has photo, Featured, Flagged · n
  - Bulk feature / hide
  - 10 per page

### Moderation
- Queue of item types SIDEQUEST, COMMENT, UPDATE, SOWO, USER.
- Actions: **Keep / Hide / Warn**.
- Activity log of who did what and when.
- Image-safety scan results show on items that have photos.

### Badges
- Table plus editor: icon, Levels or One-off, metric, bronze/silver/gold thresholds, live preview, **Make live**.

### At launch vs later
- At launch, Explore curation and Users are basic: search a user; warn, suspend or unsuspend them.
- After launch: Pro & promos (promo codes), Content, Numbers.

### In-app admin shortcuts (later)
Admins see ★ Feature, Hide and Pin heads-up in the app's long-press menus.

The admin website also supports light and dark (same tokens).
