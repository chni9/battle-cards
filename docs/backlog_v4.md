# Backlog — Card Battle V4

> **Active task tracker** for V4 (full content: 15 kits, 20 special cards, Classic mode).
> Scoped by `docs/technical_spec_v4.md`.
> V1 (engine, protocol, screens), V2 (visual layer) and V3 (bots, solo, simulation) are closed —
> see `docs/backlog_v1.md`, `docs/backlog_v2.md`, `docs/backlog_v3.md` (archives).
> **Keep each task's status current as you finish it** — see `/AGENTS.md` §9.
> Open decisions are tracked in `agent/decisions.md` and listed in technical spec v4 §11, not
> duplicated here.

Status values: `To do` · `In progress` · `Done` · `Blocked`

## How to read this

**Sequencing principle**

Five phases, in this order, and the order is not negotiable.

1. **Foundations (Lot 20).** Five latent defects, ten primitives, one refactor of the sub-choice
   subsystem, one decoupling of attack-ness from the shop list, and the declaration of the 14 new
   card ids — which comes early because the attack-ness decoupling cannot compile without
   `mega-attack` existing as a `CardId`. Every task here is a prerequisite for at least two cards,
   and five of them fix defects in the shipped build.
2. **Special cards (Lots 21–26), ordered by which subsystem they stress** — not alphabetically and
   not by price. Cards that only compose Lot 20's primitives first; cards that bend the turn loop
   or reverse elimination last.
3. **Kits (Lots 27–28).** Every kit's starting specials must already have a handler, so kits come
   after cards. Seven kits are catalog entries; four need code (`upgrader`, `prophet`, `ghost`,
   `duplicator`).
4. **Bot policy (Lot 29).** Deliberately after the content: a scoring branch written against a card
   that does not exist is written against a guess.
5. **Client surfaces and simulation (Lots 30–31).** The simulation screen closes V4 — it is the
   deliverable that makes the content measurable.

**Execution order**

Follow the ID order. The "Depends on" column gives strict prerequisites. Two tasks with no shared
dependency can run in parallel, but a solo developer gains little from that.

**Complexity**

S: one agent pass, quick review. M: several passes, careful review. L: to be broken into sub-tasks
by the agent before any code is written.

**Risk**

High: an error here triggers no alert and surfaces weeks later. Read the produced code line by line,
do not settle for green tests. Medium: detectable while playing, costly to fix afterwards. Low:
visible immediately.

**References**

Technical spec v4 §N refers to `technical_spec_v4.md`. Rules truth stays
`spec_bataille_des_cartes_en.md`; engine, protocol and Definition of Done truth stay
`technical_spec_v1.md`; bots and simulation stay `technical_spec_v3.md`.
Conventions: `docs/agent/engine.md`, `card-handler.md`, `protocol.md`, `frontend.md`, `db.md`,
`testing.md`.

**Scope lock**

- **No value is changed anywhere in V4.** Not a price, not a damage number, not a starting resource,
  not a counter. A task that appears to need a rebalance stops and asks.
- **No rule is invented.** Every case the rules spec does not resolve is an entry in technical spec
  v4 §11. A task blocked on one stays `Blocked`; a §11 **recommendation is not a licence to
  implement**, and an acceptance criterion may not encode an unruled interpretation.
- **No new mode.** Team, God and Quick are out. A task that would "prepare" for them is out of
  bounds.
- `PROTOCOL_VERSION` is bumped **exactly once** for the whole of V4, in **L20-18**, because that
  task replaces a message pair and cannot land on a stale version. No other task bumps it.

**V4-specific watch points**

- **All five Lot 20 defect fixes are pre-existing bugs, not V4 features** (technical spec v4 §3.3).
  Two of them — the bot fallback and the hardcoded immunity check — are in the same policy file and
  share one task (L20-17); the other three have their own. Do not fold any of them into a card task
  where they will be invisible in review.
- **The bot's fallback play score equals the draw score exactly**, and ties break with `rng.pick`
  over all joint-top actions. At least four cards already in the game are played near-randomly.
  **The published gross-imbalance screen was produced under that defect**, so its per-kit figures
  cannot be compared to a V4 run until the fallback is fixed and the V3 baseline re-run (L20-17,
  L31-01).
- **Every value in technical spec v4 §8 is a transcription.** Re-verify each one against
  `spec_bataille_des_cartes_en.md` at implementation time, one by one. A wrong damage or price
  number triggers no alert anywhere.
- **`kit-inspect-dialog.tsx` renders traits from hand-written sections.** Every new trait is
  silently invisible to players until someone writes its section. No `satisfies` catches it.
- **Adding a card must still not modify another card's handler, nor the engine.** If it does, the
  primitive it needs is missing — add the primitive in Lot 20 (`card-handler.md` golden rule 2).

---

## Lot 20 — Foundations: latent defects, primitives, subsystem refactors

