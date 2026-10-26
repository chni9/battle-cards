# docs/agent/testing.md — Testing

> Read before writing tests, and before declaring any task done.
> Transverse rules → `/AGENTS.md`. Domain specifics → `engine.md`, `card-handler.md`, `protocol.md`.
>
> Sources: technical spec §8 (Definition of Done), §5.5–§5.7 (thresholds), §6.2 (rulings) ·
> technical spec v7 §12 · `../backlog_v7.md` (V7 open) · `../backlog_v5.md` (V5 parallel) ·
> `../backlog_v1.md` … `../backlog_v6.md` (closed archives, for citing finished acceptance only) ·
> config in `vitest.config.ts`, examples in `packages/shared/src/domain/v1-scope.test.ts` and
> `apps/client/src/test/render.test.tsx`.

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

Tests sit beside the code: `.test.ts` holds logic and source-text tests, `.test.tsx` holds
component tests. Vitest projects are declared in the root `vitest.config.ts` (`shared`,
`server`, `client`). The client project extends `apps/client/vite.config.ts` so PNG
`import.meta.glob` resolves. It collects `src/**/*.test.{ts,tsx}` and `scripts/**/*.test.ts`,
and its default environment is `node`: a `.test.tsx` opts in to `happy-dom` file by file
(see Client component tests below). `pnpm test` runs all projects once; `pnpm verify` is the
full gate.

**Source-text tests (V7, technical spec v7 §12.1).** A `readFileSync` test reads the code of
one V7 owner lot only (see `docs/backlog_v7_test_classification.md`). A file whose assertions
span several lots is split into `<read-source-basename>.<original-test-basename>.test.ts`,
placed beside the source it reads (precedent: `net/use-room-connection.forfeit.test.ts`).
Each `expect()` moves verbatim, and a split-off part of an `it()` takes the title suffix
` (<read-source-basename>)`. Compare `expect()` counts, not `it()` counts: a split raises the
`it()` count and never lowers the `expect()` count. Split a module test's source-text `it()`s
out before the module moves, so the module test stays source-free and moves with a plain
`git mv`.

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

## Client component tests (V7 · L72-06)

Technical spec v7 §4.5 and §12.2. The harness is `apps/client/src/test/render.tsx`; its own
behavior is pinned by `render.test.tsx` and `node-environment.test.ts`.

- Put the test beside the component (`card.tsx` → `card.test.tsx`).
- Line 1 is the docblock `// @vitest-environment happy-dom`. Vitest scans the **whole file**
  for it, so never write that text in a node test, not even in a string or a comment.
- Render only through `renderUi` (import it relatively from `src/test/render.tsx`). Importing
  that module registers an after-each that unmounts every tree and resets reduced motion
  (Vitest runs without globals, so RTL never cleans up on its own) and switches fake timers
  back to real ones. `renderUi` returns `{ ...result, user }`, where `user` is a `user-event`
  instance. `renderUi` gives every call its own `SheetStackProvider` store (L72-09), kept
  across `rerender`; a caller's own `wrapper` renders inside it.
- Assert with plain DOM (`textContent`, `getAttribute`, `toBeNull`, `screen.getByRole`). There
  is no jest-dom.
- Cost glyphs and effect copy: read their text with `apps/client/src/test/glyph-queries.ts`
  (`visibleText`, `spokenTexts`, `glyphRoots`), which separates what a sighted player reads from
  the screen-reader-only spoken amount (L72-11). Shipped code never imports it.
- Reduced motion: call `setReducedMotion(true)` or `renderUi(ui, { reducedMotion: true })`
  **before** mounting, then assert `data-motion="reduced"` or the class. `motion` reads the
  media query once per mount, so a flip reaches the next mount, never a tree already on
  screen. happy-dom cannot evaluate CSS media queries.
- Fake timers: `vi.useFakeTimers()`, then
  `renderUi(ui, { advanceTimers: vi.advanceTimersByTime })`, and wrap manual advances in RTL
  `act`. `render.tsx` installs a minimal `globalThis.jest.advanceTimersByTime` so RTL's async
  drain moves Vitest's clock; without it user-event never resolves. That global relies on
  Vitest's per-file isolation, so never set `test.isolate: false`.
- `render.tsx` also sets `IS_REACT_ACT_ENVIRONMENT` (RTL's own `beforeAll` never runs without
  globals), so React reports an update outside `act` as a warning. Keep the output clean: await
  user-event calls and wrap manual timer or event dispatches in `act`; never unset the flag.
