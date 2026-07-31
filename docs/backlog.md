# Backlog — Card Battle V1

> Task tracker and single source of truth for what to build, in what order.
> Converted from `backlog_v1_card_battle.xlsx` on 2026-07-29; the workbook is retired.
> **Keep each task's status current as you finish it** — see `/AGENTS.md` §9.
> Open decisions are tracked in `agent/decisions.md`, not duplicated here.

Status values: `To do` · `In progress` · `Done` · `Blocked`

## How to read this

**Sequencing principle**

- The thinnest possible vertical slice first: a 2-player game playable with a single attack card (lot 1), then content stacks on top of it. Do not build all 16 cards before a single game runs end to end — integration problems are cheapest to catch early and most expensive to discover last.

**Execution order**

- Follow the ID order. The "Depends on" column gives the strict prerequisites. Two tasks with no shared dependency can be run in parallel, but a solo developer gains little from that.

**Complexity**

- S: one agent pass, quick review. M: several passes, careful review. L: to be broken into sub-tasks by the agent before any code is written.
- No time estimates in hours: with an agent, writing the code is no longer the bottleneck. Review and correction time is — and that depends on how clear the spec is, not on how much code gets written.

**Risk**

- High: an error here triggers no alert and surfaces weeks later. Read the produced code line by line, don't settle for green tests.
- Medium: error detectable while playing, but costly to fix after the fact.
- Low: error visible immediately.

**Three tasks to never defer**

- L0-04 (the two life-loss primitives), L1-07 (the delayed resolution queue), and L1-09 (the per-recipient view). Each is a foundation: added after the fact, it forces a rework of everything built on top of it.

**References**

- Rules spec §N refers to spec_bataille_des_cartes_en.md. Spec §N refers to technical_spec_v1.md. No rule is copied here: when in doubt, read the source.

**Out of scope**

- The 11 remaining kits, Team / God / Quick modes, bots, user accounts, persistence of an in-progress game, monetization. See technical spec §9. **Art direction is no longer out of scope** — it is V2, specified in `docs/technical_spec_v2.md` and sequenced in Lots 10–14 below. It changes no rule, no screen flow, and no protocol event.

## Progress

63 of 63 V1 tasks done. **V1 backlog complete.** Next: V2 — visual design, see
`docs/technical_spec_v2.md` and Lot 10 onward.

| Lot | Tasks | Done |
|---|---|---|
| 0 · Project foundation | 6 | 6 |
| 1 · Vertical slice | 13 | 13 |
| 2 · Economy and attacks | 6 | 6 |
| 3 · Action cards | 9 | 9 |
| 4 · Kits | 5 | 5 |
| 5 · Special cards | 9 | 9 |
| 6 · Elimination | 5 | 5 |
| 7 · Robustness | 5 | 5 |
| 8 · Game log | 2 | 2 |
| 9 · Polish | 3 | 3 |
| 10 · V2 design system foundations | 5 | 0 |
| 11 · V2 Home and Lobby | 2 | 0 |
| 12 · V2 Table | 7 | 0 |
| 13 · V2 End screen | 1 | 0 |
| 14 · V2 Animation | 5 | 0 |

## Milestones

| Milestone | Reached at the end of | What must be true | Expected proof |
|---|---|---|---|
| **M1** | Lot 1 · Vertical slice | Two players play a complete game with a single attack card. | Delayed resolution works, hidden information is verified by an automated test, the timer triggers a draw, a winner is declared. |
| **M2** | Lot 3 · Action cards | The full economy and the 10 shared cards work. | 20 card tests green, visibility matrix isolated in its own module, turn ledger reliably distinguishes spending from theft. |
| **M3** | Lot 5 · Special cards | The 4 kits and 6 special cards are playable. | 32 card tests green, kit traits verified on late acquisition, internal counters correct. |
| **M4** | Lot 7 · Robustness | A 4-player game plays start to finish, disconnections and inactivity handled. | Three 4-player games completed with no stuck state. This is the milestone that authorizes playtesting with friends. |
| **M5** | Lots 8 and 9 | The game log records data, the interface is readable. | A finished game produces one usable row in the database. Ready for balancing-data collection. |

_Task count = number of tasks in the lot named in column B only, not the cumulative count since the start._

## Lot 0 · Project foundation

### L0-01 · Monorepo and tooling — `Done`

pnpm workspaces: apps/server, apps/client, packages/shared. Shared strict tsconfig, linter, test runner, client build tool. Node version pinned.

- **Reference** Spec §3 · **Depends on** nothing · **Complexity** M · **Risk** Low
- **Watch point** The spec doesn't mandate any specific tool. If you don't choose, the agent chooses for you.
- **Acceptance** tsc and linter pass on all 3 packages, one trivial test passes
- **Note** Open decision #3 is now closed — tooling was chosen explicitly, see `agent/decisions.md`.

### L0-02 · Shared types — `Done`

GameState, Player, Card, Kit, PendingEffect, PersistentEffect, TurnLedger, ConnectionState in packages/shared. One single definition, imported by both server and client.

- **Reference** Spec §4.1 · **Depends on** L0-01 · **Complexity** M · **Risk** Medium
- **Watch point** Any duplicated domain type between client and server is immediate debt.
- **Acceptance** No domain type defined twice anywhere in the repo

### L0-03 · Effect handler registry — `Done`

One typed handler per card, registered in a registry, sharing common primitives. No generic effect engine.

- **Reference** Spec §4.1 · **Depends on** L0-02 · **Complexity** L · **Risk** High
- **Watch point** Architecture decision not yet made. Without a ruling, the agent will produce a half-DSL that collapses on Cloning and Absorber.
- **Acceptance** Adding a card modifies no existing file outside the registry
- **Note** Open decision #2 is now closed — typed handler registry, no DSL. See `agent/decisions.md` and `agent/card-handler.md`. The watch point above is resolved.
- **Note** Ran after L0-04, so the handler contract was written against real primitive signatures. The registry is keyed on `IMPLEMENTED_CARD_IDS` with a compiler-enforced `PENDING_CARD_IDS` beside it, since the 16 cards land across lots 1 to 5 — see `agent/decisions.md`. Basic attack landed in L1-08; others remain pending.

