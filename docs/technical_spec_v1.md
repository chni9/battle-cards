# Technical spec — Card Battle, version 1

> Implementation document. It contains no game rule: it refers to `spec_bataille_des_cartes_en.md` by section number.
> The rulings listed in sections 6 and 7 were decided in session and are not yet reflected in the rules spec. They must be carried over there (see Appendix A) — and two of them are not yet correctly reflected even in the rules spec as it currently stands (see the note at the top of Appendix A).
> In case of divergence between this document and the rules spec on a rule point: the spec is authoritative, except for the rulings in Appendix A, which are more recent.

---

## 1. Objective and non-objectives

### Objective

Specify the implementation of the first online-playable version of *Card Battle*: 2 to 4 players, Classic mode, no accounts, on a subset of content. Audience: Yassine and his friends.

What this version has to prove before going any further:

- delayed resolution works and stays readable for players
- hidden information holds (no leak of kit, hand, or resources)
- a 4-player game plays start to finish without getting stuck
- the game loop stays fun online, without players being physically present together

### Non-objectives

This document defines no game rule, does not address the business model, and does not cover the deferred lots (section 9).

---

## 2. V1 scope

Structuring point: attack and action cards are **shared** — each kit draws them randomly at distribution (spec §4). Reducing the number of kits therefore does not reduce the number of shared cards to implement.

| Element | V1 content |
|---|---|
| Players | 2 to 4 |
| Mode | Classic only, 25-life cap (spec §7) |
| Kits | Untouchable, Kamikaze, Scientific, Assassin (spec §4) |
| Attack cards | All 3 (spec §2) — shared, all required |
| Action cards | All 7 (spec §3) — shared, all required |
| Special cards | 6: Suicide, Spy Thief, Imposition, Cloning, Sentence, Points Generator (spec §5) |
| Elimination and rewards | Required (spec §6) |
| Accounts | None — game link/code + nickname |

Total: 16 cards, 4 kits.

The 4 kits were chosen to cover the structuring mechanics with the minimum content:

| Kit | Mechanic covered |
|---|---|
| Kamikaze | Life loss outside of attack (Suicide); atypical starting stats |
| Untouchable | Permanent immunity (exception to a general rule); persistent effect with a counter (Imposition) |
| Scientific | Kit trait on upgrade; kit + resources copy (Cloning) |
| Assassin | Only exception to "one action per turn"; counter-based effect (Points Generator); possible self-targeting (Sentence) |

---

## 3. Tech stack

| Layer | Choice |
|---|---|
| Language | TypeScript, backend and frontend |
| Backend | Node.js + Colyseus (rooms, state sync, reconnection) |
| Frontend | React |
| Structure | Monorepo: `apps/server`, `apps/client`, `packages/shared` |
| Database | Postgres — **only** the log of finished games |
| Hosting | VPS + Coolify |
| Game state | In-memory, server side, per room |

### Constraints

- **Authoritative server.** No rule logic on the client. The client displays state and transmits intents; the server validates everything.
- **`packages/shared` carries the common types** (Card, Kit, GameState, Effect). One single definition, never duplicated between client and server.
- **The database never holds the state of an in-progress game.** One single write, at the end of each game. A server restart mid-game loses the game: accepted for V1.
- **No bot in V1.** If a bot is added later, the engine must expose an interface `(game state, legal actions) → chosen action`, allowing a heuristic bot in TS or an external service without touching the engine.

---

## 4. Engine architecture

### 4.1 Data model

