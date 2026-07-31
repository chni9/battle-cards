# Technical spec — Card Battle, version 2 (Visual design)

> Implementation document for the V2 visual layer. It contains no game rule and changes no
> engine behavior, protocol event, or screen flow — refer to `technical_spec_v1.md` (engine,
> protocol, Definition of Done — still authoritative) and `spec_bataille_des_cartes_en.md`
> (rules) for everything this document does not cover. V1 was complete (63/63 backlog tasks)
> before this document was written.
>
> Scoped and validated with the developer on 2026-08-01. Where this document records a
> decision, it is either a direct developer instruction from that session or an explicit
> inference flagged as such — never an invented default.

---

## 1. Objective and non-objectives

### Objective

Give Card Battle's client a real visual identity: a design system, the existing card and kit
illustrations, custom iconography for the four resources, and game-quality motion — applied to
the exact same four screens and the exact same client-server contract V1 already ships.

What V2 has to prove:

- the existing illustrations and icons integrate cleanly into a consistent design system
- the four screens read better than the current unstyled client without any of them changing
  what a player can do
- animation communicates game state (whose action, what outcome, whose turn) instead of just
  decorating it

### Non-objectives

This document defines no game rule, adds no screen, and does not change the audience.
Specifically out of scope, per the 2026-08-01 session:

- No new game rule, card, kit, or mode. The 11 kits and content outside V1 stay out (technical
  spec v1 §9) — their art exists in the shared asset folder but is not wired in.
- No new screen beyond Home / Lobby / Table / Game over.
- No protocol change. `PROTOCOL_VERSION` stays at 18 unless a V2 task proves a change is
  unavoidable — if that happens, stop and get it ruled on before bumping it, same as any V1
  protocol change.
- No mobile-first requirement and no onboarding designed for strangers. Audience is unchanged:
  Yassine and his friends, web only.
- No per-kit "eliminated" illustration. One generic visual treatment covers every kit,
  including Kamikaze, which has no such asset today.
- L9-02 (browsable action log) and L9-03 (end screen) are not being re-implemented — both are
  `Done` in `docs/backlog_v1.md`. V2 restyles their existing output.

---

## 2. V2 scope

Full redesign of every screen and every shared component: buttons, opponent zone, private
zone, action log, pending-effects queue, timers, action bar. Integration of the existing card
and kit illustrations. Custom iconography for the four resources (lives, points, upgrade
points, shield). Game-quality animation: card flip/reveal, action-resolution reveal,
elimination and reward sequence, Mirror and Assassin interactions.

This is a substantial scope for a solo developer — comparable in size to the larger lots of
V1 (L1-07, L3-07, L5-xx), not a cosmetic pass. It is sequenced in two phases for exactly that
reason:

1. **Static design system** (Lots 10–13): tokens, components, asset integration, all four
   screens restyled. Fully playable and presentable on its own if animation slips.
2. **Animation layer** (Lot 14): built on top of a working static base, never a dependency for
   having something shippable.

---

## 3. Stack

| Layer | Choice | Reason |
|---|---|---|
| Styling | Tailwind CSS | Utility-first, fast for a solo developer without a dedicated designer, centralizes the palette/type scale as config (design tokens) rather than scattering values across components. |
| Animation | Motion (`motion` package, formerly Framer Motion) | Orchestrates multi-step sequences (card flip, resolution reveal, staggered reward choices) declaratively; avoids hand-rolled CSS keyframe chains for anything non-trivial. |
| Assets | Static files copied from the developer's `images/` folder into `apps/client/src/assets/` | The illustrations already exist (see §4) — no generation, no external asset pipeline. |

Both packages are added to `apps/client` via `pnpm add` (L10-01), never by hand-editing
`package.json` (AGENTS.md §3 — the lockfile must stay the single source of truth for
dependencies). Record the installed versions in `docs/agent/decisions.md` once L10-01 lands,
the same way L0-01's tooling choices are recorded there rather than restated in prose here.

**Alternative considered:** CSS Modules / plain CSS, zero added dependency. Rejected by
developer instruction in favor of Tailwind + Motion, trading a slightly larger dependency
surface for materially faster iteration on a solo timeline — recorded as a deliberate choice,
not a default.

---

## 4. Asset inventory and mapping

Source: a 120-file `images/` folder on the developer's machine, outside this repo, covering
illustrations for the **full 15-kit / ~20-card game**, not just the V1 subset. V2 wires in
**only** the V1 subset below; everything else is present for a future phase and must not be
imported or referenced by any V2 task.

