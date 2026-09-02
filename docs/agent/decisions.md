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

## 2026-08-04 · [T] Coolify single-container deploy + migrate-on-boot

Hosting is VPS + Coolify (technical spec §3). Locked choices:

- One Dockerfile: Colyseus serves Vite `apps/client/dist` via the `defineServer` `express`
  hook (`STATIC_DIR`, default `/app/apps/client/dist` in the image). Same HTTPS origin for
  page and WebSocket; client uses `window.location.origin` off localhost.
- Server still runs under `tsx` in production (no emit bundle yet) — deferred deliberately;
  `tsx` moved to `@card-battle/server` `dependencies` so `--prod` images can start.
- Postgres remains Coolify-managed; `DATABASE_URL` is required for the container to boot
  because `docker/entrypoint.sh` runs `db:migrate` before listen (fail-fast). This
  **overrides** the earlier “never auto-migrate on boot” stance for the production
  entrypoint only; local/dev stays explicit (`docs/agent/db.md`).

## 2026-08-04 · [T] Heuristic: explicit scores for Sentence / Imposition / Spy Thief / PG (#V3-5)

Bug: `scorePlayCard` fell through to `HEURISTIC_BAND_WEIGHTS.sustain` (100) for any
unbranched `playCard` — the same literal as `draw`. Ties go to `rng.pick`, so base
**Sentence** (15 pts, random victim including self) was coin-flipped against draw.
Permanently unscored: `spy-thief`, `imposition`, `sentence`, `points-generator`.
Conditional fallthrough also hit Cloning / Thief / Absorber without a signal.
Consequence: L18-05 Assassin / Untouchable win rates partly measured that artefact;
Kamikaze (~78%) was closer to clean because Suicide already had a branch.

Fix (policy only — no rule change):

| Card | Band | Behaviour |
|---|---|---|
| Sentence (base) | refuse (`−∞`) | self-elim risk |
| Sentence (upgraded) | lethal-now | random living opponent |
| Imposition / Points Generator | invest + bonus | refuse if already active |
| Spy Thief | deny + bonus | per living / unspied seats |
| Cloning (no threat) | invest if Spy-richer else below draw | |
| Thief (no spend) / Absorber (weak) | refuse / below draw | |
| Any remaining fallthrough | `sustain − UNSCORED_PLAY_PENALTY` | never tie draw |

Tunables in `heuristic-weights.ts` (`IMPOSITION_INVEST_BONUS`, etc.). Re-run the
gross-imbalance screen before trusting kit rates again.

## 2026-08-04 · [P] Absorber Deny uses last complete turn, not last log hit

`lastLivesLostByTarget` kept the most recent `actionResolved.livesLost` for a seat
forever. After a clean later turn (draw only), Absorber still scored Deny and gained
0 from the ledger — playtests saw Absorber on the turn an attack was *played*, before
resolve, chasing a stale signal.

Proxy is now `lastCompleteTurnLivesLostByTarget`: sum applied `livesLost` on the
target's latest completed `actionPlayed` turnSequence (rules §3 / technical spec v3
Deny band). Pending attacks do not count. Tax-only ledger loss stays invisible in the
public log (unchanged visibility).

## 2026-08-04 · [P] #V4-2 Mutual cancel compares final damage (L20-07)

Designer ruling (session): mutual cancellation uses **final damage**
(`attackDamageFor × damageMultiplier`), not card identity at equal upgrade.
Code already did this; docs that claimed “all damage values are distinct” were wrong
and are corrected in L20-07. A Mirror-doubled basic attack (2) cancels a strong attack
(2) today — confirmed, not a behaviour change.

## 2026-08-04 · [P] #V4-3 Multi-pending mutual pairing (L20-07)

Designer ruling (session): each of N pending attacks from a multi-target play
(e.g. MEGA) is evaluated **independently on its own target's turn**, consistent with
Assassin multi-attacks. Pairing on a given turn still uses the existing first-match
`findIndex` among reciprocal pending attacks targeting the acting player.

## 2026-08-04 · [P] L20-18 sub-choice factoring keeps `mirrorChoice`/`rewardChoice`/`rewardQueue`

Technical spec v4 §4.4 asks for "one slot and one queue on `GameState`" for the generic
`SubChoiceState`. Literally renaming `GameState.mirrorChoice` / `rewardChoice` / `rewardQueue`
to a single generic field is incompatible with L20-18's own acceptance line — "every existing
V1/V2/V3 test passes untouched" — because several tests construct or mutate these fields by
their current literal name and shape, with no `kind` discriminant:
`stub-policy.test.ts` builds a bare `{ playerId, isUpgraded, eligibleEffectIds, deadlineMs }`
Mirror literal; `list-legal-actions.test.ts`, `assassin-candidates.test.ts` and
`bot-driver.test.ts` reset/construct `mirrorChoice` / `rewardChoice` / `rewardQueue` directly;
`elimination-rewards.test.ts` and `forfeit.test.ts` read/push `state.rewardQueue` as a live
array. Renaming or adding a `kind` field to any of these breaks compilation, which the task
explicitly forbids fixing by editing the test.

**Resolution:** `GameState.mirrorChoice` / `rewardChoice` / `rewardQueue` stay exactly as they
were — same field names, same shapes, no `kind` tag. The generic model
(`packages/shared/src/domain/sub-choice.ts`: `SubChoiceKind`, `SubChoiceState`) is instead the
single source of truth for *type shape* — `MirrorChoiceState` and `RewardChoiceState` are now
`Omit<Extract<SubChoiceState, { kind: '...' }>, 'kind'>`, not independently declared — and for
everything else the task asks to unify:

- **One gate.** `hasActiveSubChoice` (`apps/server/src/engine/turn/sub-choice.ts`) is the one
  predicate `performTurnAction` and `listLegalActions` both consult (§10.2's new guard test,
  `sub-choice-gate.test.ts`). It reads all three legacy fields internally.
- **One constant.** `SUB_CHOICE_MS = 20_000` lives there too; `mirror-choice.ts`'s
  `MIRROR_SUB_CHOICE_MS` and `elimination-rewards.ts`'s `REWARD_SUB_CHOICE_MS` are now aliases
  of it, not independent literals — kept under their historical names only because
  `clock-injection.test.ts` imports them by name.
- **One timer registry.** `game-room.ts`'s `mirrorTimer` / `rewardTimer` /
  `pausedMirrorRemainingMs` / `pausedRewardRemainingMs` quadruplet is gone, replaced by
  `subChoiceTimers: Map<SubChoiceKind, Timer>` and `pausedSubChoiceRemainingMs: Map<SubChoiceKind, number>`.
  No test touches these private fields, so this part *is* a full rename.
- **One message pair.** `subChoiceRequired` / `resolveSubChoice` (`kind`-discriminated)
  replace `mirrorChoiceRequired`/`chooseMirrorTarget` and `rewardChoiceRequired`/
  `chooseEliminationReward` on the wire — PROTOCOL_VERSION 22 → 23. No test sends or receives
  these message names directly (only `GameState` fields, which are unaffected), so this *is*
  a full rename too. The client's `use-room-connection.ts` translates the generic wire pair
  back into the same `mirrorChoice` / `rewardChoice` / `chooseMirrorTarget` /
  `chooseEliminationReward` shapes `table.tsx` and `card-actions.tsx` already consume, so
  neither of those files needed touching.
- **One orchestration loop.** `continuePendingSubChoices` is one `while` over
  `mirrorChoicePending || rewardChoicePending` instead of two hardcoded loops — `TurnResult`
  keeps both distinct optional booleans (read directly by `mirror.test.ts` /
  `elimination-rewards.test.ts` / `orchestrate-turn.test.ts`), since they are never both `true`
  on the same result.

**Consequence for later Lots (21/24/26):** Card Absorber's pool pick, Card Thief's
steal-when-spied pick, Card Transformer's special pick and Reanimation's kit pick are declared
in `SubChoiceKind` but have no `GameState` storage yet (`payload: never` in `SubChoiceState`
blocks constructing them). When one of those tasks lands, decide then whether to give it its
own dedicated field (this task's precedent) or finally introduce a literal generic
`subChoice` slot / `subChoiceQueue` — at that point the tests are new, so the constraint that
forced this decision no longer applies.

## 2026-08-04 · [P] #V4-30 Player count stays 2–4 (L20-19)

Designer ruling (session): Classic mode remains 2 to 4 players in V4. Documentation
only — no change to `batch-config.ts`, `lobby-rules.MAX_PLAYERS`, or `game-room.maxClients`.

## 2026-08-05 · [T] Persist Excel-parity `export_log` on finished games

`finished_games.action_log` already stored public Events. The Excel **Turns** sheet
(before/after private snapshots) lived only in `GameRoom.turnHistory` for the
finished client download. Migration `003_finished_game_export_log.sql` adds nullable
`export_log jsonb`; `buildFinishedGameSnapshot` / `persistFinishedGame` now write
`GameExportLogView` (`turns` + `events`). `action_log` kept for existing aggregates.
Simulator still does not write Postgres. Query via SQL only — no admin UI yet.

## 2026-08-05 · [P] #V4-29 20-pt purchase draws from all 20 specials (L21-01)

Designer ruling (session): the 20-point random special purchase draws from
`SPECIAL_CARD_IDS` (all 20). The V1 six-card restriction (§6.2 #10) was a scope
artefact, not a lasting rule. Pending-handler specials **may be granted** by this
path; play stays rejected until the handler lands (L20-04).

## 2026-08-05 · [P] #V4-17 / #V4-18 / #V4-33 Upgrade Point Thief strip + Counter Rule (L21-02)

Designer rulings (session):

- **#V4-17:** Upgrade Point Thief strip **includes** `shieldIsUpgraded` and
  `isUpgraded` on already-active persistent effects (overrides the tech-spec
  recommendation and Appendix A #12). Each stripped flag yields 1 upgrade point.
- **#V4-18:** Stripping a kit-trait upgrade still yields 1 UP to the thief (rules
  text confirmed, not a drafting accident). Copies acquired afterwards arrive
  upgraded again via `alwaysUpgraded`.
- **#V4-33:** Counter Rule stays **Spy and Thief only**. Untouchable `immuneTo`
  and upgraded Shield's Spy/Thief block stay Spy/Thief only. Card Thief, Upgrade
  Point Thief, Attack Thief and Curse are **not** counterable and **not** covered
  by those immunities.

## 2026-08-05 · [P] #V4-19 / #V4-34 / #V4-35 Card Thief pool, empty hand, spied-by (L21-03)

Designer rulings (session):

- **#V4-19:** Steal pool is **hand + unused specials** (elimination-reward vocabulary).
- **#V4-34:** Against an empty victim the play is **legal and resolves as a no-op**
  (preserves §10.1; rejects the Mirror "invalid, not wasted" precedent here).
- **#V4-35:** "Spied" means Spy active **from the user**, not from anyone.
- **Timing:** opponent-aimed effects queue; resolve on the victim's turn. Spied
  branch: choose at play, lock `instanceId` on the pending effect. Random: pick
  with injected `rng` at resolve. Missing card at resolve → no-op.
- **Storage:** `GameState.stealChoice` is a dedicated Mirror-shaped slot (L20-18
  precedent); `PendingEffect.chosenInstanceId` is server-only (omitted from
  `PendingEffectView`).

## 2026-08-05 · [T] Heuristic stance pass (build / contest / finish)

Playtest exports BNBBSH, CTHNVP, ESCEKV: humans Tax+/Regen+ farm, upgrade defense and
finishers; bots almost never upgraded Mirror/Shield/Absorber (`secondaryInvest` only
valued attacks). Spec:
`docs/superpowers/specs/2026-08-05-heuristic-stance-design.md`.

Policy-only (#V3-5 tunables):

- `deriveStance` → `build` | `contest` | `finish` in `buildContext`
- Farm upgrades: Tax/Regen/Mirror/Shield/Absorber/Sentence bonuses
- Absorber+ from last-complete-turn points / UP spend proxies (UP absorb below lethal)
- Contest: point reserve + refuse selling Mirror/Shield/Absorber
- Finish: chip Pressure when Spy lives ≤ affordable damage

No rule change. Re-screen gross-imbalance after verify.

## 2026-08-05 · [P] #V4-20 / #V4-21 Lot 22 persistents (Poison, Curse, Super Absorber)

Designer rulings (session):

- **#V4-20:** Curse threshold is **per turn**, remainder discarded (7 points spent → 2
  lives). "Points spent" is ledger `pointsSpent` only — not `pointsLostToTheft`. When
  the victim reaches 1 remaining life the Curse **deactivates and is permanently lost**
  (rules spec §5 persistent loss).
- **#V4-21:** Super Absorber absorbs Tax life costs as lives gained; gains clamp at
  `GameState.lifeLimit` (golden rule 9).
- **SA lives instrument:** absorb **all** of the current seat's `turnLedger.livesLost`
  (same channel as V1 Absorber life capture) — not a new `livesSpent` field. Never
  absorb theft fields.
- **SA schedule:** on **each opponent's** turn end (after their action), absorb that
  seat's ledger — Imposition/Poison timing, not owner-turn batch.
- **Poison attribution:** `recordEliminationContributor` like Imposition when a tick
  kills via `applyLifeLoss`.
- **Tick order (implementation, not a rules claim):** inside `applyPersistentEffects`,
  Points Generator → Super Absorber → Imposition → Poison → Curse. Super Absorber runs
  before life-ticking persistents so it does not re-absorb lives lost later in the same
  phase.

## 2026-08-05 · [P] #V4-1 / #V4-32 / #V4-4 / #V4-5 / #V4-31 Lot 23 attacks

Designer rulings (session):

- **#V4-1:** MEGA ATTACK targets **alive opponents only** (not the user). Overrides the
  tech-spec recommendation that included the user.
- **#V4-32:** Assassin **may not** include MEGA ATTACK in a multi-attack. Already
  enforced by `isSharedAttackCardId`; tests lock it.
- **#V4-4:** Super Mirror redirects **all** pending attacks on the user to **every**
  alive opponent automatically — no sub-choice.
- **#V4-5:** Attack Thief charge is spent **before** mutual cancel. The first eligible
  incoming attack consumes one charge via `cancelPendingEffect` (`'blocked'`), even
  when mutual cancel would have cancelled that attack. Overrides the tech-spec
  recommendation (preserve charge).
- **#V4-31:** Attack Thief steals only **shared** attack cards (`isSharedAttackCardId`);
  MEGA ATTACK is not stealable.

## 2026-08-05 · [P] #V4-14 / #V4-15 / #V4-16 Lot 24 pool + transformer

Designer rulings (session) — confirm tech-spec §11 recommendations:

- **#V4-14:** Pool instances keep `isUpgraded`. Card Absorber recovery preserves it;
  `transferCardInstance` may still force `true` via `alwaysUpgraded`.
- **#V4-15:** Absorber takes `min(4, pool.length)`. `canPlay` requires `pool.length >= 1`
  (empty pool = invalid action, Mirror precedent).
- **#V4-16:** Card Transformer: consumed hand card → shared pool as-is; special result
  does **not** inherit upgrade (mint via `acquireSpecialCard`); duplicates allowed.
- **Storage (Approach B):** new Mirror-shaped kinds (`pool-pick`, `special-pick`) share
  one `GameState.subChoice` field — Mirror / steal / reward keep dedicated fields
  (L20-18 deferral resolved for Lot 24 new kinds only).
- **Transformer addressing:** optional `consumeInstanceId` on `PlayCardPayload` /
  `TurnAction` / `EffectContext`. No `PROTOCOL_VERSION` bump (V4 already at 23).
- **Transformer eligibility:** hand only, `SHARED_CARD_IDS` (shared attack + action).
  Not specials, not MEGA ATTACK.

## 2026-08-05 · [P] #V4-6 / #V4-7 / #V4-8 / #V4-9 / #V4-10 Lot 25 turn flow

Designer rulings (session):

- **#V4-6:** During a Block chain the chain counts as **one** lifecycle turn — one
  30-second timer per Block turn, but a single timeout **ends the chain** and counts
  as **one** inactive (or absent) tick. Same shape on the absent auto-draw path.
- **#V4-7:** Block cancels **`pendingEffects` only**. Already-active Poison / Curse /
  Imposition (and other persistents) keep ticking.
- **#V4-8:** The turn ledger **resets on each** Block turn (`advanceTurn` already does);
  Absorber reads the most recent Block turn only.
- **Block cancel UX:** each cancelled pending emits a public `actionResolved` with
  `outcome: 'blocked'` (L20-12 primitive).
- **Block attack ban:** cannot **play/use** attack cards (including MEGA ATTACK and
  Assassin multi-attack) during the chain; **buying and upgrading** attacks stay legal.
  Ban is tracked by `Player.blockAttacksForbidden` because `blockTurnsRemaining` is `0`
  on the last consecutive turn while the seat is still held.
- **#V4-9a:** Invisibility makes the user immune to **already-active** persistent ticks
  too — effects stay armed, ticks **skip** while invisible, and resume after deactivate
  (not a cleanse).
- **#V4-9b:** Immune to attacks, MEGA ATTACK included (resolve as `'immune'`).
- **#V4-9c:** Invisible player is **excluded from Sentence's candidate pool**; empty
  pool → `canPlay` false (Mirror empty-target precedent).
- **#V4-9d:** Opponent targeting attempts stay legal and resolve as `'immune'` (do not
  reject as invalid).
- **Cloning:** covered by invisibility — no kit/resource copy when the target is
  invisible; outcome `'immune'`.
- **Lifecycle:** Invisibility does **not** block inactivity / absence / leave
  elimination.
- **#V4-10:** Deactivating Invisibility **consumes** the turn's action (new
  `deactivatePersistent` TurnAction).

