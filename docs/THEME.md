# Theme — dark + light

Put every colour in `app/theme/tokens.ts` (and `admin/` imports the same values). Components read tokens through a `useTheme()` hook. **No raw hex values in components.**

Appearance setting: **System (default) / Light / Dark**. Store it on the device, and in `profiles.appearance` so it follows the user across devices. Switching modes must be instant, with no reload.

## Colour tokens
| Token | Use | Dark | Light |
|---|---|---|---|
| `bg` | Screen background | `#131512` | `#F3F2EC` |
| `sf` | Cards, sheets | `#1C1F1B` | `#FFFFFF` |
| `sf2` | Inputs, chips, nested surfaces | `#262A24` | `#E9E8E1` |
| `ln` | Borders, dividers | `#31362F` | `#DCDBD2` |
| `tx` | Main text | `#E6E8E1` | `#1B1D19` |
| `mu` | Secondary text, labels | `#9CA295` | `#5D6257` |
| `ac` | Accent fill (primary buttons, earned ring, active chip) | `#B9DE5C` | `#C6E86E` |
| `on` | Text/icons on top of `ac` | `#131512` | `#1B1D19` |
| `act` | Accent as text or icons on `bg`/`sf` (links, green icons) | `#B9DE5C` | `#4F7212` |
| `rt` | Route line on maps | `#B9DE5C` | `#5E8A0F` |
| `cnt` | Map contour lines, inactive dots | `#31362F` | `#D6D9CE` |
| `bd` | Map borders | `#3A4A3F` | `#AFBDA5` |
| `sea` | Map water | `#131A1D` | `#D2E1EA` |
| `land` | Map land | `#27312B` | `#F2F5EC` |
| `ph1`–`ph4` | Photo placeholders while images load | `#3A4838` `#4A3F35` `#35434C` `#4A4652` | `#C8D4C0` `#DCCFC0` `#C5D2DB` `#D3CEDA` |
| `scrim` | Behind sheets and popups | `rgba(19,21,18,0.78)` | `rgba(255,255,255,0.86)` |
| `ring` | Avatar outline | `#000000` | `#1B1D19` |
| `warn` | Heads up, deadlines | `#F0B45A` | `#9A5F00` |
| `danger` | Delete, hide, flagged | `#F08A7E` | `#B33A2B` |
| `info` | Info chips, links in admin | `#8FB9E6` | `#2B65A3` |

Contrast rules:
- In light mode, green **text** always uses `act` (`#4F7212`), never `ac`. The light `ac` is a fill colour only.
- The light `warn`, `danger` and `info` values are new (they aren't in the prototype). They're darkened to pass 4.5:1 contrast on the light background.
- Badge tiers are icon colour only:
  - bronze `#C8895A`
  - silver `#B9C0C6`
  - gold `#E8C25A`
  - In light mode, darken each by about 15% so the icon stays visible on white.

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
- Must-know category icons are always green (`act`).
- Bottom nav: Explore (backpack), Search, + (new route), Friends, Me.

## Motion
- Keep it subtle: 150–250ms ease-out for sheets and toggles.
- Pledge bubbles bounce slowly (see SPEC → Pledge).
- Respect "Reduce motion": turn off bouncing and reels' auto-advance.

## Maps
- Make two Mapbox styles, "Sightquest Dark" and "Sightquest Light", built from the map tokens above (`sea`, `land`, `bd`, `cnt`, `rt`).
- Switch the style with the theme.
- Route lines are `rt`, 3px, with round joins. Moment photo pins are 28px circles with a 2px `ac` ring.
