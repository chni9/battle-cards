# Technical spec — Card Battle, version 7 (Visual redesign: "Arcade Holo")

> Implementation document for V7. It contains **no Classic rule and no Classic value**.
> Rules truth stays `docs/spec_bataille_des_cartes_en.md`. Engine, protocol baseline and
> Definition of Done stay `docs/technical_spec_v1.md`. V7 **replaces the visual language**
> of `docs/technical_spec_v2.md` and Lot 39 (`docs/backlog_ux.md`) and the table layout of
> V6 Lots 43/53 — it does not replace any V6 teaching, feedback, lobby or admin *function*.
> Sequencing lives in `docs/backlog_v7.md` (Lots 72–81). V6 closes at Lot 71; any further
> V6-style lot opened during V7 takes a number from 82 up.
> The What's new release id `lot-72` predates V7: it names the open entry for the slot-drop
> and Poison fixes on `dev`, not V7 Lot 72 (§10.4).
> Parity checklist: `docs/technical_spec_v7_parity.md` (Appendix A).
>
> Scoped with the designer on 2026-10-20 (brainstorm session, Approach A), then reviewed by a
> six-dimension adversarial pass (67 confirmed findings, all integrated). Where this
> document records a decision, it is a direct instruction from that session or an explicit
> default flagged as such in §11 / §13 — never an invented Classic rule.

---

## 1. Objective and non-objectives

### Objective

Replace the prototype look of the whole client with a **real art direction** — beautiful,
dynamic, readable on a phone — and an **interaction model built for the table**, without
changing a single rule, value or wire message.

What V7 has to prove:

- on a 375 px wide phone, a player reads **who threatens whom, for how much, and when it
  lands** at a glance, with up to 8 seats on screen and no horizontal page scroll
- playing a targeted card takes **three taps** (card → Use → target) or **one drag**, instead
  of four taps through two modals, and an accidental tap never spends the turn
- every function that exists on `origin/dev` at `1de498d` still exists (Appendix A), and
  every test that protected a *product behavior* still protects it
- the game *feels* like a game: cards fly, hits land, eliminations are staged, there is
  sound — and all of it degrades cleanly under "reduce motion"

### Non-objectives

- **No Classic rule change, no Classic value change.** A bot or a tester misreading the new
  UI is never grounds for touching a rule (AGENTS.md golden rule 7).
- **No protocol change.** `PROTOCOL_VERSION` stays **45**. Every V7 surface reads fields
  already on the wire. If a lot finds a real need for a new field, it stops and asks; the
  change then becomes its own task with its own bump (AGENTS.md §2, golden rule 6).
- **No server or engine change**, except comment-only and doc fixes (§10.3) and copy-only
  catalog text fixes in `packages/shared` (§10.5). Server bugs found during the audit are
  tracked separately (§14).
- **No new illustrations.** The existing card and kit drawings are reused inside code-rendered
  frames; replacing them is a later chantier (designer 2026-10-20, Q1 = C).
- **No translation.** The UI stays **English** (Q9 = A). Existing labels keep their wording;
  copy changes are only those listed in §10.
- **No music.** Sound effects only (Q7 = A).
- **No light theme.** V7 ships one dark theme. `/admin` uses the same tokens in a restrained
  "tool" mode (§7.8).
- Team / God / Quick modes, accounts, in-progress persistence, monetization: still out
  (technical spec v1 §9).

---

## 2. Decisions locked 2026-10-20

Designer brainstorm session, in the order asked.

| # | Question | Decision |
|---|---|---|
| Q1 | Card illustrations | **C** — card frames rendered in code now; current drawings plugged in, replaceable later |
| Q2 | Primary device | **A** — phone portrait first; desktop derived |
| Q3 | References | none fixed; likes **Pokémon TCG Pocket** (clean, glossy, holo) and **Balatro** (saturated, retro, juicy) |
| Q3b | Art direction | **B1 world + B2 cards + B2 upgraded style** ("Arcade Holo", §5) — chosen over Holo Pocket, Casino Retro and "Carthage purple" boards |
| Q5 | 8-seat table layout | **L2 · Arena** — seats on an arc around a central plate, threat arrows between seats; grid fallback when too tight (§6.4) |
| Q6 | Playing a card | **C** — tap-tap primary (card → sheet → Use → target), drag-and-drop shortcut; nothing is sent before the target is validated or the card is released (§6.6) |
| Q7 | Juice and sound | **A** — strong juice + sound effects (CC0), mute toggle, no music; sound is its own late lot (§8, §9) |
| Q8 | Scope | **B** — every screen, `/admin` included (restrained mode) |
| Q9 | UI language | **A** — English, as today |
| Q10 | Method | **A** — in-place migration screen by screen on a **dedicated branch** (`claude/v7-redesign`, cut from `origin/dev`); temporary `?ui=next` switch for the table only (§4.4); branch and promotion model §4.6 |
| — | Docs | `docs/technical_spec_v7.md` + `docs/backlog_v7.md` + `DESIGN.md` (Impeccable) |
| Q11 | Wrong or misspelled copy | **B** — V7 fixes it in passing, in English, and updates the tests that lock it (§10) |
| — | Game over "Protocol v45" line | removed for players; "Code · N turns" stays (§7.6) |
| — | Lobby house rules and chat (Lot 70) | kept and redesigned (§7.4); house rules also recalled in game and on Game over (§6.11) |
| — | Card descriptions | kept from the shared catalog (with §10.5 corrections), shown in the card sheet and on long-press (§6.6.1) |
| — | Subagents | Claude models allowed under Claude Code (AGENTS.md §9, 2026-10-20) |
| Q12 | Branches and promotion | **A** — one ready-for-review PR per lot into `dev`; pending `dev` fixes promoted to `main` before L72 merges; promotion freeze until the player path is fully V7 (§4.6). Replaces the earlier "Lot 72 recolors every screen at once" idea (§4.4) |

Section approvals (architecture §4, design system §5, arena §6, juice/sound §8–9, other
screens §7, tests and lots §12/§15): approved in the same session. Placements set by earlier
designer decisions are **kept**: the visible table `!` (Lot 57), Chat next to the
forfeit flag (Lot 70), Unspy always rendered and disabled with its reason (L58-07).


---

## 3. What exists today

Audit of `origin/dev` at `1de498d` (2026-10-20), by playtest (solo 4 and 8 seats; 375×812
and 1440×900) and by a read-only multi-agent inventory (Appendix A: 198 surfaces).

- **No art direction.** Pastel blurred background, saturated green/orange CTAs, flat
  yellow/blue zones. A CTA color is also a selection color and a seat color.
- **Card PNGs carry their numbers.** Cost and damage are baked into the 80 card-face PNGs;
  they are unreadable at hand size and cannot be restyled. Upgraded and activated states
  are separate PNGs. Frames are inconsistent (white, purple, cream, pink).
- **Phone readability fails.** Hand cards are 35–45 px wide with truncated names; opponent
  names truncate to 2 letters; at 8 seats only ~3.5 opponents fit and the rest scroll
  sideways; the player's own lives are small text at the bottom; seat 3 yellow on a yellow
  zone. At 1440 px the opponents are squeezed into a side column and the hand floats in a
  large empty zone.
- **Four taps per attack** (card → modal → Use → target modal → Confirm); every action goes
  through a modal that hides the table.
- **Big moments have no impact.** A 7-damage hit or a MEGA ATTACK elimination is a log line;
  the delayed-resolution threat is a small "Incoming" text chip.
- **Turn timer bar is wrong** since Lot 70: it divides by a fixed 60 s while the host sets
  5–180 s (Appendix A Q19/Q33/Q65).
- **Tests lock layout.** 52 of the 101 client test files read component source with
  `readFileSync` and assert literal code; a redesign breaks them without any behavior change
  (§12.1).
- Solid and kept: engine, per-recipient protocol, FX diff logic (`fx/`), hint selectors
  (`help/`), action-log model, tutorial scripts, Tailwind v4 + Motion.

---

## 4. Architecture

### 4.1 What does not move

- Server, engine, protocol, intents.
- `apps/client/src/net/use-room-connection.ts` keeps its public API unchanged. V7 FX use what
  it already exposes — `lastTurnStarted`, `lastActionPlayed`, `lastActionResolved`,
  `subChoice`, `actionReject`, `view` — plus view and `actionLog` diffs for eliminations and
  game end, as `fx/` does today. The arena records the receive time of `lastTurnStarted` when
  its identity changes (for §6.10); no hook change.
- `packages/shared` catalog (card names, `effect`, `upgradeEffect`, kit traits), protocol
  types, tutorial scripts, release notes catalog.