## 2026-08-05 · [P] #V4-11 / #V4-12 / #V4-13 / #V4-36 Lot 26 Reanimation

Designer rulings (session):

- **#V4-11:** Elimination **happens** and the eliminator is **paid**; the victim
  returns **stripped**. Overrides the tech-spec recommendation (intercept before
  mark / no reward). Cards stay on the victim through the reward window as today;
  leftovers dump to the pool; then revive.
- **#V4-12a:** Armed Reanimation fires on **every** elimination path, including
  absence / inactivity / consented leave (`eliminateWithoutReward`).
- **#V4-12b:** Armed Reanimation is **public** via `activePersistentEffects`.
- **#V4-12c:** At most **one** armed charge; a second play while armed is
  **rejected** (invalid action).
- **#V4-12d:** Consumed on **trigger only**; an unused armed charge evaporates at
  game end (no special pool deposit).
- **#V4-36:** Revive is a **full restart** — setup steps 2 + 3 + 4 for the new kit
  (resources, starting attack/action draws, kit specials). Old hand/specials are
  already stripped by rewards/dump.
- **#V4-13:** Upgraded kit pick is an **immediate blocking** `reanimation-kit`
  sub-choice (not deferred to the player's next turn). Expiry → seeded random kit;
  bot resolves it.
- **Revive timing:** After rewards finish (or after immediate dump if no
  eliminator / lifecycle). Serial order: rewards → kit sub-choice (upgraded) →
  reset. Never parallel with rewards.
- **Architecture (Approach 1):** Arm in `activePersistentEffects`
  (`counter: null`); on elim consume the charge (pool the card instance) and set
  `Player.pendingReanimation: { isUpgraded }`; sole-survivor treats pending as
  still in the match; do not `rejectReconnection` while pending.

## 2026-08-05 · [P] #V4-22 / #V4-23 / #V4-24 Lot 28 Ghost + Duplicator

Designer rulings (session):

- **#V4-22:** Ghost gains 2 points per life **actually** lost (post-shield) from
  **every cause except Cloning’s resource copy**. Includes typed losses
  (`applyDamage` / `applyLifeLoss`), Self-Suicide, and Sentence (credit lives
  before the lethal assignment). **No** credit on elimination bookkeeping that
  zeros lives already at 0. Credit is caller-side via helper — never inside the
  life primitives (golden rule 2).
- **#V4-23:** Active Duplicator copies opponents’ **lives / points / upgrade
  points** gained: **shield gain no**; **Cloning resource copy no**; **life copy
  clamps** at `GameState.lifeLimit`; **theft and elimination-reward gains yes**.
  Cards never duplicated. `origin: 'duplicated'` prevents Duplicator↔Duplicator
  loops.
- **#V4-24:** Duplicator starting deal is **1 action / 0 attack** as written (not
  a typo).

## 2026-08-05 · [T] Heuristic: kit-aware draw score (L29-02)

`{ type: 'draw' }` scored a hardcoded `HEURISTIC_BAND_WEIGHTS.sustain` (100) for every kit,
so a Wizard (kit draw 2) drew as reluctantly as an Untouchable (kit draw 1) even though
drawing is strictly more valuable for the higher-draw kit. Policy-only (#V3-5 tunable,
not a measured constant):

```ts
score = HEURISTIC_BAND_WEIGHTS.sustain + DRAW_SCORE_PER_EXTRA_DRAW * max(0, kitDraw - 1)
```

`DRAW_SCORE_PER_EXTRA_DRAW = 20` lives in `heuristic-weights.ts`. Untouchable (draw 1) stays
at exactly 100 — no behaviour change for the majority of kits. Read `kitDraw` from
`getKit(view.self.kitId).startingResources.draw` at scoring time, never hardcoded, so a
future kit (e.g. Tactician, not yet in `KIT_IDS`) picks up the right score automatically.

Refactored `decideWithReason` to delegate to a new exported `scoreActions(view, actions, rng)`
— same scoring, now testable per-action without asserting through `decide`'s rng-tie-break.

## 2026-08-05 · [T] Heuristic: life-relative Tax/Regen thresholds (L29-03)

`REGEN_SOFT_LIFE = 6` and `TAX_LIFE_BUFFER = 5` (`heuristic-weights.ts`) are absolute life
counts tuned by playtest against 10-life kits. Applied unscaled to Indestructible (18 lives)
the bot is needlessly timid (never soft-Regens, Taxes only far above what it can afford to
lose); applied to a low-life kit (Duplicator, 2 lives) it never Taxes or soft-Regens at all,
because 5–6 lives of buffer exceeds its whole life pool.

