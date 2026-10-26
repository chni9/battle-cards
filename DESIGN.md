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
input under 16px. One exception: a hand card's name may shrink below 11px so its longest word
never breaks (Card, L72-12). It happens only for names whose widest word is long, only on
viewports under about 367px (a hand card under 69.75px), and bottoms out at 10.04px on the 64px
clamp floor; the 10px floor is never reached by a catalog name.

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
  around a white face (`--card-face-0` to `--card-face-1`). An upgraded card adds the holo foil
  `--card-holo-sheen`, a 115deg linear rainbow `#ff4fb4 #ffc21a #2fe0a8 #3d9bff #9b6bff`, the
  rim's hue order at full saturation (Card).

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

## Illustrations

The existing drawings only, never new art (spec v7 §5.5).

- **Files:** `apps/client/src/assets/art/cards/<cardId>.png` (31 base cards, Roulette
  included) and `apps/client/src/assets/art/kits/<kitId>.png` (16 kits, Gambler included):
  transparent, trimmed to the drawing, at the source's native resolution. They are generated
  by `scripts/extract-art.ts` from the base drawings in `images/` and never hand-edited.
- **Lookup:** `artFor(id)` (`ui/asset-lookup.ts`), for a card or a kit. It never throws; a
  missing drawing falls back to the family verso, then to a transparent pixel.
- **No activated art:** upgraded, activated and active looks are Card code states (§5.4).
  Roulette uses its base drawing.
- **No printed value:** the frame, the header row, the extra printed rows, the kit stat column
  and Super Mirror's corner badge are removed. Every number on a card or kit comes from the
  catalogs.
- **No halo on dark grounds:** the two pixel rows along the outer edge (including the
  stair-corner pixels) are un-blended from the old ground, so the anti-aliasing fades to
  transparent instead of keeping a light rim of white, cream or kit pastel. A solid fill on the
  second row is left as drawn. Light parts that sit close to the ground keep their edge as
  drawn (Ghost, the Curse skull, Scientist's flask, Assassin's blade edge, Attack Thief's white
  card, the Spy-Thief hand and eye white, the Reanimation face).
- **Old ground stays where it is enclosed:** the ground is removed by edge flood-fill only, so
  a region of card or kit ground that the drawing encloses keeps its color (§5.5): the
  Untouchable lenses, the Cloning helix stripes, Block's cream disc, the white diamond between
  Strong attack's guards, Mirror's hanger triangle, the Reanimation crescent and band (under
  the shoulders, and between the hat brim and the arrow), Specialist's gear hole, the
  Duplicator lilac sliver and the MEGA ATTACK nose.
- **Sign-off pending:** the designer signs the before/after contact sheet on the Lot 72 PR
  (L72-21) before any screen stops using the old PNGs.

## Components