- **Pure client modules move, they are not rewritten.** They go to `src/view-model/` (game
  knowledge) or `src/ui/` (presentation helpers) with their tests, changing only import paths:
  `fx/incoming-threat-diff.ts`, `fx/threat-tone.ts`, `fx/opponent-token-chips.ts`,
  `fx/play-flyout.ts` (trigger logic), `help/select-hint.ts`, `help/help-storage.ts`,
  `help/hint-ids.ts`, `help/release-storage.ts`, `action-log/action-log.ts`,
  `game-over-awards.ts`, and from `design/` and `screens/table/`: `asset-lookup.ts`,
  `seat-colors.ts`, `effect-text-tokens.ts`, `structured-cost.ts`, `visual-viewport.ts`,
  `table-helpers.ts`, `opponent-seat-resources.ts`, `pending-chip-tone.ts`, `attack-targets.ts`,
  `chat-unread.ts`, `table-banner.ts`, `tutorial-coach-copy.ts`, `table-copy.ts`.
  The full list is regenerated at the start of L72 (`grep` for React-free modules under
  `design/` and `screens/table/`) and kept in `docs/backlog_v7.md`.

### 4.2 New client layout

```
apps/client/src/
  ui/                 V7 design system — no game knowledge
    tokens.css        CSS custom properties + Tailwind v4 @theme (§5.1)
    fonts.ts          @fontsource imports (§5.2)
    primitives/       Button, IconButton, Pill, Badge, Avatar, Sheet, Dialog, Toast,
                      Tabs, Segmented, Slider, Toggle, Tooltip, ScrollArea
    card/             Card (all families, sizes and states, §5.4)
    icons/            hand-made SVG icon set (§5.6)
    motion/           motion tokens, springs, reduced-motion helpers (§5.7)
    fx/               particle canvas layer, screen shake, number tween (§8)
    sound/            audio manager + haptics (§9)
  view-model/         pure, React-free: views → what to display (§4.3)
  screens/
    arena/            V7 table (§6)
    home/ lobby/ end/ admin/   V7 screens (§7) — migrated in place
```

**Shared pieces first.** Components that other screens import from `screens/table/` or
`design/` — `ChatLog`, `KitInspectDetails`, the read-only rules strip and sheet, `coach-panel`,
the hint overlay's table copy, `TableBannerFlash` cues, `BotSeatLabel`, `PlayerName`,
`ConnectionBadge` — are rebuilt in `ui/` (or their logic moved to `view-model/`) in L72,
**before** any lot deletes `screens/table/`. L72 also ships the primitives the parallel lots
share: `TextField` (16 px floor), `Carousel` (How to play, awards) and a kit tile. A DEV-only
gallery route (`/dev/ui`, behind `import.meta.env.DEV`, never in production builds) renders
every `ui/` component for the design gate and critiques. `design/` and
`screens/table/` (V2/V6 look) are then deleted as V7 replaces them, ending in Lot 81. No file
outlives its replacement by more than the lot that replaces it.

### 4.3 View-model layer

`src/view-model/` holds pure functions with no React import and **no clock reads** (callers
pass `nowMs`; AGENTS testing rules ban `Date.now()` in tests). Each has behavior tests:

- `seats(view, layoutBox)` → ordered opponent seats, layout mode (§6.4), positions, per-seat
  visibility tier (§6.3), status badges, resource row values or `?`.
- `threats(view, subChoice)` → one entry per `pendingEffects` item (source → target, tone,
  own damage label, grouping key, POV emphasis, Mirror-eligible highlight) and the recurring
  chips of §6.5.
- `cardActions(view, instance)` → legal actions (use / upgrade / sell / multi-attack /
  deactivate), the **disabled reason** of each unavailable one (§11), valid target seats,
  required pre-send choice (Regeneration quantity, Card Transformer consume), and the drop
  zones of §6.6.3.
- `dropTarget(pointer, zoneRects, cardActions)` → the intent a drop would send, or `null`
  (drag logic is testable without layout; §12.2).
- `turnClock({ turnStarted: { deadlineMs, receivedAtMs, turnSequence } | null, view,
  cachedLobbyRules, nowMs })` → mode and values (§6.10).
- `selfStrip(view)`, `shop(view)`, `log(view)`, `rulesRecall(lobbyView | finishedView)`.

Components under `screens/` and `ui/` render view-model output and call intents; they hold no
rule logic (AGENTS.md §4, golden rule 8). Server revalidation stays the only validation.

### 4.4 Switching

- **Lot 72 performs the pure-module moves of §4.1**, so the lots that run in parallel
  (76, 80) start from the moved paths.
- **Lot 72 adds V7 tokens and fonts side by side**; it does **not** recolor the old screens.
  The old light-theme tokens (`ink`, `surface`, `surface-raised`…) keep their values until the
  lot that migrates each screen, because mapping them onto a dark ground breaks contrast on
  every unmigrated screen. A screen switches entirely when its lot lands.
- **Table (Lots 74–75):** `?ui=next` (persisted in `localStorage['card-battle.v7.ui']`,
  cleared by `?ui=classic`) renders `screens/arena/` instead of `screens/table.tsx`, including
  the finished board behind Game over. It is **ignored in tutorial rooms** (`playKind ===
  'tutorial'`) until L75 re-anchors the tutorial. **L75 flips the default, deletes the old
  table, removes the switch code and clears the key**; `?ui=classic` is a no-op from then on.
- **Home, lobby, Game over, admin (Lots 76, 77, 80):** migrated directly, no switch.

### 4.5 Dependencies

- Runtime: `@fontsource/lilita-one`, `@fontsource/fredoka`, `@fontsource/nunito` (self-hosted,
  like Outfit today). `@fontsource/outfit` is removed in Lot 81.
