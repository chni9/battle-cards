# Technical spec — Card Battle, version 4 (Full content: 15 kits, 20 special cards)

> Scope authority for V4. Rules truth stays `docs/spec_bataille_des_cartes_en.md`.
> Engine, protocol and Definition of Done truth stay `docs/technical_spec_v1.md`.
> Bots and simulation truth stay `docs/technical_spec_v3.md`.
> Sequencing lives in `docs/backlog_v4.md`.
>
> **V4 changes no rule.** It implements the rules spec's remaining content. Where the rules spec
> does not resolve a case, §11 records it as an open decision and the dependent backlog task is
> `Blocked` until the designer rules. Golden rule 6 applies without exception: this document
> contains no invented rule, and no §11 recommendation may be implemented before it is ruled on.

---

## 1. Objective and non-objectives

### Objective

Bring the implemented content up to the rules spec: **15 kits** instead of 4, **20 special cards**
instead of 6, still in Classic mode, still 2 to 4 players. Every card and kit playable by a human,
decidable by the V3 heuristic bot, and measurable by the V3 simulator.

The content slice has been the same since V1 — 16 cards, 4 kits — deliberately narrow to prove the
engine before content was added (technical spec v1 §2). The engine is now proven: V1 closed 63/63,
V2 closed 22/22, V3 delivered the legal-action enumerator, the heuristic policy and the headless
simulator. V4 spends that proof.

### Non-objectives

- **No rebalancing.** Designer ruling 2026-08-04: V4 implements the rules spec's values to the
  letter and produces a simulation screen. Reading that screen and changing values is a later
  pass. Kamikaze's 78% win rate in `docs/simulation/2026-08-04-gross-imbalance/` is **not** fixed
  in V4, and is not grounds for touching a value.
- **No new game mode.** Team, God and Quick stay out (§12). Team and God change the targeting rule
  of every handler; that is a second transverse pass and it does not get mixed with 14 new cards.
- **No rules-spec rewrite.** V4 produces Appendix A: the amendments the rules spec needs. Writing
  them into `spec_bataille_des_cartes_en.md` stays the designer's task, as in V1.
- **No learning bot.** V3 §13 stands. V4 extends the heuristic policy, it does not replace it.
- **No player-count increase.** 2 to 4 is the working assumption; #V4-30 exists only to have the
  designer confirm it once, in writing, before seven new cards start scaling with the opponent
  count. If that ruling comes back as a change, it moves out of V4 and into the version that needs
  it.

---

## 2. V4 scope

**In:**

| Item | Count | From |
|---|---|---|
| New special cards | 14 | rules spec §5 |
| New kits | 11 | rules spec §4 |
| New engine primitives | 10 | §4.2 |
| Generalised sub-choice subsystem | 1 | §4.4 |
| Bot policy: branches for 14 cards, 2 new action types, 3 transverse recalibrations | — | §6 |
| Latent-defect fixes the V4 audit surfaced | 5 | §3.3 |

**Card totals after V4:** 3 attack + 7 action + 20 special = **30 cards**. `MEGA ATTACK` is both a
special card and an attack card (§4.1), so the two categories stop being disjoint sets of ids.

**Kit totals after V4:** **15 kits**, including `duplicator`, implemented at its rules-spec values
(2 lives, 1 action card, 0 attack cards). Designer ruling 2026-08-04: the rebalancing hypothesis
in rules spec §4 (raise to 6 lives / 2 action cards) is **not** applied — the simulator measures
the original version first.

**Out:** §12.

### 2.1 Decisions taken 2026-08-04

Recorded here because they scope the whole of V4; details in `docs/agent/decisions.md`.

1. **Content only, Classic only.** Team / God / Quick deferred to a later version.
2. **The bot must play all new content.** A card with no scoring branch is never chosen
   deliberately, so it appears in no statistic. Shipping 14 unmeasured cards is not acceptable.
   Lot 29 is therefore a first-class lot, not a follow-up.
3. **Duplicator ships at its rules-spec values.** No pre-emptive rebalancing.
4. **No value is changed anywhere in V4.** Implement, measure, report.

---

## 3. What exists, and what has to be built

### 3.1 Already in place and reusable unchanged

- **The card registry pattern** (`apps/server/src/cards/registry.ts`): `IMPLEMENTED_CARD_IDS` /
  `PENDING_CARD_IDS`, held to cover `CardId` exactly by three compile-time mechanisms. It was
  built for exactly this moment: adding a card touches its own handler file plus the two lists.
  `PENDING_CARD_IDS` is currently `[]` and will hold 14 entries again at the start of V4.
