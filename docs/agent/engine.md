# docs/agent/engine.md — Game engine

> Read before touching the turn loop, the resolution queue, life loss, mutual attacks, the
> turn ledger, or elimination. Transverse rules → `/AGENTS.md`.
> Cards → `card-handler.md`. State delivery → `protocol.md`.
>
> Sources: technical spec §4.2–§4.6, §6.2, §6.3 · rules spec §1, §6, §7 ·
> types in `packages/shared/src/domain/{effect,player,game-state}.ts`.
>
> **Status:** life primitives (L0-04), seeded RNG + shuffle (L0-05 / L1-03), turn loop + queue
> (L1-04…L1-07), attack resolution including mutual attacks (L2-05), and turn-ledger writers
> (spend vs theft, L3-07) live under `apps/server/src/engine/`.

## Golden rules

`/AGENTS.md` golden rules 1, 2, 3 and 9 govern this domain — mutual attacks, the two life-loss
primitives, resolution ordering, and the life cap. They are stated there and not repeated here.
What follows is what those rules do not say.

1. **Never wrap the two life-loss primitives in a shared helper that "handles both".** A
   `boolean` parameter, an options object, or a dispatcher choosing between them is the merged
   path wearing a disguise, and it fails the same silent way.
2. **`turnSequence` is a single global counter on `GameState`.** It stamps `queuedAt`.
   A per-player counter makes cross-player ordering meaningless.
3. **The mutual-attack comparison always triggers on the turn of the player who attacked
   second**, because a retaliation can only be born during that player's own turn, whose
   resolution phase follows immediately.
