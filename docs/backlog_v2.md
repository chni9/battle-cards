# Backlog — Card Battle V2

> **Active task tracker** for the V2 visual layer. Scoped by `docs/technical_spec_v2.md`.
> V1 (engine, protocol, four screens) is closed — see `docs/backlog_v1.md` (archive).
> **Keep each task's status current as you finish it** — see `/AGENTS.md` §9.
> Open decisions are tracked in `agent/decisions.md`, not duplicated here.
>
> Split from the former combined `docs/backlog.md` on 2026-08-01.

Status values: `To do` · `In progress` · `Done` · `Blocked`

## How to read this

**Sequencing principle**

- Two phases: **static design system** first (Lots 10–13) — tokens, components, asset
  integration, all four screens restyled — then **animation** (Lot 14) on top of a working
  static base. Static must be fully playable and presentable on its own if animation slips
  (technical spec v2 §2).

**Execution order**

- Follow the ID order. The "Depends on" column gives the strict prerequisites. Two tasks with
  no shared dependency can be run in parallel, but a solo developer gains little from that.

**Complexity**

- S: one agent pass, quick review. M: several passes, careful review. L: to be broken into
  sub-tasks by the agent before any code is written.

**Risk**

- High: an error here triggers no alert and surfaces weeks later. Read the produced code line
  by line, don't settle for green tests.
- Medium: error detectable while playing, but costly to fix after the fact.
- Low: error visible immediately.

**References**

- Technical spec v2 §N refers to `technical_spec_v2.md`. Rules and engine truth still come
  from `spec_bataille_des_cartes_en.md` and `technical_spec_v1.md` — V2 changes neither.
- Client conventions: `docs/agent/frontend.md`.

**Scope lock**

- Same 4 screens, same client-server contract, same audience (friends, web only) — no new
  rule, card, kit, mode, or screen. A V2 task that looks like it needs a new protocol event
  or a rule change is out of bounds: stop and ask (V1 golden rule 6).

**V2-specific watch points**

- There is no automated test for "looks good." Definition of Done for a V2 task is
  `pnpm verify` green (nothing about styling breaks typecheck/lint/existing tests) **plus**
  a visual check the developer signs off on — screenshots or a live look, not just green CI
  (technical spec v2 §8).
- The illustration/icon assets already exist in the `images/` folder (outside this repo) —
  see `technical_spec_v2.md` §4 for the confirmed mapping. **Never invent a mapping for an
  ambiguous or missing asset.** Ask.
- `docs/agent/frontend.md` stays the live reference for client conventions (connection hook,
  visibility rules, degraded states). V2 tasks restyle; they update that file's examples in
  place rather than forking a second source of truth.

**Out of scope**

- The 11 other kits and their cards (despite art existing), Team/God/Quick modes, new screens,
  mobile-first/onboarding for strangers, bots, accounts, in-progress persistence, monetization
  — technical spec v2 §9.

## Progress

9 of 22 V2 tasks done. Active from Lot 12.

| Lot | Tasks | Done |
|---|---|---|
| 10 · Design system foundations | 5 | 5 |
| 11 · Home and Lobby | 3 | 3 |
| 12 · Table | 8 | 1 |
| 13 · End screen | 1 | 0 |
| 14 · Animation | 5 | 0 |

## Milestones

| Milestone | Reached at the end of | What must be true | Expected proof |
|---|---|---|---|
| **M6** | Lots 10–13 · Static visual layer | All four screens restyled with the design system and V1 asset subset; fully playable without animation. | Developer visual sign-off on Home, Lobby, Table, End; `pnpm verify` green; no protocol/rule change. |
| **M7** | Lot 14 · Animation | Card flip, resolution, elimination/reward, Mirror/Assassin, and timer motion communicate state without inventing information. | Each L14 acceptance met; animations never block intents or become client-authoritative for timers. |

_Task count = number of tasks in the lot named in column B only, not the cumulative count since the start._

## Lot 10 · V2 design system foundations

### L10-01 · Tailwind and Motion setup — `Done`

Add Tailwind CSS and Motion (`motion` package, formerly Framer Motion) to `apps/client` via
`pnpm add`, base Tailwind config, confirm the Vite build and `pnpm verify` stay green.