### L0-04 · Life-loss primitives — `Done`

applyDamage: shield first, excess to lives, decrements active card counters. applyLifeLoss: neither shield nor counters. Two separate functions.

- **Reference** Spec §4.2 · rules spec §1 · **Depends on** L0-02 · **Complexity** M · **Risk** High
- **Watch point** The single most silent error in the project. Neither the compiler nor the linter will catch it.
- **Acceptance** A shield absorbs a hit and ignores a tax; only damage decrements counters
- **Note** Ran before L0-03, so the registry could be written against real signatures. Scope widened by developer instruction to include `gainLives`, the single clamped source of life gain. Counter decrement ruled at one point per life lost, and the primitives return an outcome rather than `void` — all three recorded in `agent/decisions.md`.

### L0-05 · Seeded randomness — `Done`

Seeded pseudo-random generator, injected everywhere a draw happens: card distribution, Sentence, special card purchase, Mirror's default target.

- **Reference** Spec §8 · **Depends on** L0-02 · **Complexity** S · **Risk** Medium
- **Watch point** Without a seed, no distribution or Sentence test is reproducible.
- **Acceptance** Two games launched with the same seed produce an identical distribution
- **Note** `createRng` / `createSeed` in `apps/server/src/engine/rng.ts`, written in-repo with no dependency. `GameState` gains a `seed` field, absent from spec §4.1 and classified **server-only**: a client holding it could predict every remaining draw. See `agent/decisions.md`.

### L0-06 · Colyseus server and client connection — `Done`

Empty server-side room, React client connecting to it and displaying the received state.

- **Reference** Spec §3 · **Depends on** L0-01 · **Complexity** M · **Risk** Low
- **Acceptance** Two tabs connected to the same room see the same state
- **Note** Verified in two browser tabs and with two SDK clients: same connected set, a different `you` per recipient. Colyseus is used as **transport only** — no `Schema` state, one `stateUpdate` per recipient — which contradicts spec §3's "state sync" wording and follows §5.1 instead. A `clientReady` event beyond spec §5.2 was necessary: the SDK drops a message whose handler is not yet registered. Both recorded in `agent/decisions.md`, along with the duplicate `@colyseus/core` install trap that makes every join fail.

## Lot 1 · Vertical slice

### L1-01 · Home screen and game creation — `Done`

createRoom generates a game code, joinRoom joins by code, nickname entry.

- **Reference** Spec §5.2 · §7 · **Depends on** L0-06 · **Complexity** M · **Risk** Low
- **Acceptance** One player creates, a second joins by code, both see each other
- **Note** Spec §5.2 createRoom/joinRoom map to Colyseus `create` / `joinById`; game code is a 6-letter `roomId`. See `agent/decisions.md`.

### L1-02 · Lobby and launch — `Done`

List of connected players. Host launches from 2 players onward. Rejected beyond 4.

- **Reference** Spec §5.2 · §7 · **Depends on** L1-01 · **Complexity** S · **Risk** Low
- **Acceptance** Launch rejected at 1 player, entry rejected for a 5th
- **Note** Host leave before start promotes earliest remaining seat. GameState creation is L1-03.

### L1-03 · Initial state and turn order — `Done`

GameState creation, stable turn order, starting resources as placeholder values (kits arrive in lot 4).

- **Reference** Spec §4.1 · **Depends on** L1-02, L0-05 · **Complexity** M · **Risk** Low
- **Watch point** Do not anticipate kits here. Hardcoded values assumed, replaced in lot 4.
- **Acceptance** A 2-player game starts with a stable turn order
- **Note** Placeholders: 10 lives, 0 points, 0 upgrade points, draw 1, 10× basic-attack, kitId untouchable inert. Seeded shuffle for turn order. See `agent/decisions.md`.

### L1-04 · Turn loop — `Done`

One action per turn, pass to the next player, increment turnSequence.

- **Reference** Spec §4.3 · rules spec §6 · **Depends on** L1-03 · **Complexity** M · **Risk** Medium
- **Watch point** turnSequence serves as queuedAt for the effects queue: a global counter, never per player.
- **Acceptance** A second action in the same turn is rejected
- **Note** Room tracks `actionTakenThisTurn`; engine advances via `advanceTurn` after action + resolve.

### L1-05 · Draw action — `Done`

The player gains a number of points equal to their kit's Draw value. No card gained.

- **Reference** Rules spec §6 · **Depends on** L1-04 · **Complexity** S · **Risk** Low
- **Acceptance** The player gains the right number of points, their turn ends
- **Note** Draw uses `getKit(player.kitId).startingResources.draw` (L4-01+).

### L1-06 · Turn timer — `Done`

30 seconds. Deadline computed and sent by the server. Automatic draw on expiry.

- **Reference** Spec §5.5 · **Depends on** L1-05 · **Complexity** M · **Risk** Medium
- **Watch point** The deadline comes from the server. A client-only counter is bypassable and drifts.
- **Acceptance** A turn with no action triggers a draw at 30s
- **Note** `turnStarted` carries `deadlineMs`; room `setTimeout` auto-draws.

### L1-07 · Delayed resolution queue — `Done`

pendingEffects per player. Resolution after the target has played their action, in ascending queuedAt order.

- **Reference** Spec §4.3 · rules spec §6 · **Depends on** L1-04 · **Complexity** L · **Risk** High
- **Watch point** The core of the game. An effect resolving before its target's action invalidates the entire bluffing mechanic.
- **Acceptance** An effect queued on turn 1 only resolves on its target's turn, after their action

### L1-08 · Basic attack only — `Done`

A single card implemented: play, target, queue, resolve via applyDamage.

