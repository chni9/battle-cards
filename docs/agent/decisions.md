# docs/agent/decisions.md — Architecture decisions log (append-only)

> ADR-lite format. Append only, dated. Never overwrite a past entry.
> `[P]` = project decision · `[T]` = tooling / agent-framework decision ·
> `[DISCREPANCY]` = sources disagree · `[UNDEFINED]` = needs a human ruling.
>
> Seeded on 2026-07-29 from the state of the repo at lot 0, tasks L0-01 and L0-02.

## 2026-07-29 · [P] · [DISCREPANCY] Mutual attacks — "the stronger one prevails" is removed

Two attacks aimed at each other, both pending: **equal damage cancels both** on the retaliating
player's turn; **different damage means no interaction at all**, each resolving on its own
target's turn. Technical spec §4.6 states this correctly.

The rules spec still contradicts it in two places — §6 "Mutual Attacks" (line 243) and the Super
attack note in §2 (line 55) — and did so in the French version as well before it was deleted.
Build against the ruling above, **not** the rules spec text. Fixing the rules spec file is a
human-owned task: do not edit it. Backlog Open decision #1 stays open until that edit happens.

## 2026-07-29 · [P] English is the sole source of truth for the docs

`docs/spec_bataille_des_cartes.md` and `docs/cahier_des_charges_v1.md` (the French rules spec
and technical spec) were deleted to remove the duplicate-maintenance burden. Before deletion,
both were checked against their English counterparts: the technical specs agreed (§4.6 correct
in both) and the rules specs shared the same mutual-attacks error. Recoverable from commit
`50f5bc5`. Do not reintroduce translated specs.

## 2026-07-29 · [P] Effect model — typed handler registry (closes Open decision #2)

One typed handler per card, registered in a registry, composing shared primitives
(`applyDamage`, `applyLifeLoss`, `steal`, `reveal`, `queueEffect`). **No** generic data-driven
effect engine and no DSL: a data-interpreted model collapses on Cloning (full state
replacement) and Absorber (needs the turn ledger). Adding a card must never require touching
another card's handler. Locked — do not re-derive. See `card-handler.md`.

## 2026-07-29 · [T] Tooling (closes Open decision #3)

pnpm workspaces · Vitest · ESLint + typescript-eslint (`strictTypeChecked` +
`stylisticTypeChecked`) · Vite for the client · Node pinned to the current Active LTS.
Decided by developer instruction, which supersedes the backlog's "choose explicitly" note.
No Prettier: the fixed tooling list did not include a formatter, and `stylisticTypeChecked`
covers part of the ground. Revisit if formatting churn appears in diffs.

## 2026-07-29 · [T] The Node runtime is a lockfile-tracked dependency, not a system install

`package.json` declares `devEngines.runtime` with `onFail: "download"`, so `pnpm install`
fetches Node into `node_modules/.pnpm/node@runtime+<version>` and pins the exact version and
checksum in `pnpm-lock.yaml`. Chosen over `.nvmrc` (initially used, then removed) because it
needs no version manager, does not touch the developer's system Node, and makes the runtime
reproducible from the lockfile — which also satisfies the "no dependency outside the lockfile"
criterion of technical spec §8. **Consequence: run everything through `pnpm`.** A bare `node`
call gets the system install.

## 2026-07-29 · [T] TypeScript held below the latest release

TypeScript 7.0.2 is current, but `typescript-eslint` declares `typescript >=4.8.4 <6.1.0`, and
the linter is a fixed requirement. TypeScript is therefore pinned to the newest 5.x. TS 6 never
had a stable release and TS 7 is the new native compiler line. **Re-check when
`typescript-eslint` widens its peer range** — this pin has no other reason to exist.

## 2026-07-29 · [T] `packages/shared` is consumed as source

Its `exports` map points at `src/index.ts` instead of a build output, so nothing needs building
before typecheck, tests, or run, and there is no source-versus-dist resolution to get wrong.
Consumers (Vite, `tsx`, Vitest) transpile TypeScript themselves. **Consequence:** the server has
no `tsc`-emit build step yet — `pnpm typecheck` checks it, `tsx` runs it. A production bundle is
deferred to deployment work, which is not a backlog task.

## 2026-07-29 · [P] Domain type modelling choices (L0-02)

Deviations from technical spec §4.1's literal field list, all recorded because a future reader
would otherwise re-derive them:

- **`CardInstance` replaces `PlayerCard` and `SpecialCard`.** §4.1 names both, with identical
  shapes; defining both would be exactly the duplication L0-02's acceptance criterion forbids.
  The collection a copy sits in separates them, backed by its `Card.type`.
- **`CardInstance.instanceId` added.** `isUpgraded` is a property of the copy (§4.1) and rules
  spec §1 allows several copies of one card, so copies must be individually addressable.
- **`AttackCardId` is a type distinct from `ActionCardId`/`SpecialCardId`**, so `applyDamage` can
  be made structurally impossible to call for Tax — the compiler enforcing technical spec §4.2
  rather than a comment. Rules spec §1 makes attack-ness a property of the card, not its
  category (MEGA ATTACK is a special card that is an attack), so that union grows when such a
  card is added; it does not become an action card.