- **Reference** Technical spec v2 §3 · **Depends on** nothing (V1 complete) · **Complexity** S · **Risk** Low
- **Watch point** Dependency additions must go through `pnpm add` so the lockfile updates — never hand-edit `package.json` (AGENTS.md §3).
- **Acceptance** `pnpm dev`, `pnpm typecheck`, `pnpm lint` all pass with Tailwind classes and one trivial Motion animation rendering in the client

### L10-02 · Design tokens from source assets — `Done`

Extract a color palette and typography scale from the existing illustrations and generic
assets (resource icons, colored buttons, card backs), encode them as the Tailwind theme.

- **Reference** Technical spec v2 §5 · **Depends on** L10-01 · **Complexity** M · **Risk** Medium
- **Watch point** This is a subjective creative decision, not a derivable rule — **no palette
  ships without the developer looking at it and saying yes.** Do not present it as a fait accompli in a commit message.
- **Acceptance** Tailwind theme config committed; developer has reviewed and approved the palette/type scale against the real assets

### L10-03 · Asset pipeline and mapping table — `Done`

Copy the confirmed V1 subset of illustrations into `apps/client/src/assets/`, build a typed
lookup (`KitId` → portrait, `CardId` → base/upgraded/activated art) from the mapping table in
technical spec v2 §4, including the `scientific → Scientist.png` and `absorber → Absorption.png`
mappings decided in this session.

- **Reference** Technical spec v2 §4 · **Depends on** L10-01 · **Complexity** M · **Risk** High
- **Watch point** A wrong or guessed mapping puts incorrect art on a card every kit can hold — silent, and nobody will report a bug for "wrong flavor art." Only wire the confirmed table; leave any still-unconfirmed entry as an explicit placeholder, not a guess.
- **Acceptance** Every V1 `CardId` and `KitId` resolves to the correct file at both upgrade states where they exist; no import of an out-of-V1-scope asset (the other 11 kits, non-V1 cards)

### L10-04 · Base components — `Done`

`Card`, `ResourceIcon` (life / point / shield / upgrade point), `Button`, connection/status
badge — built once, reused by every screen.

- **Reference** Technical spec v2 §5 · **Depends on** L10-02, L10-03 · **Complexity** M · **Risk** Low
- **Acceptance** Home, Lobby, Table and End all consume these components — no screen redefines its own card or icon markup

### L10-05 · Generic elimination treatment — `Done`

One visual treatment (not per-kit art) applied to any eliminated player's portrait — developer
ruling 2026-08-01: no "(dead)" illustration per kit, including Kamikaze, which has none today.

- **Reference** Technical spec v2 §2 · **Depends on** L10-04 · **Complexity** S · **Risk** Low
- **Acceptance** An eliminated player of any V1 kit renders the same generic treatment; no code path looks for a per-kit dead asset

## Lot 11 · V2 Home and Lobby

### L11-03 · Shared Dialog / ActionSheet — `Done`

Accessible modal primitive (overlay, title, body, action slots) reused by Home/Lobby smoke
paths and by Table prompting in L12-08. Primary/secondary actions use existing `Button`
variants. No new dependency unless ruled later.

- **Reference** Technical spec v2 §5, §6 · **Depends on** L10-04 · **Complexity** M · **Risk** Low
- **Acceptance** Focus trap, Esc, overlay dismiss, `aria-modal`, labelled title, reduced-motion
  safe; reusable from at least one Lot 11 screen

### L11-01 · Home screen redesign — `Done`

Nickname entry, create/join, using the Lot 10 component set and L11-03 where needed. Same
intents, same validation, no new field. Branded composition with decorative V1 kit/card art
from the asset lookup only.

- **Reference** Technical spec v2 §6 · rules spec/tech spec v1 §7 (screen: Home) · **Depends on** L10-04, L11-03 · **Complexity** M · **Risk** Low
- **Acceptance** Create and join both work exactly as today, visually redesigned; muted Protocol
  vN remains visible

### L11-02 · Lobby screen redesign — `Done`

Seated players, game code (with copy affordance), host Start — restyled. Copy success may use
L11-03.