- **Reference** Rules spec §2 · **Depends on** L1-07, L0-04 · **Complexity** M · **Risk** Low
- **Watch point** Do not add the other two attacks here. They arrive in lot 2.
- **Acceptance** The target loses 1 life at the right moment, never before their turn

### L1-09 · Per-recipient view — `Done`

The server builds one state per player. Private: kit, hand, exact resource values. Public: actions played, effects queue, lives, shield, card count.

- **Reference** Spec §5.1 · rules spec §6 · **Depends on** L1-03 · **Complexity** L · **Risk** High
- **Watch point** Do this now, not later. Filtering added after the fact leaks any field added afterward.
- **Acceptance** The payload received by a client never contains an opponent's hand

### L1-10 · actionPlayed and actionResolved — `Done`

Two distinct events: the first broadcast as soon as the action is played, the second on its resolution.

- **Reference** Spec §5.3 · **Depends on** L1-07, L1-09 · **Complexity** M · **Risk** Medium
- **Watch point** Conflating them breaks the public-actions visibility model.
- **Acceptance** Both events arrive separately and in the right order

### L1-11 · Server-side validation — `Done`

Full revalidation of every action: card ownership, sufficient resources, whose turn it is, valid target.

- **Reference** Spec §5.4 · **Depends on** L1-08 · **Complexity** M · **Risk** Medium
- **Watch point** A greyed-out client button is not validation.
- **Acceptance** An action forged from the browser console is rejected
- **Note** `performTurnAction` rejects wrong turn, missing card, bad target, insufficient points; room rejects second action.

### L1-12 · Minimal game table — `Done`

Opponents, private zone, action log, pending effects queue, timer, draw and attack actions.

- **Reference** Spec §7 · **Depends on** L1-10 · **Complexity** L · **Risk** Medium
- **Watch point** The action log is the screen's main organ, not a secondary panel.
- **Acceptance** A 2-player game is fully playable from the interface
- **Note** `docs/agent/frontend.md` created from the real client.

### L1-13 · Elimination and victory — `Done`

Elimination at 0 lives, last survivor wins, summary end screen.

- **Reference** Rules spec §6 · §7 · **Depends on** L1-12 · **Complexity** M · **Risk** Low
- **Watch point** Elimination rewards are out of scope here: lot 6.
- **Acceptance** A 2-player game ends and displays the winner
- **Note** No rewards; cards of the eliminated go to the pool.
## Lot 2 · Economy and attacks

### L2-01 · Buying and selling cards — `Done`

Purchase at double the usage cost from an infinite stock. Sale at usage cost. The sold card joins the pool.

- **Reference** Rules spec §1 · **Depends on** L1-13 · **Complexity** M · **Risk** Low
- **Acceptance** Points change correctly, the card enters or leaves the hand
- **Note** Shared catalog uses `buyCost`/`sellYield` (`CardCost`). Tax shop: buy 2 lives (reject if lives < 2) / sell 1 life; Regen shop: buy 6 / sell 3 points. `playCard`/`sellCard` use `instanceId`. PROTOCOL_VERSION 4.

### L2-02 · Upgrade points — `Done`

Purchase at 10 points, resale at 7 points.

- **Reference** Rules spec §1 · **Depends on** L2-01 · **Complexity** S · **Risk** Low
- **Watch point** Cost modifiable by a kit ability (Upgrader, out of V1): do not hardcode 10 into the logic.
- **Acceptance** Purchase and resale correct
- **Note** `UPGRADE_POINT_ECONOMY` in shared; `sellUpgradePoint` added to protocol (absent from §5.2). PROTOCOL_VERSION 5.

### L2-03 · Card upgrade — `Done`

1 upgrade point, permanent for the game, applied to one specific copy.

- **Reference** Rules spec §1 · **Depends on** L2-02 · **Complexity** M · **Risk** Medium
- **Watch point** The upgrade applies to one copy, unless a permanent kit trait overrides it (lot 4).
- **Acceptance** Only one copy upgraded, other copies unchanged
- **Note** `upgradeCard` by `instanceId`. `alwaysUpgraded` deferred to Lot 4. PROTOCOL_VERSION 6.

### L2-04 · The three attack cards — `Done`

Basic attack, Strong attack, Super attack, base and upgraded versions.

- **Reference** Rules spec §2 · **Depends on** L2-03 · **Complexity** M · **Risk** Low
- **Watch point** Check all six values one by one against the spec's table: a damage error triggers no alert.
- **Acceptance** All 6 combinations tested, values conforming to the spec
- **Note** `ATTACK_DAMAGE` in shared; strong/super handlers registered.

### L2-05 · Mutual attacks — `Done`

Equal damage: both attacks cancel out, on the retaliating player's turn. Different damage: no interaction, each resolves on its own normal turn.