- **`Card.effect` / `upgradeEffect` are player-facing description strings.** Treating them as
  executable data would be the data-driven engine rejected above.
- **`PendingEffect.id` added** — §5.2's `chooseMirrorTarget` addresses one queued effect by id.
- **`Player.isEliminated` added** — not equivalent to `lives === 0`: upgraded Suicide spares its
  own user, and a player can reach 0 lives before elimination is processed.
- **`GameState.pool` is `CardInstance[]`, not `Card[]`** — a specific sold or lost copy is what
  gets pushed in. Write-only in V1, so nothing observes the difference.
- **`lifeLimit` lives on the state**, with `CLASSIC_LIFE_LIMIT` as a named constant, so rules
  spec §7's per-mode caps are not baked into rules logic.
- **One `TurnLedger` per player**, not current + last-completed. Turn order rotates, so when it
  is a player's turn every opponent's last turn is already complete, and rules spec §6
  guarantees nobody loses anything outside their own turn. Reset at the start of each own turn.
- **`ConnectionState` is an object**, carrying status, the 60s window timestamp and both
  elimination counters, since technical spec §5.7's two mechanisms are independent and both
  reset on reconnection.

## 2026-07-29 · [DISCREPANCY] [UNDEFINED] `playCard` / `sellCard` / `upgradeCard` cannot key on `cardId`

Technical spec §5.2 specifies these events with a `cardId`. But a player may hold several copies
of one card at different upgrade levels (rules spec §1, §4.1), so `cardId` does not identify a
copy — and L2-03's acceptance criterion is *"Only one copy upgraded, other copies unchanged"*,
which is unachievable with an ambiguous key. `CardInstance.instanceId` exists for this.

**Needs a ruling before L2-03.** Proposal: those three payloads carry the instance id, and
§5.2 is corrected. Not yet approved.

## 2026-07-29 · [UNDEFINED] `gainPointsPerLifeLost` omitted from `KitTraits`

Technical spec §4.5 lists it in the traits shape, annotated "out of V1 (Ghost)". Technical spec
§9 forbids implementing out-of-V1 content "even partially, even to lay groundwork". §9 was
followed and the field omitted, since no V1 code can read it. **Verify** — keeping the shape
complete is a defensible alternative.

## 2026-07-29 · [T] Agent framework files created

`/AGENTS.md` (transverse, ~190 lines) · `/CLAUDE.md` (one-line import) · four playbooks:

| Playbook | Justification |
|---|---|
| `engine.md` | Highest-risk domain: the two life-loss primitives, the resolution queue and mutual attacks all fail silently when wrong |
| `card-handler.md` | Structural pattern repeating 16 times, plus a locked architecture that agents would otherwise re-derive as a DSL |
| `protocol.md` | Hidden information is one of V1's four stated goals; a view-filtering mistake leaks silently |
| `testing.md` | The Definition of Done has six levels and specific mandatory tests that an agent will not infer |

Playbook code examples are marked `[TEMPLATE]` wherever the implementation does not exist yet —
at seeding time the repo held only the scaffold and the shared domain types. **Replace each
template with the real pattern as its task lands.**

`frontend.md` deliberately **not** created: the client is two files and has no established
conventions, so any playbook would be invention. Create it during lot 1 (L1-12), derived from
the real code. Postgres/game-log conventions likewise wait for lot 8 (L8-01).

## 2026-07-29 · [T] Backlog moved from xlsx to markdown

`docs/backlog_v1_card_battle.xlsx` was converted to `docs/backlog.md` and deleted (recoverable
from commit `50f5bc5`). All 63 tasks, the milestones and the Legend were carried over
programmatically, so the text is the workbook's verbatim. The Open decisions tab was **not**
copied: it already lives in this file, and duplicating it would give two places to update.

Reason: the Status column has to change on every finished task, and a spreadsheet cell is not
editable without either opening Excel or patching xlsx XML — a scripted patcher was written and
then discarded as too fragile for the benefit. Markdown is greppable, diffable, reviewable in a
commit, and editable in one pass. Statuses: `To do` · `In progress` · `Done` · `Blocked`.

Two tasks carry a `**Note**` line where their original watch point has since been resolved
(L0-01 tooling, L0-03 effect model). Add such a note rather than rewriting the source text.

## 2026-07-29 · [T] Reply style depends on the model

On Claude Opus, replies use the project-local `caveman` skill (terse: no articles, no filler,
fragments fine); any other model uses normal prose. Chat replies only — code, comments, commit
messages and everything under `docs/` stay in full English, and the style is dropped for
security warnings, irreversible-action confirmations, and sequences whose order would become
ambiguous. Recorded in `AGENTS.md` §11 by developer instruction.

## 2026-07-29 · [UNDEFINED] Backlog open decisions still unresolved

Surface the question when work reaches these; do not pick an interpretation.