New `apps/server/src/bots/heuristic-life-thresholds.ts` scales both to
`getKit(kitId).startingResources.lives`, keeping the same proportion of the 10-life tuned
value (#V3-5 tunable, this rescaling itself is untested — not to be cited as measured):

```ts
regenSoftLifeForKit(L) = max(1, round(REGEN_SOFT_LIFE * L / 10))
taxLifeBufferForKit(L) = max(1, min(TAX_LIFE_BUFFER, round(TAX_LIFE_BUFFER * L / 10)))
```

`taxLifeBufferForKit` is capped at the 10-life tuned value rather than scaled up for
high-life kits — a bigger life pool should make the bot Tax more readily, not need an even
larger absolute cushion than what playtest already validated. Both floor at 1 so no kit is
ever gated to "never Tax / never soft-Regen" purely by rounding to 0.

Every comparison site in `heuristic-policy.ts`, `policy-internals.ts` (`scoreAbsorber`) and
`score-play/score-core.ts` (Tax play, Regen soft top-up) now reads the scaled value via
`getKit(view.self.kitId).startingResources.lives` instead of the two module constants
directly. `REGEN_SOFT_LIFE` / `TAX_LIFE_BUFFER` themselves are unchanged and still the single
source the helpers scale from — no second tunable to drift out of sync.

## 2026-08-05 · [T] Heuristic: score economy / theft specials (L29-05)

`score-play/score-economy-theft.ts` moved off the L29-01 stub. Three branches, all tunable
defaults (#V3-5), none ever tying `draw`:

- **Super Regeneration** — `survive + SUPER_REGEN_SURVIVE_BONUS` (+10 upgraded) under any
  incoming threat; `invest + SUPER_REGEN_INVEST_BONUS` (+15 upgraded) when `lives` is at or
  below the kit-scaled `regenSoftLifeForKit` floor (+3 more for upgraded, since its 18-life
  heal is worth reaching for slightly earlier); otherwise refused outright — a full-health
  bot must not play it idly just because nothing else scored.
- **Upgrade Point Thief** — always `deny` with at least one living opponent (mass effect,
  no target needed): `UPGRADE_POINT_THIEF_DENY_BONUS + livingCount * 15`, plus `+20` per
  opponent whose Spy relation already shows an upgraded card or spent upgrade points. Refused
  outright with zero living opponents (never reachable in practice, kept for safety).
- **Card Thief** — upgraded is target-less (mass steal): `deny + CARD_THIEF_DENY_BONUS +
  livingCount * 10`. Base needs a target: refused without one; refused against a target
  `isImmuneTarget` reports immune to (`card-thief` — no shipped kit lists it yet, defensive
  only); otherwise `deny + CARD_THIEF_DENY_BONUS`, +15 more when the target is spied with at
  least one known card to aim at.

`score-turn-pool-reversal.ts`, `score-persistents.ts`, `score-attacks-redirect.ts` stay on
the L29-01 stub pending L29-06..08.

## 2026-08-05 · [T] Heuristic: persistents move + Poison/Curse/Super Absorber (L29-06)

Sentence, Imposition, Spy Thief and Points Generator had been branched directly in
`score-core.ts` since the L20-17 fallthrough fix — L29-01's family split left them there
because they predated the split. Moved verbatim into `score-play/score-persistents.ts` and
`families.ts` routes their four card ids to `'persistents'` instead of `'core'`. The backlog
row for L29-06 previously read "plus the four cards that have had no branch since V1", which
was wrong (they have had one since L20-17, 2026-08-04) — corrected to "retune ... (branched
since L20-17)".

Retuned in the same change (still tunable defaults, #V3-5, not measured):
`IMPOSITION_INVEST_BONUS` 55 → 60, `POINTS_GENERATOR_INVEST_BONUS` 50 → 55,
`SPY_THIEF_DENY_BONUS` 100 → 110, Sentence's upgraded per-opponent add-on 5 → 8
(`SENTENCE_UPGRADED_PER_OPPONENT`). `cloning`'s outside-threat Invest bonuses in
`score-core.ts` also bumped 40 → 50 (life-driven) and 35 → 45 (points-driven) — it stays in
`'core'` since it is not persistent, just already branched there. All four retuned bands and
Cloning's still clear `HEURISTIC_BAND_WEIGHTS.invest`/`.deny` (1000/4000) by a wide margin, so
the retune only reorders preference among these specials, never against draw or against a
Survive/Deny play under real threat.

Three new branches in `score-persistents.ts`:

- **Poison** — `invest + POISON_INVEST_BONUS` (+`POISON_MULTI_TARGET_BONUS` at 2+ living
  opponents, since it hits every opponent at once); refused with `hasOwnPersistent('poison')`
  already active or zero living opponents.
- **Curse** — needs a target; refused without one or against an `isImmuneTarget` result.
  Stacking is legal (designer 2026-08-07): soft `-2` per existing Curse on the target, not a hard deny.
  `deny + CURSE_DENY_BONUS + spentLastTurn` when the target's last complete turn spent ≥
  `CURSE_HIGH_SPEND_THRESHOLD` points or the target already tops `ctx.threatOrder`; otherwise
  a smaller `invest + CURSE_INVEST_BONUS` — still worth activating on any living target, the
  drip pays off over time even with no signal yet.
- **Super Absorber** — refused with `hasOwnPersistent('super-absorber')` already active or
  zero living opponents. Upgraded escalates like Absorber+ (`scoreAbsorber` in
  `policy-internals.ts`): `deny + SUPER_ABSORBER_UP_DENY_BONUS` when any living opponent's
  last complete turn spent an upgrade point, else `deny + SUPER_ABSORBER_POINTS_DENY_BONUS`
  when any spent more points than this bot's kit draw. Otherwise a passive
  `deny + SUPER_ABSORBER_BASELINE_DENY_BONUS` baseline — unlike single-target Absorber it is
  activate-once-for-all-opponents (no target), so it is worth playing proactively even before
  a spend signal exists.

## 2026-08-05 · [T] Heuristic: score MEGA / Super Mirror / Attack Thief (L29-07)

MEGA ATTACK moved from `'core'` to the `'attacks'` family (`families.ts`,
`score-attacks-redirect.ts`). It had stayed in `'core'` since L29-01 on the theory that it
would "keep scoring through the existing `isAttackCardId` branches with zero behaviour
change" — true only in the vacuous sense that it fell through to the unscored penalty either
way: `megaAttackHandler.canPlay` requires `targetPlayerId === null` (it hits every alive
opponent at once), so none of `score-core.ts`'s per-target branches (mutual cancel,
lethal-now, burn counter, pressure) ever matched its target-less action. It needed its own
branch, not core's:

- **MEGA ATTACK** — `survive + MUTUAL_CANCEL_BONUS + damage` if it would cancel a pending
  attack from any living opponent (`hasCancelingIncomingFrom`, mirroring core's per-target
  rule across all targets at once); `lethalNow + damage` if any Spy-known opponent's lives are
  at or below 20 (`attackDamageFor('mega-attack', isUpgraded)` is 20 either way — the upgrade
  changes redirectability, not damage); otherwise
  `pressure + livingCount * MEGA_ATTACK_PRESSURE_PER_OPPONENT + damage`. Refused only with
  zero living opponents.
- **Super Mirror** — `survive + SUPER_MIRROR_SURVIVE_BONUS` (+`SUPER_MIRROR_UPGRADED_BONUS`
  upgraded) only when `incomingThreat > 0` **and** at least one pending effect actually
  targets self and `isAttackCardId` — redirecting nothing pending is a wasted card. Refused
  otherwise; never scores outside the Survive band, since it has no use off-threat.
- **Attack Thief** — `survive + ATTACK_THIEF_SURVIVE_BONUS` under any incoming threat (the
  block charge is spent before mutual cancel, so it is worth reaching for pre-emptively).
  Off-threat: `deny + ATTACK_THIEF_DENY_BONUS` with any living opponent (it always steals a
  random shared attack per opponent even with no intel), +`ATTACK_THIEF_INTEL_BONUS` when a
  spied opponent's hand shows a shared attack card. Refused only with zero living opponents.

**Mirror eligibility fix (score-core.ts).** The base Mirror Survive branch
(`ctx.incomingThreat > 0` → `survive + 30`) fired on *any* pending attack, without checking
whether Mirror could actually redirect it — a base Mirror facing only an upgraded MEGA (never
redirectable by a base Mirror, technical spec v4 §4.7) scored Survive for a play that would be
rejected. Added `eligibleMirrorPendingFromView(view, isUpgradedMirror)` in
`policy-internals.ts`, a hand-duplicated copy of `listEligibleMirrorTargets`'s predicates
(`engine/turn/mirror-choice.ts`) over `PendingEffectView` instead of `PendingEffect` — the bot
only ever sees the view, never `Player.pendingEffects`. Gated the Survive branch on
`eligible.length > 0`; when empty, execution now falls through to the later
sustain-band `shield`/`mirror` branch instead (still scores above draw in the common case, but
no longer via a false Survive claim). `mirror-eligibility-parity.test.ts` builds the same
pending attacks on both sides (direct, upgraded, mirror-redirected, super-mirror-redirected,
base/upgraded MEGA) and asserts identical eligible-id sets for both a base and an upgraded
Mirror — the parity contract the two duplicated predicates must never drift on.

## 2026-08-05 · [T] Heuristic: turn-flow specials, new action types, sub-choice picks (L29-08)

Closes Lot 29. Five branches in `score-play/score-turn-pool-reversal.ts`, none of which
gate on point reserve (unlike core's utility cards) or refuse below draw except where noted —
these are one-shot or renewable cards with no downside to playing when legal:

- **Block** — `survive + BLOCK_SURVIVE_BONUS` when `incomingThreat > 0` or any pending
  effect targets self (cancels every one of them); otherwise `invest + BLOCK_INVEST_BONUS`
  for the proactive consecutive-turn grant. Never refused — no "already active" gate exists
  on the card itself (replaying it resets the chain, which is legal).
- **Invisibility** — refused only via `hasOwnPersistent('invisibility')`; otherwise
  `invest + INVISIBILITY_INVEST_BONUS`.
- **Card Absorber** — refused on an empty shared pool (`view.pool.length === 0`, the only
  case `canPlay` itself would reject); otherwise
  `invest + CARD_ABSORBER_INVEST_BONUS + min(4, pool.length) * CARD_ABSORBER_PER_CARD_BONUS`.
- **Card Transformer** — the action already carries `consumeInstanceId` from
  `list-legal-play-card.ts`'s per-hand-card enumeration; refused only if it does not resolve
  to an owned hand card (defensive — should not happen), else
  `invest + CARD_TRANSFORMER_INVEST_BONUS`.
- **Reanimation** — refused only via `hasOwnPersistent('reanimation')` (the engine's own
  `canPlay` already blocks a second arm — this is a defensive mirror, unreachable through
  `listLegalPlayCardActions`). Otherwise always `invest + REANIMATION_INVEST_BONUS`
  (+`REANIMATION_LOW_LIFE_BONUS` at/below the kit-scaled `regenSoftLifeForKit` floor or the
  flat `REANIMATION_LOW_LIFE_FLOOR`) — insurance the bot should always buy when available,
  more urgently at low life, never left to rng-tie with draw.

Replaced the L25-02 / L28-02 placeholder scores for the two newer `TurnAction` variants in
`heuristic-policy.ts` directly (they are not `playCard`, so they stay outside `score-play/`):

- **`deactivatePersistent`** (Invisibility only, today) — kept under
  `ctx.incomingThreat > 0` (`sustain - UNSCORED_PLAY_PENALTY`, i.e. never chosen while the
  immunity still matters); otherwise `invest + DEACTIVATE_PERSISTENT_INVEST_BONUS` when the
  stance wants to attack (`finish`/`contest`, or an attack card in hand) or points are at or
  above `DEACTIVATE_PERSISTENT_POINTS_FLOOR`; else a small `sustain - 5`.
- **`activateDuplication`** (Duplicator only) — refused if `view.self.kitId !== 'duplicator'`
  or the public view already shows `duplicationActive` (both defensive: the engine's own
  `listLegalActivateDuplicationActions` gate gives the first for free, and the window is
  always cleared before the owner's own next decision per `advanceTurn`, per
  `duplicator.test.ts`'s "clears window at next turn start"). Otherwise
  `invest + ACTIVATE_DUPLICATION_INVEST_BONUS` with any living opponent outside `finish`
  stance (renewing the anticipatory window is not worth the action once already finishing);
  else `sustain - 8`.

**New `bots/sub-choice-picks.ts`** — light heuristics for the four generic sub-choices,
replacing `rng.pick`/`rng.shuffle` wherever a bot resolves one:

- `pickStealInstanceId(view, eligibleIds, rng)` — Card Thief's steal-pick is only ever
  raised against a spied victim (`needsStealPick` in `card-thief.ts`), so every eligible id
  is expected to resolve to a real `CardInstance` via some opponent's `spied.hand` /
  `spied.specialCards`. Ranks upgraded attack > attack > special > plain action; falls back
  to `rng.pick` if nothing resolves (defensive).
- `pickPoolInstanceIds(poolCards, eligibleIds, maxCount, rng)` — Card Absorber's upgraded
  pool-pick. Ranks special > upgraded attack > attack > plain action; cards strictly better
  than the `maxCount`-th rank are always taken, ties at the cutoff broken by `rng.shuffle`
  rather than stable array order.
- `pickSpecialCardId(eligibleCardIds, rng)` — Card Transformer's upgraded special-pick.
  `beginSpecialPick` always offers the full 20-entry `SPECIAL_CARD_IDS` set, so this resolves
  to a fixed high-impact-first preference order's first hit; `rng` only matters if the
  eligible set is ever narrowed later.
- `pickReanimationKitId(eligibleKitIds, rng)` — upgraded Reanimation's kit choice. Sorts by
  `startingResources.lives` desc, then `.draw` desc; `rng.pick` breaks a genuine tie (three
  kits currently tie at 10 lives / 1 draw).

**Wiring** — every remaining `rng.pick`/`rng.shuffle` at a bot decision point now goes
through one of the four functions above: `bot-driver.ts` (`handleStealChoice`,
`handleReanimationKitChoice`), `game-room.ts` (all four `performBotAction` hooks —
`resolveSteal`, `resolvePoolPick`, `resolveSpecialPick`, `resolveReanimationKit` — plus the
upgraded-steal chain continuation in `applyBotStealChoice`), and `simulation/run-game.ts`'s
matching hooks, for parity between the room path and the headless simulator.

**Tests** — `sub-choice-picks.test.ts` covers each function's preference order and rng
fallback in isolation. `v4-specials-stall.test.ts` drives Block and Invisibility through a
direct play, and Card Absorber / Card Transformer / Reanimation through their full upgraded
sub-choice (pool-pick, special-pick, reanimation-kit after a forced elimination) via
`performAndCompleteTurn` with hooks built on the new pick functions, proving none of the five
throws or leaves the room stuck. `heuristic-policy.test.ts` adds a scoring-level suite per
card plus `deactivatePersistent` / `activateDuplication`, asserting each beats `draw` when
expected and neither ever falls back to `sellUpgradePoint`.

## 2026-08-05 · [P] Public immune outcome copy (L30-04)

Designer instruction: revert the opaque-immunity UI convention. Action log,
resolution FX, and spectator-readable state may say "immune" (Untouchable,
Invisibility, and any future `outcome: 'immune'`).

## 2026-08-05 · [P] #V4-28 Upgrader UP buy/sell (L27-01)

Designer ruling (session):

- **Buy cost:** **5** points (rules spec §4 "instead of 10").
- **Sell yield:** stays **7** (explicit — not a silent inherit of the global).
- Round-trip buy-then-sell is therefore **+2**; bare sale of a starting UP is
  **+7** in one action. Accepted for V4 (no value rebalance).

## 2026-08-05 · [P] #V4-25 Tactician Draw 4 / inactivity auto-draw (L27-02)

Designer ruling (session):

- Inactivity / absence auto-draw grants the kit draw value — **4** for Tactician
  (same `{ type: 'draw' }` path as a deliberate draw; `performAutoDraw` in
  game-room).
- Accepted for V4 (no cap). Reachable exploit: four deliberate timeouts (+16 pts)
  then one real action resets `consecutiveTimeouts` indefinitely. **Measurement
  target for L31-02** — do not change the draw value in V4.

## 2026-08-05 · [P] #V4-27 Prophet random specials (L27-04)

Designer ruling (session):

- Draw **2** specials from **all 20** special cards.
- **Duplicates OK** (`rng.pick` with replacement).
- Implemented via `Kit.randomStartingSpecialCount` (not a `'random'` sentinel in
  `specialCards`). Deal path in `dealStartingLoadout` consumes the shared seeded
  stream — fixed-seed tests that omit `kitAssignment` may need pinning when the
  roster grows.

## 2026-08-05 · [P] #V4-26 / #V4-37 Warrior alwaysUpgraded (L27-06)

Designer rulings (session):

- **#V4-26:** `alwaysUpgraded` is **acquisition-time only** — Cloning onto Warrior
  does not retro-upgrade held attacks; Warrior cloning away keeps already-upgraded
  attacks. Confirmed intended.
- **#V4-37:** Warrior's list is the **three shared shop attacks**
  (`basic-attack`, `strong-attack`, `super-attack`) — **not** `mega-attack`.
  A Warrior who acquires MEGA by any route does not get it upgraded for free.

## 2026-08-05 · [T] Bot UP buy uses per-kit cost (L27-01 follow-up)

L27-01 wired engine + legal-action gate to `KitTraits.upgradePointBuyCost`.
Heuristic policy still subtracted the global 10 for `buyUpgradePoint` reserve and
Absorber's last-turn spend proxy. Upgrader bots with 5–9 points refused a legal
buy under contest reserve; Absorber over-counted unspied buys was unchanged, but
self / Spy-revealed Upgrader buys now read `upgradePointBuyCost(kitId)`.
Unspied opponents still fall back to the global 10 (kit is private).



## 2026-08-05 · [P] Timers + Mirror attribution / mutual

Designer session:

- **Turn timer** default `TURN_DURATION_MS` **30s → 60s** (`game-room.ts`). Env override
  unchanged (min 5s). Client progress bar already assumed 60s.
- **Sub-choice** `SUB_CHOICE_MS` **20s → 40s** (Mirror, steal, pool, special, reanimation,
  rewards). Client `CLIENT_SUB_CHOICE_MS` matches.
- **Mirror / Super Mirror attribution:** on redirect, `PendingEffect.sourcePlayerId`
  becomes the redirector. A redirected attack is an attack from the Mirror user
  (rules spec §6). Eliminator rewards and mutual pairing follow that source.
- **Mutual with Mirror (rules §6 example):** A and B both attack C; C Mirrors A onto B;
  B→C and C→B (redirected) cancel when equal. Previously broken because source stayed
  the original attacker — fixed by the rewrite above. No change to `resolveMutualAttack`
  reciprocity logic itself.

## 2026-08-06 · [P] Game-ending elim skips rewards; closable end stats

Designer session:

1. **Skip elimination rewards on the last opponent** — when processing an elim that leaves
   a sole contender and the victim has **no** `pendingReanimation`, do not enqueue
   `rewardQueue` / open `rewardChoice`; dump cards to the pool and proceed to sole-survivor
   / `gameOver`. Mid-game elims (still ≥2 contenders) unchanged. **Exception:** pending
   reanimation still counts as a contender, so the eliminator is paid before revive.
2. **End UI** — stats are a closable Dialog over the finished board (inspect table after
   dismiss). PROTOCOL_VERSION **23 → 24** adds `FinishedStateView.finalTable` (nested
   per-recipient `PlayingStateView`, `turnDeadlineMs: null`). Exception to the V4
  “bump once” lock in `docs/technical_spec_v4.md` / backlog scope — additive finished-view
  field only; no rule change.

## 2026-08-06 · [P] Duplicator activation is Spy-gated (not public)

Designer session override of technical spec v4 §5.1 (`Player.duplicationActiveUntil`
listed **Public** because it “changes what every opponent's gain does”).

- **`duplicationActive` on `PublicPlayerView`:** `true` only for the seat itself
  (`isYou`) or when the recipient has a Spy relation on that seat; otherwise `false`.
- **`activateDuplication` action log + live `ACTION_PLAYED`:** actor + current spies see
  the real action; everyone else gets an opaque `draw` (so the turn still appears). Room
  still stores the full log; Excel `exportLog` stays complete.
- **No public seat badge** (“Duplicating”) — visibility is the Spy-gated flag + log line
  for spies / the private Activate control for the Duplicator seat.
- Engine behaviour unchanged — `observeDirectGain` still reads server `Player.duplicationActive`.
- No `PROTOCOL_VERSION` bump: field shape unchanged; semantics tightened.

## 2026-08-06 · [P] Reanimation kit stays private in the action log

Designer: the kit a player returns with after Reanimation must not be public.

- Server still records `playerReanimated` with `kitId` (needed for Excel `exportLog`).
- Per-recipient `PlayingStateView.actionLog` omits `kitId` unless the recipient is the
  revived seat or currently spies them — same Spy gate as kit privacy generally.
- Client copy: with kit → `X returns with KitName`; without → `X returns`.
- No `PROTOCOL_VERSION` bump (`kitId` becomes optional on the log entry; older clients that
  always expected a kit would already be on PROTOCOL 24+ for `finalTable`).

## 2026-08-06 · [P] Eliminated seats fully spectate (upgraded Spy overlay)

Designer session:

1. Vision level = **upgraded Spy** (live lives/points/UP/shield + kit + hands) of **every other
   seat**, including other dead seats.
2. Grant as soon as `isEliminated && pendingReanimation === null` (game still in progress).
3. **No** spectator vision while Reanimation is pending, and none after revive (alive = normal
   privacy again).
4. Implementation: **view-time overlay** in `visibility-matrix.ts`
   (`isEliminatedSpectator`, `recipientSeesPrivateOf`) — does **not** write fake `grantSpy`
   matrix rows (would linger after revive / pollute Cloning reset). Same helper gates action-log
   redaction and live `activateDuplication` `ACTION_PLAYED`.
5. No `PROTOCOL_VERSION` bump: `SpiedPlayerView` shape unchanged; who receives it widens.

## 2026-08-07 · [P] Home hub + optional How to play for new players

Designer session override of technical spec v2 §6 / §9 ("no onboarding designed for
strangers") for the **Home screen only**:

- **Hub first:** Play online vs Play solo as separate paths (mode chooser, then dedicated
  form). Nickname collected inside each path, not on the hub.
- **Online** keeps both Create and Join under the online path.
- **How to play** is an opt-in `Dialog` primer (rules §1 / §6 / Classic) opened from the hub.
  It must **not** auto-open and must **not** gate starting a game.
- No new screen in the phase router, no protocol/rule change, no new dependency. Solo still
  composes `create` + N× `addBot` + `startGame` (L17-01).

## 2026-08-07 · [P] Absorber post-elim window + Super Absorber activation snapshot

Designer session:

1. **Absorber** may target an eliminated opponent for that opponent's last complete turn.
   Window = every player who was living at elimination must begin one turn; then the corpse
   leaves Absorber targets and their turn ledger is cleared for absorb purposes. Mid-window
   deaths prune the pending set so windows cannot stick forever.
2. **Super Absorber** on activation immediately absorbs last-turn ledgers of all opponents in
   that same window (living + in-window eliminated), then keeps ticking on living victims as
   before (#V4-21 fields, theft excluded, life cap).
3. Implementation: `Player.absorbWindowPendingPlayerIds`, helpers in `absorb-window.ts`,
   shared `absorbLedgerFromVictim`, Absorber-only exception in legal targets / `perform-action`,
   public `absorbWindowOpen` on `PublicPlayerView`. **PROTOCOL_VERSION 24 → 25**.

## 2026-08-07 · [P] Curse victim-owned + transfer

Designer session — supersedes L22-02 **placement** and elim attribution only.
`#V4-20` spend math (per turn, remainder discarded, `pointsSpent` only, floor at 1 life)
stays.

- Effect lives on the **cursed** player's `activePersistentEffects` (`targetPlayerId: null`),
  not the caster. Activated card UI follows the cursed seat.
- Stacking allowed; each copy ticks independently on the same `pointsSpent`.
- Transfer: after any attack card resolves with **≥1 life lost**, move every Curse on the
  attacker onto the hit player (same instance, keep upgraded). No transfer when cancelled,
  blocked, immune, or fully shield-absorbed. Pass-back (including to original caster) is
  allowed. Multi-attack / MEGA: each successful hit transfers whatever Curse(s) the attacker
  still holds.
- End: at 1 remaining life during a tick, or on elimination → permanently to the pool.
- No `recordEliminationContributor` for Curse ticks (cannot finish a player off).
- Public action-log kind `curseTransferred`. **PROTOCOL_VERSION 25 → 26**.
- Bot: drop hard deny on re-curse; soft stack penalty only.

## 2026-08-07 · [P] Lot 31 simulation screen: random 4p sample

Designer session (Lot 31 planning):

- **1v1** stays a forced-kit unordered-pair matrix (tech v3 §8 forced assignment for
  controlled matchups).
- **4p cell** for the V4 screen uses **random kits with replacement** each game
  (`kitAssignment` omitted → `rng.pick(KIT_IDS)`), same as production deals — not a fixed
  quartet and not an exhaustive `C(15,4)` sweep. Config logs coverage explicitly
  (`fourPlayer.mode: 'random'`, game count).
- Default V4 sample size: **2000** 4p games; 1v1 stays **200 games/cell** over all 15 kits
  (105 pairs). Undersampled-card threshold **N = 100** completed games with ≥1 play.
- Stalls attributed per kit (and per 1v1 matchup); never assigned a winner.

## 2026-08-09 · [P] Playtest: Transformer consume UI, Duplicator log, Mirror cost/labels

Designer playtest feedback (session):

1. **Card Transformer** — client must open a popup to choose which hand card to
   consume (`consumeInstanceId`) before `playCard`. Upgraded still raises
   `special-pick` for the resulting special (already wired). Without the consume
   dialog the client sent no `consumeInstanceId` and the server rejected with
   "That play is not legal."
2. **Duplicator activation log** — format `activateDuplication` as
   "`{player} draws`" (same copy as a real draw). Protocol still Spy-gates the
   action kind; only the player-facing string changes.
3. **Mirror** — sub-choice attack list uses `formatCardLabel` + source nickname
   (`Alice's Basic Attack`), not raw `cardId`s. Play cost (6 pts) is charged on
   sub-choice complete / expiry, not when Mirror is first played (affordability
   still gated at play time).

## 2026-08-10 · [P] Typed ERROR_MESSAGE codes (PROTOCOL 27 / L39-01)

Table UX polish (Lot 39, tracked in `docs/backlog_ux.md` — not V5 Lot 32):

- `error` payload is `{ code: ActionRejectCode; message: string }` instead of
  `{ message: string }` alone.
- Catalog + `actionReject()` live in `packages/shared/src/protocol/action-reject.ts`.
- Opaque `handler.canPlay === false` maps to `play-not-legal`.
- **PROTOCOL_VERSION 26 → 27.** Lobby reason unions stay; their ERROR_MESSAGE path
  uses the shared codes.

## 2026-08-10 · [P] Lot 39 Table UX polish (client-only after L39-01)

Designer plan (Approach 1) + Lot 39 tasks in `docs/backlog_ux.md`. **Not** V5 search-bot
sequencing — `docs/backlog_v5.md` Lots 32–38 stay reserved for search / belief / arena;
Lot 39 IDs avoid colliding with a hypothetical V5 “Lot 32”.

1. **Typed rejects (L39-01 / L39-02)** — see entry above. Client maps `code` to modal copy;
   timers strip loses the red reject line.
2. **Seat colors are client-side only (L39-03)** — palette of four CSS tokens keyed by
   `view.players` index. No protocol field, no server color assignment. Same index drives
   zone tint, `PlayerName`, pending/log segments, and the active-seat glow / turn banner
   (L39-05).
3. **Icon costs on interactive chrome only (L39-04)** — `CostDisplay` for shop / Use /
   special buy / rewards / Sentence expiry. Prose surfaces keep `formatCardCost` text.
4. **Threat FX fires on queue, not on resolve (L39-05)** — when a new real Incoming
   pending targets POV, flash outline + targeting cue. Red = attack cards + Sentence /
   Mirror / Super Mirror; orange = other. Presentation-only persistent Incoming chips do
   not trigger. First paint seeds seen ids without flashing. No `PROTOCOL_VERSION` bump
   after 27 for the rest of the lot.
5. **IllegalActionDialog survives state sync (L39-06 playtest)** — `stateUpdate` must not
   clear `actionReject`. Bot/peer sync was closing the modal mid-read; dismiss stays
   Esc / overlay / OK via `clearActionReject` only (plus leave / gameOver / drop).
   When `reject` is null, unmount the dialog entirely (do not leave `Dialog` mounted at
   `open={false}`) so AnimatePresence cannot leave a stuck blocking overlay.

## 2026-08-10 · [P] V5 reopenings (#V5-5, #V5-6, #V5-9, #V5-10) — L32-01

Designer confirmation unlocking Lot 32 (technical spec v5 §2.2, §13):

- **#V5-6** — Reopen `AGENTS.md` golden rule 7 / technical spec v4 §12: search, lookahead,
  and fitted learning are in scope for V5. Opponent modelling beyond V3 §4.4's derived
  reads is reopened **bounded**: inference from **public** fields and the **public** action
  log, within one game only. **Technical spec v3 decision 2 is NOT reopened** — the policy
  still receives no `GameState`; it constructs worlds from the view (and later
  `determinizeFromView`).
- **#V5-9** — `BotPolicy.decide` gains the public action log as a parameter (via
  `ctx.actionLog`). That grants nothing a human lacks (#V3-2). **Spy nuance:** when the
  acting seat has Spyed an opponent, Spy-revealed fields on that seat's per-recipient view
  may be used; without Spy, stick to public view fields + the public log. Still out: any
  hidden field not already on that seat's view, and the live authoritative `GameState`.
- **#V5-5** — Minimal reopen of #V3-5: weights become a typed, hash-identified data object
  whose frozen default is today's module constants (implementation in L33-01). Governance
  only here; no CLI/env/runtime reload. Module constants remain the default profile.
- **#V5-10** — The arena's regression gate (p < 0.01 vs incumbent) blocks a **default-policy
  change only**, not merges. Stochastic gates as merge blockers are unworkable for a solo
  developer.

`AGENTS.md` golden rule 7 and §9 rewritten in the same change so agents sequence from
`docs/backlog_v5.md` and no longer refuse search work.

## 2026-08-10 · [P] L32-05 forward-model bench numbers

Measured with `pnpm --filter @card-battle/server bench:forward-model` (pinned
`devEngines` Node via pnpm — never bare `node`). Fixture: 4-player mid-game state
(`l32-05-bench-midgame`) with populated pool and active persistents.

| Metric | Value |
|---|---|
| `structuredClone` | ≈ 29 µs/state · 6567 JSON bytes |
| `cloneGameState` (`structuredClone` wrapper) | ≈ 27 µs/state |
| `performAndCompleteTurn` + `SIM_NOW_MS` | ≈ 8.9×10⁴ turns/s (single-threaded) |
| Truncated playouts (depth 8) | ≈ 2.5×10³ playouts/s (single-threaded) |

Every V5 search budget must cite this entry / L32-05. Machine-local; re-run the
script when hardware or Node pin changes.


## 2026-08-12 · [P] Evaluator target is pure win probability (#V5-7) — L33-02

Designer ruling (session): accept technical spec v5 §13 recommendation.

- The Phase A / search evaluator returns a sole-survivor **win-probability** vector
  over living players (sums to ≈1). Not damage margin.
- `PolicyWeights.evaluator.survivalTermWeight` exists and defaults to **0**. The
  L33-03 optimizer may raise it; authors do not hard-code a survival bonus.
- Belief feature slots are reserved in `FEATURE_LAYOUT_VERSION` 1 and emit **0**
  until Lot 34; #V5-2 does not block Lot 33.


## 2026-08-12 · [T] L33-03 (1+λ)-ES fit run

Optimizer: `(1+λ)-ES` behind `Optimizer` (`optimize-weights.ts`). Fitness =
seat-rotated win rate vs frozen gauntlet `[heuristic-v4]` on the **training**
split only (never population-only).

Run (pinned Node via pnpm):

```bash
pnpm --filter @card-battle/server optimize:weights -- \
  --seed l33-03-fit --out ../../docs/simulation/2026-08-12-v5-fit \
  --gens 12 --lambda 6 --train 10 --holdout 10 --sigma 1.2
```

| Field | Value |
|---|---|
| Gauntlet | `heuristic-v4` |
| Split hash | `a2de1f615613fc16` |
| Elite fitness (train) | ≈ 0.789 |
| Elite weights hash | `7b0932b8996e5a9f` |
| Artifacts | `docs/simulation/2026-08-12-v5-fit/` |

Parallelism: in-process `Promise.all` over the λ+1 population (GameState created
inside each fitness eval). Search worker `SearchRequest` remains free of `GameState`.



## 2026-08-12 · [T] L33-04 holdout + L33-05 gate blocked

**L33-04.** Train/holdout split is written before gen 0. Canonical writeup:
`docs/simulation/2026-08-12-v5-fit/HOLDOUT.md` (v8 overfitting flagged; v5 large-N
probes appended).

**L33-05 blocked.** After (1+λ)-ES on action scalars + `survivalTermWeight`
(sparse mutation, train-internal valid gate, random-kit and mixed-kit splits,
grid search on life/strike/burn knobs), no checked-in profile beats
`heuristic-v4` at **p < 0.01** on a seat-rotated holdout of ≥ 2 000 games.

Largest probe (`l33-05-gate-xl`, 25 000 games, hash `4514e2bfd9f533f1`):
win rate **0.504** (9 613 / 9 452 / 5 935 stalls), one-sided p ≈ **0.12**.
Train-set fitness improvements reverse or vanish on holdout (v8 holdout 0.45
with overfitting flag).

Incumbent weights hash: `d585586e0c8f7711` (`heuristic-v4`). Candidate hashes
tried include `4514e2bfd9f533f1`, `5686e970ce462b79`, grid `30cca23f085f47f8`.

**Implication:** hand-tuned `heuristic-v4` is near-optimal under weight-only
search for this action scorer. Promotion of `heuristic-tuned-v5` waits on a
stronger signal (multi-day CEM/ES with far larger train, structural scoring
changes, or Lot 35 search) — not on lowering the gate. `DEFAULT_POLICY_ID`
stays `heuristic-v4`.


## 2026-08-12 · [T] L33-05 structural one-round re-rank still blocked

Designer chose keep-the-gate + structural edge (session). Implemented
`heuristic-tuned-v5` as default action weights + **one-round Phase A re-rank**:
`determinizeFromView` (Lot 34) → apply candidate → greedy opponent turns until
back to self → `evaluate` self win-prob; flip from greedy only when gain ≥
`FLIP_MARGIN` (0.025). Profile `tuned-v5-one-ply` (byte copy of `default`).
Gate harness: `simulation/gate-tuned-v5.ts` (by policy id). Artifacts:
`docs/simulation/2026-08-12-v5-tuned-gate/`.

| Seed | Games | Decided | Win rate | One-sided p | Notes |
|---|---|---|---|---|---|
| `l33-05-gate-probe-1ply` | 400 | 329 | 0.502 | ≈ 0.50 | Own-turn only, stub eval state |
| `l33-05-gate-1round` | 2 000 | 1 835 | 0.506 | ≈ 0.30 | One-round + evaluate |
| `l33-05-gate-probe-margin` | 800 | 720 | 0.482 | ≈ 0.84 | Life-margin objective (worse) |
| `l33-05-gate-probe-marginflip` | 600 | 546 | 0.524 | ≈ 0.14 | Lucky small-N |
| `l33-05-gate-marginflip` | 3 000 | 2 807 | **0.500** | ≈ 0.52 | Thresholded flips; coin flip |

Candidate hash (margin-flip): `e8740ef73aac43f6`. Incumbent: `d585586e0c8f7711`.

**Implication:** shallow lookahead against hand-tuned `heuristic-v4` does not clear
**p < 0.01**. Small-N probes overstate edge. Code stays registered for Lot 35 to
reuse (determinize + forward model), but **`DEFAULT_POLICY_ID` remains
`heuristic-v4`**. Unblock needs Lot 35 search depth (≥ 2 rounds), a designer
gate ruling, or a different structural change — not more 1-round probes.


## 2026-08-12 · [P] #V5-2 shop supply is unlimited (L34-01)

Designer ruling (session): **unlimited** shop, matching rules spec §1 and
`buy-card.ts` (mint by `cardId`, no stock check; pool is discard, not inventory).

**Ruling sentence:** An opponent's possible hand contents are not constrained by
what has already left the pool; the shop is infinite stock.

**Consequence for L34-04:** hand sampling uses kit-anchored accounting plus a
pluggable prior over card ids (v1 uniform over zone ids), not a constrained deal
from remaining copies. Pool / own-hand / publicly consumed instances still
constrain *specific visible copies*, never global supply.


## 2026-08-12 · [T] Assassin multi targets are view-stable (L34-05 / L34-06)

`listAssassinMultiAttackCandidates` ranked living opponents with
`rng.shuffle` seeded from `GameState.seed`. The seed is server-only and absent
from `PlayingStateView`, so `determinizeFromView` could not recover it and the
L34-05 consistency guard failed (~2.5% impossible worlds) whenever the capped
multi-attack set depended on shuffle order.

**Fix:** rank targets by stable `player.id` ascending. Still view-derivable
(alive ids only; no hidden lives). Comment in `assassin-candidates.ts` updated.
`heuristic-v4` freeze and §10.1 view-guard tests still pass.


## 2026-08-12 · [T] L34-06 belief calibration published

Harness: `pnpm --filter @card-battle/server bench:determinizer`.
Artifacts: `docs/simulation/2026-08-12-v5-belief/` (config, aggregates, WRITEUP).

| Metric | Value |
|---|---|
| Games | 40 (36 completed / 4 stalled) |
| K | 8 |
| Impossible rate | **0** |
| Kit top-1 (overall) | ≈ 0.80 |
| Kit top-3 | ≈ 0.88 |
| Life MAE (interval midpoint) | ≈ 3.66 |

Concludes nothing about balance. Lot 35 may start after #V5-1.


## 2026-08-13 · [P] #V5-1 ISMCTS chosen from L32-05 numbers (L35-01)

Designer ruling (session / Lot 35 plan): accept technical spec v5 §13 recommendation
**and** justify from the L32-05 bench, not preference.

| Evidence (L32-05 / 2026-08-10) | Value |
|---|---|
| Truncated playouts/s (depth 8) | ≈ 2.5×10³ |
| Turns/s (`performAndCompleteTurn` + `SIM_NOW_MS`) | ≈ 8.9×10⁴ |

At ~2.5k truncated playouts/s, a few hundred iterations per decision fit room-scale
latency, but sample efficiency still dominates. **ISMCTS with per-iteration
re-determinization** shares statistics across sampled worlds; N-tree PIMC would
spend that budget on independent trees. PIMC remains the fallback only if
information-set bookkeeping measures too expensive later — not the v1 choice.

Default offline iteration budget: `OFFLINE_SEARCH_ITERATIONS = 400`
(`bots/search/search-budget.ts`) ≈ 160 ms at the L32-05 rate. Wall-clock budgets
stay Lot 36. Depth floor remains two complete rounds (tech §6.4).

## 2026-08-13 · [P] #V5-8 same-policy opponent modelling (L35-03)

Designer ruling (session / Lot 35 plan): accept technical spec v5 §13 recommendation.

Search models every seat — including opponents and all sub-choice owners — as
playing the **same policy** under search (self-play / max^n). Modelling opponents
as weaker walks into punishes the bot "knew" were unlikely. Paranoid ("everyone
targets me") remains explicitly rejected (tech §6.2).

Accepted limitation (tech §11 #3): max^n assumes no coalitions; coordinated
humans in 3–4p can exploit this. Out of V5 scope.

## 2026-08-13 · [P] Offline search budget set to 64 (L35-04…07)

`OFFLINE_SEARCH_ITERATIONS` revised from the L35-01 placeholder **400** to **64**
in `bots/search/search-budget.ts`. Rationale: full ISMCTS (belief sample + PUCT +
heuristic rollout to depth floor) is far heavier than the L32-05 truncated-playout
bench; 400 iters made the L35-07 arena gate impractically slow without changing
sample-efficiency diagnosis. Room wall-clock budgets remain Lot 36. The L35-07
gate still uses this offline iteration budget — do not raise it to move a failing
p-value (backlog L35-07 watch point).

## 2026-08-13 · [T] L35-07 search-v5 gate blocked

`search-v5` is registered (ISMCTS, offline budget **64**, depth floor 2 rounds,
priors/rollouts from `heuristic-v4` while L33-05 is Blocked). Promotion gate vs
the Lot 33 champion (`heuristic-v4` / frozen gauntlet) **failed**.

| Field | Value |
|---|---|
| Seed | `l35-07-gate` |
| Requested games | 2 000 (seat-rotated) |
| Decided / stalls | 1 527 / 473 |
| Wins / losses | 722 / 805 |
| Win rate | **0.473** (Wilson 0.448–0.498) |
| One-sided p (H1: >0.5) | ≈ **0.98** |
| Candidate hash | `d3ab376c6a4ed37f` |
| Incumbent hash | `d585586e0c8f7711` |
| Offline iterations | 64 |
| Wall elapsed | 13 584 171 ms (~3.8 h, 8 worker threads) |
| Artifacts | `docs/simulation/2026-08-13-v5-search-gate/` |

Probe (`l35-07-gate-probe`, 200 games) was a coin flip (0.503 / p≈0.50); the
full gate shows a **loss** to `heuristic-v4`, not noise. Stall rate rose to
~24% under search (vs ~17% heuristic screens) — stalls stay unassigned.

**Implication:** do not raise the iteration budget to chase p < 0.01 (L35-07
watch). Upstream suspects per backlog: belief calibration (L34-06), evaluator
(L33-02), or effective depth. **`DEFAULT_POLICY_ID` remains `heuristic-v4`.**
`search-v5` stays registered for Lot 36 wiring experiments and diagnosis, not
as the room default.

## 2026-08-13 · [P] #V5-3 difficulty under search (L36-03)

**Ruling:** Softmax temperature for Normal; Easy keeps uniform substitution on
`heuristic-v4`; Hard is full search with no substitution.

| Tier | Composition |
|---|---|
| Hard | Full wall-clock search budget, no substitution |
| Normal | `floor(thinkMs/8)` + softmax over root visit scores (`NORMAL_SOFTMAX_TEMPERATURE = 1.5`) |
| Easy | Sync `heuristic-v4`, existing `DIFFICULTY_RANDOM_RATES.easy` uniform noise |

Wire values `easy` / `normal` / `hard` and `formatBotDifficulty` labels unchanged (#V3-4).
## 2026-08-13 · [P] #V5-4 Why panel under search (L36-04)

**Ruling:** No numbers. Public `botReason` may carry only coarse codes
`search-best` and `search-fallback`. Visit counts, win-probability estimates, and
other eval aggregates stay server-side on `SearchStats` / diagnostics and must
never reach `BotDecisionReason.params` (`assertPublicBotReason`).

`PROTOCOL_VERSION` 27 → **28** (sole V5 bump).

## 2026-08-13 · [T] L36-05 room decision latency (partial)

Measured with `pnpm --filter @card-battle/server bench:room-latency`
(4 concurrent “rooms”, 8 decisions each, wall-clock budgets, mid-game 4p fixture).

| Tier | budgetMs | n | p50 | p95 | p99 | max | ≤ thinkMs (900) |
|---|---|---|---|---|---|---|---|
| Normal | 106 | 32 | 106 | 106.1 | 106.1 | 106.1 | yes |
| Hard | 850 | 32 | 850 | 850.3 | 851.8 | 851.8 | yes |

Hard search budget is `thinkMs − 50` (`ROOM_SEARCH_BUDGET_MARGIN_MS`) so a
finishing ISMCTS iteration cannot push past the think envelope.

**Sign-off:** pending — developer must play one full game at Easy / Normal / Hard
against `search-v5` and record what looked sharp vs wrong (expect bluff naivety,
tech §6.6 / §11). L36-05 stays open until that note lands.

## 2026-08-13 · [T] L37-01/02 fitted evaluator pipeline

Belief-matched feature snapshots + seed-split assemble + pure-TS logistic fit
shipped. Artifacts under `docs/simulation/2026-08-13-v5-fitted/`.

| Field | Value |
|---|---|
| Snapshot rows | 13 319 (80×2 arena games, `heuristic-v4` self-play bootstrap) |
| Manifest hash | `c9de8adb143b51c5` |
| Model | `logistic-v5` hash `7226f3503a302a90` |
| Profile | `search-fitted-logistic` (not default) |
| Test log-loss / Brier | ≈ 0.709 / 0.258 |
| Inference parity | max abs error ~1e-16 |

**Capture:** `inferBelief(view, log)` then `extractFeatures(..., belief.summary)` —
no `GameState` into belief. **Default evaluator stays linear.**

**L37-04:** `gate:fitted-eval` script ready. Smoke (`l37-04-smoke`, 4 games) ran
end-to-end (`gate-smoke.json`); full ≥2 000-game gate + playtest still required
before promoting fitted inside `search-v5`. Do not flip `DEFAULT_POLICY_ID`
(L35-07). Bootstrap was heuristic self-play — refit on `search-v5` snapshots
before trusting the promotion gate.

**L37-03:** not built; wait for L37-04 logistic outcome.

## 2026-08-15 · [P] L38 screen measures room Hard `search-v5` (option A)

Designer ruling for Lot 38: the gross-imbalance screen measures **`search-v5` +
linear evaluator** at `OFFLINE_SEARCH_ITERATIONS` (**64**), no
`search-fitted-logistic` profile. That is the room **Hard** path
(`roomBotPolicyId`), not `DEFAULT_POLICY_ID` (still `heuristic-v4` after
failed L33-05 / L35-07 gates).

**L37-04 dependency waived** for this screen: fitted is not under measurement,
so the logistic gate need not pass before L38-01. L37-04 stays `To do`.

**L36-05 playtest sign-off waived** to start the screen: latency is already
recorded (2026-08-13); the missing human playtest note does not change the
offline iteration-budget instrument. L36-05 stays `In progress` until that
note lands. The screen still uses iteration budgets only (§8.2).

## 2026-08-18 · [P] Lot 40 engage Search; L38 paused; Lot 39 is UX

Designer playtest HWZMWI: `search-v5` (Normal/Hard) Spy-spammed, bought unused
upgrade points, and never attacked for ~280 turns. **No rule or value change.**

**Lot 39 is not this work.** `L39-01`…`L39-06` are table UX polish in
`docs/backlog_ux.md` (Done). V5 continue as **Lot 40**.

**L38 paused, not cancelled.** L38-01 is `Blocked` until Lot 40’s policy is what
we want to measure. Do not publish a V5 screen of current `search-v5`. Resume
L38 under the promoted engage policy, or keep it paused if L40-05 fails.

**L35-07 watch point stands:** do not raise `searchIterations`. Lot 40 retries
the **prior/rollout** (what L33-05 was supposed to give Search) then the same
gates.

**L35-03 vs pile-on-weak (do not hide).** L35-03 / max^n: Search must not attack
the weakened seat when two others are fighting. Designer strategy: hit a
finishable weakest for the elim/reward; agro whoever is attacking you. Lot 40
resolution: keep max^n; do not switch to paranoid; **keep the L35-03 test on
`search-v5`**. Engage heuristic piles on a seat you can **reasonably finish this
cycle** (already under fire, cannot retaliate, weaker than you on the
public/Spy read) or the seat **attacking you** — not a healthy mid-table
bystander.

**Spy:** L34-05 already required filling this seat’s Spy relations. Code sampled
Spy slices then set `visibility = []`, so `scoreActions` treated every opponent
as unspied. L40-01 reconstructs relations from `view.players[].spied` only
(#V4-35). Not a new Spy rule.

**Policies:** `heuristic-v4` stays frozen. New ids `heuristic-v5-engage` and
`search-v5-engage`. `roomBotPolicyId` stays `search-v5` until L40-05 pass +
playtest. `DEFAULT_POLICY_ID` stays `heuristic-v4`.

## 2026-08-18 · [T] L40-04 engage fitted logistic — honest fail

Self-play snapshots of `search-v5-engage` (80×2 mirrored, 64 iterations,
`--max-turns 200`) → seed-split assemble → `logistic-v5-engage`. Gate vs the
same search + **linear** evaluator at 64 iterations / 400-turn cap (L37-04
pattern). `FEATURE_LAYOUT_VERSION` unchanged. `logistic-v5` not overwritten.

| Field | Value |
|---|---|
| Snapshot rows | 6 064 (132 completed / 28 stalled) |
| Manifest hash | `e3e0b23432a75616` |
| Model | `logistic-v5-engage` hash `b0228a9ba3703da0` |
| Profile | `search-engage-fitted-logistic` |
| Test log-loss / Brier | ≈ 0.590 / 0.203 |
| Gate seed | `l40-04-gate` |
| Requested / decided / stalls | 2 000 / 1 815 / 185 |
| Fitted wins / linear wins | 882 / 933 |
| Win rate | **0.486** (Wilson 0.463–0.509) |
| One-sided p (H1: >0.5) | ≈ **0.89** |
| Candidate hash | `a09c0e3fd256e397` |
| Incumbent hash | `d3ab376c6a4ed37f` |
| Artifacts | `docs/simulation/2026-08-18-v5-engage-fitted/` |

**passed: false.** Fitted is slightly *worse* than linear, not a thin miss of
p < 0.01. **L37-03 GBDT not built** — trees would chase a losing leaf eval on
2p self-play. `search-v5-engage` keeps the linear evaluator.
`DEFAULT_POLICY_ID` stays `heuristic-v4`.

## 2026-08-18 · [T] L40-05 search-v5-engage vs heuristic-v4 — honest fail

L35-07 pattern: seat-rotated 2 000 games, offline 64 iterations, `--max-turns 400`
(stall bound; not an iteration bump). Champion still frozen `heuristic-v4`.

| Field | Value |
|---|---|
| Seed | `l40-05-gate` |
| Requested / decided / stalls | 2 000 / 1 828 / 172 |
| Wins / losses | 954 / 874 |
| Win rate | **0.522** (Wilson 0.499–0.545) |
| One-sided p (H1: >0.5) | ≈ **0.032** |
| Candidate hash | `e8f4d8770b9a280d` |
| Incumbent hash | `d585586e0c8f7711` |
| Elapsed | 216 516 ms (~3.6 min, 4 workers) |
| Artifacts | `docs/simulation/2026-08-18-v5-engage-gate/` |

**passed: false** — positive vs L35-07’s 0.473 / p ≈ 0.98, but not p < 0.01.
Do **not** raise `searchIterations`. **Rooms stay on `search-v5`.**
`DEFAULT_POLICY_ID` stays `heuristic-v4`. L38 stays paused.

**Playtest analog (not a room promotion):** 4p self-play mix (8 games × 8 iters,
max 200 turns): engage mean 72 turns vs `search-v5` 100; fewer `buyUpgradePoint`
(20 vs 54). HWZMWI baseline was ~280 Tax/Regen turns. n=2 at 64 iters is too
small to claim a 4p attack-rate win. Easy remains `heuristic-v4`.

**ISMCTS:** 4p mid-tree elim used to throw `owner … not in living seats`. Leaf
break when the acting owner is absent from the iteration’s living set — not a
rule change.

## 2026-08-18 · [P] L40-06 JAPMZR — attack sells are not a point farm

Designer playtest JAPMZR (4p, room `search-v5` / v4 prior). Bots sold Super to
fund Spy, sold Strong for 2 points, and dumped the last attacks down to zero.
That is illegal as a habit even when v4 `sellToFundBonus` likes it.

**Sell overlay (`farm-to-engage-v2`, view only):**

- Always keep ≥1 attack (`-Infinity` on the last attack), even to fund Sentence.
- Super / Mega: `-Infinity` unless the seat holds two+ copies of that card, or
  the sell yield is the last gap to play a **held** Sentence (15), Mega (16),
  or Card Absorber (4). Spy is not a reason.
- Basic / Strong: 1–2 points is not worth the card unless that same win-special
  gap.
- Selling is for a specific need or a truly useless card — not farming points.

**Rooms:** Normal/Hard `roomBotPolicyId` → `search-v5-engage` so the next local
game uses this prior. L40-05 arena still **failed** (p ≈ 0.032). This is a
playtest override, not a gate pass. `DEFAULT_POLICY_ID` stays `heuristic-v4`.
Do **not** raise `searchIterations`. L38 stays paused. `heuristic-v4` /
`score-play/` stay frozen.

## 2026-08-20 · [P] V6 opened — Lot 41 is the start (L41-01)

Designer opened `docs/backlog_v6.md`. Spec: `docs/technical_spec_v6.md` (2026-08-19,
Approach 1). **Classic rules and values stay frozen.** V5 may continue in parallel
(`docs/backlog_v5.md`). Coding starts at L41-01. One `PROTOCOL_VERSION` bump for all
of V6: **28 → 29**, in L41-02 only.

## 2026-08-20 · [P] V6 decisions locked 2026-08-19 (copied from technical spec v6 §2)

Copied so an agent reading only this file + `AGENTS.md` does not re-derive V6. Source:
technical spec v6 §2.

| # | Decision |
|---|---|
| 1 | Teaching is **three layers**: How to play + optional tutorial + first-real-game hints. |
| 2 | How to play is a **soft gate** on the first Play online / Play solo / Tutorial: the primer opens; **Skip** and **Got it** both continue. After that it is a button on the hub **and** the table. It does not auto-open on later visits. This **reopens** the 2026-08-07 “Home only, never gates start” ruling **for V6**. |
| 3 | How to play images are **designer-supplied screenshots**. Agents do not generate art. Existing resource / card icons may sit next to copy. Missing files → omit the `<img>`, never a placeholder drawing. |
| 4 | Tutorial is optional, replayable, Approach 1: same `GameRoom`, `tutorial: true` on create, one scripted bot, real engine. |
| 5 | Tutorial **must** show, at least: Draw (points, not a card), an **economy card (Tax)**, **upgrade**, **counter an incoming attack** (mutual equal Basics cancel — rules spec §6 / golden rule 1), **Spy**, **sell**, **buy**, **a special**, then **kill**. Spotlight early; after the first queued attack of the kill phase, attack + Draw stay legal until the opponent dies. |
| 6 | Tutorial opponent starts at **1 life**. That is safe because the counter lesson uses **equal** Basic vs Basic (both cancel). Upgrade and the killing attack come **after** that cancel. **Do not** upgrade Basic before the counter — unequal damage would leave a 3-damage pending and finish the 1-life seat too early. |
| 7 | Completing the tutorial does **not** dismiss first-real-game hints. The first Solo or Online Classic match still gets them. Skip-all remains. Tutorial itself uses coach copy, not the hint overlay. |
| 8 | Feedback is always on Home, Table, and Game over. Game over **asks** once per finished match (skippable). |
| 9 | A report is Bug / Confusion / Idea + message + optional contact. Server attaches game code, nickname, screen, protocol, `playKind`, and a public log tail when in a match. No seed on the client or in the report row. |
| 10 | Designer inbox is `/inbox` in the same SPA, env password, not linked from the player hub. Postgres table `feedback_reports`. |
| 11 | Table pass: **no “UP” letters** on chrome; upgrade points are the existing icon + number. **Every interactive cost or yield** is icon + number. Action-log **prose** may still say “points”. |
| 12 | **Every** table prompt uses a shop-style visual picker (card faces, seats with name + seat color). Mirror / Incoming-related choices show the **attacking card art** plus the source player’s name and color. |
| 13 | English only. Open URL. Visible **Beta** badge. No hub password. |
| 14 | Classic frozen. Tutorial-only exceptions are listed in technical spec v6 §5.3. Client disable is **not** validation (golden rule 8): the server filters tutorial-legal actions. |
| 15 | Architecture: **Approach 1** — one room, one protocol bump (28 → 29), HTTP feedback on the existing Express server, hints in `localStorage`. |

Inference flagged as such in spec §2 (not a separate designer vote, required by the locked beats):

- **Draw** is in the tutorial even though the “at least” list named economy cards rather than Draw. Playtest: strangers think Draw deals a card.
- **Human kit = Indestructible**, **opponent kit = Ghost**. Indestructible’s only special is Super Regeneration. Ghost is Spy-able (Untouchable is immune to Spy).
- **Tax is the economy card.** Buy / sell / upgrade are separate beats.
- **Counter = mutual attacks**, not Mirror and not Block. Equal Basic vs Basic on the retaliating (human) turn cancels both (golden rule 1).

## 2026-08-20 · [P] · [DISCREPANCY] V6 teaching overlay is room-owned, not on GameState

Technical spec v6 §5.3 says `GameState` / views gain `playKind`. Designer 2026-08-20 chose
**room-owned** `playKind` + `tutorialIndex` on `GameRoom`, copied onto playing and finished
views. Engine `GameState` stays Classic-only so deal, simulator, and search cannot see a
tutorial field. Persist reads the room overlay (`finished_games.is_tutorial`).

`FinishedStateView.tutorialIndex` is included (backlog L41-02). Spec §8’s protocol table
lists `tutorialIndex` only on `PlayingStateView`; finished also carries `playKind`. Nested
`finalTable` is a `PlayingStateView` and carries the same pair.

## 2026-08-20 · [DISCREPANCY] V6 migration 004 is tutorial-only, not combined with feedback

Technical spec v6 §7.2 names one `004_feedback_and_tutorial.sql` that also creates
`feedback_reports`. Backlog L41-04 is `004_finished_games_tutorial.sql` (`is_tutorial` only).
Feedback waits for L47-01 as `005_…`. Split chosen so Lot 41 does not create an unused
feedback table. Spec already allows the filename to increment.

## 2026-08-20 · [P] Lot 42 How to play rulings (designer session)

Locked for L42-01–04. Does not change Classic rules.

- **Tutorial button:** hide until L45-04. Do not show a disabled control or “Coming in
  Tutorial lot”. Modes copy in How to play still names tutorial (spec §5.1).
- **Soft gate moment:** first **hub** Play online / Play solo click (before nickname), not
  Create / Join / Start solo. Skip / Got it then continue into that path. Join stays on the
  online form after the gate. Tutorial uses the same helper when L45-04 adds the button.
- **Esc / overlay during a gate:** same as Skip — set `card-battle.v6.howToPlaySeen` and
  continue. Manual (non-gate) open: Skip / Got it set the key; Esc / overlay only close.
- **Skip and Got it** both appear on hub, table, and gate opens.
- **Primer copy:** spec §5.1 must-say only. No extra Mirror / bluff lines.
- **Idle hub:** do not show “Not connected”; leave idle unlabeled. Connecting / error /
  “Starting solo game…” unchanged.
- **Protocol version on the hub:** tiny footer, not a tooltip (touch has no hover).
- **Table How to play:** full `Button` on the economy bar; does not gate actions.
- **Screenshots** remain designer-owned; missing files omit `<img>`.

## 2026-08-21 · [P] L43-04 hand floor vs short dock height

`CARD_BAND_ABS_MIN_W` is **48**. A 48px-wide face needs ~88px of row height (`faceCardHeight`).
Designer 2026-08-21: paginate when **width** would shrink below 48; if **height** cannot fit
a 48px face, still shrink (no crop). Preferred min is also 48. Wide docks still show a
full hand without a pager. Phone playtest remains L48-02.

## 2026-08-21 · [P] L43-03 no cancel-why copy

`actionResolved.outcome` is `'applied' | 'immune' | 'cancelled' | 'blocked'` (L4-03).
There is no equal-cancel vs stronger-prevails discriminant on the wire. Designer
2026-08-21 / spec §12 #7: keep action-log copy **“is cancelled”**. Do not invent why-copy
and do not add a protocol field (V6 already used its only bump in L41-02). Coach copy at
tutorial index 3 still explains equal cancel when Lot 45 lands.

## 2026-08-21 · [P] L43-02 Shop option A + shared upgrade-point prices

Designer 2026-08-21: one **Shop** Dialog holds upgrade-point Buy/Sell, the shared-card
grid, and the pool. Buy/Sell show a points `CostDisplay` of the kit catalog cost/yield
(option A), not an upgrade-point glyph as the price. Helpers `upgradePointBuyCost` /
`upgradePointSellYield` live next to `UPGRADE_POINT_ECONOMY` in shared; server and client
call them at use time (never cache — Cloning mutates `kitId`). No `UP` letters on table
chrome; action-log prose may still say “upgrade point”. Intents unchanged.

## 2026-08-21 · [P] L43-05 corner chrome + confirm

Designer 2026-08-21: dock is **Draw + Shop** only (Stats when `readOnly`). **?** top-left
opens How to play (moved off the economy bar). **Flag** top-right is an inline SVG
`IconButton` (44px, no `Button` min-width): alive → Stay / Forfeit confirm; spectator →
Stay / Leave (“Leave the table?”). Esc / overlay = Stay. Flag hidden on the finished
`readOnly` board; Game over Return home unchanged. Lobby Leave still disconnects
immediately. Until L43-06, confirming Forfeit still calls `leaveGame()`.

## 2026-08-21 · [P] Finished inspect keeps Return home flag

Designer 2026-08-21 follow-up after Lot 43: hiding the flag on the `readOnly` board left no
way home once Game over was dismissed. Flag on finished inspect is **Return home**
(`leaveGame()`), not forfeit copy. Game over Return home unchanged. Draw CTA is **green**
(point icon failed on yellow). Sell CTA is **green** (life / point icons failed on orange).
Buy / Upgrade stay orange. Interactive `CostDisplay` prefixes **−** (pay) or **+** (receive).

## 2026-08-21 · [P] L43-06 FORFEIT keeps the socket

Designer 2026-08-21 overrides spec §6.3 “stay until Game over Return home” for 3p+
spectators: after FORFEIT they may `leaveGame()` whenever. 2p FORFEIT still finishes the
match (`finishIfSoleSurvivor` / `onGameOver`); `rejectReconnection` only kills reconnection
tokens, not live sockets, so the forfeiter sees Game over on the same client. Consented
`onLeave` while still alive stays the old disconnect+forfeit path (lobby, Return home,
old clients). Already-eliminated `onLeave` no-ops elim and drops the socket. No Feedback
UI in this lot (L47-03).

## 2026-08-23 · [P] Lobby kit pick, hidden from opponents (L49)

Designer 2026-08-23: before Classic start, each human may pick a kit in the lobby (and on
the solo form). Default remains **random** (previous rules spec §4 / §6). Duplicate kits
are allowed. Bots stay random. The pick is **private**: `LobbyStateView.yourKitSelection`
is built per recipient; `LobbySeatView` has no kit field. Changing the pick after
`startGame` is rejected.

This is a Classic UX addition, not a V6 lot. `PROTOCOL_VERSION` **29 → 30** is an
exception to the V6 single-bump lock (same class as 23 → 24). Client message `chooseKit`
`{ kitId: KitId | 'random' }`. All-random lobbies omit `forcedKitsBySeatId` so seeded
deals stay bit-for-bit with the previous path.

Tutorial (Lot 45) still forces kits after deal; do not wire this picker into the tutorial
create path when L45-04 lands.

## 2026-08-24 · [P] Classic rule freeze has an explicit-instruction exception (L50-01)

Designer 2026-08-24: V5/V6 still must not invent Classic rule or value changes. A confused
tester, a bot playing badly, or an inferred “improvement” is still not grounds. **Exception:**
when the current session’s developer instructions explicitly change a Classic rule or value,
that instruction wins. Record it here and update `docs/spec_bataille_des_cartes_en.md` in
the same change.

This supersedes the blanket “Classic rules and values stay frozen” line from 2026-08-20
for later lots; it does not reopen V1–V4 archives or Team/God/Quick.

Lot 50 uses the exception for Curse (spend-tick + siphon) and Card Transformer (cannot mint itself).

## 2026-08-24 · [P] Curse siphon replaces spend-tick (L50-02)

Designer 2026-08-24: Curse no longer drains 1 life per 3 (2 upgraded) points spent.
While cursed, every life the victim **actually loses** (after shield, any cause) is
granted to the **original caster** of that copy via `grantLives` / `lifeLimit`.
Upgrade: 1 lost → 2 gained. Each stacked copy pays independently. No siphon when the
Curse sits on its original caster, or if that caster is missing/eliminated. Transfer
on ≥1 attack life and end-at-1-life → pool stay. `originalCasterPlayerId` is
server-only (not on `PersistentEffectView`; search reconstruction therefore cannot
siphon). Caller-side `observeLifeLoss` — never inside the two loss primitives.

## 2026-08-24 · [P] Curse spend-tick and siphon both apply (L50-09)

Designer 2026-08-24 (correction of L50-02): Curse is **both** mechanics, not a
replacement. The cursed player still loses 1 life per 3 points spent on their turn
(per 2 upgraded; `pointsSpent` only; remainder discarded; floor at 1 life — #V4-20).
Those lost lives — and every other life they actually lose after the shield — are
granted to the original caster (`grantLives` / `lifeLimit`; upgraded 1 lost → 2
gained). Each copy ticks and pays independently. No siphon when the Curse sits on
its original caster, or if that caster is missing/eliminated. Transfer and
end-at-1-life stay.

## 2026-08-24 · [P] Card Transformer cannot mint itself (L50-08)

Designer 2026-08-24: the special obtained from Card Transformer — random or chosen —
is never `card-transformer`. Shop 20-point special purchase is unchanged.

## 2026-08-24 · [P] Regeneration quantity is four click-to-commit buttons (L44-06)

Designer 2026-08-24 overrides technical spec v6 §6.4 “numeric field”: Regeneration
opens four buttons (`1 life` … `4 lives`). Click sends `playCard` with that `quantity`
and closes. Footer is Cancel only. Live `CostDisplay` totals `structuredPlayCost` × n
as `{ kind: 'points', amount }` with `signed="cost"`. No client-side affordability —
`IllegalActionDialog` already surfaces server rejection. Server still validates 1–4
and payment. Other Lot 44 pickers stay select-then-Confirm.

## 2026-08-25 · [P] Lot 45 scripted tutorial (designer session)

Designer 2026-08-25 locks Lot 45. Classic rules and catalog values stay frozen. Tutorial-only
setup and script in this entry + technical spec v6 §5.3–§5.4 supersede the 2026-08-19 1-life
bot / Tax-upgraded / buy-Basic / 300_000 ms timer lines.

**Hub / room**

- Nickname-only Tutorial path, then `create({ tutorial: true })` + `startGame`. No kit picker.
- Client never `addBot`. Server auto-seats exactly one `tutorial-script-v6` bot on `startGame`
  (before `canStartGame`’s two-seat check). `ADD_BOT` in a tutorial room is rejected with
  existing `tutorial-room-closed` (no protocol bump).
- Ignore difficulty: bot-driver short-circuits Easy / search / noise for this policy.
- No server turn timer (`turnDeadlineMs = null`). Client idle **20s** retitles the coach **Play**.

**Skip / Game over / Excel / Why**

- Hide Forfeit. **Skip tutorial** on the flag and the coach: `leaveGame()` to hub, no Game over.
- Completing: title **Tutorial complete**; **Play a real game** → hub only.
- **Download action log** only when `import.meta.env.DEV` (every mode).
- Hide action-log **Why** in **all** games. Tutorial bot omits `botReason`. No `BOT_REASON_CODES`
  change, no protocol bump.

**Coach**

- Non-dismissible panel; table stays clickable; highlight the scripted control; Shop not
  auto-opened. Illegal clicks do not send. After Spy resolves (index 8), highlight the
  **opponent portrait**. Bot turns keep the last coach.

**Loadout / Tax override**

- Human Indestructible: 4 lives, 30 points, 1 upgrade point, Tax **base**, Spy, **one** Basic,
  two Shields, Super Regeneration. No Absorber at deal (they buy it). Buy a second upgrade
  point from the Shop (cost 10). Sell yields points.
- Bot Ghost: 4 lives, 16 points, Basic, Strong, Thief, Spy; specials none.
- Indestructible `alwaysUpgraded` still includes `tax`. After `acquireCardToHand`, force
  `isUpgraded = false` so both Tax plays are **+4 points**. Do not change the kit trait.
- Attack and action cards stay in hand (rules spec §5); the same Tax / Basic / Spy / Strong
  are reused. Only specials are one-use.

**Script**

- Human first. Indices **0–30** as technical spec v6 §5.4 (second base Tax after Super
  Regeneration + Thief; kill with Basic+; Absorber after 4→1; Spy counter at 10–11).
- Indices 0 and 1 are both human (Draw then Tax). After Draw, `advanceTurn` would seat the
  bot; the room snaps `currentTurnPlayerId` back to the human for Tax. Tutorial overlay
  only — Classic one-action-per-turn is unchanged. From index 1 the table alternates.
- `playKind` / `tutorialIndex` stay room-owned. Never call `applyTutorialSetup` from
  `run-game.ts`.

## 2026-08-25 · [P] Tutorial coach chat + animated callouts

Designer 2026-08-25 follow-up, after Lot 45. Supersedes the Lot 45 “non-dismissible panel in
the prompts band” coach chrome. Classic rules and catalog values stay frozen.

- **Coach** is a hovering dismissible chat (`z-[110]`, above Dialog `z-[100]`), not a prompts-band
  panel and not a focus-trapping Dialog. The table stays clickable around the bubble.
- Dismiss with Hide (×). A compact **Coach** pill in the same corner reopens it.
- Auto-open whenever title or body changes (next `tutorialIndex`, idle **Play**, illegal
  `tutorial-follow-coach` copy). Key is `index|title|body`; open iff dismissed key ≠ current.
- **Skip tutorial** stays on the flag and on the open chat (same leave-to-hub confirm).
- Scripted control uses a pulsing orange outline plus a pointing arrow **outside** the
  highlight square (`top` / `bottom`). `prefers-reduced-motion: reduce` keeps a static thick
  outline. Shop is still not auto-opened. Illegal clicks still do not send.

## 2026-08-25 · [P] Tutorial arrows outside the square; coach resource icons

Designer 2026-08-25 follow-up. Arrow sits **over** the highlight frame (not inset on the
control). Coach body still comes from `tutorialStepAt`; the client inlines table resource
icons (`CostDisplay` for quantified points/lives/upgrade points; PNG glyph for bare words
and shield). Copy strings are unchanged.

## 2026-08-25 · [P] Tutorial 2-life Shield walk; incoming red; coach chrome

Designer 2026-08-25 follow-up. Classic catalog values stay frozen. Tutorial overlay only.
Player-facing coach copy is full English — compressed chat style is never used for strings
players read.

**Script / loadout**

- Human starts at **2 lives** (`TUTORIAL_HUMAN_LIVES`) and **38 points**. Tax 2→1, then Shield vs Strong keeps
  **1 life** (and remaining shield) for Super Regeneration. Extra starting points cover Shield (7)
  at index 17 so Thief's 10-point steal still leaves enough to finish the walk.
- Index **17** is `play-shield` (not Draw). Indices stay 0–30; no inserted step.
- Index **19** coaches incoming **Thief** (steals points when it resolves) and tells the
  player to play Super Regeneration. Index 18 stays bot-only (`coach: null`).

**Incoming red**

- Tutorial Incoming chips whose `cardId` is an attack, `spy`, or `thief` get a red
  `TutorialCallout` (`tone: 'threat'`). Scripted controls stay orange. Felt **Waiting on
  others** is not a threat highlight.

**Coach chrome**

- **Skip tutorial** is flag-only. The chat has no Skip button.
- Reopen control is a compact **?** (`OPEN_COACH_ARIA_LABEL`), not a Coach pill.
- First mention of points, lives, Incoming, upgrade point, Spy, sell, Shop buy, Shield, and
  Thief uses a complete sentence.

**Shop**

- Upgrade-point callout uses in-flow top padding (`pt-12`) plus `scrollIntoView` so the
  arrow is not cropped by the Dialog scroller.

## 2026-08-26 · [P] Tutorial board tour, Look gate, translucent coach

Designer 2026-08-26 follow-up. Classic rules and catalog values stay frozen. No protocol bump.
`tutorialIndex` 0–30 is unchanged. Tour and Look are **client overlays**.

**Board tour**

- Before the first Draw (`tutorialIndex === 0`), present the board one region at a time:
  your zone, hand, specials, resources, Incoming, Shop, opponent, action log, timer, kit, flag.
- Each step highlights that region with the orange callout. The human clicks **Got it** on
  the coach. Got it does **not** increment `tutorialIndex`.
- Until the tour finishes, block Draw, card sends, and Shop open. Do **not** swap in
  `tutorial-follow-coach`. Flag and How to play stay available.
- Reconnect with `tutorialIndex !== 0` skips the tour.

**Look after Spy**

- Spy plays at index 7 and resolves after the bot acts at index 8 (golden rule 3).
- Index 8 has no Look coach on the script row (bot draw; keep last Spy copy).
- After index 8, a client gate requires clicking the opponent portrait to open the Spy
  reveal. Coach: they can now click to see opponent info. No Got it — the click is the action.
- The gate is **index 9 only**. Later indices (including 30 / Tutorial complete) must not
  replay Look. Sell at 9 stays blocked until that inspect. After one successful inspect,
  never block again.
- Hovering coach is hidden on a `readOnly` finished table.

**Coach chrome**

- Panel is slightly transparent (`color-mix` ~78% surface plus backdrop blur).
- Got it appears on tour steps only.

## 2026-08-26 · [P] Lot 51 first-time UI (designer session)

Designer 2026-08-26 playtest follow-up. Classic rules and catalog **values** stay frozen.
No protocol bump. Client presentation + `upgradeAdds` copy derived from existing
`effect` / `upgradeEffect` (not a new mechanic).

**How to play (spec §5.1 rewrite)**

- Primer is for a player who has never played: turns, lives, points, cards, kill,
  upgrade, kits, specials, shop. **No delayed resolution** and no other niche rules.
- Shop copy: buy cards or upgrade points; sell cards you do not need. No double-price
  formula, no “shared” card.
- Specials: **one use**, always (not “usually”).
- Draw: grants points equal to the kit Draw value. Do not write “(not a card)”.
- Upgrade: spend 1 upgrade point. Do not write “(the icon)”.
- Points: currency for almost every action.
- Screenshot slots reuse existing designer filenames only (`one-action`, `resources`,
  `hidden-kit`, `shop`). `delayed-resolution.png` and `table-overview.png` stay unused.

**Hub**

- Drop protocol version from Home and Lobby (no tooltip).
- Remove **Reset help**. `resetHelpStorage` remains a helper for tests / Lot 46.
- No Beta paragraph. A small **Beta** card, top-right, text **Beta** only.
- Drop the delayed-resolution hub pitch.

**Inspect**

- Always `CostDisplay` icons, never cost-as-text.
- Kit starting hand: action/attack versos + counts, not “N action · M attack”.
- Non-upgraded card: base effect + `upgradeAdds` delta. Upgraded card: full current
  `upgradeEffect` only.

**Table**

- Why stays hidden (L45-05). `botReason` remains on the wire and Excel export.
- Banners: **You are being attacked** once per new attack-tone Incoming (flashier);
  **You are dead** on POV elim (flashier); **You won!** (no space) on POV win.
- Waiting-to-resolve chips: tutorial callout chrome **without arrow**. Red = attack
  tone (`threatToneFor`); orange = other real pending. Incoming and Waiting on others.
  Presentation persistents unringed.
- Spy seat: live numbers when upgraded Spy or death reveal; unspied and base Spy show
  the same icons with `?`. Remove Spied — tap / Hidden kit / Revealed — tap. Spy dialog
  title is the nickname only.
- Opponent resource flyouts from the seat to the action-log center, public log amounts
  only when numbers are hidden. Skip Draw when kit Draw is unknown. Include every token
  kind (life, point, upgrade point, shield).

## 2026-08-26 · [P] First-game hints omit leave (L46-01)

Designer 2026-08-26: first-Classic hints are a single contextual coach card on a live
Classic table. **Leave / Forfeit is not a hint** — the flag already explains forfeit.
`HintId` is `your-turn` · `draw` · `resources` · `incoming` · `hidden-kit` · `shop`.
Tutorial (`playKind === 'tutorial'`) keeps `TutorialCoach`; it never mounts these ids.
Storage stays `card-battle.v6.hints` `{ dismissed, skipAll }`. Corrupt JSON is empty.
Got it / Skip all write the blob; Hide is session-only. Completing the tutorial still
does not set `skipAll` (L46-03). Best-action selector lands in L46-02.

## 2026-08-26 · [P] First-game hint selector and auto-Got-it (L46-02)

Designer 2026-08-26. Client has zero rule logic: the selector only ranks teaching topics
from view facts.

**On your turn:** real Incoming to POV → `your-turn` → `draw` → `shop` → `resources` →
`hidden-kit` (unspied living opponent). **Off your turn:** Incoming → hidden-kit, else none.

**Auto-Got-it:** playing intent dismisses `your-turn` (and `incoming` if that Incoming is
still on you); Draw also dismisses `draw`; opening Shop dismisses `shop`; opponent portrait
dismisses `hidden-kit`; Incoming leaving the view dismisses `incoming`; `resources` is
manual Got it only. Card is placed next to `data-hint-anchor`. No callout rings.

## 2026-08-26 · [P] Tutorial completion does not skip hints (L46-03)

`startTutorialGame`, Skip tutorial (`onLeave` / not forfeit), and Game over **Play a
real game** (`onLeave`) never write `card-battle.v6.hints`. Completing or skipping the
tutorial leaves the blob untouched, so the next Classic Solo/Online still selects from
an empty `{ dismissed: [], skipAll: false }`. Hub **Reset help** remains the only
clear path (L42-02). HintOverlay **Skip all** is the only `skipAllHints()` call site.

## 2026-08-27 · [P] First-game hint chrome, attacks-only Incoming, sticky Got it

Designer 2026-08-27. The first-game card was too large. Hints use `CoachPanel` `compact`:
narrower, smaller type, more transparent (`color-mix` ~46%). Tutorial coach is unchanged.

The `incoming` hint copy is Shield / Mirror / attack-back, so it fires only on **attack**
Incoming (`isAttackCardId`). Spy and Thief still appear on the Incoming strip and still
drive threat FX; they must not swap the teaching card. That swap also made **Hidden kit**
look like it returned after Got it (selector jumped to Incoming, Got it dismissed Incoming,
then Hidden kit was still undismissed).

Got it and × both persist that `HintId`. Dismissals merge onto the previous React blob
(`applyHintPatch`) so a later write cannot drop an id. Skip all now uses that helper
from the overlay (no separate `skipAllHints()` call site on the table).

## 2026-08-28 · [P] Lot 51 flyout correction (L51-13)

Designer follow-up on the L51-11 card/token pass. Client presentation only.

- **Card ghosts only when a card enters or leaves a deck** (buy / sell / buy special).
  Destination is the felt pending center, not the action log. Playing a card does not
  fly art. Ghost size ~48×72; fade during the second half of a ~0.42s trip.
- **Resource chips on every action**, including Regeneration+. Public log has no
  quantity; use live Δ when the actor's numbers are on the view, otherwise the
  catalog per-life unit (rate points + 1 life). That unit is not a claimed total.
- **Thief** (and Spy Thief / Upgrade Point Thief): live Δ still flies victim→thief.
  When both seats are `?`, one directional chip shows the transfer without inventing
  the stolen total.
- Draw totals stay skipped when kit Draw is hidden.

## 2026-08-28 · [P] First-game hints: thief, hand, specials, reward

Designer 2026-08-28. Extra first-Classic cards, still client-only, still not a legal-action
recommender, still never shown when `playKind === 'tutorial'`.

- **`incoming`** copy now says there is an incoming **attack** and they should **do
  something** (attack back, Shield, or Mirror). Still `isAttackCardId` only.
- **`incoming-thief`** is a separate id. Fires on action `thief` and specials whose id
  ends with `-thief` (`upgrade-point-thief`, `spy-thief`, `card-thief`, `attack-thief`).
  Spy is not a Thief. Reuses the Incoming strip `data-hint-anchor`. Attack outranks thief
  when both are pending.
- **`hand`** and **`specials`** fire the first time the dock is shown, after `your-turn`
  and `draw` (same start-of-game window as Draw). Hand: use / upgrade / sell for points.
  Specials: usually one-use; using one is the turn's action.
- **`reward`** fires the first time POV has an `elimination-reward` sub-choice. The hint
  overlay stays up over that Dialog (other Dialogs still hide hints). 2p game-ending
  elims skip rewards, so this needs 3+ living seats.

**Auto-Got-it:** inspect hand → `hand`; inspect special → `specials`; confirm rewards →
`reward`; playing intent / Draw also dismiss `incoming-thief` while a Thief still
targets you; Thief Incoming leaving the view dismisses `incoming-thief`.

Selector: `reward` → `incoming` → `incoming-thief` → (on turn) `your-turn` → `draw` →
`hand` → `specials` → `shop` → `resources` → `hidden-kit`. Off turn after threats:
`hidden-kit`.

## 2026-08-29 · [P] Token chips are icon-only (L51-14)

Designer: resource flyouts (points, lives, etc.) must not sit in a white square.

- Overlay card chrome is **`asCard === true` only**. Buy/sell ghosts pass that flag.
- L51-13 used `from.width >= 40` after shrinking card ghosts to 48×72. Log-origin
  resource chips are already 40×40, so every token picked up the raised-surface
  tile. Width must not classify chips as cards.
- Playbooks (`frontend.md`, `testing.md`) record the invariant in the same change.

## 2026-08-29 · [P] Every resource flow is two-way (L51-15)

Designer: spend+gain on the same tick (Absorber: pay 3, absorb 10) must show
both legs; opponent attack life loss must fly.

- Catalog chips are the known spend/yield. `leftoverLiveFlowChips` flies live Δ
  that the catalog net does not explain — never the collapsed net alone.
- `actionResolved` `livesLost` / `shieldAbsorbed` fly from every target (POV,
  unspied, live Spy). Live-icon seats are not skipped.
- Unspied Draw / absorb totals stay uninvented. Card play still does not fly
  art (L51-13); buy/sell ghosts stay.

## 2026-08-29 · [P] Make every resource/card flow readable (L51-16)

Designer: two-way ticks still looked like spend-only; opponent life loss on
`?` seats had no flash; every resource and card transfer must animate.

- Token chips start opaque and hold until ~88% of travel so the gain leg is
  still visible when it reaches the dock. Seat and log chips are both 40px.
- Skip `ResourceIcon` net-fly only after overlay chips land. Public chip
  amounts emit a signed flash (`emitResourceFlowFlash`) so unspied `?` seats
  show `livesLost` / spend without printing hidden totals. Two-way ticks can
  show −N and +M together.
- Play-card ghosts (hand/seat → felt pending center, ~48×72, `asCard`) restore
  the card transfer L51-13 removed as an oversized log flyout. Buy/sell ghosts
  stay. Do not invent unspied Draw/absorb totals.

## 2026-08-29 · [P] Hand / Specials hints sit beside the card cluster

Designer 2026-08-29: the new card-row hints were not next to the cards. Anchoring
`data-hint-anchor` on the flex-1 Hand / Specials section made `placeHintCard` treat
the whole dock column as the box — below covered the other row; side placement
clamped to the felt's left edge.

Fix: the anchor is an `inline-flex` wrap around the visible cards (or the Empty / None
caption). Hand / Specials use `prefer: 'beside'` (top-aligned, left of the cluster when
that fits). Draw / Shop / Incoming stay `below` on their small chrome.

## 2026-08-29 · [P] First-game hint copy rewrite (main)

Designer 2026-08-29 (`394b3b5`) replaced the short §5.2 one-liners with longer table copy
in `hint-copy.ts` (Draw no longer says “not a card”; Shop no longer quotes double price).
Merging that main into Lot 51 made the old copy test fail. Spec §5.2 and `hint-copy.test.ts`
now lock the shipped bodies. Selectors, auto-Got-it, and `HintId`s are unchanged.

## 2026-08-29 · [P] Classic occupancy is 2–6 (supersedes #V4-30)

Designer instruction (this session): Classic rooms seat **2 to 6** players, not 2 to 4.
Not God/Team/Quick. No card value, delay, or mutual-attack change. Lot 51 on main is
Beta UI, so this occupancy work is **Lot 52 / L52-01**.

Single source: `packages/shared/src/domain/player-count.ts` (`MIN_PLAYERS` / `MAX_PLAYERS`).
Lobby occupancy, `game-room.maxClients`, solo opponent picker, seat palette, batch
`--players`, and `createInitialState` all read that constant. `FEATURE_LAYOUT_VERSION`
stays **1** (dim 46); `livingOpponentCountNorm` now divides by 5. Belief width features
remain three opponent-offset slots — a 6-player table does not add fitted dimensions.

Rules spec §1 Number of Players updated in the same change. How to play primer Goal
copy matches (2 to 6).

## 2026-08-31 · [P] Table crowding — cards first, collapse chrome (Lot 53)

Designer session: crowded tables (especially **mobile**, including 6-player) were
unplayable because faces shrank to a line. This **supersedes** the 2026-08-21 L43-04
ruling that a short dock may shrink below 48px to avoid cropping, and it supersedes
L52-01 wrapping the opponent arc onto extra rows.

Layout contract (client presentation only — no rule or value change):

- **Cards never shrink below 64px width.** 2/3 art plus the name line. Overflow **wraps
  then scrolls vertically**. No hand/specials pager arrows.
- Hand and Specials are **not** a 50/50 split. Specials size to content (cap ~half the
  card area, then scroll). Empty Specials / empty Incoming / empty Waiting do not take
  flex space.
- **Opponents stay one horizontal row** (`flex-nowrap` + overflow-x). Never wrap to a
  second line. 5 foes on a phone scroll sideways.
- When the felt still cannot fit one 64px hand row after that, chrome collapses into a
  button that opens a Dialog, in this order: **1. Incoming** (dock Incoming + felt
  Waiting on others), **2. Action log**, **3. Opponents**. Cards, Draw, and Shop stay
  on the table.
- Mobile is the primary viewport. Desktop may grow faces up to a higher max (96px).
- Dialog `panelClassName` width overrides must actually apply (`max-w-3xl` for Shop /
  kit picker / sub-choices). The previous `max-w-md` + override pair resolved to 448px.

## 2026-08-31 · [P] Table crowding playtest — horizontal cards, uncropped dialogs (L53-07)

Designer follow-up on Lot 53 recordings (`l53-mobile-6p-collapse.mp4`, portrait
390×844, landscape 844×390). The 64px wrap-then-vertical-scroll contract **cropped**
faces (name line off-screen until you scrolled down), sized Specials independently so
one Cloning face dwarfed the hand, and landscape Dialogs / collapse buttons sat partly
off-screen (`items-end` + `max-h: 90dvh` + `p-4` on a 390px-tall viewport). Collapse
existed but failed its purpose.

This **supersedes** the wrap + vertical-scroll + hard 64px floor in the Lot 53 entry
above. Still client presentation only — no rule or value change.

- **One shared face width** for Hand and Specials. Specials never measure or grow on
  their own.
- **One row per section**, `flex-nowrap`, **horizontal** overflow. No wrap, no vertical
  card scroll, no pager.
- Size from **row height** so art + name stay fully visible. Preferred min ~40px when
  height allows; **shrink below that rather than crop**. Grow toward ~88px when the
  row is tall and wide. Extra cards scroll sideways at that width — do not wrap, do not
  pack by shrinking.
- Felt chrome still collapses Incoming → log → opponents. On **short viewports**
  (innerHeight ≤ 500px, including 844×390) collapse all three so the left column is
  buttons that actually fit. Landscape left column has a **nonzero min width**.
- Dialog overlay is sized to `visualViewport` (not `fixed inset-0` / `100dvh` —
  DevTools device mode can report desktop `dvh` while the game frame is 390px)
  and `items-start`. Panel `max-height` is **100% of that overlay**. `my-auto`
  centers a short panel. Width is `min(preferred, 100%)` of
  the overlay so 448px `max-w-md` cannot beat a 390px phone. Body scrolls inside;
  footer wraps. On viewports ≤ 500px tall, panel padding is 0.5rem (sm width
  must not restore p-5).
- Collapse Dialogs keep opponent seats on **one nowrap row** (overflow-x). Seat
  headers do not wrap — a two-line BOT badge was cropping the resource column.
- Landscape collapsed log / opponents **hug** the button. They do not take the
  leftover 1fr (that painted a tall empty white slab). Left column is ~10.5rem
  so the dock keeps the card band.

## 2026-09-01 · [P] Dock Incoming crop + left-aligned cards (L53-07)

Designer follow-up on the live table: Incoming chips were a sliver on every
viewport, and Hand / Specials sat flush left with empty dock to the right.

- Incoming on the identity row used `max-h-9` (36px) plus a stacked title-above-
  chips compact strip. Tutorial callout chrome on real pending (L51-07) is
  taller than 36px, so the chip was always clipped. Incoming is now its own
  full-width row; compact title and chips share one line; no 36px cap.
- Card rows used `justify-start` on a full-width flex. Pack to `w-max` and
  center with `mx-auto`. Do not `justify-center` an overflowing row (clips both
  sides). `[data-card-row]` only locks nowrap; overflow stays on the outer wrap.

Still client presentation only — no rule or value change.

## 2026-09-01 · [P] Desktop felt: stop starving opponents and the log (L53-07)

Designer: on desktop the dock was a huge empty pink field while opponents and
the action log sat in a ~10.5rem strip (one seat clipped, log unreadably
narrow). That 10.5rem cap is for **phone landscape** (844×390) so the hand
still fits — it must not apply to tall landscape.

- Short landscape keeps `minmax(8.5rem, 10.5rem)`.
- Tall landscape (`min-height: 560px`) uses `minmax(16rem, 38%)` /
  `minmax(22rem, 1fr)` so chrome uses leftover width; the dock still has
  room for 88px faces.
- Table shell is `w-full` / `h-[100dvh]`; `html, body, #root` are 100% wide
  (no `w-screen` / `100vw` pillarbox).

Still client presentation only — no rule or value change.

## 2026-09-01 · [P] Collapse opponents before the action log (L53-07)

Designer: when chrome must leave the felt, **opponents collapse into a Dialog
before the action log**. Incoming still goes first. New order: Incoming
(including Waiting on others) → opponents → action log. Short viewports
(innerHeight ≤ 500px) still collapse all three.

Collapsed chrome must still play table FX. Token chips, card ghosts, targeting
pulses, resolution flashes, and elimination beats aim at the remaining button
(`opponents-collapsed` / `log-collapsed` / `incoming-collapsed`) when the seat,
log panel, or Incoming strip is unmounted. Do not skip the animation because
the expanded region is gone.

This supersedes the Incoming → log → opponents order in the 2026-08-31 Lot 53
and L53-07 entries above. Still client presentation only — no rule or value
change.

## 2026-09-01 · [P] Table always fills the visible screen (L53-07)

Designer: on some sizes the table sat as a small box in the top-left with
empty surface around it. `100dvh` / `min-height: 100%` can be a stale or
outer-window size (Chrome DevTools device mode, resize, mobile chrome).
The table must fill **the rectangle the player sees** at every size.

- `#root` is `position: fixed` to `--vv-*` pixels from `visualViewport`
  (fallback `innerWidth` / `innerHeight`), updated on resize / orientation.
- Table shell is `h-full` of that root — never `100dvh`.
- Home / lobby fill the same root (`h-full`); lobby scrolls inside it.
- FX overlay uses the same `--vv-*` box as dialogs.

Still client presentation only — no rule or value change.

## 2026-09-01 · [P] Full-bleed is a 100% chain (L53-07)

Playtest: pinning `#root` to pixel `visualViewport` **froze the first size**
(390×844 stayed after the window grew to 1100×800). `html`, `body`, and
`#root` are `width` / `height: 100%` with `overflow: hidden`. The table is
`h-full` of that root. No `100dvh`. Dialogs still measure live
`visualViewport` so they do not paint outside the visible frame.

This supersedes the pixel `--vv-*` lock in the entry above. Still client
presentation only — no rule or value change.

## 2026-09-01 · [P] Home menu scrolls; landscape log keeps leftover (L53-07)

Designer: the hub/menu could not scroll after the full-bleed `overflow: hidden`
lock on `html` / `body` / `#root`. Home (and lobby) must scroll **inside**
`#root`; the table shell stays non-scrolling.

Designer: on landscape the action log collapsed into a bottom button while
opponents were already a top button, leaving an empty slate in the left
column. Short viewports (`innerHeight` ≤ 500px) collapse **Incoming and
opponents only**. The log stays on the felt unless leftover chrome still
overflows. Landscape `used()` does not add dock min-height — the dock is
beside chrome, so collapsing the left column cannot free hand height.
Expanded log keeps `minmax(0, 1fr)`; collapsed log hugs the button.

This supersedes “collapse all three on innerHeight ≤ 500” in the Lot 53
and L53-07 entries above. Still client presentation only — no rule or
value change.

## 2026-09-01 · [P] Smaller faces; Incoming beside kit (L53-07)

Designer: live-table faces still filled the dock (the 40/88 pair was the
cap, not a crowded min). Incoming sat on its own full-width row of
horizontal chips under the kit.

- Face width floor **22px**, cap **48px**. Still one shared width, one
  horizontal row per section, shrink below the floor rather than crop.
- Incoming is **on the identity row beside the kit**. Multiple chips
  **stack** and scroll vertically (`max-h-14`). Felt Waiting stays a
  horizontal strip. Incoming no longer adds dock height, so collapse
  does not hide it to free empty space.

This supersedes the full-width Incoming row and the 40/88 face pair in
the L53-07 entries above. Still client presentation only — no rule or
value change.

## 2026-09-01 · [P] Spy play cost 4 → 2 (L54-01)

Designer session instruction. Spy usage cost is **2 points**; shop buy remains
double (**4**); sell yield is 2. Visibility, counter, Scientific `alwaysUpgraded`,
and upgraded resource reveal are unchanged.

`heuristic-v4.freeze.json` traces were refreshed: cheaper Spy changes what the
**same** policy can afford in the 12-step yardstick. `weightsHash` is unchanged.

## 2026-09-01 · [P] Mutual attacks — weaker answers survive; assassin volley (L54-02)

Supersedes Lot 19 only for the *weaker answer* case. On the retaliator's turn:

- Equal volley damage cancels both volleys.
- Stronger answer still cancels the weaker incoming volley; the answer stays pending.
- Weaker answer is **not** cancelled. Incoming still resolves; the weaker attack
  stays queued for the opponent's turn.

Assassin `playMultipleAttacks` hits that share `sourcePlayerId`, `targetPlayerId`,
and `queuedAt` are **one volley** (sum of final damage) for this compare only.
Hits still resolve one-by-one. Mirror / Super Mirror still redirect a **single**
pending effect (`chooseMirrorTarget`). Grouping uses `queuedAt` (no protocol bump);
`duplicatePendingEffect` keeps `queuedAt` but a redirected copy has a new target
so it does not join the original volley.

## 2026-09-01 · [P] Engage overlay — Mirror vs big hits; hostile-only burn (L54-03)

Room Normal/Hard (`search-v5-engage` / `heuristic-v5-engage`) only. Overlay id
`farm-to-engage-v3`. Do not edit `score-play/` or `heuristic-v4`. Easy stays v4.

- Mirror: if incoming volley damage exceeds every held attack, score
  `survive + 55 + incoming` so Mirror beats a useless weaker riposte but still
  loses to an equal-cancel Basic.
- `playMultipleAttacks`: sum aimed at a source vs that source's incoming volley;
  equal-or-greater gets the Survive mutual-cancel band.
- Burn: Imposition / Poison stay Deny. Points Generator is not
  burned unless it funds a threat (known points ≥ 10, last opponent, or that
  seat is already attacking / finishable). Super Absorber was on this Deny
  list until L54-04.

## 2026-09-01 · [P] Super Absorber is selfish, not hostile (L54-04)

Designer follow-up: Super Absorber does not pose a direct threat. Overlay
`farm-to-engage-v4` treats it like Points Generator — skip the burn unless
the seat funds a threat (1v1, already attacking / finishable, or known
points ≥ 10). Imposition and Poison stay Deny. Easy stays v4.

## 2026-09-01 · [P] Lot 47 feedback schema and session rulings (L47-01)

Designer session for Lot 47. HTTP + Postgres only. Does not change Classic
values (Lot 54 Spy cost / weaker-answer mutual landed on main in parallel).

**Schema:** `005_feedback_reports.sql` creates `feedback_reports` as technical spec
v6 §7.2 (CHECK on `kind` ∈ `bug` / `confusion` / `idea`). No seed column. Split
from 004 is the 2026-08-20 discrepancy (tutorial `is_tutorial` already shipped).
`screen` and `play_kind` stay TypeScript unions, not SQL CHECKs, so they can grow
without a migration.

**Unset `DATABASE_URL` (POST /api/feedback):** never HTTP 200. Always **503**.
Local copy: “Not saved (no database)”. Production, and any real insert failure:
“Could not save — try again”. Finished-game persist stays a silent skip.

**Enrichment:** if `gameCode` matches a live `GameRoom`, overwrite room-level
fields only (`gameCode`, `playKind`, `protocolVersion`, last 30 public
`actionLog` entries) via a seed-free in-process registry — not Colyseus
`matchMaker`. Else `SELECT room_id, is_tutorial, action_log FROM finished_games
WHERE room_id = $1 ORDER BY ended_at DESC LIMIT 1` — never `seed`. Nickname and
`screen` always come from the client (no accounts; HTTP has no seat identity).
Home with no code stays client-allowlisted.

**Game over ask:** `localStorage['card-battle.v6.feedbackAsked.' + gameCode] =
'1'` after Skip or a successful submit (tutorial included). Failed submit does
not mark asked. Manual Feedback stays. Do not stack Dialogs: on first close of
Game over stats, open Feedback in ask-mode.

**Chrome:** Home **Feedback** next to How to play; Lobby next to Leave; table
turn-strip `IconButton` `!` (aria-label Feedback). Dock stays Draw + Shop
(L43-05 / Lot 53). Incoming stays beside the kit (L53-07). `screen`: `home` /
`lobby` / `table` / `tutorial` (live tutorial) / `end`.

**Inbox:** `/inbox` password field; `sessionStorage` after success; one GET
returns all rows newest first; kind filter is client-side. Missing
`INBOX_PASSWORD` → API 404. Wrong password → 401. No hub link.

## 2026-09-01 · [P] GET /api/inbox auth details (L47-04)

`X-Inbox-Password` is compared with padded `crypto.timingSafeEqual` so a
length mismatch still runs the compare. Missing/empty `INBOX_PASSWORD`
returns **404** with an empty body (do not advertise the route). Wrong or
missing header returns **401**. After auth, an unset `DATABASE_URL` or
query failure returns **503** `{ ok: false }` — never an empty 200 list.

## 2026-09-01 · [P] Inbox CORS preflight (L47-05)

Colyseus answers every `OPTIONS` before Express, with
`DEFAULT_CORS_HEADERS` that omit `X-Inbox-Password`. Vite `:5173` → `:2567`
inbox GET therefore failed the preflight and the SPA showed “Could not load”
for both wrong and correct passwords. Patch
`matchMaker.controller.DEFAULT_CORS_HEADERS` at boot so the header is allowed.
POST `/api/feedback` was already fine (`Content-Type` is in the default list).

## 2026-09-02 · [P] Game over Feedback is one Dialog (L47-03)

The finished table used to keep its own Feedback Dialog while `EndScreen` also
opened ask-mode after stats. Banner-period `!` plus Game over Esc stacked two
forms and dropped in-progress text. `EndScreen` now owns the only finished
Feedback Dialog: delay auto-stats while it is open; `!` no-ops over stats or an
open form; Skip or a successful send (including early `!`) marks asked so stats
close does not prompt again. Live table chrome is unchanged.