Each `ui/` component adds its section here, or in its own `##` section, in the same commit.
The icon set is in Icons; the L72-08 chrome primitives are in Primitives below, the L72-09
Sheet, Dialog and Toast in Overlays, the L72-11 cost glyph and effect copy in Cost glyphs
and effect copy, the L72-12 holo card in Card, the L72-14 chat in Chat, the L72-15 kit
portrait and kit details in Kit, the L72-16 table rules strip and sheet in Rules, and the
L72-17 coach panel in Coach panel.

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
State: `CHROME_FOCUS_CLASS` (and `CHROME_FOCUS_INSET_CLASS`, the same ring inside the edge for
scroll regions), `CHROME_DISABLED_CLASS`, `chromePressClass`, `motionAttribute`.
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
  `label` makes it a focusable named region (`role="region"`, `tabIndex` 0) marked
  `data-scroll-region`, the mark the sheet focus trap reads: inside a sheet, initial focus goes to
  the first focusable thing that is not a scroll region, so a field after a labelled area keeps
  it, and the region is focused only when it is all there is (a read-only transcript). Without
  a label, Chromium still makes an overflowing scroller with nothing focusable inside a Tab
  stop, but an unnamed one, so pass a `label` whenever the content can overflow. `focusRing`
  (`'outer'`, the default, or `'inset'`) picks `CHROME_FOCUS_CLASS` or `CHROME_FOCUS_INSET_CLASS`:
  an area that fills a clipping, rounded container (the coach body) takes `inset`. It is always
  `relative`, and a `className` of `absolute` or `fixed` loses to it (Tailwind emits `.relative`
  after `.absolute` and `.fixed`), so a caller that needs to position the scroller wraps it in a
  positioned element.
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
"Minimize" (L72-09), and `TABLE_RULES_LABEL` "Table rules" (L72-16). Every other label (IconButton names, Carousel previous and
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
  `sheet + n` to everything on the sheet layer and `sheetBar + n` to Minimize bars, clamped
  below the next layer.
- **Paint order**, bottom to top: expanded read-only sheets, caller-collapsed read-only bars
  (L74 targeting), expanded blocking sheets, Minimize bars of blocking sheets. A blocking
  sub-choice always sits on top of every other sheet, whatever opened first (§6.7: "any other
  open sheet is pushed underneath"), and only its own Minimize bar stays above it. Two
  blocking sheets (simultaneous Lot 71 reward pickers) stack in open order: the later one on
  top.
- **One live sheet** (WAI-ARIA modal dialog): every painted expanded sheet with another
  expanded sheet above it is `inert`, read-only or blocking, and so is a collapsed read-only
  bar under an expanded blocking sheet. Only the top expanded sheet (`liveSheetId`) holds focus
  and takes input; Minimize bars are never inert.
- **Depth:** read-only sheets "stack one level": only the newest two (`MAX_READ_ONLY_DEPTH`)
  paint. A third stays registered and hidden, and the oldest returns when a newer one closes.
- **Restore to top:** a sheet restored from its bar rises to the top of its group, so restoring
  the earlier of two pickers never leaves it under the other.
- **Esc (Q49):** only the top expanded sheet reacts, and only when it is read-only and not
  dismiss-locked. A locked top sheet absorbs Esc instead of passing it to the sheet below, so
  an Esc meant for one sheet never reaches another (a claim picker, Appendix A
  `claim-seat-dismiss-stay`). An Esc a child control already handled (`defaultPrevented`), or
  one pressed during an IME composition, is ignored. A tooltip inside a sheet closes first.
  While the newest read-only sheet is collapsed (targeting), no sheet takes Esc and the event
  stays unhandled: L74's targeting handler owns it ("Esc cancels targeting", §6.6.5).
- **Read-only dismissal:** Esc, a backdrop press that starts and ends on the overlay, and a
  swipe-down of at least 80px on the handle, all through `onClose`. A press inside the panel, or
  a drag that starts in the panel and ends on the backdrop, never closes it.
  `closeOnBackdrop={false}` removes only the backdrop path; `dismissLocked` (the Feedback send
  lock, §7.7) removes all three. A backdrop press never moves focus out of the sheet.
- **Press shield** (spec v7 §1 "an accidental tap never spends the turn", §6.6.4): a press
  during a sheet's exit does nothing, whether or not another sheet remains beneath. The exiting
  overlay keeps covering the whole box, hit-testable and `aria-hidden`, with handlers that check
  the sheet is still open; only its panel turns `inert`. So a double tap closes one sheet and
  never reaches the sheet or the table below; a deliberate press within ~220ms is absorbed and
  simply repeated. Only the sheet that was live when it started closing shields: a covered
  sheet closing under it stays inert and click-through, one z-index below the live sheet, so it
  never swallows the live sheet's presses. When a panel really collapses to its bar (Minimize,
  L74 "Use" → targeting) or a bar restores its panel, a transparent no-op shield covers the box,
  bar included, for `--dur-base` (none under reduced motion), and Minimize and restore ignore
  presses in that window: the bar shows at once, but a double tap neither re-expands nor
  re-minimizes. A sheet that mounts already collapsed raises no shield. A closing toast stays
  click-through instead: it covers a small area, and blocking the dock under it would be less
  predictable.
- **Blocking sheets** have no `onClose`, no handle, and ignore Esc, backdrop and swipe. The
  only way out besides answering is **Minimize** (`MINIMIZE_LABEL`, a new §10.6 string listed
  in the Lot 72 PR for designer review; Q59), a quiet Button placed last in the panel so initial
  focus lands on the first body control. It collapses the sheet to a full-width `--cta-2` bar
  labelled with the sheet title and a chevron-up (the `chevron-right` glyph turned, in a
  `--bg-0` well), `aria-expanded="false"`, which restores it. The caller keeps intents locked
  while it is minimized (`onMinimizedChange`).
- **Bars:** 44px bars in 52px slots stacked up from the bottom of the visible box, centered
  and capped at 28rem; the full-width strip around a bar lets presses through. A
  caller-collapsed read-only sheet (`collapsed` with `collapsedBar`, L74 targeting) takes a
  slot the same way, but on the sheet layer: under an expanded blocking sheet, inert. Esc skips
  it and its focus trap is released. Every expanded overlay adds 52px of bottom padding per
  bar, so its content stays above them.
- **Focus** (L11-03 kept, `use-focus-trap.ts`; focus follows the live sheet): whenever a sheet
  becomes the live one it moves focus in unless focus is already inside (`initialFocusRef`,
  else the first control, else the scroll region, else the panel); Tab and Shift+Tab wrap. The
  opener is recorded when the sheet opens, kept while it is minimized or covered, and cleared
  when it closes. On close, focus goes to the opener only if it is reachable (on the page with
  no modal sheet left, on an uncovered bar, or inside the new live sheet), else into the new
  live sheet, else up the opener chain (a minimized sheet in the chain is reached through its
  bar), and never stays in a closing panel. A closing sheet re-parents every opener that pointed
  into it to its own opener, so a sheet opened from inside it still returns focus after it is
  gone. Minimize hands focus to the bar, unless another sheet becomes live: that sheet takes it,
  back on the blocking sheet's opener when it is inside (the Chat message field). Restoring
  returns focus to the panel. Pressing a toast's OK while a sheet is open returns focus to the
  live sheet (onto the element focused before, when it is there), else to that element.
- **Keyboard scroll:** a body that overflows becomes a focusable `role="region"` named by the
  sheet title (`tabIndex={0}`, the inset focus ring, so it never crosses the title) and joins
  the Tab cycle in DOM order, so a text-only sheet scrolls with the arrow and page keys (WCAG
  2.1.1). Initial focus still goes to the first control when one exists.
- **Placement and size:** `Sheet` defaults to `bottom`. `Dialog` is a read-only Sheet with
  placement `auto`, so it is centered only in desktop mode (`viewportModeFor`) and is a bottom
  sheet on phones, landscape phones and portrait tablets. The overlay is `position: fixed` at
  the live `visualViewport` box (offsets and size; L53-02/07), never `100dvh`, `vh` or
  `inset-0`, with a 60% `--bg-0` scrim. The panel is `max-height: 100%` of that box and
  `max-width: min(<width>, 100%)` (Dialog `md` 28rem through `3xl` 48rem, via
  `dialogPreferredMaxWidth`). The body is the only scroller (`relative`, overscroll
  contained); the actions row sits outside it, so Close never scrolls away. Panels are
  `--panel` with the chrome outline and shadow, top corners rounded at the bottom edge, all
  corners when centered. `ui/tokens.css` exempts them from the V2 `index.css` rule that pads
  every `[role="dialog"]` on screens under 500px tall.
- **Toast** (§6.12): a `--panel-2` chrome card at the top of the visible box, on the toast
  layer, with a tone accent on its leading edge (`--cta-2` info, `--upgrade` success,
  `--danger` error) and a `close` IconButton named by the caller's `dismissLabel`. Errors go to
  a `role="alert"` region, the rest to a `role="status"` one; both stay mounted, empty, while
  the Toast is mounted, so a polite toast is announced too. Every dismissal goes through
  `onDismiss('manual' | 'timeout')`, once per open; a rerender or prop change never dismisses
  or restarts the timer, which starts when `open` turns true (no `timeoutMs`: no timer).
- **Motion:** the scrim fades over `--dur-fast`; a bottom panel rises 24px and a centered one
  scales from 0.98, with opacity, over `--dur-base` on the entrance ease; the toast drops 12px.
  Under reduced motion all three only fade.

## Cost glyphs and effect copy (L72-11)

`ui/card/glyph-amount.ts`, `ui/card/cost-amount.tsx`, `ui/text/effect-text-with-icons.tsx` and
`ui/text/card-effect-copy.tsx` (spec v7 §6.6.1; Appendix A `global-card-effect-copy-inline-icons`).
They are the V7 successors of the V2 `CostDisplay`, `EffectTextWithIcons` and `CardEffectCopy`
in `design/components/`, which stay until L75 and L76 retire their consumers. Catalog text is
rendered as it is; the copy fixes of §10.5 are L72-13's.

- **Icon map** (`glyphAmountIcon`, one `GlyphAmount` shape for the structured costs and for the
  shield amount that only catalog prose carries): `points` and `pointsPerLife` use `point`,
  `lives` uses `life`, `upgradePoint` uses `upgrade`, `shield` uses `shield`. The tokenizer's
  resource kinds map in with `glyphAmountFromResource` (`point` to `points`, `life` to `lives`).
- **CostAmount anatomy:** one `inline-flex` span, never wrapping, with tabular digits. It holds
  a screen-reader-only spoken text, then one `aria-hidden` group: `{m}×` (only when the
  multiplier is not 1), the sign (`−` pay, `+` gain; none by default), the number, the icon. A
  `pointsPerLife` rate reads `N [point]/[life]` with two icons. The root carries
  `data-glyph-icon={IconName}` (the primary icon), and the tests and later components read it.
- **Spoken text:** structured costs keep `spokenCost`'s short wording ("3 pts", "1 pt",
  "3 pts/life", "2 upgrade points", "minus 10 pts", "2×4 pts"). A shield amount speaks "4 shield
  points" ("1 shield point"), wrapped the same way. The V2 inline glyph spoke only the number.