### 4.1 Kits (4 in V1 scope)

| `KitId` (code) | Kit name (code) | Asset file(s) |
|---|---|---|
| `untouchable` | Untouchable | `Untouchable.png` |
| `kamikaze` | Kamikaze | `Kamikaze.png` |
| `scientific` | Scientific | `Scientist.png` **— name mismatch, confirmed mapping, no rename** |
| `assassin` | Assassin | `Assassin.png` |

**No "eliminated" portrait for any kit is used in V2** (developer ruling, 2026-08-01) — see
§2 and Lot 10, L10-05. The `(dead)` files that exist for 13 of the other 11-kit set, and the
absence of one for Kamikaze, are both irrelevant under this ruling.

### 4.2 Cards (16 in V1 scope)

| `CardId` (code) | Card name (code) | Asset file(s) | Note |
|---|---|---|---|
| `basic-attack` | Basic attack | `Basic attack.png`, `Basic attack +.png` | |
| `strong-attack` | Strong attack | `Strong attack.png`, `Strong attack +.png` | |
| `super-attack` | Super attack | `Super attack.png`, `Super attack +.png` | |
| `spy` | Spy | `Spy.png`, `Spy +.png` | |
| `thief` | Thief | `Thief.png`, `Thief +.png` | Not `Card Thief` / `Attack Thief` / `Upgrade Point Thief` — those are other kits' out-of-scope specials |
| `mirror` | Mirror | `Mirror.png`, `Mirror +.png` | Not `Super Mirror` (out of scope) |
| `shield` | Shield | `Shield.png`, `Shield +.png` | |
| `tax` | Tax | `Tax.png`, `Tax +.png` | |
| `regeneration` | Regeneration | `Regeneration.png`, `Regeneration +.png` | Not `Super Regeneration` (out of scope) |
| `absorber` | Absorber | `Absorption.png`, `Absorption +.png` | **Confirmed mapping, code id/name unchanged.** Neither `Card Absorber` (Warrior's special) nor `Super Absorber` (Specialist's special) — both distinct out-of-scope cards, confirmed against the rules spec's own kit roster. Developer confirmed the rename Absorber→Absorption is not happening in code; only the asset mapping resolves the naming gap. |
| `suicide` | Suicide | `Suicide.png`, `Suicide +.png` | |
| `spy-thief` | Spy Thief | `Spy-Thief.png`, `Spy-Thief +.png` | |
| `imposition` | Imposition | `Imposition.png`, `Imposition +.png`, plus `Imposition (activated).png`, `Imposition + (activated).png` | Activated state maps to "internal counter not yet depleted" (rules spec §5, technical spec v1 L5-02) |
| `cloning` | Cloning | `Cloning.png`, `Cloning +.png` | |
| `sentence` | Sentence | `Sentence.png`, `Sentence +.png` | |
| `points-generator` | Points Generator | `Generator.png`, `Generator +.png`, plus `Generator (activated).png`, `Generator + (activated).png` | Name shortened in the asset (`Generator` vs `Points Generator`) — same activated-state logic as Imposition |

### 4.3 Generic assets

| Purpose | Asset file(s) |
|---|---|
| Resource icons | `life.png`, `point.png`, `shield_point.png`, `upgrade_point.png` |
| Card backs | `verso attack card.png`, `verso action card.png`, `verso_special_card.png`, `verso kit.png` |
| Card-type logos | `attack_logo.png`, `action_logo.png` |
| Generic opponent avatar | `opponent.png` — **assumed** use: placeholder for an opponent zone before their kit is revealed (unspied). Flagged, not yet confirmed by the developer. |
| Colored action buttons | `purple_button.png`, `yellow_button.png`, `green_button.png`, `red_button.png`, `orange_button.png` — **assumed** use: generic UI action buttons, not a per-kit color code. Flagged, not yet confirmed by the developer. |

The two "assumed" rows above must be confirmed (or corrected) before L10-04 builds the base
`Button` component around them — do not let an assumption silently become the shipped design.

### 4.4 Explicitly not wired in V2

The other 11 kits (Specialist, Tactician, Ghost, Warrior, Witch, Prophet, Magician, Juggernaut,
Indestructible, Upgrader, Wizard — names per the rules spec roster) and every card belonging
only to them (MEGA ATTACK, Super Mirror, Super Regeneration, Super Absorber, Card Absorber,
Attack Thief, Card Thief, Upgrade Point Thief, Card Transformer, Block, Reanimation,
Invisibility, Curse, Poison). Their art already exists for a future content phase — V2 must not
reference, import, or build UI affordances for any of it, per golden rule 7 (technical spec v1
§9 / AGENTS.md).

