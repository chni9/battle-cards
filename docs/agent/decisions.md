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
live in `db.md` (L8-01 / L8-02).

## 2026-07-29 · [T] Backlog moved from xlsx to markdown

`docs/backlog_v1_card_battle.xlsx` was converted to `docs/backlog.md` and deleted (recoverable
from commit `50f5bc5`). All 63 tasks, the milestones and the Legend were carried over
programmatically, so the text is the workbook's verbatim. The Open decisions tab was **not**
copied: it already lives in this file, and duplicating it would give two places to update.
(On 2026-08-01 that combined file was split into `docs/backlog_v1.md` + `docs/backlog_v2.md`
— see the entry below.)

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
| 7 | Are the timers deliberately absent from the rules spec, or an oversight? | Nothing — non-blocking |

Open decision #4 (game-log metrics) closed 2026-08-01 — see below.
Open decision #5 (simultaneous eliminators) closed 2026-07-31 — see below.

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
marked `Done`. **Always commit in the same session** — never leave a `Done` task uncommitted.
Bundling a whole lot into one commit is allowed only when the developer says so for that
session (as for Lot 1 / Lot 4 catch-up). Recorded in `AGENTS.md` §10.

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

## 2026-07-30 · [P] Attack/action cards are reusable (not consumed on play)

Rules spec §5 makes **specials** single-use. Attack and action cards only cost their usage
price each play and stay in hand. L1 incorrectly removed the copy on `playCard`; fixed so a
held basic attack can be replayed whenever the player has enough points.


Rules spec §1 defines resale at 7 points; technical spec §5.2 listed only `buyUpgradePoint`.
Added `sellUpgradePoint` (empty payload). Prices live in `UPGRADE_POINT_ECONOMY` so Upgrader
(out of V1) can change buy cost without hunting literals.

## 2026-07-30 · [P] Lot 3 rulings (Counter, Regen, Shield, Mirror, AGENTS)

Developer session locked these before Lot 3 implementation:

- **Counter = Spy and Thief only.** Rules spec §1/§3 win over tech §4.7's former inclusion of
  Mirror. Mirror is redirection, never cancelled by another Mirror. Tech §4.7, backlog L3-06,
  and `engine.md` updated to match. Rules file not edited for this (already correct).
- **Counter "consumed"** means effects cancel only: costs stay paid, Spy/Thief copies stay in
  hand (aligns with attack/action reuse).
- **Regeneration quantity** is chosen on the same turn via optional `playCard.quantity` (1–4),
  not a timed sub-choice.
- **Upgraded Shield** blocks Thief/Spy at **resolution** (pending still queues; cost paid;
  effect fizzles; no shield-point spend). Counter remains possible while pending.
- **`Player.shieldIsUpgraded`** boolean, public in views; set by upgraded Shield; cleared when
  `shield` reaches 0. Base Shield clears the flag.
- **Spy/Thief reciprocal cancel** runs during `resolve-pending` (both effects stay queued until
  then). If only the counter is later removed (e.g. special cancel), the original still applies.
- **`PendingEffect.damageMultiplier`** (number, default 1): upgraded Mirror does `*= 2` and
  **stacks** on unlimited redirect chains. Mutual-cancel and damage use catalog × multiplier.
- **AGENTS.md golden rule 10** ("One backlog task at a time") removed. One commit per backlog
  task (§10) remains.

## 2026-07-30 · [P] Temporary full shared hand + private lives/shield

Developer playtest instructions before Lot 4 kits:

- **Starting hand:** each player begins with one copy of every V1 shared card (10). Specials
  remain kit-only. Replaced by L4-02 kit distribution when that lands.
- **Visibility:** opponent lives and shield are **not** public (overrides technical spec §5.1
  / former protocol table). Unspied opponents expose only nickname, card count, elimination.
  Base Spy still reveals kit + cards only. **Upgraded** Spy (`full-resources`) also reveals
  lives, shield, points, upgrade points. PROTOCOL_VERSION 9.

## 2026-07-30 · [P] Hand card count private unless Spy

Developer playtest follow-up: opponent **card count** is no longer public (overrides tech §5.1
and the earlier same-day visibility note). Unspied opponents expose only nickname + elimination.
Any Spy level reveals hand (+ specials), so count is recoverable from `spied`. PROTOCOL_VERSION 10.

## 2026-07-30 · [P] Kit distribution with replacement (L4-02)

- Kits are assigned independently with **replacement** (duplicates allowed across players).
- Starting hands: random action/attack draws per kit counts (duplicates possible); specials
  granted from the kit roster into `specialCards`.
- Draw action reads `getKit(kitId).startingResources.draw`.
- L1 placeholders and the temporary full shared hand are removed.