- **Tooltip:** `title` defaults to the spoken amount. `title={null}` renders no `title`, and the
  spoken text stays: inside a control that names itself, an inner `title` would replace the
  control's tooltip (L59-01). An unlabeled parent button is then named by the spoken amount.
- **Size and color:** `size` sets only the icon, 14 (`sm`, default), 16 (`md`) or 20 (`lg`) px.
  Font family, size, weight and color come from the parent: `--text` or `--text-2` on the dark
  grounds, `--text-on-card` on the card face. The number never takes a resource color at small
  size (§5.1; `--life` on `--panel-2` is 4.25:1). Icon paints are fixed, so CostAmount adds no
  well: a caller that sets one on `--cta`, `--cta-2`, `--danger` or a `--life` chip follows
  Icons › Accessibility and use (a `--bg-0` well, `--text` numbers).
- **EffectTextWithIcons:** each "4 lives", "3 points", "2 upgrade points" or "4 shield points"
  phrase becomes a `CostAmount` (default `iconSize` `md`, `sm` allowed), without a sign, since
  the prose already says who gains or pays. "instead of 3" keeps its words as ordinary visible
  text and takes the icon of the resource before it; with no earlier resource it stays prose.
  Damage, turn counts and "card lives" are not resource phrases and stay plain. Each amount and
  its "instead of" stay on one line. Amounts come from the catalog string, never from a value
  kept in code.
- **CardEffectCopy** (`card`, `isUpgraded`), top to bottom: a **Cost** row (the label, then the
  play cost at `md`; omitted when the card has none; Regeneration is 3 points per life, 2 when
  upgraded), the effect as held (`effect`, or `upgradeEffect` when upgraded; omitted when
  empty), then for a base card the **Upgrade** row on `--panel-2` (`rounded-v7-chrome-sm`): the
  label, a `--text-2` dash, `upgradeAdds`. The rows sit on the sheet's `--panel`, in `--text`,
  Nunito 700 at 14px (labels 800), line height 1.375. No "Cost:" prefix and no helper line.
  Rows carry `data-effect-part="cost" | "effect" | "upgrade"`.
- **Gallery:** the `/dev/ui` section `text` (`ui/text/text.gallery.tsx`) shows every amount kind
  with `signed`, `multiplier` and `size="lg"`; the prose cases ("instead of", three resources,
  shield, turns left as prose); and `CardEffectCopy` for Regeneration (base and upgraded), Basic
  attack and Tax.

## Card (ui/card)

`ui/card/card.tsx` and `ui/card/card-face.ts` (L72-12; spec v7 §5.3, §5.4, §5.5, §6.6.5, §8.2,
§8.3; Appendix A `global-card-face`, `global-activated-art-guard`,
`global-art-lot63-gambler-roulette`, `active-persistent-thumbs`, `sentence-chips`). It is the
only V7 card renderer; the V2 `design/components/card.tsx` stays for the classic screens.

- **API:** `<Card size instance damageMultiplier? counter? selected? unplayable? onActivate?
  className? dataAttributes? />`, or `<Card face="hidden" family size … />` for a Spy hand
  without identity. `size` is `hand | lifted | sheet | thumb | tile` (`CARD_SIZES`). With
  `onActivate` the root is a `<button type="button">` with `aria-pressed={selected}` (click,
  Enter and Space call back with the instance id; a hidden face calls back with no argument);
  without it, an `<article>`. The accessible name is `cardFaceLabel`: "Strong attack upgraded,
  4 damage", "Poison, 3 card lives", "Invisibility, 1 turn remaining"; a hidden face is "Hidden
  card". Thumbs also carry it as a native `title`, since they print no name. The caller decides
  `unplayable` and `counter`; an unplayable face stays activatable. The caller's `className`
  comes last on both root forms. Where a family is itself secret, the caller passes a neutral
  family (V2 used the action verso for unspied plays).
- **Size contract:** width and height both come from one width, `--card-w` when the caller sets
  it on the card (className `[--card-w:96px]`), else the size's default (`--card-w-size`): `hand`
  `clamp(64px, 19vw, 120px)` (spec), `lifted` `clamp(80px, 24vw, 150px)`, `sheet`
  `clamp(200px, 56vw, 240px)` (spec: at least 200px), `thumb` 44px (the touch target), `tile`
  `clamp(88px, 26vw, 128px)`. Height is `--card-w × 1.5`, a definite size, so a stretching flex
  or grid row cannot distort the card, and the row's own `items-*` alignment still applies
  (measured: a hand card in a 220px default flex row stays 71×107 at 375px). `--card-w` is an
  `@property` that does not inherit (`ui/tokens.css`): a container's value never resizes the
  cards inside it, so a lifted or sheet card in a hand row keeps its size. `--card-w` is the
  only resize path; L75's landscape-compact hand derives it from the visible height. The
  non-spec widths are picks for the L72-21 critique.