- **Reference** Spec §4.6 · **Depends on** L2-04 · **Complexity** L · **Risk** High
- **Watch point** Rules spec §6 line 243 and note §2 line 55 were corrected to match §4.6 (Open decision #1 closed).
- **Acceptance** Both cases tested, plus a 3-player case with no reciprocity
- **Note** Cancel runs in `resolve-pending` before each attack resolution.

### L2-06 · Shared pool — `Done`

Fed by sales, used special cards, and eliminated players' cards. Write-only in V1.

- **Reference** Rules spec §1 · Spec §6.3 · **Depends on** L2-01 · **Complexity** S · **Risk** Low
- **Watch point** No V1 card reads from the pool. Do not invent a use for it.
- **Acceptance** The pool fills correctly, nothing consumes it
- **Note** Sales (L2-01) and elimination already append; L2-06 adds dedicated write-only tests.

## Lot 3 · Action cards

### L3-01 · Tax — `Done`

1-life cost via applyLifeLoss. Gain 4 points, 6 in the upgraded version. The life cost always applies.

- **Reference** Rules spec §3 · **Depends on** L2-04 · **Complexity** S · **Risk** Medium
- **Watch point** Never applyDamage. A 1-life player can kill themself: elimination without reward (lot 6).
- **Acceptance** The shield does not intervene, no counter decrements
- **Note** Null-target play path added; Tax registered.

### L3-02 · Regeneration — `Done`

Up to 4 lives per use, 3 points per life, 2 points in the upgraded version. 25-life cap.

- **Reference** Rules spec §3 · §7 · **Depends on** L2-04 · **Complexity** S · **Risk** Low
- **Watch point** The 25-life cap applies here like on every other source of gain.
- **Acceptance** Gain capped, excess lost
- **Note** `playCard.quantity` (1–4); PROTOCOL_VERSION 7.

### L3-03 · Shield — `Done`

4 shield points, 7 in the upgraded version. Only one active shield at a time. The upgraded version blocks Thief and Spy at no shield-point cost.

- **Reference** Rules spec §3 · **Depends on** L3-02 · **Complexity** M · **Risk** Medium
- **Watch point** Partially overlaps with Untouchable's immunity (lot 4): redundant but no conflict.
- **Acceptance** Recreation rejected while a shield is active
- **Note** `shieldIsUpgraded` on Player; Thief/Spy fizzle at resolve in L3-04/L3-05.

### L3-04 · Thief — `Done`

Steals 10 points, capped at the target's amount. Upgraded version: the target loses the same amount, the user gains double.

- **Reference** Rules spec §3 · **Depends on** L3-03 · **Complexity** M · **Risk** Medium
- **Watch point** The theft must be flagged as such in the TurnLedger: it's excluded from upgraded Absorber's capture.
- **Acceptance** A target with 3 points loses 3, not 10
- **Note** `stealPoints` primitive; upgraded-shield fizzle at resolve.

### L3-05 · Spy and visibility matrix — `Done`

See the target's kit and cards until the end of the game. Upgraded version: also see all their resources. A who-sees-what-of-whom matrix in a dedicated module.

- **Reference** Rules spec §3 · Spec §5.1 · **Depends on** L1-09 · **Complexity** L · **Risk** High
- **Watch point** Persistent, asymmetric right, checked on every view construction. A global boolean is not enough.
- **Acceptance** The spied-on player stays invisible to others, the spy sees everything
- **Note** `visibility-matrix.ts` + `GameState.visibility`; Spy-gated `spied` on public views.

### L3-06 · Counter rule — `Done`

Spy and Thief only. The countering card must target the source of the pending effect. Both effects cancel, both costs are paid (copies stay in hand).

- **Reference** Rules spec §1 · Spec §4.7 · **Depends on** L3-05 · **Complexity** M · **Risk** Medium
- **Watch point** Never applies to attack cards: those fall under L2-05.
- **Acceptance** Same card played on a third party: no cancellation
- **Note** Cancel at resolve-pending; Mirror excluded.

### L3-07 · Turn ledger — `Done`

Per player, for their most recent complete turn: lives lost from all causes, points and upgrade points actively spent, resources lost to theft.

- **Reference** Spec §4.4 · **Depends on** L3-04 · **Complexity** L · **Risk** High
- **Watch point** A state diff is not enough: it must distinguish what was spent from what was stolen.
- **Acceptance** The ledger correctly distinguishes active spending from third-party theft
- **Note** Explicit writers only; acceptance tests cover Tax+theft and Regen spend.

### L3-08 · Absorber — `Done`

Gains the lives lost by the target during their last complete turn, resolution included. Upgraded version: also captures active spending.

- **Reference** Rules spec §3 · **Depends on** L3-07 · **Complexity** M · **Risk** Medium
- **Watch point** Does not allow absorbing one's own lost lives. Gain subject to the 25-life cap.
- **Acceptance** Correct absorption after a turn where the target suffered an attack and paid a tax
- **Note** Immediate (not queued); ignores theft fields.

### L3-09 · Mirror — `Done`

Redirects a non-upgraded attack pending against the user. Choice among several. Unlimited redirection chain. Upgraded version: also redirects upgraded attacks and doubles the redirected attack's damage.

- **Reference** Rules spec §3 · **Depends on** L3-06 · **Complexity** L · **Risk** High
- **Watch point** 20s sub-choice, default = first attack in the queue toward a randomly drawn opponent. Invalid action if nothing pending. A redirection can create a mutual-attack pair.
- **Acceptance** 3-player chain tested, invalid case rejected, default applied on expiry
- **Note** `damageMultiplier` stacks; PROTOCOL_VERSION 8; `chooseMirrorTarget` / `mirrorChoiceRequired`.

## Lot 4 · Kits

### L4-01 · Kit model and traits — `Done`

Traits: alwaysUpgraded, immuneTo, allowsMultipleAttacksPerTurn. Checked on every card acquisition.

- **Reference** Spec §4.5 · rules spec §4 · **Depends on** L2-03 · **Complexity** M · **Risk** High
- **Watch point** alwaysUpgraded is not a flag set at distribution: it applies to any later acquisition and to every held copy.
- **Acceptance** The trait applies to a card acquired after the start of the game

### L4-02 · Starting distribution — `Done`

Kit resources, random draw of action and attack cards per the roster's quantities, duplicates possible, kit's special cards.

- **Reference** Rules spec §4 · §6 · **Depends on** L4-01, L0-05 · **Complexity** M · **Risk** Medium
- **Watch point** Replaces the placeholder values from lot 1 (L1-03).
- **Acceptance** Quantities conforming to the roster for the 4 kits in the lot

### L4-03 · Kamikaze and Untouchable — `Done`

Starting stats for both kits. Untouchable: immunity to Thief and Spy.

- **Reference** Rules spec §4 · **Depends on** L4-02 · **Complexity** M · **Risk** Medium
- **Watch point** Should the immunity block Spy Thief? Not yet ruled on, see Open decisions tab.
- **Acceptance** Thief and Spy have no effect on Untouchable

### L4-04 · Scientific — `Done`

alwaysUpgraded trait on Spy, permanent and free.

- **Reference** Rules spec §4 · **Depends on** L4-03 · **Complexity** M · **Risk** High
- **Watch point** Mandatory test: a Spy card bought mid-game arrives already upgraded, and every held copy is too.
- **Acceptance** Purchase on turn 12: card upgraded without consuming an upgrade point

### L4-05 · Assassin and multiple attacks — `Done`

Several attack cards count as a single action. Each attack targets freely and keeps its own independent resolution.

- **Reference** Rules spec §4 · Spec §5.2 · **Depends on** L4-04 · **Complexity** L · **Risk** Medium
- **Watch point** Stays within the 30s turn: this is not a sub-choice. Each attack creates its own pendingEffect.
- **Acceptance** 3 attacks played in one turn, independent resolutions

## Lot 5 · Special cards

### L5-01 · Special card model — `Done`

Single use, not purchasable individually, upgrade lost on use, joins the pool after use.

- **Reference** Rules spec §5 · **Depends on** L4-02 · **Complexity** M · **Risk** Low
- **Acceptance** A used card permanently disappears from the hand

### L5-02 · Internal counters — `Done`

Points Generator 3, Imposition 2. Decrements by 1 each time the user loses a life to damage. At 0, the card deactivates and is lost.

- **Reference** Rules spec §5 · **Depends on** L5-01, L0-04 · **Complexity** M · **Risk** High
- **Watch point** The counter does not protect the user. Only applyDamage decrements it, never applyLifeLoss.
- **Acceptance** A tax does not decrement the counter, an attack does

### L5-03 · Suicide — `Done`

Base: the user is eliminated on their next turn, all opponents lose 5 lives and all their points. Upgraded: the user survives. Both: user is eliminator of opponents killed (rewards Lot 6).

- **Reference** Rules spec §5 · **Depends on** L5-01 · **Complexity** L · **Risk** High
- **Watch point** Life loss outside of attack. Each opponent plays one turn before the user's next turn: every effect resolves before their elimination.
- **Acceptance** Partial case tested: 2 of 3 opponents eliminated, the user dies afterward

### L5-04 · Spy Thief — `Done`

Steals all points from all opponents with no cap and spies on all of them. Upgraded: points doubled and all resources visible.

- **Reference** Rules spec §5 · **Depends on** L3-05, L4-03 · **Complexity** M · **Risk** Medium
- **Watch point** Untouchable is not immune to Spy Thief (decision #6 closed). Not counterable; not blocked by upgraded Shield.
- **Acceptance** Theft and spying applied to all opponents simultaneously

### L5-05 · Imposition — `Done`

Each opponent cedes 2 points per turn, or 1 life if they don't have enough, which the user gains. Upgraded: 4 points or 2 lives.

- **Reference** Rules spec §5 · **Depends on** L5-02 · **Complexity** M · **Risk** Medium
- **Watch point** Periodic effect triggered on the target's turn, after their action. The life gain is subject to the 25-life cap.
- **Acceptance** Target with 1 point: they cede 1 life, the user gains it

### L5-06 · Cloning — `Done`

Full state replacement with an opponent's. Cancels pending effects against the user, inherits none from the target, resets visibility to zero both ways.

- **Reference** Rules spec §5 · **Depends on** L3-05, L4-01 · **Complexity** L · **Risk** High
- **Watch point** The clone inherits the kit, therefore its traits. Upgraded version: +10 points, +2 upgrade points, +4 lives, 25-cap applied. Copies target `activePersistentEffects`.
- **Acceptance** Visibility wiped both ways, incoming effects queue cleared

### L5-07 · Sentence — `Done`

Eliminates a randomly drawn player among everyone in the game, user included. Upgraded: the user is excluded from the draw.

- **Reference** Rules spec §5 · **Depends on** L0-05, L5-01 · **Complexity** M · **Risk** Medium
- **Watch point** Self-elimination: no reward for anyone, cards to the pool.
- **Acceptance** Reproducible draw with a fixed seed, self-targeting possible in the base version

### L5-08 · Points Generator — `Done`

2 points per turn, 4 in the upgraded version, as long as the internal counter isn't depleted.

- **Reference** Rules spec §5 · **Depends on** L5-02 · **Complexity** S · **Risk** Low
- **Acceptance** Gain on the user's turn, stops at zero counter

### L5-09 · Special card purchase — `Done`

20 points, random draw restricted to the 6 special cards in the V1 lot.

- **Reference** Rules spec §5 · Spec §6.2 · **Depends on** L5-01, L0-05 · **Complexity** S · **Risk** Low
- **Watch point** V1 scope restriction, not a game rule. Do not draw from the full 20-card list.
- **Acceptance** Only the 6 cards in the lot can come out of the draw

## Lot 6 · Elimination

### L6-01 · Elimination rewards — `Done`

The eliminator picks 2 rewards among: 4 lives, 8 points, a card from the eliminated player, an upgrade point. Both choices can be identical.

- **Reference** Rules spec §6 · **Depends on** L1-13 · **Complexity** M · **Risk** Medium
- **Watch point** The life gain is subject to the 25-life cap.
- **Acceptance** Both choices applied correctly, card transferred if chosen

### L6-02 · Multiple elimination — `Done`

2 rewards per eliminated player, cumulative, choices chainable.

- **Reference** Rules spec §6 · Spec §6.2 · **Depends on** L6-01 · **Complexity** M · **Risk** Medium
- **Watch point** Upgraded Suicide can trigger several at once: up to 6 choices in a row at 4 players.
- **Acceptance** Full choice sequence playable without getting stuck

### L6-03 · Reward sub-choice — `Done`

20s timer per choice. On expiry: 2 × 4 lives granted by default.

- **Reference** Spec §5.5 · §5.6 · **Depends on** L6-02 · **Complexity** M · **Risk** Low
- **Watch point** Never silently waste an already-paid card.
- **Acceptance** On expiry, lives are granted with no intervention

### L6-04 · Elimination without an eliminator — `Done`

Tax's life cost, self-targeted Sentence, non-upgraded Suicide, elimination by absence: no reward, cards to the pool.

- **Reference** Rules spec §6 · **Depends on** L6-01, L2-06 · **Complexity** S · **Risk** Low
- **Acceptance** No player receives a reward, the pool receives the cards

### L6-05 · Simultaneous eliminators — `Done`

Reward goes to the eliminator with the fewest remaining lives, then fewest points, then a random draw among ties.

- **Reference** Rules spec §6 · **Depends on** L6-01, L0-05 · **Complexity** M · **Risk** Medium
- **Watch point** Italicized clause in the spec: status to confirm (validated rule or hypothesis). See Open decisions tab.
- **Acceptance** Correct tie-break in all three scenarios

## Lot 7 · Robustness

### L7-01 · Reconnection window — `Done`

60 seconds triggered the instant of disconnection, in real time, independent of the current turn. Reconnection before expiry: no effect.

- **Reference** Spec §5.7 · **Depends on** L1-13 · **Complexity** M · **Risk** Medium
- **Watch point** The counter starts at disconnection, not at the player's turn.
- **Acceptance** 40s disconnection then reconnection: no consequence

### L7-02 · Absent player — `Done`

Beyond 60s: immediate draw on each of their turns, without waiting the 30s. Elimination after 3 automatic turns, no reward. Remains a valid target.

- **Reference** Spec §5.7 · **Depends on** L7-01, L6-04 · **Complexity** M · **Risk** Medium
- **Watch point** Any reconnection resets both the 60-second window and the 3-turn counter.
- **Acceptance** Elimination on the 3rd automatic turn, cards to the pool

### L7-03 · Connected inactivity — `Done`

The 30-second timer expires, the player draws. Elimination after 5 consecutive expired turns.

- **Reference** Spec §5.7 · **Depends on** L7-02 · **Complexity** S · **Risk** Low
- **Watch point** Independent mechanism from disconnection, threshold deliberately higher.
- **Acceptance** Elimination on the 5th consecutive expired turn

### L7-04 · Win by forfeit — `Done`

At 2 players, elimination by absence or inactivity gives the win to the remaining player.

- **Reference** Spec §5.7 · **Depends on** L7-03 · **Complexity** S · **Risk** Low
- **Acceptance** Game end correctly declared

### L7-05 · 3 and 4-player games — `Done`

Full playthroughs with the 4 kits, special cards, disconnections, and sub-choices.

- **Reference** Spec §1 · **Depends on** L7-04, L5-09 · **Complexity** L · **Risk** High
- **Watch point** Central goal of V1: a 4-player game plays start to finish without getting stuck.
- **Acceptance** Three 4-player games completed with no stuck state or inconsistency
- **Note** Verified 2026-07-31 (Playwright): rooms `RXAFII`, `MJXLKL`, `IIFWJS` (4p draws + Leave
  forfeit elim). Lifecycle spot-check room `BFIOVB` (disconnect badge, absent, win by forfeit).
  Also fixed consecutive-absent stack overflow (`setTimeout(0)` defer).

## Lot 8 · Game log

### L8-01 · Log schema — `Done`

Table of finished games: kits distributed, winner, turn count, cards played per player, eliminations and their cause, final resources.

- **Reference** Spec §3 · **Depends on** L7-05 · **Complexity** M · **Risk** High
- **Watch point** Define this BEFORE the first playtests. A game not logged is lost forever for balancing.
- **Acceptance** The schema covers the metrics needed for the future balancing work

### L8-02 · End-of-game write — `Done`

One single Postgres write, at the end of each game. Never the state of an in-progress game.

- **Reference** Spec §3 · **Depends on** L8-01 · **Complexity** S · **Risk** Medium
- **Watch point** A write failure must never interrupt or invalidate the game.
- **Acceptance** The game writes once, in-progress state is never persisted

## Lot 9 · Polish

### L9-01 · Visible degraded states — `Done`

Absent player, automatic-turn counter before elimination, turn and sub-choice timers.

- **Reference** Spec §7 · **Depends on** L7-03 · **Complexity** M · **Risk** Low
- **Acceptance** States are readable without opening the console
- **Note** Pulled forward into Lot 7 playtest readiness (PROTOCOL_VERSION 17 `connection` on `PublicPlayerView`).

### L9-02 · Browsable action log — `Done`

Complete history since the start of the game, including card identity, purchases and upgrades included.

- **Reference** Spec §7 · **Depends on** L1-12 · **Complexity** M · **Risk** Medium
- **Watch point** Every action is public: the log is the players' primary source of information.
- **Acceptance** A player can browse the entire game's history
- **Note** `ActionLogEntryView` discriminated union (`actionPlayed` / `actionResolved` /
  `playerEliminated` / `mirrorRedirected` / `rewardsClaimed`); `rewardsClaimed` stays opaque
  (no reward picks — product ruling). Client: `apps/client/src/action-log/`. Commit `166a99f`.
  PROTOCOL_VERSION 18. See `agent/decisions.md` 2026-08-01. **V2 restyles this component; the
  logic and wire shape do not change** (Lot 12, L12-05).

### L9-03 · End screen — `Done`

Winner and game recap, return to home.

- **Reference** Spec §7 · **Depends on** L1-13 · **Complexity** S · **Risk** Low
- **Acceptance** Screen displayed at game end, return to home works
- **Note** `FinishedStateView.recap` (turnSequence, per-player public counts, eliminations); kits
  and exact final resources stay private at game over. Commit `64a84c2`, polish `9e227d4`. See
  `agent/decisions.md` 2026-08-01. **V2 restyles this screen; the data it renders does not
  change** (Lot 13, L13-01).

# V2 — Visual design

> V1 (above) is complete and closed: 63/63 tasks, engine and protocol frozen except where a
> V2 task explicitly says otherwise. Everything below is scoped by `docs/technical_spec_v2.md`,
> validated with the developer 2026-08-01. **Same 4 screens, same client-server contract, same
> audience (friends, web only) — no new rule, card, kit, mode, or screen.** A V2 task that
> looks like it needs a new protocol event or a rule change is out of bounds: stop and ask,
> same discipline as V1 golden rule 6.

**V2-specific watch points**

- There is no automated test for "looks good." Definition of Done for a V2 task is `pnpm verify`
  green (nothing about styling breaks typecheck/lint/existing tests) **plus** a visual check
  the developer signs off on — screenshots or a live look, not just green CI.
- The illustration/icon assets already exist in the `images/` folder (outside this repo) — see
  `technical_spec_v2.md` §4 for the confirmed mapping. **Never invent a mapping for an
  ambiguous or missing asset** — the Absorber/Absorption and Kamikaze-portrait questions in this
  session are exactly that kind of trap. Ask.
- `docs/agent/frontend.md` stays the live reference for client conventions (connection hook,
  visibility rules, degraded states). V2 tasks restyle; they update that file's examples in
  place rather than forking a second source of truth.

## Lot 10 · V2 design system foundations

### L10-01 · Tailwind and Motion setup — `To do`

Add Tailwind CSS and Motion (`motion` package, formerly Framer Motion) to `apps/client` via
`pnpm add`, base Tailwind config, confirm the Vite build and `pnpm verify` stay green.

- **Reference** Technical spec v2 §3 · **Depends on** nothing (V1 complete) · **Complexity** S · **Risk** Low
- **Watch point** Dependency additions must go through `pnpm add` so the lockfile updates — never hand-edit `package.json` (AGENTS.md §3).
- **Acceptance** `pnpm dev`, `pnpm typecheck`, `pnpm lint` all pass with Tailwind classes and one trivial Motion animation rendering in the client

### L10-02 · Design tokens from source assets — `To do`

Extract a color palette and typography scale from the existing illustrations and generic
assets (resource icons, colored buttons, card backs), encode them as the Tailwind theme.

- **Reference** Technical spec v2 §5 · **Depends on** L10-01 · **Complexity** M · **Risk** Medium
- **Watch point** This is a subjective creative decision, not a derivable rule — **no palette
  ships without the developer looking at it and saying yes.** Do not present it as a fait accompli in a commit message.
- **Acceptance** Tailwind theme config committed; developer has reviewed and approved the palette/type scale against the real assets

### L10-03 · Asset pipeline and mapping table — `To do`

Copy the confirmed V1 subset of illustrations into `apps/client/src/assets/`, build a typed
lookup (`KitId` → portrait, `CardId` → base/upgraded/activated art) from the mapping table in
technical spec v2 §4, including the `scientific → Scientist.png` and `absorber → Absorption.png`
mappings decided in this session.

- **Reference** Technical spec v2 §4 · **Depends on** L10-01 · **Complexity** M · **Risk** High
- **Watch point** A wrong or guessed mapping puts incorrect art on a card every kit can hold — silent, and nobody will report a bug for "wrong flavor art." Only wire the confirmed table; leave any still-unconfirmed entry as an explicit placeholder, not a guess.
- **Acceptance** Every V1 `CardId` and `KitId` resolves to the correct file at both upgrade states where they exist; no import of an out-of-V1-scope asset (the other 11 kits, non-V1 cards)

### L10-04 · Base components — `To do`

`Card`, `ResourceIcon` (life / point / shield / upgrade point), `Button`, connection/status
badge — built once, reused by every screen.

- **Reference** Technical spec v2 §5 · **Depends on** L10-02, L10-03 · **Complexity** M · **Risk** Low
- **Acceptance** Home, Lobby, Table and End all consume these components — no screen redefines its own card or icon markup

### L10-05 · Generic elimination treatment — `To do`

One visual treatment (not per-kit art) applied to any eliminated player's portrait — developer
ruling 2026-08-01: no "(dead)" illustration per kit, including Kamikaze, which has none today.

- **Reference** Technical spec v2 §2 · **Depends on** L10-04 · **Complexity** S · **Risk** Low
- **Acceptance** An eliminated player of any V1 kit renders the same generic treatment; no code path looks for a per-kit dead asset

## Lot 11 · V2 Home and Lobby

### L11-01 · Home screen redesign — `To do`

Nickname entry, create/join, using the Lot 10 component set. Same intents, same validation,
no new field.

- **Reference** Technical spec v2 §6 · rules spec/tech spec v1 §7 (screen: Home) · **Depends on** L10-04 · **Complexity** M · **Risk** Low
- **Acceptance** Create and join both work exactly as today, visually redesigned

### L11-02 · Lobby screen redesign — `To do`

Seated players, game code (with copy affordance), host Start — restyled.

- **Reference** Technical spec v2 §6 · tech spec v1 §7 (screen: Lobby) · **Depends on** L11-01 · **Complexity** S · **Risk** Low
- **Acceptance** 2–4 player lobby flow unchanged functionally, visually redesigned

## Lot 12 · V2 Table

### L12-01 · Table layout shell — `To do`

Overall structure: opponents band, private zone, log panel, action bar, pending-effects queue,
timers — responsive to 2, 3, and 4 seated players.

- **Reference** Technical spec v2 §6 · tech spec v1 §7 (Table) · **Depends on** L10-04 · **Complexity** L · **Risk** Medium
- **Watch point** The action log is the screen's main organ (AGENTS.md §L1-12 watch point) — the redesign must not demote it to a sidebar.
- **Acceptance** All existing Table zones present and legible at 2, 3, and 4 players

### L12-02 · Opponent zone — `To do`

Nickname, lives/shield/status via `ResourceIcon`, card count, connection badges (reuse L9-01
states), Spy-revealed kit/cards.

- **Reference** Technical spec v2 §4, §6 · frontend.md (visibility, degraded states) · **Depends on** L12-01 · **Complexity** M · **Risk** Medium
- **Watch point** Zero rule logic on the client (AGENTS.md §"Conventions") — this restyles what `stateUpdate` already sends, it does not decide what is visible.
- **Acceptance** Every opponent-zone field the current client shows is still shown, same visibility rules, new look

### L12-03 · Private zone and hand — `To do`

Hand with real card illustrations (base/upgraded art swap), kit portrait, exact resources via
icons, special cards.

- **Reference** Technical spec v2 §4, §6 · **Depends on** L10-03, L12-01 · **Complexity** M · **Risk** Medium
- **Watch point** Upgrade state must select the `+` asset variant, never a manual per-card `if` — reuse the L10-03 lookup.
- **Acceptance** Every held card shows the correct base/upgraded illustration; kit portrait matches `kitId`

### L12-04 · Pending effects queue — `To do`

Visual queue of effects in flight (source, card, target), restyled.

- **Reference** Technical spec v2 §6 · tech spec v1 §7 (Pending effects queue) · **Depends on** L12-01 · **Complexity** S · **Risk** Low
- **Acceptance** Same information as today's queue, new look

### L12-05 · Action log panel restyle — `To do`

Reskin `apps/client/src/action-log/action-log-panel.tsx` (L9-02) with the Lot 10 components.
No change to `action-log.ts` logic or the `ActionLogEntryView` shape.

- **Reference** Technical spec v2 §6 · **Depends on** L10-04 · **Complexity** M · **Risk** Low
- **Watch point** `rewardsClaimed` stays opaque (product ruling, decisions.md 2026-08-01) — the restyle must not surface the two reward picks.
- **Acceptance** Same browsable history, same entry kinds, new look; `action-log.test.ts` unchanged and green

### L12-06 · Action bar and target selection — `To do`

Play / buy / sell / upgrade / draw, target picker, quantity picker (Regeneration), Assassin
multi-select, Mirror sub-choice, elimination reward sub-choice — all restyled.

- **Reference** Technical spec v2 §6, §7 · frontend.md (playCard variants, Assassin, Mirror, rewards) · **Depends on** L12-01, L10-04 · **Complexity** L · **Risk** Medium
- **Watch point** Every one of these interactions has a specific payload shape (frontend.md) — restyle the control, never the payload it sends.
- **Acceptance** Every action variant listed in `frontend.md`'s Conventions section still sends the exact same intent it does today

### L12-07 · Timers and degraded states — `To do`

Turn timer and sub-choice timer as a visual progress element; absent/idle badges restyled per
existing conventions.

- **Reference** Technical spec v2 §6 · frontend.md (Timer display, Degraded states) · **Depends on** L12-01 · **Complexity** M · **Risk** Medium
- **Watch point** The timer display stays cosmetic — trust `turnDeadlineMs` / `deadlineMs` from the server, never a client-only authority (frontend.md, unchanged rule).
- **Acceptance** Same timer behavior and degraded-state thresholds as today, new visual treatment

## Lot 13 · V2 End screen

### L13-01 · End screen redesign — `To do`

Restyle the L9-03 output: winner, `FinishedStateView.recap`, return-home action.

- **Reference** Technical spec v2 §6 · **Depends on** L10-04 · **Complexity** S · **Risk** Low
- **Acceptance** Same recap data displayed, new look; no change to `build-view-for.ts`

## Lot 14 · V2 Animation

### L14-01 · Card flip and reveal — `To do`

Hand entry, upgrade-state reveal, play-to-table motion.

- **Reference** Technical spec v2 §7 · **Depends on** L10-01, L12-03 · **Complexity** M · **Risk** Low
- **Watch point** Purely presentational — must not delay or block the intent being sent to the server.
- **Acceptance** Animation plays on the actions it targets, never blocks or delays the underlying intent

### L14-02 · Action-resolution animation — `To do`

Visual effect tied to `actionResolved.outcome` (`applied` / `cancelled` / `immune`).

- **Reference** Technical spec v2 §7 · frontend.md (`actionResolved.outcome === 'immune'`) · **Depends on** L14-01, L12-04 · **Complexity** M · **Risk** Medium
- **Watch point** Three distinct outcomes need three distinct, honest visual treatments — do not animate `cancelled` or `immune` as if the effect landed.
- **Acceptance** Each of the three outcomes has a visibly distinct animation

### L14-03 · Elimination and reward-sequence animation — `To do`

Elimination moment, then the reward sub-choice sequence (chainable at multi-elimination).

- **Reference** Technical spec v2 §7 · frontend.md (Elimination rewards) · **Depends on** L14-02 · **Complexity** L · **Risk** Medium
- **Watch point** Must stay correct through a chained multi-elimination (up to 6 choices in a row at 4 players, per L6-02) — test the animation at the edge case, not just a single elimination.
- **Acceptance** A multi-elimination sequence animates every step without getting visually stuck, matching the underlying prompt/lock state

### L14-04 · Mirror and Assassin animation — `To do`

Mirror redirect sub-choice, Assassin multi-attack targeting.

- **Reference** Technical spec v2 §7 · frontend.md (Mirror, Assassin) · **Depends on** L14-02 · **Complexity** M · **Risk** Low
- **Acceptance** Both interactions remain fully usable within their existing timers with the animation on

### L14-05 · Timer motion — `To do`

Motion polish for the turn and sub-choice timers (e.g. a depleting ring/bar), on top of L12-07's
static treatment.

- **Reference** Technical spec v2 §7 · **Depends on** L12-07, L10-01 · **Complexity** S · **Risk** Low
- **Watch point** Cosmetic only — the countdown must still derive from server `deadlineMs`, never drift into a client-authoritative timer.
- **Acceptance** Visual countdown matches the server deadline within a small, imperceptible tolerance