- **`alwaysUpgraded` at acquisition, not at deal.** `isAlwaysUpgraded` is consulted by
  `acquireCardToHand`, `acquireSpecialCard` and `transferCardInstance`
  (`apps/server/src/engine/kits/acquire-card.ts`), and every entry path routes through one of
  them: initial deal, shop purchase, special purchase, elimination reward, theft. **Warrior's "all
  attacks already upgraded" therefore works as a data-only kit entry** — a Super attack bought on
  turn 12 arrives upgraded, with no code change. Verified in code, not assumed. (What "all attacks"
  now covers, given §4.1, is #V4-37.)
- **`immuneTo` at resolve, with a public `outcome: 'immune'`.** New immune kits are data-only on
  the engine side; not on the bot side (§3.3 #5).
- **Duplicate special cards in a kit's `specialCards`.** `Kit.specialCards` is a bare `CardId[]`
  and `createInitialState` builds `instanceId` from the array index, so Specialist's two Card
  Transformers need no structural change.
- **Forced kit assignment per seat in the simulator.** `batch-config.ts --kits` validates against
  `isKitId`, which derives from `KIT_IDS`, so 11 new kits are accepted with no simulator change.
- **The multi-target handler pattern.** `spy-thief.ts` queues one effect per alive opponent, each
  with its own id and its own `damageMultiplier`. Poison, MEGA ATTACK, Attack Thief and upgraded
  Card Thief all reuse it.
- **Exhaustive art maps.** `asset-lookup.ts` is `as const satisfies Record<KitId, string>` and
  `Record<CardId, CardArtFiles>`, so a new id fails to compile until its art is declared, and
  `urlFromGlob` throws if the file is absent. **All 14 new special cards and 10 of the 11 new kits
  already have base, `+` and where relevant `(activated)` art in `images/`.** Only
  `Duplicator.png` is missing.

### 3.2 Missing, and therefore V4 work

| Need | Consumers | Section |
|---|---|---|
| `AttackCardId` decoupled from the shop list | MEGA ATTACK | §4.1 |
| `gainPoints` / `gainUpgradePoints` primitives | Duplicator, Ghost, Curse, Super Absorber | §4.2 |
| `takeCardFrom` / `stealRandomCard` | Card Thief, Attack Thief | §4.2 |
| `downgradeAllCards`, `stealUpgradePoints` | Upgrade Point Thief | §4.2 |
| `cancelPendingEffect(reason)` | Attack Thief, Block | §4.2 |
| `deactivatePersistentEffect` (manual) | Invisibility | §4.2 |
| `duplicatePendingEffect` (fresh ids) | Super Mirror | §4.2 |
| `takeFromPool` | Card Absorber | §4.2, §4.3 |
| Pool in the state view | Card Absorber's upgraded choice, §10.1 parity | §4.3, §5 |
| Generic sub-choice subsystem | up to 4 new sub-choices | §4.4 |
| Consecutive-turn grant | Block | §4.5 |
| Life-loss and gain observation hooks | Ghost, Duplicator, Curse, Super Absorber | §4.6 |
| `PendingEffect.redirectedBy` | Super Mirror's Mirror immunity | §4.7 |
| Per-kit upgrade-point economy | Upgrader | §4.8 |
| Random starting specials | Prophet | §4.8 |
| A new `TurnAction` variant, twice | Invisibility's deactivation, Duplicator's activation | §4.8 |
| Bot scoring for the new content | Lot 29 | §6 |

### 3.3 Latent defects the V4 audit surfaced

**All five exist in the shipped build.** None is a V4 feature and none needs a designer ruling.
They are listed here because V4 either trips over them or makes them reachable, and because two
of them contaminate a published measurement. They land in Lot 20, in four tasks — #4 and #5 share
one, since both are one-line changes in the same policy file.

1. **Pool `instanceId` collision.** `poolDeactivatedPersistentEffects`
   (`apps/server/src/engine/specials/pool-deactivated.ts`) derives the new instance id from
   `state.pool.length`. That is unique only while the pool never shrinks. Card Absorber makes it
   shrink, at which point two different deactivated persistents can produce the same `instanceId`
   — and `instanceId` is the addressing key for `playCard` / `sellCard` / `upgradeCard` and for
   elimination reward picks, so a collision is silent and cross-player. Fix: a monotonic counter on
   `GameState`. That file's header comment also claims the ids are "seed-derived", which they are
   not; fix the comment in the same change, because the next reader will trust it.

2. **`pool.test.ts`'s "never shrinks" test is tautological.** It captures
   `lengthAfterSale = state.pool.length` and then asserts `state.pool.length === lengthAfterSale`
   with nothing executed in between. The write-only invariant `engine.md` states as a hard rule is
   enforced by **documentation only**; no test would fail on a read. Since V4 deliberately makes
   the pool readable, replace the test with the real new invariant (§10.4) rather than deleting a
   guard and leaving nothing behind it.

3. **The "all damage values are distinct" premise is already false.** `engine.md` golden rule 4 and
   technical spec v1 §6.3 both state that V1's values (1, 2, 3, 4, 7, 10) are distinct, so equal
   damage necessarily means the same card at the same upgrade level. But `resolveMutualAttack`
   compares `attackDamageFor(...) * damageMultiplier`, and upgraded Mirror multiplies by 2
   cumulatively. A basic attack redirected once already deals 2 — exactly a strong attack;
   redirected twice it deals 4 — exactly an upgraded strong attack. **The premise is wrong today,
   not because of V4.** No existing test combines `damageMultiplier` with a mutual pair, which is
   precisely why it survived three versions (§10.5).

4. **The bot's default play score equals the draw score exactly.** `scorePlayCard` falls through to
   `HEURISTIC_BAND_WEIGHTS.sustain` (100), the literal value `{ type: 'draw' }` receives, and
   `decideWithReason` breaks ties with `rng.pick` over all joint-top actions. So an unmodelled card
   is played essentially at random against drawing — and because each (card, target) pair is a
   separate enumerated action, with N tied plays the bot plays *some* card with probability
   N/(N+1), not one half. **At least four** of the sixteen current cards are in that state at all
   times — `spy-thief`, `imposition`, `sentence`, `points-generator` — and two more join it
   conditionally: `cloning` outside an incoming threat, and `suicide` held by any kit other than
   Kamikaze. A bot can therefore play Sentence — 15 points, eliminates a random player including
   itself — on a die roll. **This contaminates the published balance screen:** Sentence and Points
   Generator are Assassin's kit specials and Imposition is Untouchable's, so the published 39% and
   28% figures are partly an artifact of random special play rather than a measurement of those
   kits. Fix the fallback, then re-run the V3 baseline before comparing anything to a V4 run.

5. **`isImmuneTarget` in the bot is hardcoded on `untouchable` / `spy` / `thief`.** It does not read
   `KitTraits.immuneTo`, so every new kit with an immunity would be ignored by the policy, which
   would keep playing into the void.

---

## 4. Architecture

### 4.1 Attack-ness becomes a property, not a category

`packages/shared/src/domain/card.ts` already anticipates this in a comment: attack-ness is a
property of the card, not of its category, because a special card can be an attack. Today the type
and the runtime array are the same object:

```ts
export const ATTACK_CARD_IDS = ['basic-attack', 'strong-attack', 'super-attack'] as const;
export type AttackCardId = (typeof ATTACK_CARD_IDS)[number];
```

Widening `ATTACK_CARD_IDS` to hold `mega-attack` is the wrong move, because that array is
simultaneously the *type*, the *shop* list and the *starting-deal* list. It breaks six things at
once:

- `SHARED_CARD_IDS = [...ATTACK_CARD_IDS, ...ACTION_CARD_IDS]` would make MEGA ATTACK a
  `SharedCardId`, hence individually buyable at 32 points and sellable at 16 — which rules spec §5
  forbids for every special.
- `SHARED_CARD_CATALOG` (`satisfies Record<SharedCardId, Card>`) stops compiling.
- `listLegalEconomyActions` iterates `SHARED_CARD_IDS`, so `buyCard { cardId: 'mega-attack' }`
  becomes a legal action.
- `createInitialState` picks starting attack cards with `rng.pick(ATTACK_CARD_IDS)`. MEGA ATTACK
  would enter starting hands, **and** the pick would move from 3 to 4 candidates, changing
  `nextInt`'s modulo and therefore every seeded starting hand in the repo.
- `v1-scope.test.ts` asserts damage-dealing ids stay disjoint from special ids — a test that exists
  precisely to guard the `applyDamage` boundary.
- `table-helpers.ts`'s `cardPlayNeedsTarget` and `card-actions.tsx`'s multi-attack button key on
  `ATTACK_CARD_IDS`, so the client would demand a target for a card that takes none.

**Decision:** keep `ATTACK_CARD_IDS` as the shop-and-deal list of the three buyable attack cards,
and declare attack-ness separately.

```ts
/** Buyable, dealable attack cards — the shop and starting-deal list (rules spec §2). */
export const ATTACK_CARD_IDS = ['basic-attack', 'strong-attack', 'super-attack'] as const;
export type SharedAttackCardId = (typeof ATTACK_CARD_IDS)[number];

/** Special cards that are attacks as rules spec §1 defines damage. */
export const SPECIAL_ATTACK_CARD_IDS = ['mega-attack'] as const;

/** Every card `applyDamage` may be called for. */
export type AttackCardId = SharedAttackCardId | (typeof SPECIAL_ATTACK_CARD_IDS)[number];
```

`isAttackCardId` tests membership of the union of both arrays. `ATTACK_DAMAGE` grows one entry
(`mega-attack: { base: 20, upgraded: 20 }` — the upgrade changes redirectability, not damage:
rules spec §5). Because `mega-attack` must already be a `CardId` for any of this to compile, the
id declaration lands **before** the decoupling, not after (backlog L20-04 → L20-05).

Every site that must keep meaning "the three buyable attack cards" reads `ATTACK_CARD_IDS`; every
site that means "deals damage" reads `AttackCardId`. The audit found roughly thirty
`isAttackCardId` call sites plus six membership tests, and each has to be classified by hand —
there is no mechanical rule. Two are easy to miss because they are **local redefinitions in the
client**: `action-log.ts` and `table.tsx` each rebuild their own `isAttackCardId` from
`ATTACK_CARD_IDS`, and `action-log.ts` uses it in the "deals damage" sense, so a MEGA ATTACK would
be logged with the wrong phrasing and a fully shield-absorbed MEGA would fall into the generic
branch.

Two consequences of MEGA ATTACK's dual nature that the rules spec does **not** resolve, and which
must therefore be ruled on rather than inferred: whether Attack Thief can steal it (#V4-31) and
whether the Assassin may include it in a multi-attack (#V4-32).

### 4.2 New primitives

Same discipline as `docs/agent/engine.md`: one function per file, handlers compose primitives, and
a handler that mutates a resource directly is a bug. Ten additions, all landing in Lot 20 before
any card that consumes them.

| Primitive | File | Why it must exist |
|---|---|---|
| `gainPoints(player, amount, origin)` | `engine/economy/gain-points.ts` | Points are incremented at **10 sites** with no primitive. `grantYield` in `transfers.ts` is a partial funnel for sale proceeds only. Duplicator needs one observation point per resource; Ghost, Curse and Super Absorber need the same for their own reasons. |
| `gainUpgradePoints(player, amount, origin)` | `engine/economy/gain-upgrade-points.ts` | Same, 4 sites today. |
| `takeCardFrom(victim, instanceId)` | `engine/cards/steal-card.ts` | The only existing extraction is `takeCardFromEliminated`, private to `elimination-rewards.ts` and coupled to elimination semantics. Extract, export, and have elimination call the extracted version. |
| `stealRandomCard(victim, rng, filter?)` | `engine/cards/steal-card.ts` | Card Thief, Attack Thief. Draws from the injected `rng` (golden rule 5). |
| `downgradeAllCards(victim)` | `engine/economy/downgrade-cards.ts` | No code writes `isUpgraded = false` anywhere. Returns the count, because Upgrade Point Thief transfers 1 upgrade point per upgrade removed. |
| `stealUpgradePoints(source, target)` | `engine/economy/steal-upgrade-points.ts` | `steal-points.ts` handles points only. This is the **first writer of `TurnLedger.upgradePointsLostToTheft`**, a field that has existed since V1, is initialised to 0 in four places, and is written nowhere. Its whole purpose is keeping theft distinct from spending so upgraded Absorber captures only the latter. |
| `cancelPendingEffect(state, effectId, reason)` | `engine/turn/cancel-pending-effect.ts` | An effect can currently be cancelled only by mutual attacks, the Spy/Thief counter, or Cloning's blanket `pendingEffects = []`. Attack Thief and Block need a targeted, reasoned cancellation with a public outcome. |
| `deactivatePersistentEffect(state, ownerId, effectId)` | `engine/specials/deactivate-persistent.ts` | Persistents deactivate only by counter depletion (through `applyDamage`) or by their owner's elimination. Note `poolDeactivatedPersistentEffects` pushes to the pool but does **not** remove from `activePersistentEffects` — the caller does; the new primitive does both. Useful property already in the model: `counter: null` is inert, nothing decrements it, which is exactly "no automatic condition". |
| `duplicatePendingEffect(state, effect, newTargetId)` | `engine/turn/duplicate-pending-effect.ts` | `redirectPendingAttack` **moves** an effect: splice, mutate `targetPlayerId`, push. Super Mirror needs N copies at N targets. Copying the object as-is gives N effects with the same `id`, breaking `chooseMirrorTarget`'s addressing; reusing `queueEffect` resets `damageMultiplier` to 1 and overwrites `queuedAt`. Neither is acceptable, hence a primitive that mints a fresh id and preserves both. |
| `takeFromPool(state, instanceId)` | `engine/pool/take-from-pool.ts` | The pool's first read path. It belongs in the engine, not in the Card Absorber handler — `card-handler.md` golden rule 2 is explicit that a card needing engine changes means a missing primitive. |

**`origin` on the two gain primitives** is what makes Duplicator implementable without a loop: a
gain the Duplicator received *through duplication* is not itself duplicable by another Duplicator
(rules spec §4). Origin is `'direct' | 'duplicated'`; the duplication reader reacts to `'direct'`
only.

### 4.3 The pool stops being write-only

`GameState.pool` has been documented write-only since V1, and `engine.md` lists reading it under
"what not to do". Card Absorber ends that. The change is deliberate and bounded:

- **4 write sites today**, all kept: `sellCard`, an instant special consumed in `playCardAction`,
  `poolDeactivatedPersistentEffects`, `dumpCardsToPool` on elimination.
- **1 removal path added**, through `takeFromPool`, with re-homing via `transferCardInstance` so
  `alwaysUpgraded` applies.
- **Prerequisite:** the `instanceId` collision of §3.3 #1. Fix first, or the removal path addresses
  ids that are not unique.
- **Note for #V4-14:** instances in the pool keep the `isUpgraded` they had. A deactivated upgraded
  Imposition returns to the pool upgraded, so recovering it with Card Absorber yields a free
  upgraded card. That may be intended; it is not stated anywhere.

The pool must also enter `PlayingStateView`, for two reasons: rules spec §1 already calls it
"visible to all players", and §10.1 requires it — `enumerationStateFromView` currently fabricates
`pool: []`, so a `canPlay` reading pool contents would be legal from authoritative state and
illegal from the view.

### 4.4 The sub-choice subsystem gets factored before it gets extended

`mirrorChoice` and `rewardChoice` are **duplicated, not abstracted**. The only shared code is
`orchestrate-turn.ts`'s `TurnSubChoiceHooks { resolveMirror, resolveReward }` with two hardcoded
sequential `while` loops. The audit counted **~20 files per additional sub-choice** — shared types,
engine, room, bot driver, simulator, client — plus a duplicated timer trio in `game-room.ts` and
two separate 20-second constants.

V4 adds up to four sub-choices:

| Sub-choice | Card | Trigger point | Difficulty |
|---|---|---|---|
| Choose 4 cards from the pool | Card Absorber (upgraded) | user's turn, at play | Mirror-shaped |
| Choose which card to steal | Card Thief, when the target is spied | user's turn, at play | Mirror-shaped |
| Choose the special obtained | Card Transformer (upgraded) | user's turn, at play | Mirror-shaped |
| Choose the reanimation kit | Reanimation (upgraded) | **inside `processEliminations`**, possibly not on the reanimated player's turn | harder than both existing ones |

Super Mirror may add a fifth, or none — that depends on #V4-4.

Building four more copies of a two-copy duplication is not viable. **Lot 20 factors first:**

- A generic `SubChoiceState` discriminated on `kind`, with **one slot and one queue** on
  `GameState` — Mirror is a slot, rewards are a queue with an active head, and the generic model
  needs both shapes.
- One `SUB_CHOICE_MS`, one timer registry in `game-room.ts` keyed by sub-choice kind, replacing the
  `mirrorTimer` / `rewardTimer` / paused-remaining-ms triplication.
- One `subChoiceRequired` / `resolveSubChoice` message pair with a discriminated payload, replacing
  two pairs. This is V4's single protocol bump (§5).
- `continuePendingSubChoices` becomes one loop over the queue instead of two hardcoded whiles.
- The gate is currently **split and asymmetric**: `performTurnAction` rejects on
  `hasPendingEliminationRewards` but does **not** check `state.mirrorChoice`; the Mirror block
  exists only in `game-room.handleAction`; and `listLegalActions` has no gate at all. Unify into
  one engine predicate that the enumerator also consults, so §10.2 holds.
- Migrate Mirror and rewards onto it **with no behaviour change**, proven by every existing
  V1/V2/V3 test passing untouched. That is the acceptance criterion, and the reason this is a
  refactor and not a rewrite.

### 4.5 Consecutive turns (Block)

Block grants its user 3 consecutive turns, 7 upgraded. Nothing in the codebase resembles this:
`allowsMultipleAttacksPerTurn` is several *actions* in one turn, and V3's "consecutive bot turns"
means different bots in sequence. `advanceTurn(state)` takes only the state and holds no notion of
"the same player again".

Design constraints the audit established, none of them obvious:

- **`turnSequence` must still increment on each granted turn.** It is not just an ordering stamp:
  RNG streams are seeded `${seed}:turn:${turnSequence}` and `${seed}:bot:${botId}:${turnSequence}`.
  Freezing it across 3 to 7 turns hands the player the *same* draws every turn — same Sentence
  victim, same special-card purchase. So the grant keeps `currentTurnPlayerId` and advances
  `turnSequence`.
- **Two exit points, not one.** A normal turn ends in `finishTurnPhases`; a turn that triggered an
  elimination reward ends in `resumeAfterRewards`. Decrementing the Block counter in
  `finishTurnPhases` alone would skip it whenever a Block turn kills someone. Intercept in
  `advanceTurn`, which both paths call.
- **The counter cannot live in `PersistentEffect.counter`.** That field is decremented by
  `applyDamage`, one point per life lost, so a "Block turns remaining" counter stored there would
  be eaten by incoming attacks. Use a dedicated `Player` field, classified in the view builder in
  the same change (protocol golden rule 4).
- **The inactivity mechanism will kill the Block user.** `onTurnTimeout` increments
  `consecutiveTimeouts` and eliminates at 5; `resetConnectedTimeouts` is only called when an action
  is taken. An AFK player who has just played upgraded Block burns 5 of their own 7 turns and
  self-eliminates. Same shape on the absent path (`ABSENT_AUTO_TURN_LIMIT = 3`). This needs a
  ruling (#V4-6), not an implementation choice.
- **The client cannot tell turn 2 of 3 from a new turn.** `broadcastTurnStarted` re-sends the same
  `activePlayerId`, and `TurnStartedPayload` carries only `{ activePlayerId, deadlineMs }`.
- **`resetLedger` runs on every `advanceTurn`.** With 3 to 7 Block turns, "the target's last
  complete turn" — Absorber's entire definition — becomes ambiguous (#V4-8).

### 4.6 Observation hooks for gains and losses

Four pieces of V4 content observe a resource change they do not cause: Ghost (+2 points per life
lost, any cause), Duplicator (a copy of every opponent gain), Curse (1 life per 3 points the victim
spends), Super Absorber (absorb everything opponents spend).

The audit's finding is that **there is no single funnel today, and only `lives` is close to one**:

- `lives` down: 2 primitives (`applyDamage`, `applyLifeLoss`) **plus 5 direct mutations** —
  self-Suicide and Sentence in `resolve-pending.ts`, two in `elimination-rewards.ts`, and
  `cloning.ts`'s `user.lives = target.lives`, which can be a decrease.
- `lives` up: 1 primitive (`gainLives`), 6 callers, plus the same Cloning assignment, which can be
  an increase.
- `points` up: **no primitive, 10 sites.** `upgradePoints` up: **no primitive, 4 sites.**

So the work is: add the two missing gain primitives (§4.2), convert the 14 sites, then route or
explicitly exempt the 5 direct life mutations. Hooks then attach to primitives, not to scattered
call sites.

**The hooks are readers, not writers inside the primitives.** `applyDamage` and `applyLifeLoss`
take a `Player`, not a `GameState`, and their headers forbid enrichment — merging them is the
project's stated most-likely silent bug. Ghost's credit therefore happens caller-side, from the
outcome the primitive returns, which is exactly why those primitives return an outcome instead of
`void`. Two consequences: Ghost gains on **lives actually lost**, after shield absorption
(`applyDamage` returns `livesLost`, not `amount`); and Cloning's assignment-style resource copy is
neither a typed gain nor a typed loss, so #V4-22 and #V4-23 must rule on it rather than let it fall
through silently.

### 4.7 Redirection gets a provenance field

Super Mirror's redirected attacks "can no longer be redirected by a regular Mirror, but can be by
another Super Mirror". `PendingEffect` has exactly seven fields and none records how the effect got
where it is. Add `redirectedBy: 'mirror' | 'super-mirror' | null`, and:

- propagate it into `PendingEffectView`, `build-view-for.ts`, `enumerationStateFromView`,
  `export/turn-history.ts`, the client's `persistent-incoming.ts` and the xlsx export;
- filter on it in `listEligibleMirrorTargets`, which today filters only on `isAttackCardId` and on
  `!isUpgradedMirror && effect.isUpgraded`. That same function is where MEGA ATTACK's redirection
  rule goes: base MEGA is redirectable **only** by an upgraded Mirror, upgraded MEGA never.
  Neither falls out of the existing filter, which reads the *attack's* upgrade state, not the
  card's identity;
- expect six test files to need the new field — the ones that construct `PendingEffect` literals
  rather than going through `queueEffect`.

### 4.8 Kit traits that are not data

Seven of the eleven new kits are pure catalog entries: `tactician`, `indestructible`, `specialist`,
`warrior`, `witch`, `wizard`, `juggernaut`. Four are not.

**Upgrader — per-kit upgrade-point economy.** `UPGRADE_POINT_ECONOMY` is a frozen global
(`buyCostPoints: 10`, `sellYieldPoints: 7`) read at three production sites: `upgrade-points.ts`
twice and `list-legal-economy.ts`'s gate. The file's own comment anticipates the Upgrader. Add
optional per-kit overrides to `KitTraits` and read `getKit(player.kitId)` at each site — never a
cached value, because `cloning.ts` mutates `player.kitId` mid-game.

What #V4-28 actually has to decide, stated precisely because it is easy to get wrong: the trait's
*designed* effect is upgrades at half price, on a kit that starts with 3 upgrade points. Its
*side* effect is that the resale arbitrage changes sign — for every other kit a buy-then-sell round
trip is **−3** (pay 10, get 7); for the Upgrader it is **+2**. Averaged over the two actions a
round trip costs, +2 equals what two draws yield a draw-1 kit, so it is not an unbounded pump and
the one-action-per-turn rule already caps it at one sale per turn. But the average is the wrong
lens: **selling alone yields +7 in a single action**, needs no capital, and is available on turn 1
against 21 points of latent value in the starting stock — seven times the draw's tempo, which is
what moves the Super attack (10) and the random special (20) several turns earlier. Decide the
resale yield deliberately; do not let it be inherited from the global.

**Prophet — random starting specials.** `createInitialState` deals `kit.specialCards` as fixed ids.
Prophet draws 2 from the full special pool. `Kit.specialCards` is a typed `CardId[]` inside an
`as const satisfies Record<KitId, Kit>` catalog, so a `'random'` sentinel cannot be smuggled in;
add a distinct field. The `rng` is already in scope in `makePlayer`. **Determinism warning:** draws
are sequential and shared across seats, so adding picks shifts the stream for every later seat —
every fixed-seed test and every stored simulation baseline changes output. Land this in a task that
expects to regenerate baselines, not as a side effect of a kit entry.

**Ghost — life-loss observation.** Not a catalog entry: see §4.6.

**Duplicator — activation as a turn action.** Activation replaces the turn's action, is
anticipatory, covers the following table round only, and must be renewed. That is per-player
turn-scoped state on `Player`, classified in the view builder, plus a **new `TurnAction` variant**
— the audit counted 10 to 12 contact points for a new action type, including three duplicated
copies of `PublicActionKind`, the client emitter, the action log's `switch` with no `default`, and
the bot's `scoreAction`, where a new variant would otherwise fall silently into the
`sellUpgradePoint` branch. Invisibility's manual deactivation is the same shape, so the two tasks
share the pattern.

Also worth recording, because it is visible to players and looks like a bug: **`alwaysUpgraded` is
never retro-applied.** A player who clones the Warrior does not get their existing attack cards
upgraded, and a Warrior who clones another kit keeps theirs. That follows from the acquisition-time
model; #V4-26 confirms it is intended before players read it as a defect. Separately,
`kit-inspect-dialog.tsx` renders traits from a hand-written list of sections, so **every new trait
is silently invisible in the UI until someone writes its section** — no `satisfies` catches it.

---

## 5. Protocol changes

`PROTOCOL_VERSION` is bumped **exactly once for the whole of V4**, from 22 to 23, in the
sub-choice factoring task (backlog **L20-18**), because that task replaces a message pair and
cannot land on a stale version. No other task bumps it. The bump is deliberately **not** tied to
#V4-30: the player-count confirmation is a separate task with no protocol effect.

| Change | Kind | Section |
|---|---|---|
| `subChoiceRequired` / `resolveSubChoice` replace the Mirror and reward pairs | Replacement | §4.4 |
| `TurnStartedPayload` gains the remaining consecutive-turn count | Additive | §4.5 |
| `PendingEffectView` gains `redirectedBy` | Additive | §4.7 |
| `PlayingStateView` gains `pool` | Additive | §4.3 |
| New `TurnAction` / `PublicActionKind` variants: deactivate a persistent, activate duplication | Additive | §4.8 |
| `ActionResolvedEvent.outcome` gains `'blocked'` | Additive | §4.2 |
| New `PersistentEffectView` entries for the new persistent specials | Additive | §5.1 |

### 5.1 Visibility classification of every new field

Protocol golden rule 4: a field is not added until the view builder classifies it. Decided here so
no task defaults it. Includes the two fields that are not card-driven.

| Field | Classification | Reason |
|---|---|---|
| `GameState.pool` | **Public** | Rules spec §1: "visible to all players". Required by §10.1. |
| `GameState` monotonic instance counter (§3.3 #1) | **Server-only** | Pure id plumbing. It reveals nothing, and no client needs it — but it must be classified, not omitted. Distinct from `seed`, which is server-only because it is dangerous. |
| `GameState` generic `SubChoiceState` slot and queue (§4.4) | **Not in the state view at all** | `mirrorChoice` and `rewardChoice` are already outside `StateView`, delivered unicast as their own events. The generic version keeps that: a sub-choice's payload reaches its owner only. |
| `Player.blockTurnsRemaining` | **Public** | The whole table is waiting on it; hiding it makes the screen unreadable. |
| `Player.isInvisible` (or its persistent-effect equivalent) | **Public** | Opponents must know why their action returned `'immune'`. Consistent with `activePersistentEffects` being public since PROTOCOL 19. |
| `Player.duplicationActiveUntil` (or equivalent) | **Public** | It changes what every opponent's gain does. |
| `Player.attackBlockCharges` (Attack Thief) | **Public presence** | Mirrors `activeShield`, public since PROTOCOL 20 as presence-plus-tier with the point count private. |
| `PendingEffect.redirectedBy` | **Public** | The pending queue is already public. |
| Reanimation armed on a player | **Public** | Via `activePersistentEffects` (#V4-12b). `pendingReanimation` is also public while revive is queued after elim. |
| Curse active on a victim | **Public** | Persistent effects are already public per seat. |
| The card stolen by Card Thief | **Private to thief and victim** | Its identity reaches the thief's hand, but `PublicPlayerView` publishes no hand count, so other seats learn nothing. Do **not** put the stolen `cardId` in the public `ActionPlayedLogEntry`, which carries the *played* card. |
| The special drawn by Card Transformer | **Private to the user** | Same reasoning. The transformation is public, the result is a card in hand. |
| The 4 cards taken by Card Absorber | **Public** | They leave a public pool; their disappearance is observable anyway. |

---

## 6. Bots

Designer ruling 2026-08-04 (§2.1 #2): the heuristic policy must decide the new content. Without a
branch, a card is not merely absent — it is played near-randomly against drawing (§3.3 #4), which
is worse, because it pollutes the simulation instead of being missing from it.

Scope of Lot 29:

- **Fix the fallback first** (Lot 20), then **re-run the V3 baseline**. The published
  gross-imbalance screen was produced under that defect and cannot be compared to a V4 run.
- **One scoring branch per new special card.** `scorePlayCard` is 239 lines over 17 branches, ~11
  lines each; fourteen more of that order roughly doubles the file, so splitting it per card family
  is a prerequisite, not a nicety.
- **Three transverse recalibrations**, each a concrete gap the audit found — there are no per-kit
  branches beyond these:
  1. `{ type: 'draw' }` scores a hardcoded `sustain` regardless of the kit's `draw` value, so a
     Tactician bot (draw 4) draws as reluctantly as an Untouchable (draw 1), and a Wizard bot
     (draw 2) likewise.
  2. `REGEN_SOFT_LIFE = 6` and `TAX_LIFE_BUFFER = 5` are absolute thresholds calibrated for
     10-life kits, so a Tactician bot (1 life) will never play Tax or anything with a life cost,
     and an Indestructible bot (18 lives) is needlessly timid.
  3. `scorePlayCard`'s Suicide branch is gated on `kitId === 'kamikaze'`, so a Suicide **stolen**
     by any other kit falls through to the fallback.
- **`isImmuneTarget` derived from `KitTraits.immuneTo`** (§3.3 #5).
- **The two new action types scored explicitly**, or they land in the `sellUpgradePoint` fallback.
- **Every noise rate and weight stays a tunable default and a module constant.** V3 open decision
  #V3-5 is not reopened.

The V3 Definition of Done clause applies to every Lot 29 task: a green `pnpm verify` on a heuristic
is necessary and not sufficient — the developer watches a full game and signs off.

---

## 7. Simulation

The instrument is V3's; V4 feeds it more content. Three consequences to plan for:

- **1v1 coverage goes from 6 cells to 105.** `run-gross-imbalance.ts` sweeps
  `unorderedPairs(KIT_IDS)`: C(4,2)=6 today, C(15,2)=105 with 15 kits. At the current 200 games per
  cell that is 21 000 games instead of 1 200, plus the multi-player cell, whose hardcoded 4-kit
  list also needs replacing. Either accept the runtime, reduce games per cell, or sweep in tranches
  — and **`log` what was dropped**, because a silent cap reads as full coverage.
- **The stall rate will get worse before it gets better.** The V3 screen already lost 104 of 1400
  games to `MAX_TURNS = 2500`, on invest / chip / Untouchable loops. Invisibility (immune, +4
  points/turn, manual deactivation only), Super Regeneration (+18 lives), Indestructible (18
  starting lives with Tax and Regeneration upgraded) and Reanimation (a second life) all make
  non-termination structurally more likely. Stalls stay **counted, never assigned a winner**, and
  the stall rate is itself a reportable finding.
- `--kits` already accepts the new ids with no change (§3.1).

---

## 8. Content tables

Values transcribed from `docs/spec_bataille_des_cartes_en.md`. **Every value is to be re-verified
against that document, one by one, at implementation time** — a wrong damage or price number
triggers no alert anywhere.

### 8.1 The 14 new special cards

| Id | Name | Price | Counter | Notes |
|---|---|---|---|---|
| `upgrade-point-thief` | Upgrade Point Thief | 5 pts | — | Mass theft of unspent UP + strips upgrades, 1 UP per upgrade removed. Upgraded: also all points. |
| `block` | Block | 5 pts | — | Cancels pending against user, then 3 consecutive turns (7 upgraded), no attack cards. |
| `super-regeneration` | Super Regeneration | 6 pts | — | +9 lives (+18 upgraded). Life cap applies. |
| `card-thief` | Card Thief | 5 pts | — | Steals a random card from a chosen opponent; a chosen card if that opponent is spied. Upgraded: one from every opponent. |
| `card-transformer` | Card Transformer | 2 pts | — | Turns an owned action/attack card into a random special. Upgraded: choose the special. |
| `invisibility` | Invisibility | 10 pts | — | Immune to opposing actions, +4 pts/turn (+6 upgraded). **Manual deactivation only.** |
| `reanimation` | Reanimation | 8 pts | — | Armed in advance; on a later elimination, return with a random kit and its starting resources. Upgraded: choose the kit. |
| `card-absorber` | Card Absorber | 4 pts | — | Recovers 4 random cards from the shared pool. Upgraded: choose them. |
| `mega-attack` | MEGA ATTACK | 16 pts | — | **Attack card.** 20 damage to every player. Shield applies. Base: only an upgraded Mirror redirects it. Upgraded: never redirectable. |
| `super-mirror` | Super Mirror | 7 pts | — | Redirects every attack pending on the user to all opponents, each independently. Not re-redirectable by a regular Mirror. Upgraded: doubles the damage. |
| `super-absorber` | Super Absorber | 8 pts | **2** | Absorbs all points, lives and UP spent by all opponents while the counter holds. Upgraded: doubles the gains. |
| `curse` | Curse | 8 pts | — | A chosen opponent loses 1 life per 3 points they spend on their turn (per 2 upgraded). Deactivates when the victim reaches 1 life — it cannot finish them off. |
| `poison` | Poison | 8 pts | **3** | All opponents lose 1 life per turn (2 upgraded) while the counter holds. |
| `attack-thief` | Attack Thief | 8 pts | — | Blocks one attack targeting the user, once, and steals a random attack card from each opponent. Upgraded: all attack cards from all opponents. |

Existing counters, unchanged: Points Generator 3, Imposition 2.

### 8.2 The 11 new kits

| Id | Name | Lives | Pts | UP | Draw | Action | Attack | Trait | Specials |
|---|---|---|---|---|---|---|---|---|---|
| `upgrader` | Upgrader | 10 | 0 | 3 | 1 | 4 | 2 | UP costs 5 instead of 10 | Upgrade Point Thief |
| `tactician` | Tactician | 1 | 15 | 0 | 4 | 2 | 2 | Spy, Thief, Mirror always upgraded | Block |
| `indestructible` | Indestructible | 18 | 0 | 0 | 1 | 4 | 1 | Tax, Regeneration always upgraded | Super Regeneration |
| `prophet` | Prophet | 10 | 4 | 2 | 1 | 5 | 2 | — | 2 random from the full special pool |
| `specialist` | Specialist | 8 | 4 | 0 | 1 | 3 | 2 | Absorber always upgraded | 2× Card Transformer, Card Thief, Super Absorber |
| `ghost` | Ghost | 14 | 0 | 0 | 1 | 4 | 2 | Every life lost, any cause, grants 2 points | Curse |
| `witch` | Witch | 10 | 0 | 1 | 1 | 5 | 2 | Thief always upgraded | Reanimation, Poison |
| `warrior` | Warrior | 10 | 0 | 0 | 1 | 3 | 3 | All attacks always upgraded | Card Absorber |
| `wizard` | Wizard | 10 | 4 | 0 | 2 | 4 | 2 | Thief always upgraded | MEGA ATTACK |
| `juggernaut` | Juggernaut | 14 | 4 | 1 | 1 | 4 | 2 | Shield always upgraded | Super Mirror |
| `duplicator` | Duplicator | 2 | 0 | 0 | 1 | 1 | 0 | Activatable duplication (rules spec §4) | Imposition, Attack Thief |

Art file mapping — the id-to-filename map is declared, never derived (`scientific` →
`Scientist.png` today). New entries: `wizard` → `Magician.png`, the ten others → their capitalised
display name. **`duplicator` has no art**; `Duplicator.png` must be produced, or the kit compiles
and then throws at runtime in `urlFromGlob`.

---

## 9. Definition of Done — V4

V1's automated gate applies in full, plus V3's bot clause and two V4 additions.

- [ ] `pnpm verify` green — typecheck, lint, every existing test
- [ ] No V1, V2 or V3 test weakened, skipped or deleted to accommodate new content
- [ ] **No value changed anywhere.** A task that appears to need a rebalance stops and asks
- [ ] **No rule invented.** Every case the rules spec does not resolve is an entry in §11, and the
      dependent task stays `Blocked` until the designer rules. A §11 recommendation is not a
      licence to implement
- [ ] Every new card has tests for its base **and** upgraded version
- [ ] Every new state field explicitly classified in the view builder, in the same change
- [ ] `PROTOCOL_VERSION` bumped exactly once for the whole of V4
- [ ] Determinism holds: same seed and config → identical simulator output
- [ ] For a policy task, the developer has watched a bot play a full game and signed off
- [ ] The task's own **Acceptance** line in `docs/backlog_v4.md` is satisfied
- [ ] Status flipped to `Done` in `docs/backlog_v4.md`, in the same change as the code
- [ ] Committed with a Conventional Commit referencing the task id (`AGENTS.md` §10)

---

## 10. Invariants and guard tests

§10.1 to §10.4 of technical spec v3 stay in force. V4 adds and amends the following.

### 10.1 View parity for the 30-card set

The V3 invariant: for the implemented card set, the legal set computed from authoritative
`GameState` equals the legal set computed from the acting player's `PlayingStateView` alone.

- **Card Absorber** reads the pool, so the pool enters the view and `enumerationStateFromView`
  reconstructs it. Without that, `canPlay` is legal from state and illegal from view, and
  `list-legal-actions-view-guard.test.ts` fails immediately.
- **Card Thief** is the harder case and **parity is not free**. Its "choose the card if the
  opponent is spied" branch is view-safe *only under the reading that "spied" means "spied by the
  acting player"* — that relation is in the acting player's own view. Under the reading "spied by
  anyone", it is not (#V4-35). And independently of that, if `canPlay` requires the victim to hold
  at least one card — the natural reading of #V4-15's Mirror precedent, applied consistently —
  parity **breaks**, because `PublicPlayerView` publishes no hand count by design. Both readings
  must be ruled on (#V4-34, #V4-35) before the handler is written; neither can be resolved by the
  implementer without either inventing a rule or leaking hidden state through legality.

A failing §10.1 guard remains a **rule or handler question**, not a flaky test. Stop and ask.

### 10.2 The sub-choice gate is one gate

After the §4.4 factoring, exactly one predicate decides whether a sub-choice blocks other actions,
it lives in the engine, and both `performTurnAction` and `listLegalActions` consult it. Test: while
any sub-choice is active, `listLegalActions` returns only that sub-choice's resolutions and the
engine rejects everything else. Today the gate is split across `performTurnAction` (rewards only),
`game-room.handleAction` (Mirror only), and nothing at all in the enumerator.

### 10.3 Elimination is reversible, and only by Reanimation

`isEliminated` is read at 77 non-test sites across 35 files and is currently never reset. Test that
a reanimated player: re-enters the turn order; does not trigger `gameOver` as the sole survivor
while their Reanimation is armed; can be eliminated again afterwards with a **fresh**
`eliminationSnapshot` (`captureEliminationSnapshot` early-returns when a snapshot exists, so a
second death would otherwise freeze the reveal on the first); and does not have their reconnection
promise rejected. The three duplicated sole-survivor implementations — `findSoleSurvivorId` and the
two `findWinner`s — must agree; consolidating them is part of the task.

### 10.4 Pool integrity replaces pool immutability

The old "the pool never shrinks" test is deleted because V4 makes it false, so it is **replaced**
rather than dropped: every `instanceId` in the pool is unique at every point in a game, including
after removals, and a card removed from the pool is in exactly one player's zone.

### 10.5 Attack-ness is declared, and equal damage compares final damage

Two amendments, both correcting documents that are wrong about the current build:

- **`v1-scope.test.ts` becomes `content-scope.test.ts`.** It can no longer assert that
  damage-dealing ids are disjoint from special ids, because MEGA ATTACK is both. It asserts instead
  that every id `isAttackCardId` accepts belongs to `ATTACK_CARD_IDS` or
  `SPECIAL_ATTACK_CARD_IDS`, that those two arrays are disjoint, and that `ATTACK_DAMAGE` covers
  their union. The card-side assertions land in Lot 20; the 15-kit assertion lands with the last
  kit (backlog L28-03), since it is false until then.
- **Delete the "distinct damage values" claim** from `engine.md` golden rule 4 and technical spec
  v1 §6.3, and add the tests that were missing: a mutual pair between two *different* cards whose
  `damageMultiplier` brings them to the same final damage cancels both, and a mutual pair with
  unequal final damage cancels the weaker. No test currently combines `damageMultiplier` with a
  mutual pair, which is why the false premise survived three versions.

Also test, because `resolveMutualAttack` uses `findIndex` and therefore matches the **first**
retaliation in array order rather than the strongest: a player holding several pending attacks
against one source — reachable via Assassin's multi-attack today, and via MEGA ATTACK and Super
Mirror in V4 — has a defined, tested pairing. Which pairing is correct is #V4-3.

---

## 11. Open decisions — rule before the dependent task starts

**Undefined, not inferred.** Golden rule 6. Each entry blocks a specific task in
`docs/backlog_v4.md`. Recommendations are the author's reading of the rules spec; **a
recommendation is not a default and may not be implemented before it is ruled on.**

| # | Question | Options / recommendation | Blocks |
|---|---|---|---|
| ~~**#V4-1**~~ | ~~MEGA includes user?~~ — **ruled in §11.4** | L23-01 |
| **#V4-2** | Does mutual cancellation compare final damage (multiplier included) or card identity at equal upgrade? | The code already compares final damage, so a Mirror-doubled basic attack (2) cancels a strong attack (2) **today**. Recommendation: **confirm final damage**, and correct the two documents that claim otherwise. If the intent was card identity, that is a behaviour change to existing code and a separate task. | L20-07 |
| ~~**#V4-3**~~ | ~~Multi-pending mutual pairing~~ — **ruled in §11.1** | L23-01, L20-07 |
| ~~**#V4-4**~~ | ~~Super Mirror choice vs auto~~ — **ruled in §11.4** | L23-02 |
| ~~**#V4-5**~~ | ~~Attack Thief charge vs mutual~~ — **ruled in §11.4** | L23-03 |
| **#V4-6** | During a Block chain, do the inactivity and absence counters keep running? | As written they do, and an AFK user of upgraded Block self-eliminates on turn 5 of their own 7. Recommendation: **the chain is one turn for lifecycle purposes** — one 30-second timer per Block turn, but a single timeout ends the chain and counts as one inactive turn. Alternative: freeze the counters for the chain's duration. | L25-01 |
| **#V4-7** | Block "cancels any action pending resolution against the user" — does that include persistent effects targeting them (Poison, Curse, Imposition ticks)? | Recommendation: **the pending queue only**. Persistents are active effects, not pending resolutions, and Cloning — the only other blanket canceller — clears `pendingEffects` alone. | L25-01 |
| **#V4-8** | With 3 to 7 Block turns, what is "the target's last complete turn" for Absorber, and does the turn ledger reset on each Block turn? | Recommendation: **reset per Block turn**, so Absorber reads the most recent one. This makes Block a partial Absorber defence, which may or may not be intended. | L25-01 |
| **#V4-9** | Invisibility makes the user "immune to any opposing action". Scope? | Four sub-questions, each needing an answer: does it stop already-active persistent ticks on the user (Poison, Curse, Imposition)? Does it stop attacks, MEGA ATTACK included? Can the user still be hit by a Sentence, which is a random draw rather than an action against them? Does an opponent's targeting attempt become an invalid action, or resolve as `'immune'`? Recommendation: **resolve as `'immune'` rather than reject**, so the opponent's information is not distorted, and **persistents already active continue** — otherwise Invisibility is a universal cleanser at 10 points. | L25-02 |
| **#V4-10** | Does deactivating Invisibility consume the turn's action? | Recommendation: **yes**. Every state change costs an action, and a free deactivation lets the user become vulnerable and act in the same turn. | L25-02 |
| ~~**#V4-11**~~ | ~~Reanimation vs elimination rewards~~ — **ruled in §11.7** | L26-01 |
| ~~**#V4-12**~~ | ~~Reanimation lifecycle / public / stack / unused~~ — **ruled in §11.7** | L26-01 |
| ~~**#V4-13**~~ | ~~Upgraded Reanimation kit-pick timing~~ — **ruled in §11.7** | L26-02 |
| ~~**#V4-14**~~ | ~~Pool keeps isUpgraded / Absorber free upgrade~~ — **ruled in §11.5** | L24-01 |
| ~~**#V4-15**~~ | ~~Pool &lt; 4 / empty Absorber~~ — **ruled in §11.5** | L24-01 |
| ~~**#V4-16**~~ | ~~Transformer consumed destination + upgrade~~ — **ruled in §11.5** | L24-02 |
| **#V4-17** | Upgrade Point Thief strips "all of their currently upgraded cards". Does that include `shieldIsUpgraded` and the `isUpgraded` flag on already-active persistent effects? | Recommendation: **neither**. An active shield is not a card held, and an active persistent has already left `specialCards`. Say it explicitly, because "all upgraded cards" reads broader than the model. | L21-02 |
| **#V4-18** | Does the user gain an upgrade point for stripping an upgrade that came from a kit trait rather than from a spent upgrade point? | The rules spec says yes, explicitly. Recorded to confirm it is not a drafting accident: it makes Upgrade Point Thief far stronger against Warrior, Tactician, Scientific, Witch, Wizard, Indestructible, Juggernaut and Specialist. | L21-02 |
| **#V4-19** | Card Thief steals "a random card". Hand only, or hand plus unused special cards? | Attack Thief says "attack card" specifically, and elimination rewards say "including their unused special cards" explicitly. Recommendation: **hand and specials**, matching the elimination-reward vocabulary. | L21-03 |
| ~~**#V4-20**~~ | ~~Curse threshold / spent vs theft / permanent loss~~ — **ruled in §11.3** | L22-02 |
| ~~**#V4-21**~~ | ~~Super Absorber Tax lives + life cap~~ — **ruled in §11.3** | L22-03 |
| **#V4-22** | Ghost gains 2 points per life lost "whatever the cause". Does that include reaching 0 (their own elimination), a self-Sentence, and Cloning a lower-life opponent? | Recommendation: **every typed life loss yes; Cloning's resource copy no** — Cloning assigns rather than loses, and treating a downward copy as a loss would make an upward copy a gain, which cascades into the Duplicator. State it once here rather than deriving it twice. | L28-01 |
| **#V4-23** | Duplicator copies "all lives, points and upgrade points gained by all opponents, whatever the source". Does a shield gain count? Does Cloning's resource copy count as a gain? Is the copy subject to the life cap? | Recommendation: **shield no** (not one of the three named resources), **Cloning's copy no** (see #V4-22), **cap yes** (golden rule 9). | L28-02 |
| **#V4-24** | Duplicator starts with 0 attack cards and 1 action card. Intended, or a table typo? | The rules spec table reads 1 action / 0 attack, and the kit's own rebalancing note says "starting action cards from 1 to 2", which corroborates 1. Recommendation: **implement as written**, per the 2026-08-04 ruling. | L28-02 |
| **#V4-25** | Tactician draws 4, and the inactivity auto-draw uses the same code path. Accept, or cap the automatic draw? | Note the scenario that matters is **not** the AFK-until-elimination one: those 20 points die with the player, since inactivity elimination pays no eliminator. The reachable one is that `resetConnectedTimeouts` fires on **any** real action, so four deliberate timeouts (+16 points) followed by one action resets the counter, indefinitely, with no elimination. Technical spec v1's Appendix A already flagged "a future kit at Draw 4 would make going idle profitable". The rules spec knows nothing about timers (V1 open decision #7, still open). Recommendation: **accept for V4 and record it as a measurement target**, since capping the auto-draw is a balance decision and V4 changes no value. | L27-02 |
| **#V4-26** | `alwaysUpgraded` is applied at acquisition and never retro-applied, so a player who clones the Warrior does not get their existing attacks upgraded and a Warrior who clones another kit keeps theirs. Intended? | Recommendation: **yes, confirm as written** — it follows from the acquisition-time model, itself a locked decision. Worth confirming before players read it as a bug. | L27-06 |
| **#V4-27** | Prophet draws 2 specials "from the full pool of all existing special cards". All 20, duplicates possible? | Recommendation: **all 20, duplicates possible** — `rng.pick` with replacement, consistent with kit assignment being with replacement and with the starting deal allowing duplicates. | L27-04 |
| **#V4-28** | Upgrader buys an upgrade point for 5. Does the resale yield stay 7? | See §4.8 for the precise framing. The round trip's sign flips from −3 to +2, and a bare sale yields +7 in one action with no capital, on a kit holding 3 starting upgrade points. Recommendation: **decide the yield explicitly rather than inherit 7.** | L27-01 |
| **#V4-29** | The 20-point random special purchase was restricted to the 6 V1 specials by ruling §6.2 #10. Does it now draw from all 20? | Recommendation: **all 20** — the restriction was explicitly a scope artefact, not a rule. | L21-01 |
| **#V4-30** | Confirm the player count stays 2 to 4. | Seven new or existing cards scale with the opponent count (MEGA ATTACK, Poison, Imposition, Spy Thief, Attack Thief, upgraded Card Thief, Super Mirror), and God mode — out of V4 — would want up to 7 seats. Recommendation: **stays 2 to 4 in V4**, so any change lands with the mode that needs it. | L20-19 |
| ~~**#V4-31**~~ | ~~Attack Thief steal MEGA?~~ — **ruled in §11.4** | L23-03 |
| ~~**#V4-32**~~ | ~~Assassin multi-attack + MEGA?~~ — **ruled in §11.4** | L23-01 |
| **#V4-33** | Does the Counter Rule apply to the new direct-theft cards? | Rules spec §1 states the rule **generically** — "a card that inflicts a direct effect on an opponent … can be countered by the same card played back against the source" — with Spy and Thief as examples, not as the list. Card Thief, Upgrade Point Thief, Attack Thief and Curse all alter an opponent's resources against their will. The code freezes `COUNTERABLE_CARD_IDS = new Set(['spy','thief'])` and `engine.md` says "Spy and Thief only". The same question applies to Untouchable's `immuneTo` (also `['thief','spy']`, by card id) and to upgraded Shield's Thief/Spy block, which already carries an explicit `spy-thief` exemption from a Lot 5 ruling. Recommendation: **rule the generic principle once, for all four new cards plus the two existing exemption mechanisms**, rather than card by card. | L21-02, L21-03, L22-02, L23-03 |
| **#V4-34** | Card Thief against an opponent with no cards: invalid action, or a wasted play? | If `canPlay` requires the victim to hold a card, §10.1 parity breaks — `PublicPlayerView` publishes no hand count by design (§10.1). Recommendation: **the play is legal and resolves as a no-op**, which keeps parity intact. This is the first case where the Mirror "invalid, not wasted" precedent must be *rejected* to preserve hidden information; say so deliberately. | L21-03 |
| **#V4-35** | "If that opponent is currently spied on (Spy active on them)" — spied by the user, or by anyone? | Recommendation: **by the user**. Under the "anyone" reading the branch's legality depends on a relation absent from the acting player's view, which breaks §10.1 and leaks a third party's Spy through legality. | L21-03 |
| ~~**#V4-36**~~ | ~~Reanimation starting resources + old hand~~ — **ruled in §11.7** | L26-01 |
| **#V4-37** | Warrior's "all attacks already upgraded" — does it cover MEGA ATTACK? | After §4.1, "attack" is ambiguous. If `mega-attack` joins Warrior's `alwaysUpgraded`, a Warrior who acquires one by any route (20-point random purchase, Card Transformer, theft, elimination reward) gets it **upgraded, hence never redirectable**, for free. If it does not, "all attacks" is literally false. Recommendation: **shared attack cards only**, so the trait means the three buyable attacks. | L27-06 |

---

## 12. Out of V4 scope

Not to be implemented, even partially, even "to lay groundwork" — same discipline as technical spec
v1 §9, v2 §9 and v3 §13:

- **Team, God and Quick modes.** Including the God role, its 16th-kit-shaped entry, the per-mode
  life caps beyond Classic's 25, and the >4 player counts God mode implies.
- **Any rebalancing decision.** V4 implements the rules spec's values and produces a screen.
  Kamikaze at 78% is not fixed here. The Duplicator's rebalancing hypothesis is not applied.
- **Rewriting the rules spec.** V4 produces Appendix A; writing it in stays the designer's task.
- Learning bots, search, lookahead, opponent modelling beyond V3 §4.4's derived reads.
- Accounts, in-progress persistence, monetization, spectator mode, replay playback.
- New art beyond `Duplicator.png`.

---

## Appendix A — Amendments the rules spec needs

Points established while writing this spec that `spec_bataille_des_cartes_en.md` does not state, or
states wrongly. Same role as technical spec v1's Appendix A: **a list for the designer, not a
licence to implement.** Anything here that also blocks code has a §11 entry.

| # | Point | Nature |
|---|---|---|
| 1 | §6 Mutual Attacks: equality is a comparison of **final** damage, multipliers included, not of card identity. A Mirror-doubled basic attack cancels a strong attack. | Clarification — and a correction of technical spec v1 §6.3 and `engine.md` |
| 2 | §5 MEGA ATTACK: state explicitly whether the user is among "every player in the game". | Gap |
| 3 | §5 MEGA ATTACK: it is an attack card, so state its exclusion from the shop and the starting deal (which §5 implies), and rule on the Assassin's multi-attack, Attack Thief's steal, and Warrior's trait (which §5 does not). | Gap |
| 4 | §5 Block: interaction with the turn timer and the inactivity mechanism. The rules spec knows nothing about timers (V1 open decision #7, still open). | Addition |
| 5 | §5 Block: whether "actions pending resolution" includes active persistent effects. | Gap |
| 6 | §5 Invisibility: scope of "immune to any opposing action" — persistents already active, attacks, Sentence's random draw. | Gap |
| 7 | §5 Invisibility: deactivation costs the turn's action. | Gap |
| 8 | §5 Reanimation: whether the eliminator is paid for a reversed elimination; whether it applies to elimination by absence or forfeit; whether "starting resources" includes cards. | Gap |
| 9 | §5 Curse: per-turn evaluation with the remainder discarded, and "spent" excludes points stolen. | Clarification |
| 10 | §5 Card Thief: "a card" covers unused special cards; and what happens against an empty hand. | Clarification |
| 11 | §5 Card Transformer: the consumed card goes to the shared pool and its upgrade is lost. | Gap |
| 12 | §5 Upgrade Point Thief: an active shield's upgrade and an active persistent's upgrade are out of reach. | Clarification |
| 13 | §1 Counter Rule: the rule is stated generically but only Spy and Thief are named. Card Thief, Upgrade Point Thief, Attack Thief and Curse all fit the generic wording. Name the full list. | Gap |
| 14 | §1 Shared pool: cards keep their upgrade state in the pool, so Card Absorber can recover an upgraded card for free. | Clarification |
| 15 | §4 Upgrader: the resale yield of an upgrade point for this kit. | Gap |
| 16 | §4 Kit upgrades: `alwaysUpgraded` is never retro-applied, so Cloning does not transfer it to cards already held. | Clarification |
| 17 | §4 Tactician: Draw 4 makes deliberate inactivity worth 4 points a turn, and the timeout counter resets on any real action. Already flagged in technical spec v1's Appendix A as a balancing note; now reachable. | Balancing note |
| 18 | §5 The 20-point random special purchase now draws from all 20 specials. | Clarification (closes a V1 scope artefact) |

## 11.1 Ruled in Lot 20 (2026-08-04)

| # | Ruling | Recorded in |
|---|---|---|
| **#V4-2** | Mutual cancel compares **final damage** (multiplier included), not card identity. Docs corrected; no behaviour change. | `decisions.md`, L20-07 |
| **#V4-3** | Each of N pending attacks pairs **independently** on its own target's turn. | `decisions.md`, L20-07 |
| **#V4-30** | Player count stays **2–4** in V4 (docs-only). | `decisions.md`, L20-19 |

## 11.2 Ruled in Lot 21 (2026-08-05)

| # | Ruling | Recorded in |
|---|---|---|
| **#V4-29** | 20-pt random special purchase draws from **all 20** specials; pending-handler specials may be granted and stay unplayable until their handler lands. | `decisions.md`, L21-01 |
| **#V4-17** | Upgrade Point Thief strip **includes** `shieldIsUpgraded` and active-persistent `isUpgraded`; each yields 1 UP. | `decisions.md`, L21-02 |
| **#V4-18** | Kit-trait upgrades yield 1 UP on strip; later acquisitions re-upgrade via `alwaysUpgraded`. | `decisions.md`, L21-02 |
| **#V4-33** | Counter Rule / Untouchable `immuneTo` / upgraded Shield block stay **Spy + Thief only**. | `decisions.md`, L21-02 |
| **#V4-19** | Card Thief steals from **hand + unused specials**. | `decisions.md`, L21-03 |
| **#V4-34** | Empty victim: play is **legal, resolve no-op**. | `decisions.md`, L21-03 |
| **#V4-35** | "Spied" means Spy from **the user**, not anyone. | `decisions.md`, L21-03 |

## 11.3 Ruled in Lot 22 (2026-08-05)

| # | Ruling | Recorded in |
|---|---|---|
| **#V4-20** | Curse: **per turn**, remainder discarded; `pointsSpent` only; permanently lost at 1 life. | `decisions.md`, L22-02 |
| **#V4-21** | Super Absorber absorbs Tax (and all `livesLost`) as lives gained; **life cap applies**. | `decisions.md`, L22-03 |

## 11.4 Ruled in Lot 23 (2026-08-05)

| # | Ruling | Recorded in |
|---|---|---|
| **#V4-1** | MEGA ATTACK targets **alive opponents only** (not the user). | `decisions.md`, L23-01 |
| **#V4-32** | Assassin **may not** include MEGA in a multi-attack (`isSharedAttackCardId`). | `decisions.md`, L23-01 |
| **#V4-4** | Super Mirror: **no choice** — all pending attacks → every opponent. | `decisions.md`, L23-02 |
| **#V4-5** | Attack Thief charge spent **before** mutual cancel (overrides preserve-charge recommendation). | `decisions.md`, L23-03 |
| **#V4-31** | Attack Thief steals **shared** attacks only; MEGA excluded. | `decisions.md`, L23-03 |

## 11.5 Ruled in Lot 24 (2026-08-05)

| # | Ruling | Recorded in |
|---|---|---|
| **#V4-14** | Pool instances keep `isUpgraded`; Absorber recovery preserves it (`alwaysUpgraded` may still force). | `decisions.md`, L24-01 |
| **#V4-15** | Absorber takes `min(4, pool.length)`; `canPlay` requires `pool.length >= 1`. | `decisions.md`, L24-01 |
| **#V4-16** | Transformer: consumed hand card → pool as-is; special result does not inherit upgrade; duplicates allowed. | `decisions.md`, L24-02 |
| *(addr.)* | Optional `consumeInstanceId` on play; eligible = hand `SHARED_CARD_IDS` only. `GameState.subChoice` holds `pool-pick` / `special-pick` (Approach B). | `decisions.md`, L24-01/02 |

## 11.6 Ruled in Lot 25 (2026-08-05)

| # | Ruling | Recorded in |
|---|---|---|
| **#V4-6** | Block chain = **one** lifecycle turn: one 30s timer per Block turn; one timeout **ends the chain** and counts as **one** inactive/absent tick. | `decisions.md`, L25-01 |
| **#V4-7** | Block cancels **`pendingEffects` only** (not Poison/Curse/Imposition). | `decisions.md`, L25-01 |
| **#V4-8** | Turn ledger **resets each** Block turn; Absorber reads the most recent. | `decisions.md`, L25-01 |
| **#V4-9a** | Invisibility: already-active persistents **stay**; their **ticks skip** while the user is invisible and resume after deactivate. | `decisions.md`, L25-02 |
| **#V4-9b** | Invisible user is immune to attacks including MEGA ATTACK. | `decisions.md`, L25-02 |
| **#V4-9c** | Invisible player is **excluded from Sentence's candidate pool**. | `decisions.md`, L25-02 |
| **#V4-9d** | Targeting an invisible player is legal and resolves as `'immune'` (not rejected). | `decisions.md`, L25-02 |
| *(addr.)* | Cloning covered by invisibility immunity; lifecycle elim **not** blocked. Block attack ban = play/use only (buy/upgrade OK). Each Block cancel emits `'blocked'`. | `decisions.md`, L25 |
| **#V4-10** | Deactivating Invisibility **consumes** the turn's action. | `decisions.md`, L25-02 |

## 11.7 Ruled in Lot 26 (2026-08-05)

| # | Ruling | Recorded in |
|---|---|---|
| **#V4-11** | Elimination **happens**; eliminator is **paid**; victim returns **stripped** (overrides intercept-before-mark recommendation). | `decisions.md`, L26-01 |
| **#V4-12a** | Fires on **every** elim path including lifecycle. | `decisions.md`, L26-01 |
| **#V4-12b** | Armed Reanimation is **public** via `activePersistentEffects`. | `decisions.md`, L26-01 |
| **#V4-12c** | At most **one** armed; second play **rejected**. | `decisions.md`, L26-01 |
| **#V4-12d** | Consumed on **trigger only**; unused evaporates at game end. | `decisions.md`, L26-01 |
| **#V4-36** | Full restart steps **2+3+4**; leftovers after rewards/dump already pooled. | `decisions.md`, L26-01 |
| **#V4-13** | Upgraded kit pick = immediate blocking `reanimation-kit` sub-choice after rewards; expiry → seeded random; bot resolves. | `decisions.md`, L26-02 |
| *(addr.)* | Revive **after** rewards/dump; serial rewards → kit pick → reset. Architecture: persistent arm + `pendingReanimation`. | `decisions.md`, L26 |

