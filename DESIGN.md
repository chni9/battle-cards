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

This file describes **Lot 72 only**: tokens, fonts, the ground and the motion helpers. The V2
light theme in `index.css` still governs every screen until that screen's V7 lot lands
(spec v7 §4.4); no old screen is recolored.

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
- Resource and threat colors as text: at least 4.5:1 on `--bg-0`, `--bg-1` and `--panel`, but on
  `--panel-2` only 3:1 (`--life` and `--threat-attack` 4.25, `--danger` 4.38).

### Named Rules
**The Own-Hue Rule.** A seat hue never shares an element with `--life` or a `--threat-*` color.
Measured near collisions (CIEDE2000): `--seat-0` / `--mine` 8.1, `--seat-1` / `--danger` 4.1,
`--seat-5` / `--threat-other` 8.6, `--seat-7` / `--life` 13.4. Seat identity and threat
meaning are separated by element, never by a subtle shade.

**The Ink Rule.** `--ink` draws outlines and hard shadows only. Text on a CTA fill uses
`--text-on-cta`; text on a card uses `--text-on-card`.

**The Large-Text Rule.** Resource and threat colors are body text only on `--bg-*` and
`--panel`. On `--panel-2` they are large text (3:1) only; otherwise they are fills, rings and
icons.

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
least 44px. Lot 72 adds no layout component: seat arc, grid and sheet placement land in later
lots.

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

## Components

None yet (L72-07 onward). Each `ui/` component adds its section here in the same commit.

### Motion (shared by every component)
- **Durations** (`ui/motion/motion-tokens.ts`, mirrored as CSS variables): `--dur-fast` 120ms,
  `--dur-base` 220ms, `--dur-slow` 400ms; `durationS('fast' | 'base' | 'slow')` converts to
  seconds for `motion`.
- **Card spring** (`CARD_SPRING`): `type: 'spring'`, stiffness 400, damping 28.
- **Entrance ease** (`EASE_ENTRANCE`, `--ease-entrance`, `ease-v7-entrance`):
  `cubic-bezier(0.16, 1, 0.3, 1)`, the same curve as V2 `MOTION_EASE`. Ease-out for entrances.
- **Reduced motion** (`prefers-reduced-motion: reduce`): components read only
  `usePrefersReducedMotion()` and run every motion prop through `motionSpecFor(spec, reduced)`.
  `reduceMotionSpec` keeps opacity, color, background color and box shadow, drops every
  `x`, `y`, `scale` and `rotate`, and replaces the spring with a 120ms tween. The animated
  root carries `data-motion="reduced" | "full"`, and CSS animation or press classes are
  applied only when full. No sheen sweep, pulse, shake, particles, flying cards or slam; the
  same numbers and labels remain, so no information is carried by motion alone.

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
- **Don't** reuse a V2 name for a V7 key, or let a `--text-v7-*` suffix equal a `--color-v7-*`
  one.
- **Don't** recolor an old screen: V2 `@theme` and `:root` values stay unchanged until that
  screen's lot lands.
- **Don't** add a detector ignore. The only one allowed is the pre-approved
  `radial-spotlight-glow` / `dark-glow` ignore scoped to `ui/tokens.css` (spec v7 §12.4).
