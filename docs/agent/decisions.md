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

Superseded for the rules file itself by the 2026-07-30 entry that corrects §2/§6 — keep this
entry as the original discrepancy record.

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

`frontend.md` created during L1-12 from the real client. Postgres/game-log conventions
likewise wait for lot 8 (L8-01).

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

## 2026-07-29 · [T] Seeded generator written in-repo, no dependency (L0-05)

`apps/server/src/engine/rng.ts`: FNV-1a hashes the seed string into a 32-bit state, mulberry32
advances it, and `nextInt` rejection-samples rather than taking a modulo — a modulo would favour
low indices and quietly bias card distribution and Sentence. `pick` throws on an empty list, and
`createRng` throws on an empty seed, which is almost always a missing seed and would make every
game identical.

No dependency was added for it: the generator is ~25 lines, and pinning a package for it would
add a supply-chain surface to the one module whose behaviour must never drift silently. The
algorithm is an implementation detail — the tests assert reproducibility and bounds only, so it
can be swapped without touching them.

`shuffle` was deliberately not written: no V1 task needs one yet (turn order arrives in L1-03),
and the first task that does adds it here rather than shuffling by hand with `nextInt`.

## 2026-07-29 · [P] `GameState.seed` added, and server-only (L0-05)

Technical spec §4.1 lists no seed field. One is added because L0-05's acceptance criterion
requires a game to be reproducible from its seed, and because replaying a reported game and
recording what produced a distribution in the game log (L8-01) both need it kept.

It carries a visibility category that technical spec §5.1 does not have: **server-only**. The
seed is not private data about a player but the game's whole future — a client holding it can
predict Sentence's victim, the special card purchase and Mirror's default target on expiry. It
therefore reaches no client, spied or not, and `protocol.md` now lists the category so any later
field with the same property gets classified rather than defaulted into a view.

## 2026-07-29 · [P] [DISCREPANCY] Colyseus is transport only — no synchronised state (L0-06)

Technical spec §3 lists Colyseus for "rooms, state sync, reconnection". **State sync is not
used.** A Colyseus `Schema` synchronises one room-wide state to every client, which is precisely
the "build a complete state and filter it on the way out" pattern that §5.1 and golden rule 4
forbid — and §5.3 specifies `stateUpdate` as "personalised view per recipient".

So: the authoritative state stays a plain object built from the `packages/shared` domain types,
and each client receives its own `stateUpdate` message. Rooms, matchmaking and reconnection
(`allowReconnection`, for L7-01) are still Colyseus's. The `state` generic of `Room` is left
unused. Recorded as a discrepancy rather than reconciled: the spec sentence stays wrong until a
human edits it, and re-deriving this decision every lot would be worse.

## 2026-07-29 · [P] `clientReady` added to the protocol, beyond technical spec §5.2 (L0-06)

The Colyseus SDK **drops** a message whose handler is not yet registered — it only logs
`onMessage() not registered for type '...'` — and `onJoin` runs before the client's join promise
resolves, so a client cannot have registered anything yet. Observed live: the first
`stateUpdate` never reached a freshly joined client.

Therefore a client sends `clientReady` once its handlers are in place, and the room answers that
client alone; `onJoin` and `onLeave` send to everyone *else*. No message is ever sent into the
void. This is a consequence of the transport-only decision above: with a synchronised schema the
SDK would have buffered the state for us.

## 2026-07-29 · [T] Two `@colyseus/core` instances break every join — run `pnpm dedupe` (L0-06)

**Symptom:** every join fails immediately with `524 seat reservation expired.`, the server logs
`creating room` and `reserving seat` and then the same error, and `onJoin` is never reached.

**Cause:** `node_modules/.pnpm` held two directories for `@colyseus/core@0.17.45` with identical
dependency graphs but different peer-hash suffixes. `@colyseus/ws-transport` was linked to one
and the `colyseus` meta package to the other, so the transport consulted a room registry that
the matchmaker had never filled. Installing `@colyseus/sdk` in the client is what introduced the
second instance.

**Fix:** `pnpm dedupe`, which rewrote the lockfile so a single instance remains. Verified by
deleting every `node_modules` and reinstalling with `--frozen-lockfile`: one instance, and joins
work. If this symptom ever returns after adding a Colyseus package, count the instances first:
`ls node_modules/.pnpm | grep '@colyseus+core@'`.