```
GameState
├── players: Player[]
├── pool: Card[]                    // shared pool (spec §1)
├── currentTurnPlayerId
├── turnSequence: number            // global sequence, serves as queuedAt
├── mode: 'classic'
└── lifeLimit: 25

Player
├── id, nickname, kitId
├── lives, points, upgradePoints, shield
├── hand: PlayerCard[]              // isUpgraded flag per copy
├── specialCards: SpecialCard[]
├── pendingEffects: PendingEffect[] // delayed resolution queue
├── activePersistentEffects: PersistentEffect[]
├── turnLedger: TurnLedger          // see 4.4
└── connectionState: ConnectionState

Card (static data)
├── id, name, type: 'attack' | 'action' | 'special'
├── cost: { points?, lives?, pointsPerLife? }
├── effect, upgradeEffect
└── sellValue, buyMultiplier

Kit (static data)
├── id, name
├── startingResources: { lives, points, upgradePoints, draw }
├── startingCardCounts: { action, attack }
├── specialCards: string[]
└── traits: KitTraits               // see 4.5

PendingEffect
├── sourcePlayerId, targetPlayerId
├── cardId, isUpgraded
└── queuedAt: number                // server sequence, FIFO
```

### 4.2 Two life-loss primitives, never merged

Distinction from spec §1, to be materialized as two separate functions:

| Function | Usage | Shield | Card counters |
|---|---|---|---|
| `applyDamage(target, amount, source)` | Attack-type cards only | Absorbs first, excess carries over to lives | Decrements the active card counters of the hit player |
| `applyLifeLoss(target, amount, reason)` | Tax, Suicide, Imposition, any non-attack loss | Ignored | No effect |

Merging these two paths is the single most likely and most silent error in the whole project. The linter won't catch it, the game will run normally, and shields will end up protecting against things they aren't supposed to block.

### 4.3 Turn loop

```
1. Player P's turn begins — 30s timer starts
2. P plays their single action
   (Assassin: multiple attack cards count as one action)
   If the timer expires → automatic draw
3. Resolve P's pendingEffects, in ascending queuedAt order
   Before each attack resolution: check mutual cancellation (4.6)
4. Apply persistent effects targeting P
5. Check elimination and victory condition
6. Next turn
```

Invariant: a player never suffers a loss of life or resources outside of their own turn, and never before playing their action (spec §6).

### 4.4 Turn ledger

Absorber (spec §3) requires knowing what an opponent lost and spent during their last turn. A state diff isn't enough: it's necessary to distinguish what was **actively spent** from what was **stolen by a third party**.

`TurnLedger` records, for each player's most recent complete turn (action + resolution phase):

