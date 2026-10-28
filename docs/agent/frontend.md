# docs/agent/frontend.md — Client conventions

> Created during L1-12 from the real client code. Transverse rules → `/AGENTS.md`.
> Protocol → `protocol.md`.
>
> Sources: technical spec §7 · `apps/client/src/`.

## Status

V1 shipped functional UI. **V2 visual language is shipped** (`docs/technical_spec_v2.md`,
Lots 10–14). **V6 teaching / feedback / table-crowding surfaces are shipped** through Lot 63
(`docs/technical_spec_v6.md`, `docs/backlog_v6.md`) — still **one** frontend playbook, never
a fork. `App.tsx` is the phase router; Home, Lobby, Table, End, and Inbox live under
`apps/client/src/screens/`. **Keep it current with every client convention change**
(AGENTS.md §12) — same commit as the code, never a later cleanup. Intents, payloads, and
visibility rules stay server-side; Lots 49–64 are the current table (kit pick, occupancy 2–8,
no Reset help, horizontal card scroll, Spy 2/4, weaker-answer mutual, listed attack damage,
inspect from log/queue/Sentence chip, card lives under actives, Game over full Feedback ticket
on every hub leave, table `!` not the word Feedback, lobby Ready / Kick, same-room
Play again, join-by-code spectate + claim picker, Lot 58 shop UP icons / pool buy /
Unspy / Invisibility turns badge, Lot 59 compact Draw/Unspy dock with no word
labels, Lot 60 Game over awards gallery, Lot 63 Gambler Draw-bust log tell,
Lot 63 hub What’s new with a **New** additions section, Lot 63 pool-buy
action-log fog, Lot 64 Gambler start specials / weighted Draw / gambling death).

**V7 (visual redesign "Arcade Holo") is in progress** (`docs/technical_spec_v7.md` +
Appendix A `docs/technical_spec_v7_parity.md`, `docs/backlog_v7.md`, Lots 72–81). It is
client-only and lands side by side: the V2 design system below still governs every screen
until that screen's V7 lot lands (spec v7 §4.4). Product context: `/PRODUCT.md`. V7
design-system record: `/DESIGN.md`. On conflict, **code > spec v7 §5
(normative) > `DESIGN.md`** (derived from the code; spec v7 §5.8).

## Screens

| Screen | When | File |
|---|---|---|
| Home | No room — hub → online (create/join) or solo; How to play + What’s new + Feedback | `screens/home.tsx` + `how-to-play-dialog.tsx` + `whats-new-dialog.tsx` + `feedback/feedback-dialog.tsx` |
| Lobby | `phase: 'lobby'` — seats, Ready, host Start / Kick / bots, hidden kit pick, Feedback | `screens/lobby.tsx` + `lobby-kit-picker-dialog.tsx` |
| Table | `phase: 'playing'` — felt shell, opponents arc, center-stage log, queue, timers, hand, economy | `screens/table.tsx` (+ `screens/table/*`) · `?ui=next` → `screens/arena/arena-screen.tsx` (renders `TableScreen` until L74-01) |
| End | `phase: 'finished'` — closable awards gallery; Classic **Play again**; hub leave hits ask-once; the finished board follows the same switch (`tableUi`) | `screens/end.tsx` + `game-over-dialog.tsx` + `view-model/game-over-awards.ts` |
| Claim | Overlay when `claimableSeats` is non-empty — sit or stay spectating | `screens/claim-seat-dialog.tsx` |
| Admin | `pathname === '/admin'` — password-gated designer analytics; not a game phase; no hub link (Lot 61) | `screens/admin/admin-app.tsx` |
| Inbox (legacy URL) | `/inbox` redirects to `/admin/feedback`; `GET /api/inbox` unchanged | `App.tsx` (redirect only) |

Shared status copy: `screens/status-labels.ts`.

## View-model layer (V7 · Lot 72+)

Technical spec v7 §4.1–4.3; the per-module dispositions are the §4.1 table in
`docs/backlog_v7.md`.

- Modules are **moved, not rewritten** (L72-03): `git mv` with the basename unchanged,
  assertions verbatim, importers repointed directly, and **no shim or re-export** stays at an
  old path. `view-model/` holds `incoming-threat-diff`, `threat-tone`, `opponent-token-chips`,
  `action-log`, `select-hint` and `game-over-awards`; the modules L72-04 moved in are listed in
  the L72-04 bullet of this section.
- `view-model/` has **no** React, react-dom or motion import and **no clock read**
  (`Date.now`, `performance.now`); callers pass `nowMs`. The purity block in
  `eslint.config.mjs` and `view-model/view-model-purity.test.ts` enforce it.
- `view-model/` imports only `@card-battle/shared` and pure `ui/*.ts` helpers (asset-lookup,
  structured-cost, hint-ids, seat-colors, primitives/avatar-initial,
  seat/connection-badge-label, viewport-mode), never a `ui/` component. Nothing in
  `view-model/` imports from `design/` or `screens/table/`.
- `view-model/threat-tone.ts` (`ThreatTone`) and `view-model/opponent-token-chips.ts`
  (`TokenFlyoutEndpoint`) each keep a **type-only** import from `fx/table-fx-types`. Keep them
  `import type`; nothing else in `view-model/` imports from `fx/`.
- The four non-component `ui/` helpers are `hint-ids`, `help-storage`, `release-storage` and
  `fx-anchors`. The `card-battle.v6.*` storage keys in `help-storage` and `release-storage` are
  unchanged. `ui/fx-anchors.ts` holds the FX zone names, the deck-card flyout size and the
  `data-zone` selector builders; it takes a type-only `ResourceKind` import from
  `ui/asset-lookup`.
- L72-04 moved the React-free `design/` and `screens/table/` modules: `src/ui/` holds
  `asset-lookup`, `seat-colors`, `effect-text-tokens`, `structured-cost`, `visual-viewport`,
  `resource-captions` and `primitives/dialog-width`; `src/view-model/` holds `table-helpers`,
  `opponent-seat-resources`, `pending-chip-tone`, `attack-targets`, `chat-unread`,
  `table-banner`, `tutorial-coach-copy`, `table-copy`, `kit-inspect-traits`,
  `kit-special-card-key`, `chrome-labels`, `table-flag-intent`, `active-display` and
  `sub-choice-constants`. New code imports them from there, never from `design/` or
  `screens/table/`.
- **Seats (`view-model/seats.ts`, L73-02; spec v7 §6.2, §6.3):** `seatList(view)` returns the
  POV mode (`povModeOf`: `seated`, `reanimating`, `watching`, `walk-in-fogged`) and one
  `SeatModel` per seat that is not the POV's (`!isYou`; a walk-in gets every seat), in
  `view.players` order with `seatColorIndexOf` colours. The tier comes from wire fields only:
  `eliminated` (`isEliminated` or `eliminationReveal`), `spy-plus` (`spied.kitId`),
  `base-spy` (`spied` without `kitId`), else `unspied`; no log line changes it. `kitHidden`
  is true for `unspied` and `base-spy` (Q66). `resources` always holds life, point,
  upgradePoint and shield, each a number or `'?'` (`opponentResourceDisplay`; the dead
  `resourcesSnapshot` is never read). `reveal` carries Spy+ live or death-frozen hand and
  specials; opponents never get a hand count. A walk-in is `watching` once any seat carries
  `spied` (L57-16), else `walk-in-fogged`. `povModeOf`, `connectionLabel` and
  `seatColorIndexOf` are exported so the threat arrows and the self strip reuse them.
- **Seat badges (L73-02):** every public status is one `SeatBadge`, in `SEAT_BADGE_KINDS`
  order: spying-on-you, block, invisibility, sentence, shield, persistent, duplication,
  draw-gain, reanimation, absorb-window. A seat shows the first `SEAT_VISIBLE_BADGE_COUNT`
  (2) plus `+badgeOverflow`; the seat sheet lists all. Invisibility is one badge carrying its
  effect, never also a persistent; a `block` badge with 0 turns is the last-turn attack ban.
  An eliminated seat keeps only reanimation and absorb-window, with `connectionLabel` and
  `botDifficulty` null. `activeAttackBlock` renders nothing (Q36). The bot difficulty is
  null in the tutorial. Why: `decisions.md` 2026-10-27 "V7 seat tiers and badge order".
