# docs/agent/protocol.md — Client/server protocol and visibility

> Read before touching Colyseus rooms, events, state views, or anything Spy can reveal.
> Transverse rules → `/AGENTS.md`. Engine → `engine.md`.
>
> Sources: technical spec §3, §5 (whole section), §6.2 rulings #7 and #11, §7 ·
> rules spec §6 (Visibility).
>
> **Status:** unwritten — the room lands in L0-06, per-recipient views in L1-09, the
> visibility matrix in L3-05. Code blocks are `[TEMPLATE]`.
> Fetch current Colyseus APIs via Context7 before coding; do not write them from memory.

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
   it.** Public, private, or Spy-gated — decided in the same change, never defaulted.

## Visibility model

Technical spec §5.1, ruling §6.2 #7, rules spec §6.

| Category | Visibility |
|---|---|
| Kit, hand contents, exact resource values | **Private.** Revealed only by Spy or Spy Thief |
| Every action played, **including card identity** | **Public** — purchases, sales, upgrades and draws included |
| Queue of pending effects | **Public** |
| Card count in hand, lives, shield, status | **Public** |

Consequence worth knowing: with fully public actions, a hand can be partly reconstructed by
deduction, which costs Spy some value. That is accepted, not a bug.

Cloning **resets visibility to zero in both directions** — what the user saw of others and what
others saw of them — and cancels effects pending against the user while inheriting none from the
cloned player (ruling §6.2 #11).

## Events

Client → server (technical spec §5.2):

`createRoom` · `joinRoom` · `startGame` · `playCard` · `playMultipleAttacks` (Assassin only) ·
`buyCard` · `sellCard` · `upgradeCard` · `buyUpgradePoint` · `drawCard` · `buySpecialCard` ·
`chooseMirrorTarget` · `chooseEliminationReward`

Server → clients (§5.3):

`stateUpdate` (personalised per recipient) · `turnStarted` (active player + deadline) ·
`actionPlayed` (broadcast immediately) · `actionResolved` (broadcast on resolution) ·
`mirrorChoiceRequired` (to one player, with deadline) · `rewardChoiceRequired` (to the
eliminator, chainable) · `playerEliminated` · `gameOver` · `error`

Payloads are specified in §5.2/§5.3. **`playCard`, `sellCard` and `upgradeCard` are specified
with a `cardId`, which cannot disambiguate two copies at different upgrade levels — see the
open item in `decisions.md` before implementing them.**

## View construction

```ts
// [TEMPLATE — replace once L1-09 lands]
// One function, one recipient. It receives the recipient's id and decides what to include.
// There is no "full view" function anywhere for it to filter down from.
function buildViewFor(recipientId: string, state: GameState, vis: VisibilityMatrix): StateView;
```

The builder takes the recipient and decides what to include. There is deliberately no
"full view" function anywhere for it to filter down from — if one exists, golden rule 4 above
has nothing to attach to and new fields start leaking by default.

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
- ❌ Trusting any client-supplied value beyond the event payload's identifiers.
- ❌ One event covering both "played" and "resolved".
- ❌ A single global `spiedOn` boolean, or storing visibility on the spied player.
- ❌ Persisting in-progress game state. The DB holds finished games only; a restart mid-game
  loses it, and that is accepted for V1.

## Checklist

- [ ] Every new state field explicitly classified public / private / Spy-gated in the view builder
- [ ] No code path builds a complete state for an unspecified recipient
- [ ] `actionPlayed` broadcast on play, `actionResolved` on resolution, in that order
- [ ] Action revalidated server side, forged payloads rejected
- [ ] Deadlines server-computed and sent
- [ ] Test proving a client payload never contains an unspied opponent's hand