- **Reference** Technical spec v2 §6 · tech spec v1 §7 (screen: Lobby) · **Depends on** L11-01 · **Complexity** S · **Risk** Low
- **Acceptance** 2–4 player lobby flow unchanged functionally, visually redesigned

## Lot 12 · V2 Table

### L12-01 · Table layout shell — `Done`

Overall structure: opponents band, private zone, log panel, action bar, pending-effects queue,
timers — responsive to 2, 3, and 4 seated players.

- **Reference** Technical spec v2 §6 · tech spec v1 §7 (Table) · **Depends on** L10-04 · **Complexity** L · **Risk** Medium
- **Watch point** The action log is the screen's main organ (AGENTS.md §L1-12 watch point) — the redesign must not demote it to a sidebar.
- **Acceptance** All existing Table zones present and legible at 2, 3, and 4 players

### L12-02 · Opponent zone — `Done`

Nickname, lives/shield/status via `ResourceIcon`, card count, connection badges (reuse L9-01
states), Spy-revealed kit/cards.

- **Reference** Technical spec v2 §4, §6 · frontend.md (visibility, degraded states) · **Depends on** L12-01 · **Complexity** M · **Risk** Medium
- **Watch point** Zero rule logic on the client (AGENTS.md §"Conventions") — this restyles what `stateUpdate` already sends, it does not decide what is visible.
- **Acceptance** Every opponent-zone field the current client shows is still shown, same visibility rules, new look

### L12-03 · Private zone and hand — `To do`

Hand with real card illustrations (base/upgraded art swap), kit portrait, exact resources via
icons, special cards.

- **Reference** Technical spec v2 §4, §6 · **Depends on** L10-03, L12-01 · **Complexity** M · **Risk** Medium
- **Watch point** Upgrade state must select the `+` asset variant, never a manual per-card `if` — reuse the L10-03 lookup.
- **Acceptance** Every held card shows the correct base/upgraded illustration; kit portrait matches `kitId`

### L12-04 · Pending effects queue — `To do`

Visual queue of effects in flight (source, card, target), restyled.

- **Reference** Technical spec v2 §6 · tech spec v1 §7 (Pending effects queue) · **Depends on** L12-01 · **Complexity** S · **Risk** Low
- **Acceptance** Same information as today's queue, new look

### L12-05 · Action log panel restyle — `To do`

Reskin `apps/client/src/action-log/action-log-panel.tsx` (L9-02) with the Lot 10 components.
No change to `action-log.ts` logic or the `ActionLogEntryView` shape.

- **Reference** Technical spec v2 §6 · **Depends on** L10-04 · **Complexity** M · **Risk** Low
- **Watch point** `rewardsClaimed` stays opaque (product ruling, decisions.md 2026-08-01) — the restyle must not surface the two reward picks.
- **Acceptance** Same browsable history, same entry kinds, new look; `action-log.test.ts` unchanged and green

### L12-06 · Economy action bar restyle — `To do`

Restyle the remaining non-card action chrome: Draw, buy/sell upgrade points, Leave, and any
economy that is not “click a held card.” Card play / upgrade / sell / target / quantity /
Assassin / Mirror / reward prompting moves to L12-08.

- **Reference** Technical spec v2 §6 · frontend.md · **Depends on** L12-01, L10-04 · **Complexity** M · **Risk** Low
- **Watch point** Intent payloads for Draw and upgrade-point buy/sell stay unchanged — restyle
  only.
- **Acceptance** Draw and upgrade-point buy/sell (and Leave) still send the same intents as
  today, new look; no duplicate Play/Upgrade/target chrome once L12-08 lands

### L12-07 · Timers and degraded states — `To do`

Turn timer and sub-choice timer as a visual progress element; absent/idle badges restyled per
existing conventions.

- **Reference** Technical spec v2 §6 · frontend.md (Timer display, Degraded states) · **Depends on** L12-01 · **Complexity** M · **Risk** Medium
- **Watch point** The timer display stays cosmetic — trust `turnDeadlineMs` / `deadlineMs` from the server, never a client-only authority (frontend.md, unchanged rule).
- **Acceptance** Same timer behavior and degraded-state thresholds as today, new visual treatment