- **Overflow:** the selected lift (8px up, 105%), the focus ring (8px around), the counter
  glow (4px out plus a 12px blur) and the counter badge (8px under the bottom edge) reach past
  the 2:3 box. A scroll or `overflow-hidden` parent pads for them: about 16px around active
  cards and 10px under a card with a counter.
- **Frame:** radius `--card-radius` (12px), a `--card-rim-width` (2px) rim painted by its own
  layer under the face: `--card-rim-holo` for attacks and actions, `--card-rim-gold` for
  specials (also on hidden specials). Face `--card-face-0` to `--card-face-1`, radius 10px (card
  radius minus rim), shadow `--card-shadow`. Holo cards are the only soft objects.
- **Art:** only `artFor(cardId)`, the base drawing, never activated art (Sentence and Shield
  keep their guard, Roulette its cream drawing; upgraded and active looks are code states).
  `object-contain` in a fixed art box per size, centered, `alt=""`, `draggable={false}`, so a
  two-line name never shrinks it and every drawing reads at the same weight.
- **Name:** Fredoka 600 in `--text-on-card` (12.4:1 on `--card-face-1`), centered at the
  bottom, up to two balanced lines with tight tracking, none at `thumb`. It is never truncated
  and no word ever breaks: `cardNameFontSize` (`card-face.ts`) shrinks the name until its widest
  word fits the strip (`cardNameWordEm`, from Fredoka 600 advance widths), relative to the face
  as an `@container` (`cqi`). Base sizes: `hand` 11px, growing to about 12.8px at the 120px clamp
  top; `lifted` and `tile` 12px; `sheet` 20px (`--type-title`, balancing its 32px chips). Floors:
  11px everywhere, except **10px for a hand name** (`CARD_NAME_FIT`), the one exception to the
  11px functional floor. It bites only on narrow phones: the widest catalog word, "Regeneration"
  (5.798em with tight tracking), needs a strip of 63.8px at 11px, that is a 69.75px hand card
  (97 % of the face, face = card − 4px), reached at a 367px viewport (19vw). From about 367px
  down to 337px, where the 64px clamp floor starts, such a name shrinks from 11px to 10.04px,
  and stays at 10.04px below; the 10px floor itself is never reached by a catalog name.
  Measured: on a 375px phone every hand name stays 11px; at 320px the smallest is 10.04px.
  "Upgrade Point Thief" and "Super Regeneration" take two lines. Where `cqi` is unsupported, the
  name falls back to its strip's size class.
- **Chips** (Fredoka 700, tabular, a sticker look: pill, 1px `--card-face-0` ring, small
  shadow). Cost: `--panel-2` to `--panel` with `--text` (12.6:1), through `CostAmount` with
  `title={null}` (Tax a life chip, Regeneration its per-life rate), icon `sm` / `md` / `lg`; a
  per-life rate takes `sm` icons at `lifted` and `tile` too. Damage: `--life` with
  `--text-on-cta` (5.79:1), number only, `aria-hidden` (the accessible name carries it),
  `cardDamageChip` = `listedAttackDamage` × `damageMultiplier`, absent on non-attacks and on
  Tax, Absorber and Super Mirror. Numerals 11px at `hand` and `thumb`, 12px at `lifted` and
  `tile`, 20px at `sheet`; hand chips grow with the card past about 96px (16px tall and 11px on
  a phone, about 19px and 12.5px at 120px). `hand` and `thumb` stack the chips down the left
  edge (the next hand card overlaps from the right): cost, damage, "+". `lifted`, `sheet` and
  `tile` put cost then "+" down the left and damage top-right, so the top rail never holds the
  widest cost and the badge side by side; every chip stays inside the card at every size
  (measured at 320, 375 and 1440px). Thumbs carry no cost chip: they stay art-only plus damage
  (Appendix A `global-card-face`), because a two-digit cost spans a 44px face and no thumb place
  pays one.
- **Upgraded:** a gold "+" badge (`--card-rim-gold` with `--text-on-cta`, `aria-hidden`; the
  name says "upgraded"); a holo foil over the drawing: `--card-holo-sheen`, a saturated diagonal
  rainbow in the rim's hue order (pink, yellow, mint, blue, violet), at 70% with `soft-light`, on
  a layer twice the face width. Soft-light shifts the drawing's hues without muting them and
  leaves the white face white; `multiply` washed the face mint and `color` turned red flames
  brown. With full motion the foil drifts back and forth (`.v7-card-holo-drift`, 6.4s, two
  sweeps) and a white band crosses the face (`.v7-card-sheen`, 3.2s, sweeping in the first
  40%); both are translated layers. The name sits above the sheen. **Designer-approved on
  2026-10-26** ("Arc-en-ciel fort", `docs/agent/decisions.md`), recoloring of dark art included:
  keep it as is unless the designer rules again.
- **Active persistent** (`counter`): a pulsing `--cta-2` glow (a pre-blurred layer at 60% whose
  wrapper pulses its opacity) and a counter badge centered under the face: `--bg-0` pill with a
  1px `--cta-2` ring, Icon `life` (card lives) or `clock` (turns) at 10px, `--text` number,
  `aria-hidden`. No counter, no glow: Curse and the combat Shield get neither (L73/L74 may add
  an `active` prop).
- **Selected:** the spec's 3px `--cta` outline offset 2px; with full motion the card lifts 8px
  and scales 105%, easing over `--dur-base`. **Focus** never touches that outline: the button
  form lights a separate 2px `--text` ring 8px outside the card (`group-focus-visible`), so a
  focused selected card shows both and a focused unselected one only the ring, with or without
  motion. Unselected cards set `outline: none`, which also keeps the browser's own ring off.
  **Hover:** with full motion, a button card that is not selected lifts 4px on hover-capable
  pointers. **Unplayable:** `saturate(30%)` and `brightness(75%)`, so grey drawings (Suicide,
  Curse, the swords) read "not now" too, while the card stays solid; never grayscale or faded.
  The filter sits on the card body (`data-card-layer="body"`: rim, face or verso, chips, counter
  badge), never on the root or the focus ring, so the `--cta` selection outline and the `--text`
  focus ring keep full contrast on an unplayable card.