| # | Question | Blocks |
|---|---|---|
| 1 | Rules spec §6/§2 not yet corrected for mutual attacks | The rules doc itself; the ruling above unblocks the code |
| 4 | Which metrics the game log records | L8-01, and any serious playtest |
| 5 | Simultaneous eliminators — is the italicised tie-break a validated rule or an untested hypothesis? | L6-05 |
| 6 | Does Untouchable's immunity to "Thief and Spy" extend to Spy Thief? | L5-04 |
| 7 | Are the timers deliberately absent from the rules spec, or an oversight? | Nothing — non-blocking |

## 2026-07-29 · [P] Card counters lose one point per life lost, not per hit (L0-04)

Rules spec §5 says a counter card loses 1 point "every time the user loses a life to damage",
which does not say whether a single 3-damage hit costs 1 point or 3. **Ruling by the developer:
one point per life actually lost** — a hit costing 3 lives takes 3 counter points. A hit the
shield absorbs entirely costs no life and therefore no counter point, which both readings agreed
on. Consequence: Points Generator (counter 3) dies to one Super attack that reaches lives.

## 2026-07-29 · [P] The life primitives return an outcome instead of `void` (L0-04)

Technical spec §4.2 writes `applyDamage(target, amount, source)` and
`applyLifeLoss(target, amount, reason)` as returning nothing. Both — and `gainLives` — return a
descriptive outcome instead (`shieldAbsorbed`, `livesLost`, `countersDecremented`,
`deactivatedEffectIds`, `livesWasted`).

Reason: the turn ledger (§4.4), `actionResolved` (§5.3) and Absorber all need those numbers, and
a state diff taken after the call cannot tell a shielded hit from an unshielded one, nor a
counter decrement from a card deactivation. Threading each consumer into the primitive later
would mean editing the two functions the project is least willing to touch. Mutation still
happens inside the primitive; the outcome adds no behaviour. Types in
`apps/server/src/engine/life/outcome.ts`.

## 2026-07-29 · [P] `gainLives` shipped inside L0-04, ahead of its first user (L0-04)

L0-04 is titled "life-loss primitives", but golden rule 9 (the life cap applies to every source
of gain) had no home: the first gain arrives with Regeneration in L3-02, and by then five other
cards would already be tempted to clamp inline. `gainLives(target, amount, lifeLimit)` therefore
ships now, takes the cap as a parameter read from `GameState.lifeLimit`, and is the only way a
player ever gains lives. Deliberate widening of the task's scope, by developer instruction.

## 2026-07-29 · [T] Test conventions established by L0-04

- Domain factories live in `apps/server/src/testing/factories.ts` (`makePlayer`,
  `makeCounterEffect`), every field defaulted, so a test states only what its rule is about and
  a new domain field does not force every test to be edited.
- Type-level guarantees are asserted with Vitest's `expectTypeOf` inside the normal test file.
  It is `tsc` that enforces them — `apps/server/tsconfig.json` includes `src`, so test files are
  typechecked by `pnpm typecheck` even though Vitest itself runs without `--typecheck`.
- The primitives reject a negative amount with a `RangeError`. Not a rule: no rule produces one,
  and a negative amount would silently heal through an attack card or make a gain into a loss.

## 2026-07-29 · [T] The registry is keyed on implemented cards, with a pending list beside it (L0-03)

`card-handler.md` wanted `Record<CardId, CardHandler>` so the compiler would refuse an incomplete
registry. That guarantee is unavailable for most of the project: the 16 cards land across lots 1
to 5, and a total record would need 15 placeholder handlers that a mistake could ship as
playable.

Adopted instead: `IMPLEMENTED_CARD_IDS` keys the handler map, and `PENDING_CARD_IDS` — typed
`Exclude<CardId, ImplementedCardId>` — holds the rest. Three mechanisms keep the pair honest,
and moving a card requires touching both halves:

- the pending list stops compiling when it still holds an id that has become implemented;
- the handler map's key type refuses a handler for an undeclared card, and a declared card
  with no handler;
- `registry.test.ts` proves the two lists account for all 16 ids and never overlap.

A deliberately failing test asserting "all 16 implemented" was considered and rejected: technical
spec §8 requires a green suite with nothing skipped, so a red run from lot 0 to lot 5 would have
made the Definition of Done unreachable for every task in between. Verified by hand that a stale
pending entry fails `pnpm typecheck` with two distinct errors.

`findHandler` returns `undefined` for a pending card. Playing an unimplemented card is an action
the server rejects, never an exception that takes a room down.

## 2026-07-29 · [P] `EffectContext` starts minimal and grows per lot (L0-03)

It carries `state`, `sourcePlayerId`, `targetPlayerId` and the played `CardInstance` — nothing
else, because nothing else exists yet. Designing the full context now (queue, ledger, visibility,
sub-choices) would mean inventing the signatures of four unbuilt subsystems.

Two rules govern the growth: the life primitives are **imported** directly by the handler that
needs them, keeping the context free of a service-locator bag; anything random is **injected**
through the context, since a handler reaching for its own generator breaks reproducibility
(golden rule 5). `targetPlayerId` is `string | null` rather than optional, matching the domain's
existing use of `null` for absent values and avoiding `exactOptionalPropertyTypes` friction at
every call site.
