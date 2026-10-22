# Theme — dark + light

Put every colour in `app/theme/tokens.ts` (and `admin/` imports the same values). Components read tokens through a `useTheme()` hook. **No raw hex values in components.**

Appearance setting: **System (default) / Light / Dark**. Store it on the device, and in `profiles.appearance` so it follows the user across devices. Switching modes must be instant, with no reload.

## Colour tokens — "Trail marker" palette
Forest-dark surfaces with signpost yellow. (This replaced the original green-on-black palette, which looked too close to Spotify. The prototype files still show the old green; **these tokens win**.)

| Token | Use | Dark | Light |
|---|---|---|---|
| `bg` | Screen background | `#121611` | `#F5F2E6` |
| `sf` | Cards, sheets | `#1A2019` | `#FFFFFF` |
| `sf2` | Inputs, chips, nested surfaces | `#242B22` | `#ECE8D8` |
| `ln` | Borders, dividers | `#30382E` | `#DFDAC6` |
| `tx` | Main text | `#EDEBDD` | `#1C1E16` |
| `mu` | Secondary text, labels | `#A1A592` | `#5F6252` |
| `ac` | Accent fill (primary buttons, earned ring, active chip, SOWO pill) | `#F4C24A` | `#F4C24A` |
| `on` | Text/icons on top of `ac` | `#1E1603` | `#1E1603` |
| `act` | Accent as text/icons on `bg`/`sf` (links, Must-know icons, active nav) | `#F6CC62` | `#7E5900` |
| `rt` | Route line on maps | `#F4C24A` | `#A87A00` |
| `cnt` | Map contour lines, inactive dots | `#2B3329` | `#E4E0CF` |
| `bd` | Map borders | `#3D4A3B` | `#B9B49C` |
| `sea` | Map water | `#10181B` | `#D6E2E4` |
| `land` | Map land | `#1F271E` | `#F3F1E6` |
| `ph1`–`ph4` | Photo placeholders | `#3A4838` `#4A3F35` `#35434C` `#4A4652` | `#C8D4C0` `#DCCFC0` `#C5D2DB` `#D3CEDA` |
| `scrim` | Behind sheets/popups | `rgba(18,22,17,0.78)` | `rgba(255,255,255,0.86)` |
| `ring` | Avatar outline | `#000000` | `#1C1E16` |
| `ok` | "All good", "Sorted", success | `#9CCB6B` | `#3F6E1A` |
| `warn` | Heads up, deadlines (orange so it never clashes with the yellow accent) | `#FF9A4D` | `#A84A0C` |
| `danger` | Delete, hide, flagged | `#F08A7E` | `#B33A2B` |
| `info` | Info chips, admin links | `#8FB9E6` | `#2B65A3` |

Contrast rules:
- In light mode, yellow **text** always uses `act` (`#7E5900`), never `ac`. The yellow `ac` is a fill only, always with `on` text on top (10.8:1).
- All text tokens pass 4.5:1 on `bg` and `sf` in both modes. The light route line `rt` passes 3:1 on `land`.
- Badge tiers are icon colour only:
  - bronze `#C8895A`
  - silver `#B9C0C6`
  - gold `#E8C25A`
  - In light mode, darken each by about 15% so it shows on white.
  - The earned ring uses `ac`.

## Type
- **Archivo** (variable, width 62–125, weight 100–900) for everything. Headings use a slightly condensed width (~85) and weight 700–800.
- **JetBrains Mono** 500/600 for small uppercase labels, stats and meta lines. Examples: `VIETNAM · MAR · 9D · $$`, `DONE · TODAY 14:02`, section labels. Use 10–11px, letter-spacing 0.5–1px, colour `mu`.
- Load both fonts with `expo-font` (app) and `next/font` (admin).

## Shape and spacing
- Phone frame reference: 390 wide. Side gutter 16–20.
- Corner radius:
  - cards: 14–16
  - chips and pills: 999
  - sheets: 22 on the top corners
- 1px `ln` borders on cards; no heavy shadows. In light mode, cards can add a very soft shadow (y 1, blur 3, 6% black).
- Tap targets are at least 44×44.

## Icons
- Simple line icons, 1.6–1.8 stroke, rounded caps. Copy the SVG paths from the prototype files where they exist (Must-know icons, nav icons, the backpack Explore icon).
- Must-know category icons always use `act`.
- Bottom nav: Explore (backpack), Search, + (new route), Friends, Me.

## Motion
- Keep it subtle: 150–250ms ease-out for sheets and toggles.
- Pledge bubbles bounce slowly (see SPEC → Pledge).
- Respect "Reduce motion": turn off bouncing and reels' auto-advance.

## Maps
- Make two Mapbox styles, "Sightquest Dark" and "Sightquest Light", built from the map tokens above (`sea`, `land`, `bd`, `cnt`, `rt`).
- Switch the style with the theme.
- Route lines are `rt`, 3px, with round joins. Moment photo pins are 28px circles with a 2px `ac` ring.