### L12-08 · Card-first action UX — `To do`

Make own hand and special card images the primary way to act: click opens Dialog actions
(Use / Upgrade when eligible / Sell when card-scoped); nested Dialog for opponent target and
other prompts (Regeneration quantity, Assassin multi-attack, Mirror choice, elimination
rewards, buy flows that need prompting). Self-only Use is one-shot (no confirm). Spy-revealed
opponent cards open an inspect-only Dialog. Unavailable cards are not clickable and show a
tooltip with the reason. Removes Play / Upgrade / target chrome from the action bar. Same
intent payloads as today — UI-only (technical spec v2 §6 ruling).

- **Reference** Technical spec v2 §5, §6 · frontend.md · **Depends on** L11-03, L12-01, L12-03 · **Complexity** L · **Risk** Medium
- **Watch point** Zero rule logic on the client; never change payload shapes. All Table user
  prompting must go through the shared Dialog. Do not invent visibility or affordances the
  view does not already support.
- **Acceptance** Every play/upgrade/sell/target/quantity/Assassin/Mirror/reward path still
  sends the exact same intent as today; own cards clickable; Spy-revealed inspect-only;
  illegal cards non-interactive with reason tooltip; Play/Upgrade/target bar controls gone

## Lot 13 · V2 End screen

### L13-01 · End screen redesign — `To do`

Restyle the L9-03 output: winner, `FinishedStateView.recap`, return-home action.

- **Reference** Technical spec v2 §6 · **Depends on** L10-04 · **Complexity** S · **Risk** Low
- **Acceptance** Same recap data displayed, new look; no change to `build-view-for.ts`

## Lot 14 · V2 Animation

### L14-01 · Card flip and reveal — `To do`

Hand entry, upgrade-state reveal, play-to-table motion.

- **Reference** Technical spec v2 §7 · **Depends on** L10-01, L12-03 · **Complexity** M · **Risk** Low
- **Watch point** Purely presentational — must not delay or block the intent being sent to the server.
- **Acceptance** Animation plays on the actions it targets, never blocks or delays the underlying intent

### L14-02 · Action-resolution animation — `To do`

Visual effect tied to `actionResolved.outcome` (`applied` / `cancelled` / `immune`).

- **Reference** Technical spec v2 §7 · frontend.md (`actionResolved.outcome === 'immune'`) · **Depends on** L14-01, L12-04 · **Complexity** M · **Risk** Medium
- **Watch point** Three distinct outcomes need three distinct, honest visual treatments — do not animate `cancelled` or `immune` as if the effect landed.
- **Acceptance** Each of the three outcomes has a visibly distinct animation

### L14-03 · Elimination and reward-sequence animation — `To do`

Elimination moment, then the reward sub-choice sequence (chainable at multi-elimination).

- **Reference** Technical spec v2 §7 · frontend.md (Elimination rewards) · **Depends on** L14-02 · **Complexity** L · **Risk** Medium
- **Watch point** Must stay correct through a chained multi-elimination (up to 6 choices in a row at 4 players, per L6-02) — test the animation at the edge case, not just a single elimination.
- **Acceptance** A multi-elimination sequence animates every step without getting visually stuck, matching the underlying prompt/lock state

### L14-04 · Mirror and Assassin animation — `To do`

Mirror redirect sub-choice, Assassin multi-attack targeting.

- **Reference** Technical spec v2 §7 · frontend.md (Mirror, Assassin) · **Depends on** L14-02 · **Complexity** M · **Risk** Low
- **Acceptance** Both interactions remain fully usable within their existing timers with the animation on

### L14-05 · Timer motion — `To do`

Motion polish for the turn and sub-choice timers (e.g. a depleting ring/bar), on top of L12-07's
static treatment.

- **Reference** Technical spec v2 §7 · **Depends on** L12-07, L10-01 · **Complexity** S · **Risk** Low
- **Watch point** Cosmetic only — the countdown must still derive from server `deadlineMs`, never drift into a client-authoritative timer.
- **Acceptance** Visual countdown matches the server deadline within a small, imperceptible tolerance