Nothing in Lots 21–31 starts before this lot closes.

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L20-01 | Replace the pool `instanceId` derivation. `poolDeactivatedPersistentEffects` derives ids from `state.pool.length`, unique only while the pool never shrinks. Use a monotonic counter on `GameState` — never `GameState.seed`, which must stay server-only — and classify the new field as server-only in the view builder in the same change. That file's header comment claims the ids are "seed-derived"; fix the lie too. **Acceptance:** a test drives pool growth, removal and growth again and proves no id repeats. **Watch point:** `instanceId` is the addressing key for `playCard` / `sellCard` / `upgradeCard` and for reward card picks — a collision is silent and cross-player. | S | **High** | — | Done |
| L20-02 | Replace the tautological `pool.test.ts` "never shrinks" test, which captures the length and asserts the same length with nothing in between. Replace with the §10.4 invariant: every `instanceId` in the pool is unique at every point, and a card removed from the pool sits in exactly one player's zone. **Acceptance:** the new test fails if L20-01 is reverted. | S | Medium | L20-01 | Done |
| L20-03 | Make `GameState.pool` public in `PlayingStateView` and reconstruct it in `enumerationStateFromView` (hardcoded `pool: []` today). Update `engine.md`'s "never read the pool" entry to the new rule. **Acceptance:** `list-legal-actions-view-guard.test.ts` passes with a `canPlay` that reads pool contents. **Watch point:** rules spec §1 already calls the pool visible to all players — this catches the view up, it does not relax visibility. | S | Medium | L20-01 | Done |
| L20-04 | Declare the 14 new special card ids and their static catalog entries (name, price, `effect`, `upgradeEffect`), all listed in `PENDING_CARD_IDS`. **This comes before L20-05 by necessity:** the attack-ness decoupling declares `mega-attack` in a `Record<AttackCardId, …>`, which cannot compile until `mega-attack` is a `CardId`. **Acceptance:** `SPECIAL_CARD_IDS` has 20 entries, the registry compiles with 14 pending, playing a pending special is rejected and never crashes, and every price matches §8.1 checked one by one. | M | Medium | — | Done |
| L20-05 | Decouple attack-ness from the shop list (§4.1). `ATTACK_CARD_IDS` stays the three buyable, dealable attack cards; add `SPECIAL_ATTACK_CARD_IDS`; `AttackCardId` becomes the union; `isAttackCardId` tests both; `ATTACK_DAMAGE` gains `mega-attack: { base: 20, upgraded: 20 }`. Classify **every** `isAttackCardId` call site and every `ATTACK_CARD_IDS` membership test by hand — roughly thirty and six respectively; there is no mechanical rule. Do not miss the two **local redefinitions in the client**, in `action-log.ts` and `table.tsx`: `action-log.ts` uses it in the "deals damage" sense, so its two branches need the union, not the shop list. **Acceptance:** `ATTACK_CARD_IDS` still has 3 entries; `applyDamage` accepts `mega-attack`; no shop, deal, `cardPlayNeedsTarget` or multi-attack path can produce it; the client logs a MEGA ATTACK with attack phrasing and handles a fully shield-absorbed one. | M | **High** | L20-04 | Done |
| L20-06 | Rename `v1-scope.test.ts` to `content-scope.test.ts` and rewrite its **card-side** assertions for the 30-card set (§10.5): 3 attack + 7 action + 20 special ids, no id repeated, every `isAttackCardId` id in exactly one of the two attack arrays, the two arrays disjoint, `ATTACK_DAMAGE` covering their union, all ids kebab-case. The 15-kit assertion is deliberately **not** here — it is false until Lot 28 and lands in L28-03. **Acceptance:** the file no longer mentions V1 and the card counts match §8. | S | Low | L20-05 | Done |
| L20-07 | **Blocked on #V4-2 and #V4-3.** Delete the "all damage values are distinct" claim from `engine.md` golden rule 4 and technical spec v1 §6.3, and add the tests that were never written: a mutual pair between two *different* cards brought to equal final damage by `damageMultiplier` cancels both; unequal final damage cancels the weaker; a player holding several pending attacks against one source has a defined pairing. **Acceptance:** a test proves a once-redirected basic attack (2) cancels a strong attack (2). **Watch point:** this is a documentation bug in the shipped build, reachable today with an upgraded Mirror. If the designer rules for card identity instead of final damage, that is a behaviour change to existing code and moves to its own task. | M | **High** | — | Done |
| L20-08 | Add `gainPoints(player, amount, origin)` and `gainUpgradePoints(player, amount, origin)` (§4.2) and convert the **14** existing increment sites — 10 for points, 4 for upgrade points. Note `grantYield` in `transfers.ts` is already a partial funnel for sale proceeds and should route through the new primitive rather than around it. `origin` is `'direct' \| 'duplicated'`, required by Duplicator's no-loop rule. **Acceptance:** no production file outside the two primitives contains `points +=` or `upgradePoints +=` on a `Player`; a test or lint rule enforces it. **Watch point:** these are gains, so the life cap does not apply — do not copy `gainLives`'s clamp reflexively. | M | Medium | — | Done |
| L20-09 | Route or explicitly exempt the 5 direct `player.lives` mutations that bypass the two life primitives: self-Suicide and Sentence in `resolve-pending.ts`, two in `elimination-rewards.ts`, and `cloning.ts`'s resource copy. Document each exemption with its reason in `engine.md`. **Acceptance:** every remaining direct mutation carries a cited comment explaining why it is not a typed loss. **Watch point:** golden rule 2 — do **not** merge or enrich `applyDamage` / `applyLifeLoss` to solve this. | M | **High** | — | Done |
| L20-10 | Extract `takeCardFrom(victim, instanceId)` and add `stealRandomCard(victim, rng, filter?)` in `engine/cards/steal-card.ts` (§4.2). `elimination-rewards.ts`'s private `takeCardFromEliminated` becomes a caller. Re-homing goes through `transferCardInstance` so `alwaysUpgraded` applies. **Acceptance:** elimination reward behaviour unchanged, proven by the existing tests passing untouched; the random draw uses the injected `rng` (golden rule 5). | S | Medium | — | Done |
| L20-11 | Add `downgradeAllCards(victim)` returning the count, and `stealUpgradePoints(source, target)` (§4.2). The latter is the **first writer of `TurnLedger.upgradePointsLostToTheft`**, a field that has existed since V1 and is written nowhere. **Acceptance:** a test proves upgraded Absorber captures `upgradePointsSpent` and not `upgradePointsLostToTheft`. **Watch point:** nothing recomputes `isUpgraded` from the kit at read time, so setting it to `false` holds — and rules spec §5 says copies acquired *afterwards* come back upgraded, which `acquireCardToHand` already does. | S | Medium | — | Done |
| L20-12 | Add `cancelPendingEffect(state, effectId, reason)` and the `'blocked'` value on `ActionResolvedEvent.outcome` (§4.2). Today the only cancellations are mutual attacks, the Spy/Thief counter, and Cloning's blanket `pendingEffects = []`. **Acceptance:** the client action log and `aggregate-action-log.ts` both handle the new outcome — both currently `switch` on outcome with no `default`. | S | Medium | — | Done |
| L20-13 | Add `deactivatePersistentEffect(state, ownerId, effectId)` (§4.2). Note the existing asymmetry: `poolDeactivatedPersistentEffects` pushes to the pool but does not remove from `activePersistentEffects` — the caller does; the new primitive does both. **Acceptance:** a persistent with `counter: null` can be deactivated manually and lands in the pool exactly once. | S | Low | — | Done |
| L20-14 | Add `takeFromPool(state, instanceId)` (§4.2, §4.3) — the pool's first read path, in the engine rather than in the Card Absorber handler, per `card-handler.md` golden rule 2. **Acceptance:** removal is by `instanceId`, the removed instance is returned for the caller to re-home via `transferCardInstance`, and §10.4's uniqueness invariant still holds after a removal. | S | Medium | L20-01, L20-02 | Done |
| L20-15 | Add `duplicatePendingEffect(state, effect, newTargetId)` (§4.2) and the `redirectedBy: 'mirror' \| 'super-mirror' \| null` field on `PendingEffect` (§4.7). The primitive mints a fresh unique id and preserves `damageMultiplier` and the original `queuedAt` — `queueEffect` resets both, `redirectPendingAttack` moves rather than copies, so neither can be reused. Propagate the field to `PendingEffectView`, `build-view-for.ts`, `enumerationStateFromView`, `export/turn-history.ts`, `persistent-incoming.ts` and the xlsx export. **Acceptance:** N duplicated effects carry N distinct ids; `listEligibleMirrorTargets` filters on `redirectedBy`. **Watch point:** six test files construct `PendingEffect` literals directly rather than via `queueEffect`. | M | **High** | L20-05 | Done |
| L20-16 | Add the consecutive-turn grant (§4.5): a dedicated `Player` field, intercepted in `advanceTurn` itself — **not** in `finishTurnPhases`, which a reward-triggering turn bypasses via `resumeAfterRewards`. `turnSequence` still increments on each granted turn (RNG streams are seeded from it, so freezing it repeats every draw). Classify the field in the view builder in the same change, and add the remaining-turn count to `TurnStartedPayload`. **Acceptance:** a granted chain of 3 produces 3 distinct `turnSequence` values and 3 distinct RNG streams; the client can tell turn 2 of 3 from a new turn. **Watch point:** the counter must **not** live in `PersistentEffect.counter`, which `applyDamage` decrements per life lost. | M | **High** | — | Done |
| L20-17 | Residual heuristic policy fixes (§3.3 #4 and #5). Sentence / Imposition / Spy Thief / Points Generator already branched (decisions.md 2026-08-04); this task keeps the `scorePlayCard` fallthrough at `sustain − UNSCORED_PLAY_PENALTY` so any remaining unmodelled play never ties `{ type: 'draw' }`, and derives `isImmuneTarget` from `KitTraits.immuneTo` via engine `isImmuneTo` instead of hardcoding `untouchable` / `spy` / `thief`. **Acceptance:** test proves fallthrough paths (e.g. non-Kamikaze Suicide, Cloning without Spy signal, weak Absorber) never beat `draw` across rng seeds; test proves a spied kit's `immuneTo` trait is honoured even when the kit id is not `untouchable`. **Watch point:** immunity derivation changes bot behaviour when new immune kits land; L31-01 re-runs the published screen. | S | Medium | — | Done |
| L20-18 | Factor the sub-choice subsystem (§4.4) **and bump `PROTOCOL_VERSION` 22 → 23 here**, once for all of V4, because this task replaces a message pair. One generic `SubChoiceState` discriminated on `kind`, one slot **and** one queue on `GameState` (Mirror is a slot, rewards are a queue with an active head — both shapes are needed), one `SUB_CHOICE_MS`, one timer registry in `game-room.ts` replacing the `mirrorTimer` / `rewardTimer` / paused-ms triplication, one `subChoiceRequired` / `resolveSubChoice` pair replacing two, and `continuePendingSubChoices` as one loop. Unify the gate, currently in `performTurnAction` for rewards only, in `game-room.handleAction` for Mirror only, and nowhere in `listLegalActions`. Sub-choice state stays **outside `StateView`**, unicast as its own event, as today. **Acceptance:** Mirror and reward behaviour unchanged, proven by every existing V1/V2/V3 test passing **untouched**; §10.2's single-gate test passes; `protocol-version.ts` documents what changed. **Watch point:** this is a refactor, not a rewrite. If a test needs editing to pass, the refactor changed behaviour — stop. | **L** | **High** | — | Done |
| L20-19 | **Blocked on #V4-30.** Confirm the player count stays 2–4 and record the ruling. Three sites hold the bound: `batch-config.ts`, `lobby-rules.MAX_PLAYERS`, `game-room.maxClients`; `createInitialState` imposes no maximum. **Acceptance:** the ruling is in `decisions.md`; if it is "unchanged", the task is documentation only and touches no code. | S | Low | — | Done |

---

## Lot 21 — Specials: economy and theft

Cards that compose Lot 20's primitives and touch nothing else.

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L21-01 | Extend the 20-point random special purchase to draw from all 20 specials — the 6-card restriction was ruling §6.2 #10, a scope artefact. **Acceptance:** the draw uses the injected `rng` over `SPECIAL_CARD_IDS`; a test proves a pending-handler special is granted and unplayable (#V4-29). | S | Medium | L20-04 | Done |
| L21-02 | `super-regeneration` (+9 / +18 lives through `gainLives` with `GameState.lifeLimit`) and `upgrade-point-thief` (mass UP theft + `downgradeAllCards`, 1 UP per upgrade removed; upgraded also steals all points). **Acceptance:** tests for base and upgraded; a test proves an upgrade removed from a kit-trait-upgraded copy yields 1 UP and that a copy acquired *afterwards* arrives upgraded again; the ruled Counter Rule scope is tested. | M | Medium | L20-11, L20-04 | Done |
| L21-03 | `card-thief`: steals a random card from a chosen opponent, a chosen card if that opponent is spied per the #V4-35 ruling; upgraded steals from every opponent. **Acceptance:** tests for base, upgraded and the spied branch; `list-legal-actions-view-guard.test.ts` passes; the stolen card's identity reaches the thief and the victim only, never the public action log. | M | Medium | L20-10, L20-18, L20-04 | Done |

---

## Lot 22 — Specials: persistent and periodic effects

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L22-01 | `poison`: persistent, counter 3, all opponents lose 1 life per turn (2 upgraded), applied on each victim's turn after their action. Reuses the Imposition tick pattern in `apply-persistent-effects.ts` and the `spy-thief` multi-target pattern. **Acceptance:** the counter decrements only when the *user* loses a life to damage, never on `applyLifeLoss`; at 0 the card deactivates and joins the pool; tests cover 2, 3 and 4 players. | M | Medium | L20-04 | Done |
| L22-02 | `curse`: the chosen victim loses 1 life per 3 points spent on their turn (per 2 upgraded), deactivating when the victim reaches 1 remaining life — it cannot finish them off. Reads `TurnLedger.pointsSpent` and **not** `pointsLostToTheft`. **Acceptance:** a test proves 7 points spent costs 2 lives with the remainder discarded; a test proves a victim at 2 lives spending 6 points ends at 1 life and the Curse is permanently lost. (#V4-20 ruled; #V4-33 already Spy/Thief-only.) | M | **High** | L20-08, L20-04 | Done |
| L22-03 | `super-absorber`: persistent, counter 2, absorbs all points, lives and upgrade points spent by all opponents (doubled upgraded). Reads the spend fields of the ledger (and all `livesLost`), never the theft fields. Life gains clamp at `GameState.lifeLimit`. **Acceptance:** tests for base and upgraded; a test proves points *stolen* from an opponent are not absorbed. (#V4-21 ruled.) | M | **High** | L20-08, L20-04 | Done |

---

## Lot 23 — Specials: attacks and redirection

The lot that stresses damage resolution. Do not start before L20-05, L20-07 and L20-15 are done.

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L23-01 | `mega-attack`: one pending attack per alive opponent (#V4-1) through the multi-target pattern, shield applies via `applyDamage`. Redirectability goes in `listEligibleMirrorTargets`: base MEGA only by an **upgraded** Mirror, upgraded MEGA never. Assassin multi-attack excludes MEGA (#V4-32). **Acceptance:** MEGA appears in no shop list and no starting deal; multi-attack eligibility matches #V4-32; tests cover 2, 3 and 4 players, the shield path, both redirection rules, and two MEGAs facing each other. (#V4-1, #V4-3, #V4-32 ruled.) | **L** | **High** | L20-05, L20-07, L20-15 | Done |
| L23-02 | `super-mirror`: every attack pending on the user is redirected to every opponent, each independently, through `duplicatePendingEffect` with fresh ids and `redirectedBy: 'super-mirror'` (#V4-4: no choice). Upgraded doubles the damage via `damageMultiplier`. Redirected effects are ineligible for a regular Mirror and eligible for another Super Mirror. **Acceptance:** 2 pending attacks against a user with 3 opponents produce 6 distinct pending effects with 6 distinct ids; a test proves a regular Mirror cannot pick them up and a Super Mirror can. **Watch point:** the doubling multiplies collisions in the mutual-attack comparison — L20-07's tests must still pass. (#V4-4 ruled.) | **L** | **High** | L20-15, L23-01 | Done |
| L23-03 | `attack-thief`: one charge blocking a single attack targeting the user, plus a random shared attack card stolen from each opponent (all shared attacks from all opponents when upgraded; MEGA excluded — #V4-31). The charge must **not** be stored in `PersistentEffect.counter`. Charge is spent **before** mutual cancel (#V4-5). **Acceptance:** a test proves that when mutual cancel would have cancelled the incoming attack, the charge is still spent and a later attack is not blocked; the steal filter matches #V4-31; the charge's presence is public and its count is not. (#V4-5, #V4-31, #V4-33 ruled.) | M | **High** | L20-05, L20-10, L20-12, L20-04 | Done |

---

## Lot 24 — Specials: pool and card mutation

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L24-01 | `card-absorber`: recovers 4 random cards from the shared pool, or 4 chosen cards when upgraded (a sub-choice on the generic subsystem). Uses `takeFromPool` and re-homes through `transferCardInstance` so `alwaysUpgraded` applies. **Acceptance:** §10.1 parity holds with the pool in the view; a test proves recovered instances keep their `isUpgraded`; tests cover a pool with 1, 3 and 10 cards, and the empty-pool case per the #V4-15 ruling. | M | **High** | L20-14, L20-03, L20-18, L20-04 | Done |
| L24-02 | `card-transformer`: turns an owned action or attack card into a random special, or a chosen one when upgraded (sub-choice among all 20). The consumed card's destination and the fate of its upgrade follow the #V4-16 ruling. **Acceptance:** tests for base and upgraded; a test proves the result reaches the user only; **the result may duplicate a special the user already holds** — rules spec §1 allows multiple copies, so no exclusion is added. | M | Medium | L20-18, L20-04 | Done |

---

## Lot 25 — Specials: turn flow

The lot that bends the turn loop. Every task here needs a ruling first.

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L25-01 | **Blocked on #V4-6, #V4-7, #V4-8.** `block`: cancels effects pending against the user per the #V4-7 ruling, then grants 3 consecutive turns (7 upgraded) during which attack cards are illegal. The attack ban must be posted at **all four** decision points — `playCardAction`, `playMultipleAttacksAction`, `listLegalPlayCardActions`, `listAssassinMultiAttackCandidates` — because no single portal exists; `canAffordPlayPoints` is the existing precedent for that assumed duplication, and `list-legal-actions-view-guard.test.ts` exists to catch a desync. **Acceptance:** a granted chain of 7 with an unanswered timer behaves per the #V4-6 ruling and does not accidentally self-eliminate the user; a test proves the ban holds identically in the enumerator and the validator. | **L** | **High** | L20-12, L20-16, L20-04 | Done |
| L25-02 | **Blocked on #V4-9 and #V4-10.** `invisibility`: persistent with `counter: null` (inert by design — nothing decrements it, which is exactly "no automatic condition"), +4 points per turn (+6 upgraded), immunity scoped per the #V4-9 ruling, manual deactivation as a new `TurnAction` variant. The immunity guard goes at the head of `resolvePendingEffects`'s ready loop, which covers all six branches from one insertion point and already has `outcome: 'immune'` to report with. Three paths bypass the pending queue and would escape a resolve-time guard: Imposition ticks in `apply-persistent-effects.ts`, `cloningHandler.play`'s inline resource read, and lifecycle eliminations. **Acceptance:** the new action type is handled in all 10+ contact points including the bot's `scoreAction` (which would otherwise take the `sellUpgradePoint` fallback silently) and the action-log `switch` (no `default` today); each sub-question of #V4-9 has its own test. | **L** | **High** | L20-13, L20-18, L20-04 | Done |

---

## Lot 26 — Specials: elimination reversal

`reanimation` alone, because it is the only card in the game that makes an irreversible engine state
reversible.

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L26-01 | `reanimation` base: armed on play; on a later elimination the user returns with a random kit and full step 2+3+4 (#V4-36). **Ruled #V4-11 = elim happens + eliminator paid + victim stripped** — consume the armed charge before `cleanupEliminatedPlayer` pools persistents, run normal elim (snapshot/rewards/dump), then revive **after** rewards. Extract a reusable player-reset from `create-initial-state.ts`'s private `makePlayer`. Consolidate the three duplicated sole-survivor checks so game-over cannot fire while `pendingReanimation` is set. Do not call `rejectReconnection` for a pending/reanimated player. **Acceptance:** §10.3's suite passes — re-entry into turn order, no premature game-over, a **fresh** `eliminationSnapshot` on the second death, reconnection preserved. **Watch point:** `isEliminated` has never been reset. Read the produced code line by line. | **L** | **High** | L20-18, L20-04 | Done |
| L26-02 | Upgraded `reanimation`: the user chooses their kit (#V4-13). Raised **after rewards** as a blocking `reanimation-kit` sub-choice (serial with rewards, never parallel). **Acceptance:** turn advance and game-over stay paused while the choice is open; expiry falls back to a seeded random kit; a bot resolves it. | **L** | **High** | L26-01 | Done |

---

## Lot 27 — Kits: catalog entries

Seven data-only kits plus the two that need code and belong here by dependency (`upgrader`,
`prophet`). Each task also writes its `kit-inspect-dialog.tsx` section and its `asset-lookup.ts` art
entry — a new **trait** is caught by no compiler, and a missing PNG compiles and then throws at
runtime in `urlFromGlob`.

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L27-01 | **Blocked on #V4-28.** `upgrader`: catalog entry plus per-kit upgrade-point economy. Add optional overrides to `KitTraits` and read `getKit(player.kitId)` at the three sites (`upgrade-points.ts` ×2, `list-legal-economy.ts`'s gate) — never a cached value, because `cloning.ts` mutates `kitId` mid-game. **Acceptance:** an Upgrader buys at the ruled cost and sells at the ruled yield; a non-Upgrader is unchanged; a test covers a player who clones an Upgrader mid-game. | M | Medium | L21-02 | Blocked |
| L27-02 | **Blocked on #V4-25.** `tactician`: 1 life, 15 points, draw 4, Spy/Thief/Mirror always upgraded. **Acceptance:** the catalog entry matches §8.2 value by value; auto-draw behaviour matches the ruling and is recorded as a measurement target for L31-02. | S | Medium | L25-01 | Blocked |
| L27-03 | `indestructible`: 18 lives, 1 attack card, Tax and Regeneration always upgraded. **Acceptance:** catalog entry verified value by value; a test proves Tax bought mid-game arrives upgraded. | S | Low | L21-02 | Done |
| L27-04 | **Blocked on #V4-27.** `prophet`: 2 random starting specials from all 20. Needs a new `Kit` field — a `'random'` sentinel cannot go in the typed `specialCards` array inside an `as const satisfies` catalog. Depends on every special handler existing, since either of the two draws can be any of the 20. **Acceptance:** the draw uses the injected `rng`; duplicates behave per the ruling. **Watch point:** draws are sequential and shared across seats, so adding picks shifts the stream for every later seat — **every fixed-seed test and stored simulation baseline changes output.** Regenerate them in this task, deliberately, and say so in the commit body. | M | **High** | L21-03, L22-03, L23-03, L24-02, L25-02, L26-02 | Blocked |
| L27-05 | `specialist`: 8 lives, 2× Card Transformer + Card Thief + Super Absorber, Absorber always upgraded. Duplicate specials already work (`instanceId` derives from the array index), but `kit-inspect-dialog.tsx` keys its list on `cardId` and will emit duplicate React keys — fix to `${cardId}:${index}`. **Acceptance:** two Card Transformer instances with distinct ids; no React key warning. | S | Low | L21-03, L22-03, L24-02 | Done |
| L27-06 | **Blocked on #V4-26 and #V4-37.** `warrior`: 3 attack cards, all attacks always upgraded — a data-only trait, since `alwaysUpgraded` is honoured at every acquisition path including shop purchase. What "all attacks" covers after the §4.1 decoupling is #V4-37 and must **not** be decided in this task. **Acceptance:** a test proves a Super attack bought mid-game arrives upgraded and consumes no upgrade point; a test covers a Warrior acquiring a MEGA ATTACK, asserting the #V4-37 ruling; a test documents the ruled Cloning behaviour in both directions. | S | Medium | L23-01, L24-01 | Blocked |
| L27-07 | `witch`: 1 UP, Thief always upgraded, Reanimation + Poison. **Acceptance:** catalog entry verified; both specials playable. | S | Low | L22-01, L26-01 | Done |
| L27-08 | `wizard`: draw 2, Thief always upgraded, MEGA ATTACK. Art maps to `Magician.png` — the id-to-filename map is declared, not derived. **Acceptance:** catalog entry verified; the art entry resolves. | S | Low | L23-01 | Done |
| L27-09 | `juggernaut`: 14 lives, Shield always upgraded, Super Mirror. **Acceptance:** catalog entry verified; upgraded Shield's Thief/Spy block still works for a kit that never spent an upgrade point on it. | S | Low | L23-02 | Done |

---

## Lot 28 — Kits: engine hooks, and closing the content scope

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L28-01 | `ghost`: 14 lives, Curse, and 2 points per life lost from any cause. The credit happens **caller-side** from the outcome the life primitives return — never inside them (golden rule 2 forbids enriching either). Gains are on lives *actually* lost, after shield absorption. **Acceptance:** tests cover damage through a shield, Tax, Imposition's ceded life, Poison and Suicide; the ruled treatment of Sentence, self-elimination and Cloning is tested explicitly. | M | **High** | L20-08, L20-09, L22-02 | Done |
| L28-02 | `duplicator`: 2 lives, 1 action card, 0 attack cards, Imposition + Attack Thief, and activatable duplication as a **new `TurnAction` variant** replacing the turn's action. Anticipatory, covers the following table round only, renewed each turn. Reads `origin: 'direct'` on the gain primitives so two Duplicators do not loop. Life gains clamp at `GameState.lifeLimit`. Same new-action-type pattern as L25-02 — reuse it. **Acceptance:** the new action type is handled in all 10+ contact points including the bot's `scoreAction` and the action-log `switch`; tests cover activation, expiry after one table round, non-renewal, two Duplicators in one game, and a gain from theft and from an elimination reward. **Watch point:** produce `Duplicator.png` — the only missing asset in the whole of V4, and a missing PNG compiles then throws at runtime. | **L** | **High** | L20-08, L23-03, L25-02 | Done |
| L28-03 | Add the **kit-side** assertions to `content-scope.test.ts`, deferred from L20-06 because they were false until now: 15 kit ids, `KIT_CATALOG` exhaustive over them, every kit's `specialCards` referencing declared ids, every kit id present in `asset-lookup.ts`'s `KIT_FILES` with a resolvable file. **Acceptance:** the test fails if a 16th kit id is added without art or a catalog entry. | S | Low | L28-02 | Done |

---

## Lot 29 — Bot policy for the new content

Nothing here starts before Lots 21–28 close. A branch written against a card that does not exist is
written against a guess. The V3 Definition of Done clause applies to every task: a green
`pnpm verify` on a heuristic is necessary, not sufficient — the developer watches a full game and
signs off.

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L29-01 | Split `scorePlayCard` by card family before adding fourteen branches to a 239-line function. Pure refactor: every existing bot test passes untouched. **Acceptance:** no behaviour change, provable by the unchanged test suite. | M | Medium | L28-03 | To do |
| L29-02 | Make the draw score kit-aware. `{ type: 'draw' }` returns a hardcoded `sustain` regardless of the kit's `draw` value, so a Tactician (4) draws as reluctantly as an Untouchable (1) and a Wizard (2) likewise. **Acceptance:** the score scales with `getKit(kitId).startingResources.draw`; a Tactician bot draws more readily than an Untouchable bot at equal state. | S | Medium | L29-01 | To do |
| L29-03 | Recalibrate the life-relative thresholds. `REGEN_SOFT_LIFE = 6` and `TAX_LIFE_BUFFER = 5` are absolute values tuned for 10-life kits, so a Tactician bot (1 life) never plays Tax or anything with a life cost and an Indestructible bot (18) is needlessly timid. **Acceptance:** thresholds are relative to the kit's starting lives or to `lifeLimit`; every weight stays a module constant (V3 #V3-5 is not reopened) and every change is recorded as a tunable default, never cited as measured. | M | Medium | L29-02 | To do |
| L29-04 | Un-gate the Suicide branch from `kitId === 'kamikaze'`. A Suicide **stolen** by any other kit currently falls through to the fallback. **Acceptance:** a test drives a non-Kamikaze holding a stolen Suicide and proves a deliberate decision. | S | Medium | L29-01 | To do |
| L29-05 | Scoring branches for the economy and theft specials: Upgrade Point Thief, Card Thief, Super Regeneration. **Acceptance:** each is chosen for a stated reason with a `botReason` code, and never on a tie with `draw`. | M | Medium | L29-01 | To do |
| L29-06 | Scoring branches for the persistent specials — Poison, Curse, Super Absorber — **plus the four cards that have had no branch since V1** (`spy-thief`, `imposition`, `sentence`, `points-generator`) and `cloning` outside an incoming threat. Sentence especially: it can eliminate the bot itself. **Acceptance:** a test proves Sentence is never played on a tie with `draw`. | M | **High** | L29-01 | To do |
| L29-07 | Scoring branches for the attack and redirection specials: MEGA ATTACK, Super Mirror, Attack Thief. `effectDamage` and `hasCancelingIncomingFrom` must know MEGA ATTACK is not always redirectable, or the bot plans a Mirror that cannot fire. **Acceptance:** the bot does not hold Mirror against an upgraded MEGA ATTACK. | M | **High** | L29-01 | To do |
| L29-08 | Scoring branches for the turn-flow, pool and reversal specials — Block, Invisibility, Card Absorber, Card Transformer, Reanimation — plus resolution policies for every new sub-choice and for the two new action types (deactivate-persistent, activate-duplication), which otherwise land in the `sellUpgradePoint` fallback. **Acceptance:** a bot plays a full game holding each of the five without stalling the room (technical spec v3 §10.4). | **L** | **High** | L29-01 | To do |

---

## Lot 30 — Client surfaces

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L30-01 | Art entries for the 14 specials and 11 kits in `asset-lookup.ts`, files copied from `images/` into `apps/client/src/assets/`, following the declared conventions: `<Name>.png` / `<Name> +.png` / `<Name> (activated).png` for cards, capitalised display name for kits. The `MEGA ATTACK` assertion in `asset-lookup.test.ts` — which currently asserts no URL matches it — inverts. **Acceptance:** the test loops over all 30 card ids and all 15 kit ids and resolves every one. | M | Low | L28-03 | Done |
| L30-02 | Public pool panel: the shared pool is now public state and Card Absorber's target. **Acceptance:** the pool is readable without opening the console and is not confused with a player's hand. | M | Low | L20-03, L24-01 | To do |
| L30-03 | Sub-choice UI on the generic subsystem: choose 4 pool cards, choose a card to steal, choose a special, choose a reanimation kit. Replaces the two hardcoded Mirror and reward dialogs. **Acceptance:** each sub-choice shows its deadline and its default-on-expiry; no dialog is a special case in `table.tsx`. | **L** | Medium | L20-18, L26-02 | To do |
| L30-04 | Turn-flow surfaces: the Block chain's remaining-turn count, Invisibility's active state and its manual deactivation control, the Duplicator's activation control and active window. **Acceptance:** a spectator can tell turn 2 of 3 of a Block chain from a new turn, and can see why an action returned `'immune'`. | M | Medium | L20-16, L25-02, L28-02 | To do |
| L30-05 | Trait sections in `kit-inspect-dialog.tsx` for every new trait. Nothing catches a missing section — the dialog renders from a hand-written list. **Acceptance:** every field of `KitTraits` appears in the dialog for at least one kit; a test asserts the section count matches the trait count. | S | Medium | L28-02 | To do |
| L30-06 | Action-log and export coverage for the new action kinds, the `'blocked'` outcome, Super Mirror redirects, reanimations and duplication activations. Three `switch` statements have no `default` today: `action-log.ts`, `aggregate-action-log.ts`, and the outcome switch. **Acceptance:** an exhaustive `switch` per site, enforced by `noFallthroughCasesInSwitch` and a never-typed default; the xlsx export carries every new event. | M | Medium | L28-02 | To do |
| L30-07 | Post-lot browser playtest of the whole V4 surface (`frontend.md` · Post-lot browser gate): a 4-player game across the new kit families, exercising Block, Invisibility, Reanimation, MEGA ATTACK, Super Mirror and Card Absorber. Fix every issue found, re-verify, commit before Lot 31. **Acceptance:** the developer has played it and signed off. | M | Medium | L30-06 | To do |

---

## Lot 31 — Simulation and the V4 screen

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L31-01 | **Re-run the V3 gross-imbalance baseline** on the 4 original kits, after L20-17's fallback fix, and publish it beside the original. The published screen was produced while at least four cards were played near-randomly against drawing, three of them kit specials of kits being measured. Without this the V4 numbers have nothing valid to compare against. **Acceptance:** a writeup stating plainly which of the original figures moved and by how much. | M | **High** | L20-17 | To do |
| L31-02 | Scale `run-gross-imbalance.ts` to 15 kits. `unorderedPairs(KIT_IDS)` goes from 6 cells to **105**; at 200 games per cell that is 21 000 games instead of 1 200, plus the multi-player cell, whose hardcoded 4-kit list needs replacing. Either accept the runtime, reduce games per cell, or sweep in tranches — and **`log` what was dropped**, because a silent cap reads as full coverage. **Acceptance:** determinism holds (same seed and config → identical output); the writeup states the games-per-cell figure and any coverage skipped. | M | Medium | L29-08, L30-07 | To do |
| L31-03 | Report the stall rate as a first-class finding. V3 already lost 104 of 1400 games to `MAX_TURNS = 2500` on invest / chip loops; Invisibility, Super Regeneration, Indestructible and Reanimation all make non-termination structurally more likely. Stalls stay **counted, never assigned a winner**. **Acceptance:** the writeup gives the stall rate, the kits over-represented in stalls, and the median turn count, without inferring a balance conclusion from any of it. | S | Medium | L31-02 | To do |
| L31-04 | Publish the V4 screen under `docs/simulation/<date>-v4-content/` with config, aggregates, raw JSONL and a writeup. **It concludes nothing about balance and changes no value** — same discipline as the V3 screen. Record which kits and cards cross the ~70% "look here" threshold, as input to a later rebalancing version. **Acceptance:** the writeup names every card that appeared in fewer than N games, so unmeasured content is visible rather than assumed covered. | M | Medium | L31-03 | To do |

---

## Task count and honest sizing

| Lot | Tasks | Of which `Blocked` on a ruling |
|---|---|---|
| 20 — Foundations | 19 | 2 |
| 21 — Economy and theft specials | 3 | 3 |
| 22 — Persistent and periodic specials | 3 | 0 |
| 23 — Attack and redirection specials | 3 | 3 |
| 24 — Pool and mutation specials | 2 | 2 |
| 25 — Turn-flow specials | 2 | 2 |
| 26 — Elimination reversal | 2 | 2 |
| 27 — Kits, catalog | 9 | 4 |
| 28 — Kits, engine hooks | 3 | 2 |
| 29 — Bot policy | 8 | 0 |
| 30 — Client surfaces | 7 | 0 |
| 31 — Simulation | 4 | 0 |
| **Total** | **65** | **20** |

**24 tasks are rated High risk and 10 are rated L complexity** — proportionally far more than V1, V2
or V3, because V4 is the first version that modifies the turn loop, reverses elimination, and makes
a documented write-only structure readable.

Two mappings are deliberately not one-to-one, so do not read the lot tables as a checklist of
cards: L21-02 implements two cards (`super-regeneration` and `upgrade-point-thief`, both trivial
compositions of the same primitive), and `reanimation` is split across two tasks (L26-01 base,
L26-02 upgraded) because its upgrade needs an interruptible `processEliminations`.

**20 of the 65 tasks cannot start until the designer rules on the remaining open decisions in technical
spec v4 §11.** That is the real critical path, and it is not code.