`msgpackr-extract`'s build script is left unapproved (pnpm warns about it on install). It is an
optional native accelerator for msgpack; the pure-JS path works, and approving install scripts
for a transitive dependency is not worth the surface.

## 2026-07-29 · [T] Colyseus 0.17 API and package names (L0-06)

Written down because training data and older tutorials disagree with all of it:

- Server: `colyseus` 0.17.10, bootstrapped with `defineServer({ rooms: { game: defineRoom(GameRoom) } })`
  then `server.listen(port)`. The meta package bundles `@colyseus/ws-transport`, so no transport
  needs to be constructed for a single-process server.
- Client: **`@colyseus/sdk`**, not the old `colyseus.js`. `new Client(url)`,
  `client.joinOrCreate(name, options)`, `room.onMessage(type, cb)`, `room.onError(cb)`,
  `room.onLeave(cb)`.
- Message handlers on a room are a `messages = { name: (client, payload) => {} }` map, not
  `onMessage(...)` calls in `onCreate`.
- Rejecting a join: `throw new ServerError(ErrorCode.APPLICATION_ERROR, message)` from `onAuth`.
- Typing the wire: `Room<{ client: Client<{ messages: ServerToClientMessages }> }>` makes a
  wrong message name or payload a compile error on the server side.

## 2026-07-29 · [T] Local addresses and client env vars (L0-06)

Server port from `PORT`, default 2567. Client target from `VITE_SERVER_URL`, default
`http://localhost:2567`. `apps/client/src/vite-env.d.ts` declares `ImportMetaEnv` so
`import.meta.env` stays typed instead of `any` — without it, `strictTypeChecked` rejects every
use of it as unsafe. Both defaults are in `README.md`; no `.env` file is committed.

The client validates the shape of an incoming `stateUpdate` before using it
(`use-room-connection.ts`). Not paranoia about our own server: it is the same rule as §5.4 in
the other direction, and it keeps the payload out of `any`.

## 2026-07-29 · [T] How L0-06 was verified (L0-06)

Automated tests cover the pure view builder only; a Colyseus test harness would have been a
dependency added for a task that touches no rule. The rest was verified by running it:

- Two SDK clients joining one room from Node: each received its own view, with its own `you`
  and the same connected set, and the remaining client was updated when the other left.
- Two browser tabs on the Vite client: same result on screen, each tab marking a different
  session as "(you)", and the count dropping when a tab closed.
- Three rejected joins: wrong version, missing version, non-numeric version.

Repeat that sequence when the protocol changes shape. From L1-09 on, the view's contents belong
in unit tests instead.

## 2026-07-29 · [P] [DISCREPANCY] createRoom / joinRoom map to the matchmaker (L1-01)

Technical spec §5.2 lists `createRoom` and `joinRoom` as client→server events. With Colyseus
as transport only (no Schema), those intents are expressed via the **matchmaker**:

- Create: `client.create('game', { nickname, protocolVersion })`
- Join: `client.joinById(gameCode, { nickname, protocolVersion })`

The room assigns a **6-letter A–Z** `roomId` (Colyseus custom-room-id recipe + Presence set
`$card-battle-game-codes`) and that id *is* the game code. In-room messages stay for actions
that happen after a seat is taken (`clientReady`, later `startGame`, `drawCard`, …).

Reason: mapping create/join as in-room messages would require a gateway room and a second hop,
with no benefit under the transport-only model. Recorded as a discrepancy rather than editing
§5.2 (human-owned).

## 2026-07-29 · [P] Lobby host is the room creator (L1-01)

The first client to join a freshly created room is the host. Host leave before start promotes
the earliest remaining seat (formalised in L1-02). Empty rooms dispose and free the game code.

## 2026-07-29 · [P] Lobby launch rules (L1-02)

`maxClients = 4`. Host-only `startGame` requires at least 2 seated players. A fifth join is
refused by Colyseus capacity (and by `onAuth` once the game has started). Host leave before
start promotes the earliest remaining seat. Successful start locks the room; GameState
creation follows in L1-03.

## 2026-07-29 · [P] Protocol version bumped to 2 (L1-01)

