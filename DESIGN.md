---
name: Card Battle
description: Arcade Holo, a night neon arcade ground with white holo cards, for a phone-first elimination card game.
colors:
  bg-0: "#0c0920"
  bg-1: "#17113a"
  glow-a: "#ff3d7f"
  glow-b: "#3da9ff"
  panel: "#1f1850"
  panel-2: "#2b2256"
  ink: "#0c0920"
  text: "#f3eeff"
  text-2: "#cfc6ff"
  text-on-card: "#2a2550"
  text-on-cta: "#0c0920"
  card-face-0: "#ffffff"
  card-face-1: "#f1edff"
  life: "#ff3d7f"
  point: "#ffc93d"
  upgrade: "#3dcf8f"
  shield: "#6b8cff"
  cta: "#ffd43d"
  cta-2: "#3da9ff"
  danger: "#ff4d4d"
  threat-attack: "#ff3d7f"
  threat-other: "#ffa53d"
  mine: "#3da9ff"
  seat-0: "#7cc4ff"
  seat-1: "#ff6461"
  seat-2: "#4fe06a"
  seat-3: "#f5e05a"
  seat-4: "#a080ff"
  seat-5: "#f5b07a"
  seat-6: "#33e6e0"
  seat-7: "#f655c1"
typography:
  display:
    fontFamily: "'Lilita One', ui-rounded, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 400
    lineHeight: 1.1
  title:
    fontFamily: "'Lilita One', ui-rounded, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.2
  vital:
    fontFamily: "'Lilita One', ui-rounded, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1
  card:
    fontFamily: "'Fredoka', ui-rounded, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "'Nunito', ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.4
  input:
    fontFamily: "'Nunito', ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.3
  caption:
    fontFamily: "'Nunito', ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.3
  micro:
    fontFamily: "'Nunito', ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 800
    lineHeight: 1.2
rounded:
  chrome: "12px"
  chrome-sm: "10px"
  card: "12px"
---

# Design System: Card Battle

> Derived from the code in `apps/client/src/ui/` (L72-05) and written by Impeccable
> `document` in scan mode. The qualitative answers come from technical spec v7 §5 and
> `PRODUCT.md` (designer decisions of 2026-10-20, Q3b), not from a new interview.
>
> **Precedence on conflict: code, then technical spec v7 §5 (normative), then this file.**
> A task that adds or changes a token or a `ui/` component updates this file in the same
> commit (spec v7 §5.8, §12.5). The tokens live in `apps/client/src/ui/tokens.css` and are
> mirrored in `apps/client/src/ui/palette.ts`; `ui/palette.test.ts` fails when they differ.

## Overview

**Creative North Star: "Arcade Holo"**

The world is a night neon arcade (B1): a deep indigo ground lit by two soft halos, a pink
one at the top left and a blue one at the bottom right, with faint scanlines. The cards are
white holo cards (B2): the only soft, bright, rounded objects on screen, edged by an
iridescent rim, so the eye goes to them first. Everything around them is hard-edged arcade
chrome: thick ink outlines, hard offset shadows, chunky rounded type.

The system serves a table game played on a phone. Reading the table comes before decoration:
who threatens whom, for how much, and when it lands must read at a glance, with up to eight
seats on a 375 px screen. The mood is playful and confident, never glossy or noisy, and
nothing carries information by color or motion alone.

This file describes **Lot 72 only**: tokens, fonts, the ground, the motion helpers and the icon
set. The V2 light theme in `index.css` still governs every screen until that screen's V7 lot
lands (spec v7 §4.4); no old screen is recolored.

**Key Characteristics:**
- One dark theme, no light theme.
- Two shape families: hard arcade chrome and soft holo cards.
- Three typefaces with fixed roles: Lilita One, Fredoka, Nunito.
- Hex values everywhere inline; utilities and variables only in classes.
- Reduced motion keeps fades and color flashes, nothing else.

## Colors

A violet-black ground, bright resource colors, one warm primary CTA and eight seat hues.
Every value below is declared once in `ui/tokens.css`, mirrored in `ui/palette.ts`
(`V7_COLORS`, `V7_SEAT_COLORS`, `v7Color`, `v7SeatColor`) and reachable in classes as
`bg-v7-<token>` / `text-v7-<token>` / `border-v7-<token>` (`--color-v7-<token>`). The names
carry a `v7` infix so no V2 name (`--color-ink`, `--color-surface*`, `--color-seat-*`,
`--radius-card`, `--radius-button`, `--font-sans`) is reused; L81 may drop the prefix.