- **Seat layout (`view-model/seat-layout.ts`, L73-03; spec v7 §6.4):** `seats(view, layoutBox)`
  is `seatList(view)` plus `layout`. `layoutModeFor(layoutBox.viewport)` is
  `ui/viewport-mode.ts` `viewportModeFor`. `seatOrder` rotates `turnOrder` so the player
  after the POV comes first; a walk-in keeps `turnOrder` from `turnOrder[0]`. Portrait: seat
  centres on the upper half of the ellipse centred on the plate (`plateCenterFor`: on the
  arena's bottom edge) that touches the arena's top and sides, n equal sectors from the
  left. Desktop: the full ellipse around the arena centre, the bottom slot left to the POV
  (a walk-in uses all n slots). Landscape-compact: one top band of n equal columns, reported
  as `kind: 'arc'`. Grid fallback when two seat boxes (`SEAT_BOX[mode]`, badge row included)
  are under `SEAT_MIN_GAP_PX` (8) apart on both axes, when the arena cannot hold one seat, or
  when a portrait arena only a little taller than one seat leaves the ellipse a negative
  vertical radius (the plate sits on its bottom edge): `ceil(n/2)` over `floor(n/2)` in seat
  order. `SEAT_BOX`, `PLATE_BOX` and the gap are L74
  playtest values (§14.3); retuning them updates `seat-layout.test.ts`.
- `view-model/threats.ts` (L73-04, spec v7 §6.5): `threats(view, subChoice)` gives one
  `ThreatEntry` per `pendingEffects` item, in wire order, each with its **own** label
  (`listedAttackDamage` × `damageMultiplier`, else the effect's card icon), never a summed
  total (golden rule 1). Relation is `incoming` when the POV is the target (a self-queued
  base Suicide included), else `outgoing` when the POV is the source, else `third-party`.
  Tone: `mine` for outgoing, `threatToneFor` otherwise; every entry also carries the source
  seat colour (`seatColorIndexOf`). `groupKey` (`source|target|queuedAt|cardId`) fans arrows side by side.
  A **fan-out** (`FanOutGroup`, key `source|queuedAt|cardId`) is a `(source, cardId,
  queuedAt)` set with at least two distinct targets that covers every living opponent of the
  source except living Invisible seats, or that is a hits-all play (`HITS_ALL_CARD_IDS`,
  upgraded `HITS_ALL_WHEN_UPGRADED_CARD_IDS`, or Super Mirror copies). A hits-all burst stays
  while two or more copies remain, even after earlier copies resolved (designer 2026-10-27).
  A self-targeted entry never joins one, and a single remaining target draws a plain arrow.
  Members stay in `entries` with `fanOutKey` set, and each target badge keeps its own
  label. `mirrorBadge` comes from `redirectedBy`. `mirrorEligible` is set only while a `mirror`
  sub-choice lists the id. `gridThreatEntries` keeps POV in/out plus the tapped seat's
  entries, and `seatThreatIds` gives a seat's in/out ids. The tone type is
  `ReturnType<typeof threatToneFor>`, so `threats.ts` adds no `fx/` import.
- `view-model/recurring-chips.ts` (L73-05, spec v7 §6.5, Q35): `recurringChips(view)` (also
  `threats().recurring`) lists every Curse on the POV (`self.activePersistentEffects`) and each
  living opponent's Poison and Imposition with `counter > 0`, in `view.players` order; none for
  an eliminated or walk-in POV. The amount is the catalog rate for the tier from the
  `CLIENT_*` constants (rules spec §5, mirroring `apply-persistent-effects.ts`), never a
  prediction. `state` (`live` / `paused` / `ending`) mirrors the engine: own Invisibility
  pauses all three; an own Block chain (`blockTurnsRemaining > 0` or `blockAttacksForbidden`)
  pauses Poison and Imposition, and Curse keeps draining; an up, upgraded own Shield or own
  points ≤ 7 pause Imposition; a Curse on the POV at ≤ 1 life is `ending`, because the engine
  removes it instead of draining (designer 2026-10-27).
- **Card actions (L73-06).** `view-model/card-actions.ts` `cardActions(view, card, ctx)` gives a
  hand or special card's actions in the order Use, Upgrade, Sell, Multi-attack. A hidden action is
  absent; an unavailable one is disabled with one `DisabledReason` from
  `view-model/action-reasons.ts`, whose `DISABLED_REASON_COPY` holds all V7 disabled-reason copy.
  `view-model/action-lock.ts` `actionLock(view, ctx)` gives `actions-locked` (finished board, open
  sub-choice, eliminated POV, walk-in) before `not-your-turn`; every V7 action model starts from
  it. `use` carries the routing: target seats, send, Regeneration tiles 1–4, or Card Transformer
  consume options. Seats and reasons mirror `list-legal-play-card.ts`, `perform-action.ts` and each
  handler's `canPlay` in the server's check order, and a reason shows only when the view proves the
  server rejects. Never add a client immunity filter, and never gate a play the server accepts
  (golden rule 8). The two Invisibility predicates live once, in `view-model/attack-targets.ts`:
  `hasInvisibility` (server `playerIsInvisible`; a seat or `view.self`) and
  `seatIsLivingInvisible` (server `isIllegalOpposingTarget`). New view-model code never
  re-writes either predicate; `self-strip.ts` and `seats.ts` read the Invisibility effect itself
  for its turns. The V2 table keeps `screens/table/card-actions.tsx` until L75.
- **In-play cards (L73-07).** `cardActions` also takes `active`, `shield` and `sentence` refs.
  Upgrade is offered only on the POV's own active persistent in `UPGRADEABLE_ACTIVE_CARD_IDS`, own
  Shield while `self.shield > 0` (`active-shield`) and own ticking Sentence (its id). It is disabled
  at 0 upgrade points, off-turn and while locked, and hidden once upgraded and for Curse and
  Reanimation (Q37). Another seat's card in play gets a read-only sheet; its Shield model id is
  `active-shield:<playerId>`, never the POV's. Deactivate is offered on own persistents only, never
  Shield or Sentence, and is disabled off-turn and during a sub-choice (Q40); the Lot 69 confirm
  stays a UI step. `inPlayThumbs(view, ownerPlayerId)` lists a seat's Shield, persistents and
  ticking Sentences with their `ThumbBadge` and `activatedArt`, which is never true for Shield or
  Sentence (Appendix A `global-activated-art-guard`). The V2 table keeps `activeUpgradeInstanceId`
  until L75.
- **Drag and drop (L73-08).** `cardActions` adds `drop` (valid seats, what the plate does, Sell) and
  `canDrag`, which is false off-turn, while locked, for read-only and in-play cards, and when no zone
  takes the card; the arena adds the tutorial tour and Look gate (L75-04). A disabled Use opens no
  seat or plate zone. `view-model/drop-target.ts` `dropTarget(pointer, zoneRects, actions)` is pure
  rectangle math on half-open rects, with no DOM. It returns the exact `playCard` / `sellCard`
  intent, an open-choice result for Regeneration and Card Transformer, or `null` over an invalid
  seat, outside every valid zone, or inside two (spec v7 §6.6.3–§6.6.4).
- `view-model/self-strip.ts` (L73-09, technical spec v7 §6.1 items 3 and 5, §6.12):
  `selfStrip(view, ctx)` gives the self strip and, in `.dock`, the dock. Thumbs run combat
  Shield (only while `self.shield > 0`), own actives, then own ticking Sentences
  (`inPlayThumbs`, L73-07), and each carries `cardActions(view, ref, ctx)`. The POV mode,
  connection text and seat colour are L73-02's `povModeOf`, `connectionLabel` and
  `seatColorIndexOf`. Draw pays `players[you].drawGain ?? kit draw` and is
  `hot` above 10 (L64-05). Unspy is present for a Seated or Reanimating POV and absent for a
  Watching one. Its reason is the lock, then `no-living-spy`, then `not-enough-points`
  (L58-07). The finished board (`readOnly`) shows `stats` instead of Draw, Unspy and Activate
  duplication, and Shop is browse-only. A walk-in (`isSpectator`) gets no kit, resources,
  thumbs or economy (Q38).
- `view-model/shop.ts` (L73-10, technical spec v7 §6.8): `shop(view, ctx)` gives the tabs
  Cards / Special / Pool / Upgrade points. Card tiles use the catalog `buyCost` (Spy buys for
  4), the kit's `alwaysUpgraded` faces, and points-and-lives affordability. Upgrade-point
  prices come from `upgradePointBuyCost` / `upgradePointSellYield` at call time (L58-03), and
  Buy random uses the public `poolBuyCost`. Every buy carries the lock reason off-turn, in a
  sub-choice and on the finished board, so the Shop is browse-only there.
  `SPECIAL_CARD_PURCHASE_POINTS` is the **only** client copy of the special price (Q50):
  `screens/table/shop-dialog.tsx` and `view-model/opponent-token-chips.ts` import it, and the
  server's `SPECIAL_CARD_PURCHASE_COST` stays authoritative. In the tutorial,
  `shop-upgrade-point` opens Upgrade points and `shop-absorber` opens Cards with Absorber
  highlighted, not preselected.
- `view-model/log.ts` (L73-11, spec v7 §6.9): documented under Conventions, in the action-log
  bullet.
- `view-model/rules-recall.ts` (L73-12, spec v7 §6.11): documented under Design system,
  Rules (`ui/rules/`, L72-16), in the "Who supplies `rules`" bullet.
- `view-model/turn-clock.ts` (L73-13, spec v7 §6.10): documented under Conventions, in the
  timer-display bullet.

## Design system (V7 · Lot 72+)

Technical spec v7 §5 is normative (§5.1 colors, §5.2 type, §5.3 shapes, §5.7 motion, §8.3
reduced motion). `/DESIGN.md` is derived from `apps/client/src/ui/` and follows the order
**code > spec v7 §5 > `DESIGN.md`** (§5.8). A task that adds or changes a token or a `ui/`
component updates `DESIGN.md` in the same commit (§12.5). The tokens live in `ui/tokens.css`
and are mirrored in `ui/palette.ts` and `ui/motion/motion-tokens.ts`.

- **Side by side** (§4.4): `index.css` imports `./ui/tokens.css` right after
  `@import "tailwindcss"`. V2 `@theme` and `:root` values do not change, and no old screen is
  recolored; a screen switches entirely when its lot lands.
- **Names:** one `@theme inline` block in `ui/tokens.css`, every key
  `--<tailwind-namespace>-v7-<spec-token>`. Utilities: `bg-v7-panel`, `text-v7-text-2`,
  `border-v7-ink`, `rounded-v7-chrome`, `shadow-v7-chrome`, `font-v7-display`,
  `text-v7-input`, `ease-v7-entrance`. No V7 key reuses a V2 name (`--color-ink`,
  `--color-surface*`, `--color-seat-*`, `--radius-card`, `--radius-button`, `--font-sans`),
  and no `--text-v7-*` size suffix equals a `--color-v7-*` suffix. L81 may drop the prefix.
  Inline styles take hex from `ui/palette.ts` (`V7_COLORS`, `v7SeatColor`), never `var()` or
  `color-mix()` (the mobile Safari rule from `ui/seat-colors.ts`).
- **Ground:** `.v7-ground` (halos plus 1 px scanlines every 3 px) is opt-in, defined only in
  `ui/tokens.css`, and never goes on `html`, `body` or `#root`. No `vh` or `dvh` in that file.
  Chrome shape is read only from `--chrome-outline-width`, `--chrome-shadow`,
  `--chrome-radius(-sm)` and `--chrome-press-y`, so L80 overrides them under
  `[data-mode="tool"]` (`DESIGN.md` › Tool mode).
- **Fonts:** `ui/fonts.ts` holds seven `@fontsource` side-effect imports: Lilita One 400
  (titles, buttons, UI numerals, seat names), Fredoka 500-700 (everything printed on a card),
  Nunito 700-900 (body, descriptions, log lines, labels). `@fontsource/outfit` stays imported
  in `main.tsx` until L81. Floors: 11 px functional text, 16 px text inputs, own lives at
  least 20 px, incoming damage at least 22 px on a 375 px phone.
- **Palette mirror:** `ui/palette.test.ts` reads `ui/tokens.css?raw` and fails when
  `palette.ts` and the CSS declare different values. Vitest blanks every CSS import, `?raw`
  included, so the client project sets `test.css.include` for that one file in
  `vitest.config.ts`; keep that key when the project's `include` changes (L72-06).
- **Contrast:** `ui/contrast.ts` (`contrastRatio`, `deltaE2000`) backs `ui/contrast.test.ts`.
  `--text` and `--text-2` reach 4.5:1 on all four grounds; `--text-on-card` on both card-face
  stops; every seat hue 4.5:1 on all four grounds and pairwise CIEDE2000 at least
  `SEAT_HUE_MIN_DELTA_E` (20) apart. `--ink` is outline and shadow only, never text: labels on
  `--cta`, `--cta-2`, `--danger` and `--life` fills use `--text-on-cta`. A seat hue never
  shares an element with `--life` or a `--threat-*` color. Resource and threat colors are text
  only at large size, on every ground (spec v7 §5.1); otherwise they are fills, rings and
  icons. `ui/contrast.test.ts` additionally guarantees at least 4.5:1 on `--bg-0`, `--bg-1`
  and `--panel`, which keeps large text safe there.
- **Motion:** V7 components read only `usePrefersReducedMotion()`
  (`ui/motion/use-prefers-reduced-motion.ts`), run motion props through
  `motionSpecFor(spec, reduced)` and put `data-motion="reduced" | "full"` on the animated
  root. Reduced means fades and color flashes only: no x, y, scale or rotate, and a fast tween
  instead of the spring. Apply CSS animation and press classes only when full.
- **Icons (L72-07):** `<Icon name size? label? />` from `ui/icons/icon.tsx`. Names only from
  `ICON_NAMES` (`ui/icons/icon-names.ts`: the spec v7 §5.6 set including `unspy`, plus the L72
  additions `clock`, `close`, `chevron-left`, `chevron-right`, `random`); resources via
  `RESOURCE_ICON[kind]`. Decorative (`aria-hidden`) unless given a non-empty `label`.
  Icon-only controls use `IconButton` (L72-08) for the aria-label and title (L59-01), never a
  bare `Icon`. Glyph paints are `V7_COLORS` hex only, with a 2-unit ink outline and a non-ink
  body. Never put an icon directly on a fill within CIEDE2000 20 of its body or motif token
  (for example `point`, `shop`, `coach` or `feedback` on `--cta`, or `help` on `--cta-2`):
  put it in a `--bg-0` or `--panel` well. No emoji and no U+2715 cross in `ui/`
  (`ui/icons/no-emoji.test.ts`); use `Icon name="eliminated"` or `"close"`. The classic
  `SpyEyeIcon` and `ForfeitFlagIcon` (`screens/table/`) stay until L75. Details:
  `/DESIGN.md` › Icons.
- **Art (L72-10, spec v7 §5.5):** `src/assets/art/{cards,kits}/<id>.png`, 31 base cards
  (Roulette included) and 16 kits (Gambler included), transparent, trimmed, native
  resolution. Resolve them only through `artFor(id)` (`ui/asset-lookup.ts`): it never
  returns activated art (upgraded, activated and active looks are Card code states, §5.4) and
  never throws; a missing drawing falls back to the family verso (the kit verso for a kit),
  then to `ART_FALLBACK_URL`. The PNGs are generated by
  `pnpm --filter @card-battle/client exec tsx scripts/extract-art.ts` from the
  `ui/asset-files.ts` maps (base drawings only) and are never hand-edited. Ground removal is
  edge flood-fill only (`scripts/art-flood-fill.ts`), never a global color key. Old ground a
  drawing encloses is cleared by `clearSeededGround` from one hand-placed seed per pocket
  (`POCKET_SEEDS` in `scripts/extract-art.ts`; designer 2026-10-27, list in `/DESIGN.md` ›
  Illustrations). The helper throws when a seed is not ground, so a wrong seed cannot erase
  drawing. A new pocket gets a seed, never a color key. `defringeEdge` then un-blends the old
  ground out of two rings only: the opaque pixels next to any cleared region (outer edge or
  pocket), and the pixels next to those unless they are a solid fill. So edges show no light
  halo on dark grounds; `clearEdgeGround` still writes alpha only (fix rounds 1–3,
  `decisions.md` 2026-10-26 and 2026-10-27). `GROUND_TOLERANCE` lives in
  `scripts/art-flood-fill.ts`, and the defringe thresholds derive from it. Printed values are
  never authoritative: the crop boxes and erase zones drop them, and numbers come from the
  catalogs. The script also
  writes the before/after contact sheet to the gitignored `apps/client/.art-contact-sheet/`;
  it goes on the lot PR for the designer's sign-off. Old screens keep `getCardArtUrl` /
  `getKitPortraitUrl` until L72-21. A new card or kit = its `ui/asset-files.ts` map entry +
  its source PNG in `images/` + a rerun of the script (then check the contact sheet).
- **Detector:** the only Impeccable ignore is the pre-approved `radial-spotlight-glow` /
  `dark-glow` ignore scoped to `ui/tokens.css` (spec v7 §12.4); `.impeccable/config.json` is
  committed. Any other finding is fixed, not ignored.

### V7 primitives (L72-08)

- **Imports:** one file per primitive in `ui/primitives/` (`button`, `icon-button`, `pill`,
  `badge`, `avatar`, `tabs`, `segmented`, `slider`, `toggle`, `tooltip`, `scroll-area`,
  `text-field`, `carousel`, `kit-tile`), each a named export of the same PascalCase name
  (`import { Button } from '../ui/primitives/button'`). There is no barrel file. Details per
  primitive: `/DESIGN.md` › Primitives.
- **Chrome helpers:** `ui/primitives/chrome-classes.ts` is the only source of the chrome
  classes:
  - shape: `CHROME_OUTLINE_CLASS`, `CHROME_SHAPE_CLASS`, `CHROME_SHAPE_SM_CLASS`,
    `CHROME_FLAT_SM_CLASS`, `CHROME_DISC_CLASS`, and `CHROME_TRACK_*` for Tabs and Segmented;
  - state: focus, the "off" disabled look (`CHROME_DISABLED_CLASS`, which covers `disabled` and
    `aria-disabled="true"`), variants and press (`chromePressClass(reduced)`,
    `motionAttribute(reduced)`);
  - the icon-well rule: `iconNeedsWell(variant)` and `ICON_WELL_CLASS`. On `--cta`, `--cta-2`
    and `--danger` fills an icon sits in a `--bg-0` well.

  New chrome composes these constants instead of restating the outline, radius or shadow
  (`border-v7-ink`, `shadow-v7-chrome` and so on). `avatar-initial.ts` holds the grapheme
  initial.
- **`className` target:** a primitive puts `className` on its outermost element. That is the
  Button wrapper when a reason line is present; IconButton has no `relative` root, so
  `absolute top-3 right-3` positions it directly.
- **Labelled scroll regions:** a `ScrollArea` with a `label` is a named focusable region and
  carries `data-scroll-region` (`SCROLL_REGION_ATTRIBUTE`, `use-focus-trap.ts`), the same mark the
  Sheet body sets when it overflows. Inside a sheet, initial focus goes to the first focusable
  element without that mark, so a field after a labelled transcript (Chat) keeps it; with
  nothing else focusable, the region takes it. Content that can overflow gets a label (a body
  that overflows only sometimes sets it only then, as the Sheet and the coach panel do).
  `focusRing="inset"` draws the ring inside the edge for an area inside a clipping container.
- **Disabled but focusable:** where a disabled reason must reach keyboard and screen-reader
  users (Q39), pass `disabled` with `focusableWhenDisabled` to Button: it renders
  `aria-disabled="true"`, stays in the Tab order and swallows activation. The Carousel
  end-stops use `aria-disabled` on IconButton, so paging to an end keeps focus (WCAG 2.4.3,
  `docs/agent/decisions.md` 2026-10-21). Never toggle native `disabled` on a focused control.
- **Keyboard model:** `ui/primitives/roving-focus.ts` backs Tabs and Segmented:
  `rovingKeyFor(key, 'tabs' | 'radios')`, `nextEnabledIndex`, `edgeEnabledIndex`, and
  `hasCommandModifier(event)`, which leaves Alt, Ctrl and Meta chords to the browser. A new
  roving widget reuses it rather than writing its own arrow-key switch.
- **Esc layering:** each Esc closes one layer. Open tooltips form a stack, and one shared
  capture-phase `document` listener closes only the most recent one, then calls
  `stopImmediatePropagation`.
  - Still run: `window` capture listeners, and `document` capture listeners registered before
    the shared one was installed.
  - Stopped: later `document` capture listeners, everything below `document`, every
    bubble-phase listener, and React handlers.
  - The Sheet's Esc listener (L72-09) is therefore a bubble-phase `document` listener, so a
    tooltip open inside a sheet takes the first Esc and the sheet the next.
- **Scroll containers are positioned:** every V7 scroll container (a screen's scrolling ground,
  ScrollArea, the Carousel track, the Sheet body) carries `relative`. Absolutely positioned
  descendants, `sr-only` labels included, then stay inside its clip. Without it they stretch
  `#root`, which clips and cannot scroll back, and a screen reader's focus-follows can leave a
  blank screen. The rule covers V7 containers; a pre-V7 screen adopts it when its lot restyles
  it. ScrollArea is always `relative`, and a `className` of `absolute` or `fixed` loses to it
  (Tailwind emits `.relative` after `.absolute` and `.fixed`), so a caller that must position
  the scroller wraps it in a positioned element.
- **`data-motion`:** every animated primitive puts `data-motion="reduced" | "full"` on the
  element that moves (Button, IconButton and Toggle on the `<button>`, Carousel on its scroll
  track, whose `scroll-smooth` class and `scrollTo` behavior follow it) and applies transition
  or press classes only when full. Tests assert the attribute or the class, never
  a media query (happy-dom cannot evaluate one).
- **Viewport rule:** layout mode comes only from `viewportModeFor({ width, height })`
  (`ui/viewport-mode.ts`) or the hooks `useViewportMode()` / `useVisualViewportBox()`
  (`ui/use-visual-viewport-box.ts`, `useSyncExternalStore` on `visualViewport`). Never write a
  second height or aspect breakpoint. happy-dom has no `visualViewport`, so
  `readVisualViewportBox()` falls back to the window size (1024×768 there); a component test
  that needs a given box stubs it (`vi.stubGlobal('visualViewport', …)`, see
  `dialog.test.tsx`) or mocks `ui/use-visual-viewport-box` (see `carousel.test.tsx`; a mock
  must then provide every hook the rendered tree calls).
- **Copy scope:** `ui/ui-copy.ts` holds only the spec v7 §10.6 strings a `ui/` component adds
  (`EXCLUDED_LABEL`, `MINIMIZE_LABEL`, `TABLE_RULES_LABEL`, `carouselPositionLabel`,
  `shieldPointsLabel`, `ELIMINATED_LABEL` and `eliminatedPortraitLabel`). A new such string goes
  there, not beside its component. Any other label is a prop the caller fills from existing
  copy.
- **Gallery registration:** add `ui/<area>/<area>.gallery.tsx` exporting
  `const gallery: GallerySection = { id: '<area>', title, entries: [{ id, title, render }] }`
  (`dev/gallery-registry.ts`). `dev/ui-gallery.tsx` picks it up through `import.meta.glob`; no
  central file is edited, and a duplicate section id throws. Keep stateful demo components in
  a components-only sibling `.tsx` (react-refresh). The route is `/dev/ui`
  (`dev/dev-ui-route.ts`), DEV only and absent from production builds.
- **Preview config:** `.claude/launch.json` is committed. It is the desktop app's dev-server
  preview configuration: a `server` entry (`pnpm --filter @card-battle/server dev`, port 2567)
  and a `client` entry (`pnpm --filter @card-battle/client dev`, port 5173), so `/dev/ui` and the
  table open without a hand-run `pnpm dev`. It carries no secrets and must never gain any.

### V7 overlays (L72-09)

- **Contract** (spec v7 §6.7, Q49, Q59; details in `/DESIGN.md` › Overlays):
  `<Sheet mode="read-only" onClose …>` or `<Sheet mode="blocking" …>` (a discriminated union:
  blocking has no `onClose`), `<Dialog>` (a read-only Sheet with placement `auto`) and
  `<Toast onDismiss={(cause) => …} dismissLabel …>`. Blocking sheets paint above every
  read-only sheet, ignore Esc, backdrop and swipe, and leave only through an answer or
  Minimize, which collapses them to a bar above every sheet while the caller keeps intents
  locked. Read-only sheets paint at most two deep and close on Esc, a backdrop press or a
  swipe-down; `dismissLocked` (the Feedback send lock) blocks all three, `closeOnBackdrop`
  only the backdrop. Esc closes only the top sheet. Toasts are dismissed only by hand or by
  timeout, both through `onDismiss`, never by a prop or state change.
- **One live sheet** (fix round 1): only the top expanded sheet is live; every sheet under it
  is inert, and focus follows it (`use-focus-trap.ts`: move in on becoming live, restore on
  close only to a reachable opener, else the new live sheet, else the opener chain). A
  caller-collapsed read-only sheet (L74 targeting) is a bar on the sheet layer: under an
  expanded blocking sheet it is inert (§6.7), and while it is the newest read-only sheet no
  sheet handles Esc, so L74's targeting handler receives an unhandled Esc and cancels
  targeting (§6.6.5). The live sheet, once closing, is a no-op press shield until its exit ends
  (its panel is inert); a covered sheet closing under it stays click-through. A real collapse to
  the bar or restore from it shields the box, bar included, for `--dur-base`, and Minimize and
  restore ignore presses then. A closing toast stays click-through.
- **`useFocusTrap` contract** (`ui/primitives/use-focus-trap.ts`, a superset of the brief's
  row): `useFocusTrap(containerRef, { active, initialFocusRef?, restoreFocus?, open?,
  isReachable?, fallbackContainer?, standIn?, handOverOnRelease? })`. `active` is the live
  trap; `open` (default `active`) is the open cycle that keeps the opener; `isReachable`,
  `fallbackContainer` and `standIn` steer the restore on close; `handOverOnRelease` hands the
  opener to the next trap when it is released mid-cycle. `focusIntoTrap(container)` moves
  focus into an open trap the way its activation would. Sheet wires all of it; another caller
  can pass only `active`.
- **L74 carry-overs (not code yet):**
  - collapsing a read-only sheet for targeting releases its trap, but nothing moves focus to the
    caller's `collapsedBar`: L74 owns targeting focus (§6.6.5);
  - under the B2 ruling, an older expanded read-only sheet (Seat) under a collapsed targeting
    sheet becomes the live modal sheet; L74 decides whether entering targeting closes or
    collapses covering read-only sheets;
  - `#root` stays non-inert (deferred), so a programmatic `.focus()` can still leave a modal
    sheet;
  - a click on an exiting overlay or on the transition shield still bubbles through the React
    tree to the Sheet's ancestors (portal bubbling): never render a Sheet inside a clickable
    ancestor, or stop propagation there;
  - closing a collapsed or minimized sheet unmounts its bar at once, with no shield, so a double
    tap on a `collapsedBar` control that ends targeting can land on the dock: the targeting flow
    owns that (shield or debounce).
- **Files** (`ui/primitives/`): `sheet-stack.ts` (pure state: paint order, Esc target,
  inertness, z-index), `sheet-stack-context.ts` (the store, `useSheetStackStore`,
  `useSheetStackState`), `sheet-stack-provider.tsx`, `sheet-placement.ts`, `use-focus-trap.ts`,
  `sheet.tsx`, `dialog.tsx`, `toast.tsx`, `presence-layer.tsx` (tells an AnimatePresence child
  whether it is exiting), `sheet-focus.ts` (`reachableIn`, `livePanel`: where focus may go in
  a stack state); layers in `ui/layers.ts` (`Z_INDEX`). The default
  store is a module singleton, so the app root needs no provider; `<SheetStackProvider>` exists
  for isolation.
- **Portals:** sheets and toasts render into `document.body`. A sheet opened from inside a
  `<form>` therefore leaves the form, which retires the V2 hazard where a raw `<button>` in a
  Dialog inside the solo menu form had to keep `type="button"` (Appendix A
  `global-dialog-interaction-contract`): a button outside the form's DOM has no form to
  submit. React events still bubble through the React tree, so a caller's `onKeyDown` or
  `onClick` above the sheet still sees them.
- **Tests:** `renderUi` gives every render its own sheet stack, kept across `rerender`, so one
  test's sheets never sit above another's. The swipe on a real touch screen and the placement
  at 375×812, 844×390 and 1440×900 are checked in the L72-21 browser gate.

### Cost glyphs and effect copy (L72-11)

- **Files:** `ui/card/glyph-amount.ts` (`GlyphAmount` = `StructuredCost` or a shield amount,
  `glyphAmountIcon`, `glyphAmountFromResource`, `spokenGlyphAmount`), `ui/card/cost-amount.tsx`
  (`<CostAmount amount signed? multiplier? title? size? />`), `ui/text/effect-text-with-icons.tsx`
  (`<EffectTextWithIcons text iconSize? />`), `ui/text/card-effect-copy.tsx`
  (`<CardEffectCopy card isUpgraded />`: Cost row, effect, Upgrade block). They carry spec v7
  §6.6.1 and replace the V2 `design/components/{cost-display,effect-text-icons,card-effect-copy}.tsx`
  on V7 screens; the V2 files and their source-text tests stay untouched until L75 and L76
  retire their consumers. L72-12 (card chips), L72-15 (kit details), L72-17 (coach) and L74 and
  L76 import these.
- **Use:** one `CostAmount` for every number-plus-icon amount: a cost chip, a Draw or shop price,
  a reward, an amount inside prose. `signed="cost" | "gain"` prefixes `−` or `+` and speaks "minus"
  or "plus"; `multiplier={2}` prefixes `2×` (a multiplier of 1 shows nothing). `size` sets only
  the icon px (`sm` 14, `md` 16, `lg` 20); font and color come from the parent, so a glyph never
  paints a resource color as text (spec v7 §5.1). A `pointsPerLife` rate shows two icons
  (`N [point]/[life]`). The root has `data-glyph-icon={IconName}`.
- **`title={null}` (L59-01):** `title` defaults to the spoken amount ("3 pts"). Inside a control
  that names itself (Draw, Unspy, a shop button) pass `title={null}`: an inner `title` would
  replace the control's own tooltip. The spoken text stays, so an unlabeled button is still named
  by its amount. Never put a `CostAmount` on a fill of its own resource color; an icon-on-fill
  case goes in a well (`DESIGN.md` › Icons).
- **Spoken text:** structured costs keep `spokenCost`'s short wording ("3 pts", "3 pts/life");
  shield now speaks "N shield point(s)" (the V2 inline glyph spoke only the number). Tests read
  the two sides with `test/glyph-queries.ts` (`visibleText`, `spokenTexts`, `glyphRoots`), a
  test-only module that shipped code never imports.
- **Effect copy:** catalog prose goes through `EffectTextWithIcons`, which turns resource
  phrases ("4 lives", "2 upgrade points", "4 shield points") into amounts and keeps "instead
  of" visible; damage, turns and card lives stay prose. `CardEffectCopy` rows carry
  `data-effect-part="cost" | "effect" | "upgrade"`. Catalog text itself is L72-13's.
- **Gallery:** section `text` (`ui/text/text.gallery.tsx`, DEV only).

### Card (`ui/card/`, L72-12)

- **The only V7 card renderer:** `ui/card/card.tsx` (`<Card size instance … />`, or
  `face="hidden" family`) with its pure helpers in `ui/card/card-face.ts` (`CARD_SIZES`,
  `cardFamilyOf`, `cardCostChip`, `cardDamageChip`, `cardCounterLabel`, `cardFaceLabel`,
  `cardNameWordEm`, `cardNameFontSize`, `CARD_NAME_FIT`, `HIDDEN_CARD_LABEL`).
  `design/components/card.tsx` and its source-text tests stay for the
  classic screens until L75/L76 retire them.
- **Art only from `artFor`:** the base drawing, so the Sentence/Shield activated-art guard
  holds by construction and Roulette uses its base drawing. Never call `getCardArtUrl` from a
  V7 surface; upgraded and active looks are Card states.
- **Long-press is ours:** every face prevents the context menu and sets `select-none` and
  `[-webkit-touch-callout:none]`; the art has `pointer-events-none` and `draggable={false}`.
- **Numbers and names:** damage comes from `cardDamageChip` (`listedAttackDamage` × the
  caller's `damageMultiplier`); the accessible name from `cardFaceLabel` (name, " upgraded",
  ", N damage", the counter label). Thumbs print no name and no cost chip (art-only thumbs), so
  their name is the aria-label and a native `title`.
- **The caller decides state:** `unplayable` (POV's turn, card-specific reason; the face stays
  activatable), `selected`, and `counter` (`{ kind: 'card-lives' | 'turns', amount }`). The glow
  and the counter badge follow `counter` only, so Curse and the combat Shield get no glow. Where
  a family is itself secret, pass a neutral `family` to the hidden face (V2 used the action verso
  for unspied plays); the component cannot know.
- **Size contract:** resize a card only with `className="[--card-w:…]"` on the card itself;
  width and height both derive from it (height = 1.5 × width), and without it each size uses
  its own default. `--card-w` does not inherit (`@property` in `ui/tokens.css`), so setting it on
  a hand row does nothing: set it per card. The definite height means a default stretching flex
  or grid row cannot distort a card, and the row's `items-*` alignment still applies; do not
  add `self-*` to cards. L75's landscape-compact hand derives `--card-w` from the visible
  height. Never pass `w-*`, `h-*` or `aspect-*` classes: they would race the card's own sizes.
  The selected lift, the 8 px focus ring, the counter glow and the counter badge reach past
  the 2:3 box, so a scroll or `overflow-hidden` parent pads about 16 px around active cards.
  Hidden faces carry no `data-card-id` or `data-instance-id`.
- **Selection vs focus:** selection is the `--cta` outline; keyboard focus is a separate
  `--text` ring layer (`data-card-layer="focus"`, `group-focus-visible`). Never style focus
  through `outline` on a card, or it would replace the selection cue. State filters (the
  unplayable dimming) go on the body layer (`data-card-layer="body"`: rim, face or verso), never
  on the root, so both cues keep full contrast. The chips, the "+" badge and the counter badge
  live in the sibling `data-card-layer="marks"` and are never filtered, so their numbers keep the
  §5.1 contrast pairs on an unplayable card (L72-21 gate).
- **Tests:** happy-dom has no media queries and no layout, so tests assert `data-motion`, the
  `data-card-*` anchors and the class names (`v7-card-sheen`, `v7-card-holo-drift`,
  `animate-pulse`, the lift, the size variables); the name fit is a node test on
  `cardNameWordEm` over every catalog name. Chip fit, name breaks and art weight are measured in
  the browser over all 31 ids × 5 sizes × base/upgraded at 320, 375 and 1440 px, by mounting
  the matrix from `/src/ui/card/card.tsx` in a fixed overlay (never by editing repo files);
  reduced motion in a srcdoc iframe that stubs `matchMedia` and installs the React refresh
  preamble before importing the Card.

### Chat (`ui/chat/`, L72-14)

- **Component:** `ui/chat/ChatLog` (L72-14): transcript plus composer; `onSend` receives the
  trimmed body (the V6 log sent it untrimmed); `inputLabel`/`placeholder` override for the
  walk-in label (L76). It replaces `screens/table/chat-log.tsx` for L74-16, L76-13 and L77-05.
  The old file stays until L75-11. Props: `messages`, `players`, `canWrite`, `onSend`.
  `ui/chat/chat-line.ts` holds `chatLineView` (round label, seat, side stream, role label) and the
  three V6 copy constants; spec v7 §10.6 adds no chat string. No unread logic (`chat-unread.ts`
  is L73/L74).
- **Behavior kept from V6** (Appendix A `chat-compose-enter`): uncontrolled form; `chat-body`
  input, `maxLength` `CHAT_BODY_MAX_LENGTH`; Enter or Send submits; empty or whitespace-only text
  is dropped with no reset; the form resets after a send; no composer when `canWrite` is false.
  The transcript opens on the newest line and then sticks to the bottom only while the reader is
  within 24 px of it (designer 2026-10-26, `decisions.md`); the reader's own send always scrolls
  down. Send is never disabled
  (nothing tracks an empty field, and a native `disabled` would leave the Tab order). Shift+Enter
  sends too, because the field is a single-line `<input>`.
- **Announcements** (`chat-new-message-announcement`): the transcript is a polite `role="log"`,
  mounted before the first line, and lines are keyed by `ChatMessageView.order`, so each new line
  is announced once and a re-render never reads the log back. Do not move the role onto the `<ul>`
  (it would strip the list semantics), and do not key lines by index.
- **Transcript scroller:** a `ScrollArea` labelled `CHAT_LOG_LABEL` ("Chat", existing V6 copy,
  not a new §10.6 string), so it is a named, focusable region and keyboard users can scroll it
  (WCAG 2.1.1; an unlabeled one is a nameless Tab stop in Chromium and unreachable in WebKit).
  `ScrollArea` marks a labelled area `data-scroll-region`, so a sheet's initial focus (the
  `use-focus-trap.ts` rule) still goes to the message field, and falls to the region only on
  the read-only board. The `role="log"` wrapper stays inside it.
- **Stick to the bottom:** `stuck` starts true and follows the reader's own scroll events (within
  `STICK_THRESHOLD_PX` = 24 of the end); an effect keyed on the message count and the newest
  `order` (not the array identity) and a `ResizeObserver` on the log content scroll to the end
  only while `stuck`. The observer matters in a `Sheet`: its overlay is `hidden` (no layout) when
  the transcript mounts, so the open scroll alone leaves it at the top, and the observer scrolls
  once the sheet shows. A send sets `stuck` and scrolls at once, so the echoed line follows. A
  "new messages" pill is out of scope.
- **Line wrapping:** `break-words` on each `<li>`, because `ScrollArea` clips its horizontal
  overflow; checked in the browser with a 24-character nickname and a 200-character body at
  375 px.
