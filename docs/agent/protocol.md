# docs/agent/protocol.md — Client/server protocol and visibility

> Read before touching Colyseus rooms, events, state views, or anything Spy can reveal.
> Transverse rules → `/AGENTS.md`. Engine → `engine.md`.
>
> Sources: technical spec §3, §5 (whole section), §6.2 rulings #7 and #11, §7 ·
> rules spec §6 (Visibility).
>
> **Status:** lobby + playing + finished per-recipient views exist (L1-01…L1-13) in
> `apps/server/src/rooms/game-room.ts`, `apps/server/src/protocol/build-view-for.ts` and
> `apps/client/src/net/`. Spy visibility matrix lives in
> `apps/server/src/protocol/visibility-matrix.ts` (L3-05).
> Fetch current Colyseus APIs via Context7 before coding; do not write them from memory —
> 0.17 renamed the client package and changed the server bootstrap.

## Golden rules

`/AGENTS.md` golden rules 4 and 8 govern this domain — per-recipient views, and full server-side
revalidation. Stated there, not repeated here. What follows is what they do not say.

1. **`actionPlayed` and `actionResolved` are two distinct events.** An action is public the
   instant it is played; its resolution comes later, on the target's turn. Conflating them
   destroys the visibility model.
2. **Spy is a persistent asymmetric right, not a boolean.** A `who-sees-what-of-whom` matrix in
   its own module, consulted on every view construction. Store it as a relation, never as a flag
   on the spied player — two players can spy the same target independently.
3. **Timer deadlines are computed and sent by the server.** A client-side countdown drifts and
   can be bypassed.
4. **Adding a field to `Player` or `GameState` is not done until the view builder classifies
   it.** Public, private, Spy-gated, or server-only — decided in the same change, never
   defaulted.

## Visibility model

Technical spec §5.1, ruling §6.2 #7, rules spec §6.

| Category | Visibility |
|---|---|
| Kit, hand contents, exact resource values, **hand card count** | **Private.** Revealed only by Spy or Spy Thief |
| Lives, shield, points, upgrade points | **Private** without Spy. Base Spy: frozen `resourcesSnapshot` at resolve. Upgraded Spy: live values (rules §3) |
| Every action played, **including card identity** | **Public** — purchases, sales, upgrades and draws included |
| Queue of pending effects | **Public** |
| Elimination status | **Public** |
| `GameState.seed` | **Server-only.** Reaches no client, spied or not |

The fourth category is not in technical spec §5.1: it exists because the seed is not private
data about a player but the game's entire future. A client holding it predicts Sentence's
victim, the special card purchase and Mirror's default target. Any field added later whose
disclosure would let a client compute a future draw belongs in the same category.

Consequence worth knowing: with fully public actions, a hand can be partly reconstructed by
deduction, which costs Spy some value. That is accepted, not a bug.

