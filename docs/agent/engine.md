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
4. **In V1 all damage values are distinct** (1, 2, 3, 4, 7, 10), so "equal damage" necessarily
   means the same card at the same upgrade level (technical spec §6.3). Do not build a
   cancellation test that only works because two different cards happen to tie.

## The two life-loss primitives

Technical spec §4.2, materialising rules spec §1. One function per file, in
`apps/server/src/engine/life/`, so neither can quietly grow into the other.

| | `applyDamage` | `applyLifeLoss` |
|---|---|---|
| Used by | Attack cards only | Tax, Suicide, Imposition, every non-attack loss |
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
even at full strength (rules spec §3). Counter cards — Points Generator (3) and Imposition (2)
in V1 — lose a counter point only when their *user* loses a life to **damage**; the counter
never protects that user, and `applyLifeLoss` never decrements it (rules spec §5).

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
1. Player P's turn begins — 30s timer starts, deadline computed server side
2. P plays their single action
   (Assassin: several attack cards still count as ONE action)
   Timer expires → automatic draw
3. Resolve P's pendingEffects, ascending queuedAt
   Before each attack resolution: check mutual cancellation
4. Apply persistent effects targeting P
5. Check elimination and victory
6. Next turn
```

Invariant to hold at every step: **a player never suffers a loss of life or resources outside
their own turn, and never before playing their action.** "Drawing" grants no card — it gains
points equal to the kit's `draw` value (rules spec §6), read from
`getKit(player.kitId).startingResources.draw`.

## Kits and traits (Lot 4)

Roster: `packages/shared/src/domain/kit-catalog.ts`. Assignment at start is **with replacement**
(duplicates allowed). Distribution uses seeded `Rng` + `acquireCardToHand` /
`acquireSpecialCard` (`apps/server/src/engine/kits/`).

- **`alwaysUpgraded`**: checked on every acquisition helper call — never a one-shot at deal.
- **`immuneTo`**: resolve-time only (`isImmuneTo`); play still queues; public
  `actionResolved.outcome: 'immune'`.
- **`allowsMultipleAttacksPerTurn`**: Assassin uses `playMultipleAttacks` (min 2, all-or-nothing);
  single attack still `playCard`.
- Specials are granted at start but unplayable until Lot 5 handlers exist — do not re-deal at
  L5-01.
- Turn-loop step 4 calls `applyPersistentEffects` after pending resolution (L5-02). Imposition
  taxes the current player from other players' active Impositions; Points Generator ticks on
  the owner's turn (including the play turn). Deactivated counter cards join the shared pool.

## Mutual attacks — mechanics

The rule itself is `/AGENTS.md` golden rule 1, and technical spec §4.6. Held in one place
because the rules spec contradicts it, and two copies of a contested rule drift.

Mechanics that rule does not cover:

- The comparison runs **before** each attack resolution in step 3 of the loop, not at queue time.
- A Mirror redirection produces a fully pending attack at its new target, so it can create a new
  mutual pair, and can be redirected again with no chain limit (rules spec §3).
- Three-player case with no reciprocity: A and B both attack C. Nothing cancels — mutual means
  *aimed at each other*, not *equal damage somewhere on the table*.

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
  pause: no `advanceTurn` / `gameOver` until the queue is empty). 20s sub-choice; expiry →
  `2 × 4 lives`. Impossible card picks are rejected.
- **No eliminator, no reward** — Tax's life cost, self-targeted Sentence, non-upgraded Suicide
  self-elim, elimination by absence. Cards still go to the pool immediately.

## What not to do

- ❌ One life-loss function with a `isAttack` flag — reintroduces the exact bug §4.2 warns about.
- ❌ Resolving a queued effect at queue time, or at the start of the target's turn — it must be
  after their action.
- ❌ Comparing attacks by "which is stronger" — that clause is deleted.
- ❌ A per-player sequence counter for `queuedAt`.
- ❌ Hardcoding 25 for the life cap, or 10 for the upgrade-point cost (a future kit changes it).
- ❌ Adding lives with `player.lives += n` and clamping by hand instead of calling `gainLives`.
- ❌ Reading from `GameState.pool` — it is write-only in V1, no card consumes it. Do not invent a use.
- ❌ Granting immunity to an absent or inactive player. They remain a valid target throughout.

## Checklist

- [ ] Attack path goes through `applyDamage`, everything else through `applyLifeLoss`
- [ ] New life or resource loss happens only inside the target's own turn, after their action
- [ ] Effects resolve in ascending `queuedAt`, from the global counter
- [ ] Any gain of lives goes through `gainLives` with `GameState.lifeLimit` as the cap
- [ ] Ledger records spending and theft separately
- [ ] Test added for each rule touched (`testing.md`)
- [ ] Task committed when marked `Done` (AGENTS.md §10)
