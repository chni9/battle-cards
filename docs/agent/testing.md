# docs/agent/testing.md — Testing

> Read before writing tests, and before declaring any task done.
> Transverse rules → `/AGENTS.md`. Domain specifics → `engine.md`, `card-handler.md`, `protocol.md`.
>
> Sources: technical spec §8 (Definition of Done), §5.5–§5.7 (thresholds), §6.2 (rulings) ·
> `../backlog_v2.md` (active; "How to read this" and each task's **Acceptance** line) ·
> `../backlog_v1.md` (V1 archive, for citing finished V1 acceptance only) ·
> config in `vitest.config.ts`, example in `packages/shared/src/domain/v1-scope.test.ts`.

## Golden rules

The Definition of Done checklist lives in `/AGENTS.md` §9 and is not repeated here. What follows
is how to satisfy it.

1. **"Its own test" is literal.** A rule covered incidentally by another test does not count —
   it needs a test that names it and would fail if only that rule broke.
2. **Nothing skipped, disabled, or weakened to go green.** `it.skip`, an `it.todo` left on a
   finished task, a loosened assertion, a commented-out expectation: each one fails the DoD.
3. **Test the rule, not the implementation.** Assert the observable outcome the spec describes,
   so a refactor does not force a test rewrite.
4. **Anything random takes an injected seeded generator.** A test that passes 90% of the time is
   worse than no test.
5. **Green tests are not the acceptance criterion for a High-risk task.** The backlog's risk
   scale is explicit: read the produced code line by line. High risk means an error raises no
   alert and surfaces weeks later.

## Layout

Tests sit beside the code: `src/**/*.test.ts`. Vitest projects are declared in the root
`vitest.config.ts` (`shared`, `server`). `pnpm test` runs all of them once; `pnpm verify` is the
full gate. There is no client test project yet — it arrives with the interface work in lot 1,
which is when jsdom becomes a justified dependency.

Name the test after the rule and cite its source, so a failure points at a spec section:

```ts
// From packages/shared/src/domain/v1-scope.test.ts — real example.
describe('V1 content scope (technical spec §2)', () => {
  it('holds the 6 special cards of the V1 lot, not the full 20 of rules spec §5', () => {
    expect(SPECIAL_CARD_IDS).toHaveLength(6);
  });
});
```

Prefer tests that guard a **boundary or an invariant** over tests that restate a type. `tsc`
already checks shapes; a test earns its place by catching something the compiler cannot.

**Lot 27 interim kit scope:** `content-scope.test.ts` no longer pins `KIT_IDS.length === 4`.
Until L28-03, it asserts catalog exhaustiveness and `4 ≤ length < 15`. Each data-only kit task
extends `KIT_IDS` and proves mid-game `alwaysUpgraded` (Scientific Spy pattern).

## Seeded randomness

Every draw goes through the injected generator: card distribution, Sentence, special card
purchase, Mirror's default target on expiry. The acceptance criterion for L0-05 is that **two
games launched with the same seed produce an identical distribution** — so the generator must be
passed in, never reached for globally, and never `Math.random()`.

```ts
// apps/server/src/engine/rng.ts — createRng(seed) and createSeed()
const first = drawStartingCards(createRng('a-fixed-seed'), 5);
const second = drawStartingCards(createRng('a-fixed-seed'), 5);
expect(second).toEqual(first);
```

Assert **reproducibility and bounds, never specific numbers**: the generator's algorithm is an
implementation detail, and a test pinning its output would have to be rewritten the day it
changes. `apps/server/src/engine/rng.test.ts` is the reference.

## What the Definition of Done requires

Technical spec §8, six levels. Treat each as a checklist for the surface you touched.

**1 — Engine invariants.** A targeted action never resolves before its target's turn · pending
effects resolve after the target's action · `applyDamage` goes through the shield and
`applyLifeLoss` never does · `applyDamage` decrements counters and `applyLifeLoss` never does ·
one action per turn except Assassin · 25-life cap on every source of gain.

**2 — Hidden information.** No client receives an unspied opponent's kit, hand, or exact
resources · every action is broadcast to everyone, card identity included · the pending effects
queue is public · Spy persists to the end of the game · Cloning resets visibility both ways.

**3 — Rulings.** One dedicated test per row of technical spec §6.2, plus the timer and threshold
rules of §5.

**4 — Cards.** 16 cards, base and upgraded: **32 tests minimum**.

**5 — Kits.** Starting resources conforming · distribution respecting quantities · special
ability effective. Mandatory specific test: a Spy **bought mid-game** by Scientific arrives
already upgraded, without consuming an upgrade point.

**6 — Lifecycle.** Disconnection (60s, immediate draw, 3 turns, elimination without reward) ·
connected inactivity (60s, 5 turns) · sub-choices (40s and their default actions) · win by
forfeit at 2 players · last survivor.

## Cases worth a test even though nothing asks for them

These are the spots where a plausible implementation is wrong and silent:

- A tax paid by a player holding a full shield → life lost, shield untouched, no counter moved.
- Two attacks of **different** damage aimed at each other → both resolve, on their own turns.
  The tempting bug is to cancel the weaker one.
- A third player attacking into an existing pair → no mutual cancellation, no reciprocity.
- Absorber after a turn where the target both **spent** points and **was robbed** → upgraded
  Absorber captures the spending only.
- A card acquired *after* the game started, on a kit with `alwaysUpgraded` → arrives upgraded.
- A gain that would exceed 25 lives → clamped, excess lost, from every source.
- The same counter card played while its user takes damage from several attacks in one turn.

## What not to do

- ❌ Asserting on internal fields a rule does not mention, freezing an implementation detail.
- ❌ `Math.random()`, `Date.now()`, or a real timer inside a test.
- ❌ Testing base and upgraded versions of a card in one assertion.
- ❌ Marking a High-risk task done because the suite is green, without reading the code.
- ❌ Adding a test dependency before the task actually needs it.

## Checklist

- [ ] Test written for every rule and card touched, base and upgraded
- [ ] Test names cite their spec section
- [ ] Nothing skipped, disabled, or loosened
- [ ] All randomness seeded and reproducible
- [ ] `pnpm verify` green
- [ ] The task's own "Acceptance criteria" column satisfied, not just the suite
- [ ] One commit for this backlog task ID (unless the developer allowed a bundle) —
      **always create that commit before ending the session**; never leave `Done` uncommitted
