# docs/agent/card-handler.md — Adding or changing a card

> Read before touching any card. Transverse rules → `/AGENTS.md`.
> Primitives and resolution → `engine.md`. Tests → `testing.md`.
>
> Sources: technical spec §4.1 (`Card`), §4.5 (kit traits), §6.1 (card → spec mapping),
> §6.2 rulings · rules spec §1, §2, §3, §5 · types in `packages/shared/src/domain/card.ts`.
>
> **Status:** the registry (L0-03) lives in `apps/server/src/cards/`, the primitives (L0-04)
> in `apps/server/src/engine/life/`. Basic attack is implemented (L1-08); other cards remain
> pending. The architecture below is a locked decision (Open decision #2, closed) — do not
> re-derive it.

## Golden rules

1. **One typed handler per card, registered in a registry.** No generic data-driven effect
   engine, no DSL, no rule interpreter. This was deliberated and locked.
2. **Adding a card must not modify another card's handler**, nor the engine. If it does, the
   primitive it needs is missing — add the primitive, don't reach across.
3. **Handlers compose shared primitives.** Those that exist: `applyDamage`, `applyLifeLoss`,
   `gainLives` (L0-04), `queueEffect` (L1-07). Those still to come with Lot 3: `steal`, Spy
   visibility grant. A handler that
   manipulates `player.lives` directly bypasses the shield rules, the counters and the life cap
   at once. If the primitive you need does not exist, add it — do not inline it.
4. **An effect aimed at an opponent is queued, not applied.** The handler's job is to queue;
   the engine resolves it on the target's turn (`engine.md`).
5. **`alwaysUpgraded` is checked on every card acquisition** — distribution, purchase,
   elimination reward, theft — and applies to every copy held. It is never a flag written once
   at distribution, and it consumes no upgrade point (technical spec §4.5). Server helper:
   `acquireCardToHand` / `acquireSpecialCard` in `apps/server/src/engine/kits/acquire-card.ts`.
   Kit roster: `packages/shared/src/domain/kit-catalog.ts`. Immunity helper: `isImmuneTo`
   (resolve-time, L4-03).

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

`apps/server/src/cards/handler.ts`:

```ts
interface EffectContext {
  state: GameState;
  sourcePlayerId: string;
  targetPlayerId: string | null; // null for Shield, Regeneration, Tax
  card: CardInstance;            // the exact copy played, with its own isUpgraded
}

interface CardHandler {
  // Rejected as an invalid action, not a wasted card, when it returns false.
  // Mirror with nothing to redirect is the reference case (ruling §6.2 #5).
  canPlay(context: EffectContext): boolean;
  play(context: EffectContext): void;
}
```

`EffectContext` is deliberately minimal and **grows one field at a time**, as the subsystem
that field describes actually lands: the queue (L1-07), the ledger (L3-07), the visibility
matrix (L3-05), sub-choices (L3-09). Two standing rules for that growth — the life primitives
are imported directly by the handler that needs them, and **anything random is injected
through the context**, never reached for globally (golden rule 5).

## The registry and its two lists

`apps/server/src/cards/registry.ts` holds `IMPLEMENTED_CARD_IDS` and `PENDING_CARD_IDS`. The
handler map is keyed on the implemented ids, so the compiler refuses both a handler for an
undeclared card and a declared card with no handler. `findHandler(cardId)` returns `undefined`
for a pending card, and the caller rejects the action — never a crash.

A registry keyed on the whole `CardId` union would be a lie until lot 5 closes, since the 16
cards land across lots 1 to 5. The two lists carry that truth instead, and are held to cover
the union exactly by three mechanisms: `PENDING_CARD_IDS` is typed
`Exclude<CardId, ImplementedCardId>`, so it stops compiling the moment it still holds an id
that has become implemented; `registry.test.ts` proves the two lists together account for all
16 ids and never overlap; and the handler map's key type catches the reverse mistake.

## Adding a card

1. Add its id to the right `as const` array in `packages/shared/src/domain/card.ts`.
   This widens `CardId`, so the registry stops compiling until step 4 — by design.
2. Add its static data (name, cost, `buyCost`, `sellYield`, description strings) to
   `SHARED_CARD_CATALOG` when it is a shared card.
   `effect` and `upgradeEffect` are **player-facing text**, never executable data.
3. Add its handler in its own file under `apps/server/src/cards/handlers/`.
4. Register it in `cardHandlers` and move its id from `PENDING_CARD_IDS` to
   `IMPLEMENTED_CARD_IDS`. Neither half compiles without the other.
5. Add tests for base **and** upgraded versions (`testing.md`).

Nothing else should need to change — and that is how L0-03's acceptance line ("adding a card
modifies no existing file outside the registry") is read: no other handler, and no engine file.
The two shared lists and the registry are the card's registration, not collateral damage. If a
card forces you to edit another handler or the engine, the primitive it needs is missing — say
so rather than working around it.

## New `TurnAction` variants (Lot 25 / 28)

Adding a `TurnAction` / `PublicActionKind` (e.g. `deactivatePersistent`, later
`activateDuplication`) requires every contact point in one pass:

1. `TurnAction` + `PublicActionKind` in `perform-action.ts`
2. Mirror in `messages.ts` + `ActionLogPlayedAction` in `state-view.ts`
3. Client→server message constant + `ClientToServerMessages` + room `onMessage` + payload reader
4. `listLegalActions` (or a dedicated enumerator)
5. `performTurnAction` branch
6. Client `use-room-connection` send helper
7. Action-log `formatPlayedAction` + `aggregate-action-log` switch (exhaustive, never-typed default)
8. Bot `scoreAction` — **must not** fall through to `sellUpgradePoint`

No `PROTOCOL_VERSION` bump for additive action kinds in V4 (already at 23).

## Card economy

Rules spec §1: sale returns the usage cost (in the cost's currency), purchase costs **double**
the usage cost from an infinite stock, upgrading costs **1 upgrade point** whatever the card,
and a player may own several copies of the same card. `buyCost` and `sellYield` are per-card
`CardCost` fields on the shared catalog — always the **base** shop transfer; upgraded play
cost never changes them. Tax buys/sells in lives; Regeneration's shop uses 6 / 3 points
(2× / 1× the base one-life play cost).

Copies are individually addressable via `CardInstance.instanceId`, because `isUpgraded` is a
property of the copy: upgrading one copy must leave the others untouched. Protocol payloads
for `playCard` / `sellCard` / `upgradeCard` key on `instanceId` (Lot 2 ruling).

## Special cards

Rules spec §5: single use, cannot be bought or sold individually, and 20 points buys a
**random** one — in V1 drawn only from the 6 cards of the lot (ruling §6.2 #10). An upgrade
placed before use is lost when the card is played. After use the card joins the shared pool.

**Lot 4 → Lot 5 handoff:** starting specials are already dealt into `player.specialCards` at
`createInitialState` (L4-02). Lot 5 adds static definitions, handlers, and unlocks play — do
**not** redistribute kit specials again at L5-01. Play rejects specials whose handler is still
pending (`PENDING_CARD_IDS`).

Attack and action cards are **not** consumed on play: the player pays the usage cost each time
and keeps the copy (infinite reuse while they hold it and can afford the cost). Only specials
leave the zone on use. Special **Price** is paid on play (`getCard`); persistent specials
(Imposition, Points Generator, Poison, Curse, Super Absorber) activate `activePersistentEffects`
instead of joining the pool immediately. Periodic multi-opponent ticks live in
`apply-persistent-effects.ts` (shared dispatcher) — adding a new periodic persistent extends
that file; it does not edit another card's handler (`card-handler.md` golden rule 2 exception
agreed for Lot 22).

**Counter cards** ("card lives", rules spec §5): Points Generator 3, Imposition 2, Poison 3,
Super Absorber 2. Curse has `counter: null` and deactivates when its victim reaches 1 life.
The counter is not a shield — damage still reaches the user normally. It decrements by 1 whenever
the user loses a life **to damage**, and at 0 the card deactivates and is permanently lost.
`applyLifeLoss` must never decrement it.

**Lot 24:** Card Absorber recovers from `state.pool` via `takeFromPool` +
`transferCardInstance` (base: rng up to 4; upgraded: `pool-pick` on `GameState.subChoice`).
Card Transformer consumes a hand `SHARED_CARD_IDS` card via `consumeInstanceId`, pools it,
and mints a special (base: rng; upgraded: `special-pick`). Instant personal effects — not
opponent-queued. `reanimation-kit` remains untyped until Lot 26.

## What not to do

- ❌ A shared `switch` on card id inside the engine — that is the DSL this design rejects.
- ❌ Encoding effects as data (`{ damage: 2, target: 'opponent' }`) and interpreting it. It
  collapses on Cloning and Absorber, which is exactly why the registry was chosen.
- ❌ Mutating `player.lives`, `player.points` or `player.shield` from a handler instead of
  calling a primitive.
- ❌ Applying an opponent-targeting effect immediately.
- ❌ Consuming an already-paid card when a sub-choice times out. The player loses the
  optimisation, never the benefit (technical spec §5.6).
- ❌ Implementing a card outside the declared 30-card set, or a kit outside the
      growing `KIT_IDS` roster (full 15 at L28-03).

## Checklist

- [ ] Handler in its own file, registered; id moved from pending to implemented; no other
      handler touched
- [ ] All values cross-checked against the rules spec tables, base and upgraded
- [ ] Opponent-targeting effects queued, never applied inline
- [ ] Only primitives touch lives, points, shield and counters
- [x] Kit traits (`alwaysUpgraded`) honoured on every acquisition via `acquireCardToHand`
- [x] Kit trait `immuneTo` honoured at resolve with `actionResolved.outcome: 'immune'` (L4-03)
- [ ] Tests for base and upgraded versions
- [ ] Task committed when marked `Done` (AGENTS.md §10)