- **Hidden face:** the same frame and rim. The verso is `--panel-2`, lit from the top
  (`--text-2` at 20% fading out) and hatched in `--bg-0`, so it reads as a card on a `--panel`
  ground as well as on `--bg-0`; an inner `--text-2` frame line at 35%; a soft family halo
  (`--glow-a`, `--glow-b`, gold) behind a diamond gem in a `--bg-0` setting: `--threat-attack`
  (attack), `--cta-2` (action), gold (special). No name, art, id or chip.
- **Long-press guard:** every face prevents the context menu and sets `user-select: none` and
  `-webkit-touch-callout: none` (spec v7 §6.6.5); the art has `pointer-events: none`.
- **Reduced motion:** `data-motion="reduced"` drops the sheen sweep, the foil drift, the glow
  pulse, the selected lift and the hover lift; the still foil, every badge, the counter, the
  selection outline, the focus ring and the labels stay (checked in a stubbed reduced-motion
  page: no running animation).
- **Anchors:** root `data-card-face="up" | "hidden"`, `data-card-id`, `data-instance-id`
  (face up only), `data-card-family`, `data-card-rim="holo" | "gold"`, `data-card-size`,
  `data-motion`, `data-unplayable="true"`, plus the caller's `dataAttributes` (fixed ones
  win). Inside: `data-card-layer="glow" | "rim" | "face" | "sheen" | "sheen-tint" |
  "sheen-sweep" | "focus" | "body" | "verso" | "emblem"`, `data-card-name`, `data-card-chips="left-stack"
  | "corners"`, `data-card-chip="cost" | "damage"`, `data-cost-kind`,
  `data-card-badge="upgraded"`, `data-card-counter="card-lives" | "turns"`.
- **Gallery:** the `/dev/ui` section `card` (`ui/card/card.gallery.tsx`): families and rims,
  every size, chips, states, hidden faces, and every catalog drawing at `hand` size.

## Chat (ui/chat)

`ui/chat/chat-line.ts`, `ui/chat/chat-log.tsx` and `ui/chat/chat.gallery.tsx` (L72-14; spec v7
§6.9, §7.5; Appendix A `chat-compose-enter`, `lobby-chat`, `table-chat-popup`,
`chat-new-message-announcement`, `table-chat-side-stream-disclosure`,
`lobby-chat-walk-in-spectator-stream`, `end-finished-chat-readonly`,
`global-text-input-no-ios-zoom`). One `<ChatLog messages players canWrite onSend inputLabel?
placeholder? />` is shared by the lobby (L76), the arena chat sheet (L74) and the read-only Game
over chat (L77). The V6 `screens/table/chat-log.tsx` stays until those lots migrate.

- **Box:** `h-52`, `--panel-2` fill, `rounded-v7-chrome-sm`, `px-3 py-2`, no hard shadow, like
  the text input. It is a `ScrollArea` (`axis="y"`) named "Chat" (`CHAT_LOG_LABEL`, the V6 copy
  already on the lobby heading, the table button and the sheet title, so no new §10.6 string): a
  focusable named region, so a keyboard user can scroll it (WCAG 2.1.1; Arrow, Page and
  Home/End keys work). Its `data-scroll-region` keeps the message field the sheet's initial
  focus; on the read-only board the region takes it. The focus ring is the shared 2 px `--text`
  outline at a 2 px offset, and it clears the sheet body's padding.
- **Scrolling:** it opens on the newest line and then sticks to the bottom only while the reader
  is within 24 px of the end (designer 2026-10-26, `docs/agent/decisions.md`): a new line follows
  a reader at the bottom and leaves one who scrolled up where they are. The reader's own send
  always scrolls down. A new line is a changed count or newest `order`, never a new array
  identity. A `ResizeObserver` on the log content also sticks it to the end while the reader is
  there, because a sheet mounts its content hidden (no layout until it shows) and a font swap
  changes the height. There is no "new messages" pill (a possible later polish).
- **Line anatomy** (`chatLineView`): the round label (`Lobby` for round 0, else `Round N`) in
  Nunito 12 px `--text-2`; the nickname in Lilita One at weight 400 (never faux-bold), colored
  by inline `v7SeatColor(seat)` hex or `V7_COLORS['text-2']` when the sender is not in
  `players` (a walk-in or someone who left); the body in Nunito 700 at 14 px `--text`. The
  nickname is the only element with a seat hue, and it sits on `--panel-2`, where every seat hue
  is at least 4.5:1. The whole line uses `break-words`: the box clips its horizontal overflow, so
  a 200-character unbroken body or a 24-character nickname wraps instead of being cut.
- **Side stream:** an eliminated or spectator line is italic `--text-2` with the role in words
  after the nickname (`(eliminated)`, `(spectator)`, upright) and `data-chat-stream="side"`; a
  living line is `--text` and `data-chat-stream="living"`. Italic plus the word means the two
  streams never differ by color alone.
- **Announcements:** the transcript is a polite `role="log"` that is mounted before the first
  line and holds the empty message, so a screen reader announces each line that arrives once.
  Lines are keyed by `ChatMessageView.order`, so a re-render or a line revealed in the middle
  (an elimination opens the side stream) leaves the existing nodes alone and is not read again.
- **Empty:** "No messages yet." in Nunito 700 14 px `--text-2`, with no list.
- **Composer:** only when `canWrite` (never on the finished board). A `TextField` named
  `chat-body` (16 px, 44 px high, `maxLength` `CHAT_BODY_MAX_LENGTH`) with a hidden label and a
  placeholder, both "Message" unless `inputLabel` or `placeholder` overrides them (the walk-in
  label, L76), and a primary "Send" `Button` (`type="submit"`). Enter or Send sends the trimmed
  body and resets the form; empty or whitespace-only text is dropped without a reset. Send is
  never disabled: the form is uncontrolled, so no empty state exists to follow, and the V6
  behavior is kept. Shift+Enter sends too (a single-line input has no newline).