- **Tests:** `chat-line.test.ts` (node), `chat-log.test.tsx` and `chat.gallery.test.tsx`
  (happy-dom). The open and arrival scroll test spies on the `Element.prototype` `scrollHeight`
  getter and `scrollTop` setter, which happy-dom defines on the base `Element`; a version that
  moves them fails the test loudly. The stick-to-bottom tests stub `scrollHeight`,
  `clientHeight` and `scrollTop` on the scroller element and fire `scroll` for a reader's move;
  happy-dom's `ResizeObserver` never fires, so one test swaps in a fake and fires it by hand.
  The focus tests render `ChatLog` inside a read-only `Sheet`. A rendering frame is needed for
  scroll events and observers in the hidden Browser pane, so take a screenshot between steps. The 16 px input is read from computed style in the browser gate
  (`/dev/ui#chat`), since happy-dom evaluates no CSS.
- **Gallery:** section `chat` (`ui/chat/chat.gallery.tsx`, DEV only): transcript, empty,
  read-only and longest line.

### Kit (`ui/kit/`, L72-15)

- **What replaces what:** `KitPortrait` and `KitDetails` replace `design/components/kit-portrait.tsx`
  and `screens/table/kit-inspect-details.tsx` on V7 surfaces: the L74 kit sheet and self strip,
  the L76 kit picker and the L72-16 rules strip. The classic files and their duplicated copy
  stay until L75 / L76, which delete them with their source-text tests.