- lives lost, regardless of cause
- points actively spent
- upgrade points actively spent
- resources lost to theft (excluded from upgraded Absorber's capture)

### 4.5 Kit traits

Some kits apply a permanent property to a card type, not to a single copy:

```ts
traits: {
  alwaysUpgraded: string[],              // Scientific: ['spy']
  immuneTo: string[],                    // Untouchable: ['thief', 'spy']
  allowsMultipleAttacksPerTurn: boolean, // Assassin
  gainPointsPerLifeLost: number | null   // out of V1 (Ghost)
}
```

`alwaysUpgraded` is checked **on every card acquisition**, regardless of its origin: distribution, purchase, elimination reward. All held copies are affected. It is not a flag set once at distribution.

### 4.6 Mutual attacks

Two attacks directed at each other between two players, both still pending:

- **Equal damage** → both are cancelled, on the turn of the player who retaliated. Neither player is affected.
- **Unequal damage** → the weaker attack is cancelled; the stronger stays pending and resolves on its target's turn.

Designer ruling 2026-08-04 (Lot 19) restores stronger-cancels-weaker. It supersedes the earlier
session that had removed "the stronger one prevails" in favour of "unequal = no interaction"
(Appendix A point 6 / previous §4.6 text).

Consequence: the comparison always triggers on the turn of the player who attacked second, since a retaliation can only be born during that player's own turn, and their resolution phase immediately follows.

### 4.7 Counter rule

Applies to Spy and Thief only (rules spec §1). Mirror is not counterable — it uses chain
redirection (rules spec §3), not cancellation. The countering card **must target the source**
of the pending effect. Both effects cancel out, both costs are paid, and both card copies
remain in hand (attack/action cards are reusable).

Does not apply to attack cards: those fall under 4.6.

---

## 5. Client-server protocol

### 5.1 Visibility model

| Category | Visibility |
|---|---|
| Kit, hand contents, exact resource values | Private. Revealed only by Spy or Spy Thief |
| Every action played, including card identity | Public — including purchases, sales, upgrades, and draws |
| Queue of pending effects | Public |
| Number of cards in hand, lives, shield, status | Public |

The server **builds one view per recipient**. It never builds a complete state that it filters on the way out: that pattern leaks any field added later.

Spy creates a persistent, asymmetric visibility right. A `who-sees-what-of-whom` matrix is needed, checked on every view construction, isolated in a dedicated module.

### 5.2 Client → server events

| Event | Payload |
|---|---|
| `createRoom` | nickname |
| `joinRoom` | gameCode, nickname |
| `startGame` | — (host, 2 to 4 players present) |
| `playCard` | cardId, targetPlayerId? |
| `playMultipleAttacks` | [{cardId, targetPlayerId}] — Assassin only |
| `buyCard` / `sellCard` | cardId |
| `upgradeCard` | cardId |
| `buyUpgradePoint` | — |
| `drawCard` | — |
| `buySpecialCard` | — (20 points) |
| `chooseMirrorTarget` | pendingEffectId, newTargetPlayerId |
| `chooseEliminationReward` | eliminationId, [choice1, choice2] |

### 5.3 Server → clients events

| Event | Content |
|---|---|
| `stateUpdate` | Personalized view per recipient |
| `turnStarted` | active player, timer deadline |
| `actionPlayed` | broadcast immediately — who played what, on whom |
| `actionResolved` | broadcast on resolution |
| `mirrorChoiceRequired` | sent to the single player concerned, with a deadline |
| `rewardChoiceRequired` | sent to the single eliminator, chainable |
| `playerEliminated` / `gameOver` | — |
| `error` | action rejected |

`actionPlayed` and `actionResolved` are two distinct events. Conflating them breaks the model: an action is public as soon as it's played, its resolution comes later.

### 5.4 Validation

Every action is fully revalidated server side: card ownership, sufficient resources, whose turn it is, valid target, action allowed by the kit. Greying out a button on the client is not validation.

### 5.5 Timers

| Timer | Duration | On expiry |
|---|---|---|
| Turn | 30s | Automatic draw |
| Sub-choice | 20s | See 5.6 |
| Reconnection window | 60s | Player becomes absent |

V1 sub-choices: Mirror targeting, elimination reward selection. Assassin's multi-select is not one — it's their turn action, covered by the 30s.

### 5.6 Default actions on sub-choice expiry

- **Mirror**: the first attack in the queue is redirected to a randomly drawn opponent.
- **Rewards**: 2 × 4 lives granted by default.

An already-paid card is never silently wasted. The player loses the optimization, not the benefit.

### 5.7 Disconnection and inactivity

Two independent mechanisms.

**Disconnection:**
1. A 60-second real-time window, triggered the instant of disconnection, independent of the current turn.
2. Reconnection before expiry: no effect.
3. After expiry, the player is absent. On each of their turns, they draw **immediately**, without waiting the 30s.
4. After 3 automatic turns, they are eliminated. No eliminator, so no reward; their cards join the pool.
5. Any reconnection resets both the 60-second window and the 3-turn counter.

**Inactivity while connected:**
1. The 30-second timer expires, the player draws.
2. After 5 consecutive expired turns, they are eliminated, under the same conditions.

In both cases, the player remains a valid target: they suffer attacks and persistent effects normally. No immunity.

At 2 players, this elimination gives the remaining player the win by forfeit.

Accepted case: a player who disconnects during their own turn blocks the game for up to 60s.

---

## 6. V1 content and rule rulings

### 6.1 Mapping

| Card | Spec | Implementation note |
|---|---|---|
| Basic / Strong / Super attack | §2 | See 4.6 |
| Absorber | §3 | Requires `TurnLedger` (4.4) |
| Spy | §3 | Visibility matrix (5.1) |
| Thief | §3 | Capped at the target's amount |
| Mirror | §3 | Sub-choice (5.5) |
| Shield | §3 | Only one active at a time |
| Tax | §3 | `applyLifeLoss`, never `applyDamage` |
| Regeneration | §3 | 25-life cap |
| Suicide | §5 | See ruling 3 |
| Spy Thief | §5 | Uncapped theft + global spying |
| Imposition | §5 | Counter 2, see ruling 9 |
| Cloning | §5 | See ruling 11 |
| Sentence | §5 | Can target its own user if not upgraded |
| Points Generator | §5 | Counter 3 |

### 6.2 Rulings

| # | Ruling |
|---|---|
| 1 | **Scientific**: trait `alwaysUpgraded: ['spy']`. Permanent, all copies, regardless of the card's origin |
| 2 | **Self-elimination**: no reward for anyone, cards to the pool |
| 3 | **Suicide**: both base and upgraded — user is eliminator of opponents killed by the effect (rewards Lot 6). Base also self-eliminates on the user's next turn (no reward for that self-elim). Opponent losses resolve per target turn after they act. |
| 4 | **Multiple elimination**: 2 rewards per eliminated player, cumulative |
| 5 | **Mirror**: the player chooses among the pending attacks. Rejected as an invalid action if there's nothing to redirect |
| 6 | **Counter**: the countering card must target the source |
| 7 | **Visibility**: all actions are public, including card identity. Private: kit, hand, exact resource values |
| 8 | **Mutual attacks**: cancellation only on equal damage. Different damage, no interaction |
| 9 | **Imposition**: the user gains the ceded life, 25-cap applied |
| 10 | **Special card at 20 points**: in V1, draw restricted to the 6 cards in the lot |
| 11 | **Cloning**: cancels pending effects against the user, inherits no pending effect from the target, resets all visibility both ways |
| 12 | **Absorber**: "last move" = the opponent's most recent complete turn, resolution phase included |

### 6.3 Clarifications

- The 25-life cap (spec §7) applies to every source of gain: Regeneration, Absorber, Imposition, elimination rewards, upgraded Cloning.
- The **shared pool** must be fed correctly (sales, used special cards, eliminated players' cards). As of V4 the pool is public and readable via `takeFromPool` (technical spec v4 §4.3); V1 left it write-only.
- Mutual attack cancellation compares **final damage** (including `damageMultiplier`), not card identity (#V4-2 / L20-07). The older claim that “all V1 damage values are distinct” was a documentation bug — Mirror multipliers already made equal final damage reachable across different cards.

---

## 7. Interface

Functional visuals, no art direction. One information-architecture constraint dominates: since every action is public, **the action log is the screen's main organ**, not an accessory.

### Screens

1. **Home** — create a game (generates a code) or join. Nickname entry.
2. **Lobby** — connected players, host launches from 2 players, 4 max.
3. **Table** — the single game screen.
4. **Game over** — winner and recap.

### Table

| Zone | Content |
|---|---|
| Opponents | Nickname, lives, shield, status, card count. Exact resources and kit only if revealed |
| Pending effects queue | Public: source, card, target, not yet resolved |
| Action log | Complete, browsable history since the start of the game |
| Private zone | Hand, special cards, kit, exact resources |
| Actions | Play, buy, sell, upgrade, draw, buy an upgrade point, buy a special card |
| Turn | Active player, turn order, visible timer |
| Degraded states | Absent player, automatic-turn counter before elimination |

### Interactions to plan for

Target selection; choosing which attack to redirect (Mirror); Assassin's multi-select; elimination reward choice sequence; display of turn and sub-choice timers.

---

## 8. Definition of Done

### Level 1 — Engine invariants

- A targeted action never resolves before its target's turn
- Pending effects resolve after the target's action
- `applyDamage` goes through the shield, `applyLifeLoss` never does
- `applyDamage` decrements the hit player's counters, `applyLifeLoss` never does
- One action per turn, except Assassin
- 25-life cap on every source of gain

### Level 2 — Hidden information

- No client receives the kit, hand, or exact resources of an unspied opponent
- Every action is broadcast to everyone, including card identity
- The pending effects queue is public
- Spy persists until the end of the game
- Cloning resets visibility to zero both ways

### Level 3 — Rulings

One dedicated test per row of table 6.2, plus the timer and threshold rules from section 5.

### Level 4 — Cards

16 cards, base and upgraded versions: 32 tests minimum.

### Level 5 — Kits

Starting resources conforming, distribution respecting quantities, special ability effective. Specific test for Scientific: a Spy card **bought mid-game** must arrive already upgraded.

### Level 6 — Lifecycle

Disconnection (60s, immediate draw, 3 turns, elimination without reward), connected inactivity (30s, 5 turns), sub-choices (20s and default actions), win by forfeit at 2 players, last survivor.

### Formal criteria

- `tsc` with no error
- Clean linter
- All tests green, no test disabled or skipped
- Every touched card or rule has its test created or updated
- No dependency added outside the lockfile

---

## 9. Out of V1 scope

Not to be implemented, even partially, even "to lay groundwork":

- The 11 remaining kits and their special cards
- Team, God, and Quick modes
- Bots, heuristic or learning
- User accounts, authentication
- Persistence of an in-progress game's state
- Monetization, shop, content unlocks
- Art direction

---

## Appendix A — Points to carry over into the rules spec

These points were decided in session and are not yet reflected in `spec_bataille_des_cartes_en.md`. Some of them correct it.

**Status note, English version:** ten of the twelve points below have already been carried over correctly into the current English spec (drawing is defined, kit upgrades are modeled as a permanent trait, visibility, self-elimination, multiple elimination, counter, Mirror, Imposition, Cloning, and Absorber's "last move" are all present). **Point 6, mutual attacks, is not.** Spec §2's note on the Super attack, and spec §6's Mutual Attacks section, both still state the "stronger attack prevails" clause this session removed. Fix both before development starts — see the exact replacement wording given above this document, in the message that accompanied it.

| # | Point | Nature |
|---|---|---|
| 1 | The "drawing" action is defined nowhere. Adopted interpretation: gain a number of points equal to the kit's Draw value — **to confirm** | Gap |
| 2 | Kit upgrades: permanent trait on a card type, not a property of a single copy | Model correction §4 |
| 3 | Visibility of actions: public, including card identity | Gap |
| 4 | Self-elimination: no reward | Gap §6 |
| 5 | Multiple elimination: 2 rewards per eliminated player | Clarification §6 |
| 6 | Mutual attacks: the "the stronger one prevails" clause from §6 is **removed**. Only cancellation on equal damage remains | Correction §6 — **still not applied, see status note above** |
| 7 | Counter: must target the source | Clarification §1 |
| 8 | Mirror: choice among several pending attacks; invalid if none | Gap §3 |
| 9 | Imposition: the user gains the ceded life | Gap §5 |
| 10 | Cloning: cancels pending effects against the user, resets visibility to zero | Gap §5 |
| 11 | Absorber: definition of "last move" | Clarification §3 |
| 12 | Turn time limit and disconnection handling: don't exist in the spec, specific to the video game | Addition |

### Open points, out of V1, to address before adding the remaining kits

- **Warrior**: "all attacks already upgraded" under the new trait model means every attack purchased mid-game arrives upgraded. A Super attack bought for 20 points would deal 10 damage instead of 7, with no limit. To be ruled on.
- **Upgrade Point Thief** against a permanent-trait kit: the card removes upgrades, but the trait reapplies them instantly. Unresolved conflict.

### To note for the balancing pass

- Upgraded Suicide is immediately available to Kamikaze (1 starting upgrade point). At 4 players, eliminating 2 out of 3 opponents nets 4 rewards against a last player stripped of their points and 5 lives.
- Cloning at 3 points also serves as a defensive escape hatch: it wipes all incoming attacks in addition to copying an opponent's kit and resources.
- Spy loses a lot of value with fully public actions: the opponent's hand can be reconstructed by deduction. Also concerns Spy Thief.
- An idle player's auto-draw yields 1 point per turn in V1. With a future kit at Draw 4, going idle would become profitable.