- **Copy:** `CHAT_EMPTY_COPY`, `CHAT_INPUT_LABEL` and `CHAT_SEND_LABEL` keep the V6 wording;
  §10.6 adds no chat string.
- **Gallery:** the `/dev/ui` section `chat` (`ui/chat/chat.gallery.tsx`): the transcript with
  living and side lines, the empty box, the read-only board, and the longest nickname and body.

## Kit (ui/kit/, L72-15)

`ui/kit/kit-portrait.tsx`, `kit-portrait-label.ts`, `kit-details.tsx`, `kit-details-sections.ts` and
`kit.gallery.tsx` (spec v7 §4.2, §5.5, §6.6.5, §7.3, §11; Appendix A `kit-inspect-dialog`,
`lobby-kit-picker-dialog`, `home-solo-kit-picker`, `global-art-catalog`). They replace the V2
`design/components/kit-portrait.tsx` and `screens/table/kit-inspect-details.tsx` on V7 surfaces;
the classic files and their duplicated copy stay until L75 and L76.

- **KitPortrait:** `<KitPortrait kitId size? isEliminated? className? onClick? ariaLabel? />`,
  `kitId` a `KitId`, `'random'` or `null` (not revealed). Widths are `thumb` 40, `tile` 72,
  `sheet` 96 and `hero` 160 px at 3:4 (default `tile`), radius `--card-radius`, shadow
  `--card-shadow`. The face is the base drawing from `artFor` on the `--card-face-0` to
  `--card-face-1` gradient, `object-contain` in a box inset 6 %, so the 16 trimmed drawings
  share one visual weight. A hidden kit and Random have no art, so both wear the Card's hidden
  verso (`ui/card/card-classes.ts`, shared with `card.tsx`): the 2 px holo rim, a `--panel-2`
  fill lit from the top (`--text-2` at 20 %) and the inner frame line at 35 %, so they read as
  tiles on `--bg-0` and on `--panel` alike (the art faces stay plain, with no frame). Hidden
  shows a "?" in Lilita One `--text-2`, sized to match the Random die (20, 32, 44 and 72 px at
  thumb, tile, sheet and hero); Random shows the `random` icon (22, 36, 48, 80 px). The name is
  `kitPortraitAlt`: the catalog name, "Hidden kit" or "Random kit" (`alt` for art, `role="img"`
  and `aria-label` for a code face). Anchors: `data-zone="kit-portrait"` and
  `data-eliminated` (kept from V2 for `fx/play-flyout.ts` and the L74 self strip), plus
  `data-kit-face="art" | "hidden" | "random"`, `data-kit-size` and, inside, `data-kit-layer`
  (`face`, `badge`). The root sets `select-none` and `-webkit-touch-callout: none`; long-press
  belongs to the caller (§6.6.5).
- **Eliminated:** the face is greyscale and dimmed to 70 % brightness (a grey kit such as Ghost
  or Warrior would otherwise read as alive), and the `eliminated` icon (a `--danger` cross in a
  `--bg-0` well, labelled "Eliminated") sits in the bottom-right corner as a sibling of the
  face, so neither filter reaches the cross. The badge icon is 9, 18, 22 and 32 px at thumb,
  tile, sheet and hero, so with its 2 px well it is 13 px, about a third of the face, at thumb.
  No per-kit dead art, no cross character.