- happy-dom rejects a cancelled animation's `finished` promise without marking it handled, so
  every interrupted `motion` animation would fail the run as an unhandled AbortError.
  `render.tsx` marks it handled, as browsers do; motion components need no stub of their own.
- happy-dom has no layout: sizes, positions and resolved `clamp()` values are zero or
  unresolved. Assert structure, roles and data attributes here, and leave pixel checks to the
  browser gate (`frontend.md` · Post-lot browser gate).
- Never `Date.now()`; the caller passes `nowMs`.

## V7 test policy (technical spec v7 §12.1–§12.2)

- New V7 code gets behavior tests: render it, drive it, assert what a player or a screen
  reader can observe.
- No new `readFileSync` test for V7 code.
- Existing `readFileSync` tests are classified only by the lot that removes the code they read
  (`../backlog_v7_test_classification.md`). Until that lot lands they stay as they are.
- Moved tests keep their assertions verbatim; only import and `readFileSync` paths change.

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
queue is public · ticking Sentence is public · Spy persists to the end of the game · Cloning resets visibility both ways.

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
- Imposition with 1 point vs 2 due → no transfer and no `applyLifeLoss` (L63-04).
- Sentence fire after 3 **later** activator turns (play does not count); remaining turns
  are not shortened by `applyDamage` (L63-03).
- Two attacks of **different** damage aimed at each other: a stronger *answer* still
  cancels the weaker incoming; a weaker answer is **kept** and the incoming still
  resolves (Lot 54). The tempting bug is to splice the weaker retaliation.
- A third player attacking into an existing pair → no mutual cancellation, no reciprocity.
- Absorber after a turn where the target both **spent** points and **was robbed** → upgraded
  Absorber captures the spending only.
- A card acquired *after* the game started, on a kit with `alwaysUpgraded` → arrives upgraded.
- A gain that would exceed 25 lives → clamped, excess lost, from every source.
- The same counter card played while its user takes damage from several attacks in one turn.
- Table token flyouts: resource icons stay chrome-free unless `asCard === true`
  (buy/sell ghosts). A `from.width` threshold paints 40px log-origin chips as
  white tiles (L51-14).
- Same-tick spend+gain of one resource (Absorber pay 3 / absorb 10) must fly
  both legs, not the net. Opponent `livesLost` on `actionResolved` must fly
  even when the seat has live Spy numbers (L51-15). Overlay chips stay opaque
  until arrival; unspied `?` seats flash public signed Δ (L51-16). Play-card
  ghosts use `measurePlayCardGhost`, not the removed `measurePlayFlyout`.
- Collapsed felt chrome still animates: flyouts and overlay flashes must resolve
  `log-collapsed` / `opponents-collapsed` / `incoming-collapsed` when the
  expanded panel is unmounted (L53-07). A null measure because the seat or log
  is a button fails the gate.
- A `buyPoolCard` log or live `ACTION_PLAYED` that names `cardId` for a
  non-seer (L63-06). Buyer / Spy / spectator overlay still see the card;
  sitting pool faces stay public.

## What not to do

- ❌ Asserting on internal fields a rule does not mention, freezing an implementation detail.
- ❌ `Math.random()`, `Date.now()`, or a real timer inside a test.
- ❌ Testing base and upgraded versions of a card in one assertion.
- ❌ Marking a High-risk task done because the suite is green, without reading the code.
- ❌ Adding a test dependency before the task actually needs it.
- ❌ A `.test.tsx` without the happy-dom docblock on line 1, or one that calls RTL `render`
  instead of `renderUi`.
- ❌ `@vitest-environment <name>` in a node `.test.ts` (Vitest scans the whole file, so even a
  string or a comment switches its environment).
- ❌ A new `readFileSync` test for V7 code.

## Checklist

- [ ] Test written for every rule and card touched, base and upgraded
- [ ] Test names cite their spec section
- [ ] Nothing skipped, disabled, or loosened
- [ ] Component tests: `.test.tsx` with the happy-dom docblock, rendered through `renderUi`
- [ ] All randomness seeded and reproducible
- [ ] `pnpm verify` green
- [ ] The task's own "Acceptance criteria" column satisfied, not just the suite
- [ ] One commit for this backlog task ID (unless the developer allowed a bundle) —
      **always create that commit before ending the session**; never leave `Done` uncommitted