---

## 5. Design system foundations

Tokens (color palette, typography scale, spacing) are **not fixed in this document** — they
must be derived from looking at the real illustrations and generic assets (§4), which is a
visual/creative judgment call, not something to invent from a filename list. This is L10-02's
job, and it ends with the developer explicitly signing off on the palette and type scale
before any screen is built on top of it. Treating a first draft as final without that sign-off
would repeat the exact "never invent a rule, ask" discipline this project already applies to
game rules — here applied to visual decisions instead.

Base components (L10-04), built once and reused by every screen:

- `Card` — renders a `CardInstance` (base/upgraded art, cost, effect text) from the L10-03
  asset lookup.
- `ResourceIcon` — the four resource icons, each with its numeric value.
- `Button` — the shared action button, using the design tokens from L10-02 (and the colored
  button assets, once §4.3's assumption is confirmed).
- Connection/status badge — reused from the existing degraded-state model (`frontend.md`), only
  its appearance is new.

---

## 6. Screens

Same four screens as `technical_spec_v1.md` §7, same flows, same intents. Only the visual
treatment changes.

| Screen | V2 scope | Backlog |
|---|---|---|
| Home | Nickname entry, create/join — redesigned | Lot 11, L11-01 |
| Lobby | Seated players, game code, host Start — redesigned | Lot 11, L11-02 |
| Table | Layout shell, opponent zone, private zone/hand, pending queue, action log, action bar, timers — redesigned, this is the largest surface | Lot 12 |
| Game over | Winner, `FinishedStateView.recap`, return home — redesigned | Lot 13, L13-01 |

No screen gains a field, a control, or an intent it doesn't already have. Where a redesign
seems to call for one (e.g. a rules/help affordance), that is a scope decision for the
developer to make explicitly — it is not assumed here.

---

## 7. Animation scope

Identified moments, each tied to an existing protocol event or client state — animation never
invents new information, it stages what the client already receives:

| Moment | Trigger | Backlog |
|---|---|---|
| Card flip / reveal | Hand entry, upgrade-state reveal, play-to-table | Lot 14, L14-01 |
| Action resolution | `actionResolved.outcome` (`applied` / `cancelled` / `immune`) | Lot 14, L14-02 |
| Elimination and reward sequence | `playerEliminated`, `rewardChoiceRequired` (chainable) | Lot 14, L14-03 |
| Mirror / Assassin interaction | `mirrorChoiceRequired`, `playMultipleAttacks` targeting | Lot 14, L14-04 |
| Timer motion | `turnStarted.deadlineMs`, sub-choice deadlines | Lot 14, L14-05 |

Constraint carried over unchanged from V1: the timer display stays cosmetic. Motion polish
never becomes a client-side source of truth for a deadline (`frontend.md`, unchanged).

---

## 8. Definition of Done — V2

Unlike V1, "correct" alone is not sufficient for a visual task — there is no automated test for
"looks good." A V2 task is done when:

- [ ] `pnpm verify` is green — typecheck, lint, and every existing test, unchanged in behavior
- [ ] No protocol event, payload shape, or rule changed, unless explicitly flagged and ruled on
      first (see §1 non-objectives)
- [ ] No V1 test was weakened, skipped, or deleted to accommodate a visual change
- [ ] The developer has looked at the result (screenshot or live) and signed off — a green
      `pnpm verify` on a design task is necessary, not sufficient
- [ ] The task's own Acceptance line in `docs/backlog_v2.md` is satisfied
- [ ] Status flipped to `Done` in `docs/backlog_v2.md`, in the same change as the code
- [ ] Committed with a Conventional Commit referencing the task id (AGENTS.md §10)

---

## 9. Out of V2 scope

Not to be implemented, even partially, even "to lay groundwork" — same discipline as technical
spec v1 §9:

- The 11 other kits and their cards, despite their art already existing in the shared assets
- Team, God, and Quick modes
- Any new screen (rules/help, spectator view, settings, etc.) not listed in §6
- Mobile-first layout or an onboarding flow designed for players who don't already know the
  rules
- Bots, accounts, persistence of an in-progress game, monetization — unchanged from V1
- Any protocol version bump not first ruled on the same way a V1 protocol change would be