Cloning **resets visibility to zero in both directions** — what the user saw of others and what
others saw of them — and cancels effects pending against the user while inheriting none from the
cloned player (ruling §6.2 #11).

## Events

Client → server (technical spec §5.2):

`createRoom` · `joinRoom` · `startGame` · `playCard` · `playMultipleAttacks` (Assassin only,
min 2 attacks, `[{ instanceId, targetPlayerId }]`) ·
`buyCard` · `sellCard` · `upgradeCard` · `buyUpgradePoint` · `sellUpgradePoint` · `drawCard` ·
`buySpecialCard` ·
`chooseMirrorTarget` · `chooseEliminationReward`

Server → clients (§5.3):

`stateUpdate` (personalised per recipient) · `turnStarted` (active player + deadline) ·
`actionPlayed` (broadcast immediately) · `actionResolved` (broadcast on resolution; includes
`outcome: 'applied' | 'immune' | 'cancelled'` since L4-03) ·
`mirrorChoiceRequired` (to one player, with deadline) · `rewardChoiceRequired` (to the
eliminator, chainable) · `playerEliminated` · `gameOver` · `error`

Payloads are specified in §5.2/§5.3. **`playCard`, `sellCard` and `upgradeCard` key on
`instanceId`** (Lot 2 ruling — closes the §5.2 `cardId` discrepancy). `buyCard` still takes
`cardId` (infinite stock, new copy). Wired economy events: `buyCard`, `sellCard`.

One event is **not** in §5.2: `clientReady`, sent by a client once its handlers are registered.
See "Transport" below — without it the first view is dropped.

Message names live in `packages/shared/src/protocol/messages.ts`, and only the ones actually in
use are declared. A name added before anything sends it cannot be kept honest.

## Transport

Colyseus carries messages; it does **not** carry the state. There is no `Schema`, and the
authoritative state stays a plain object on the server (`decisions.md`). Consequences worth
knowing before touching `game-room.ts`:

- **`client.send(...)` per recipient, never `broadcast` for state.** A broadcast is one payload
  for everybody, which is the pattern §5.1 rules out. `broadcast` is fine for genuinely public
  events (`actionPlayed`, `playerEliminated`).
- **A client's first view must be asked for.** The SDK *drops* a message whose handler is not
  registered yet — it only logs `onMessage() not registered for type '...'` — and `onJoin` runs
  before the client's join promise resolves. So the client sends `clientReady` after
  registering, and the room answers that client alone. `onJoin` and `onLeave` send to everyone
  *else*.
- **The room lifecycle in 0.17** is `onAuth` → `onJoin` → … → `onDrop` (unexpected loss, where
  `allowReconnection` belongs, L7-01) → `onReconnect` → `onLeave`. A client is already out of
  `this.clients` when `onLeave` runs.
- **`onAuth` is the earliest hook with the join options**, and where the protocol version is
  checked: a client on a different contract misreads everything it receives. Throwing
  `ServerError` there rejects the join with a message the client shows.
- Options arriving from a client are typed `unknown` and narrowed by hand. Nothing about a
  payload is assumed, on either side of the wire (§5.4).

## View construction

```ts
// apps/server/src/protocol/build-view-for.ts — pure, so it needs no room to be tested.
// L0-06 signature; L1-09 replaces it with the real state and the visibility matrix.
function buildViewFor(recipientSessionId: string, connectedSessionIds: readonly string[]): PlaceholderStateView;
```

The builder takes the recipient and decides what to include. There is deliberately no
"full view" function anywhere for it to filter down from — if one exists, golden rule 4 above
has nothing to attach to and new fields start leaking by default. Keeping it pure is what makes
the hidden-information tests of technical spec §8 level 2 cheap: no server, no socket, no
timing. It refuses to build a view for a session that is not in the room.

## Timers and sub-choices

Technical spec §5.5, §5.6.

| Timer | Duration | On expiry |
|---|---|---|
| Turn | 30s | Automatic draw |
| Sub-choice | 20s | Default action below |
| Reconnection window | 60s | Player becomes absent |

Defaults on sub-choice expiry: **Mirror** redirects the first attack in the queue to a randomly
drawn opponent (via the seeded generator); **rewards** grant 2 × 4 lives. An already-paid card
is never silently wasted — the player loses the optimisation, not the benefit.

V1 sub-choices are Mirror targeting and reward selection only. Assassin's multi-select is **not**
a sub-choice: it is their turn action, covered by the 30s.

## Disconnection and inactivity

Technical spec §5.7 — two independent mechanisms, deliberately different thresholds.

- **Disconnected:** 60s real-time window from the moment of disconnection, independent of whose
  turn it is. Past it the player is *absent* and draws **immediately** on each of their turns,
  without waiting the 30s. Eliminated after **3** automatic turns, with no eliminator and so no
  reward. Any reconnection resets both the window and the counter.
- **Connected but inactive:** the 30s timer expires and they draw. Eliminated after **5**
  consecutive expired turns.

In both cases the player stays a valid target — attacks and persistent effects apply normally,
no immunity. At 2 players this elimination wins the game by forfeit.

## Interface notes

Technical spec §7. Functional visuals, no art direction (out of scope, §9). One constraint
dominates the information architecture: since every action is public, **the action log is the
screen's main organ**, not a side panel. Degraded states must be readable without opening the
console — absent player, automatic-turn counter before elimination, both timers.

## What not to do

- ❌ `buildFullState()` followed by `omit(...)` or `delete view.hand`.
- ❌ Sending a single broadcast state and letting each client hide what is not theirs.
- ❌ Sending a client its first view from `onJoin` — the SDK drops it, silently.
- ❌ Moving the state into a Colyseus `Schema` "so sync is automatic". That is the leak.
- ❌ Trusting any client-supplied value beyond the event payload's identifiers.
- ❌ One event covering both "played" and "resolved".
- ❌ A single global `spiedOn` boolean, or storing visibility on the spied player.
- ❌ Letting `GameState.seed` into any payload. It hands the client every future draw.
- ❌ Persisting in-progress game state. The DB holds finished games only; a restart mid-game
  loses it, and that is accepted for V1.

## Checklist

- [ ] Every new state field explicitly classified public / private / Spy-gated / server-only in
      the view builder
- [ ] No code path builds a complete state for an unspecified recipient
- [ ] Every new message name declared in `packages/shared/src/protocol/messages.ts`
- [ ] `actionPlayed` broadcast on play, `actionResolved` on resolution, in that order
      (`outcome: 'applied' | 'immune' | 'cancelled'`)
- [ ] Assassin multi-attack uses `playMultipleAttacks` (not a Mirror-style sub-choice)
- [ ] Action revalidated server side, forged payloads rejected
- [ ] Deadlines server-computed and sent
- [ ] Test proving a client payload never contains an unspied opponent's hand
- [ ] Task committed when `Done` (AGENTS.md §10) — never leave finished protocol work uncommitted