- Dev: `@testing-library/react`, `@testing-library/user-event`, `happy-dom` (component
  behavior tests, §12.2); `sharp` and `tsx` (same version as the server's, 4.23.1) for the
  one-off art extraction script (§5.5).
- Config: the client Vitest project includes `src/**/*.test.{ts,tsx}`; component tests set
  `// @vitest-environment happy-dom` per file; `apps/client/tsconfig.json` includes `scripts`
  so the art script passes typecheck and typed lint.
- No icon library, no animation library beyond `motion`, no audio library.
- Every addition goes through `pnpm add` (`--filter @card-battle/client`, `-D` for dev) so the
  lockfile records it (AGENTS.md §3).

### 4.6 Branches and promotion (Q12 = A)

Within the existing gitflow (`docs/agent/deploy.md`):

- Each lot is developed on its own branch cut from `dev` (the first is `claude/v7-redesign`,
  which carries the V7 docs and L72) and opened as **one ready-for-review PR into `dev`**, so
  staging previews let testers play each step.
- **Before L72 merges**, the fixes already waiting on `dev` (open What's new `lot-72`) are
  promoted to `main`.
- **Promotion freeze:** no `dev` → `main` promotion from the first V7 merge until the player
  path is fully V7 (L75 flip + L76 + L77 merged), unless the designer approves one. **Q13
  (designer 2026-10-21): strict freeze** — no hotfix path during the freeze, and
  `.github/workflows/prod-from-dev.yml` stays unchanged; urgent fixes wait for the freeze to lift.
- L78–L81 ship after the freeze lifts, one PR each.

---

## 5. Design system — "Arcade Holo"

The world is **B1** (night neon arcade); the cards are **B2** (white holo). Decision:
designer 2026-10-20 (Q3b). Reference boards: `.superpowers/brainstorm/` (local, gitignored).

### 5.1 Color tokens

| Token | Value | Use |
|---|---|---|
| `--bg-0` / `--bg-1` | `#0c0920` / `#17113a` | page gradient (top `--bg-1` → bottom `--bg-0`) |
| `--glow-a` / `--glow-b` | `#ff3d7f` / `#3da9ff` | two radial halos at ~30% opacity |
| `--panel` / `--panel-2` | `#1f1850` / `#2b2256` | panels, sheets, pill backgrounds |
| `--ink` | `#0c0920` | arcade outline + hard shadow color (not a text color) |
| `--text` / `--text-2` | `#f3eeff` / `#cfc6ff` | primary / secondary text on dark |
| `--text-on-card` | `#2a2550` | text on white cards |
| `--text-on-cta` | `#0c0920` | labels on `--cta`, `--cta-2`, `--danger` fills and on `--life` chips (only token reaching AA on `--danger`: 5.97:1) |
| `--life` | `#ff3d7f` | lives, damage, "aimed at you" |
| `--point` | `#ffc93d` | points |
| `--upgrade` | `#3dcf8f` | upgrade points |
| `--shield` | `#6b8cff` | shield |
| `--cta` / `--cta-2` / `--danger` | `#ffd43d` / `#3da9ff` / `#ff4d4d` | primary CTA / secondary CTA / leave, destroy |
| `--threat-attack` | `#ff3d7f` | attack-tone threats (L51-07: attacks, Sentence, Mirror) |
| `--threat-other` | `#ffa53d` | hostile non-attack (Spy, Thief family) |
| `--mine` | `#3da9ff` | the POV's own outgoing effects |
| `--seat-0..7` | 8 hues re-tuned for the dark ground | seat identity (avatar fill, name, third-party arrows) |

Rules: a resource keeps its color everywhere; seat colors never collide with `--life` /
`--threat-*` in the same element; text contrast meets WCAG AA (4.5:1 body, 3:1 large).
Resource colors are used as fills, rings and icons; as text they appear only at large size
(`--life` on `--panel-2` is 4.25:1). The seat hues pass ≥ 4.5:1 on every ground and are
pairwise distinct by CIEDE2000 ≥ 20 (L72-05). The 8
seat hues are finalized in L72 with a contrast check against `--bg-*` and against each other.
Subtle static scanlines (`rgba(255,255,255,.03)`, 1 px every 3 px) on the page ground only.

### 5.2 Typography

- **Lilita One** — titles, buttons, UI numerals, seat names.
- **Fredoka** (500–700) — everything printed on a card: cost, damage, name, "+" badge.
- **Nunito** (700–900) — body text, descriptions, log lines, form labels.
- Floors: 11 px for any functional text (Impeccable `undersized-ui-text`), 16 px for text
  inputs (no iOS focus zoom, commit 6372d04). Vital numbers are large: own lives ≥ 20 px,
  incoming damage badge ≥ 22 px on a 375 px phone.

### 5.3 Two shape families

- **Arcade chrome** — buttons, pills, panels, avatars, sheets: 3 px `--ink` outline, hard
  shadow `0 4px 0 var(--ink)`, radius 10–12 px; pressed state translates 3 px down and drops
  the shadow.
- **Holo cards** — radius 12 px, 2 px iridescent rim (conic gradient), white inner face
  (`#fff → #f1edff`), soft shadow `0 10px 22px rgba(0,0,0,.45)`. Cards are the only soft
  objects on screen, so the eye goes to them.

### 5.4 Card component

**Anatomy:** cost chip (violet gradient + number; Tax shows a life chip because its cost is
1 life; Regeneration shows its per-life price), damage chip on attacks (pink,
`listedAttackDamage(cardId, isUpgraded, damageMultiplier)` — catalog `attackDamageFor` × the
pending multiplier, L56-04), illustration (§5.5), name at the bottom in Fredoka. At `hand`
size both chips **stack on the card's left edge** so they stay visible when the next card
overlaps from the right; at larger sizes cost is top-left and damage top-right. No effect text
on hand-size faces. Card faces set `-webkit-touch-callout: none` and `user-select: none` and
prevent the context menu (long-press is ours, §6.6.5).

**Families:** attack / action — iridescent rim; **special** — gold rim.

**States:**

| State | Treatment |
|---|---|
| upgraded | soft holo sheen sliding across the face (B2) + gold "+" badge; damage chip shows upgraded value |
| active persistent | pulsing glow + "card lives" counter badge (Points Generator, Poison, Super Absorber, Imposition, Roulette; rules spec §5) |
| unplayable | on the POV's own turn only, desaturated when Use is illegal for a card-specific reason (cost, Invisibility, no target); never the whole hand off-turn. A tap still opens the sheet with the reason (§6.6.1) |
| selected | lifted (translateY), scaled, outline in `--cta` |
| hidden (Spy without identity) | verso face in the same frame language |

**Sizes:** `hand` (`clamp(64px, 19vw, 120px)` wide; in landscape-compact bound to visible
height, §6.4), `lifted`, `sheet` (detail, ≥ 200 px wide), `thumb` (log, queue, Spy hands,
pool), `tile` (shop, pickers, rewards).

Activated art keeps the current guard: Sentence chips and inspect never request activated art
(Appendix A `global-activated-art-guard`). Roulette activated faces reuse the cream/pink art
(designer 2026-09-21).

### 5.5 Illustrations

L72 adds a one-off script, `apps/client/scripts/extract-art.ts`, run with
`pnpm --filter @card-battle/client exec tsx scripts/extract-art.ts` (uses `sharp`, §4.5). It
crops each base card and kit PNG from `images/` to its drawing, removes the frame and the baked
numbers, and removes the ground **by edge flood-fill only** (never a global color key, so
light parts of a drawing such as blades or flask highlights survive). Outputs, committed:
`apps/client/src/assets/art/{cards,kits}/<id>.png` — **31 base cards (incl. Roulette) + 16
kits (incl. Gambler)**. Upgraded / activated variants become code states (§5.4).

The PR attaches a **before/after contact sheet** of every extracted asset; the designer signs
it off before the old PNGs stop being used. Kit stats are rendered from `KIT_CATALOG` — values
printed on kit PNGs (e.g. Gambler) are not authoritative. `asset-lookup.ts` gains an
`artFor(cardId | kitId)` path; its existing mapping tests move with it and keep their
assertions.

### 5.6 Icons

A hand-made SVG set in the arcade style (2 px ink stroke, palette fills): resources (life,
point, upgrade, shield), statuses (spied-by-you, spying-on-you eye, shield active, Block,
persistent, Invisibility + turns, Reanimation armed, Duplication active, eliminated, bot,
disconnected, absorb window, ticking Sentence), UI (menu, shop, draw, unspy (crossed eye, L58-07), log, help, coach,
chat, feedback `!`, leave/forfeit flag, sound, vibration, rules, share, copy, minimize). Emojis are
not used in shipped UI. Every icon-only control keeps an `aria-label` / `title` (L59-01).

### 5.7 Motion tokens

`--dur-fast 120ms`, `--dur-base 220ms`, `--dur-slow 400ms`; card spring (stiffness ≈ 400,
damping ≈ 28); ease-out for entrances. `prefers-reduced-motion: reduce` → fades and color
flashes only (§8.3).

### 5.8 Design documentation

Lot 72 runs Impeccable `init` (writes `PRODUCT.md`: audience, mode per surface — table =
Experience/Operate, admin = Operate, home = light Persuade) and `document` (writes `DESIGN.md`).
Both live at the **repo root**, next to `AGENTS.md`. Precedence on conflict: code, then this
spec (§5 is normative), then `DESIGN.md` (derived from the code). Every V7 task that adds or
changes a token or a `ui/` component updates `DESIGN.md` in the same commit (re-run
`document` or edit it). `docs/agent/frontend.md` points to both files.

---

## 6. Table — "Arena"

### 6.1 Phone portrait layout (top to bottom)

1. **Top bar** — round; turn banner with the existing copy ("Your turn" / "{Nick}'s turn",
   seat color) and turn clock (§6.10); the active seat's Block line ("Block chain · N turn(s)
   left" / "Block · attacks banned this turn"); **visible icons**: Chat (unread badge),
   Feedback `!` (Lot 57), leave/forfeit flag (also the tutorial Skip, Lot 45); and a menu with
   How to play, coach reopen (tutorial), log, table rules (§6.11), game code (copy) with the
   POV's connection label from `STATUS_LABELS`, and — from L79 — Sound and Vibration.
2. **Arena** — opponent seats (§6.2–6.4) around a **central plate**: the POV's incoming
   threats as large badges ("⚔ 7"), the last played card's landing spot, cancellation bursts,
   recurring chips (§6.5).
3. **Self strip** — large lives pill, then shield, points, upgrade points; own kit portrait
   (tap → kit sheet); own active persistents, combat Shield and **own ticking Sentence chips**
   as thumbs (tap → sheet with Upgrade, Lot 56 card lives).
4. **Hand fan** — attacks, actions, then **specials as a visually separate group** (gap + gold
   rim), so the tour copy "Special cards sit in this row" still points at something. Cards
   overlap right-over-left; each card keeps a visible strip of **≥ 44 px** with its chips
   readable (§5.4). When the hand cannot keep 44 px per card, the hand scrolls horizontally
   *inside the hand only* (no page scroll, no further compression).
5. **Dock** — Draw (`--cta`, gain shown as `+N` point icon, no word, L59-01; Gambler shows the
   rolled payout), Shop (`--cta-2`), **Unspy always rendered**, disabled with its reason (no
   living spy / under 10 points / not your turn, L58-07), and **Activate duplication** for a
   Duplicator when legal.

Every region always renders (empty states included) so tutorial highlights and hint anchors
never point at a missing element (Appendix A Q60).

### 6.2 Seat anatomy

Avatar (kit portrait when the POV may see the kit, else seat-color disc with initial), name
(seat color), lives pill, a compact **points / upgrade points / shield row** (each value `?`
when not visible; all four resource icons always render, L51-08), ≤ 2 status badges + "+n"
(tap seat for all), bot label with difficulty (`BotSeatLabel`), connection state
(disconnected / auto-turns), eliminated treatment (grayscale + ✕ + cracked frame; eliminated
seats keep their reveal). The seat whose turn it is gets a highlight (`data-active-seat`).
Every value keeps its `data-resource-kind` anchor for the token-chip FX.

### 6.3 Visibility tiers (no hidden information)

Source: rules spec §3 (Spy, Lot 69) and §6 Visibility; server
`apps/server/src/protocol/build-view-for.ts` (`buildSpiedView`).

| Tier | Seat shows |
|---|---|
| **Unspied living opponent** | nickname, seat color, bot/difficulty, connection, active persistents (public), Shield up + tier (not its value), Block turns / attack ban, `spyingOnYou` eye, ticking Sentences, public pending effects. Lives pill and resource row show `?`. Kit, hand, specials and resource values hidden. |
| **Base Spy** (`spied` present, no `kitId`) | + live lives, points, upgrade points, shield value; Duplicator `duplicationActive`; Gambler `drawGain`; Spy-gated log lines (Draw totals, Ghost points, pool-buy identity, Duplication). Kit, hand and specials stay hidden. |
| **Spy+** (`spied.kitId` present) | + kit portrait, hand and specials (inspectable). |
| **Eliminated** (`eliminationReveal`) | frozen kit, cards and tokens at death (Lot 19), visible to all; `pendingReanimation` and `absorbWindowOpen` live here (they only exist on eliminated seats). |
| **Spectator overlay** | eliminated POV **with no** `pendingReanimation`, or a walk-in whose overlay is granted (not while the claim picker is open): full vision as the server sends it; Unspy never offered. An eliminated POV with a `pendingReanimation` keeps the seated tiers and is labeled "Reanimating", not "Watching". |

The view-model derives the tier only from these fields; no client inference. Base-Spied seats
count as "kit hidden" for the `hidden-kit` hint (Appendix A Q66).

### 6.4 Layout modes, arc and grid

- **Modes** (by visible box, checked in this order): **landscape-compact** — visible height
  < 500 px (seats in a top band, plate centered, hand and dock on one row, no full ellipse,
  hand size bound to height); **desktop** — width > height (and height ≥ 500 px); **portrait**
  — every other box. A 768×1024 tablet is portrait; 1024×600 and 1440×900 are desktop; an
  844×390 phone is landscape-compact. No mode page-scrolls (L53-07). On desktop the log panel
  replaces the ticker, and card, shop and seat sheets open as centered dialogs.
- **Arc** (portrait and desktop): seats on the upper half of an ellipse centered on the plate
  (desktop: full ellipse around a larger plate, log as a collapsible right panel, dock next to
  the hand). Order follows `turnOrder` rotated so the next player after the POV is first
  clockwise. The POV is the bottom anchor; a walk-in spectator has no anchor and all seats sit
  on the ellipse.
- **Grid fallback**: `seats()` switches to a grid when, at the chosen seat size (including the
  badge row), any two seat bounding boxes would overlap or sit less than **8 px** apart. Grid
  rows: `ceil(n/2)` on top, `floor(n/2)` below, left to right in turn order (4 + 3 for 7
  opponents; 4 + 4 for an 8-seat spectator view). Values are tuned in the L74 playtest.

### 6.5 Threat arrows

- **One arrow and one damage label per pending effect** (`pendingEffects` entry), including
  several attacks from one Assassin action at the same seat: incoming hits stay separate and
  are covered largest first (rules spec §2 / §6, designer 2026-09-29, superseding Lot 54's
  summed volley). Arrows that share `(sourcePlayerId, targetPlayerId, queuedAt, cardId)` may
  be fanned side by side, each with its own label. **Never a summed total.**
- **Fan-out plays** (same source, card and `queuedAt` across every opponent, e.g. MEGA ATTACK,
  upgraded thieves) render as one "hits all" burst on the source seat plus a target badge on
  each seat, instead of 7 arrows.
- **Ends and colors:** arrows to the POV end at the plate badge. POV incoming = tone from
  `threatToneFor` (L51-07: attack tone for attacks, Sentence, Mirror; other-tone for Spy /
  Thief family); POV outgoing = `--mine`; third party = source seat color with a tone-coded
  icon. In grid mode, only arrows to and from the POV are drawn (straight); third-party arrows
  appear for the tapped seat.
- **Labels:** card icon + listed damage (× `damageMultiplier`) or effect icon.
- **Mirror:** a redirected effect draws from its current `sourcePlayerId` (the redirector)
  with a Mirror / Super Mirror badge from `redirectedBy`; earlier hops are shown in the log
  only. While a Mirror prompt is open, the eligible effects (`subChoice.eligibleEffectIds`)
  are highlighted on their arrows and plate badges.
- **Recurring chips** for persistent periodic effects that tick on the POV (Curse on you,
  opponent Poison / Imposition), built from public `activePersistentEffects` (replaces the
  unwired `persistent-incoming.ts`, Q35). A chip shows as **paused** when the POV's own view
  says it will not apply this turn (own Invisibility active, for all three; own
  `blockTurnsRemaining > 0` or `blockAttacksForbidden`, for Poison and Imposition; own upgraded
  Shield, for Imposition; own points ≤ 7, for Imposition).
  Its amount is the catalog rate for that tier, not a prediction. Engine truth
  (`apply-persistent-effects.ts`): own Invisibility pauses Poison, Imposition and Curse; an
  own Block chain pauses Poison and Imposition only — **Curse keeps draining** during Block.
- Tapping a seat highlights its in/out arrows and opens the seat sheet (kit if visible,
  statuses, pending effects, Spy hand).

### 6.6 Playing a card

#### 6.6.1 Card sheet (tap)

A tap on a hand card always lifts it and opens the bottom sheet: the card at `sheet` size, then
the `CardEffectCopy` content — a **Cost** icon row, then `effect` plus the **"Upgrade —
{upgradeAdds}"** block for a base card, or `upgradeEffect` alone for an upgraded card, with
inline icons (`EffectTextWithIcons`) — then actions **Use**, **Upgrade**, **Sell**,
**Multi-attack** (Assassin). Own actives in the self strip add **Deactivate** (with the Lot 69
confirm) and **Upgrade** (§11). Unavailable actions are disabled with their reason (§11).
Off-turn the sheet is read-only.

#### 6.6.2 Tap-tap targeting

- **Use** on a targeted card → the sheet collapses to a bar ("Choose a target" + Cancel);
  valid seats pulse, invalid ones dim (eligibility from `cardActions`, Appendix A
  `table-target-picker-eligibility`). Tap a valid seat → **the intent is sent at once** and the
  card's flight starts at the same time (optimistic; Appendix A "Intents never await FX",
  Lot 14).
- **Untargeted cards** (self cards, and hostile cards with no target choice such as MEGA ATTACK,
  Poison, Imposition, Sentence, Suicide, upgraded thieves) → Use sends at once.
- **Pre-send choices** (Regeneration 1–4 lives, L44-06; Card Transformer consume) are chosen in
  the sheet before Use sends.
- **Multi-attack** (Assassin) → per-attack target rows in the sheet; selection resets on Cancel
  (Q44). Eligible attacks stay the hand attacks (unchanged).
- The `ACTION_PLAYED` flight is skipped for the POV's own instance (dedupe by instance id). On a
  server reject the card springs back to its hand slot and shakes (§6.12).

#### 6.6.3 Drag

Drop table, computed by `cardActions` / `dropTarget`:

| Card | Valid drop |
|---|---|
| targeted (one seat) | a valid seat only (seats light up) |
| untargeted (self or "hits all") | the plate only (seats do not light up) |
| needs a pre-send choice | the plate opens the sheet's choice step and **sends nothing** |
| sellable (Sell legal; never specials) | the Sell zone, shown during the drag away from the hand's drag origin |

Release anywhere else → the card returns. Drag never starts off-turn, while actions are
locked, or during the tutorial tour and Look gate.

#### 6.6.4 Commit rule

An intent leaves the client only on **target tap**, **explicit button**, **drop on a valid
zone**, or the shop tile **double-tap** exception (§6.8). Selecting, lifting, opening a sheet
or hovering never sends anything. In the tutorial, **every** commit path (sheet buttons, target
tap, drop on seat / plate / Sell, shop) goes through `allowTutorialSend`.

#### 6.6.5 Gestures and accessibility

- In the hand: a mostly **horizontal** move scrolls the hand; a mostly **vertical** move past
  ~8 px starts a drag and lifts a portal ghost out of the scroller (motion
  `dragDirectionLock` or an equivalent threshold); a tap opens the sheet.
- **Long-press** (~450 ms, cancelled by > 8 px of movement) applies **outside the hand** only —
  shop, log, queue, pool, rewards, a spied hand, the seat sheet — and opens the same sheet
  read-only. Kit portraits open the kit sheet with all current sections (starting resources,
  hand, specials, always-upgraded, immunities, attacks per turn…).
- Every card face is a button: Enter / click opens the read-only sheet wherever there is no tap
  action; shop tiles have a separate info button (§6.8).
- When targeting starts, the sheet's focus trap is released, focus moves to the first valid
  seat, valid seats become buttons labeled "{nickname}, target", invalid seats get
  `aria-disabled`, and Esc cancels targeting.

### 6.7 Sub-choices and the sheet stack

Mirror target, elimination reward (incl. simultaneous Lot 71 pickers), steal pick, pool pick,
special pick, Reanimation kit, slot-drop (Lot 69): bottom sheets with large tiles.

**Sheet-stack contract.**
- Blocking sub-choice sheets always sit on top; any other open sheet (shop, chat, log, seat,
  card) is pushed underneath. They ignore Esc, backdrop and swipe; the only way out other than
  answering is **Minimize**, which collapses the sheet to a bar that stays above every other
  sheet while intents stay locked (Q59).
- Every sub-choice keeps **select + Confirm**, except slot-drop: **select + Drop**. Slot-drop
  Cancel keeps its intent `{kind: 'slot-drop', cancel: true}`; its copy states the
  case-specific outcome (watch point §14.3).
- Read-only sheets (card, kit, seat, rules) stack one level and close on Esc, backdrop or
  swipe-down. Esc closes only the top sheet (Q49).

**Lifecycle.** At 0 s the sheet shows "Time's up" but keeps its controls live; it closes only
when `subChoice` clears (resolve, `TURN_STARTED`, game over) or a resend replaces it, and a
resend reopens it (Appendix A sub-choice keeps). Rewards: the client blocks picking the same
card twice and greys cards already taken when it knows them; the server still decides (Q55).
Other seats get no "choosing…" indicator (no public field; §14.2). The elimination reward gets
a short celebration (§8).

### 6.8 Shop

Full-height sheet, tabs **Cards / Special / Pool / Upgrade points**, large tiles; openable
off-turn (pool is public) with actions disabled. Tile interaction: **tap selects** (aria-pressed)
and the footer **Buy** commits; **double-tap buys instantly** (kept from today, Appendix A keep,
with `touch-action: manipulation`); long-press or the tile's info button opens the read-only
card sheet. In the tutorial the Shop never opens by itself: when the player opens it during a
step that highlights a shop item, it opens on the tab that contains it (Upgrade points for
`shop-upgrade-point`, Cards for `shop-absorber`) with that tile highlighted, not preselected,
and keeps select-then-Buy (`shop-absorber` → `shop-absorber-buy`).

Every Lot 54/58 rule stays: shop faces use catalog costs (Spy play 2 / buy 4), upgrade point
Buy/Sell values computed at render time from `upgradePointBuyCost` / `upgradePointSellYield`,
pool **Buy random** with public `poolBuyCost`, and the special purchase price (20) from **one**
client constant that replaces the two client copies (`fx/opponent-token-chips.ts`, shop). The
authoritative value stays the server's `SPECIAL_CARD_PURCHASE_COST`; moving it to
`packages/shared` would touch the server and is out of scope.

### 6.9 Log and chat

- **Log**: a one-line ticker under the top bar with the latest public action; tap → log sheet
  grouped by round with resource nets as icons (Lot 65+), cards inspectable (L56-05), fog rules
  unchanged (unspied Ghost `+?`, pool-buy identity). No export on the table; the DEV Excel stays
  on Game over (§7.6).
- **Chat** (Lot 70): sheet with the room transcript, Enter sends, 200 chars
  (`CHAT_BODY_MAX_LENGTH`), living vs eliminated/spectator streams labeled; unread count survives
  remounts within the session (Q48); read-only on the finished board.

### 6.10 Turn clock

`turnClock()` returns a **mode**:

- **countdown** — human turn with a known deadline. Full length, in order: (1) the cached lobby
  `turnTimeSeconds` when known (the hook receives lobby views before `START_GAME`, solo
  included); (2) else the first `TURN_STARTED` seen for that `turnSequence`
  (`deadlineMs − receivedAtMs`) — a later `TURN_STARTED` for the same `turnSequence` (resume
  after a disconnect) keeps the original length; (3) else seconds only, no proportional bar.
  Last 10 s in `--danger`; last 5 s tick (sound lot).
- **paused** — "Paused — reconnecting" while the active seat is disconnected.
- **absent** — "Absent — auto-draw".
- **none** — "—": tutorial, finished board, null deadline (bot turns get no bar; the banner
  shows "{Nick}'s turn").

Display stays cosmetic; the server deadline rules. One view-model test per mode.

### 6.11 House rules recall

Menu → **Table rules** shows turn time, Random only and excluded kits (the same read-only sheet
as the lobby, §7.4). Data: the last `LobbyStateView.lobbyRules` seen in this room (in memory) or
`FinishedStateView.lobbyRules` on Game over; hidden when unknown (e.g. reload mid-game). No
protocol change.

### 6.12 Other table states

- **Finished board** (read-only, behind "View board"): the arena renders the final table with
  every intent locked and no countdown. The dock is replaced by a **Stats** control that reopens
  Game over (a no-op while Feedback is open). The flag becomes "Return home" with a Stay confirm
  through `requestLeave` (ask-once). `!` opens manual Feedback only while stats are closed. Shop
  is browse-only; inspect, log and read-only chat stay.
- **Spectator / eliminated POV**: arena stays; self strip becomes "Watching" with Leave (or
  "Reanimating", §6.3); economy dock hidden for walk-in spectators (Q38). A walk-in sees a
  **Claim a seat** control while `claimableSeats` is non-empty (§7.2).
- **POV elimination**: a non-blocking overlay of at most ~1.6 s that never covers a sub-choice;
  skipped when `pendingReanimation` is set; on game end it replaces the "You are dead" banner
  before Game over.
- **Reconnecting**: a non-blocking top banner; inputs disabled until reconnected.
- **Server reject**: toast + card spring-back/shake instead of a modal, with
  `ILLEGAL_ACTION_COPY` title and body. Any dismissal of the toast, manual or timed, calls
  `clearActionReject`; a state update never dismisses it.
- **Leave / forfeit**: confirm sheet; Game over still reachable (L43).
- **Tutorial**: coach panel and callouts restyled (arrow outside the highlight, red for attacks,
  orange otherwise, L51-07); board tour, Look gate, idle "Play" retitle and Skip unchanged; the
  flag stays visible (Skip lives on the table flag, Lot 45). The two "?" controls use distinct
  icons (help vs coach, Q45). Each tour highlight id — `your-zone`, `hand`, `specials`,
  `resources`, `incoming`, `shop`, `opponent`, `action-log`, `timer`, `kit`, `flag` — and the
  sheet buttons' `data-tutorial-highlight` `use` / `upgrade` / `sell` map to named V7 elements
  listed in `docs/backlog_v7.md` (L75).
- **First-game hints**: same selector order and auto-dismiss rules (L46); compact translucent
  panel next to `data-hint-anchor` targets, which V7 keeps on equivalent elements.
- **Existing FX and banners** (`fx/` overlay, token chips, resource flashes, resolution flash,
  threat cue, `TableBannerFlash` cues: your turn, attacked, Sentence countdowns, own-Gambler
  wipe, "You won!" / "You are dead") are hosted on arena anchors (`data-zone`,
  `data-player-id`, `data-instance-id`) **in L74/L75, before the default flip** — L78 restyles
  and extends them.

---

## 7. Other screens

All functions and gates of Appendix A stay; only presentation and the defaults of §11 change.

### 7.1 Home

Wordmark "CARD BATTLE" (Lilita, arcade outline) over a slowly floating fan of holo cards;
**Beta** badge and **New** (What's new) control top-right (L63-07: small, not a hub row button;
unread dot). Three illustrated mode tiles — **Solo**, **Online**, **Tutorial** — and secondary
buttons **How to play** and **Feedback**. Nickname stays inside each path; idle hub stays
unlabeled; no Inbox/Admin/protocol/Reset help on the hub (L42/L51).

- **Solo**: nickname; opponents 1–7 picked by adding avatars around a mini table; difficulty as
  a segmented control (Easy / Normal / Hard); your kit card (Random default); **Table rules**
  panel (Lot 70: excluded kits, Random only, turn time — "Server default" until the slider moves,
  Q3/Q31); Start. Solo Play again still reopens this menu with the seed.
- **Online**: Create / Join with a large code field; `?code=XXXXXX` in the URL pre-fills Join
  (client only; nickname still required).
- **Tutorial**: nickname only.
- **How to play**: a swipeable card carousel, one card per `HOW_TO_PLAY` section of
  `apps/client/src/screens/how-to-play-content.ts` (Goal, Turns, Lives, Points, Cards, Upgrade,
  Kits, Special cards, Shop), copy verbatim apart from §10.1, resource icons inline. Skip and Got
  it stay; in gated mode any dismissal counts as Skip and continues to the chosen path; in manual
  mode a dismissal does not mark it seen (soft gate on the first mode-tile click, unchanged).
- **What's new**: sheet with Latest / history scopes; every dismissal marks seen (L65-05).

### 7.2 Lobby

Big game code with **Copy** and **Share** (Web Share API when available, else copy a link with
`?code=`); seats as a mini arena (seat colors, ready check, bot difficulty); host: Add bot,
difficulty per bot, Kick (confirm); your kit card; Ready / Cancel ready (guests); Start (grey
until ≥ 2 seats and every human guest is ready — a disconnected guest counts as not ready, L57);
Leave; Feedback; walk-in "Watching the lobby" banner with a **Claim a seat** control while
claimable seats exist (Q24). Controls disabled while reconnecting; inline errors dismissible and
cleared on phase change (Q26, Q29).

### 7.3 Kit picker

Grid of code-rendered kit cards with **readable stats** from `KIT_CATALOG` (lives, points,
upgrade points, draw, action/attack counts); excluded kits shown greyed with "Excluded" and not
selectable (Q23); Random tile copy reflects the allowed set (§10.1); tap → kit sheet → Select.
Random only hides the picker and says kits will be dealt.

### 7.4 House rules (Lot 70)

- **Strip** visible to everyone: clock with seconds, Random-only mark, kit faces with excluded
  ones greyed plus an "Excluded" label (not color alone). Tap → **read-only rules sheet** for
  guests and walk-ins (Q15).
- **Host editor** in the same sheet: turn-time slider 5–180 s (sends on release — same
  `setLobbyRules` intent, fewer messages, Q4/Q18), All / None / Random, 16 kit toggles, last
  allowed kit locked; None keeps the first Classic kit; live-apply, no Save/Cancel; the tutorial
  never shows rules.
- **Guests** get a toast when rules change and when the host's exclusion resets their pick to
  Random (Q16, Q17; client only — ready state unchanged).

### 7.5 Chat in lobby

Panel under the seats, collapsible on phones; Enter sends; 200 chars; the walk-in input is
labeled "Spectators only see this" (Q21).

### 7.6 Game over

Winner hero (large kit portrait; static in L77, confetti added in L78), Lot 60 awards as a
swipeable gallery, read-only chat, **Table rules** recall. Footer line **"Code XXXXXX · N
turns"** — the player-facing "Protocol v45" prefix is removed (designer 2026-10-20). Buttons in
hierarchy: primary **Play again** (Classic only, with a pending state after the click, Q72);
secondary **View board**, **Feedback** (manual ticket) and **Download action log** (DEV only,
unchanged); quiet **Return home**. Tutorial finish keeps its "Play a real game" / "Tutorial
complete" variant. Feedback ask-once semantics unchanged (L57).

### 7.7 Shared dialogs

Claim seat (any dismissal — Esc, backdrop, swipe — is **Stay**, and for a walk-in sends
`staySpectating`), Feedback (manual and ask modes, Kind as a radio group, About chips, contact;
send locks dismiss — with a 15 s client timeout that re-enables it with an error — and ends
with a "Sent" confirmation, Q6/Q68/Q69), leave confirm: bottom sheets on phones, centered
dialogs on desktop, following the §6.7 stack contract. Connection errors on Home and in the
lobby stay inline status blocks (`role="alert"`, retry in place), restyled.
Dialog sizing keeps the visual-viewport rule (L53-02/07).

### 7.8 Admin (`/admin`)

Same tokens and fonts in **tool mode**: neutral dark panels, 1 px outlines instead of arcade
outlines, dense tables and filters, charts in the V7 palette, no juice. Pages and exports
unchanged (Dashboard/Overview 9 modules, Matches, Kits, Feedback with triage, Data). Included
interaction fixes (client only): pagination (the API already supports `page`), sign-out, seat
filter as a 2–8 select, consistent loading / empty / error states, keyboard-accessible rows,
specific 429 copy, extra match-detail fields the API already returns, and a **Chat messages**
tab in Data (the server already allowlists `game_chat_messages`; role column visible)
(Q73–Q79, Q80 partly).

---

## 8. Juice

### 8.1 Effect catalog

Triggered by what the hook already exposes (`lastTurnStarted`, `lastActionPlayed`,
`lastActionResolved`, `subChoice`) and by view / `actionLog` diffs (eliminations, game end), as
`fx/` does today (§4.1):

| Moment | Effect |
|---|---|
| POV turn starts | "YOUR TURN" banner slam |
| Card played | card flies from hand (or from the actor's seat, face up — actions are public) to target / plate, trail in threat tone; skipped for the POV's own optimistic flight (§6.6.2) |
| Effect queued | arrow draws from source to target; badge pops on target |
| Attack resolves | hit flash + avatar shake; on POV: screen shake scaled to damage + red vignette; floating "🛡 −3" then "♥ −4" in real order (shield first) |
| Effect cancelled | each pending effect whose `actionResolved` outcome is cancelled bursts with "CANCELLED". An arrow still in `pendingEffects` after a compare stays drawn (a stronger answer or leftover bundle stays pending). FX never infer the compare result |
| Gains / steals | coins and hearts fly seat to seat (existing token flyouts restyled); counters roll; "+4" in `--upgrade` |
| Spy | an eye opens on the seat |
| Upgrade | card flips, holo turns on, "+" pops |
| Sentence countdown | the existing table-wide banners ("Sentence in 3 turns!", "X turn(s) before Sentence!", "Sentence will kill {victim}!", aria-live, Lot 63) restyled |
| Own Gambler wipe | the existing wipe banner restyled |
| Attacked | "You are being attacked" cue restyled |
| Elimination | avatar cracks and greys, particle burst, "{NAME} ELIMINATED" band; POV elimination per §6.12 |
| Reward / victory | tiles drop, confetti, trophy; "You won!" cue |
| Clock | last 10 s red pulse; last 5 s tick (sound) |

`eliminationBeat` is seeded on mount so reconnects and the finished board do not replay past
eliminations (Q63). Haptics belong to L79 (§9).

### 8.2 Implementation and performance

`motion` (springs, layout, drag) + CSS keyframes; a small canvas particle layer in `ui/fx/` with
at most **60** simultaneous particles. Animate transform and opacity; the named exceptions use
compositor-friendly forms: the holo sheen is a translated pseudo-element, glows animate the
opacity of a pre-blurred layer, arrow reveals use a clip/mask transform (a dash-offset animation
only on the ≤ 2 arrows involving the POV), counters tween text without layout change. **Gate:**
on a 4× CPU-throttled profile during the hit + elimination scenario, ≤ 5% of frames over 33 ms
and no long task over 100 ms.

### 8.3 Reduced motion

`prefers-reduced-motion: reduce` → no shake, no particles, no flying cards, no slam: fades,
color flashes and the same numbers/labels. No information is carried by motion alone.

---

## 9. Sound and haptics

- `ui/sound/` audio manager on the native Web Audio API; short preloaded clips from CC0 packs
  (Kenney): UI click, card swish, light / heavy / shield hit, coins, spy, elimination, your
  turn, victory, clock tick. `apps/client/src/assets/sfx/CREDITS.md` lists every source.
- Unlocked on the first user gesture (browser policy). Default **on** at moderate volume.
- **Haptics** (all in this lot): short pulses on your turn and when hit, via `navigator.vibrate`
  where supported (iOS Safari has none).
- Menu settings, persisted in `localStorage['card-battle.v7.sound']` / `…v7.haptics`: Sound
  (volume + mute) and Vibration (separate). These menu items first appear in this lot.
- Own lot (79), after the juice lot; no other lot depends on it.

---

## 10. Copy changes (Q11 = B)

English only. Each change updates the test that locks the string in the same commit and is
listed in the PR for designer review; the proposed wording below is the default and the
designer may amend it in review.

**Superseded documents.** These changes supersede the matching copy in
`docs/technical_spec_v6.md` §5.1 (`kits`) and §5.2 (hint table) on designer instruction
2026-10-20 (Q11 = B). The task that changes a string also updates the matching row of
technical spec v6 (or replaces it with a pointer to this section), removes "Copy typos in
`HINT_COPY` are locked" from `docs/agent/frontend.md`, and appends a `docs/agent/decisions.md`
entry that supersedes 2026-08-29 "First-game hint copy rewrite".

### 10.1 Factually wrong since later lots

| Where | Today | Fix | Lot |
|---|---|---|---|
| hint `hidden-kit` (`help/hint-copy.ts`) | kit hidden "until you use Spy" | kit and cards need an **upgraded** Spy (or Spy Thief, or elimination); a basic Spy shows their resources (Lot 69) | 75 |
| tutorial tour step "Opponent" | "kit and cards stay hidden until Spy reveals them" | same Lot 69 wording | 75 |
| tutorial "Counter Spy" step | pre-Lot-69 counter wording | "Your upgraded Spy cancels their basic Spy and still resolves on them." | 75 |
| hint `incoming-thief` | one text for every `*-thief` card ("up to 10 points… counter it with Thief") | per-card copy: Thief, Card Thief, Spy Thief (Lot 71), Upgrade Point Thief, Attack Thief | 75 |
| hint `reward` | pre-Lot-71 wording | rewards for helping eliminate an opponent (shared reward timeout, Lot 71) | 75 |
| How to play "Kits" | "pick a kit or keep Random"; "Opponents cannot see your kit until they Spy you"; "each Draw has a 1-in-10 chance to eliminate you" | mention host exclusions and Random only (Lot 70); "Opponents see your kit only with an upgraded Spy or Spy Thief, or once you are eliminated. A basic Spy shows only your resources."; Gambler: "each Draw has a 1-in-10 chance to drop you to 1 life and lose everything (you are not eliminated)" (Lot 66) | 76 |
| lobby "Your kit" card | "Hidden from opponents until Spy or death." | same Lot 69 wording | 76 |
| `RandomKitDetails` | "one of the 16 kits"; "cannot see which kit you received until Spy, an equivalent, or elimination" | "one of the allowed kits"; same Lot 69 wording | 76 |
| Prophet trait copy | pre-change wording | "Starts with 2 special cards drawn at random from the circulating special pool (duplicates allowed)." | 76 |
| Online Create helper | "Start from the lobby when everyone is seated" | mention guests' Ready (L57) | 76 |

### 10.2 Locked typos (Lot 75)

`HINT_COPY` and coach copy typos are fixed: "you kit" → "your kit", "you hand" → "your hand",
"stronger that" → "stronger than", "ressources" → "resources", "atteign" (rewrite sentence),
"uo to" → "up to", "opponent !" → "opponent!". `hint-copy.test.ts` / tutorial copy tests are
updated to the corrected strings.

### 10.3 Doc and comment fixes (no behavior)

- `packages/shared/src/protocol/state-view.ts` `SpiedPlayerView` comments and client modules
  that still describe pre-Lot-69 Spy (`opponent-seat-resources.ts`, `opponent-reveal-dialog.tsx`,
  `resource-icon.tsx`) are corrected (L73).
- **AGENTS.md golden rule 1** already carries the 2026-09-29 rule on `dev` (commit 14a5ce9);
  L72's docs task only verifies it against rules spec §2 / §6.

### 10.4 What's new

V7 player-facing changes **append Before / After items to the open What's new entry**. Because
`lot-72` is promoted to `main` before L72 merges (§4.6), the **first V7 PR with a player-facing
change opens one V7 entry** (`lot-72-v7`, titled "New look" — distinct from `lot-72`, whose
"seen" key players may already hold; `docs/agent/decisions.md` 2026-10-26) and updates the tests
that pin the latest id; every later V7 PR appends to it during the freeze. One Before / After
item per screen area, not per task. Changes land in the same commit as the change
(`docs/agent/frontend.md`), updating the entry's title when its scope changes. If `dev` is
promoted to `main` during V7, the next player-facing V7 PR starts a new entry. Lots with no
player-facing change (L73, L80) add nothing. Bug fixes such as the turn-clock bar use After =
`Fixed some bugs.` Tests that pin the latest id are updated in the same commit.

### 10.5 Catalog text (copy-only, `packages/shared`)

The card sheet shows catalog text to every player, so outdated catalog lines are corrected
(copy-only edits in `packages/shared`, no protocol change, designer review in the PR):

- **Attack Thief** — `effect`: "Block every attack already pending against you, and steal a
  random attack card from each opponent." `upgradeEffect`: "…and steal all attack cards from
  all opponents." (Lot 68: no charge is kept.)
- **Absorber+** and **Super Absorber+** upgrade lines — capture "every point and upgrade point
  that left them, including sales and thefts; never shield" (Lot 68).

If the designer prefers to keep catalog text frozen, the conflict is recorded in
`decisions.md` instead of shipping it unflagged.

### 10.6 New strings

V7 keeps existing labels ("Use", "{Nick}'s turn", "Your turn"…). Strings it **adds** are listed
in each lot's PR for designer review: "Choose a target", "Time's up", "CANCELLED", "Server
default", "Excluded", "Spectators only see this", "Reanimating", "Watching", "Sent", "Claim a
seat", "Table rules", "Minimize", "Rules changed", "Your pick was reset to Random", "Link
copied", "Chat is closed for this game", "{NAME} ELIMINATED", the admin strings of §7.8 ("Sign
out", the 429 copy, pager labels), and the disabled reasons of §11. Mode tiles keep their
current labels ("Play solo", "Play online", "Tutorial").

---

## 11. Presentation defaults included in V7

Client-only, no rule or protocol change; each is reviewable in its lot's PR.

- Disabled actions show their reason (not enough points / lives, not your turn, actions locked,
  Invisibility, no valid target, nothing to consume, Unspy conditions…) from view fields only
  (Q39). Deactivate also locks while a sub-choice is pending (Q40).
- **Upgrade on in-play cards** is offered only for the POV's own actives, own Shield and own
  ticking Sentences — never an opponent's (fixes the opponent-Shield upgrade bug, Q37). Upgrade
  on hand and special cards is unchanged.
- Opponent kit sheet for Spy+ / eliminated / spectator-visible seats (catalog data, Q46).
- Gambler `drawGain` shown on a seat when the POV receives it (Q47).
- `activeAttackBlock` / `attackBlockCharges` are dead since Lot 68 (no charge is kept): V7
  renders nothing for them (Q36); the Attack Thief block shows only through the
  `actionResolved` outcome.
- Accessibility: real radio / `aria-pressed` semantics for selectors, portrait `alt` = kit name,
  focus management in sheets (§6.6.5), reduced motion honored on Home transitions (Q7, Q71).
- Busy states: Table rules gear and New disabled during a solo launch (Q8); Play again pending
  (Q72).
- Lobby seat colors on rows (Q25); excluded state never conveyed by color alone (Q15).
- Dead code removed when its replacement lands: `screens/inbox.tsx`, tutorial legacy helpers,
  `TableFxContext.mirrorHighlightIds` (`fx/table-fx-context.tsx` — the table's own Mirror
  highlight is live and moves to §6.5), unused log filters, the unreachable "dies by Gambling"
  line (Q62, Q81).

---

## 12. Testing and Definition of Done

### 12.1 Source-text test policy

Every client test file that calls `readFileSync` (52 at `1de498d`; the list is regenerated with
`grep -rl readFileSync apps/client/src --include='*.test.ts'` at the start of each lot) is
classified **in the lot that deletes or rewrites the code it reads**:

- **Product behavior** (what the player sees or can do: "eye shows when `spyingOnYou`", "Unspy
  grey under 10 points", "Draw has no word label", "Spy shop face costs 2/4", "the root uses no
  `100dvh` and the table never page-scrolls") → rewritten as a behavior test on the view-model or
  on the rendered component, asserting the same outcome. A source-text test whose `describe` /
  `it` cites a lot id (`Lxx-yy`) for a behavior V7 keeps is product behavior.
- **Old-layout detail** that V7 replaces on purpose ("compact dialog CTAs", "uses `SeatTile`",
  "Incoming on the identity row") → retired **in the same commit that deletes the code**, with a
  `docs/agent/decisions.md` entry citing the V7 section that supersedes it.

The classification table (file, assertion, class, owner lot, replacement test) lives in
`docs/backlog_v7_test_classification.md`, linked from `docs/backlog_v7.md`; each lot's first
task re-checks its rows against the regenerated file list. This is not weakening (AGENTS.md DoD): every protected behavior keeps a
test.

### 12.2 New tests

- View-model: seat order, layout modes and arc/grid switch, visibility tiers (§6.3 — one test
  per tier), arrows (tone, one label per pending attack with no summed volley, fan-out, Mirror
  badge, POV emphasis, recurring chips paused conditions), card actions and disabled reasons,
  target eligibility, drop resolution (`dropTarget`), turn clock modes and fallbacks, rules
  recall sources.
- Components (testing-library + happy-dom): render with a fake view, tap-tap → the right intent
  with the right payload through a mocked connection; the commit rule (§6.6.4); the sheet-stack
  contract; reduced motion; roles and labels. Drag gestures are verified in the browser gate
  (happy-dom has no layout); drag *logic* is covered by `dropTarget`.
- Existing logic tests keep their assertions: they move with their module (§4.1) and change only
  import paths, except the copy tests updated under §10 and the release-id tests under §10.4.

### 12.3 Post-lot browser gate

After each lot, run `docs/agent/frontend.md`'s Post-lot browser gate on **that lot's
surfaces**. For the table: 360×740, 375×812, 390×844, a landscape phone and 1440×900; tables of
2, 4 and 8 seats; scenarios: incoming attack, mutual cancel, Mirror, elimination + reward,
slot-drop, base Spy and Spy+, spectator, full tutorial, reconnect, house rules, chat. L73 has no
browser gate; L80 runs it on `/admin` at 1440×900 and 390×844. Room codes and results are
recorded under a "Lot NN verified" heading in `frontend.md` (gate step 5). Issues found are
fixed and re-verified before the next lot.

### 12.4 Design gate

Impeccable detector findings on shipped V7 files are fixed (contrast, undersized text…); an
ignore needs the designer's approval, except: the §5.1 radial ground halos are designer-approved
(Q3b), so a scoped ignore for `radial-spotlight-glow` / `dark-glow` on `ui/tokens.css` is
pre-approved; brainstorm boards under `.superpowers/` stay exempt. `.impeccable/config.json` is
committed; `.impeccable/hook.cache.json` is gitignored. Sessions without Impeccable (e.g. under
Cursor) write "design gate not run" in the PR, and a Claude Code session runs it before merge.
Each lot ends with an Impeccable `critique` of its surfaces.

### 12.5 Definition of Done

Technical spec v1 §8 / AGENTS.md §9 unchanged: `pnpm verify` green, no test skipped or weakened
(§12.1), every touched card/rule surface tested, the task's Acceptance line met, status `Done` in
`docs/backlog_v7.md`, one Conventional Commit per task, no dependency outside the lockfile. Each
task updates the `docs/agent/frontend.md` sections it supersedes **in the same commit**
(AGENTS.md §12), and `DESIGN.md` when it touches tokens or `ui/` (§5.8). One PR per lot into
`dev`, ready for review (§4.6).

---

## 13. Audit question dispositions

Numbers refer to Appendix A "Audit open questions".

| # | Disposition |
|---|---|
| 1, 14, 67 | Remove "Protocol v45" from Game over; keep code and turns (§7.6). Join-mismatch error text unchanged. |
| 2 | Soft gate stays on the first mode-tile click. |
| 3, 31 | Solo slider shows "Server default" until moved; unchanged omission semantics. |
| 4, 18 | Slider commits on release. |
| 5 | Stale copy fixed (§10.1). |
| 6, 68, 69 | Feedback "Sent" confirmation; dismiss locked while sending. |
| 7, 71 | Accessibility fixes (§11). |
| 8 | Disable gear and New during solo launch. |
| 9 | Nickname / reload persistence: out of scope. |
| 10 | What's new without storage: acceptable, unchanged. |
| 11, 64 | Test policy §12.1. |
| 12 | Dark theme only; How to play uses icons and card renders (screenshots folder stays designer-owned). |
| 13 | Hub regrouped (§7.1) with every listed rule kept. |
| 15 | Read-only rules sheet for guests. |
| 16, 17 | Client toasts; server ready semantics unchanged. |
| 19, 33, 65 | Turn clock modes and derivation §6.10. |
| 20 | Rules recall §6.11. |
| 21 | Walk-in chat input labeled. |
| 22 | Tutorial chat unchanged. |
| 23 | Excluded kits greyed in picker; Random copy fixed. |
| 24 | Claim-a-seat control (lobby and table). |
| 25 | Seat colors on lobby rows; no disconnected badge (no field). |
| 26, 29 | Dismissible lobby errors; reconnecting disables controls. |
| 27 | Server bug, separate session (PR #78 into `dev`). |
| 28 | `?code=` link + Web Share. |
| 30 | Claim inherits kit pick: unchanged (server behavior). |
| 32 | Resolved: `decisions.md` 2026-10-06 "Lot 71 forfeit: active Poison does not pay" supersedes the earlier entry; no V7 action. |
| 34, 51, 66 | Lot 69 Spy semantics everywhere (§6.3, §10). |
| 35 | Recurring chips from public persistents with paused conditions (§6.5); dead module removed. |
| 36 | Dead since Lot 68; nothing rendered (§11). Removing the fields is a protocol change, out of scope. |
| 37 | Upgrade on in-play cards only for own actives, Shield, Sentences. |
| 38 | Spectator economy hidden. |
| 39, 40 | Disabled reasons; deactivate locked during sub-choice. |
| 41 | Empty row artifact dropped. |
| 42, 56 | Slot-drop select + Drop; Cancel copy per case (§14.3). |
| 43, 57 | No "choosing…" indicator (no public field). |
| 44 | Multi-attack resets on Cancel; eligible attacks unchanged. |
| 45 | Distinct help vs coach icons. |
| 46, 47 | Opponent kit sheet; Gambler drawGain. |
| 48 | Chat unread survives remount. |
| 49 | Esc closes the top sheet only (§6.7). |
| 50 | One client constant for the special price (value unchanged); server constant untouched. |
| 52, 53 | Per-card thief hints; typos fixed (§10). |
| 54 | Blind steal pick under base Spy: unchanged (rule). |
| 55 | Client-side duplicate/taken guards on rewards. |
| 58 | "Time's up" with live controls; closes when `subChoice` clears (§6.7). |
| 59 | Minimizable sub-choice sheets. |
| 60 | Every region always rendered for tutorial anchors. |
| 61 | L51-07 tones win. |
| 62, 81 | Dead code removed with its replacement. |
| 63 | Seed `eliminationBeat` on mount. |
| 70 | Feedback ask-once unchanged. |
| 72 | Play again pending state. |
| 73–79 | Admin interaction fixes (§7.8). |
| 80 | Data tab "Chat messages" (client only); match-detail rules and chat need admin HTTP fields — out of scope. |
| 82 | Finished phase: Game over first; claim via control. Verify the server never sends `claimableSeats` on finished (§14.3). |
| 83 | Download action log stays DEV-only. |
| 84 | Labels unchanged (not wrong, only inconsistent). |

---

## 14. Out of V7 scope and watch points

### 14.1 Separate work

- **Lobby host handoff to a bot** (Appendix A Q27): server fix in its own session — PR #78 into
  `dev` (2026-10-20).
- **Admin match detail** (rules and chat inside the match-detail dialog): needs admin HTTP fields.
- New illustrations (red-figure, mosaic, painted…): later chantier; Recraft or Scenario free
  tiers if generated (§5.5 keeps the swap cheap).
- Translation (FR/EN): later chantier.

### 14.2 Not in any lot

Public "X is choosing…" state, nickname persistence across reloads, rules un-ready on change,
Assassin multi-attack including specials, removing the dead Attack Thief fields, light theme,
music.

### 14.3 Watch points

- **Slot-drop Cancel copy**: read the server outcome for both cases (own fifth active; Curse
  caster picking the victim's slot) in L74 before writing the copy; ask if unclear.
- **Grid spacing threshold** (8 px), seat size and the exact 8 seat hues: tuned during L72/L74
  playtests.
- **Turn length on reconnect**: confirm the §6.10 order in playtest (reload is out of scope).
- **`claimableSeats` on finished**: verify in L77; if the server can send it, define stacking.
- **Tutorial anchors**: every `data-zone` / `data-hint-anchor` / tour highlight id listed in
  Appendix A must exist on an equivalent V7 element before L75 flips the default.

---

## 15. Lot map

| Lot | Goal | Depends on |
|---|---|---|
| **72 · Foundations** | Pure-module moves (§4.1) and the §12.1 classification. Docs: this spec, `docs/backlog_v7.md` (with the §4.1 module list and §12.1 classification), `PRODUCT.md` / `DESIGN.md`, AGENTS.md (§1 V7 status, §2 V7 docs and V6 closed at 71, golden rule 1 check, golden rule 7 "V7 changes no rule, value or protocol field", §9 open backlog and DoD → `backlog_v7.md`, `.test.tsx` location, subagent rule), one `decisions.md` entry recording the V7 architecture and what it supersedes. Code: V7 tokens + fonts side by side, ground, primitives, SVG icons, art extraction (contact sheet sign-off), **Card**, shared pieces rebuilt in `ui/` (§4.2), testing-library + Vitest config, `?ui=next` switch | — |
| **73 · View-model** | pure layer + tests (§4.3, §6.3, §6.10); Spy doc-comment fixes (§10.3) | 72 |
| **74 · Arena I** | top bar, seats + layout modes, arrows, plate, self strip, hand fan, dock, card sheet, tap-tap + drag, shop, sub-choices + sheet stack, log, chat, rules recall, clock, spectator/eliminated, finished board, reconnect, reject toast, existing FX and banners hosted on arena anchors (§6.12) | 73 |
| **75 · Arena II** | tutorial + hints re-anchored (id map), table copy fixes (§10.1 Lot 75 rows, §10.2), desktop + landscape-compact, FX parity check, **default flip**, old table and switch deleted, its tests classified (§12.1) | 74 |
| **76 · Home & lobby** | home, Solo / Online / Tutorial, How to play, What's new, Feedback, lobby (rules, chat, kit picker, claim), invite link, §10.1 Lot 76 copy rows | 72 (parallel with 73–75) |
| **77 · Game over** | winner hero (static), awards gallery, read-only chat, rules recall, button hierarchy, protocol line removal | 73, 75 |
| **78 · Juice** | §8 catalog: restyle and extend the FX hosted in L74, particles, shake, counters, confetti, reduced motion, performance gate | 75 |
| **79 · Sound & haptics** | §9, including the Sound / Vibration menu items | 78 |
| **80 · Admin** | tool mode §7.8, Chat messages tab | 72 (parallel) |
| **81 · Close-out** | remove leftovers: `design/`, Outfit, dead code, stale `frontend.md` lines; full playtest; What's new final | all |

Lots 76 and 80 can run in separate sessions in parallel with the Arena lots once Lot 72 is
merged; they must not edit `screens/table/` or `screens/arena/`, and anything they need from the
table comes from `ui/` or `view-model/` (§4.2). Files every lot touches (`App.tsx`,
`packages/shared/src/release-notes.ts`, `docs/agent/frontend.md`, `docs/backlog_v7.md`) are
reconciled by rebasing on `dev` before each PR. L75 deletes old dialogs that the lobby still
imports only after the matching L76 tasks merge. Each lot is one PR into `dev` (§4.6).