4. **Mutual cancellation compares final damage** (base/upgraded damage × `damageMultiplier`),
   not card identity (#V4-2). Equal final damage cancels both even when the cards differ
   (e.g. Mirror-doubled basic = 2 cancels strong = 2). Unequal cancels the weaker; the
   stronger stays pending (Lot 19 / AGENTS golden rule 1).

## The two life-loss primitives

Technical spec §4.2, materialising rules spec §1. One function per file, in
`apps/server/src/engine/life/`, so neither can quietly grow into the other.

| | `applyDamage` | `applyLifeLoss` |
|---|---|---|
| Used by | Attack cards only | Tax, Suicide, Imposition, Poison, every non-attack loss |
| Shield | Absorbs first, excess carries to lives | Ignored entirely |
| Card counters | Decrements the hit player's active counters | Never touches them |

```ts
// apps/server/src/engine/life/{apply-damage,apply-life-loss,gain-lives}.ts
// `source: AttackCardId` is what makes the boundary structural: Tax's id is not an
// AttackCardId, so a call to applyDamage from Tax cannot compile.
function applyDamage(target: Player, amount: number, source: AttackCardId): DamageOutcome;
function applyLifeLoss(target: Player, amount: number, reason: LifeLossReason): LifeLossOutcome;
function gainLives(target: Player, amount: number, lifeLimit: number): LifeGainOutcome;
```

The shield absorbs damage only. Tax costs 1 life and the shield never protects against it,
even at full strength (rules spec §3). Counter cards — Points Generator (3), Imposition (2),
Poison (3), Super Absorber (2) — are independent of the combat shield: they do not protect,
and they lose a counter point only when their *user* loses a life to **damage**;
`applyLifeLoss` never decrements them (rules spec §5).

Three properties of the implementation, each decided rather than obvious:

- **The counter loses one point per life lost**, not one per damaging hit: a hit costing 3
  lives takes 3 counter points (ruling of 2026-07-29 in `decisions.md`). Damage the shield
  absorbs entirely costs no life and therefore no counter point.
- **They return an outcome, not `void`** as technical spec §4.2 writes them — the numbers are
  needed by the turn ledger (§4.4), `actionResolved` (§5.3) and Absorber, and a state diff
  taken afterwards cannot distinguish a shielded hit from an unshielded one. Mutation stays
  inside the primitive; the outcome only describes what happened.
- **Neither eliminates anybody.** Lives are floored at 0 and `isEliminated` is left alone:
  step 5 of the turn loop owns elimination.

`gainLives` is the *only* way a player ever gains lives — golden rule 9 has to live somewhere,
and clamping inline in each card would defeat it. It takes the cap as a parameter, always read
from `GameState.lifeLimit`.

### Direct `player.lives` mutations — exempted

Technical spec v4 §4.6. Five production call sites bypass the three life primitives. Each carries
an inline comment citing why; do not route them through `applyDamage` or `applyLifeLoss` without
a ruling — golden rule 2 forbids enriching those primitives to absorb these cases. Future kit
hooks (Ghost, Duplicator) observe outcomes caller-side, not inside the primitives.

**Ghost (#V4-22 / L28-01):** `creditGhostLifeLoss(state, player, livesLost)` after every typed
loss outcome and after Self-Suicide / Sentence (lives before assignment). Does **not**
run on Cloning's resource copy or elimination bookkeeping that zeros already-0 lives.
Routes through `grantPoints` so an active Duplicator can observe.

**Duplicator (#V4-23 / L28-02):** `grantPoints` / `grantUpgradePoints` / `grantLives` wrappers
observe `origin: 'direct'` via `observeDirectGain`. `Player.duplicationActive` is set by
`activateDuplication` and cleared in `advanceTurn` at the start of that seat's next turn.
The flag is **Spy-gated** on the view (designer 2026-08-06); non-spies see the activation as
an opaque `draw` in the action log. Shield gains and Cloning resource assignment never enter
the grant wrappers.

| Site | Why not a typed loss or gain |
|---|---|
| `resolve-pending.ts` — self-Suicide | Lethal self-elimination in one step (rules spec §5). Not a bounded debit; must not decrement card counters. Ghost credits `livesBefore` then assigns 0. |
| `resolve-pending.ts` — Sentence | Instant lethal effect (rules spec §5). Zeroes lives regardless of current count; not attack damage and not incremental loss. Ghost credits `livesBefore` then assigns 0. |
| `elimination-rewards.ts` — `eliminateWithoutReward` | Forfeit / absence elimination (technical spec §5.7). Player may still have lives; administrative marking, not a game-rule loss. No Ghost credit. |
| `elimination-rewards.ts` — `processEliminations` | Idempotent `lives = 0` when already at 0 from prior typed loss or lethal effect (technical spec §4.3 step 5). Bookkeeping only. No Ghost credit. |
| `cloning.ts` — resource copy | Snapshot assignment of the target's lives (rules spec §5). Can increase or decrease; neither `gainLives` nor a loss primitive. Upgrade bonus still uses `gainLives`. No Ghost credit (#V4-22). |

## Seeded randomness

`apps/server/src/engine/rng.ts`, technical spec §8, golden rule 5.

```ts
interface Rng {
  nextInt(maxExclusive: number): number; // uniform, rejection-sampled
  pick<T>(items: readonly T[]): T;       // throws on an empty list
}

function createRng(seed: string): Rng; // same seed, same sequence
function createSeed(): string;         // one per game, stored in GameState.seed
```

Every draw goes through an **injected** instance: card distribution (L4-02), Sentence (L5-07),
the 20-point special card purchase (L5-09), Mirror's default target on expiry (L3-09). A module
that calls `createRng` itself, or `Math.random()`, breaks reproducibility for everything
downstream of it.

Sub-choice deadlines (`mirrorChoice.deadlineMs`, `rewardChoice.deadlineMs`) take an **injected
`nowMs`** on `EffectContext` and the turn APIs (technical spec v3 §8.1 / L18-01). Defaults to
`Date.now()` at the API edge so the room keeps wall-clock behaviour; the simulator passes a
fixed value. Handlers must not call `Date.now()`. Pending-effect / persistent / elimination /
acquisition ids use seat/turn counters (never embed `GameState.seed` — it must stay
server-only; see `protocol.md`) so §10.3 can deep-equal whole states.

- The generator's algorithm is an implementation detail; tests assert reproducibility and
  bounds, never specific numbers.
- `nextInt` rejection-samples rather than taking a modulo, which would favour low indices and
  quietly bias distribution and Sentence.
- `shuffle` does not exist yet. The first task that needs one adds it here, rather than
  shuffling by hand with `nextInt`.
- **`GameState.seed` is server-only.** A client holding it can predict every remaining draw.
  See `protocol.md`.

## Turn loop

Technical spec §4.3. Steps 3 and 4 are where the invariant lives.

```
1. Player P's turn begins — 60s timer starts, deadline computed server side
2. P plays their single action
   (Assassin: several attack cards still count as ONE action)
   Timer expires → automatic draw
3. Resolve P's pendingEffects, ascending queuedAt
   Before each attack resolution: Attack Thief charge (#V4-5) then mutual cancellation
4. Apply persistent effects targeting P
5. Check elimination and victory
6. Next turn
```

Attack Thief (`Player.attackBlockCharges`, L23-03): if `attackBlockCharges > 0` when an
attack is about to resolve on P, spend one charge and emit `outcome: 'blocked'` **before**
mutual cancel — even when mutual would have cancelled that attack. Do not store the charge
in `PersistentEffect.counter` (`applyDamage` eats counters).

Invariant to hold at every step: **a player never suffers a loss of life or resources outside
their own turn, and never before playing their action.** "Drawing" grants no card — it gains
points equal to the kit's `draw` value (rules spec §6), read from
`getKit(player.kitId).startingResources.draw`.

## Tutorial overlay (Lot 45)

Room-owned `playKind` / `tutorialIndex`. After Classic deal, `applyTutorialSetup` overlays
seats (never `run-game.ts`). `intersectTutorialLegalActions` filters `listLegalActions`;
illegal intents get `tutorial-follow-coach` **before** `performTurnAction`. After a success,
`advanceTutorialCursor` bumps the index and may snap `currentTurnPlayerId` back when the
next scripted actor is the same seat (Draw then Tax). Handlers stay Classic.
Seeded walk: `tutorial-script-harness.ts` plus `tutorial-script.integration.test.ts` (L45-07).
Human overlay starts at **2 lives**; index 17 is Shield vs incoming Strong (lives stay 1).

## Kits and traits (Lot 4)

Roster: `packages/shared/src/domain/kit-catalog.ts`. Assignment at start is **with replacement**
(duplicates allowed). Distribution uses seeded `Rng` + `acquireCardToHand` /
`acquireSpecialCard` (`apps/server/src/engine/kits/`).

- **`alwaysUpgraded`**: checked on every acquisition helper call — never a one-shot at deal.
- **`immuneTo`**: resolve-time only (`isImmuneTo`); play still queues; public
  `actionResolved.outcome: 'immune'`.
- **Invisibility (L25-02 / #V4-9):** `playerIsInvisible` / active persistent
  `cardId === 'invisibility'`. Ready pending against an invisible player resolve as
  `'immune'` at the head of `resolvePendingEffects` (before mutual cancel). Victim-side
  persistent ticks (Imposition / Poison / Curse / Super Absorber) **skip** while invisible
  and resume after deactivate; own Invisibility + Points Generator ticks still run.
  Cloning reports `'immune'` via `immediateResolved`. Sentence excludes invisible seats
  from its candidate pool. Lifecycle elim is unaffected.
- **Block (L25-01):** `grantBlockTurns` sets `blockTurnsRemaining` and
  `blockAttacksForbidden` (ban must not rely on remaining alone — last chain turn has
  remaining 0). Attack **play/use** banned at the four portals; buy/upgrade stay legal.
  `#V4-6`: one timeout/absent auto-draw calls `endBlockChain` and counts as one lifecycle
  tick. Ledger resets each Block turn (`#V4-8`).
- **`allowsMultipleAttacksPerTurn`**: Assassin uses `playMultipleAttacks` (min 2, all-or-nothing);
  single attack still `playCard`.
- Specials are granted at start but unplayable until Lot 5 handlers exist — do not re-deal at
  L5-01.
- Turn-loop step 4 calls `applyPersistentEffects` after pending resolution (L5-02 / Lot 22).
  Tick order (implementation detail, `decisions.md` 2026-08-05): Points Generator →
  Invisibility → (if not invisible) Super Absorber → Imposition → Poison → Curse. Super Absorber
  reads the current seat's ledger
  (`pointsSpent`, `upgradePointsSpent`, `livesLost` — never theft fields) before life-ticking
  persistents so it does not re-absorb same-phase Imposition/Poison losses. Imposition /
  Poison act on the current player from other seats' active effects. Curse is
  **victim-owned** (designer 2026-08-07), still **ticks** 1 life per 3 points spent
  (`pointsSpent` only, remainder discarded, floor at 1 life — #V4-20), and **siphons**
  actual lives lost to the original caster (designer 2026-08-24 / L50-09: both, not
  replace) via `observeLifeLoss`. `originalCasterPlayerId` is server-only. Each copy
  ticks and pays independently (upgraded spend divisor 2, siphon ×2). No siphon when
  the holder is the original caster or that caster is eliminated. Ends via
  `deactivatePersistentEffect` when the victim reaches 1 life or on elimination
  (persistents pooled). A successful
  attack that deals ≥1 life moves every Curse on the attacker onto the hit
  player (`transferCursesFromAttacker`, logged as `curseTransferred`).
  Deactivated counter cards join the shared pool. Invisibility is
  `counter: null` and exits only via the `deactivatePersistent` TurnAction (#V4-10).

## Mutual attacks — mechanics

The rule itself is `/AGENTS.md` golden rule 1, technical spec §4.6, and rules spec §6
(designer ruling 2026-08-04 / Lot 19: stronger cancels weaker; equal cancels both).

Mechanics that rule does not cover:

- The comparison runs **before** each attack resolution in step 3 of the loop, not at queue time.
- When damage differs, the weaker pending effect is removed (`outcome: 'cancelled'`); the
  stronger remains queued and resolves on its target's turn.
- A Mirror redirection produces a fully pending attack at its new target, so it can create a new
  mutual pair, and can be redirected again with no chain limit (rules spec §3).
- **Attribution:** after Mirror / Super Mirror redirect, `sourcePlayerId` becomes the
  redirector. Mutual pairing and eliminator rewards treat the redirected attack as the
  Mirror user's (rules spec §6 example; designer 2026-08-05). The original attacker is no
  longer the contributor when the redirected hit kills.
- Three-player case with no reciprocity: A and B both attack C. Nothing cancels — mutual means
  *aimed at each other*, not *equal damage somewhere on the table*. When C Mirrors A's attack
  onto B, the redirected copy is attributed to C, so B→C and C→B form a mutual pair on C's
  resolve (equal damage cancels both).

## Counter rule — distinct from mutual attacks

Applies to **Spy and Thief only** (rules spec §1, technical spec §4.7). Mirror is redirection,
not cancellation. The countering card must target the **source** of the pending effect; played
at a third party it counters nothing. Both effects cancel, both costs are paid, copies remain
in hand. Cancel runs during resolve-pending (both stay queued until then). It never applies to
attack cards — those follow mutual attacks above.

## Turn ledger

Technical spec §4.4, ruling §6.2 #12. Absorber needs to know what an opponent lost and spent
during their **most recent complete turn, resolution phase included**.

A state diff is not enough: what a player **actively spent** must stay distinct from what a
third party **stole** from them, because upgraded Absorber captures the former and not the
latter. `TurnLedger` therefore keeps `pointsSpent` and `pointsLostToTheft` as separate fields —
never sum them into one "points lost".

The ledger resets at the start of each player's own turn. One ledger per player is enough:
turn order rotates, so when it is your turn every opponent's last turn is already complete.

**Post-elimination Absorber window (designer 2026-08-07):** eliminated players keep their
frozen ledger targetable by Absorber (and Super Absorber's activation snapshot) until every
player who was living at elimination has begun one turn (`absorbWindowPendingPlayerIds`,
ticked in `beginTurnFor`, opened from elimination). Mid-window deaths prune the pending set.
When the window closes, the ledger is cleared. Helpers: `absorb-window.ts`. Super Absorber
activation and ticks share `absorbLedgerFromVictim`.

## Elimination

Rules spec §6, rulings §6.2 #2, #3, #4. Engine: `apps/server/src/engine/turn/elimination-rewards.ts`.

- Eliminated player loses all lives, becomes a spectator. Pending effects **on** them are
  cleared; their active persistents deactivate into the pool; pending effects **they** queued
  on others stay (Suicide can still earn later rewards).
- Cards are **held** until that elim's rewards finish; unclaimed cards then join the pool.
- Contributors: every third-party source that dealt life loss (or a lethal Sentence) in the
  same resolve+persist phase. Self Tax / self-Sentence / self-Suicide record no contributor.
- Simultaneous eliminators (Open decision #5, closed): fewest lives → fewest points → seeded
  `rng.pick`.
- The eliminator picks **2 rewards** among: 4 lives (`gainLives` + `lifeLimit`), 8 points, a
  card of the eliminated player's (unused specials included), an upgrade point. Both may match.
- **2 rewards per eliminated player**, cumulative via a chainable `rewardQueue` (Mirror-shaped
  pause: no `advanceTurn` / `gameOver` until the queue is empty). 40s sub-choice; expiry →
  `2 × 4 lives`. Impossible card picks are rejected.
- **No eliminator, no reward** — Tax's life cost, self-targeted Sentence, non-upgraded Suicide
  self-elim, elimination by absence. Cards still go to the pool immediately.
- **Game-ending elim skips rewards (designer 2026-08-06):** when the victim has no
  `pendingReanimation` and eliminating them would leave a sole contender, do **not** open
  the reward queue — dump cards to the pool and let sole-survivor/`gameOver` fire. Mid-game
  elims (still ≥2 contenders afterward) still offer rewards. Exception: a pending revive
  still counts as a contender, so the eliminator is paid before reanimation completes.
- **Reanimation (L26 / #V4-11):** elimination still happens and the eliminator is paid. The
  armed charge is consumed before cleanup pools persistents; `pendingReanimation` holds through
  the reward window; after dump the seat resets with a full kit loadout (#V4-36). Sole-survivor
  treats pending revive as still in the match. `isEliminated` is cleared on revive.

Manual two-browser exercise of the reward gate (create/join, Tax-farm, super-attack elim,
reward pick / 40s default, game over) lives in `docs/agent/frontend.md` § Manual two-browser
check.

## Legal-action enumerator and view parity (V3)

`listLegalActions(state, playerId)` in `apps/server/src/engine/turn/list-legal-actions.ts`
is the engine query technical spec v1 §3 promised. It calls real `canPlay` / economy
validators and the shared play-cost gate — never a second copy of a rule.

**§10.1 invariant (technical spec v3):** for the V1 card set, the legal set computed from
authoritative `GameState` equals the legal set computed from the acting player's
`PlayingStateView` alone (`enumerationStateFromView` + the same enumerator). No V1
`canPlay` may read a hidden opponent field. A failing §10.1 guard is a **rule / handler
question**, not a flaky test — stop and ask (golden rule 6). Consequence: a human client
that probes rejected actions (free; messages differ by cause) must not learn hidden state
through legality either.

Assassin `playMultipleAttacks` candidates are a deliberate ≤8 approximation (L16-02 /
`decisions.md`); opponent order inside the generator uses a seeded shuffle of alive ids
only so the set stays view-derivable.

## What not to do

- ❌ One life-loss function with a `isAttack` flag — reintroduces the exact bug §4.2 warns about.
- ❌ Resolving a queued effect at queue time, or at the start of the target's turn — it must be
  after their action.
- ❌ Inventing a mutual-cancel rule other than final-damage compare (Lot 19 / #V4-2).
- ❌ A per-player sequence counter for `queuedAt`.
- ❌ Hardcoding 25 for the life cap, or 10 for the upgrade-point cost (a future kit changes it).
- ❌ Adding lives with `player.lives += n` and clamping by hand instead of calling `gainLives`.
- ❌ Inventing a second pool-removal path outside `takeFromPool` — the pool is public and
  readable (rules spec §1, technical spec v4 §4.3); removals still go through one primitive.
- ❌ Granting immunity to an absent or inactive player. They remain a valid target throughout.

## Checklist

- [ ] Attack path goes through `applyDamage`, everything else through `applyLifeLoss`
- [ ] New life or resource loss happens only inside the target's own turn, after their action
- [ ] Effects resolve in ascending `queuedAt`, from the global counter
- [ ] Any gain of lives goes through `gainLives` with `GameState.lifeLimit` as the cap
- [ ] Ledger records spending and theft separately
- [ ] Test added for each rule touched (`testing.md`)
- [ ] Task committed when marked `Done` (AGENTS.md §10)