- **Values:** every number comes from `KIT_CATALOG` (`getKit`, `upgradePointBuyCost`,
  `upgradePointSellYield`), never from the PNG: the printed stats are cropped out of the art
  (`artFor`), and the old Gambler PNG prints "?" where the catalog has Draw 10. The ability
  prose is
  `KIT_ABILITY_COPY`, verbatim (the Prophet copy fix is L76's, spec v7 §10.1).
- **Anchors:** `data-kit-section` (one per group, with `data-kit-stat`, `data-hand-family`,
  `data-special-key` and `data-card-caption` inside) and `data-zone="kit-portrait"` with
  `data-eliminated`, `data-kit-face`, `data-kit-size`. `fx/play-flyout.ts` and the L74 self strip
  query the portrait anchors.
- **The name has one source:** `kitPortraitAlt(kitId)` (`ui/kit/kit-portrait-label.ts`): the
  catalog name, "Hidden kit" for `null` and "Random kit" for `'random'` (spec v7 §11). A caller
  never writes its own `alt`. With `onClick` the portrait is one button named by `ariaLabel`
  or that name; the face inside is decorative, so a screen reader hears the button only, and a
  caller that needs a state heard ("eliminated") puts it in `ariaLabel`.
- **Classic width rules:** `index.css` still sizes a portrait inside `[data-zone="opponent-seat"]`
  and `[data-zone="private-zone"]` (2.35rem and 3rem, unlayered, so they beat the size classes).
  A V7 surface must not reuse those zone names around a `KitPortrait` before L75 removes the
  rules, or the portrait would not keep its `size`.
- **Layering:** `ui/kit/` never imports `design/` or `screens/`; it takes `ui/`, `view-model/` and
  `@card-battle/shared` only. The hidden-verso classes the code faces share with the Card live
  in `ui/card/card-classes.ts`.
- **Focus and selection:** a clickable portrait takes the shared `CHROME_FOCUS_CLASS` ring
  (`--text`); the `--cta` outline is selection (Card, KitTile). A picker marks the chosen kit
  with its own selected state, never by restyling focus.
- **Eliminated name:** the component composes ", eliminated" into a clickable portrait's name
  (an `ariaLabel` from the caller replaces it, so it must carry the state itself); the image
  name of a plain portrait stays the bare kit name (spec v7 §11).
- **Nesting:** a portrait inside another control (a `KitTile` head, a seat button) is the
  non-clickable form, so no button sits inside a button; `KitTile` already hides its portrait
  from assistive tech and names the tile by its visible kit name.
- **Sections:** `kit-details-sections.ts` holds the ids in display order, their titles and
  `KIT_TRAIT_SECTION_FOR`, a `Record` keyed by `KIT_TRAIT_SECTION_KEYS`: a new `KitTraits` key
  fails typecheck, then the L30-05 test, until it has a rendered section. A new section id goes
  in the table and in `kit-details.tsx`; the test pins the order.
- **Cards inside the details:** thumb `Card`s with synthetic instance ids
  (`kitSpecialCardKey(cardId, index)`, `always-upgraded:<id>`, `immune-to:<id>`); the starting
  hand is two hidden thumbs. A thumb prints no name and no cost chip, so the details add a
  visible caption and a signed `CostAmount`. Never resize them with `w-*` classes (Card contract).
- **Tests:** `kit-details.test.tsx` is the component test that the L30-05 and L51-04 rows of
  `kit-inspect-dialog.test.ts` expected (`docs/backlog_v7_test_classification.md`); the classic
  test stays as it is until L75 / L76. A test that mocks `console.error` also asserts nothing
  else was logged, so a React key or nesting warning fails it.
- **Gallery:** section `kit` (`ui/kit/kit.gallery.tsx`, DEV only). The size by kit matrix is
  not in the gallery: check it in the browser by mounting `/src/ui/kit/kit-portrait.tsx` from
  the page console (as for the Card matrix), never by editing repo files.

### Rules (`ui/rules/`, L72-16)

- **Components:** `RulesStrip` (a chrome button that opens the sheet) and `RulesSheet` (`open`,
  `rules`, `onClose`; a read-only `Sheet`), with `rules-summary.ts` (`rulesKitFaces`,
  `formatTurnTimeSeconds`, `rulesSummaryText`). The strip owns its own `open` state; a caller that
  has no strip (the L74 menu, the L77 Game over recall) mounts `RulesSheet` directly.
- **The strip says what it is:** a header row with the visible "Table rules" and a decorative
  `chevron-right` (the tap cue). The button's `aria-label` is the same `TABLE_RULES_LABEL`, so the
  name is what is on screen (WCAG 2.5.3). Prefer `aria-label` to an `aria-labelledby` on the
  visible span: they give the same name, but the Browser pane's `read_page` and `find` read only
  `aria-label` and content, so the post-lot gate would see an unnamed button.
- **The strip is described:** `aria-describedby` points at a hidden sibling `<span>` with
  `rulesSummaryText(rules)` ("45s, Random, Excluded Kamikaze, Ghost, Gambler"), built from the
  strip's own words only. Keep it a sibling of the button: inside, `within(strip)` text queries
  would match it twice (`getByText('300s')` for the default rules).
- **Face grid:** every face cell has the same fixed width (`w-12`, wide enough for the 11px
  "Excluded" caption), in a 4 column grid that becomes 8 columns by a container query
  (`@container` on a wrapper, `@min-[26rem]:grid-cols-8`), so 16 kits fill whole rows and the
  columns align for any mix. Do not size the cells by content again: a captioned cell is wider
  than a bare one and the rows jag.
- **Who supplies `rules`:** the L76 lobby (`LobbyStateView.lobbyRules`), the L74 table recall
  and `FinishedStateView.lobbyRules` in L77 (spec v7 §6.11). The data comes from
  `view-model/rules-recall.ts` (L73-12): `rulesRecall(view)` for a lobby or finished view, and
  `tableRulesRecall(cache, view)` on the table. The cache is the last `lobbyRules` seen in this
  room, kept in memory: call `nextRulesCache(cache, view)` on every view change (a new room
  code drops it). `cachedLobbyRules(cache, view)` is the same rules as `turnClock`'s length
  source. A `RulesRecall` is a `LobbyRules`, so it passes as `rules`. A `null` recall means
  the rules are unknown (a reload mid-game) or the room is a tutorial: the caller hides the
  strip, and the tutorial never mounts it. The component invents no default.
- **Seconds are shown as received:** the server-effective `turnTimeSeconds` follows
  `TURN_DURATION_MS` until the host sets a time, so it can exceed the host maximum of 180.
  Never clamp it and never read `DEFAULT_TURN_TIME_SECONDS` here.
- **Excluded is a word:** an excluded kit carries `EXCLUDED_LABEL` at full opacity. Dim or grey
  the portrait only (`opacity-40 grayscale` on the portrait wrapper), never the name or the label.
- **L76 adds the host editor here:** the slider sends on release, All / None / Random and the
  16 kit toggles, in this folder, reusing `rulesKitFaces`. `screens/lobby-rules-panel.tsx` stays
  until L76.
- **Nesting:** the strip's portraits are the non-clickable `KitPortrait` inside one `<button>`;
  they are `aria-hidden` in the sheet, where the visible name names the kit.
- **Tests:** `rules-strip.test.tsx` and `rules-sheet.test.tsx` repeat the small `rules()` and
  `kitFace()` helpers instead of sharing a file. They assert the literal strings.
- **Gallery:** section `rules` (`ui/rules/rules.gallery.tsx`, DEV only): default, Random only
  with three kits excluded, a 300 s server default and one allowed kit.

### Coach panel (`ui/coach/`, L72-17)

- **`ui/coach/coach-panel.tsx`** provides `CoachPanel` and `CoachBody` (L72-17), with the props of
  `design/components/coach-panel.tsx` (`title`, `body`, `zone`, `onHide`, `hideAriaLabel`,
  `footer?`, `extraAttrs?`, `compact?`). It is the L75 drop-in for `screens/table/tutorial-coach.tsx`
  and `help/hint-overlay.tsx`, which keep the V6 panel, its `.tutorial-coach-panel` CSS and
  their source-text tests (`tutorial-callout.test.ts`, `hint-overlay.test.ts`) until then. It is
  not a dialog (no `role`, no `aria-modal`, no focus move, no key handling, so Esc stays with the
  sheet stack) and has no Skip: Skip stays on the table flag (Lot 45), and the hint host passes
  "Got it" and "Skip all" as `footer`. The caller passes the hide label (`HIDE_COACH_ARIA_LABEL`).
  The body goes through `parseCoachBody` into `CostAmount` (numbered amounts) and `Icon` (a
  decorative `RESOURCE_ICON` after a bare word; `parseCoachBody` reads only "lives" and "life" as
  the life resource, so the verb "live" stays prose). `compact` has a 72% `--panel` floor, which
  keeps `--text` at 5.7:1 or better over a white card face (V6's 46% was 2.6:1), and a
  `min(36vh, 15rem)` cap. Copy comes only from
  the shared tutorial and hint copy (`tutorialStepAt`, `HINT_COPY`); the panel invents none.
  Details: `/DESIGN.md` › Coach panel.
- **Anchors:** the root keeps `data-zone` and the caller's `extraAttrs`, then `data-motion`
  (which `extraAttrs` cannot override), `aria-labelledby` (the `<h2>`). Each resource glyph is
  `span[data-coach-resource]`, never the preserved `data-resource-kind`, so the FX and flyout
  selectors cannot match prose. A host remounts the panel with a `key` when the message changes,
  which replays the entrance.
- **Scroll region:** the body is a labelled `ScrollArea` (named by the title, keyboard-scrollable)
  only while its copy overflows, like a Sheet body. `CoachPanel` re-checks `scrollHeight >
  clientHeight` in a layout effect and on a `ResizeObserver` over the body and its content, and
  passes `label` only then, so a panel that fits has no Tab stop and no second landmark. Its
  focus ring is inside the edge: `<ScrollArea focusRing="inset">` (default `'outer'`) selects
  `CHROME_FOCUS_INSET_CLASS`, because the rounded `overflow-hidden` root would clip an outer
  ring. Never add a `focus-visible:-outline-offset-*` literal next to `CHROME_FOCUS_CLASS`:
  Tailwind emits the negative offset first, so the outer one wins.
- **Landscape-compact footer:** `CoachPanel` reads `useViewportMode()`. In `landscape-compact`
  a given `footer` renders inside the header row, between the title and the close control, and
  there is no footer row; elsewhere it stays below the body. A host passes the same `footer` in
  every mode and sizes the card itself: L75 should use `min(15.5rem, 100vw - 1rem)` for hints in
  portrait and desktop and `min(22rem, 100vw - 1rem)` in landscape-compact (the measured fit).
  Tests mock `useViewportMode` the way `carousel.test.tsx` does.
- **Reduced motion:** the panel renders at rest (`initial={false}`, no transform, no fade),
  V6's `animation: none`. `motionPropsFor(COACH_ENTER, reduced)` gives motion's props; the
  entrance is spread only when full.
- **Tests:** `coach-panel.test.tsx` holds the L72-17 acceptance tests (literal coach bodies, so
  L75-01's copy fixes cannot break them); `coach-panel.contract.test.tsx` the keyboard path,
  Escape, the caps, the footer placement, the overflow region and the attributes a caller cannot
  override; `coach.gallery.test.tsx` that each gallery entry still reaches its own script step
  (an L75-01 copy edit must update it).
- **Fit:** with the cap and the header footer above, all ten hints fit with Got it and Skip all
  at 375×812, 375×667 and 844×390, and the eleven tour steps fit at 844×390. Only the script
  steps 17 and 19 (no footer, default cap) scroll at 844×390, by 18px (`/DESIGN.md` › Coach
  panel › Fit).
- **Gallery:** section `coach` (`ui/coach/coach.gallery.tsx`, DEV only): the Tax tutorial coach
  with Got it, the Thief follow-up coach with a `+4 points` glyph and no footer, and the compact
  Draw hint with Got it and Skip all.

### Banners (`ui/banner/`, L72-18)

- **`ui/banner/table-banner-host.tsx`** provides `TableBannerHost`, with the props of
  `TableBannerFlash`. It hosts the L51-06 cues, the L63-03 Sentence lines and the L67-01 own
  wipe line; the cue logic stays in `view-model/table-banner.ts` (`nextTableBannerCues`,
  `nextSentenceBannerLines`, `nextWipeBannerLines`), and `ui/banner/banner-items.ts` only keys
  the items (`bannerItemsForCues`) and sorts them into lanes (`bannerLaneOf`,
  `BANNER_LANE_LIVE_MODE`). The classic table keeps `screens/table/your-turn-flash.tsx` until L75.
  The host portals to `document.body` at `Z_INDEX.banner`, like Sheet and Toast, so a
  transformed arena or the L78 board shake cannot re-anchor it or trap it under the sheets.
  L74-17 mounts it once per arena so its regions exist before the first cue.
- **Slab:** flat outlined chrome (`CHROME_OUTLINE_CLASS` plus `rounded-v7-chrome`), never
  `CHROME_SHAPE_CLASS`: the hard drop shadow would make a click-through banner read as a CTA or
  danger button. L78-11 owns the band look.
- **Enqueue synchronously** inside the effect that calls the `next*` helper: a deferred enqueue
  (a 0 ms timeout) is cleared by React Strict Mode's effect replay, which dropped the first-paint
  You won! / You are dead cues. A `<StrictMode>` test in `table-banner-host.test.tsx` locks it.
  The watch refs stop the replayed effect from enqueueing twice.
- **Timing:** each lane (cue, Sentence, wipe) times its head by item key, so a banner queued
  behind it never extends it; `TableBannerFlash` restarted the timer on every enqueue. No exit
  animation: the next item mounts exactly at `TABLE_BANNER_MS`. `end.tsx` still opens Game over
  after that same constant.
- **Live regions:** one `role="status"` region per lane, always mounted and empty between
  banners; only the slab inside swaps, keyed by item. Each region takes its lane's mode from
  `BANNER_LANE_LIVE_MODE`, the one map `bannerLiveMode(kind)` also reads: polite for cues,
  assertive for Sentence and wipe. Do not mount a region together with its text: many screen
  readers skip it.
- **Tests:** `banner-items.test.ts` (node: keys, copy, live modes, `--text-on-cta` contrast on
  every fill), `table-banner-host.test.tsx` (happy-dom, fake timers: queue order and timing,
  first-mount seeds, no history replay, Sentence and wipe regions, every kind's live mode,
  tones, flat slabs, the body portal, reduced motion, persistent regions, StrictMode first paint
  for won, dead and turn) and `banner.gallery.test.tsx`. Every rerender in a test passes fresh
  arrays, so the enqueue effects re-run as they do with live views. The banners portal out of
  `view.container`: query `view.baseElement` or `screen`.
- **Gallery:** section `banner` (`ui/banner/banner.gallery.tsx`), one `BannerDemo` per kind
  with a DEV-only Play button; repeated presses queue several attacks, Sentence lines or wipes.

### Seat identity (`ui/seat/`, L72-19)

- **Components:** `PlayerName`, `BotSeatLabel`, `ConnectionBadge` with unchanged props and copy
  (`connectionBadgeLabel` in `connection-badge-label.ts`); V2 versions stay until L74 / L76 / L77
  switch imports; new code imports only `ui/seat/`.
- **Copy has one home:** `connectionBadgeLabel(player)` (pure `.ts`, V2's private `badgeLabel`
  moved verbatim, L10-04) returns the badge text or `null`. Its 3 and 5 thresholds mirror the
  server's `ABSENT_AUTO_TURN_LIMIT` and `CONNECTED_TIMEOUT_LIMIT`; they are cited, never imported
  (server-only). `PublicPlayerView` is assignable to `ConnectionBadgePlayer` (`expectTypeOf` in
  the test).
- **No role, no `aria-label`:** the visible text is the spoken text (`'Bot·Easy'`,
  `'absent 2/3'`), as in V2; the 12px icons are decorative. `BotSeatLabel` has no whitespace text
  nodes between its children.
- **Seat hues go on panel surfaces:** a `PlayerName` stands on `--panel` or `--panel-2`, never
  straight on `.v7-ground` (at a halo center `--seat-1`, `--seat-4` and `--seat-7` fall to
  3.44:1 to 4.57:1; DESIGN.md › Seat hues). The hue is on the nickname span only and never shares
  an element with `--life` or a `--threat-*` color.
- **Long names:** nicknames are at most 24 characters (server rule, parity `home-nickname`), up
  to 320px wide in 14px Lilita One. The component never clips. Pass `className="truncate"` in a
  flex row with `min-w-0` (the badge gets `shrink-0`), or `wrap-anywhere` to wrap. Not
  `break-words`: it does not shrink min-content, so an unbroken name widens a fit-content box
  (24 capital Ws pushed one to 320px at a 320px viewport; a 96px box overflows even a 156px name).
- **Tone tests:** happy-dom cannot compute colors, so the tones are pinned by class: eliminated
  badge `bg-v7-bg-0`, degraded badge `bg-v7-panel-2`, bot chip `bg-v7-panel`. The two chips repeat
  one `CHIP_CLASS` string, each with a comment pointing at the other.
- **Tests:** `connection-badge-label.test.ts` (node), `connection-badge.test.tsx`,
  `bot-seat-label.test.tsx`, `player-name.test.tsx` and `seat.gallery.test.tsx` (happy-dom). Each
  file repeats its small helpers (`fakeSeat`, `glyphOf`, `rootOf`) rather than sharing a fixture
  module. `glyphOf` compares an icon's inner markup, so a test can tell which glyph a badge drew
  without reading its paint. The gallery test also fails on a sample nickname over 24 characters.
- **Gallery:** section `seat` (`ui/seat/seat.gallery.tsx`, DEV only): every sample on both
  `--panel` and `--panel-2`, with the 24-character long-name forms in a 240px frame.

### Admin tool mode (/admin, Lot 80)

Technical spec v7 §7.8; looks and values in `/DESIGN.md` › Tool mode. Client only: the admin API,
its payloads and `PROTOCOL_VERSION` do not change.

- **Scope:** `AdminApp`'s `<main data-mode="tool">` (`relative`, flat `bg-v7-bg-0`, no
  `.v7-ground`). The `[data-mode="tool"]` block in `ui/tokens.css` sets `--ink` to
  `V7_TOOL_LINE` (`ui/palette.ts`), a 1px outline, 8 / 6px radii, no chrome shadow and no press
  translate, so every V7 primitive inside it goes flat without a `mode` prop. Sheets portal out
  of the scope: an admin Dialog passes `dataAttributes={{ 'data-mode': 'tool' }}`.
- **Routing:** `admin/admin-routes.ts` is pure and tested in node. `adminRoute(pathname)`
  returns `{ page, gameId, table }`, and any unclaimed path falls back to Overview. `gameId` is
  `finished_games.id`, so a Play again row is a new match. `normalizeAdminPath` strips one
  trailing `/`. `ADMIN_SECTIONS` holds the five sections in order. `adminSectionHref` marks a
  section by exact path or, except Overview, by a `/` prefix, so `/admin/dashboard` marks none.
- **Shared pieces, one each** (`screens/admin/admin-ui.tsx`, classes in `admin-classes.ts`):
  - `AdminStatus` renders every loading, empty and error line.
  - `AdminDataTable` renders every admin table. Its `label` is required and names the
    horizontal `ScrollArea`. With `onRowOpen` and `rowOpenLabel` (typed as a pair) the first
    column's cell holds a real `<button aria-label={rowOpenLabel(row)}>`, so Tab, Enter and
    Space work natively; the `<tr>` also takes the mouse click (`cursor-pointer`) and the
    button stops its own click so a press opens once. Matches is the only user (L80-06).
  - `AdminPager` (`admin/admin-paging.ts` holds `adminPageCount(total, pageSize)`, never below
    1) renders every paged table's footer: `<nav aria-label="Pages">` with quiet **Previous**,
    an `aria-live="polite"` `Page N of M` and **Next**. Previous is off on page 1, Next on the
    last page, and `disabled` turns both off while a page loads. Zero rows read `Page 1 of 1`.
    Off is `aria-disabled` (`focusableWhenDisabled`), never native `disabled`, so Next pressed by
    keyboard keeps focus while the next page loads and at the last page (Disabled but focusable).
  - `useAdminList({ key, scope?, load })` (`screens/admin/use-admin-list.ts`) holds the state of
    every admin read (Overview, Matches, Kits, Database): `data`, `loaded`, `error`
    (`adminErrorCopy`) and `lastData`. A new `key` starts a new request with its own id and reads
    not loaded until that request's answer; an answer for an older request is dropped, and asking
    for an earlier key again (Actors both, humans, both) is a new request too, so the older
    answer or error for that key never stands in for it (L80-12). `load` is read through
    `useEffectEvent` when the key changes, so every input that can change while the page is
    mounted belongs in the key (the password never changes under a mounted page). `lastData`
    is the last success for the current `scope` (Matches: the applied filters; Database: the
    table; Overview: one constant scope, so its modules never blank), and
    `adminPagerCount(page, data, lastData)` (`admin/admin-paging.ts`) turns it into the pager's
    count while the next page loads.
  - `AdminLinkBar` renders the nav (`label="Admin sections"`) and the Database tabs. They are
    `<a href>` links with `aria-current="page"`, not ARIA tabs, because they change the URL. A
    plain primary click calls `pushState` and dispatches `popstate`. A click with Alt, Ctrl,
    Meta or Shift stays the browser's. The route change remounts the page, so `AdminApp` reads
    the `href` of a focused link inside the page (a Database tab) on `popstate` and focuses its
    twin once the new page has mounted (L80-12; WCAG 2.4.3). The nav is outside the keyed page
    and keeps focus by itself.
  - `AdminToggleChip` renders every Feedback filter (L80-09): a flat chip with `aria-pressed`,
    pressed `bg-v7-cta-2 text-v7-text-on-cta`, idle `bg-v7-panel-2 text-v7-text`. With `icon` and
    `labelHidden` it is icon-only and takes `aria-label` and `title` from `label`; a text chip
    adds neither. It has no `disabled`, so the Feedback marks are their own buttons.
  - The class strings are `ADMIN_PANEL_CLASS`, `ADMIN_SECTION_TITLE_CLASS`,
    `ADMIN_FIELD_LABEL_CLASS`, `ADMIN_FIELD_CLASS` (every input and select: 16px, 44px, panel-2
    fill, flat outline, focus ring), `ADMIN_BODY_TEXT_CLASS` (14px Nunito; the caller adds the
    color), `ADMIN_CAPTION_CLASS` (the field-label step, uppercase, for table headers and
    metric labels) and `ADMIN_NOTE_CLASS` (12px Nunito in `--text-2` for notes, captions and
    hints: the filter note, metric hints, chart values and figcaptions, Overview module notes,
    Feedback dates). No page keeps a private copy.
  - `AdminStatus` errors are a 1px `--danger` outlined `--panel` box with the `eliminated`
    cross and `--text` words. There is no one-sided border stripe: the Impeccable `side-tab`
    rule flags it (spec v7 §12.4).
- **Gate:** `TextField` (password, `current-password`, 16px) and a primary `Button`. Unlock is
  `focusableWhenDisabled`: while blank or Checking… it is `aria-disabled`, so a click that starts
  the check keeps focus on it.
- **Sign out and the session counter (L80-02):** a quiet `Button` **Sign out** sits in the
  header row (right of the h1 from `md`, under the blurb on phones) while unlocked and calls
  `lockAdminSession()`, the same path as a 401, so the gate comes back empty with the key
  cleared. `admin/fetch-admin.ts` keeps a module counter (`currentAdminSession()`) that every
  lock bumps. A request captures it before it starts. `lockAdminSession(session)` is a no-op
  when that session is stale, and `adminGet` stores the password on success only while its
  session is still current. So a request that started before a lock can neither store the old
  password again nor lock the session unlocked since. The gate probe and every page go through
  `adminGet`; Feedback's `fetchInbox` and `updateInboxStatus` capture the session themselves.
- **429 copy:** `adminErrorCopy(429)` is `ADMIN_RATE_LIMIT_COPY` ('Too many wrong passwords. Try
  again in a few minutes.'), shown by the gate and by every page, Feedback included. A 429 never
  locks the session and never clears the stored key; only a 401 does.
- **Charts (L80-04):** `admin-charts.tsx` stays CSS and SVG. Series colors are `ADMIN_CHART_COLORS`
  (eight hex from `V7_COLORS`, `admin/admin-chart-math.ts`) and the empty ring is
  `ADMIN_CHART_EMPTY_COLOR` (`--panel-2`), never `var()`. Order and rationale: `DESIGN.md` ›
  Tool mode › Charts. `admin-charts.test.tsx` pins the render; `admin-charts-dependencies.test.ts`
  checks that `apps/client/package.json` holds no chart library.
- **Tests:** happy-dom component tests use the test-only `screens/admin/admin-test-harness.ts`
  and `admin-fixtures.ts`. Shipped code never imports either.
  - `installFakeFetch()` stubs the global `fetch` that `adminGet` and `fetchInbox` read at call
    time. Each call stays pending until the test calls `respond(status, body)` or `fail()`,
    which run inside `act` and drain the page's `.then` chain. Header names are lower-cased:
    happy-dom's `Headers` keeps the caller's casing.
  - `setAdminPath(path)` sets the URL before mount. Importing the harness restores `fetch`,
    clears `sessionStorage` and resets the URL after each test.
  - `makeAdminOverview()` is the empty-log payload. `makeGameListItem(id)` (room code is the id
    upper-cased, two humans, no bots, not a tutorial), `makeGamesPage(items)` (page 1, size 50,
    `total` the item count) and `makeGameDetail()` (`fg-1` / `ABCDEF`, Classic, two seats, no
    eliminations, no log) cover Matches. `makeInboxRow(id)` (Pending bug, screen `home`, protocol
    45, every optional field null, no topics, no log tail) covers Feedback.
    `makeTablePage(table, rows)` (columns from the first row's keys, page 1, size 50, `total` the
    row count) covers Database. Later tasks add builders and never change a default.
- **Behavior kept from L61-06 / Lot 62:**
  - `App` branches `/admin` before game phases (no Colyseus). The shell reuses
    `sessionStorage['card-battle.v6.inboxPassword']` and sends `X-Inbox-Password` to
    `GET /api/admin/*`.
  - Nav: Overview, Matches, Kits, Feedback, Database. Default filters exclude tutorial rows.
  - Filters (`AdminFiltersForm`, shared by Overview, Matches and Kits; L80-03): From, To,
    Opponents, Seat count, Kit and the tutorial toggle, then a primary Apply. Edits send nothing
    until Apply. Apply always starts a new request, even with unchanged filters: each page
    counts Apply presses (`applyCount`) in its request key, so Apply is the retry after an error
    (Overview has no other control before a first load). Seat count is a select over `ADMIN_OCCUPANCY_KEYS` (2–8) sent as `occupancy`,
    so it can never send a value the server ignores; its 'Any seat count' option
    (`ANY_SEAT_COUNT_LABEL`, `admin-filters-copy.ts`) sends none.
  - Overview is nine stacked modules (General, Volume, Gameplay, Economy, Combat, Hidden tools,
    Bots and seats, Endings, Retention and feedback) from one `GET /api/admin/overview`
    payload (L80-05). Each module is an `ADMIN_PANEL_CLASS` section: an `h3`
    (`ADMIN_SECTION_TITLE_CLASS`), a `--text-2` description and `h4` subheadings. The Actors and
    Kit wins **Show** selects use `ADMIN_FIELD_CLASS` (16px) under an `ADMIN_FIELD_LABEL_CLASS`
    label. That class is `w-full` and Tailwind emits `w-full` after `w-auto`, so a header
    select stays narrow through a `w-fit` label, never a `w-auto` on the select. The five Actors
    selects share one state; Show stays local to the module.
  - Match mix (`bots`) filters games. **Actors** (`humans` / `bots` / `both`, default both)
    lives on actor-level module headers and filters seats and action joins; mixed tables still
    contribute the selected seats. Seat win share applies Actors to both wins and games at that
    seat. Feedback reports-per-game uses the date window on both sides (not occupancy, kit or
    match mix).
  - Charts are CSS/SVG (bar, pie, scatter, buckets); no chart npm package.
  - Do not flash "no data" before the first fetch: `Loading…` is the `AdminStatus` loading line
    (`role="status"`) while a request is in flight, alone before the first answer and above
    the last loaded modules during a refetch (an Actors change, Apply), which stay on screen
    (L80 final fix wave; until then a refetch showed no pending state). A failure is the
    `AdminStatus` error line (`role="alert"`) above the modules and never blanks a loaded
    overview; it is gone as soon as the next request starts. **Download Excel** is a quiet
    `Button` that exports the loaded overview JSON.
  - The games list is keyed by `finished_games.id`; detail is `GET /api/admin/games/:id` (Play
    again reuses `room_id`). Closing `/admin/games/:id` returns to `/admin/games`.
  - **Match detail (L80-07):** `AdminGameDetailDialog({ detail, onClose })`
    (`screens/admin/admin-game-detail-dialog.tsx`) is the V7 `Dialog` (`width="2xl"`,
    `dataAttributes={{ 'data-mode': 'tool' }}`), open while `detail` is not null. Its title is
    `Match {roomId}`. The facts are a `dl` (`grid-cols-2 sm:grid-cols-3`): **Started**,
    **Ended**, **Mode** (`gameModeLabel`: `Classic`, an unknown mode raw), **Length**, **Turns**,
    **Winner** (`Unknown` when null) and **Notes** (`gameNotesLabel`, the list's `Bots ·
    Tutorial` or `—`, so no new flag wording). **Seats** is an `AdminDataTable` (Player, Kit,
    Lives, **Points**, Role; a missing nickname is `—`; Role is Winner > Bot > Eliminated >
    Player). **Elimination order** (only when there is one) lists `{victim} — {reason}`, plus
    ` · by {nick}` when `eliminatorNickname` resolves the eliminator to a seat; an absence, a
    leave or an unknown id adds nothing. The replay seed line closes the body. There are no
    rules text and no chat in the detail (spec v7 §13 Q80, §14.1).
  - **Detail states:** the page keeps one `detailAnswer` tagged with its match id and derives
    everything from it and `activeDetail`: `Loading…` (`AdminStatus`) while the active match
    has no answer, an `AdminStatus` error (`adminErrorCopy`, 404 `Not found`, 503 `Database
    unavailable`) with the dialog closed when it failed, the dialog when it succeeded. An
    answer for a match that is no longer active shows nothing, so an older response arriving
    after a newer one is ignored. Opening a match counts (`detailOpenings`) so picking the same
    row again after a failure asks again. **Download action log** shows only when the payload
    has `exportLog`; it is a quiet `Button` that reads `Downloading…` while the workbook builds
    (`aria-disabled`, so focus stays), builds once per click, and a failure shows `Could not
    build the action log.` as an `AdminStatus` error in the body and re-enables the button.
  - **Matches paging (L80-06):** the list is `AdminDataTable` (`label="Matches"`, **Room code**
    first) over `AdminPager`. `pageNumber` starts at 1 and the fetch key is
    `JSON.stringify({ applied, page, applyCount })`; each request sends the filter query plus
    `page` and no `pageSize` (the server default 50 applies; there is no size picker). **Apply**
    sets the filters, goes back to page 1 and always asks again; the Apply count is in the
    request key, not in the pager's scope (the applied filters), so a retry with unchanged
    filters keeps the page count it knew. While the page for the key is not loaded the table is
    replaced by `Loading…` and the pager is off; on an error the rows are gone and the alert
    shows. The pager label keeps the last page count the server gave for the same filters
    (never below the page itself), so its `aria-live` text reads `Page 2 of 3` while page 2
    loads, not `Page 2 of 2`; new filters forget it and read `Page 1 of 1` until their first
    page loads. **Showing X of Y** stays. Each row's Room code cell is a button named
    `Open match {roomId}` that opens `/admin/games/{finished_games.id}`, never the room code;
    the V7 Dialog (its `useFocusTrap` restores focus to a reachable opener) hands focus back to
    it on close.
  - **Kits states (L80-08):** `AdminKitsPage` follows the same pattern as Matches without a
    pager. While the stats for the applied filters are not loaded it shows `Loading…`
    (`AdminStatus`, `role="status"`) and no table, no `Based on N matches` line and no empty
    copy; a failure is the `AdminStatus` error alert with the previous table gone, never the
    empty copy; a stale response (success or error) is ignored. `Based on N matches` and
    `No kit data for these filters.` show only for a loaded answer. **Download spreadsheet** is a
    quiet `Button`, off until a non-empty answer loads, and hands the loaded rows (raw `kitId`s)
    to `exportKitStatsXlsx`. The table (`label="Kit stats"`) shows kit display names. **Apply**
    always asks again, unchanged filters included, so it retries after an error with no filter
    edit, as on Overview and Matches.
  - **Database states (L80-10):** `AdminDataPage` is route-driven: the table is `AdminApp`'s
    `route.table` (`null` reads `finished_games`), with no picked-table state of its own. The
    tabs are an `AdminLinkBar` (`label="Database tables"`) over the five tables
    (`/admin/data/{name}`, labelled by `tableDisplayName`; `game_chat_messages` is the fifth,
    **Chat messages**, L80-11, with its Role column and the server's row order); the link whose
    href is the active table is `aria-current`, so an unknown table (`/admin/data/nope`) marks
    none and the server's 404 shows `Not found` as an `AdminStatus` error. A request sends `page` and
    `pageSize=50` and is keyed `{table}:{page}`; Next and Previous go through `AdminPager`. The
    page keeps no table-keyed state: `AdminApp` remounts it on every route change (`key` on the
    route), so a tab change, and a return to an earlier tab, starts at page 1 with no page count
    and the old table's late answers land in an unmounted page. While the page for the key
    loads it shows `Loading…`, no grid and the pager off;
    the pager label keeps the last page count the server gave for this table (never below the
    page itself), so it reads `Page 2 of 3` while page 2 loads and `Page 1 of 1` on a new
    table. A failure is the alert with the rows gone, and a stale answer, success or error, is
    ignored. The grid is an `AdminDataTable` named by the table's display name: Title Case
    headers from `columnDisplayName`, cells cut at `max-w-[16rem] truncate`, null as `—`, an
    object as JSON and a `_truncated` preview as `Preview only (N bytes)`. Zero rows show `No
    rows in this table.` and read `Page 1 of 1`. The `{N} rows · page {N}` line stays.
    **Download spreadsheet (this page)** is a quiet `Button`, off until a page loads, that hands
    the loaded page to `exportTablePageXlsx`. Still read-only: there is no SQL box. **Known
    issue:** the server orders `game_chat_messages` by `game_id` only, so Chat messages pages can
    repeat or skip a line; the fix is server side (`game_id DESC, order_index ASC` in
    `tableOrderBy`, `db.md`, `decisions.md` 2026-10-28).
  - Matches, Kits and Database list fetches ignore stale responses and clear the previous page
    on switch or error.
  - A 401 clears the session and re-opens the password gate (Sign out takes the same path,
    L80-02). `adminGet` catches network and JSON failures (status 0 → Could not load).
  - From/To `datetime-local` values are converted to UTC ISO on the client, so the VPS does not
    shift the window.
  - Client `exceljs` exports for the overview, games list, kit stats and table browser page. The
    Matches export is a quiet `Button` labelled **Download spreadsheet (this page)**: it writes
    the loaded page's rows, not the whole result set, and is off until a page loads.
  - `/inbox` redirects to `/admin/feedback`. No Admin link on the hub.
  - The **Feedback tab** still uses `GET /api/inbox` (L47-05 / L47-06). It is `AdminPageIntro`
    plus `AdminStatus` (Loading… until the first answer, one alert for a load or save error,
    `No reports match these filters.` when the filters match nothing). A save that fails from
    a mark in the open report shows its alert inside the report dialog, since the page behind
    the `aria-modal` sheet is dimmed and not announced; a row mark's failure, or one from a
    report closed since, shows on the page. Kind, Status and Area are
    three `role="group"` rows of `AdminToggleChip` and filter client-side (default Pending).
    Each row starts with a round **status badge** (`role="img"`, named by
    `FEEDBACK_TRIAGE_STATUS_LABEL`) in the status tone, holding the clock / check / cross
    `StatusGlyph` in `--text-on-cta`: Pending `--threat-other`, Done `--upgrade`, Eliminated
    (won't do) `--danger`. There is no `border-l-4` stripe: the Impeccable `side-tab` rule flags
    it (spec v7 §12.4). Three icon marks per row `PATCH` `/api/inbox/:id` to `pending` / `done` /
    `eliminated` without opening the report; every mark on the page is off while a save runs
    (`aria-disabled`, never native `disabled`, the press swallowed, so a mark pressed by keyboard
    keeps focus in the row or in the report), the pressed mark takes the status fill, and a
    failed save leaves the row as it was.
    The row's dates go through `formatDateTime`. The report is a V7 `Dialog` in tool mode
    (`width="lg"`, `data-mode="tool"`) with the same marks, contact, nickname, game code,
    screen, playKind, protocol, user agent and the log tail JSON in a `ScrollArea` named
    `Log tail`. A null log tail reads `Log tail: —` like the other null fields, with no empty
    region (L80-12). The legacy `screens/inbox.tsx` is gone (L80-09).

## Design system (V2 · Lots 10+)

Tokens and shared components live under `apps/client/src/`. Intents, payloads, and visibility
rules above are unchanged — this section only covers how the client looks.

- **Stack:** Tailwind CSS v4 (`@tailwindcss/vite`) + Motion (`motion/react`). Entry CSS:
  `apps/client/src/index.css` (`@import "tailwindcss"` + `@theme` tokens). Font: Outfit via
  `@fontsource/outfit` (not Inter).
- **Tokens:** palette and type scale derived from the V1 asset subset (card faces, kit pastels,
  verso/opponent slate, resource icons, button PNG *hues*). Colored `*_button.png` files are
  **not** used as UI skins — CTAs are CSS components inspired by those hues (Lot 10 ruling).
- **Components:** `apps/client/src/design/components/` — `Button`, `Card`, `ResourceIcon`,
  `ConnectionBadge`, `KitPortrait`, `Dialog` (L11-03), `Tooltip` (L12-08), `PlayerName` /
  `CostDisplay` (Lot 39), `IconButton` (L43-05, 44px, no `min-w-[7rem]`), `SeatTile` /
  `CardChoiceTile` / `choiceTileClassName` (L44-01; shop buy cells use the helper). Art resolution:
  `apps/client/src/ui/asset-lookup.ts`, with the filename maps in
  `apps/client/src/ui/asset-files.ts` (never invent a mapping; never invent filenames —
  `wizard` → `Magician.png` is declared). Copy kit PNGs from repo `images/` into
  `apps/client/src/assets/kits/` in the same task that adds the `KIT_FILES` entry.
  (V7 rebuilds: `ui/seat/`, L72-19)
- **Data-only kit registration (Lot 27):** append to `KIT_IDS`, add `KIT_CATALOG` row
  (tech v4 §8.2 verbatim), add `KIT_FILES` + PNG (`ui/asset-files.ts`), then rerun
  `scripts/extract-art.ts` for `assets/art/kits/<kitId>.png`, mid-game `alwaysUpgraded` test.
  No engine change — `acquire-card.ts` already applies the trait. `content-scope.test.ts` locks
  `KIT_IDS.length === 16` with exhaustive catalog keys; client `KIT_FILES` is asserted in
  `asset-lookup.test.ts`. Inspect dialog already renders `alwaysUpgraded` / `specialCards`;
  only duplicate specials need a `${cardId}:${index}` React key (L27-05). New `KitTraits`
  fields need a dialog section + `KIT_TRAIT_SECTION_KEYS` entry (L30-05).
- **Dialog:** controlled `open` / `onClose`; `role="dialog"` + `aria-modal` + labelled title;
  focus trap; Esc and overlay dismiss; action slot uses shared `Button` variants (`compact` on
  phone dialogs). Overlay is sized to `visualViewport` (not `100dvh` / `fixed inset-0`,
  which can be the desktop window in DevTools device mode) and `items-start`; panel is
  `my-auto` / `max-h-full` of that overlay (never `items-center` — that clips the title).
  `panelClassName` `max-w-*` becomes one `max-w-[min(<abs>,100%)]` token via
  `dialogPanelClassName` (L53-02 / L53-07). Prefer this
  for every modal prompt (Lobby copy feedback; Table card-first prompts). No
  extra npm dependency unless separately ruled. V2 only: V7 surfaces use `ui/primitives`
  `Sheet` / `Dialog` / `Toast` (L72-09), where Esc closes only the top sheet (Q49); see
  DESIGN.md.
- **Tooltip:** hover + focus; `role="tooltip"`; used for unavailable own cards (reason from
  view fields only).
- **Button variants:** `purple` (play), `yellow` (kept for other CTAs), `green` (confirm/Start/Create/Join
  / Draw when `drawValue ≤ 10` / Sell), `red` (Leave / return home / Draw when payout `> 10`), `orange` (Buy / Upgrade / Shop / Copy). Solid rounded CTAs from
  token hues — no `*_button.png` skins, no hex clip-path.
  Table Draw (L64-05) reads the recipient's own `drawGain` for Gambler else catalog Draw; Motion
  pulse on turn start / payout change (`MOTION_PULSE_S`); compact, no word label.
  Opponent Draw chips (L65-01) fly **one** point unless that seat is already Spyed
  (or it is your own Draw), so the count cannot identify a kit.
- **Home (L11-01 / L17-01 + hub rework / L51-03):** branded hub first — title,
  decorative V1 kit/card art. Two mode paths (not stacked forms): **Play online**
  (nickname + create / join) and **Play solo** (nickname + opponent count 1–7 + difficulty,
  defaults 1 + Normal). Nickname is collected **inside** each path, not on the hub.
  **Feedback** (L47-03 / L47-06 / L57-05): hub control next to How to play; same Dialog on Online / Solo /
  Tutorial path headers. POST `{server}/api/feedback` via `resolve-server-url()`; Home
  omits `gameCode` / `logTail`. **Manual** (Home, Lobby, table `!`, Game over **Feedback**):
  Kind plus multi-select **About** chips (`UI`, `Gameplay`,
  `Card`, `Shop`, `Bot`, `Tutorial`, `Other`). A bug needs at least one chip; confusion /
  idea may skip. Message placeholder follows kind. **Ask-mode** (Game over auto-prompt and
  finished hub leave, including Return home): the same ticket; title **Feedback**, lead
  **Skip is fine.**; Skip still leaves after a pending hub leave. POST uses the tester's
  kind/topics plus contact when filled. Send uses a sync in-flight gate so two
  clicks before paint cannot insert two rows. No Inbox link on the hub.
  **Admin:** see Admin tool mode (Lot 80).
  **How to play** (L42 / L51-02): spec §5.1 sections in order (goal, turns, lives,
  points, cards, upgrade, kits, specials, shop — no delayed-resolution section);
  Skip + Got it both close; screenshot `<img>` only when the PNG exists under
  `src/assets/how-to-play/` (`import.meta.glob`, missing files omit the image).
  Copy is the §5.1 first-time floor; resource icons sit next to Lives / Points /
  Upgrade / Shield. **Soft gate** on the first hub Play online / Play solo / Tutorial
  click (`localStorage['card-battle.v6.howToPlaySeen']`); Skip, Got it, Esc, and overlay
  all set the key and continue into that path. Manual open: Skip / Got it set the key;
  Esc / overlay only close.   **What’s new (L63-07, L65-05):** shared `RELEASE_NOTES`
  (`packages/shared/src/release-notes.ts`, newest first, each entry dated).
  Compact **New** is the shared `Button` `variant="green"` (`bg-cta-green-deep`,
  same as Play online) with a **red** unread tick when
  `localStorage['card-battle.v6.lastSeenReleaseId']` is not the latest id.
  The popup that opens by itself shows **only the latest entry**. The **New**
  button lists **every** entry, date by date, newest first. How to play is not
  a blocker. Closing / Got it writes the latest id. While that latest entry is
  not on `main`, later pull requests **append to the same id** so they show
  together in the auto popup. Merging `dev` → `main` ships that entry. The next
  player-facing change opens a **new** id, and the auto popup shows only that
  next update. Do not delete shipped entries. Do not edit an entry that is
  already on `main` except to correct that entry's own text. **New** heading
  lists `additions` (kit portrait or card art + body) for kits/cards that did
  not exist before; before → after `items` cover changes with named-card art
  and render **above** the New block. **Copy (designer 2026-09-29):** keep
  Before and After. Each side is one short sentence about the gameplay
  change the player will feel. Bug fixes: After is `Fixed some bugs.`
  Small mechanics stay out of the popup. Older shipped entries stay as
  written. Kit-level items may use `kitId` (Gambler
  portrait) instead of `cardId`. `lot-63` (2026-09-20) is on `main`: Sentence,
  Imposition, Super Absorber, plus Gambler and Roulette (no `lot-64` id — those
  tweaks edited `lot-63` before it shipped). `lot-65` (2026-09-28) is on
  `main`: private Draw, invisible players are not targets, Sentence chip
  inspect, hand layout stays put, point chips cap at 50, your kit portrait
  is one step larger, and the action log shows icon-only resource nets
  (unspied card sales hide the payout; unspied shop buys hide the price; resolve lines show each seat’s gain or loss). `lot-68` (2026-09-29) shipped Ghost Tax+, Shield+ vs Imposition, and fixed some bugs. `lot-69` stays as written. `lot-71` (2026-10-06) shipped on `main`: Spy Thief chooses one opponent (the upgrade hits every living opponent), and forfeiting or leaving the table pays kill rewards at the same time to queued attackers unless one player is left. Active Poison does not. The host can hide kits, deal kits at random, and set human turns from 5 to 180 seconds; players chat in the lobby and at the table until the room closes, and eliminated players and spectators share a separate chat. A Ghost's points from lost lives show as +? until that Ghost is spied. `lot-72` (2026-10-07: active-slot drop cancel; no Poison tick during Block; the lobby host never passes to a bot) shipped on `main` (promote #79) before V7 Lot 72 merged. **V7 (technical spec v7 §10.4):** `lot-72-v7` (2026-10-26, "New look") is the open V7 entry; each V7 player-facing PR appends one Before / After item per screen area during the promotion freeze. New ids never reuse an existing id: seen-state (`ui/release-storage.ts`) is keyed by id. First item: the §10.5 catalog-text fix (After `Fixed some bugs.`). Second item: the classic tutorial's resources tip no longer shows a stray life icon (After `Fixed some bugs.`). Third item: the turn timer after a fifth-active picker cancel (server fix L82-01, After `Fixed some bugs.`). Sentence chips sit
  on the caster (remaining turns in red) and open catalog inspect (L65-03). Play / later caster ticks / fire flash
  the table-wide red banner. Player-visible work updates the open What’s new
  entry in the same commit. No accounts, no protocol fields. Idle hub is unlabeled (not “Not connected”). Top-right **Beta**
  card (word Beta only). No protocol footer, no Reset help control, no delayed-resolution
  pitch. **Tutorial** opens a nickname-only path
  (`create({ tutorial: true })` then `startGame`; no `addBot`, no kit picker). Table **How to play** is a compact **?** `IconButton` on the turn strip
  (L43-05; does not send an intent). Tutorial table (L45-05): hovering dismissible coach
  chat (copy from `tutorialStepAt` / `TUTORIAL_TOUR_STEPS` / `TUTORIAL_LOOK_COACH`; last human
  coach on bot turns). Client-only **board tour** at index 0 (Got it; no `tutorialIndex` bump)
  then Draw. After Spy resolves (end of index 8), a **Look** gate forces a portrait click
  before sell. Coach panel is slightly transparent. Auto-opens
  on new copy; compact **?** reopens it (not a Coach pill). Skip tutorial is **flag only**.
  Resource words in coach copy render as table icons.
  Pulsing orange callout + pointing arrow **outside** the highlight square on scripted
  controls (Draw, cards, Shop). Real pending chips (Incoming **and** Waiting on others)
  get the same callout chrome **without** an arrow: red when `threatToneFor` is attack,
  orange otherwise, until the chip leaves the queue. Presentation persistents are not
  ringed. Shop is **not**
  auto-opened; illegal clicks do not send (`tutorial-follow-coach`
  copy on the coach). Client idle 20s retitles the coach **Play** (not during tour or Look).
  **First-game hints (L46):** Classic live table only (`playKind !== 'tutorial'`). Same
  `CoachPanel` chrome as tutorial but **compact and more transparent**, `data-zone="first-game-hint"`, Got it / Skip all.
  Selector ranks one undismissed topic from view facts: reward (while POV is choosing) →
  **attack** Incoming → **Thief** Incoming → (on turn) your-turn → draw → hand → specials →
  shop → resources → hidden-kit. Spy stays on the Incoming strip without a hint card.
  Incoming-attack copy is spec §5.2 (equal cancels both; a weaker answer still hits them
  later — Lot 54). Do not invent `actionResolved` cancel-why copy if the wire has no
  discriminant (spec v6 §12 #7). Copy typos in `HINT_COPY` are locked.
  Auto-Got-it on Draw / Shop / play / portrait / hand or special inspect / attack- or
  thief-Incoming clear / confirm reward. × dismisses the same as Got it.
  Card sits next to `data-hint-anchor` (no rings); `incoming-thief` reuses Incoming.
  Hand / Specials anchors are the **card cluster** (`inline-flex`), not the flex-1 section;
  those two cards sit **beside** the cluster (top-aligned, left when it fits) so they are
  not dumped on the felt's left edge or over the other row. `leave` is not a hint id.
  Completing or skipping the tutorial does **not** set `skipAll`
  (L46-03). There is **no** hub Reset help control (L51-03); `resetHelpStorage` is
  tests-only. A stranger clears `localStorage['card-battle.v6.howToPlaySeen']` and
  `localStorage['card-battle.v6.hints']`. Solo composes `create` + N× `addBot` + `startGame`;
  `soloLaunchPending` skips Lobby flash. Difficulty copy via `formatBotDifficulty`
  (Easy / Normal / Hard).
- **Lobby (L11-02 / L17-02 / L17-03 / L49-02 / L57-11 / L57-09):** game code + Copy (clipboard); copy result via `Dialog`;
  **Your kit** (self portrait or Random) + Choose kit Dialog (allowed kit portraits + Random;
  click a tile for description then Select). `chooseKit` payload `{ kitId }` or `'random'`.
  **Table rules (Lot 70):** everyone sees a clock with the seconds and small kit
  faces (excluded kits gray). Random only adds the random-kit face and hides the
  kit picker. Only the host gets a settings icon. The popup puts a 5–180 second
  slider on top, then All / None / Random, then kit portraits. None keeps the
  first Classic kit. Play again keeps the rules. The tutorial path does not show
  them. Solo uses the same panel. An untouched slider does not send a time, so
  `TURN_DURATION_MS` still applies until the host moves it. Chat sits under the
  player list and stays when Play again opens the next gathering. The lines
  last until the room is gone.
  Other seats never show a kit. Walk-in spectators skip the kit picker (**Watching the lobby**).
  Each seat shows a colored check (ready) or cross (not ready) in a fixed column left of the
  nickname (`font-sans`). Host and bots are ready on the wire; human **guests** toggle with
  **Ready** (green + check) / **Cancel ready** (orange, `setReady`). Host has no Ready
  control. **Start** is grey until `>= 2` seats **and** every connected human guest is
  ready (`lobbyStartEnabled` — grey is not validation). Host **Kick** on every other
  seat (bots and humans) opens **Kick this player?** then `kickPlayer`. Kicked humans
  see **You were kicked** and may Join with the same code. Start / Leave; host-only Add
  bot / set difficulty while `players.length < MAX_PLAYERS` (2–8); **Feedback** next to
  Leave (L47-03); `BotSeatLabel` on every bot seat for all recipients. Tutorial and Home
  solo skip the lobby flash (`soloLaunchPending`), so Ready / Kick never appear there.
  Guest Ready is Classic online lobby only. **Join with code** (Home) sits a guest when
  the table is still lobby, or opens the claim picker for a reserved disconnected seat.
  Solo path on Home uses the same kit picker and sends `chooseKit` before `startGame`
  when the pick is not random.
- **Table bot seats (L17-03 / L17-05):** `BotSeatLabel` on opponent zones. `botReason` may
  still arrive on the wire; the action-log **Why** control is **hidden in every mode** (L45-05).
- **Walk-in spectator (L57-13):** `isSpectator` on playing/finished views. Zero legal
  actions; flag **Leave table**; **Watching** copy on the felt; private dock hidden.
  Hands, kits, and resources use the same upgraded-Spy overlay as an eliminated
  spectator. After Game over **Play again**, these sockets become unready lobby guests
  (L57-14) while a player seat is free.
- **Activated art** for Imposition / Points Generator: pass `activated` on `Card` when
  rendering entries from public/self `activePersistentEffects` (PROTOCOL_VERSION 19).
  Own actives sit on the kit identity row as tiny thumbs (not a CardBand row),
  including combat Shield while `shield > 0` (base/upgraded art — no activated PNG).
  Opponent actives sit beside the kit portrait (`activeShield` + persistents). The V2 table
  shows no Incoming / felt chip for Imposition or Points Generator: the unwired
  `persistent-incoming.ts` was deleted in L73-05 (spec v7 §13 #35). V7 recurring chips come
  from `view-model/recurring-chips.ts` (View-model layer above).
- **Elimination:** one generic treatment on `KitPortrait` — desaturate + “Eliminated” badge.
  No `*(dead).png` paths.
- **Table (L12):** felt shell in `screens/table/` — opponents arc, pending strip, **center-stage
  action log**, private dock + economy bar (`data-zone` hooks for Lot 14). Economy: compact
  **Draw** is only the gain point `CostDisplay` (`signed="gain"`, green CTA — not
  yellow-on-yellow with the point icon; no “Draw” letters — L59-01; `aria-label` /
  `title` keep the name; nested `CostDisplay` `title={null}` so hover is not only
  “plus 1 pt”) + compact **Shop** (L43-02 / L43-05 / L59-02, word label stays, same
  compact `Button` as Draw / Unspy) + compact **Unspy** (L58-07 /
  L59-01: crossed-eye inline SVG + `CostDisplay` of `CLEAR_SPY_COST` `signed="cost"`;
  no “Unspy” letters; `aria-label` / `title` keep the name; nested `CostDisplay`
  `title={null}` so hover is not only “minus 10 pts”).   Unspy is grey when it is not
  your turn, actions are locked, you cannot afford 10, or no living `spyingOnYou` seat
  exists. Click opens a `SeatTile` picker of living opponents who are **spying you**
  (hint: “Choose who is spying you.”; a single living spy is preselected so Confirm
  stays readable). The public log is `{actor} got unspied from {spy}` — Unspy drops
  **their** Spy on you, not yours on them. Shop Dialog (always openable — pool is
  public off-turn) shows the **Upgrade points** title plus the upgrade-point icon
  (no current-count). Buy/Sell sit **below**: kit points `CostDisplay` via
  `upgradePointBuyCost` / `upgradePointSellYield` at render time, never cached, plus
  **+1 / −1** upgrade-point `CostDisplay` (`signed="gain"` on Buy, `signed="cost"` on
  Sell). Buy is orange (points `signed="cost"`); Sell is green (points `signed="gain"`
  so the point icon has contrast). Then the shared-card
  grid + Buy special (price `SPECIAL_CARD_PURCHASE_POINTS` from `view-model/shop.ts`, Q50), and the pool (**Buy random** + public `poolBuyCost`). Shop faces use catalog costs: Spy play **2** / buy **4**
  (Lot 54 — do not restore 4/8). Living opponents who spy you show a small **open** eye
  (`spyingOnYou`). Turn strip: **?** (How to play) then **!** (Feedback,
  `aria-label` Feedback; Lot 57: never replace with the word Feedback — 44px `IconButton`)
  left of timers, **Chat** then **flag**
  right (inline SVGs). Chat opens and closes a fixed-height popup that scrolls to
  the newest line. Each line is the round (or Lobby) and the seat-colored nickname.
  Unread is how many messages arrived since it was closed (client-local).
  Eliminated and spectator lines stay gray italic and labeled. Play again keeps
  the lines in the next gathering. The finished board can open the snapshot
  from that game's end and cannot send. Flag `aria-label` Forfeit / Leave table / Return home. Alive flag opens Stay / Forfeit
  (“Leave the game? That counts as a forfeit.”); spectator flag opens Stay / Leave
  (“Leave the table?”). Finished `readOnly` flag opens Stay / Return home (designer
  2026-08-21 follow-up — the flag stays on inspect; Game over **Return home** also stays).
  Esc / overlay = Stay. Stats stays on the dock when `readOnly`. Lobby Leave is
  still immediate disconnect. Buy/Sell/Buy-card stay disabled when `!isMyTurn || actionsLocked`.
  Shell is full-bleed
  (`h-full` of `#root`; `html` / `body` / `#root` are `width/height: 100%`
  with overflow hidden — not `100dvh`, which can stay stale after a resize
  and leave the table as a small box on the html surface). Home and lobby
  scroll **inside** `#root` (`overflow-y-auto`); the table shell does not
  page-scroll. No `max-w` gutters. Opponents stay **one
  horizontally scrollable row** (`flex-nowrap`, overflow-x; unlayered CSS locks nowrap so
  six seats never wrap to a second line — Lot 53). 4+ opponents use compact seat chrome.
  Eight-player tables stay on that same nowrap row (overflow-x). Lobby player list
  scrolls (`max-h` + overflow) so eight seats do not cover Start / Add bot. **Dock is primary**
  (hand fills remaining height); action log is capped (~15vh portrait) until the felt is
  too short. **Landscape:** two-column felt — left opponents + pending + log, right
  dock (hand/economy). Short phone landscape keeps the left column at **~10.5rem**
  so one uncropped hand row still fits. Tall landscape (`min-height: 560px`,
  desktop / tablet) uses `minmax(16rem, 38%)` so opponents and the action log
  take empty width instead of a 168px strip. Shell is `w-full` / `h-full` of
  `#root` (no `w-screen` / `100vw` / `100dvh` gutters). If one
  uncropped hand row still cannot fit, chrome collapses into a button + Dialog in this order:
  **Incoming** (dock Incoming + felt Waiting on others) → **opponents** → **action log**.
  Viewports with `innerHeight` ≤ 500px collapse Incoming and opponents; the action log
  stays on the felt unless leftover chrome still overflows (L53-07). Landscape `used()`
  ignores dock min-height (dock is beside chrome). When opponents collapse, leftover
  left-column height is the log (`minmax(0, 1fr)`), not two buttons with an empty slate.
  Flyouts aim at the
  collapsed buttons (`log-collapsed` / `opponents-collapsed` / `incoming-collapsed`) so
  chips and pulses still play when the panel is unmounted. Collapse Dialogs must
  fit in the viewport with Close visible. Empty Incoming / Waiting / Specials take no flex
  space. No separate
  “Card Battle” header; code/status live in the turn strip. Opponents hug content (no empty
  white seat slab). Pending effects targeting `view.you`
  render in the private   zone (Incoming); effects on others stay on the felt strip (**Waiting
  on others**, L43-03) — both strips size to show full
  chips and scroll internally when many effects queue. Kit
  portrait opens a visual inspect Dialog from `getKit` / `getCard` only (L51-04:
  starting-hand action/attack versos + counts, `CostDisplay` on Draw / special play
  cost / upgrade-point buy-sell, grouped trait cards — never `N action · M attack`
  prose).   **Private zone:**
  Incoming sits **beside the kit** on the identity row (not a full-width row under
  it). Chips **stack vertically** and scroll (`max-h-14`, overflow-y) when several
  queue. No `max-h-9` clip on the chip itself. Felt Waiting stays a horizontal
  strip. `CardBand` — Hand and Specials share **one** face width (preferred min
  **22px**, max **48px**; shrink further rather than crop). Specials do not size
  independently. A short
  Hand or Specials row packs to `w-max` and **centers** with `mx-auto` (do not
  `justify-center` the overflow row — that clips both sides). Resources sit
  above
  the economy bar with **visible captions**
  (Lives, Points, Upgrade points, Shield — L43-01, not `sr-only` / `title` only);
  kit inspect and opponent reveal stay compact; `Card detail="face"`; effect
  copy in the card Dialog. Action log: scrollable list only (no filter rail); entries
  grouped under a sticky **Round N** header
  (table round = `floor(turnSequence / seatCount) + 1`, presentation only — no turn numbers
  shown) with one line per action. Hand/specials are **one row each** and **scroll
  horizontally** (L53-07; no wrap, no vertical card scroll, no pager). Width follows row
  height so the name line stays on-screen. Side-by-side (short docks) does not flip
  back to stacked until the band is 48px taller than the enter threshold (L65-04).
- **Dialog width (L53-02 / L53-07):** `dialogPanelClassName` maps `max-w-*` to one
  `max-w-[min(<abs>,100%)]` token of the overlay (Shop / kit picker / How to play / sub-choices).
  Panel is `min-w-0 max-h-full` of the overlay so 390×844 never clips
  Cancel off the right and 844×390 never clips Close off the bottom. Overlay is
  sized to `visualViewport` and `items-start` (not `items-center`, which clips the
  title of a tall panel); `my-auto` still centers a short panel. Footer `Button`s use
  `compact` and wrap. Collapse Opponents seats sit on a `min-w-0` nowrap row; Action
  log Dialog uses `embedded` so the empty state is not a full-height white slab.
- **Table card-first (L12-08 / L51-05):** click own hand/specials → Dialog with effect text + Use /
  Upgrade / Sell. Play cost is `CostDisplay` icons (`CardEffectCopy`); non-upgraded faces
  show base `effect` plus an Upgrade block of `upgradeAdds`; upgraded faces show only
  `upgradeEffect`. `formatCardEffectText` matches that copy (no `Cost:` prefix) for
  non-dialog surfaces. Cards stay clickable off-turn (and while Mirror/reward prompts run) so the
  player can read descriptions; action buttons disable when `!isMyTurn` or actions are locked.
  Nested Dialog for target, Regen quantity, **Card Transformer consume** (hand shared
  action/attack → `consumeInstanceId`), Assassin multi-attack; self-only Use is one-shot;
  Spy-revealed cards inspect-only; Mirror and elimination rewards via Dialog. Same
  intents/payloads as V1. Shop dialog thumbs use upgraded art when the seat's kit
  `alwaysUpgraded` covers that card (purchase arrives upgraded). Card dialog **Upgrade**
  shows `CostDisplay { kind: 'upgradePoint', amount: 1 }` with `signed="cost"`; **Sell** is
  green with catalog `sellYield` and `signed="gain"` (life icon on orange failed contrast).
  Interactive costs prefix **−** (pay: Use / Upgrade / Buy) or **+** (receive: Draw / Sell).
- **Visual pickers (L44-01):** `choiceTileClassName` is the shop selected/idle ring.
  `SeatTile` (seat wash + `PlayerName` + `KitPortrait`; hidden kit = opponent “?”;
  selected uses a 6px orange *layout* frame (`choiceTileSelectedFrameStyle`)
  plus inner glow — Dialog overflow cannot crop a box-model ring) and
  `CardChoiceTile` (card thumb, or attack verso when identity is hidden) live under
  `design/components/`. Shop buy cells use the helper only. Later L44 prompts consume
  the tiles; intents stay unchanged.
- **Mirror sub-choice (L44-03):** pending attacks are `CardChoiceTile` (art + name +
  source `PlayerName` + “→ you”); new target is `SeatTile`. Payload still
  `{ kind: 'mirror', pendingEffectId, newTargetPlayerId }`. Eligible ids only.
  L56-04: tiles pass `damageMultiplier` so doubled listed damage shows immediately.
- **Listed attack damage (L56-04):** compact `LifeCountBadge` (life glyph + tabular
  number, no `ResourceIcon` flyout). Catalog × `damageMultiplier` via shared
  `listedAttackDamage` — `null` for Tax / Absorber / Super Mirror the card. Surfaces:
  Incoming/Waiting chips, attack **play** log + Mirror history (v31 fields), Mirror
  picker, attack faces (hand / specials / shop / `CardChoiceTile`). Resolved lines
  keep actual `−N life` / shield absorbed.
- **Inspect from log / queue (L56-05):** card-name segments in the action log
  (`actionPlayed`, `actionResolved`, `mirrorRedirected`, `curseTransferred`,
  `persistentDeactivated`) and Incoming/Waiting chips open the existing inspect
  Dialog (`Card` + `CardEffectCopy`). Synthetic `CardInstance`
  `inspect:{log|queue}:…` — catalog only. Sources `'log'` / `'queue'` omit the
  Spy footer. Draw / buy / sell / upgrade / elim / rewards stay text (no
  `cardId` button). Nested inspect from the collapsed log Dialog closes that
  chrome (`dialog !== null` clears `chromeVisible`).
- **Card lives under actives (L56-06):** `PersistentEffectView.counter` is already
  public. `ActivePersistentThumb` renders activated thumb art plus, when
  `counter !== null`, a compact `LifeCountBadge` under
  the card on own kit-row actives and every opponent seat. **Invisibility** uses
  `kind: 'turns'` (remaining owner turns, L58-06). Spec-§5 card-lives cards use
  `kind: 'card-lives'`. Curse and combat Shield stay badge-free (`counter === null`;
  Shield remaining lives in the resource column). Inspect matches the thumb
  (Turns left vs Card lives). No protocol bump for the badge itself.
- **Lost persistents (L56-07):** auto-loss lines use `persistentDeactivated`
  (counter 0, Curse floor, death dump, leave / forfeit / inactivity).
  Manual Invisibility deactivate copy is “deactivated {card}; it is lost”
  (`actionPlayed` only).
- **Steal / pool / consume / special (L44-05):** all grids are `CardChoiceTile`.
  Unknown steal identities use the attack verso and the fixed “Hidden card”
  caption — no instance id on the tile. Pool extras stay `disabled` at `maxCount`.
  Payloads unchanged (`steal-pick` instanceId, `pool-pick` instanceIds,
  consume `playCard` + `consumeInstanceId`, `special-pick` cardId).
- **Rewards / reanimation / Regeneration (L44-06):** reward resource kinds use
  `choiceTileClassName` + existing `REWARD_KIND_COSTS` `CostDisplay` (4/8/1);
  card kind is a `CardChoiceTile` grid (Confirm still two choices; log stays
  opaque). Reanimation wraps `KitPortrait` with the same chrome (not a third
  primitive). Regeneration is four click-to-commit buttons (`1 life` … `4 lives`);
  click sends `playCard` `{ quantity: n }` and closes; footer is Cancel only;
  each button shows `CostDisplay` of `structuredPlayCost` × n as points
  (`signed="cost"`). No client-side affordability.
- **Duplicator action-log copy:** `activateDuplication` formats as "`X draws`"
  (playtest 2026-08-09); Spy/self still receive the real action kind on the wire.- **Skills applied selectively:** product-UI guidance from design / ui-styling / ui-ux-pro-max
  (contrast, touch targets ≥44px, focus rings, form labels, Dialog a11y, reduced-motion).
  Landing-page layout rules from design-taste-frontend do **not** apply to
  Home/Lobby/Table/End.
- **Table FX (Lot 14):** `apps/client/src/fx/` — hybrid presentational layer. Local Motion on
  cards/timers/resources; `TableFxProvider` queue for play flyouts, **token** chips (exact
  `|Δ|` icons between the action-log panel and the resource — staggered ~95ms, ~0.85s
  travel; not cards from Draw), buy/sell card ghosts, resolution, elim, rewards. Resource
  flash clears after ~1.6s. Shared timing in `fx/motion-timing.ts` (~0.55s). Dialogs animate
  open/close. Intents must never await FX. `useReducedMotion` skips choreography.
  Pure FX decisions live in `view-model/`, zone names and selector builders in
  `ui/fx-anchors.ts`; `fx/play-flyout.ts` keeps the DOM measuring (L72-03).
- **Table UX polish (Lot 39 · `docs/backlog_ux.md`):** client readability only — no rule
  change. Task IDs are **L39-** so they never collide with V5 Lot 32 search work.
  - **IllegalActionDialog (L39-02):** `error` is `{ code, message }` (PROTOCOL 27). Table
    parses into `actionReject` and opens `IllegalActionDialog` (title/body from
    `illegal-action-copy.ts`, Esc / overlay / OK dismiss via `clearActionReject`). Timers
    strip no longer shows a red reject line. Lobby/home keep the inline alert string.
    `stateUpdate` must **not** clear `actionReject` (bot sync would dismiss mid-read).
    When cleared, unmount the dialog (do not leave `Dialog` at `open={false}`) so
    AnimatePresence cannot leave a stuck blocking overlay.
  - **Seat colors (L39-03 / L55-01):** client-only palette `--color-seat-0…7` (blue / red /
    green / yellow / violet / orange / teal / pink) indexed by `view.players` array position (`ui/seat-colors.ts`).
    POV **dock** uses a strong seat wash (`seatZoneStyle({ intensity: 'fill' })`)
    instead of the old fixed `surface-kit` pink; opponent seats use a softer tint +
    loud glow when active. Colored names in pending queue and action log.
    No wire field.
  - **Opponent token flyouts (L51-09 / L51-11 / L51-13 / L51-14 / L51-15 / L51-16):** POV dock
    `ResourceIcon` still handles live dock Δ except overlay-landed transfers
    (skip only after chips measure). Every seat enqueues **directed** chips
    (`from` / `to` log or player): play/buy/upgrade spends seat→log; sell yield
    log→seat. A seat whose kit is hidden (unspied, or base Spy since Lot 69) flies one
    Draw point and spends Classic 10 for an upgrade point. **Resource
    chips are icon-only** (`object-contain` + drop shadow, no `bg-surface-raised`,
    no card radius, no border). Overlay card chrome is **`asCard === true` only**
    — never `from.width`. Token chips are 40×40 both ends (L51-16); that size
    must not promote them to tiles (L51-14). **Card ghosts on buy/sell and play**
    (felt pending + card-band midpoint, ~48×72, `asCard: true`) — buy/sell verso
    when unspied, face when Spyed; play uses public `cardId` face art. Special
    buy uses the special verso. **Every resource
    transaction flies both legs when both exist** (L51-15): catalog spend/yield
    plus `leftoverLiveFlowChips` for live Δ the catalog did not explain
    (Absorber spend 3 + absorb 10 → 3 out and 10 in, not the net +7).
    Overlay opacity holds through ~88% of travel so the gain leg is still
    visible at the dock (L51-16). Public chip amounts flash on the seat icon
    even when the printed value is `?` (`emitResourceFlowFlash`).
    `actionResolved` `livesLost` / `shieldAbsorbed` fly from the target
    (POV, unspied, and live Spy) — do not skip seats with live icons.
    Regeneration: live Δ when numbers are known, otherwise the catalog per-life
    unit (rate + 1 life) so the action still animates; quantity is not on the
    public log. Thief / Spy Thief / Upgrade Point Thief: live Δ victim→thief
    (extra upgraded gain from the log); both `?` → one directional chip, never an
    invented total. Overlay `z-[110]`.
    Travel `TOKEN_FLYOUT_DURATION_S` in `apps/client/src/fx/motion-timing.ts`
    (0.6s; raise it to slow chips — keep `FX_TTL_MS` above that × 1000).
    Reduced motion skips choreography. Do not invent Draw totals.
    **Collapsed chrome (L53-07):** measure against `action-log-panel` **or**
    `log-collapsed`, opponent seats **or** `opponents-collapsed`, Incoming strip
    **or** `incoming-collapsed`. Overlay flashes use the same anchors so chips
    and pulses still play when the panel is a button.
  - **CostDisplay (L39-04):** icon+number on interactive cost chrome (Use / shop / special
    buy / rewards / Sentence expiry). Button chrome adds `signed="cost" | "gain"` (− / +).
    How-to-play and action-log prose stay text via `formatCardCost`. Kit inspect and
    card inspect use `CostDisplay`. Card inspect prefixes the play-cost row with
    **Cost** and inlines resource glyphs in effect / `upgradeAdds` copy
    (`EffectTextWithIcons`, L51-12). No “Choose Use, Upgrade, or Sell.” helper.
    Draw is green (gain) except Gambler payout `> 10` (catalog listed Draw) is
    red (L64-05); Sell is green (gain); Buy / Upgrade stay
    orange (pay). V7 equivalent: `ui/card/cost-amount.tsx` (L72-11).
  - **Threat FX + turn banner (L39-05):** when a **new** real Incoming pending targets POV
    (diff in `view-model/incoming-threat-diff.ts`; presentation `persistent:…` chips never count),
    enqueue `threatOutline` + optional `targetingCue` (opponent-seat pulse highlight,
    not a line). Tone via `threatToneFor`: **red**
    `attack` for attack cards + Sentence / Mirror / Super Mirror; **orange** `effect`
    otherwise. Flash TTL `THREAT_FX_TTL_MS` (~3.8s) with a matching long outline pulse.
    Active seat gets seat-colored glow (`seatZoneStyle({ active: true })`); own-turn timers
    banner gets a stronger seat tint. Table banners reuse the same flash duration (~1.6s,
    `pointer-events-none`): attacked / dead are flashier red; win copy is `You won!`.

## Conventions

- **Zero rule logic** on the client. Buttons send intents; the server revalidates.
- Connection hook: `apps/client/src/net/use-room-connection.ts` — create / joinById /
  messages / leave / auto-reconnect (`room.reconnection` + `sessionStorage` token fallback).
  Same-tab reclaim during the **30s** grace does **not** need the picker. A later
  Join-with-code is a new socket: if the table is **playing**, enter as spectator first;
  `ClaimSeatDialog` lists living disconnected seats (nickname + seat color, no auto-match)
  with **Sit here** / **Stay spectating**. A single listed seat is pre-selected. The
  picker is **not** shown to a living seated player (host Draw stays reachable).
  Walk-in Stay sends `staySpectating` so the server unfogs kits; until then the
  table behind the picker has no Spy overlay (L57-16). Watching copy only says
  hands are visible when a `spied` overlay is on the view. `claimSeat` remaps onto
  that `player.id`.
  Lobby accidental drop **reserves** the seat until Kick, Leave, or claim/rejoin.
- Mid-game **flag Forfeit** confirms then sends `FORFEIT` (socket stays). Spectator **Leave**
  (`leaveTable`, including walk-in `isSpectator`) calls `leaveGame()`. Finished-board
  **Return home** (flag or Game over) and tutorial
  **Play a real game** go through `EndScreen.requestLeave` (Lot 57): ask-once if unmarked,
  then `leaveGame()`. Unexpected drop shows
  status `reconnecting` and does not clear the table view until reclaim fails.
- Every `stateUpdate` replaces the previous view. Validate shape before use.
- Timer display is cosmetic: trust `turnDeadlineMs` / `turnStarted.deadlineMs` from the
  server, never a client-only countdown as authority. When the active seat is `disconnected`,
  show paused copy instead of a live countdown.
  V7 (L73-13, spec v7 §6.10): `view-model/turn-clock.ts` `turnClock()` checks `none` for the
  tutorial and the finished board, then `paused`, then `absent` (null deadline), then `none`
  for any other null deadline (bot turns), else `countdown`. Seconds come from
  `view.turnDeadlineMs` only. The full length comes from the cached lobby `turnTimeSeconds`
  (`cachedLobbyRules`, L73-12), else the first `TURN_STARTED` of that `turnSequence`
  (`nextTurnStartedRecord`; call it on each new `lastTurnStarted` with `view.turnSequence`
  and the receive time), else seconds only with no ratio. `danger` is the last 10 s and `tick`
  the last 5 s. The V2 `table.tsx` keeps its fixed 60 s divisor until the L75 flip.
- **Degraded states (L9-01):** each `PublicPlayerView.connection` drives badges —
  disconnected grace, `absent N/3`, idle timeouts `N/5`.
- Action log is the table's main organ (technical spec §7). Browsable history lives in
  `apps/client/src/action-log/` — scrollable round groups (no player/kind/search filters).
  V7 reads it through `view-model/log.ts` `log(view)` (L73-11, spec v7 §6.9): the ticker is
  the latest entry, rounds come from `groupByRound` with `view.players.length`, and each card
  segment carries `inspectable` (the L56-05 list (above); a `blockedBy` name stays text). Pass
  `finalTable` on the finished board. The unused filter helpers (`filterActionLog`,
  `entryInvolvesPlayer`, `ActionLogFilters`, `groupByTurn`) are gone (spec v7 §11, Q62).
  Copy is natural language (`Alice attacks Bob with Basic attack`); buy/sell/upgrade omit
  the card name (`sold a card`). Card display names come from `getCard`.
  Server `actionLog` is a discriminated union (`actionPlayed`, `actionResolved`,
  `playerEliminated`, `mirrorRedirected`, `playerReanimated`, opaque `rewardsClaimed`).
  Reward picks are never shown. In-game `playerReanimated` never includes `kitId`
  (designer 2026-08-24 / L50-03): copy is always `X returns`. Excel `exportLog` still
  carries the kit. Bot rows may carry optional
  `botReason` (L17-05); the Why control is hidden in every mode (L45-05) — never feed
  reasons into play/legal UI.
- **End screen (L9-03 / L13-01 / designer 2026-08-06):** `FinishedStateView` keeps public
  `recap` + `exportLog`. PROTOCOL 24 adds `finalTable` (per-recipient `PlayingStateView`
  snapshot, `turnDeadlineMs: null`). Client renders the frozen table under a closable
  Game over Dialog (default open; Esc / overlay / View board dismiss). Stats button on the
  economy bar reopens it. Intents are locked (`readOnly`); Shop / inspect / action log stay.
  First close of Game over stats (View board / overlay / Esc) opens Feedback in **ask-mode**
  once per `gameCode` (`localStorage['card-battle.v6.feedbackAsked.' + gameCode]`; Skip or
  successful send). Ask-mode is the Lot 47 ticket (Kind / About / message / optional
  contact; title Feedback; lead Skip is fine) — including Return home (L57-05).
  View board ask does **not** leave. The Game over action row also has **Feedback** (same
  label as Home): it dismisses stats and opens the **manual** ticket so the overlay cannot
  hide the turn-strip **!** — it does not auto-leave. **Return home**, tutorial **Play a
  real game**, and the finished flag all hit the same ask-once (`requestLeave` /
  `leavePending`); already-asked leaves immediately. Failed send does not
  mark asked and does not leave. `EndScreen` owns the only Feedback Dialog on the finished board so stats /
  ask / turn-strip **!** never stack: banner-period `!` delays stats until that form
  closes; a send there marks asked; `!` is a no-op while stats or Feedback is already
  open. Live table still owns its own Dialog.
  Flag opens Stay / Return home (then `requestLeave`); Game over **Return home** is the same path.
  Classic Game over also has **Play again** (L57-12) next to Return home. If this
  `gameCode` is not yet asked, Play again opens the same ask-once ticket
  (`playAgainPending`) then sends `playAgain` after Skip or a successful send.
  Already-asked sends `playAgain` immediately. Cancel does not rematch. A solo
  table (exactly one human player seat) does not send `playAgain`: after the
  same ask-once it leaves and opens the Home solo menu with that human’s kit,
  the bot count, and the shared bot difficulty (L67-01). The next match starts
  only from **Start solo game**. Two humans still send `playAgain`. The first
  `playAgain` in the room reforms the lobby **without yanking** other recap views;
  walk-in spectators become unready lobby guests (L57-14). Tutorial finished views
  use title **Tutorial complete** and CTA **Play a real game**
  (still `onLeave` → hub only; no Play again). Table banners (L51-06): **Your turn** (seat color);
  **You are being attacked** once per new attack-tone Incoming (flashier, red);
  **You gambled too much and lost everything** for the Gambler who just wiped
  (`data-banner="wipe"`, same red chrome as Sentence; opponents do not get it);
  **You are dead** on the POV elimination edge (flashier, red); **You won!** on POV
  win. Game over Dialog opens after the ~1.6s banner. Won and dead never share a seat. **Download action log** renders only when
  `import.meta.env.DEV` (every mode).
  **Lot 60 gallery:** winner header + award tiles (seat color, kit portrait, nickname, kit
  name, value) + compact elim list. Skip an award when every eligible seat is tied at 0.
  Slowest / Fastest count humans only (≥2), ranked by average think time per turn
  action (`thinkTimeMs` / `turnActionsCount`). Bots compete for every other award. Recap
  `kitId` is public on this screen (fogged walk-ins omit it — placeholder portrait +
  Hidden kit). `finalTable` living seats still follow Spy / elim / walk-in overlay.
  Client ranks recap numbers only (`view-model/game-over-awards.ts`); do not parse `exportLog`.
- **Table UI switch (technical spec v7 §4.4 · L72-20, removed in L75):** `?ui=next` writes
  `localStorage['card-battle.v7.ui'] = 'next'`, `?ui=classic` removes it, else the stored
  value applies; applied once per page load (`useState` initializer in `GameApp`); tutorial
  rooms always get classic. Read only by `App.tsx` (playing) and `EndScreen` (`tableUi`),
  each via `const Board = … ? ArenaScreen : TableScreen` so source-text literals stay single.
  `ArenaScreen` renders `TableScreen` until L74-01. Storage access is `try/catch` and a
  blocked store degrades to classic (or to the param for that load); the param is never
  stripped from the URL.
- **Client storage keys** (no accounts; every helper guards the storage accessor in try/catch,
  and the V7 switch also guards each read and write): localStorage
  `card-battle.v6.howToPlaySeen`, `card-battle.v6.lastSeenReleaseId`, `card-battle.v6.hints`,
  `card-battle.v6.feedbackAsked.<gameCode>` and `card-battle.v7.ui` (table switch, L72-20,
  removed in L75); sessionStorage `card-battle:reconnection-token` and
  `card-battle.v6.inboxPassword`.
- **`playCard`** may omit `targetPlayerId` (Tax, Regen, Shield, Mirror, and other self-only
  V1 cards) and may include `quantity` (Regen 1–4). Table (L12-08): click card → Dialog;
  self-only Use sends immediately; targeted Use opens nested target Dialog; Regen opens
  the L44-06 quantity Dialog (four click-to-commit buttons, not a free-text field).
- **Assassin** (`allowsMultipleAttacksPerTurn`): `playMultipleAttacks` with ≥2
  `{ instanceId, targetPlayerId }`. Single attack still uses `playCard`. Multi-attack opens
  from the attack-card action Dialog. Draw label uses `getKit(self.kitId).startingResources.draw`.
- **Spy / death reveal (L51-08 / L51-10, Lot 69):** opponent seats always show lives /
  points / upgrade points / shield icons. An unspied seat renders `?` (never unspied
  totals). Any Spy relation, base or upgraded, shows live numbers; a death reveal shows the
  numbers frozen at death. A base Spy keeps the kit, hand and specials hidden; Spy+
  (`spied.kitId`) and death reveal show them. The server never sends
  `spied.resourcesSnapshot` (spec v7 §14.1). Icons stack vertically beside the portrait;
  activated cards sit under the portrait. Shield stays on the seat (no omit-on-
  overflow). Portrait stays tappable when a Spy+ or death reveal exists. Dialog
  title is `{nickname}` for Spy+ and `{nickname} (eliminated)` on death. No Hidden
  kit / Spied — tap / Revealed — tap labels.
- **`actionResolved.outcome === 'immune'`**: surface **“immune”** in action-log copy and
  resolution FX flash (Untouchable, Invisibility, and any future `outcome: 'immune'`).
- **Elimination reward Dialog:** option labels use natural names (`4 lives`, card catalog
  names via `formatCardLabel`) — never raw `RewardChoice` type ids or `cardId` strings.
- **Sub-choices (L30-03):** one unicast `subChoiceRequired` / `resolveSubChoice` pair
  (`SubChoiceRequiredPayload` discriminated on `kind`). Client stores a single `subChoice`
  and renders `SubChoiceHost` — Mirror, elimination rewards, steal-pick, pool-pick,
  special-pick, reanimation-kit. Deadline is `SUB_CHOICE_MS` (40s). Clear on confirm /
  `turnStarted` / `gameOver`. Lock other table actions while a sub-choice is open. Also lock
  when `players[you].isEliminated` — after an elim the turn pointer may still sit on the dead
  seat until rewards finish. Reward picks stay opaque in the action log.
- Dev override: server `TURN_DURATION_MS` env (ms, min 5000) — default 60s.
  Lot 70: that env stays the human clock until the host sends `turnTimeSeconds`.
  Bots keep their own think time.
  `RECONNECT_GRACE_MS` env (ms, min 1000) — default **30s** (L57-13; overrides
  technical spec v1 §5.7 60s). Invalid env falls back to 30s.
- Finish client tasks with a Conventional Commit (AGENTS.md §10) — same rule as server work.

## Manual two-browser check (Lot 6)

How agents / developers verified elimination rewards in a real room:

1. `TURN_DURATION_MS=300000 pnpm dev` (long turns; reward sub-choice stays 40s).
2. Open **two** browser contexts/tabs on `http://localhost:5173/` (Playwright tabs or two windows).
3. Tab A: nickname → **Create** → note game code. Tab B: nickname + code → **Join**. Host **Start**.
4. Farm points with **Tax** (uncheck “Include target”), pass the other seat with **Draw**.
5. Queue **super-attack** (10 pts, 7 dmg) at the opponent; on their turn they **Draw** so it resolves.
   Two hits (or one if they already Taxed lives down to ≤7) eliminate them.
6. **Eliminator** tab must show **Elimination reward** with a 40s countdown and two pickers
   (`lives` / `points` / `upgradePoint` / `card` + card list from the held hand/specials) —
   **only in mid-game** (still ≥2 contenders after the elim). Use a **3+ player** room for
   this check, or leave another seat alive. In pure **2p**, a game-ending elim **skips**
   rewards and goes straight to game over (designer 2026-08-06) unless the victim has
   reanimation pending.
7. **Victim** tab must show **Eliminated** / spectator copy and have **Draw disabled** (not only a
   server error). Confirming rewards (or waiting out the 40s default `2×4 lives`) then emits
   `gameOver` when one seat remains.
8. Spot-checks: mid-game card + upgradePoint pick keeps the match going; final elim of the
   penultimate player → **no** reward dialog → game over; acting as victim during a mid-game
   pause → server `Finish elimination rewards first.` (UI now prevents the click).

## Manual 4-player check (Lot 6)

Same stack as above; open **four** tabs (or windows), join one code, host **Start**.

Verified 2026-07-31 (Playwright, room `BGZEXW` family):

1. Seats P1–P4. Prefer a low-life kit as first victim (Kamikaze starts at 4 lives — one
   base super resolves to an elim on their turn).
2. Target the victim via the **nickname label** (more reliable than `getByRole('radio', { name })`
   for short nicknames in automation), play **super-attack**, rotate **Draw** until their
   resolve phase runs.
3. Only the **eliminator** sees **Elimination reward**. Other alive tabs do not. Victim sees
   **You are a spectator** and Draw disabled.
4. Confirm rewards (e.g. lives + card). **Game must not end** while ≥2 players remain: turn
   advances to the next alive seat; opponents list shows `(eliminated)` on the victim.
5. Repeat for a second elim (still ≥2 alive afterward). Example: after P3 then P2 died, P1/P4
   still played — `gameOver` stayed false, Active moved on.
6. Final elim of the penultimate player → **skips** rewards (game-ending) → `gameOver` for
   the last survivor. Closable stats dialog over the finished board.

## Manual Lot 7 lifecycle check (L7-05 / M4)

Prereq: `RECONNECT_GRACE_MS=5000 TURN_DURATION_MS=8000 pnpm dev` (short timers for manual runs).

1. Four tabs, join one code, host **Start**. Confirm each opponent shows connection status.
2. **Reconnect within grace:** drop one tab's network (or DevTools offline) under the grace
   window; restore — status returns to connected, no absent badge, counters unchanged.
3. **Absent auto-draw:** keep one seat offline past grace → badge `absent 0/3`; when their turn
   arrives the game advances without a 30s wait; after three auto-turns they are eliminated,
   cards pooled, no reward prompt.
4. **Leave forfeit:** mid-game **Leave** on a 2-player room → immediate elim + `gameOver` for
   the other seat.
5. Repeat full 4-player playthroughs (kits / specials / Mirror or rewards) **three times** with
   no stuck state — M4 proof.

Verified 2026-07-31 (Playwright, `RECONNECT_GRACE_MS=5000 TURN_DURATION_MS=8000`):

- 4p rooms `RXAFII`, `MJXLKL`, `IIFWJS` — multi-draw rotation, Leave forfeit elim on one seat,
  no stuck state / protocol mismatch.
- 2p room `BFIOVB` — disconnected grace badge, absent after grace, win by forfeit for the
  remaining seat.

## Post-lot browser gate

Required after the last task of a backlog lot is `Done` (AGENTS.md §9). Agents own this —
do not hand off an untested lot.

1. Restart `pnpm dev` on the current code (match PROTOCOL_VERSION). Prefer long turns for
   interactive play (`TURN_DURATION_MS=300000`); short timers only when testing lifecycle.
2. Drive at least one **two-browser** (or multi-tab) session covering that lot's acceptance
   criteria end-to-end — not only unit tests.
3. Exercise the new UI paths (filters, screens, degraded states, log entries, recap, etc.).
4. On every defect: root-cause, fix, `pnpm verify`, commit, and **re-test** until clean.
5. Record the room code(s) and what was verified in this file (same pattern as the Lot 6/7
   notes above).

### V6 first-time gate (L48)

Reusable stranger path on the **current** tree (Lots 49–54 are the truth). One browser,
not a two-human session and not a 6p crowding redo. Clear
`card-battle.v6.howToPlaySeen` and `card-battle.v6.hints` first — there is no Reset help
control. `TURN_DURATION_MS=300000 pnpm dev`. Inbox persist needs `DATABASE_URL` (migrated)
and `INBOX_PASSWORD`. Do not restore pager / Reset help / Spy 4/8 / protocol 29.

1. Hub: **Beta** (word only), Tutorial, How to play, Feedback; **no** Inbox link; **no**
   `Protocol v`.
2. First Play online / Play solo / Tutorial click opens How to play (soft gate). Skip and
   Got it both continue. Primer order is spec §5.1 (no delayed-resolution section). Missing
   `apps/client/src/assets/how-to-play/*.png` omit `<img>` — do not invent files.
3. Tutorial: nickname-only create; one scripted bot; no turn timer; board tour then Look
   then indices 0–30 to human win; coach + orange callout. Incoming beside the kit is
   proven on tutorial Incoming (Basic / Strong / Spy / Thief); Feedback `!` stays on the
   turn strip. Skip tutorial (flag-only, hub, no Game over) is L45 evidence — this gate
   may complete 0–30 instead of Skip.
4. **Tutorial complete** → **Play a real game** (or View board) hits ask-mode full
   ticket if not yet marked; Skip → hub. Completing tutorial does **not** set hint `skipAll`.
5. Next Classic Easy solo (1 opponent): first-game hint overlay (not tutorial coach).
   Table **?** opens How to play without sending an intent. Shop: Spy play **2** / buy
   **4**.
6. Phone 390×844 and landscape 844×390: shared face width, one row, **no pager**, faces
   not cropped. Horizontal scroll only if the hand overflows — a short 2p hand that fits
   is not a fail.
7. Alive flag → Stay then Forfeit (socket stays) → Game over → ask-once Feedback. POST
   persists (this is the persist proof; tutorial Feedback may be Skip). No `seed` in the
   JSON body. Failed send must not mark asked. CORS `:5173` → `:2567` (spec v6 §12 #8).
8. `/inbox` + password: list shows that Classic row (kind, topics, message, no seed).
   Wrong password → **Wrong password**. Missing-env 404 and no-DB 503 stay L47 evidence.
9. Watch point: a weaker answer that still lets incoming land is Lot 54, not a V6 defect.
   DEV **Download action log** is expected under `pnpm dev`.

A presentation oddity that is how Lots 49–54 already work is **not** a defect. Stop and
ask rather than revert.

### Lot 9 verified 2026-08-01 (Playwright, `TURN_DURATION_MS=300000`, PROTOCOL 18)

- Action log: turn groups, draw/playCard/Resolved entries, player/kind/search filters.
- End screen: winner, single `(eliminated)` badge, recap counts + elim reason, Return home.
- Leave forfeit → game over recap (`P2 eliminated (leave)`). Rooms: `NNOLEX`, `UGVKXF`, etc.

### Lot 10 verified 2026-08-01 (Playwright, `TURN_DURATION_MS=300000`, PROTOCOL 18)

- Home: Outfit + surface tokens, Motion title enter, CSS hex CTA `Button` (Create/Join).
- Lobby: Start/Leave buttons; room `RQNKXT` (HostA + GuestB).
- Table: `KitPortrait`, `ResourceIcon` row, `Card` hand/specials with V1 art, opponent
  `opponent.png` placeholder when unspied; action bar uses shared `Button` variants.
- No protocol/intent change; favicon 404 only (pre-existing, unrelated).

### Lot 11 verified 2026-08-01 (Playwright, `TURN_DURATION_MS=300000`, PROTOCOL 18)

- Home: branded split with V1 decorative art, nickname + Create/Join, muted Protocol v18.
- Lobby: game code Copy → `Dialog` “Code copied”; seats; host Start / guest waiting / Leave.
- Two-tab flow: HostA create → GuestB join `HIWOGA` → host Start → Table (unchanged intents).
- No protocol/intent change.

### Lot 12 verified 2026-08-01 (Playwright, `TURN_DURATION_MS=300000`, PROTOCOL 18)

- Felt Table: opponents arc, pending strip, center-stage action log, private dock + economy bar.
- Room `VYFEUG` (HostA + GuestB). GuestB Tax via card Dialog Use (self-only one-shot) → log
  `playCard tax`; lives/points updated.
- HostA: Basic attack → Use → nested target Dialog (GuestB); server rejected without points
  (`Not enough points`) — correct; Draw (+1) still works from economy bar.
- Timers progress bar + connection status; unspied opponent shows `opponent.png` / Hidden kit.
- No protocol/intent change.

### Lot 13 verified 2026-08-03 (Playwright, `TURN_DURATION_MS=300000`)

- Room `BBTWGH`: HostA + GuestB → Start → GuestB Leave forfeit.
- End: Home-like branded layout, Winner HostA (you), Players + Eliminated marker, Recap,
  Return home → Home. No connection badges on End.
- No protocol/intent change; `build-view-for.ts` untouched.

### Lot 14 verified 2026-08-03 (Playwright, `TURN_DURATION_MS=300000`)

- Rooms `JMGZOZ`, `VSJDBP`: two-tab Start → Table FX layer present (`data-zone="table-fx"`);
  timer progressbar Motion width from server deadline; card Dialog Use path still sends;
  Leave forfeit → redesigned End.
- Hybrid FX: local card entrance + timer; overlay for flyout/resolution/elim/rewards.
- No protocol/intent change; intents never await FX.

### Lot 17 verified 2026-08-04 (browser, `TURN_DURATION_MS=300000`, PROTOCOL 21)

- **Solo:** Home Play solo → defaults (1 opp, Normal) → Start. Room `SSHUHB`. Lobby skipped.
  Table: opponent `Alpha` with `Bot · Normal`; action log Why → “Investing for a stronger later
  turn.” Bot pace readable between turns.
- **Lobby bots:** Create → room `MKZBSV` → Add Easy + Add Hard (`Alpha` Easy, `Bravo` Hard) →
  Start. Table shows both bot labels; Why on bot plays; resolution FX still fires
  (`Bravo's Strong attack hits Alpha`).
- Living docs: `frontend.md`, `protocol.md`, `db.md` updated for solo / lobby bots / `botReason`.

### Lot 30 verified 2026-08-05 (browser, `TURN_DURATION_MS=300000`, PROTOCOL 23)

- **2p human:** rooms `JLHWBF` (Player1 + Player2). Pool `(N)` → Shared pool dialog (empty
  copy + Close); kit inspect loads special art + Always upgraded / Immune to / Multiple
  attacks sections; Draw rotates turns; action log updates; no app JS errors (favicon 404
  only, pre-existing).
- **Solo:** rooms `LEGUIR` / `SOZVBU` — Pool + kit inspect + Tax/Thief/Draw paths; bot turn
  rotation works when the human keeps acting. Early “stall” reports were turn-ownership
  confusion / tab leave, not a client lock (`FJKUXN` HostA `consented leave` in server log).
- **L30 surfaces covered:** art map (30 cards), pool button, SubChoiceHost wiring (Mirror /
  reward host present; mid-game Mirror not forced this pass), Block/Invis/Duplicator chrome
  code paths wired (kit RNG did not force those kits this session), immune log copy,
  trait-section count test.
- Deeper forced paths (MEGA / Super Mirror / Reanimation / Absorber pool-pick) remain
  engine-tested; re-check in a longer session once Lot 29 bots bias toward those cards.

### Lot 39 verified 2026-08-10 (browser, `TURN_DURATION_MS=300000`, PROTOCOL 27)

- **Solo rooms:** `XZVWJS` (HostA, 2× Normal), `EGIPYR` (HostB, 2× Easy), `DYNMDK`
  (HostC, 2× Normal). Home shows Protocol v27.
- **Seat colors:** POV + opponents tinted; log/pending names use seat hue (blue / red /
  green / yellow / violet / orange / teal / pink).
- **IllegalActionDialog:** Buy UP / unaffordable Super attack → modal “Not enough points”;
  timers strip has no red reject line. Modal survives bot `stateUpdate` (fix in
  `use-room-connection`). OK dismiss works after unmount-on-clear fix (stuck overlay).
- **CostDisplay:** Use button shows icon+number (`point.png`); Buy shop lists icon costs
  (Basic 2 / Strong 4 / special 20 pts).
- **Threat FX:** orange Incoming outline observed for Spy targeting POV (`XZVWJS`). Red
  attack Incoming not forced this pass (bots did not queue an attack on the human);
  `threatToneFor` unit tests cover red/orange classification.
- Living docs: `frontend.md`, `protocol.md` (already PROTOCOL 27), `decisions.md` Lot 39.

### Lot 43 verified 2026-08-21 (browser, `TURN_DURATION_MS=300000`)

- **2p** room `WNM2C6` (HostA vs 1 bot): dock captions Lives / Points / Upgrade points / Shield;
  **?** opens How to play; **Shop** shows upgrade-point Buy/Sell + cards + pool; flag Stay keeps
  the table; flag Forfeit → Game over on the same client (`HostA eliminated (leave)`).
- **3p** room `WA1I2N` (HostA vs 2 bots): Forfeit stays connected as spectator (Eliminated
  banner; bots keep playing); second flag is **Leave the table?** (not forfeit copy); Leave
  returns to the hub with no Game over dialog.
- Designer follow-up 2026-08-21: finished inspect **keeps the flag** as Return home; Draw is
  green; Sell is green; button costs show − / +.
- Phone-width hand pagination remains L48-02.
  **Superseded by L53-07:** shared-size horizontal scroll, no pager. Do not restore
  pagination.

### Lot 44 verified 2026-08-24 (browser, `TURN_DURATION_MS=300000`, PROTOCOL 30)

- **Solo** room `KUVIMX` (Lot44Host vs 1× Normal bot Alpha). Shop buy cells still use
  `choiceTileClassName` (selected orange ring, `CostDisplay`, Buy selected).
- **Target:** Basic attack / Strong attack / Spy → `SeatTile` grid (hidden kit “?”, nickname
  Alpha, seat wash). Confirm still sends; no radios.
- **Regeneration:** four click-to-commit tiles `1 life` … `4 lives` with live `CostDisplay`
  (−3 / −6 / −9 / −12 pts at base rate). Footer Cancel only. Click `1 life` applied
  (lives 4→5) and closed the Dialog.
- Not forced this pass (engine-tested / source-tested): Assassin multi, steal hidden/spied,
  pool / consume / special-pick, Mirror, elimination rewards, reanimation kit. L48-02 remains
  the formal first-time gate.

### Lot 45 verified 2026-08-25 (browser, tutorial no turn timer, PROTOCOL 30)

- Hub **Tutorial** → How to play soft gate (Skip) → nickname-only form (no kit picker, no add-bot).
  Nick `L45Host` → Start tutorial. Room `EZBIMB`. One bot **Alpha**; difficulty label hidden on the
  table. Coach **Draw** (points, not a card); Draw spotlight. Shop opens only on click (not
  auto). Illegal Shield Use → coach **Tutorial step**. Tax coach copy **4 points**. After Tax,
  coach **Counter** (equal cancel); Basic highlighted; Incoming Basic from Alpha. Action log has
  no Why. **Skip tutorial** confirm is not a forfeit → hub, no Game over.
- Engine walk 0–30 is covered by `tutorial-script.integration.test.ts` (L45-07), not the browser
  pass.

### Lot 45 follow-up verified 2026-08-26 (browser, board tour + Look gate)

- Nick `TourHost`, room `GMFBAP`. Client-only 11-step tour before Draw (Got it); Draw blocked
  on the Leave step; Draw after tour. Coach panel slightly transparent. After Spy resolves,
  Look forces a portrait click (no Got it); Spy reveal then Sell.

### Lot 46 verified 2026-08-26 (browser, `TURN_DURATION_MS=300000`, PROTOCOL 30)

- Hub **Reset help**, then **Tutorial** nick `L46Tut`. Room `RMXLCN`. Board-tour coach **Your zone**
  with **Got it** only — no first-game hint, no **Skip all**. **Skip tutorial** confirm → hub (not
  a forfeit). Next Classic still eligible.
- **Play solo** nick `L46Host`. Room `CVYCNN`. First-game card **Your turn** (“take **one** action”)
  with **Got it** and **Skip all**, next to the turn strip. **Skip all** hides it. Second solo
  `OTFTLE` has no hint card. Hub **Reset help** then third solo `MBIXNF` shows **Your turn** again.

### Lot 46 follow-up verified 2026-08-28 (browser, `TURN_DURATION_MS=300000`, PROTOCOL 30)

- Hub **Reset help**, **Play solo** nick `L46Hints`, 1× Normal bot. Room `WONXYS`.
  After **Your turn** and **Draw**, **Hand** (“use / upgrade / sell”) then **Specials**
  (usually one-use). Shop / Resources / Hidden kit still follow.
- Same room: Alpha **Card Thief** → Incoming hint “incoming **Thief**” (not Shield/Mirror).
  Later Alpha **Strong attack** → Incoming hint “incoming **attack**” / do something
  (attack back, Shield, or Mirror). The two bodies are distinct.
- First POV **elimination reward** hint is unit-tested (selector + Dialog anchor). Not forced
  in this 2p solo (game-ending elim skips rewards).

### Lot 46 placement fix verified 2026-08-29 (browser, `TURN_DURATION_MS=300000`)

- Solo nick `L46Beside`, room `MAEVCV`. After Your turn / Draw, **Hand** sits in the HAND
  row immediately left of the cards; **Specials** sits in the SPECIALS row immediately
  left of Super Mirror — not on the far left of the felt.

### Lot 46 copy rewrite (main 2026-08-29)

- Designer replaced the short §5.2 one-liners with longer `HINT_COPY` bodies (Draw depends
  on kit; Shop buy cards / specials / upgrade points; Incoming attack vs Thief still
  distinct). Spec + copy test lock those strings. Placement and selector unchanged.

### Lot 50 verified 2026-08-24 (browser, `TURN_DURATION_MS=300000`, PROTOCOL 30)

- Solo Specialist vs 1 bot, nick `SupercalifragilisticNick`. Shop tile select stays open;
  Buy upgrade point closes the Shop. Base Card Transformer (Mirror) granted Imposition;
  upgraded special-pick list has 19 specials and no Card Transformer. Log shows the long
  nick without ellipsis. Phone-width (390) Hand pager `1/2` with 44px `IconButton` arrows.
  Room `PPWXUP` on the pager pass.
  **Superseded by L53-07:** no pager; one row, horizontal scroll. Do not restore arrows.

### Lot 51 verified 2026-08-26 (browser, `TURN_DURATION_MS=300000`, PROTOCOL 30)

- **Hub:** top-right **Beta** card (word Beta only). No `Protocol v` footer, no Reset help,
  no delayed-resolution pitch. How to play: Goal → Turns → Lives → Points → Cards → Upgrade
  → Kits → Special cards → Shop; resource glyphs beside Lives / Points / Upgrade / Shield;
  Skip / Got it. No “delayed”, “double”, or “(not a card)”.
- **Kit inspect** (Scientific on Play solo): starting-hand action/attack versos with counts;
  Draw and special play cost use `CostDisplay`; traits grouped (Always upgraded).
- Room `ZYGXYI` (Scientific vs 1× Normal): unspied opponent four icons with `?`; no Hidden kit
  / Spied — tap; Incoming Strong attack chip ringed, **no arrow**; center **You are being
  attacked** then **Your turn**.
- Room `ZOVGTV` (Tactician nick `L51Spy`): Shop-buy Spy (always-upgraded); after resolve,
  opponent live numbers (not `?`); Super attack dialog CostDisplay + Upgrade delta; token
  chips from the seat toward the action log.
- Room `BRXKPO` (nick `L51Dead`, forfeit): center **You are dead** (~1.6s) then Game over
  (Protocol v30 stays on that dialog). **You won!** not forced this pass — same first-paint
  seed as dead (`view-model/table-banner.test.ts`).

### Lot 51 follow-up verified 2026-08-27 (browser, PROTOCOL 30)

- Room `A1HICW` (nick `L51Fx`, Kamikaze vs 1× Normal): opponent resources are a vertical
  column of four `?` icons beside the portrait; Regeneration inspect is **Cost** + coin/heart
  glyphs, no “Choose Use, Upgrade, or Sell.”; buy-upgrade spend coins dock → log.
- Room `UYHZH` (nick `L51Ghost`): sell yield coins log → Alpha (gain). Action-verso ghost
  enqueued seat/portrait → log (96×144, tokenFlyout). Landscape opponents strip `40dvh` so
  the seat is not clipped.
- Thief seat-to-seat chips remain unit-tested (`stealTransferChips`); not forced in this
  browser pass (hands rarely held Thief).

### Lot 51-13 verified 2026-08-28 (browser, PROTOCOL 30)

- Room `GDYM1C` (nick `L51Fx13`, Indestructible): Draw coin chips log↔dock; Regeneration+
  (1 life / 2 points) flies two coins dock→log and one heart log→dock. Playing
  Regeneration does not fly a card to the center.
- Buy/sell card ghosts are ~48×72 and fade in ~0.5s (no lingering full-size log card).
  Destination is the pending/card-band midpoint on the felt. Thief live Δ still flies
  victim→thief (1 directional chip when both `?`; same-tick sell yield fills a net-0 Δ).

### Lot 51-14 verified 2026-08-29 (browser, PROTOCOL 30)

- Room `NOJYLL` (nick `L51Chip`, Indestructible): Draw +1. Flying point chip is
  **icon-only** over the felt — no raised-surface tile, no card border. Still at
  t=1.05s: coin center gold `(185, 152, 17)`; 22px corners match felt pink
  `~(244, 193, 194)`, not log/raised white `~(245, 243, 241)`.
- Overlay chrome stays `asCard === true` only (buy/sell ghosts). Resource
  `tokenFlyout` uses `object-contain` + drop shadow. Playbooks updated in the
  same change (`frontend.md`, `testing.md`, `decisions.md`).

### Lot 51-16 verified 2026-08-29 (browser, PROTOCOL 30)

- Room `DOMKYZD` / table nick `L51Fx16`, Specialist vs 1× Normal (Alpha).
- Absorber+ (cost 3) on Alpha while Strong attack was pending on POV: small
  Absorber ghost hand → felt center; gold coins in flight at the same time as
  hearts (Strong resolve −2 life). Coins visible both near the log and arriving
  on the Points dock — spend and gain legs, not a single net chip.
- Mutual equal/weaker attack vs Alpha's Strong still cancels (Round 2 log);
  cancelled attacks correctly fly no `livesLost` chips from the `?` seat.
  **Superseded by Lot 54:** a weaker *answer* is kept and the incoming still
  resolves; equal still cancels both. Do not treat a weaker answer that lands as a
  V6 defect.

### Lot 53 verified 2026-08-31 (browser, `TURN_DURATION_MS=300000`, PROTOCOL 30)

Phone-first crowding pass after the six-player Classic merge. Specialist / mixed kits vs
**5 Easy bots**. Skip How to play / Skip all hints.

- Room `OGPSGK` (nick `L53Phone`): first pass used wrap + vertical scroll (superseded by
  L53-07).
- Room `LKFOCS` / `LK47DCS` (nick `L53Mobile`): landscape collapse Dialogs were cropped
  (`items-end` + `90dvh`) — superseded by L53-07.

### Lot 53-07 verified 2026-08-31 (headless Chrome, exact viewports, PROTOCOL 30)

Re-checked the playtest screenshots: wrap+vertical scroll cropped names, Specials grew
on their own, 844×390 Dialogs/buttons sat off-screen. Contract is now one shared width,
one row, horizontal scroll, height-fit (never crop).

- Room `MUMAMB` (nick `L53Look`), Specialist vs 5 Easy bots. Headless Chrome, exact
  390×844 / 844×390 viewports at deviceScaleFactor 2 (not a 1280×800 desktop shot).
- Portrait: Hand and Specials both **81×133**, `overflow-x: auto`, `overflow-y: hidden`,
  `flex-wrap: nowrap`. Names not clipped. Hand `scrollWidth` 431 > `clientWidth` 368.
- Landscape: cards **71×118** both, **same y**, `data-side-by-side=true`. Left column
  hugs (Opponents 44px, Action log 50px — no empty white 1fr slab). Shop / card /
  Opponents / Action log Dialogs: `inViewport` and Close/Cancel fully on-screen
  (Shop Close bottom 374 in 390; Opponents seats `headerH` 20, `iconClipped: false`).
- `pnpm verify` green (1144 tests).

Designer follow-up: the L53-07 recording still cropped Thief **Cancel**, Opponents
off the left, and the Action log title (empty white slab). Overlay is sized to
`visualViewport` (not `100dvh` / `fixed inset-0`) with panel `max-h-full` /
`min(preferred, 100%)`. Room `OEDLPQ` (nick `L53Crop`): portrait 390×844 Thief
dialog Cancel right 373 ≤ 390 (Sell + Cancel wrap); landscape 844×390 Action log
title + body + Close in view; Opponents first seat left 47, Close in view.

Designer follow-up: Incoming chips were a sliver on every viewport (`max-h-9` on
the identity row) and Hand / Specials sat flush left. Incoming is a full-width
chip row; short card rows pack to `w-max` and center with `mx-auto`.

- Room `DELQZF` (nicks `L53DockA` / `L53DockB`), Specialist vs Specialist, guest
  Basic attack → host Incoming. Headless Chrome; `pnpm verify` 1147 tests.
- **1280×800:** Hand left/right gap **307/307**, Specials **354/354**. Incoming
  chip **42×207**, row **62px** tall, in dock (not a sliver).
- **390×844:** Incoming chip still **42px** tall in dock. Five 88px hand cards
  overflow and scroll from the start (`mx-auto` collapses).
- **768×1024:** Hand **207/207**, Specials **240/240**, Incoming chip **42px**.

Designer follow-up: desktop landscape starved opponents and the log in a
10.5rem strip. Room `AQJXJW` (nick `L53Desk`, Specialist vs 5 Easy). Headless
Chrome **1280×800:** table **1280×800** (full viewport); opponents column
**482px** (~38% of the felt); action log **482×578**; dock **782px**; **5**
seats on the row. **844×390** keeps the **168px** (10.5rem) column so the hand
fits (chrome collapsed as specified for height ≤ 500px). `pnpm verify` 1149
tests.

Designer follow-up: opponents collapse before the action log, and flyouts
keep playing toward the leftover buttons. Room `RBWXPX` (nick `L53Foes`,
Specialist vs 1 Easy). Headless Chrome; `pnpm verify` 1150 tests.

- **844×560:** opponents **collapsed**, action log **on the felt**
  (panel **302×415**). Token chips still fly to `opponents-collapsed`.
- **390×530:** same order (Opponents button, log stays).
- **844×390:** Incoming / opponents / log all collapsed. Draw paints a
  point chip onto `log-collapsed` (chip at **62,328** vs button **13,333**).

Designer follow-up: the table must fill the window at every size. Room
`NOGGDW` (nick `L53Fill`). Headless Chrome; table `getBoundingClientRect`
matches `innerWidth`×`innerHeight` (origin 0,0) at **390×844**, after a
grow to **1100×800**, **844×390**, and **1280×800**. `pnpm verify` 1151
tests.

Designer follow-up: the hub/menu could not scroll after the full-bleed
`overflow: hidden` lock, and landscape collapsed the action log into a
bottom button with empty slate after opponents. Home (and lobby) scroll
inside `#root`; the table does not page-scroll. Short viewports collapse
Incoming and opponents; leftover left-column height stays on the log.

- Room `EYPXBT` (nick `L53Log`), Specialist vs 5 Easy. Headless Chrome;
  trust `innerWidth`/`innerHeight` and `getBoundingClientRect`. `pnpm verify`
  **1156** tests.
- Home Play solo **844×390:** `main` `overflow-y: auto`, `scrollHeight` 845 >
  `clientHeight` 390; `scrollTop` 0 → 455.
- Home Play solo **390×500:** `scrollHeight` 1123 > 500.
- Table **844×390:** table **844×390**; opponents collapsed (**44px**);
  action log **on the felt** **168×259** (grid rows `44px 0px 259px`);
  `data-collapse-log=false`. No document page-scroll.
- Table **390×844:** table fills; Incoming / opponents / log stay expanded.

Designer follow-up: faces still filled the dock at the 88px cap, and
Incoming sat on its own full-width row. Floor **22** / cap **48**. Incoming
beside the kit, stacked, vertical scroll (`max-h-14`).

- Solo nick `L53Face` at **390×844:** `data-card-width` **48**, rendered face
  **48×84**. **844×390:** same 48px cap, Hand/Specials side by side.
- Room `IJCPGG` (host `L53In`, guests `L53AtkA` / `L53AtkB`). Portrait
  Incoming **beside the kit** (kit top **347**, Incoming top **347**, left
  **93** > kit right **51**), height **56**, **2** chips, `overflow-y: auto`.
- `pnpm verify` **1158** tests.

### Lot 54 verified 2026-09-01 (browser, `TURN_DURATION_MS=300000`, PROTOCOL 30)

Classic Spy price in the live Shop: play cost **2** on the card face, buy **4**
(double). Room `ZIDABK` (nick `SpyPrice`, Solo vs 1 Normal). Mutual / volley /
overlay covered by engine and `score-engage` unit tests; `pnpm verify` **1166**
tests.

### Lot 47 verified 2026-09-01 (browser, `TURN_DURATION_MS=300000`, PROTOCOL 30)

Hub + table Feedback, password-gated `/inbox`. `INBOX_PASSWORD=lot47-inbox`, no
`DATABASE_URL` (local 503 copy). Vite `:5173`, server `:2567`.

- Hub: How to play + Feedback; **no Inbox** control. Empty message keeps Send
  disabled. Submit shows **Not saved (no database)**; Cancel closes.
- Table `!` (aria-label Feedback) on the turn strip next to `?`; Draw + Shop
  stay on the dock. Solo nick `Ada`, 1× Normal. Same 503 copy on Send.
- `/inbox`: no rows until Open. Wrong password → **Wrong password**. Correct
  password without Postgres → **Could not load**. First playtest saw both as
  Could not load until Colyseus OPTIONS `X-Inbox-Password` was allowed.

Merged `origin/main` after L53-07 / Lot 54: Incoming stays beside the kit
(stacked, `max-h-14`); Feedback `!` stays on the turn strip, not the Incoming
column. Spy shop play **2** / buy **4** is Lot 54, not a feedback regression.

### Lot 48 verified 2026-09-07 (browser, `TURN_DURATION_MS=300000`, PROTOCOL 30)

First-time stranger path on the **current** tree (Lots 49–54 already shipped).
One browser. Vite `:5173`, Colyseus `:2567`, migrated Postgres, `INBOX_PASSWORD`
set (value not recorded). No product defects; nothing rewound.

- **Hub:** **Beta** (word only); Play online / Play solo / Tutorial / How to play
  / Feedback. No Inbox link; no `Protocol v`.
- **Soft gate:** Tutorial click opens How to play. Primer Goal → Turns → Lives →
  Points → Cards → Upgrade → Kits → Special cards → Shop (resource glyphs). No
  delayed-resolution section. Skip continues.
- **Tutorial** nick `L48Host`. Room `YKULWV`. No turn timer. 11-step board tour
  (Got it) then Look (portrait click, no Got it) then indices **0–30** to a
  human win. Incoming **Basic / Spy / Strong / Thief** chips sit beside the kit;
  Feedback `!` stays on the turn strip. Index 3 non-upgraded Basic; equal cancel
  left Alpha at 4 lives. Tax twice at +4 (base). Shop bought an upgrade point
  then Absorber (not Basic). Title **Tutorial complete** (Protocol v30). Play a
  real game → hub. Ask-once Feedback did not auto-open on that recap (opened
  from Classic Game over **Feedback** instead).
- **Classic Easy** 1 opponent, nick `L48Classic`. Room `EAXQFM`. First-game
  hint **Your turn** (spec §5.2 body, not tutorial coach) — tutorial did not
  `skipAll`. Table **?** opened How to play with no extra log line. Shop Spy
  selected: buy **4** points (blurb “prices are double the play cost” → play
  **2**). Alpha **BOT · Easy**.
- **Phone:** 390×844 and 844×390 — one-row hand, shared Specials width, **no
  pager**, faces not cropped. Landscape Incoming (1) beside the kit. A 2p hand
  that fits without scroll is not a fail.
- **Forfeit:** flag **Stay** kept the table; **Forfeit** kept the socket →
  Game over (not Tutorial complete); `L48Classic eliminated (leave)`; winner
  Alpha; Download action log present under `pnpm dev`.
- **Inbox bar:** POST `/api/feedback` 200, body `playKind: classic`,
  `protocolVersion: 30`, topics `ui`, **no seed**. `/inbox` wrong password →
  **Wrong password** (401). Correct password lists the Classic row (kind Bug,
  About UI, message, code `EAXQFM`, protocol 30, log tail, **no seed**).
- Watch point: weaker-answer mutual was not hunted; Lot 54. Missing How to play
  PNGs omitted `<img>` as wired.

### Lot 56 verified 2026-09-09 (browser, `TURN_DURATION_MS=300000`, PROTOCOL 31)

Solo Classic, Vite `:5173`, Colyseus `:2567` (`protocol v31`). Invisibility
handler stays in repo; circulating shop/Prophet/Transformer pools are unit-
tested (L56-02). Shared shop tiles never listed Invisibility (special, not
shared). Auto-loss `persistentDeactivated` lines are engine-tested (L56-07);
this gate did not drain a counter to 0. Mirror picker doubled damage is
unit-tested (`listedAttackDamage` × multiplier); no Mirror sub-choice opened
in the rooms below.

- Room `XTISAZ` nick `L56Gate` vs Easy Alpha. Shop: Basic overlay **1**,
  Strong **2**, Super **7**; Absorber/Spy/Thief/Mirror/Shield/Tax/Regen
  icon-free. Log card names open inspect (Block / Basic); no Spy footer.
  Incoming **Thief** chip click → Thief inspect, no Spy footer. Hand Basic
  overlay **1**.
- Room `HMCBFY` nick `L56Gate` vs Normal Alpha. Alpha Points Generator:
  opponent thumb with card-lives **3** under the art; inspect from that
  thumb shows **Active** + **Card lives** 3. Incoming **Super attack**
  chip **7**, click → Super inspect (art overlay 7, “Deal 7 damage”), no
  Spy footer. Play log attack lines show listed damage.
- Room `GVPKLD` nick `L56Gate2` vs Normal Alpha. Shop same 10 shared tiles
  (no Invisibility). Log **Absorber** / **Spy** clicks open inspect with
  art + effect, no Spy footer. Hand Strong overlay **2**, Super **7**.
  Absorber Use **−3**, Spy Use **−2**.
- Watch point: shop blurb still appends the selected tile’s
  `CostDisplay` after “Prices are double the play cost” (looks like a
  stray **−2** when Basic is selected). Pre-existing; not Lot 56.
- `pnpm verify` **1274** tests.

### Lot 57 verified 2026-09-14 (browser, `TURN_DURATION_MS=300000`, PROTOCOL 31)

Solo Classic, Vite `:5173`, Colyseus `:2567`. Nick `L57Gate` vs Alpha. Room
`JUYNBZ`.

- Live table turn strip: **?** then compact **`!`** (not the word Feedback),
  then code / timers; flag on the right. Economy bar has Draw / Shop only.
- Flag → Leave the game? → Forfeit → Game over stats (Winner Alpha,
  L57Gate eliminated leave). **Return home** opens ask-mode Feedback: title
  **Feedback**, lead **Skip is fine.**, Kind Bug / Confusion / Idea, About
  chips, Message, Contact (optional), **Skip** + Send. Not the one-sentence
  stub.
- Skip → hub (Play online / Play solo / Tutorial / How to play / Feedback).
- `pnpm verify` **1283** tests.

### Lot 57 rematch verified 2026-09-15 (browser, `RECONNECT_GRACE_MS=5000 TURN_DURATION_MS=300000`, PROTOCOL 32)

Two-tab Classic online, Vite `:5173`, Colyseus `:2567`. Compact table **`!`**
unchanged (not the word Feedback). Tutorial still auto-starts with Skip
tutorial (not Forfeit). Claim picker is walk-in / lobby-guest only so a
living host can still Draw.

- Room `TPHFVU` HostA + GuestB. Host Start grey until Guest Ready. Kick
  confirm **Kick this player?** removed bot Alpha. Guest forfeit → Game
  over. Host **Play again** opened ask-once Feedback (**Skip is fine.**);
  Guest recap stayed (not yanked). Guest Play again sat Not ready in the
  same-code lobby; Start grey again.
- Same room, mid-match SpecC join: **Watching**, opponent hands/kits
  visible. GuestB drop → picker **Sit as a disconnected player?** listing
  GuestB. After grace, Host Draw ×3; log **GuestB is eliminated by
  absence**; picker gone. Host Play again seated SpecC as unready lobby
  guest.
- Room `MWSELQ` HostC + GuestC + SpecE. After GuestC tab X, picker
  pre-selected GuestC with full **Stay spectating** / **Sit here**. Sit
  here remapped SpecE onto GuestC (private hand). HostC never saw the
  picker. Tutorial room `VWLXXS` nick TutA: **?** / **`!`**, flag **Skip
  the tutorial?**
- `pnpm verify` **1331** tests.

### Lot 57 Ready chrome + claim fog verified 2026-09-15 (browser, `RECONNECT_GRACE_MS=5000 TURN_DURATION_MS=300000`, PROTOCOL 33)

Two-window Classic online, Vite `:5173`, Colyseus `:2567`. Room `KNPSCI`.

- Guest **Ready** is green with a check. Seat ready is a colored check/cross
  column left of nicknames. Host Start enables after Guest Ready.
- Walk-in SpecC with picker open: opponent portraits are `?` (no kit art,
  resource `?`). **Stay spectating** then shows kits and live lives.
- Watching copy does not claim every hand is visible until a `spied` overlay
  is on the view.
- `pnpm verify` **1337** tests.

### Lot 58 verified 2026-09-15 (browser, `TURN_DURATION_MS=300000`, PROTOCOL 32)

Two-tab Classic, Vite `:5173`, Colyseus `:2567` (`protocol v32`). Host nick
`L58Host2` Tactician, guest `L58Guest2` Kamikaze, room `EMIVWS`. Invisibility
did not deal from the shop this gate (handler / pacifist / card-lives whitelist
are unit-tested in L58-06). Points Generator 3/6 is unit-tested in L58-04; it
did not appear on this table.

- Shop: upgrade-point **icon + count** above Buy/Sell. Empty pool: **Buy random
  −1** disabled, copy “The pool is empty.” After a Mirror sell, Pool (1) **Buy
  random −1** enabled; log `L58Host2 bought Mirror + from the pool`. After a
  second sell, **Buy random −2**. Tactician shop Spy still play-2 / buy-4 (↑).
- Economy bar: Unspy −10 grey with no living spy. After Spy resolved on the
  host, open eye on `L58Guest2` and Unspy enabled. SeatTile picker preselects
  the sole spy; Confirm readable; log `L58Host2 unspied L58Guest2`; eye gone;
  points 24 → 14. Overlay never involved.
- First Unspy Confirm in room `LMXQDQ` was a false hang: seat color made the
  only tile look selected while Confirm stayed disabled and shrank. Sole-spy
  preselect + `whitespace-nowrap` landed before this gate.
- Watch point: shop blurb still appends the selected tile’s `CostDisplay`
  after “Prices are double the play cost” (Lot 56, not Lot 58).
- `pnpm verify` **1316** tests.

### Lot 58 designer follow-up verified 2026-09-15 (browser, PROTOCOL 32)

Two-tab Classic, Vite `:5173`, Colyseus `:2567`, room `WYZIDP`. Host nick
`L58HostF` Tactician, guest `L58GuestF` Kamikaze.

- Shop: **Upgrade points** title plus the upgrade-point icon; **no** live count.
  Buy **−10** points and **+1** upgrade-point. Sell **+7** points and **−1**
  upgrade-point.
- Unspy picker hint **Choose who is spying you.** (lists the opponent who is
  spying you, not who you spy). After Confirm, public log
  `L58HostF got unspied from L58GuestF`; open eye gone; Unspy greys.
- `pnpm verify` **1318** tests.

### Lot 59 verified 2026-09-15 (browser, `TURN_DURATION_MS=300000`, PROTOCOL 34)

Solo Easy, Vite `:5173`, Colyseus `:2567`, nick `L59Dock`, room `ZPHQBS`.
Skip all first-game hints.

- Economy bar: green Draw face is **+1** point icon only (no word Draw);
  orange **Shop** still spelled; purple Unspy is crossed-eye **−10** (no word
  Unspy). Compact width — no 7rem min.
- Draw click: points 9 → 10; log `L59Dock draws`. Hover title is the button
  name (`Draw, plus 1 pt`) — `CostDisplay` `title={null}` so the spoken-cost
  tooltip does not steal it. Unspy stays grey with no living spy; click does
  not open the picker.
- `pnpm verify` **1381** tests.

### Lot 60 verified 2026-09-15 (browser, `TURN_DURATION_MS=300000`, PROTOCOL 35)

Solo Classic, Vite `:5173`, Colyseus `:2567`.

- Immediate forfeit (room `FITHWU`, 0 turns): winner header (Alpha / Kamikaze
  portrait, seat color), compact `L59Gate eliminated (leave)`, **No awards this
  match** (every recap stat 0). Footer: purple Excel, orange Feedback / View
  board, green Play again, red Return home. Play again still reforms the lobby.
- Three Draws then forfeit (room `FWNEMK`, 4 turns): award tiles with kit
  portraits, kit names, seat-colored nicknames — Most points spent / gained,
  upgrade points used, cards sold (Alpha); Fewest attacks + Most draws
  (`L59Play`); Most attacks / cards played (Alpha). Ask-once Feedback still
  intercepts first leave / Play again.
- `pnpm verify` **1417** tests.

### Lot 62 verified 2026-09-18 (browser, `/admin` Overview, no protocol bump)

Vite `:5173`, Colyseus `:2567`, local Postgres with two seeded finished games
(`LOT62A` humans-only, `LOT62B` mixed) plus one feedback row. Password
`INBOX_PASSWORD` unlock. `pnpm verify` **1473** tests after the NaN format
guard.

- Overview nine modules: General, Volume, Gameplay, Economy, Combat, Hidden
  tools, Bots and seats, Endings, Retention and feedback. CSS/SVG bars, pie,
  scatter. Download Excel writes `admin-overview.xlsx`.
- Actors on Gameplay / Economy / Combat / Hidden / Bots headers; Humans
  reloads seat series without dropping match mix (2 finished matches).
- Combat: attack lives lost vs **Non-attack life loss** (Tax caption). Seed
  showed 4 attack lives / 2 non-attack.
- Empty: Seat count **8** → Finished matches **0**, modules still on screen,
  Volume day **No data**, occupancy pie zeros. First paint uses **Loading…**
  not an empty flash. Formatters treat non-finite numbers as **—**.

### Lot 63 verified 2026-09-20 (browser, solo Gambler, PROTOCOL 36)

Vite `:5173`, Colyseus `:2567`, `TURN_DURATION_MS=300000`. Solo Normal, nickname
`L63Gate`. Room **JFBMCN**. `pnpm verify` **1523** tests after What’s new.

- Kit picker last cell is **Gambler**. Inspect: 1 life, 0 points, 0 UP,
  Draw +10, action/attack 0, Roulette special, Draw risk 1 in 10, ability copy
  names Roulette and the bust.
- Opening deal: 1 life, 0 points, empty hand, 6 specials including Roulette
  (plus five circulating, none of them a second Roulette).
- First action Draw: log `L63Gate draws` (safe path), points 10. Roulette Use
  −10 arms a persistent with **2 card lives** and grants a shared card into
  Hand on the same turn. Placeholder kit/Roulette art only.
- Hub compact **New** auto-opens What’s new. Heading **New** lists Gambler kit
  (1 life, Draw 10, 1-in-10 bust) and Roulette special (cost 10, 2 card lives).

### Lot 63 nerfs (L63-05) verified 2026-09-20 (browser, PROTOCOL 37)

Vite `:5173`, Colyseus `:2567`. Hub What’s new `lot-63`: Sentence / Imposition /
Super Absorber before **New** Gambler + Roulette. Solo nickname `NerfCheck`,
Assassin, room **LVPDTD**. Kit inspect Sentence **−20**. Table inspect: Cost 20,
“After 3 of your later turns (this play does not count)”. `pnpm verify` **1540**
tests.

### Lot 63 pool-buy log fog (L63-06) verified 2026-09-20 (browser, PROTOCOL 37)

Vite `:5173`, Colyseus `:2567`, `TURN_DURATION_MS=300000`. Two-tab Classic
online, nicks `AliceFog` / `BobFog`, room **WZAUOW**. Alice Wizard, Bob
Kamikaze. Alice sold Tax into the shop pool (faces stay public), then **Buy
random**. Buyer log: **AliceFog bought Tax from the pool**. Opponent log:
**AliceFog bought a card from the pool**. Live `ACTION_PLAYED` matches.
`pnpm verify` **1552** tests. No protocol bump.

### Lot 64 verified 2026-09-21 (browser, PROTOCOL 39)

Vite `:5173`, Colyseus `:2567`. Solo Normal, nicks `L64Gate` / `L64Pulse2`.
Rooms **KTECTTG**, **LAWADL**. `pnpm verify` **1570** tests.

- Opening deal: 1 life, 0 points, empty hand, **3 specials including Roulette**
  (two circulating, no second Roulette). Compact Draw no word label.
- Draw payout rerolls each of your turns. `L64Gate` first Draw **+9 green**;
  later **+21 red**. `L64Pulse2` **+44 red** then **+10**, then **+32 red**.
  Red when payout `> 10`. Motion pulse is 0.45s at turn start (`MOTION_PULSE_S`);
  reduced-motion / load timing can hide it on capture — source and tests pin it.
- Wipe log: **L64Gate gambled too much and lost everything**. No elimination line.
  Hub What’s new latest id `lot-63` (Gambler/Roulette folded into the original
  lot-63 New bodies; no `lot-64` release id).

### Lot 66 verified 2026-09-28 (browser, PROTOCOL 40)

Vite `:5173`, Colyseus `:2567`, `TURN_DURATION_MS=300000`.

- Solo Play again (one human seat) left the room and opened the solo menu in Lot 67. The Lot 66 instant restart is superseded.
- Base Upgrade Point Thief opens Choose target. The upgraded copy does not. Upgrade spends the turn.
- Active Poison inspect offers Upgrade and spends the turn and the upgrade point.
- Ticking Sentence: chip inspect uses the catalog face. Activated art throws and blanks the table, so the dialog must not request it. With 1 upgrade point the same dialog shows Upgrade. Room **XXDIJM** (Ada Assassin, Bea). Click logs **Ada upgraded a card**, drops the upgrade point to 0, leaves the chip at 3, and passes the turn.

### Lot 67 verified 2026-09-28 (browser, PROTOCOL 40)

Vite `:5173`, Colyseus `:2567`, `TURN_DURATION_MS=300000`. No protocol bump.

- Solo Play again, room **IKDWUN** (L67Solo, Assassin, 2 Easy bots). Forfeit, then Play again. Home opens **Play solo** with Assassin, opponent **2**, and **Easy**. **Start solo game** stays up. The next match does not deal itself.
- Active Shield upgrade, the Gambler wipe banner, and Imposition above 7 are locked by engine and client tests (`upgrade-card.test.ts`, `view-model/table-banner.test.ts`, `imposition.test.ts`).

Attack Choose target and Assassin multi-attack seats are living opponents, plus an eliminated player who still has an attack pending on you (`attackTargetOpponents`). Thief Choose target also includes an eliminated player who still has a Thief pending on you. Spy and the other living-only pickers stay living-only. The server still rejects an attack or Thief on a corpse with nothing of that kind pending.

### Lot 72 verified 2026-10-27 (browser, `TURN_DURATION_MS=300000`, PROTOCOL 45)

Vite `:5173`, Colyseus `:2567`, nick **L72Gate**, viewports 375×812, 844×390 and 1440×900 in the
built-in browser pane. Baseline: a detached worktree at `d530a8a` (the commit before L72-01),
rooms **LUQDWX** (lobby) and **VNLEVA** (solo, 3 Easy bots).

- **Design gate (§12.4):** `.impeccable/config.json` holds only the pre-approved
  `radial-spotlight-glow` / `dark-glow` ignore on `ui/tokens.css`, plus the four
  `design-system-font` ignores on `.superpowers/brainstorm/` boards (§12.4 exemption, 4494d34);
  no `ignoreRules` or `ignoreFiles`, no `impeccable-disable`, `hook.cache.json` gitignored.
  `detect` on `ui/`, `screens/arena/` and `assets/art/`: exit 0, 17 advisories, 0 primary
  (PNGs are unscannable). URL scans of `/dev/ui` at 375×812 and 1440×900: the Q3b halo on
  `.v7-ground` is the only allowed finding. One real low-contrast finding (unplayable chips) is
  fixed below. The V2 `tutorial-pulse` dark glow from `index.css`, the gallery-frame
  `nested-cards` and a gallery-fixture repeat are false positives. Critique notes are in the
  Lot 72 PR.
- **Side by side (§4.4):** with `?ui=classic`, Home and lobby **EYTJLL** match the baseline
  style hash at both sizes (Home `8a605ac8` / `216884e1`, lobby `2cc969fa`). Solo **YSUSRL**
  and its Game over keep the V2 look. Every screen loads Outfit only, with no V7 font and no
  ground. What's new opened on `lot-72-v7` ("New look").
- **Switch (§4.4):** `?ui=next` stores `card-battle.v7.ui = 'next'`, and it survives `/`. Solo
  **ELIEIJ** mounts `ArenaScreen` (a pass-through to `TableScreen`), and so does its finished
  board (`EndScreen`). `?ui=classic` clears the key. Tutorial **LWKIFB** stays classic with the
  key set (React fiber probe, past the board tour).
- **`/dev/ui`:** the production build ships no gallery chunk. All 11 sections render at
  375×812 and 1440×900, with the ground off `html`, `body` and `#root`, Fredoka, Lilita One and
  Nunito loaded and no page overflow. `chat-body` is **16px**, 44 px tall, maxLength 200, and
  every field is 16 px. The Dialog overlay equals `visualViewport` at 375×812 and 844×390
  (bottom sheet, gap 0) and at 1440×900 (centred), with `aria-modal` and no `100dvh`. A
  read-only sheet closes on a 260 px mouse drag of its handle (`left_click_drag`; a drag on the
  title only selects text); the blocking picker stays open.
- **Art (§5.5):** `extract-art.ts` regenerates the 31 card and 16 kit PNGs byte for byte, and no
  screen imports `artFor` yet. Contact sheet signed off 2026-10-27 by the designer, with the
  enclosed old-ground pockets removed per the designer (e2beae8, 33b897c).
- **Pre-merge (§4.6):** `lot-72` reached `origin/main` on 2026-10-27 (PR #79, 5719b89). The
  branch then merged `dev` (lobby host fix, #78), so `lot-72` lists three items.
- Fix: an unplayable `Card` dimmed its cost and damage chips with the rest of the body (damage
  label 2.6:1). The chips, the "+" badge and the counter badge now sit in an undimmed `marks`
  layer. `pnpm verify` **2613** tests.
