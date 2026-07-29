# docs/agent/card-handler.md — Adding or changing a card

> Read before touching any card. Transverse rules → `/AGENTS.md`.
> Primitives and resolution → `engine.md`. Tests → `testing.md`.
>
> Sources: technical spec §4.1 (`Card`), §4.5 (kit traits), §6.1 (card → spec mapping),
> §6.2 rulings · rules spec §1, §2, §3, §5 · types in `packages/shared/src/domain/card.ts`.
>
> **Status:** the registry lands in L0-03, the primitives in L0-04. Code blocks are
> `[TEMPLATE]`. The architecture below is a locked decision (Open decision #2, closed) —
> do not re-derive it.

## Golden rules

1. **One typed handler per card, registered in a registry.** No generic data-driven effect
   engine, no DSL, no rule interpreter. This was deliberated and locked.
2. **Adding a card must not modify another card's handler**, nor the engine. If it does, the
   primitive it needs is missing — add the primitive, don't reach across.
3. **Handlers compose shared primitives**: `applyDamage`, `applyLifeLoss`, `steal`, `reveal`,
   `queueEffect`. A handler that manipulates `player.lives` directly bypasses the shield rules,
   the counters and the life cap at once.
4. **An effect aimed at an opponent is queued, not applied.** The handler's job is to queue;
   the engine resolves it on the target's turn (`engine.md`).
5. **`alwaysUpgraded` is checked on every card acquisition** — distribution, purchase,
   elimination reward, theft — and applies to every copy held. It is never a flag written once
   at distribution, and it consumes no upgrade point (technical spec §4.5).

## The V1 card set

16 cards, all shared across kits: reducing the number of kits does not reduce the cards to
implement (technical spec §2). Ids and their categories live in
`packages/shared/src/domain/card.ts`:

- **Attack** (3): `basic-attack`, `strong-attack`, `super-attack` — rules spec §2.
- **Action** (7): `absorber`, `spy`, `thief`, `mirror`, `shield`, `tax`, `regeneration` — §3.
- **Special** (6): `suicide`, `spy-thief`, `imposition`, `cloning`, `sentence`,
  `points-generator` — §5. The other 14 special cards are out of V1 scope.

Damage and cost values are in rules spec §2 and §3. **Check every value one by one against
those tables** — a wrong damage number triggers no alert anywhere.

## Handler shape

```ts
// [TEMPLATE — replace with the real interface once L0-03 lands]
interface CardHandler {
  // Rejected as an invalid action, not a wasted card, when it returns false.
  // Mirror with nothing to redirect is the reference case (ruling §6.2 #5).
  canPlay(ctx: EffectContext): boolean;
  play(ctx: EffectContext): void;
}

const registry: Record<CardId, CardHandler> = { /* one entry per card id */ };
```

Keying the registry on `CardId` means the compiler refuses an incomplete registry: every card
id must have a handler. Keep that property — it is the cheapest guarantee in the project.

## Adding a card

1. Add its id to the right `as const` array in `packages/shared/src/domain/card.ts`.
   This widens `CardId`, so the registry stops compiling until step 3 — by design.
2. Add its static data (name, cost, `sellValue`, `buyMultiplier`, description strings).
   `effect` and `upgradeEffect` are **player-facing text**, never executable data.
3. Add its handler in its own file, register it.
4. Add tests for base **and** upgraded versions (`testing.md`).

Nothing else should need to change. If it does, say so rather than working around it.

## Card economy

Rules spec §1: sale returns the usage cost in points, purchase costs **double** the usage cost
from an infinite stock, upgrading costs **1 upgrade point** whatever the card, and a player may
own several copies of the same card. `sellValue` and `buyMultiplier` are per-card fields so a
card can state otherwise.

Copies are individually addressable via `CardInstance.instanceId`, because `isUpgraded` is a
property of the copy: upgrading one copy must leave the others untouched. **Note the open
question about protocol payloads keyed on `cardId`** — see `decisions.md`.

## Special cards

Rules spec §5: single use, cannot be bought or sold individually, and 20 points buys a
**random** one — in V1 drawn only from the 6 cards of the lot (ruling §6.2 #10). An upgrade
placed before use is lost when the card is played. After use the card joins the shared pool.

**Counter cards** ("card lives", rules spec §5) in V1: Points Generator 3, Imposition 2. The
counter is not a shield — damage still reaches the user normally. It decrements by 1 whenever
the user loses a life **to damage**, and at 0 the card deactivates and is permanently lost.
`applyLifeLoss` must never decrement it.

## What not to do

- ❌ A shared `switch` on card id inside the engine — that is the DSL this design rejects.
- ❌ Encoding effects as data (`{ damage: 2, target: 'opponent' }`) and interpreting it. It
  collapses on Cloning and Absorber, which is exactly why the registry was chosen.
- ❌ Mutating `player.lives`, `player.points` or `player.shield` from a handler instead of
  calling a primitive.
- ❌ Applying an opponent-targeting effect immediately.
- ❌ Consuming an already-paid card when a sub-choice times out. The player loses the
  optimisation, never the benefit (technical spec §5.6).
- ❌ Implementing a card outside the 16, or a kit trait outside the 4 kits.

## Checklist

- [ ] Handler in its own file, registered; no other handler touched
- [ ] All values cross-checked against the rules spec tables, base and upgraded
- [ ] Opponent-targeting effects queued, never applied inline
- [ ] Only primitives touch lives, points, shield and counters
- [ ] Kit traits (`alwaysUpgraded`, `immuneTo`) honoured on acquisition, not distribution
- [ ] Tests for base and upgraded versions