## 2026-07-30 · [P] Specials granted in L4, unplayable until Lot 5

L4-02 places kit special `CardInstance`s in `player.specialCards` at game start. Handlers and
special catalog land in Lot 5 — `playCard` rejects specials until then ("Special cards are not
playable yet."). **Lot 5 agents:** do **not** re-grant starting specials at L5-01; only add
definitions/handlers and unlock play.

## 2026-07-30 · [P] Untouchable immunity + actionResolved.outcome (L4-03)

Thief/Spy targeting Untouchable: play allowed and queued; at resolve the effect is a no-op and
`actionResolved.outcome` is `'immune'` (public). Spy Thief is **not** covered — closes open
decision #6 as **not immune** (`immuneTo: ['thief','spy']` only). Other outcomes:
`'applied' | 'cancelled'` (mutual cancel, Spy/Thief counter, upgraded Shield block).
PROTOCOL_VERSION 11.

## 2026-07-30 · [P] Assassin playMultipleAttacks (L4-05)

- Client → `playMultipleAttacks: { attacks: [{ instanceId, targetPlayerId }, …] }` (min 2).
- Single attack stays on `playCard`. All-or-nothing cost/validation.
- Public `actionPlayed` uses `action: 'playMultipleAttacks'` + `attacks: [{ cardId, targetPlayerId }]`.
- PROTOCOL_VERSION 12.

## 2026-07-30 · [P] Spy tokens = points; base snapshot at resolve

Superseded by the evening entry “Spy resources = full set” below. Kept for history.

## 2026-07-30 · [T] Always commit on Done (developer instruction)

Agents must create the Conventional Commit for each finished backlog task before ending the
session. Reinforced in `AGENTS.md` §9–§10 and playbook checklists.

## 2026-07-30 · [P] Spy resources = full set (lives/points/UP/shield)

Developer playtest correction (supersedes earlier “tokens = points only”):

- **Resources** for Spy = **lives, points, upgrade points, shield**.
- **Both Spy levels** reveal kit + full hand/special **card lists** forever.
- **Base Spy:** frozen **full resource snapshot** at resolve on the victim’s turn
  (`resourcesSnapshot` + `turnSequence`). Snapshot stays visible forever and is labeled by
  turn sequence; it does not update when the target’s resources change later.
- **Upgraded Spy:** live lives/points/UP/shield (no snapshot in the client view).
- Matches rules §3 upgrade text (“all of the opponent's resources”).
- PROTOCOL_VERSION 14.

## 2026-07-30 · [P] Lot 5 special play model (L5-01)

Developer session locked before Lot 5 implementation:

- Special **Price** is a **play cost** (paid on play), same pattern as shared cards. The 20-point
  `buySpecialCard` purchase remains separate.
- Specials play from `specialCards` via `playCard` + `instanceId`. On successful play the copy
  leaves the zone. Instant specials join the shared pool; Imposition / Points Generator activate
  `activePersistentEffects` and join the pool only on deactivation (L5-02).
- `upgradeCard` searches `hand` and `specialCards`. Kit starting specials are not re-dealt.
- `getCard` resolves shared or special catalog definitions for play payment.

## 2026-07-30 · [P] Suicide timing and eliminator (L5-03)

Overrides former tech §6.2 #3 / rules §5 Suicide reward wording:

- One pending effect per alive opponent; resolve with `applyLifeLoss(5, 'suicide')` + points → 0
  on the target's turn after they act.
- Base also queues self-elim pending on the user; they act first on that turn, then die.
- **Both** base and upgraded: user is eliminator of opponents killed by Suicide. Self-elim
  still grants no reward. Attributions stored on `GameState.eliminationAttributions` for Lot 6.
- Cloning (or any clear-pending) can cancel the self-pending before it resolves.

## 2026-07-30 · [P] Lot 5 remainder (L5-04…L5-09)

- **Spy Thief:** per-opponent queue; uncapped steal; Spy visibility parity; not counterable;
  not Shield-blocked; Untouchable not immune.
- **Imposition / Points Generator:** step-4 applicator; PG ticks on owner turn including play turn.
- **Cloning:** immediate; copies kit + resources only; keeps user hand/specials/persistents;
  clears user pending; visibility wipe both ways. (Superseded 2026-08-02 — see that entry.)
- **Sentence:** injected `EffectContext.rng`; queue elim on drawn victim; self → no eliminator.
- **buySpecialCard:** 20 pts, RNG among `SPECIAL_CARD_IDS` only. PROTOCOL_VERSION 15.

## 2026-07-31 · [P] Lot 6 elimination rewards (L6-01…L6-05) (closes Open decision #5)

- Contributor log per resolve+persist phase: every third-party source that dealt life loss or a
  lethal effect; self sources never record. Multi-contributor → italic §6 tie-break (fewest
  lives → fewest points → seeded `rng.pick`) — **validated rule**, not hypothesis.
- Cards held until that elim's 2 picks finish; remainder → pool. No eliminator → pool immediately.
- Mirror-shaped `rewardQueue` / `rewardChoice` pause; 20s default `2×4 lives`; impossible card
  picks rejected. Cleanup: clear pending on victim, pool their persistents, keep pending from them.
- PROTOCOL_VERSION 16. Suicide timing unchanged (N-queue rare in V1; still chainable).

## 2026-07-31 · [P] Lot 7 disconnection / inactivity (L7-01…L7-04, L9-01)

Rulings locked for technical spec §5.7:

- **Reconnect while absent:** Colyseus `allowReconnection(client, "manual")` stays open until
  that seat is eliminated or the game ends. The 60s clock only flips `disconnected` → `absent`.
- **Leave mid-game:** consented `room.leave()` → immediate forfeit elim (cards to pool, no
  reward). Lobby leave unchanged (seat drop).
- **Timers while disconnected:** pause turn and Mirror/reward timers; stash remaining ms; resume
  on reconnect. On transition to `absent`, immediate draw if it is their turn, or sub-choice
  default if they hold a prompt.
- **`consecutiveTimeouts`:** independent of reconnect; resets only on a successful voluntary
  action. Absence counter resets on any reconnect.
- **Wire:** `PublicPlayerView.connection` + optional `PlayerEliminatedPayload.reason`.
  PROTOCOL_VERSION 17. Client: SDK auto-reconnect + `sessionStorage` token fallback; Leave
  disables reconnect.
- **`eliminateWithoutReward`:** lives may still be above 0 (absence / inactivity / leave).

## 2026-08-01 · [P] Game-log metrics and Postgres conventions (closes Open decision #4, L8-01 / L8-02)

Finished games are written once to Postgres (technical spec §3). Stack and shape:

- **Driver:** `pg` only (no ORM). Explicit SQL migrations via
  `pnpm --filter @card-battle/server db:migrate` — never auto-migrate on boot.
- **Shape:** hybrid — `finished_games` + `finished_game_players` +
  `finished_game_eliminations`; full public `action_log` as JSONB on the game row.
- **Metrics (locked):** kits, winner, `turn_sequence` (turn count), cards played per
  player (denormalized aggregates at write — Approach B), eliminations + cause, final
  resources, **seed**, full **actionLog**, **room id / started_at / ended_at / duration_ms**,
  final **hands / specials / shield**. **No nicknames.**
- **Missing DB / write failure:** soft-skip always for the match; louder `console.error`
  when `NODE_ENV === 'production'`.
- **Tests:** pure snapshot builder + mocked writer; optional integration only when
  `DATABASE_URL` is set. Default `pnpm verify` needs no Postgres.

Playbook: `docs/agent/db.md`.

## 2026-08-01 · [P] V2 scoped — visual design layer, no rule/scope change

Developer session scoped and validated `docs/technical_spec_v2.md`. Key decisions, all by
direct developer instruction unless marked inferred:

- **V1 is closed** (63/63 backlog tasks — see the backlog-sync note below) before V2 starts.
  V2 restyles L9-02/L9-03's existing output; it does not re-implement them.
- **Scope: full visual redesign** of all 4 existing screens and every shared component
  (buttons, opponent zone, private zone, log, queue, timers, action bar) + integration of the
  developer's existing card/kit illustrations + custom iconography for the 4 resources +
  game-quality animation. No new screen, rule, card, kit, mode, or protocol event.
- **Audience unchanged:** friends only, web only — no mobile-first or stranger-onboarding
  requirement (this rules out a wider redesign scope that "real UI" could otherwise imply).
- **Stack: Tailwind CSS + Motion** (`motion` package), added via `pnpm add`, over a
  zero-dependency CSS alternative — developer chose speed of iteration for a solo dev over
  avoiding the added dependency surface.
- **Phased sequencing:** static design system (tokens, components, asset integration, all 4
  screens) before the animation layer, so a working reskin exists even if animation slips.
  Same "vertical slice before content" logic already applied to V1.
- **No per-kit "eliminated" portrait.** One generic treatment for every kit, including
  Kamikaze, which has no such asset today. Resolves what would otherwise have been a missing-
  asset blocker.
- **Card/kit asset mapping resolved:**
  - `scientific` (kit id, name "Scientific") maps to `Scientist.png` — naming mismatch between
    code and asset, mapped in code only, no rename.
  - `absorber` (card id, name "Absorber") maps to `Absorption.png` / `Absorption +.png`.
    **Not** `Card Absorber` (Warrior's out-of-scope special) or `Super Absorber` (Specialist's
    out-of-scope special) — confirmed against the rules spec's own kit roster, which lists
    both as distinct cards. Developer explicitly declined renaming the code id/name to
    "Absorption" ("too complex") — the mapping alone resolves the naming gap.
  - Two generic assets (`opponent.png`, the 5 colored buttons) are **assumed**, not confirmed:
    generic opponent placeholder and generic action buttons respectively. Flagged in
    `technical_spec_v2.md` §4.3 — confirm before L10-04 builds `Button` around them.
- **Illustration source:** a 120-file `images/` folder outside this repo, covering the full
  15-kit/~20-card game. V2 wires in only the V1 subset; the rest stays unreferenced (golden
  rule 7 / technical spec v1 §9 applies to art the same as to code).
- **`AGENTS.md` golden rule 7 amended** — "art direction" removed from the out-of-scope list,
  replaced with a pointer to `technical_spec_v2.md`. V1's engine/protocol/scope freeze is
  otherwise unchanged.

## 2026-08-01 · [T] Backlog synced to match already-landed L9-02/L9-03 (pre-V2 bookkeeping fix)

Before V2 scoping began, the then-combined `docs/backlog.md` still listed L9-02 and L9-03 as
`To do` (progress "61 of 63"), even though both had already landed and been committed
(`166a99f`, `64a84c2`, polish `9e227d4`) and this file already carried the corresponding
decision entry below. Fixed during this session: both flipped to `Done` with commit
references, progress corrected to "63 of 63 — V1 complete." Recorded because AGENTS.md
§9/§12 treats a stale backlog as worse than none, and because it was the trigger for
confirming V1 could close before V2 opened. (That combined file was later split — see
2026-08-01 backlog split entry.)

## 2026-08-01 · [P] Public history kinds + finished recap (L9-02 / L9-03)

- **`ActionLogEntryView`** becomes a `kind` discriminated union: `actionPlayed`,
  `actionResolved`, `playerEliminated`, `mirrorRedirected`, `rewardsClaimed`.
- **`rewardsClaimed` is opaque** — eliminator + eliminated player ids only; never the two
  picks (lives / points / UP / card). Product ruling for L9-02.
- Mirror completion logs `mirrorRedirected` instead of a second `actionPlayed` for Mirror
  (avoids double-counting plays in L8 aggregates).
- L8 / L9-03 aggregates count **only** `kind === 'actionPlayed'`.
- **`FinishedStateView.recap`**: turnSequence + per-player public counts + eliminations.
  Kits and exact final resources stay private at game over (visibility §5.1 / 2026-07-30).
- PROTOCOL_VERSION 18.

## 2026-08-01 · [T] Backlog split into V1 archive and V2 active tracker

The combined `docs/backlog.md` (V1 Lots 0–9 + V2 Lots 10–14) was split into:

- `docs/backlog_v1.md` — closed V1 archive (63/63 `Done`, read-only)
- `docs/backlog_v2.md` — **active** tracker for V2 visual design (Lots 10–14)

`docs/backlog.md` removed. AGENTS.md, README, technical_spec_v2.md, and agent
playbooks updated so DoD / workflow point at `backlog_v2.md`. Task bodies for
Lots 10–14 unchanged from the pre-split file.

## 2026-08-01 · [T] V2 client stack — Tailwind CSS + Motion (L10-01)

Installed into `apps/client` via `pnpm add` (lockfile is source of truth):

- `tailwindcss` 4.3.3 + `@tailwindcss/vite` 4.3.3 — Vite plugin in
  `apps/client/vite.config.ts`, entry `@import "tailwindcss"` in
  `apps/client/src/index.css`
- `motion` 12.43.0 — import from `motion/react`

Smoke: Home title uses a Tailwind class and a trivial Motion enter animation.
Versions recorded here rather than restated in `technical_spec_v2.md` §3.

## 2026-08-01 · [P] V2 design tokens from assets (L10-02)

Palette and type encoded in `apps/client/src/index.css` `@theme`, sampled from the V1
asset subset (card faces, kit pastel pinks, verso/`opponent.png` slate, resource icons,
button PNG hues only). Typography: Outfit via `@fontsource/outfit` 5.3.0 — assets carry
no font; Outfit chosen over Inter as the creative call for this game UI. Colored button
PNGs remain unused as skins (CSS CTAs later). Playbook: `docs/agent/frontend.md` · Design
system section.

## 2026-08-01 · [P] Lot 10 visual rulings (L10-03–L10-05)

Developer session while implementing Lot 10:

- **`opponent.png`:** confirmed as unrevealed-kit placeholder.
- **Colored `*_button.png`:** do **not** use as UI images. CSS `Button` component uses their
  hues only (ornate hex CTAs). Files stay in repo `images/` but are not copied into
  `apps/client/src/assets/`.
- **`Draw.png`:** leave unwired in V2 for now.
- **Activated art:** include Imposition/Generator activated files in the typed lookup and
  optional `Card` `activated` prop; no screen passes `activated` until a ruled protocol
  exposure of `activePersistentEffects` (no protocol bump in Lot 10).
  **Superseded 2026-08-02:** PROTOCOL_VERSION 19 exposes actives; UI may pass `activated`.
- **Elimination (L10-05):** greyscale/desaturate portrait **plus** an “Eliminated” badge
  overlay on `KitPortrait`. No `*(dead).png` paths for any kit.

## 2026-08-01 · [P] Lot 11 Home/Lobby + card-first Table (L11 / L12-08 draft)

Developer session locking Lot 11 implementation and drafting L12-08 (docs only until Lot 12):

- **L11-03:** shared accessible `Dialog` / ActionSheet in `design/components/` — foundation
  for Lobby copy feedback and all future Table prompts. Prefer hand-rolled React + Tailwind;
  no new dependency without a separate ruling.
- **Home (L11-01):** branded composition using decorative V1 kit/card art from the existing
  asset lookup only; muted Protocol vN remains visible.
- **Lobby (L11-02):** copy game code affordance; may reuse Dialog for copy success.
- **Card-first Table (L12-08, drafted):** click own hand/specials → Dialog Use / Upgrade /
  Sell; nested Dialog for target and other prompts; self-only Use is one-shot (no confirm);
  Spy-revealed cards are inspect-only; unavailable cards are not clickable + tooltip reason;
  all Table prompting via Dialog; Play / Upgrade / target bar chrome removed. Same intents /
  payloads — UI-only. Spec: `technical_spec_v2.md` §5–§6. Backlog: L12-08; L12-06 narrowed to
  economy bar restyle only.

## 2026-08-01 · [P] Button visual refresh (modern solid CTAs)

Developer asked to retire the ornate hex `clip-path` CTAs. `Button` keeps the five hue
variants (`purple` / `yellow` / `green` / `red` / `orange`) from the colored PNG samples,
but renders as solid rounded rectangles (`--radius-button`), soft tinted shadow, and
hover/active press feedback. Still no `*_button.png` skins. Playbook: `frontend.md`.

## 2026-08-01 · [P] Lot 12 Table shell / buy / tooltip rulings

Developer session locking Lot 12 implementation approach:

- **Felt table shell (L12-01):** opponents arc top/sides by seat count (2p top-center; 3p
  left+right; 4p left+top+right); hand + economy dock bottom; slate felt board chrome.
- **Action log:** center-stage band on the board (main organ — not a thin sidebar).
- **Buy flows:** Buy special and Buy shared both via shared `Dialog`; single **Buy** control
  on the economy bar opens the chooser. Bar otherwise: Draw / buy-sell UP / Leave.
- **Unavailable cards (L12-08):** shared hand-rolled `Tooltip` in `design/components/` — no
  new npm dependency.
- Skills: product-UI (design / ui-styling / ui-ux-pro-max). Landing-page design-taste rules
  do not apply to Table.

## 2026-08-02 · [P] Cloning kit+resources only; actives public; upgraded log labels

Developer session (out of backlog):

- **Cloning:** copies kit, lives, points, upgrade points, shield (`shieldIsUpgraded`) only.
  User keeps own hand, specials, and `activePersistentEffects`. Pending against user cleared;
  Spy visibility wiped both ways; upgraded bonuses unchanged. Rules spec §5 Cloning text
  updated to match.
- **Mutual Strong↔Super:** engine already correct under §4.6 (unequal = no interaction).
  Regression via `playCard` path added. Observed “Super did not go through” on the retaliator
  turn is expected delayed resolution — Super resolves on the target’s next turn.
- **Active persistents:** `PersistentEffectView` on `PrivateSelfView` and every
  `PublicPlayerView` (not Spy-gated). Client Active strip + opponent thumbs use activated art;
  inspect Dialog shows Active (+ counter). PROTOCOL_VERSION 19.
- **Action log / pending:** `formatCardLabel` → catalog name, upgraded as `Name +`.
  `isUpgraded` threaded on `actionPlayed` / `actionResolved` and multi-attack entries.

## 2026-08-03 · [P] End screen restyle (L13-01)

Developer-locked for Lot 13:

- **Visual family:** Home-like branded `surface` + decorative V1 art from the asset lookup
  (card backs / kit portraits as decoration only — not mapped to seated players).
- **No kits on End:** `FinishedStateView` has no `kitId`; do not change `build-view-for.ts`.
- **Seats:** nicknames + eliminated marker; **no** `ConnectionBadge` (connection state is
  noise after game over). Winner emphasized; full public `recap` unchanged.
- Screen extracted to `apps/client/src/screens/end.tsx`.

## 2026-08-03 · [T] Table FX hybrid architecture (L14-01)

Developer-locked for Lot 14:

- **Hybrid Motion:** local card flip / timer bar; central `apps/client/src/fx/` for play
  flyout, resolution, elimination, rewards, Mirror highlights.
- **Fire-and-forget:** enqueue after intent send; never block or delay payloads.
- **Intensity:** restrained 150–300ms; `useReducedMotion` → skip choreography.
- **Play-to-table:** ghost art from hand/`data-instance-id` toward `[data-zone="pending"]`.

## 2026-08-03 · [P] V3 baseline PROTOCOL 20 — public shield presence (#V3-0)

Closed open decision #V3-0 (technical spec v3 §11). Kept the committed PROTOCOL 20 work
(`fa73ebd`): `PublicPlayerView.activeShield` exposes Combat Shield **presence + upgrade tier**
to every seat so the Table can render Shield beside kit actives. **Remaining shield points stay
private** (Spy-gated as before).

This partially overrides the 2026-07-30 ruling that “lives and shield are **not** public without
Spy”: lives and exact shield points remain private; only the boolean-up presence signal is
public. V3’s starting baseline is PROTOCOL 20; L15-05 bumps **20 → 21** once for bot intents
and seat fields.

## 2026-08-03 · [T] Bot nickname pool escape hatch (L15-02)

Bot seats pick from a fixed phonetic pool (`Alpha`…`Hotel`), skipping names already seated
(case-insensitive). If every pool name is taken (pathological: humans claimed them all), fall
back to `Bot-${shortId}` once. Not a product nickname scheme — only an exhaustion escape.

## 2026-08-03 · [T] Lot 15 stub bot driver; §10.4 completion deferred (L15-04)

`apps/server/src/bots/bot-driver.ts` ships in L15 with an always-draw stub (Mirror: first
eligible effect + first other alive seat; reward: 2× lives inline). Full “4-bot room plays to
completion” stays on L16-06 once the heuristic can end games. Stub Mirror may use seat-order
target pick; L16 must break ties with seeded rng, never seat order.

## 2026-08-03 · [P] Last human leaves bot room — play out (#V3-3b / L15-06)

Closed open decision #V3-3: **(b)** When the last human leaves an **in-progress** game that
still has bots, keep the room (`autoDispose = false`), let bots finish, and write the finished
game via the existing `onGameOver` path. Dispose the room after game over when no sockets remain.

**Lobby complement:** if every human leaves before start and only bots remain, dispose
immediately and write nothing — there is no game to play out.

## 2026-08-03 · [T] Assassin multi-attack candidate approximation (L16-02)

`listLegalActions` does **not** enumerate the full legal `playMultipleAttacks` space
(sizes ≥2 × all target assignments). That is exponential and must never be written
(technical spec v3 §4.3).

V3 uses a greedy generator: attacks ordered by `attackDamageFor` descending; opponents
in a seeded shuffle of living seats (alive ids only — **not** hidden lives, so §10.1
holds); sizes 2 and 3 only; hard cap `ASSASSIN_CANDIDATE_CAP = 8` (tunable default).
Deliberate approximation — not a bug to “fix” later with exhaustive search.

Policy scoring (§4.4) ranks opponents via the view/`livesLost` proxy when choosing
among enumerated actions; the enumerator’s shuffle only chooses which ≤8 candidates
enter the legal set.

## 2026-08-03 · [P] Bot scoring weights stay module constants (#V3-5 / L16-04)

Closed open decision #V3-5: scoring weights and related tunable defaults live as named
constants in `apps/server/src/bots/heuristic-weights.ts`. No CLI / env / config file sweep
in V3 — a single tunable module is enough; exposing weights for simulator sweeps is scope
creep (technical spec v3 §11 recommendation).

## 2026-08-04 · [P] Difficulty display labels Title Case (#V3-4 / L17-01)

Closed open decision #V3-4: wire values stay `easy` / `normal` / `hard`. Player-facing copy
is **Easy / Normal / Hard** via `formatBotDifficulty` on the client. No softer synonyms
(`Calm` / `Steady` / `Sharp`) and no numbered levels.

## 2026-08-04 · [P] Bot reasoning on the public action log (#V3-2 / L17-05)

Closed open decision #V3-2: everyone can open a short reason from a **Why** control on
action-log rows that carry `botReason`. Payload is a stable **code + optional string params**
on existing `actionPlayed` / `mirrorRedirected` / `rewardsClaimed` entries (and the live
`actionPlayed` broadcast). No new S→C event; no PROTOCOL bump (additive under 21). Coarse
vocabulary (~10 codes from heuristic bands + noise / Mirror / reward / fallback). Reasons are
explanatory only — never a second source of game state and must not drive table legality.

## 2026-08-04 · [T] Heuristic pressure + Tax buffer retune (Hard playtest)

Playtest vs Hard (1 and 3 bots): policy always preferred Basic attack over Super, and Taxed
down toward ~4 lives with no pending hits. Tunables only (`heuristic-weights.ts` / pressure
term in `heuristic-policy.ts`) — no rule change (#V3-5).

- Pressure: `damage / cost` → `damage - cost / PRESSURE_COST_DIVISOR` (`PRESSURE_COST_DIVISOR = 2`)
  so Super (7 − 5) beats Basic (1 − 0.5).
- `TAX_LIFE_BUFFER`: **3 → 5** (Tax only while `lives > incomingThreat + 5`).

## 2026-08-04 · [T] Refuse lethal / buffer-breaking Tax shop buys

Engine allows buying Tax at exactly 2 lives (`canAffordCost`: `lives >= buyCost`); payment goes
through `applyLifeLoss`, so the buyer can hit 0 and eliminate. Policy scored every `buyCard` as
invest +10 with no life-cost check. Hard bots were suiciding on Tax purchases.

Fix (policy only): life-priced `buyCard` scores −∞ when `livesAfter <= 0` or
`livesAfter <= incomingThreat + TAX_LIFE_BUFFER` — same safety floor as playing Tax.

## 2026-08-04 · [T] Heuristic leans into counters under fire

Playtest: bots ignored defense until `lives ≤ incomingThreat` (already lethal). Equal-damage
Basic cancels and Regeneration life-buys scored as plain Pressure / Sustain, so Hard seats
kept attacking or shopping while hit.

Tunables only (#V3-5):

- Survive defenses (Mirror / Shield / Regeneration / Cloning) fire on **any** pending
  attack (`incomingThreat > 0`), not only when already lethal.
- Equal-damage mutual cancel and Spy/Thief reciprocal counter score Survive +
  `MUTUAL_CANCEL_BONUS` (40).
- Soft shop lean: Regeneration / Shield / Mirror `buyCard` get a modest Invest bump under
  any incoming threat (still below same-turn Survive plays).
- Unequal retaliation at the attacker gets a small Pressure bonus (+8).

## 2026-08-04 · [T] Heuristic never buys a duplicate cardId

Playtest: bots repeatedly bought Tax while already holding Tax. Engine allows multiple copies
(rules spec §1); policy now scores `buyCard` −∞ when that `cardId` is already in hand or
specials. Humans / legality unchanged.

## 2026-08-04 · [P] Mutual attacks — stronger cancels weaker (Lot 19)

Designer feedback restores stronger-prevails. Two pending attacks aimed at each other,
compared on the retaliator's turn:

- **Equal damage** → both cancel (unchanged).
- **Unequal damage** → weaker is cancelled; stronger stays pending and resolves on its
  target's turn.

Supersedes tech §4.6 / AGENTS golden rule 1 / rules §6 "unequal = no interaction" (the
2026-07-29/30 override). Rules file, tech §4.6, AGENTS, and `engine.md` updated in the same
change. Bots score higher-damage ripostes that cancel a weaker incoming with
`MUTUAL_CANCEL_BONUS` as well as equal-damage cancels.

## 2026-08-04 · [P] Eliminated players are auto-revealed (Lot 19)

On elimination, freeze kit + hand + specials + tokens (lives, points, UP, shield,
`shieldIsUpgraded`) into `Player.eliminationSnapshot` **before** reward hold / pool dump.
Every recipient's view gets `PublicPlayerView.eliminationReveal` for eliminated seats —
Spy matrix is not mutated. PROTOCOL_VERSION 22.

## 2026-08-04 · [P] End-screen Excel action log (Lot 19)

Finished games expose `FinishedStateView.exportLog`: turn history with every seat's params
before and after each turn, plus the full public event log. Client builds a two-sheet `.xlsx`
download. Fog of war lifted only in this finished export. PROTOCOL_VERSION 22.

## 2026-08-04 · [T] Heuristic invest-first — defer chip attacks

Playtest ask: bots attacked immediately instead of building points → upgrade points →
upgraded cards → low-risk kills. Policy only (#V3-5):

- Non-lethal Pressure requires `isUpgraded` and `damage ≥ STRIKE_MIN_DAMAGE` (4). Base
  Basic / Strong / Super score below Invest (`sustain − 15`). Lethal-now and mutual cancel
  unchanged.
- Safe Tax play moves to Invest (`TAX_INVEST_BONUS`). `buyUpgradePoint` /
  `upgradeCard` (attacks) get Invest bonuses. Shop prefers Tax and Super over filler.

## 2026-08-04 · [T] Heuristic Spy-first intel on unspied seats

Bots share the human `PlayingStateView` (decision 2) but were not scoring Spy, so they
rarely unlocked lethal-now. Policy: Spy on an unspied living seat is Deny
(`SPY_UNSPIED_BONUS`, prefer top threat). Skip re-Spy unless upgraded Spy can add live
resources after a base Spy. Shop `buyCard` Spy preferred while any living opponent is
unspied. Ready Pressure gets a bonus when Spy-known lives are in finish range.

## 2026-08-04 · [T] Heuristic ONMMBZ log fixes — sell-to-fund, immune Spy, soft Regen

Playtest export `ONMMBZ-action-log.xlsx`: Scientific bots at 0 pts bought Tax while holding
Spy+Mirror, then drew to death under Imposition; Kamikaze Spied Untouchable (immune) then
drew with an unaffordable upgraded Super.

Policy only (#V3-5):

- `sellCard` scores Invest when funding Spy / ready strike / soft Regen; prefer high
  `sellYield` (Mirror). Refuse `buyCard` Tax while Spy is held but unaffordable.
- Spy/Thief −∞ on seats with a prior public `immune` resolve (learn Untouchable).
- Regeneration Invest when `lives ≤ REGEN_SOFT_LIFE` even with no pending attack.

## 2026-08-04 · [T] Heuristic CBCPXV — burn public counter persistents

Playtest export `CBCPXV-action-log.xlsx`: human activated Imposition; bots sold attacks,
Taxed, and Spied elsewhere while the counter drained them. Public
`activePersistentEffects` already expose counters.

Policy only (#V3-5):

- Attacks at a seat with `counter > 0` persistents score Deny + `BURN_COUNTER_BONUS`
  (chip Basic allowed; higher damage preferred to clear in one hit).
- Never `sellCard` an attack while any living opponent still has a burnable counter.

## 2026-08-04 · [T] Clock injection for sub-choice deadlines (#V3-6 / L18-01)

Closed open decision #V3-6: inject `nowMs` into `EffectContext` and the turn APIs
(`performTurnAction`, Mirror/reward complete+expire). `mirror.ts` and
`activateRewardHead` no longer call `Date.now()`. Omitted `nowMs` defaults to
`Date.now()` at the API edge so room behaviour is unchanged; the simulator passes a
fixed clock.

Companion: pending-effect, persistent, elimination, pool, and acquisition ids are
derived from seat/turn counters (not `randomUUID`, and **not** embedding
`GameState.seed` — that would leak through hand views). Opaque wire ids — clients
treat them as strings only. Same seed + same script → identical ids via identical
deal/queue order.

## 2026-08-04 · [P] Simulator lives in apps/server (#V3-1 / L18-04)

Closed open decision #V3-1: **(b)** batch CLI is a `tsx` script inside `apps/server`
(`src/simulation/run-batch.ts`, `pnpm --filter @card-battle/server simulate`), same
pattern as `db:migrate`. No third workspace app. Per-game seed is
`` `${baseSeed}:${gameIndex}` ``. Output is JSONL only. Simulated games never write
Postgres (§8.2).

## 2026-08-04 · [P] Selling an upgraded card refunds 1 upgrade point

Designer ruling: `sellCard` still pays base `sellYield` (points/lives), and when
`instance.isUpgraded` is true also grants **+1 upgrade point** — including kit-permanent
always-upgraded copies. Specials remain unsellable. Rules spec §1 updated.

Companion fix: `pickMirrorRedirect` must honour `mirrorChoice.eligibleEffectIds` so base
Mirror never targets an upgraded pending attack (surfaced once sell refunds changed sim
trajectories).

## 2026-08-04 · [P] Bot turn orchestrator defers human elimination rewards

`performBotAction` uses `performAndCompleteTurn` (L18-03). Its `resolveReward` hook must
not auto-pick when the eliminator is a human — delayed kills resolve on the victim's turn,
so a human who queued the killing attack still needs `REWARD_CHOICE_REQUIRED`.

Hook contract: `resolveReward` may return `null` to leave `rewardChoice` pending; the room
then calls `beginRewardTimer`. When a winner appears only after bot-resolved rewards,
`performBotAction` must call `onGameOver` (applyTurnResult never saw that winner).