- **Clickable:** with `onClick` the root is one `<button type="button">` named `ariaLabel`, else
  the kit name plus ", eliminated" for an eliminated kit (button children are presentational, so
  the badge would not be read; a plain portrait's image name stays the bare kit name, §11). It is
  at least 44 px wide and tall (a `thumb` button grows to 44 px). Focus is the shared 2 px
  `--text` ring (`CHROME_FOCUS_CLASS`, as Pills, Tabs, KitTile and the Card's focus layer):
  `--cta` is the selection outline, so a focused kit never looks selected in the picker. The
  face inside is decorative (`alt=""`, code faces `aria-hidden`). Without `onClick` the root is
  a `<span>`.
- **KitDetails:** `<KitDetails kitId />`: a header (the `sheet` portrait and the kit name,
  `data-kit-name`), then up to nine `<section data-kit-section>` groups on `--panel-2` with a
  Lilita One `<h3>` each, in the order of `KIT_DETAILS_SECTION_IDS`: starting resources,
  starting hand, special cards, always upgraded, immune to, attacks per turn, upgrade points,
  draw risk, and ability (only for a kit with `KIT_ABILITY_COPY`). Every value is read from
  `KIT_CATALOG`, never from the art (the old Gambler PNG prints "?" for a Draw the catalog sets
  to 10). Copy is the V6 copy, verbatim, in Nunito `--text-2`.
- **Starting resources and hand:** three `Pill`s (life, point, upgrade point; tone ring, value
  `--text`, caption spoken only) and a `Draw +N` chip with a signed `CostAmount`. The hand is
  one hidden thumb `Card` per family (an action and an attack verso) with its label and
  `×count`; both always render, `×0` included, so there is no "N action · M attack" prose.
- **Cards:** special and trait cards are thumb `Card`s with a visible name caption under each
  (a thumb prints no name). The columns are left-aligned (`w-20`, caption and cost on the thumb's
  left edge), so every thumb in the sheet, the hand's included, shares one left edge. Instance ids are `kitSpecialCardKey(cardId, index)` (index keeps
  Specialist's two Card Transformers apart), `always-upgraded:<cardId>` and
  `immune-to:<cardId>`, so they appear as `data-instance-id`; the Card's gold "+" badge
  replaces the V2 "↑". An empty trait group says "None"; Prophet's empty special list stays
  empty (he starts with two random specials, told in Ability). No face is a button: the sheet
  around the details owns Select.
- **Costs:** a thumb prints no cost chip (L72-12), so a special's play cost is a signed
  `CostAmount` under its caption, lined up across a row; Draw and the upgrade-point Buy and Sell
  prices are `CostAmount` too, so every amount is an icon, a number and a spoken text. L72-21
  note: the L72-15 contract expected both a thumb chip and a `CostAmount`, which would show
  every special cost twice; the Card has no thumb chip, so only the `CostAmount` shows.
- **Art pockets:** the old card ground that a drawing encloses (Untouchable's lenses,
  Specialist's gear hole, Duplicator's pale square; Illustrations) matches the face on the
  portrait's light gradient and reads as part of the drawing. Checked in a browser experiment
  on a `--bg-0` face (not shipped): pale lilac lenses, hub and tile, none a hole.
- **Anchors:** `data-kit-id`, `data-kit-name`, `data-kit-section="<id>"`, `data-kit-stat="draw" |
  "upgrade-point-buy" | "upgrade-point-sell"`, `data-hand-family="action" | "attack"`,
  `data-special-key`, `data-card-caption`.
- **Gallery:** the `/dev/ui` section `kit` (`ui/kit/kit.gallery.tsx`): the four faces, the four
  sizes, every kit at `tile`, and the details of Scientific, Specialist, Gambler and Prophet.

## Rules (ui/rules/, L72-16)

`ui/rules/rules-summary.ts`, `rules-strip.tsx`, `rules-sheet.tsx` and `rules.gallery.tsx` (spec v7
§6.11, §7.4, §7.6, §11, Q15; Appendix A `lobby-rules-summary`, `rules-recall-table-end`). They
are the read-only half of `screens/lobby-rules-panel.tsx` on V7 surfaces; that file and its host
editor stay until L76.

- **Strip:** `<RulesStrip rules className? />` is one chrome button named "Table rules"
  (`TABLE_RULES_LABEL`, `aria-haspopup="dialog"`) on `--panel`, at least 44px tall, full width and
  left-aligned, with the shape, focus ring and press from `primitives/chrome-classes.ts`. The
  press drops `--chrome-press-y` and the shadow at full motion and only dims under reduced motion;
  `data-motion` says which. Row one is the header: the visible "Table rules" (Lilita One 14px,
  `--text`) and a decorative `chevron-right`, the cue that a tap opens details. The button's
  `aria-label` is the same string, so its name is what is on screen (WCAG 2.5.3 Label in Name).
  Row two is the `clock` icon and `{n}s` in Lilita One 20px, exactly as received
  (`formatTurnTimeSeconds`, never clamped: a server default can be 300), then, only when
  `randomOnly` is set, the `random` icon and the word "Random" in Nunito. Row three is the 16
  `thumb` portraits in `KIT_IDS` order. The content is phrasing only, so the portraits are the
  non-clickable `KitPortrait` (`<img alt>` = kit name).
- **Face grid:** every face cell is the same fixed width, `w-12` (48px), the width of the 11px
  "Excluded" caption, so the columns line up for any mix of excluded kits. The cells sit in a
  4 column grid (4 gap) that becomes 8 columns when the strip's own content is 26rem wide (a
  container query on the strip, not the viewport), so 16 kits always fill whole rows: 4 by 4 on a
  phone (3 excluded or 15, at 320, 375 and in the 424px gallery frame), 2 by 8 when wide. The
  tightest case is the 196px content of the gallery frame at 320px, where adjacent captions are
  2.5px apart; a lobby column at 320px has about 258px.
- **Screen-reader summary:** the button is described (`aria-describedby`) by a hidden sibling
  `<span>` holding `rulesSummaryText(rules)`: the seconds, "Random" when set, then "Excluded"
  followed by the excluded kit names (in `KIT_IDS` order), joined by commas ("45s, Random,
  Excluded Kamikaze, Ghost, Gambler"; "60s" for the default rules). Only words the strip shows;
  no new copy. It is a sibling and `hidden` (a described-by target may be hidden), so it adds
  no layout and no duplicate text inside the strip.
- **Excluded kit (Q15):** `opacity-40 grayscale` on the portrait only, plus a visible "Excluded"
  caption (`EXCLUDED_LABEL`) in `--text-2`, Nunito 800 at 11px (`text-v7-micro`), at full
  opacity, so the state is never carried by dimming alone.
- **Sheet:** `<RulesSheet open rules onClose />` is a read-only `Sheet` (placement `auto`: a
  bottom sheet on phones, centered on desktop; Esc, backdrop and swipe-down close it, only the
  top sheet takes Esc) titled "Table rules". Its only button is Close (`secondary`), which also
  takes the initial focus; it has no editable control and no `aria-pressed`. The body is the
  clock, "Human turn" and the seconds; the Random mark when set; then a list of all 16 kits in
  auto-fill columns of at least 5.5rem (3 columns on a 320px phone, 4 on the 28rem desktop
  panel, so "Indestructible" fits without a breakpoint). Each item is an `aria-hidden` thumb
  portrait (dimmed when excluded), the kit name in `--text-2` at 12px and, when excluded,
  "Excluded". When the 16 kits do not fit the height, the sheet body scrolls as the labelled
  keyboard region of the Sheet contract, and focus still starts on Close.
- **Anchors:** `data-kit-id` and `data-excluded="true" | "false"` on every kit face (a `<span>` in
  the strip, an `<li>` in the sheet). New hooks; no preserved anchor changes. `KitDetails` also
  carries `data-kit-id`, so a query for one kit scopes to its container (the strip, the sheet
  panel or the details).
- **Icons:** `clock` and `random` have `--text` bodies and sit on `--panel`, never on a fill
  within CIEDE2000 20 of their body.
- **Copy:** "Table rules" and "Excluded" are the §10.6 strings. "Human turn", "Random" and
  "Close" are existing labels. The tests use the literals, so a copy change fails a test.
- **Later:** L76 adds the host editor in this folder. L74's menu and L77's Game over recall open
  `RulesSheet` directly.
- **Gallery:** the `/dev/ui` section `rules` (`ui/rules/rules.gallery.tsx`): the default rules,
  Random only with three kits excluded and 45 s, a 300 s server default, and one allowed kit.

## Coach panel — ui/coach/ (L72-17)

`ui/coach/coach-panel.tsx` and `coach.gallery.tsx` (spec v7 §4.2, §6.12, §8.3; Appendix A
`table-tutorial-coach`, `table-first-game-hints`, `first-game-hint-host`, `tutorial-overlays`).
`<CoachPanel title body zone onHide hideAriaLabel footer? extraAttrs? compact? />` and
`<CoachBody text />` replace `design/components/coach-panel.tsx`, with the same props. That file,
`screens/table/tutorial-coach.tsx`, `help/hint-overlay.tsx` and the `.tutorial-coach-panel` CSS
stay until L75, which hosts the new panel.

- **Element:** a hovering `<aside>` named by its title (`aria-labelledby` the `<h2>`, so it is a
  named complementary landmark). It is never a dialog or modal: no `role`, no `aria-modal`, no
  focus move, no key handling, so Esc stays with the sheet stack (Q49) and the table stays
  clickable around it. Hosts position it (L75); the panel has no `className`.
- **Values:** the shape is the chrome outline (`--chrome-outline-width`, `--ink`) with the hard
  `--chrome-shadow`, `overflow-hidden`, text `--text`. Default: radius `--chrome-radius` (12px),
  `--panel` at 90% (V6: 78%) with a 6px backdrop blur, max height `min(52vh, 28rem)`. Compact
  (the first-game hint): radius `--chrome-radius-sm` (10px), `--panel` at 72% (V6: 46%) with a
  10px blur, max height `min(36vh, 15rem)` (V6: `min(32vh, 12rem)`; see Fit below). The
  header is `--panel-2` with a 2px `--ink` rule under it (padding `px-3 py-2`, compact
  `px-2 py-1`): the title in Lilita One 20px (compact 14px), then the close control. The body is
  a `ScrollArea` in Nunito 700, 14px with line height 1.625 (compact 12px, 1.375). The footer
  slot, only when given, has a 2px `--ink` rule above it and stacks in a column (compact: a
  row), with `px-3 py-2` (compact `px-2 py-1.5`).
- **Why 72% is the floor:** the compact card hovers over any table content, white card faces
  included. `--text` over a white card face is 5.74:1 at 72% (6.12:1 over `#f1edff`) and 10.66:1
  at 90%. V6's 46% gave 2.55:1. `--text-2` is only 4.09:1 over white at 72%, so body text takes
  `--text` and never `--text-2`. Over the lightest backdrop, a white card face (composite
  `#5e5981`), the resource icons stay at least 26.7 CIEDE2000 from their bodies (the shield is
  the nearest), above the bound of 20 in Icons › Accessibility and use, so the amounts need no
  well.
- **Amounts:** the body goes through `parseCoachBody` (`**bold**` becomes `<strong>`, the markers
  are dropped). A numbered resource ("1 life", "+4 points", "2 upgrade points", "3 shield
  points") is a `CostAmount` at `md` (16px icon, `signed="gain"` when the copy wrote a `+`),
  which speaks "1 life", "plus 4 pts", "2 upgrade points", "3 shield points". A bare resource
  word ("lives", "points", "Shield") keeps its word and gains a decorative `RESOURCE_ICON` (16px,
  `aria-hidden`) after it. Each is wrapped in `span[data-coach-resource="life" | "point" |
  "upgradePoint" | "shield"]`, not the preserved `data-resource-kind`, so the FX and flyout
  selectors never match prose. Numbers and words take the body color (`--text`), never a
  resource color (§5.1). `parseCoachBody` takes only "lives" and "life" as the life resource, so
  the verb "live" ("resources live here") stays prose.
- **Controls:** a 44px quiet `IconButton` (`close`, never a `×` character) named by the caller's
  `hideAriaLabel` ("Hide coach"), in both variants (V6's compact used 32px). There is no Skip:
  Skip lives on the table flag (Lot 45), and the first-game hint host puts "Got it" and
  "Skip all" in the footer slot. The body is a labelled scroll region named by the title
  (`tabIndex` 0) only while its copy overflows, the Sheet body rule (Overlays › Keyboard
  scroll): a re-check on a `ResizeObserver` over the body and its content adds or removes the
  label, so a panel that fits has no extra Tab stop and no second landmark. Its focus ring is
  inside the edge (`ScrollArea focusRing="inset"`), since the rounded `overflow-hidden` root
  clips an outer one. Tab runs close control, body (when it overflows), footer.
- **Entrance:** opacity 0 to 1, y −8px to 0 and scale 0.96 to 1, over `--dur-base` on
  `--ease-entrance` (V6's `tutorial-coach-in`). Under reduced motion the panel renders at rest,
  with no transform and no fade, and `data-motion="reduced"` says so. A host that changes the
  message remounts the panel with a `key`, which replays the entrance.
- **Anchors:** `data-zone` (`tutorial-coach`, `first-game-hint`), the caller's `extraAttrs`
  (`data-tutorial-index`, `data-tutorial-coach-open`, `data-hint-id`) and `data-motion`, which
  `extraAttrs` cannot override.
- **Footer in landscape-compact:** in the `landscape-compact` mode (`useViewportMode`, a visible
  height under 500px) a given `footer` moves into the header row, between the title and the close
  control, at the same 44px height, and the footer row goes away; the labels stay on one line.
  It applies to both variants. In `portrait` and `desktop` the footer stays below the body.
- **Fit:** the 44px floors make the chrome 118px tall (borders 6, header 54, footer 58), which
  with V6's compact cap of `min(32vh, 12rem)` left 74px for the body: five of the ten hints
  overflowed at 375×812 and all ten at 844×390. Measured with the compact card, Got it and Skip
  all, at the host widths `min(15.5rem, 100vw - 1rem)` (portrait, desktop) and `min(22rem,
  100vw - 1rem)` (landscape-compact):

  | Viewport | Hint height | Share of screen | Overflow |
  |---|---|---|---|
  | 375×812 | 163 to 229px | 13.3 to 18.7% | none of ten |
  | 375×667 | 163 to 229px | 16.2 to 22.7% | none of ten |
  | 844×390 | 89 to 138px | 9.5 to 14.8% | none of ten |

  The tallest hint is `resources`, whose copy is 111px at 248px wide (the cap is 240px). All
  eleven tour steps (with Got it) also fit at 844×390 (130 to 175px). The script steps 17 and 19
  have no footer and keep the default cap, so at 844×390 they scroll by 18px and show the body
  region. L75-06 owns the landscape-compact host width (a Watch point in the backlog).
- **Gallery:** the `/dev/ui` section `coach` (`ui/coach/coach.gallery.tsx`): the Tax tutorial
  coach with Got it, the Thief follow-up coach with a `+4 points` glyph and no footer, and the
  compact Draw hint with Got it and Skip all, all from the real shared copy.

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