`stateUpdate` is now a lobby view (`phase: 'lobby'`, seats with nicknames, game code, host).
An L0-06 client cannot read it, so `PROTOCOL_VERSION` is 2.

## 2026-07-29 · [P] L1 placeholder resources and hand (L1-03)

Until L4-02 kit distribution:

- Every player: `lives: 10`, `points: 0`, `upgradePoints: 0`, draw value `1`
- Hand: 10 non-upgraded `basic-attack` copies (enough to eliminate at 1 dmg without buy)
- `kitId: 'untouchable'` as an inert label — traits not applied
- Turn order: seeded `Rng.shuffle` of seated players at `startGame`

Draw value is a module constant (`L1_PLACEHOLDER_RESOURCES.draw`), not a `Player` field —
§4.1 has no draw on the player; kits carry it later.

## 2026-07-29 · [P] Wire event payloads for Lot 1 (L1-06 / L1-10)

Typed in `packages/shared/src/protocol/messages.ts` (spec §5.3 was prose-only):

- `turnStarted`: `{ activePlayerId, deadlineMs }`
- `actionPlayed`: `{ actorPlayerId, action: 'draw'|'playCard', cardId?, targetPlayerId?, turnSequence }`
- `actionResolved`: `{ effectId, sourcePlayerId, targetPlayerId, cardId, livesLost, shieldAbsorbed }`
- `playerEliminated`: `{ playerId, eliminatorPlayerId: string | null }`
- `gameOver`: `{ winnerPlayerId }`
- `error`: `{ message }`

`PROTOCOL_VERSION` bumped to 3 with the playing/finished views and these events.

## 2026-07-29 · [P] playCard stays on `cardId` until L2-03

Open discrepancy kept: §5.2 uses `cardId`. Server selects the first owned matching instance.
Safe while L1 copies are identical and non-upgraded. Switch to `instanceId` when L2-03 lands;
do not silently change the wire before that ruling is approved.

## 2026-07-29 · [T] One commit per backlog task

Default: each backlog ID gets its own Conventional Commit after it passes `pnpm verify` and is
marked `Done`. Bundling a whole lot into one commit is allowed only when the developer says so
for that session (as for Lot 1 catch-up). Recorded in `AGENTS.md` §10.

## 2026-07-30 · [P] `instanceId` on play/sell/upgrade (closes cardId discrepancy)

Developer approved: `playCard`, `sellCard`, and `upgradeCard` payloads carry `instanceId`
from L2-01 onward. Technical spec §5.2's `cardId` wording is superseded for those three.
`buyCard` remains `cardId` (infinite stock creates a new copy). PROTOCOL_VERSION 4.

## 2026-07-30 · [P] Economy turn actions and Tax/Regen shop (L2-01)

- Any player action consumes the turn (including buy/sell card, upgrade, buy/sell upgrade
  point).
- Shared catalog (`buyCost` / `sellYield` as `CardCost`) replaces `sellValue` /
  `buyMultiplier`. Shop prices always use the **base** usage transfer — upgraded play cost
  never changes them.
- Tax shop: buy 2 lives (reject if `lives < 2`), sell 1 life via `gainLives`. Life payment
  uses `applyLifeLoss` with reason `card-buy`.
- Regeneration shop: buy 6 points, sell 3 points (2× / 1× base one-life usage cost of 3).
- Full V1 shared catalog (10 cards) is buyable from L2-01; play of unimplemented cards still
  rejected by the registry.

## 2026-07-30 · [P] Rules spec mutual-attack text corrected (closes Open decision #1)

Developer authorized editing `docs/spec_bataille_des_cartes_en.md`: §2 Super-attack note and
§6 Mutual Attacks now match technical spec §4.6 (equal damage cancels both; different damage
means no interaction). Code implements the same rule in `resolve-pending` (L2-05).

## 2026-07-30 · [P] `sellUpgradePoint` wire event (L2-02)

Rules spec §1 defines resale at 7 points; technical spec §5.2 listed only `buyUpgradePoint`.
Added `sellUpgradePoint` (empty payload). Prices live in `UPGRADE_POINT_ECONOMY` so Upgrader
(out of V1) can change buy cost without hunting literals.