### Ground
- **Night Indigo** (`--bg-0` #0c0920): page ground bottom, deepest surface.
- **Dusk Violet** (`--bg-1` #17113a): page ground top; the gradient runs `--bg-1` to `--bg-0`.
- **Panel** (`--panel` #1f1850) and **Panel Raised** (`--panel-2` #2b2256): panels, sheets and
  pill backgrounds, one step apart.
- **Pink Halo** (`--glow-a` #ff3d7f) and **Blue Halo** (`--glow-b` #3da9ff): the two radial
  ground halos at 30% opacity. They are halos, not text or fills.

### Text
- **Moon White** (`--text` #f3eeff): primary text on the dark ground.
- **Lavender Mist** (`--text-2` #cfc6ff): secondary text on the dark ground.
- **Card Ink** (`--text-on-card` #2a2550): everything printed on a white card face.
- **CTA Ink** (`--text-on-cta` #0c0920): the label color on `--cta`, `--cta-2` and `--danger`
  fills and on `--life` chips. It is the only token that reaches AA on `--danger` (5.97:1).
- **Outline Ink** (`--ink` #0c0920): arcade outline and hard-shadow color. **Never text.**
- **Card Face** (`--card-face-0` #ffffff to `--card-face-1` #f1edff): the white inner face
  gradient of a holo card.

### Resources (a resource keeps its color everywhere)
- **Life Pink** (`--life` #ff3d7f): lives, damage, "aimed at you".
- **Point Gold** (`--point` #ffc93d): points.
- **Upgrade Green** (`--upgrade` #3dcf8f): upgrade points.
- **Shield Blue** (`--shield` #6b8cff): shield.

### Actions and threats
- **Sun CTA** (`--cta` #ffd43d): primary call to action.
- **Sky CTA** (`--cta-2` #3da9ff): secondary call to action.
- **Alarm Red** (`--danger` #ff4d4d): leave, destroy.
- **Threat Attack** (`--threat-attack` #ff3d7f): attack-tone threats (attacks, Sentence, Mirror;
  L51-07).
- **Threat Other** (`--threat-other` #ffa53d): hostile non-attack effects (Spy, Thief family).
- **Mine** (`--mine` #3da9ff): the point-of-view player's own outgoing effects.

### Seat hues (provisional: tuned in the L72/L74 playtests, spec v7 §14.3)
Seat identity: avatar fill, name, third-party arrows. Index is the position in
`view.players`, in the V2 order (blue, red, green, yellow, violet, orange, teal, pink).

| Token | Hex | Lowest contrast on a ground |
|---|---|---|
| `--seat-0` | #7cc4ff | 7.64:1 on `--panel-2` |
| `--seat-1` | #ff6461 | 4.94:1 on `--panel-2` |
| `--seat-2` | #4fe06a | 8.32:1 on `--panel-2` |
| `--seat-3` | #f5e05a | 10.70:1 on `--panel-2` |
| `--seat-4` | #a080ff | 4.79:1 on `--panel-2` |
| `--seat-5` | #f5b07a | 7.76:1 on `--panel-2` |
| `--seat-6` | #33e6e0 | 9.23:1 on `--panel-2` |
| `--seat-7` | #f655c1 | 4.77:1 on `--panel-2` (lowest of all) |

**Metric.** Seat hues are compared with CIEDE2000 (sRGB, D65, kL = kC = kH = 1), implemented in
`ui/contrast.ts` as `deltaE2000`. `SEAT_HUE_MIN_DELTA_E = 20`: every pair of the eight hues is at
least 20 apart. The measured minimum is **21.33** (`--seat-4` / `--seat-7`). Each hue is also at
least 4.5:1 on all four grounds (`--bg-0`, `--bg-1`, `--panel`, `--panel-2`), because seat names
are text. `ui/contrast.test.ts` fails if either bound breaks.

### Contrast record (WCAG AA: 4.5:1 body, 3:1 large)
- `--text` / `--text-2`: 17.19 / 12.25 on `--bg-0`, 15.70 / 11.19 on `--bg-1`, 14.17 / 10.10 on
  `--panel`, 12.61 / 8.99 on `--panel-2`.
- `--text-on-card`: 14.20 on `#ffffff`, 12.37 on `#f1edff`.
- `--text-on-cta`: **13.70** on `--cta`, **7.73** on `--cta-2`, **5.97** on `--danger`
  (5.79 on `--life`). `--danger` reaches only 4.34 with `--text-on-card`, 2.88 with `--text` and
  3.27 with white, which is why the token exists.
- Resource and threat colors are text only at large size, on every ground (spec v7 §5.1); they
  are fills, rings and icons otherwise. `ui/contrast.test.ts` additionally guarantees at least
  4.5:1 on `--bg-0`, `--bg-1` and `--panel`, which keeps large text safe there, and 3:1 on
  `--panel-2` (`--life` and `--threat-attack` 4.25, `--danger` 4.38).

### Named Rules
**The Own-Hue Rule.** A seat hue never shares an element with `--life` or a `--threat-*` color.
Measured near collisions (CIEDE2000): `--seat-0` / `--mine` 8.1, `--seat-1` / `--danger` 4.1,
`--seat-5` / `--threat-other` 8.6, `--seat-7` / `--life` 13.4. Seat identity and threat
meaning are separated by element, never by a subtle shade.

**The Ink Rule.** `--ink` draws outlines and hard shadows only. Text on a CTA fill uses
`--text-on-cta`; text on a card uses `--text-on-card`.

**The Large-Text Rule.** Resource colors (`--life`, `--point`, `--upgrade`, `--shield`) and
threat colors (`--threat-attack`, `--threat-other`, `--mine`) are text only at large size, on
every ground; otherwise they are fills, rings and icons (spec v7 §5.1). `ui/contrast.test.ts`
additionally guarantees at least 4.5:1 on `--bg-0`, `--bg-1` and `--panel`, which keeps large
text safe there.

**The Inline Hex Rule.** Inline styles take hex values from `ui/palette.ts`, never `var()` or
`color-mix()` (mobile Safari painted theme variables gray in V2; see `ui/seat-colors.ts`).

## Typography

**Display Font:** Lilita One (`--font-v7-display`, with `ui-rounded, system-ui, sans-serif`)
**Card Font:** Fredoka (`--font-v7-card`, with `ui-rounded, system-ui, sans-serif`)
**Body Font:** Nunito (`--font-v7-body`, with `ui-sans-serif, system-ui, sans-serif`)

**Character:** Lilita One is the chunky arcade voice for anything you tap or count. Fredoka is
the friendlier print on a card face. Nunito keeps long text calm and legible. All three are
self-hosted through `@fontsource` (`ui/fonts.ts`); Outfit stays in `main.tsx` until L81.

### Hierarchy
- **Display** (Lilita One 400, 32px, `--type-display`): wordmark and the biggest numerals.
- **Title** (Lilita One 400, 20px, `--type-title`): titles, buttons, seat names. Own lives are
  at least 20px.
- **Vital** (Lilita One 400, 22px, `--type-vital`): the incoming damage badge and other vital
  numbers, at least 22px on a 375 px phone.
- **Card** (Fredoka 500-700, `--font-v7-card`): everything printed on a card: cost, damage,
  name, the "+" badge.
- **Body** (Nunito 700-900, 14px, `--type-body`): descriptions, log lines, form labels.
- **Input** (Nunito 700, 16px, `--type-input`): text inputs, so iOS does not zoom on focus.
- **Caption** (Nunito 700, 12px, `--type-caption`) and **Micro** (Nunito 800, 11px,
  `--type-micro`): secondary labels. 11px is the floor.

Tailwind utilities: `font-v7-display`, `font-v7-card`, `font-v7-body`, `text-v7-micro`,
`text-v7-caption`, `text-v7-body`, `text-v7-input`, `text-v7-title`, `text-v7-vital`,
`text-v7-display`.

### Named Rules
**The Floor Rule.** No functional text under 11px (Impeccable `undersized-ui-text`) and no text
input under 16px.

**The Vital Rule.** Own lives are at least 20px and the incoming damage badge at least 22px on
a 375 px phone.

**The Suffix Rule.** A `--text-v7-*` size suffix never equals a `--color-v7-*` suffix, so
`text-v7-<x>` is never ambiguous between a size and a color.

## Layout

Phone portrait first (375 px, up to eight seats, no horizontal page scroll); desktop is
derived and a landscape phone is a compact mode (spec v7 §2 Q2, §6.4). Touch targets are at
least 44px. The layout mode comes from one rule (Primitives › Viewport modes); seat arc, grid
and sheet placement land in later lots.

The page ground is the opt-in class **`.v7-ground`** (`ui/tokens.css`, `@layer components`):
`--bg-0` under a `--bg-1` to `--bg-0` gradient, the two halos (`--glow-a` top left, `--glow-b`
bottom right, 30% opacity as literal `rgb()` for older mobile Safari) and static 1px
scanlines every 3px in `--scanline` (`rgba(255,255,255,.03)`). It is applied by a V7 surface,
**never on `html`, `body` or `#root`**, and never sized with `vh` or `dvh` (dialogs size to
`visualViewport`, L53-02).

## Elevation & Depth

Depth is hard and graphic, not ambient. Arcade chrome sits on a hard offset shadow with no
blur; only holo cards carry a soft shadow, which is what makes them the only soft objects.

- **Chrome shadow** (`box-shadow: 0 4px 0 var(--ink)`, `--chrome-shadow`, `shadow-v7-chrome`):
  buttons, pills, panels, avatars, sheets.
- **Card shadow** (`box-shadow: 0 10px 22px rgba(0, 0, 0, 0.45)`, `--card-shadow`,
  `shadow-v7-card`): holo cards only.
- **Pressed state:** the element translates `--chrome-press-y` (3px) down and drops the shadow.

### Named Rules
**The Hard-Edge Rule.** Chrome never blurs its shadow and cards never use a hard one.

## Shapes

Two families (spec v7 §5.3).

- **Arcade chrome:** 3px `--ink` outline (`--chrome-outline-width`), radius 12px
  (`--chrome-radius`, `rounded-v7-chrome`) or 10px (`--chrome-radius-sm`, `rounded-v7-chrome-sm`).
- **Holo cards:** radius 12px (`--card-radius`, `rounded-v7-card`), a 2px iridescent rim
  (`--card-rim-width`; `--card-rim-holo`, a conic gradient `#ff8ad8 #ffe17a #8af5d0 #8ccaff
  #c3a8ff`; specials use `--card-rim-gold`, a gold linear gradient `#fff2b0 #ffc93d #c98a12`)
  around a white face (`--card-face-0` to `--card-face-1`).

Chrome shape is read only from `--chrome-outline-width`, `--chrome-shadow`, `--chrome-radius(-sm)`
and `--chrome-press-y`, never from literals, so L80 can override them under
`[data-mode="tool"]`.

## Icons

A hand-made SVG set in the arcade style (spec v7 §5.6). Names come from `ICON_NAMES` in
`ui/icons/icon-names.ts` (`IconName`, `isIconName`); `RESOURCE_ICON` maps each
`ResourceKind` to its icon (`life`, `point`, `upgradePoint` to `upgrade`, `shield`). The
component is `<Icon name size? label? className? />` from `ui/icons/icon.tsx`. No icon font
and no icon library: every glyph is inline SVG.

### Drawing rules
- **Grid and outline.** `viewBox="0 0 24 24"`, default `size` 20. The root draws every shape
  with a 2-unit `--ink` outline, round caps and joins: exactly 2px at 24px, 1.67px at the
  default 20px, and it scales with `size` (no `non-scaling-stroke`).
- **A body is required.** `--ink` equals `--bg-0`, so an ink-only glyph would vanish on the
  ground. Every glyph has at least one light or colored filled shape. Ink is kept for details
  drawn over a body: pupils, pips, clock hands, mortar and text lines.
- **Thin motifs** that sit on the open ground (sparks, waves, handles, antenna, prongs, the
  flag pole) are an ink casing 4 units wider than a colored core, so the core keeps the same
  2-unit outline as a filled shape. Sparks may take a narrower casing so they stay inside the
  grid (`shield-active`: core 2.5, casing 6). A motif that crosses a body (the Unspy slash)
  takes a 1-unit casing instead, so it does not cut the body in two. Crosses (`eliminated`,
  `close`) are filled outlined polygons, never a cross character.
- **Inside the grid.** Every glyph, outline and casings included, stays within 0..24; a
  rasterized check of all 38 icons confirmed it (L72-07). Spark ends stay at least 3 units
  inside the edges, their casing radius. `disconnected` already touches 0..24 on both axes,
  outline included, so it has no margin left for a size or stroke bump (`shield-active`,
  `draw`, `flag` and `vibration` each reach one edge).
- **Solid dots.** An ink dot under 0.5 units radius with the inherited 2-unit stroke renders as
  a ring with a colored hole in Blink and WebKit, so such a dot (the `?` and `!` dots) is drawn
  as a solid ink circle (r 1.4, `stroke="none"`) instead. Dots from 0.5 units up (`chat` r 0.6,
  `random` r 0.9, the `invisibility` eyes rx 0.8) keep the inherited stroke and render solid.
- **Open gaps.** Repeated bars that must read as separate items on a light fill keep gaps of at
  least 3 units, wider than the outline, so the fill shows between them (`menu`: 5-unit bars,
  3-unit gaps). Parts stacked on purpose (the `draw` slabs, 0.5 units apart) share one ink
  band, which separates their fills.
- **Optical size.** Flat motifs (the eyes, the magnifier, the whistle) reach about 18 to 21
  units on their major axis (shape geometry, outline excluded), so they carry the same mass as
  the full-grid bodies (`menu`, `help`, `chat`). The slim `close` cross and the `invisibility`
  ghost are smaller by design. `draw` and `unspy` must read on their own at 16 to 24px: Lot 59
  makes the Draw and Unspy dock controls icon-only, and the table is phone first (spec v7 Q2).
- **Paint.** Only `V7_COLORS` hex from `ui/palette.ts`, never `currentColor`, `var()` or
  `color-mix()` (the Inline Hex Rule). Fills go on shapes, never on a `<g>`. No `<text>`.
- **One shape per name.** Each name has its own geometry, so no state is told apart by color
  alone. `help` and `coach` are different glyphs (Q45). `icon.test.tsx` enforces this.

### The set
| Group | Name | Motif | Body fill |
|---|---|---|---|
| Resource | `life` | heart | `--life` |
| Resource | `point` | coin with an inner ring | `--point` |
| Resource | `upgrade` | chunky up arrow | `--upgrade` |
| Resource | `shield` | heater shield | `--shield` |
| Status | `spied-by-you` | magnifier with a glint | `--mine` |
| Status | `spying-on-you` | eye with a large ink pupil (the same eye as `unspy`) | `--threat-other` |
| Status | `shield-active` | shield and three sparks at its top right | `--shield`, sparks `--cta` |
| Status | `block` | brick wall | `--text-2` |
| Status | `persistent` | two chasing arrows with broad heads | `--text-2` |
| Status | `invisibility` | ghost with ink eyes (the turns are a Badge value) | `--text-2` |
| Status | `reanimation-armed` | tombstone with an engraved cross, a rising arrow overlapping it | `--text-2`, arrow `--cta` |
| Status | `duplication-active` | two fanned cards | `--text` front, `--text-2` back |
| Status | `eliminated` | bold cross, the §6.2 seat cross | `--danger` |
| Status | `bot` | robot head with an antenna | `--text-2` |
| Status | `disconnected` | plug and socket on the diagonal, two prongs facing the socket across a gap | `--text-2`, prongs `--text` |
| Status | `absorb-window` | funnel | `--cta-2` |
| Status | `sentence-ticking` | hourglass | `--threat-attack`, caps `--text-2` |
| UI | `menu` | three 5-unit bars with 3-unit gaps | `--text` |
| UI | `shop` | bag | `--cta` |
| UI | `draw` | two staggered card-edge slabs, the top card lifted off them | `--text` card, `--text-2` slabs |
| UI | `unspy` | the `spying-on-you` eye (shared geometry), crossed by a slash (L58-07) | `--text-2`, slash `--text` |
| UI | `log` | lined scroll | `--text-2` |
| UI | `help` | `?` with a solid dot, in a disc | `--cta-2` |
| UI | `coach` | whistle | `--cta` |
| UI | `chat` | speech bubble with three dots | `--text` |
| UI | `feedback` | `!` with a solid dot, on a rounded badge | `--cta` |
| UI | `flag` | flag on a pole (leave, forfeit) | `--danger`, pole `--text-2` |
| UI | `sound` | speaker and two waves | `--text` |
| UI | `vibration` | phone between zigzags | `--text` |
| UI | `rules` | open book | `--text-2` |
| UI | `share` | box with a rising arrow | `--text` |
| UI | `copy` | two overlapping squares | `--text` front, `--text-2` back |
| UI | `minimize` | wide bottom bar | `--text` |
| L72 addition | `clock` | face with ink hands; the table rules seconds (L72-16) | `--text` |
| L72 addition | `close` | slim cross; Sheet, Dialog, Toast (L72-09) and coach hide (L72-17) | `--text` |
| L72 addition | `chevron-left` | chunky chevron; Carousel (L72-08) | `--text` |
| L72 addition | `chevron-right` | its mirror; Carousel (L72-08) | `--text` |
| L72 addition | `random` | die with ink pips; the Random-only mark (L72-16) | `--text` |

The five L72 additions are not in the spec §5.6 list; they exist because the named Lot 72
components render them.

### Accessibility and use
- **Decorative by default:** `aria-hidden="true"`, `focusable="false"`, no `<title>`. A
  non-empty `label` makes the svg `role="img"` with that `aria-label` and a matching first
  `<title>`; an empty `label` stays decorative, never an unnamed image.
- **Icon-only controls** go through `IconButton` (L72-08), whose `aria-label` is required and
  whose `title` defaults to it (L59-01). A bare `Icon` is never the only name of a control.
- **Counts** (Invisibility turns, card lives, `+n`) live in Badge or IconButton, never inside
  a glyph.
- **Seat hues** are never icon paint, and a `--life` or `--threat-*` icon never sits in a
  seat-hued element (the Own-Hue Rule, §5.1).
- **No icon on its own color.** An icon never sits directly on a fill equal or close to one of
  its body or motif tokens, because only the ink outline would remain. Close means CIEDE2000
  under 20 (`SEAT_HUE_MIN_DELTA_E`, the bound the seat hues use), which also covers a contrast
  near 1.2:1 in the same hue. On `--cta` that rules out `point`, `shop`, `coach`, `feedback`,
  `spying-on-you` and the `shield-active` and `reanimation-armed` motifs. On `--cta-2` it rules
  out `help`, `absorb-window`, `spied-by-you`, `shield` and `shield-active`. On `--danger` or a
  `--life` chip it rules out `life`, `eliminated`, `flag` and `sentence-ticking`. The caller
  puts such an icon in a `--bg-0` or `--panel` well on that fill, as with the `+N` point icon
  on the Draw button (spec v7 §6.1 item 5). The L72-08 primitives apply this rule. A body that
  only shares the luminance of the fill but not its hue (`--text-2` on `--cta`: 1.12:1, but
  CIEDE2000 52) stays legible, so `draw` can sit on the `--cta` Draw button.
- The root carries `data-icon={name}` as a lookup hook for tests and later components.
- **No emoji in `ui/`.** `ui/icons/no-emoji.test.ts` fails on any Extended_Pictographic
  character, and on U+2715 (multiplication X), in any `ui/` source file; draw that cross with
  `Icon name="eliminated"` or `"close"`.
- The `/dev/ui` gallery section `icons` (`ui/icons/icons.gallery.tsx`, L72-08) shows every
  glyph at 32px with its name, and `help` and `coach` labelled side by side (Q45).
- The classic table's `SpyEyeIcon` and `ForfeitFlagIcon` (`screens/table/`) stay until L75.

## Components

Each `ui/` component adds its section here, or in its own `##` section, in the same commit.
The icon set is in Icons; the L72-08 chrome primitives are in Primitives below, and the L72-09
Sheet, Dialog and Toast in Overlays.

### Motion (shared by every component)
- **Durations** (`ui/motion/motion-tokens.ts`, mirrored as CSS variables): `--dur-fast` 120ms,
  `--dur-base` 220ms, `--dur-slow` 400ms; `durationS('fast' | 'base' | 'slow')` converts to
  seconds for `motion`.
- **Card spring** (`CARD_SPRING`): `type: 'spring'`, stiffness 400, damping 28.
- **Entrance ease** (`EASE_ENTRANCE`, `--ease-entrance`, `ease-v7-entrance`):
  `cubic-bezier(0.16, 1, 0.3, 1)`, the same curve as V2 `MOTION_EASE`. Ease-out for entrances.
- **Reduced motion** (`prefers-reduced-motion: reduce`): components read only
  `usePrefersReducedMotion()` and run every motion prop through `motionSpecFor(spec, reduced)`,
  or spread `motionPropsFor(spec, reduced)` on a motion element (the same spec, typed as
  motion's props).
  `reduceMotionSpec` keeps opacity, color, background color and box shadow, drops every
  `x`, `y`, `scale` and `rotate`, and replaces the spring with a 120ms tween. The animated
  root carries `data-motion="reduced" | "full"`, and CSS animation or press classes are
  applied only when full. No sheen sweep, pulse, shake, particles, flying cards or slam; the
  same numbers and labels remain, so no information is carried by motion alone.

## Primitives (apps/client/src/ui/primitives/, L72-08)

Chrome classes come only from `ui/primitives/chrome-classes.ts`. Shape: `CHROME_OUTLINE_CLASS`
(the 3px ink outline), `CHROME_SHAPE_CLASS`, `CHROME_SHAPE_SM_CLASS`, `CHROME_FLAT_SM_CLASS`
(outline and small radius, no shadow: badges, inputs), `CHROME_DISC_CLASS` (avatars).
State: `CHROME_FOCUS_CLASS`, `CHROME_DISABLED_CLASS`, `chromePressClass`, `motionAttribute`.
Fills: `BUTTON_VARIANT_CLASS`, `iconNeedsWell`, `ICON_WELL_CLASS`. Tracks: `CHROME_TRACK_*`
for Tabs and Segmented. A primitive never restates the outline, shadow, radius or press offset
as a literal; every class map is a literal string, and composed constants are template
literals of those strings, so Tailwind still sees each class. Only the 3px chrome outline is
ever restated, and only in one place: the Slider thumb's `[&::-webkit-…]:` / `[&::-moz-…]:`
pseudo-element variants, because a constant cannot sit behind such a prefix. Token utilities
such as `rounded-v7-chrome-sm`, and the 2px outlines of small parts (count badges, Carousel
dots, the Slider track, the KitTile tag), are not the chrome outline, so they are not
exceptions. Focus is a 2px `--text` outline, offset 2px, on `:focus-visible`. Each animated control carries `data-motion="reduced" | "full"`.

**Every V7 scroll container is `relative`** (the `/dev/ui` ground, ScrollArea, the Carousel
track, the Sheet body). `sr-only` labels and other absolutely positioned descendants then
resolve against it and stay inside its clip. Otherwise they keep the initial containing block,
stretch `#root` (which clips and cannot be scrolled back), and a screen reader's focus-follows
can scroll the screen blank. Every new V7 screen follows the rule; pre-V7 screens adopt it when
their lot restyles them.

- **Disabled look:** disabled chrome reads "off", not faded. The fill turns `--panel-2`, the
  label `--text-2`, the outline dashed; the drop shadow goes and icons dim to 50%. The same
  look applies to `aria-disabled="true"`, which keeps a control focusable. A faded `--cta`
  turned muddy olive on `--panel`. A locked Segmented keeps its selected option in `--text-2`.
  A disabled Slider thumb turns `--text-2` and its readout dims.
- **Button:** `primary` (`--cta`), `secondary` (`--cta-2`) and `danger` (`--danger`) fills are
  labelled in `--text-on-cta` at 13.7 / 7.7 / 6.0 : 1; `quiet` is `--panel-2` with `--text`.
  Lilita One, 44px floor (`md`) or 56px (`lg`), `type="button"` by default. Press rule: the
  button drops `--chrome-press-y` (3px) and loses its shadow over `--dur-fast`; under reduced
  motion it only dims (`brightness-90`), with no translate. A disabled button shows
  `disabledReason` as visible `--text-2` caption text under it, joined to its
  `aria-describedby` (§11); `reserveReasonSlot` keeps that line, empty and aria-hidden.
  `className` lands on the outermost element: the button, or the wrapper holding the button
  and its reason line.
- **Focusable disabled actions (Q39):** a natively disabled button leaves the Tab order, so its
  reason is reachable only by sight. When the reason matters to keyboard and screen-reader
  users (Draw, Shop and Unspy in L74), the caller passes `disabled` with
  `focusableWhenDisabled`. The button then renders `aria-disabled="true"` instead of
  `disabled`, stays focusable with its reason described, swallows activation (click, Enter,
  Space) and has no press.
- **Icon wells:** on the three CTA fills an icon always sits in a round `--bg-0` well
  (`ICON_WELL_CLASS`), whatever its name, so no icon can meet a fill within CIEDE2000 20 of its
  body (Icons › Accessibility and use) and a later icon cannot either. On `quiet` the icon sits
  on the fill. Button and IconButton apply it; Pill, Badge, Toggle and KitTile put icons only
  on `--panel` or `--panel-2`, and Avatar draws its cross in a well.
- **IconButton:** a 44px square, `quiet` by default. Its `title` defaults to the `aria-label`
  (L59-01); `title={null}` removes it. `count > 0` draws a `--cta` badge that is aria-hidden,
  so the caller must put the number in `aria-label` ("Chat, 3 unread"). Icon and badge share
  one grid cell, so the root is not `relative` and `className` (`absolute top-3 right-3`)
  positions the button itself. `aria-disabled` gives the disabled look without a press and
  keeps focus; the caller's handler must be a no-op then.
- **Pill:** icon plus a Lilita value, read as "{label} {value}". A hidden value shows `?` and
  reads "{label} unknown", which is also its `title`. The tone is a 2px inset ring (`life`,
  `point`, `upgrade`, `shield`; `neutral` has none), never the value's color. `lg` puts the
  value on `--type-vital` (own lives at least 20px). The caption word shows with
  `captionVisible` and is screen-reader only otherwise.
- **Badge:** a Nunito caption label (or screen-reader only), a Lilita value, the tone as an
  inset ring. **BadgeGroup** shows 2 badges, then `+n`. The marker is a 44px button only with
  `onOverflowClick`, and then carries the chrome shadow so it reads as pressable.
  `overflowLabel` adds screen-reader words after `+n` (name "+2 more statuses"). The name keeps
  starting with the visible text (WCAG 2.5.3); without it the name is just `+n`.
- **Avatar:** a round chrome frame holding the portrait, or a seat-hued disc (`v7SeatColor`,
  `--text-2` for an unknown seat) with the name's first grapheme in `--text-on-cta`. The
  accessible name is `alt`, else the name. Eliminated: a grayscale face and the `eliminated`
  cross in a `--bg-0` well outside the filter, so it keeps its color on every seat hue.
- **Tabs:** a tablist on `--panel`, the selected tab `--cta` with `--text-on-cta`, a roving
  tabindex. ArrowLeft and ArrowRight move and select (wrapping, skipping disabled tabs), Home
  and End jump to the first and last enabled tab; one labelled tabpanel. Ids come from
  `idPrefix` (`{prefix}-tab-{id}`, `{prefix}-panel`) or `useId`. A selected tab that is
  disabled takes the locked look (`--text-2` fill), as in a locked Segmented.
- **Segmented:** a radiogroup of `aria-checked` radios, the checked one `--cta`. Arrow keys on
  both axes move and select; `disabled` locks the group (`aria-disabled`). Tabs and Segmented
  share `roving-focus.ts`. Both ignore Alt, Ctrl and Meta chords (`hasCommandModifier`), which
  belong to the browser; Shift is left alone.
- **Slider:** a native range, `--bg-0` track and `--cta` thumb in the chrome outline, with a
  Lilita readout. Commit rule: `onChange` is live, and `onCommit` fires once per gesture, on
  pointer release, on keyup after a step key, on blur, or on a native `change` outside a
  gesture. It never fires for the latest known value: the last commit, or the `value` prop
  once that changed after it. Each new prop bumps a version, so a prop that returns to an old
  value (60, commit 90, prop 90, prop 60) still lets 90 be sent again.
- **Toggle:** an `aria-pressed` button. The state reads from the knob position
  (`data-toggle-knob`); the `--cta-2` track is a second cue. The knob slides only when motion
  is full.
- **Tooltip:** a `--panel-2` bubble, always rendered (`hidden` while closed) and appended to
  the trigger's `aria-describedby`. It shows while the trigger is hovered or focused, tracked
  separately: leaving with the pointer keeps a focused one open, and a blur keeps a hovered
  one open. It is hoverable (WCAG 1.4.13): the bubble takes pointer events, and the 8px gap is
  padding on its positioning span inside the hover region. Once open, it is nudged inside an
  8px viewport gutter. Esc closes one layer per press (Q49). Open tooltips form a stack, and
  one shared capture-phase `document` keydown listener closes only the most recently opened
  one, then calls `stopImmediatePropagation`.
  - Still run: `window` capture listeners, and `document` capture listeners registered before
    the first open tooltip installed the shared one.
  - Stopped: later `document` capture listeners, every listener below `document`, every
    bubble-phase listener, and React handlers.
  - So the Sheet's Esc listener (L72-09) is a bubble-phase `document` listener: a tooltip
    open inside a sheet takes the first Esc, and the sheet the next one.
- **ScrollArea:** `y` (default), `x` or `both`, overscroll contained, the cross axis clipped. A
  `label` makes it a focusable named region. Without one, Chromium still makes an overflowing
  scroller with nothing focusable inside a Tab stop, but an unnamed one, so pass a `label`
  whenever the content can overflow. It is always `relative`, and a `className` of `absolute`
  or `fixed` loses to it (Tailwind emits `.relative` after `.absolute` and `.fixed`), so a
  caller that needs to position the scroller wraps it in a positioned element.
- **TextField:** 16px (`--type-input`) Nunito on `--panel-2`, 44px tall, so iOS never zooms on
  focus. The hint is `--text-2`. An error sets `aria-invalid`, turns the border `--danger` and
  prints its words in `--text` (`--danger` text is 4.38:1 on `--panel-2`), inside a polite
  live region that is always present, so an error that appears later is announced. The
  placeholder is `--text-2` at 70% opacity: 5.20:1 on `--panel-2` (`ui/contrast.ts`; 60%
  would fall to 4.20:1), dimmer than a typed `--text` value (12.61:1).
- **Carousel:** a scroll-snap track of full-width slides with chevron IconButtons, aria-hidden
  dots and a screen-reader status line, "{label}, {n} of {m}" (`role="status"`).
  - Paging scrolls smoothly, or instantly under reduced motion (§8.3). A swipe reports its
    index from the scroll position.
  - A starting slide (initial `index`, or a grid-to-track switch) is placed with
    `scrollTo({ behavior: 'instant' })`. That overrides the track's `scroll-smooth`, which a
    plain `scrollLeft` assignment would follow, and reports nothing while it lands.
  - At either end the chevron is `aria-disabled`, not `disabled`, so keyboard focus stays on it
    (WCAG 2.4.3), and activating it changes nothing.
  - The chevrons stop click and pointerdown from reaching a dismiss handler.
  - The track is `tabIndex={-1}`, out of the Tab order, because the chevrons and the status
    line already page it and name the position; content inside the slides stays reachable.
  - `gridAtDesktop` shows a grid with no controls and no carousel semantics in desktop mode.
    Its columns follow the slide count (2, 3, 4 → 2, 3, 2 columns; 5+ → 3, or 4 when 3 would
    leave one alone). No slide is left alone on a row for up to 12 slides; 13 is the first
    count where both 3 and 4 columns leave one.
- **KitTile:** a `--panel` chrome card with a decorative portrait, the Lilita name and icon
  stats with screen-reader labels. Selected: a `--cta` ring outside the outline and
  `aria-pressed`. Excluded: a grayscale portrait and the word "Excluded" (`EXCLUDED_LABEL`),
  never selectable (Q15, Q23). The `help` info control renders only with `onInfo` and
  `infoLabel`.

### Viewport modes
One rule, `viewportModeFor({ width, height })` in `ui/viewport-mode.ts` (spec v7 §6.4): a
visible height under 500px (`LANDSCAPE_COMPACT_MAX_HEIGHT_PX`) is `landscape-compact`;
otherwise wider than tall is `desktop`; otherwise `portrait`. `useViewportMode()` and
`useVisualViewportBox()` (`ui/use-visual-viewport-box.ts`) follow `visualViewport` resize and
scroll, with the window as the fallback. Carousel `gridAtDesktop`, Sheet placement (L72-09)
and the L73 seat layout reuse it.

### Copy
`ui/ui-copy.ts` holds only the new strings a `ui/` component needs, each listed in the PR for
designer review (spec v7 §10.6): `EXCLUDED_LABEL` "Excluded" and `carouselPositionLabel`
("{label}, {n} of {m}", the Carousel status line), both L72-08, and `MINIMIZE_LABEL`
"Minimize" (L72-09). L72-16 adds `TABLE_RULES_LABEL`. Every other label (IconButton names, Carousel previous and
next, the KitTile info control, the BadgeGroup `overflowLabel`) comes from the caller's
existing copy.

### /dev/ui gallery
DEV only: `isDevUiRoute` (`dev/dev-ui-route.ts`) matches `/dev/ui` and below, and `App.tsx`
imports `dev/ui-gallery.tsx` lazily behind `import.meta.env.DEV`, so production builds carry
no gallery chunk. html, body and `#root` clip their overflow (`index.css`), so the
`.v7-ground` root is the scroll container (`relative h-full overflow-y-auto
overscroll-contain`, as on Home, never `vh` or `dvh`). Its halos therefore size to the visible
box. `relative` keeps its `sr-only` descendants inside its clip, so `#root` stays exactly the
viewport size. The page links each section from a nav and renders each entry on a `--panel`
card. Each `ui/` area adds `ui/<area>/<area>.gallery.tsx` exporting `gallery: GallerySection`;
`import.meta.glob` finds it, and `collectGallerySections` sorts the sections by id and rejects
a duplicate id. Stateful demos live in a components-only sibling
(`primitives-gallery-demos.tsx`, `overlays.gallery-demos.tsx`). Demo copy is DEV-only, never a
shipped string.

## Overlays — Sheet, Dialog, Toast (L72-09)

`ui/primitives/sheet.tsx`, `dialog.tsx` and `toast.tsx`, on one sheet stack
(`sheet-stack.ts`, pure; `sheet-stack-context.ts`, the store) that implements spec v7 §6.7.
The V2 rule "one Esc closes every open Dialog" does not apply to V7 surfaces.

- **Layers** (`ui/layers.ts`, `Z_INDEX`): `sheet` 50, `sheetBar` 80, `banner` 90, `toast` 95.
  Sheets and Toast portal to `document.body`, so the layers are global, and a caller's
  `<form>` or transformed ancestor never captures them. Inside a layer the stack assigns
  `sheet + n` to expanded sheets and `sheetBar + n` to bars, clamped below the next layer.
- **Paint order**, bottom to top: read-only sheets, expanded blocking sheets, Minimize bars. A
  blocking sub-choice always paints above every read-only sheet, whatever opened first, and
  every sheet under it turns `inert`. Two blocking sheets (simultaneous Lot 71 reward pickers)
  stack in open order: the later one on top, the earlier one inert.
- **Depth:** read-only sheets "stack one level": only the newest two (`MAX_READ_ONLY_DEPTH`)
  paint. A third stays registered and hidden, and the oldest returns when a newer one closes.
- **Restore to top:** a sheet restored from its bar rises to the top of its group, so restoring
  the earlier of two pickers never leaves it under the other.
- **Esc (Q49):** only the top expanded sheet reacts, and only when it is read-only and not
  dismiss-locked. A locked top sheet absorbs Esc instead of passing it to the sheet below, so
  an Esc meant for one sheet never reaches another (a claim picker, Appendix A
  `claim-seat-dismiss-stay`). An Esc a child control already handled (`defaultPrevented`), or
  one pressed during an IME composition, is ignored. A tooltip inside a sheet closes first.
- **Read-only dismissal:** Esc, a backdrop press that starts and ends on the overlay, and a
  swipe-down of at least 80px on the handle, all through `onClose`. A press inside the panel, or
  a drag that starts in the panel and ends on the backdrop, never closes it.
  `closeOnBackdrop={false}` removes only the backdrop path; `dismissLocked` (the Feedback send
  lock, §7.7) removes all three. A backdrop press never moves focus out of the sheet.
- **Blocking sheets** have no `onClose`, no handle, and ignore Esc, backdrop and swipe. The
  only way out besides answering is **Minimize** (`MINIMIZE_LABEL`, a new §10.6 string listed
  in the Lot 72 PR for designer review; Q59), a quiet Button placed last in the panel so initial
  focus lands on the first body control. It collapses the sheet to a full-width `--cta-2` bar
  labelled with the sheet title, which restores it. The caller keeps intents locked while it is
  minimized (`onMinimizedChange`).
- **Bars:** 44px bars in 52px slots stacked up from the bottom of the visible box, centered
  and capped at 28rem. A caller-collapsed sheet (`collapsed` with `collapsedBar`, L74
  targeting) joins the bar layer the same way, Esc skips it and its focus trap is released.
  Every expanded overlay adds 52px of bottom padding per bar, so its content stays above them.
- **Focus** (L11-03 kept, `use-focus-trap.ts`): focus moves in on open (`initialFocusRef`, else
  the first focusable, else the panel); Tab and Shift+Tab wrap; on close it returns to the
  opener, but only when nothing else took focus meanwhile. Nothing is focused inside an inert
  or hidden sheet. Minimize hands focus to the bar, and restoring returns it to the panel.
- **Placement and size:** `Sheet` defaults to `bottom`. `Dialog` is a read-only Sheet with
  placement `auto`, so it is centered only in desktop mode (`viewportModeFor`) and is a bottom
  sheet on phones, landscape phones and portrait tablets. The overlay is `position: fixed` at
  the live `visualViewport` box (offsets and size; L53-02/07), never `100dvh`, `vh` or
  `inset-0`, with a 60% `--bg-0` scrim. The panel is `max-height: 100%` of that box and
  `max-width: min(<width>, 100%)` (Dialog `md` 28rem through `3xl` 48rem, via
  `dialogPreferredMaxWidth`). The body is the only scroller (`relative`, overscroll
  contained); the actions row sits outside it, so Close never scrolls away. Panels are
  `--panel` with the chrome outline and shadow, top corners rounded at the bottom edge, all
  corners when centered.
- **Toast** (§6.12): a `--panel-2` chrome card at the top of the visible box, on the toast
  layer, with a tone accent on its leading edge (`--cta-2` info, `--upgrade` success,
  `--danger` error) and a `close` IconButton named by the caller's `dismissLabel`. Errors are
  `role="alert"`, the rest `role="status"`. Every dismissal goes through
  `onDismiss('manual' | 'timeout')`, once per open; a rerender or prop change never dismisses
  or restarts the timer, which starts when `open` turns true (no `timeoutMs`: no timer).
- **Motion:** the scrim fades over `--dur-fast`; a bottom panel rises 24px and a centered one
  scales from 0.98, with opacity, over `--dur-base` on the entrance ease; the toast drops 12px.
  Under reduced motion all three only fade.

## Do's and Don'ts

### Do:
- **Do** read every V7 color from `ui/palette.ts` in inline styles and from `bg-v7-*`,
  `text-v7-*` and `border-v7-*` utilities in classes.
- **Do** put `.v7-ground` on a V7 surface that owns its page background.
- **Do** use `--text-on-cta` for labels on `--cta`, `--cta-2`, `--danger` and `--life` fills.
- **Do** keep a resource's color the same everywhere and pair it with an icon or label.
- **Do** run `pnpm test` after a token edit: `palette.test.ts` and `contrast.test.ts` are the
  gate.

### Don't:
- **Don't** put `.v7-ground` on `html`, `body` or `#root`, and don't size anything with `vh`
  or `dvh`.
- **Don't** use `--ink` as a text color.
- **Don't** put a seat hue and `--life` or a `--threat-*` color on the same element.
- **Don't** use `var()` or `color-mix()` in an inline style.
- **Don't** ship an emoji or a cross character in `ui/`; draw it with `Icon`.
- **Don't** reuse a V2 name for a V7 key, or let a `--text-v7-*` suffix equal a `--color-v7-*`
  one.
- **Don't** recolor an old screen: V2 `@theme` and `:root` values stay unchanged until that
  screen's lot lands.
- **Don't** add a detector ignore. The only one allowed is the pre-approved
  `radial-spotlight-glow` / `dark-glow` ignore scoped to `ui/tokens.css` (spec v7 §12.4).
