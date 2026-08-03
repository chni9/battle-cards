# Technical spec — Card Battle, version 3 (Bots, solo mode, simulation)

> Implementation document for V3. It defines **no game rule** and changes no rule, no card, no
> kit, and no mode. Refer to `technical_spec_v1.md` (engine, protocol, Definition of Done —
> still authoritative), `technical_spec_v2.md` (visual layer), and
> `spec_bataille_des_cartes_en.md` (rules) for everything this document does not cover.
> V1 was complete (63/63) and V2 complete (22/22) before this document was written.
>
> Scoped with the developer on 2026-08-03. Four decisions were taken in that session and are
> recorded in §2.1. Everything else marked **undefined** in §11 must be ruled before the task
> that depends on it starts. Where this document proposes a number (a weight, a delay, a noise
> rate), it is labelled a **tunable default** — an invention to be replaced by measurement,
> never a validated value.

---

## 1. Objective and non-objectives

### Objective

Make the game playable alone against heuristic opponents, let a host fill empty lobby seats
with those same opponents, and — using the same decision code with no room and no timers —
run games in batch so the balance work deferred since V1 can finally start.

What V3 has to prove:

- a seat in `GameState.players` no longer needs a Colyseus `Client` behind it
- the engine can answer *"what may this player legally do right now?"* as a first-class query,
  which `technical_spec_v1.md` §3 already committed to and which does not exist in the code today
- a bot restricted to the same `PlayingStateView` a human receives can play a complete game,
  including every sub-choice, without stalling on a timeout
- a batch of games can be replayed from a seed and produce comparable aggregate output

### Non-objectives

- **No game rule, card, kit, or mode is added or changed.** The 11 other kits and Team / God /
  Quick modes stay out (technical spec v1 §9, golden rule 7). A bot that plays badly is a bot
  problem; it is never grounds for touching a rule.
- **No learning, no search, no tree.** Heuristic only: one scoring pass over enumerated legal
  actions, no lookahead, no opponent modelling beyond what §4.4 lists.
- **No bot vision beyond the player view.** A bot never reads `GameState` directly. See §2.1.
- **No accounts, no matchmaking, no persistence of an in-progress game, no monetization.**
- **No new visual identity work.** V3 reuses V2's design system as-is. New UI is confined to
  the additions in §5 and §6, built from existing components (`Button`, `Dialog`).
- **No rebalancing decision is made in V3.** V3 delivers the instrument. Reading it and ruling
  on the Duplicator / Suicide / Cloning notes in `technical_spec_v1.md` Appendix A is a later,
  human-owned pass.

---

## 2. V3 scope

Three pillars, deliberately sequenced so each is shippable without the next:

1. **Bot foundations** — seat abstraction, legal-action enumerator, decision policy,
   difficulty. No UI. Provable entirely in Vitest.
2. **Playable surfaces** — solo mode and bots in a multiplayer lobby, on top of a
   foundation that already passes its tests.
3. **Headless simulation runner** — a CLI driving the same policy with no room, no sockets,
   no timers, writing aggregate results.

Pillar 3 depends on pillar 1 only, not on pillar 2. If the UI work slips, the balance
instrument still lands.

### 2.1 Decisions taken 2026-08-03

| # | Decision | Consequence |
|---|---|---|
| 1 | **A bot is a virtual seat inside `GameRoom`**, with no Colyseus `Client`. | Seat identity must be decoupled from `Client`; every `client.send` on a sub-choice path needs a bot branch (§4.6). Rejected: headless client processes over WebSocket — a solo game would open N sockets to localhost and the policy would be untestable without a running server. |
| 2 | **A bot decides from the same `PlayingStateView` a human receives.** | `buildPlayingViewFor` is the bot's only window. Spy and bluffing keep their meaning. Cost: the bot is weaker, and difficulty may not come from extra information (§4.5). Made cheap by the invariant in §10.1. |
| 3 | **V3 ships both the solo mode and the headless batch runner.** | One policy, two drivers. A bot observable only at human pace produces roughly one game per five minutes, which cannot answer the questions in the balance notes. |
| 4 | **One heuristic degraded by noise.** | A single scoring function. A difficulty tier is one number: the probability of discarding the top-scored action in favour of a uniformly random legal one. Rejected: three authored policies (three things to maintain and test, and tiers that stop being comparable in the simulator). |

---

## 3. What exists, and what has to be built

Audited against the code on 2026-08-03. This section exists so no V3 task starts by
rediscovering it.

### 3.1 Already in place and reusable unchanged

| Asset | Where | Why it matters |
|---|---|---|
| Pure turn functions | `performTurnAction`, `completeMirrorChoice`, `expireMirrorChoice`, `completeEliminationRewardChoice`, `expireEliminationRewardChoice` | Operate on a plain `GameState`. No Colyseus, no timers, no I/O. The simulator can call them directly. **One caveat, see §8.1:** two of them transitively read `Date.now()`. And `expireMirrorChoice(state, rng)` requires its `rng` — the other two default theirs. |
| Per-recipient view builder | `buildPlayingViewFor({ recipientSessionId, gameCode, state, turnDeadlineMs, actionLog })` | Already the exact contract decision 2 needs. |
| Seeded RNG | `createRng(seed)`, `state.seed` | Golden rule 5 already forces determinism through it. Bot noise must go through it too (§4.5). |
| Per-card legality predicate | `CardHandler.canPlay(context)` | The building block of the enumerator. |
| Deterministic setup | `createInitialState({ seats, seed, rng })` | Seed and RNG are already injectable. |
| Sub-choice defaults on expiry | `expireMirrorChoice`, `applyDefaultEliminationRewards` | A bot that fails to answer degrades to a defined outcome rather than deadlocking. Safety net, not the design. |
| Deferred re-entry pattern | `beginTurnOrAbsentAutoPlay` uses `setTimeout(0)` before `runAbsentAutoDraw` | Precedent for the consecutive-bot-turn recursion problem (§4.7). |

### 3.2 Missing, and therefore V3 work

| Gap | Detail |
|---|---|
| **No legal-action enumerator** | `technical_spec_v1.md` §3 promises `(game state, legal actions) → chosen action`. Nothing enumerates: no target enumeration, no Regeneration quantity enumeration, no Assassin attack-subset generation, no buyable-card list. This is the largest single piece of V3 (§4.3). |
| **Seats are Colyseus clients** | `onJoin` pushes `{ sessionId, nickname }` from a `Client`; `canStartGame` counts `this.seats.length`; `maxClients = MAX_PLAYERS`. A seat with no socket has no representation. |
| **Sub-choice prompts are `client.send`** | `beginMirrorTimer(client, …)` takes a `GameClient`. `sendRewardChoiceRequired` does `this.clients.find(…)` and **returns silently when not found** — today a bot eliminator would simply never be prompted and would default to `2 × 4 lives` after 20 seconds of real time. Silent, and wrong. |
| **Nothing distinguishes a bot in the protocol** | `LobbySeatView` and `PublicPlayerView` have no `isBot`. A human cannot tell who is a bot. |
| **Nothing distinguishes a bot game in Postgres** | `finished_games` / `finished_game_players` have no bot marker. Every future balance query over that table would silently mix human and bot games — the exact table whose stated purpose is balance analysis. |
| **Kit assignment cannot be controlled** | `makePlayer` does `rng.pick(KIT_IDS)` **with replacement**. Four Kamikaze in one game is legal. Uncontrolled, per-matchup sample sizes in the simulator would be worthless. |
| **No batch driver** | Nothing runs a game without a room. |

---

## 4. Architecture

All server-side. `apps/client` gains no rule logic and no decision logic (`AGENTS.md` §4).

### 4.1 Seat model

Replace `Seat` in `game-room.ts` with a discriminated union in a new
`apps/server/src/rooms/seats.ts`:

```
type Seat = HumanSeat | BotSeat

HumanSeat  { kind: 'human'; sessionId: string; nickname: string }
BotSeat    { kind: 'bot';   sessionId: string; nickname: string; difficulty: BotDifficulty }
```

Rules this model must satisfy:

- **`sessionId` stays the single player identity** throughout `GameState`, the protocol, the
  action log, and Postgres. A bot's `sessionId` is server-generated, prefixed `bot-`, and must
  be unique within the room. Nothing downstream needs to change shape.
- **Occupancy is `seats.length`, not `this.clients.length`.** Capacity stays `MAX_PLAYERS = 4`
  total across humans and bots. Adding a bot consumes a human slot; the room locks when
  `seats.length >= MAX_PLAYERS` and unlocks when a bot is removed below it.
- **`canStartGame` counts total seats.** `MIN_PLAYERS_TO_START = 2` is unchanged: solo mode
  satisfies it with one human and one bot, and `createInitialState` still receives ≥ 2 seats.
- **Bot nicknames must not collide** with a seated human's nickname or another bot's.
- **Only the host may add, remove, or re-configure a bot**, and only before the game starts —
  same gate and same rejection shape as `canStartGame`. Kept pure in `lobby-rules.ts` so the
  reject cases are unit-tested without a room, exactly as `canStartGame` is today.
- **A bot's `connectionState` is permanently `connected`.** It is never `disconnected` or
  `absent`; `onDrop` / `onLeave` / `markAbsent` / `scheduleAbsentTransition` never see a bot
  because no client maps to it. This must be asserted by a test, not assumed.
- **When the last human seat leaves, the room ends.** Undefined today, and a real hazard: a
  solo game whose human leaves would otherwise keep three bots playing to completion in an
  empty room, then write a finished game to Postgres. See §11, open decision #V3-3.

### 4.2 Where a bot is driven from

One new module, `apps/server/src/bots/bot-driver.ts`, owning the room-side lifecycle. It is
the only place that knows a seat is a bot.

```
onTurnStarted(activePlayerId)
  └─ seat is bot?
       ├─ no  → beginTurnTimer(TURN_DURATION_MS)          (unchanged path)
       └─ yes → setTimeout(BOT_THINK_MS) → decideAndAct()
                 └─ watchdog: if decideAndAct throws or
                    produces nothing legal → performAutoDraw()
```

- **No 30-second turn timer is armed for a bot seat.** `beginTurnOrAbsentAutoPlay` gains a bot
  branch before its `connected` branch. The inactivity counters
  (`CONNECTED_TIMEOUT_LIMIT = 5`) must never advance for a bot.
- **A bot action goes through `handleAction`'s validation path, not around it.** Same
  `actionTakenThisTurn` guard, same `performTurnAction` call, same `applyTurnResult`. A bot is
  not a privileged caller. The server stays authoritative over its own bots (golden rule 8).
- **`BOT_THINK_MS` is a tunable default: 900 ms**, env-overridable and **0 in the simulator**.
  Follow `TURN_DURATION_MS`'s *shape* but not its clamp: that one silently falls back to its
  default for any value below 5 000 ms, which would reject every sensible bot delay. Not
  cosmetic — V2's Lot 14 animations are driven by
  `actionPlayed` / `actionResolved` broadcasts, and three bots acting inside 50 ms would give
  the human nothing to watch.
- **Any throw inside the policy degrades to `draw`.** `draw` is unconditionally legal (§4.3),
  so a fallback always exists. A bot must never be the reason a room stalls.

### 4.3 Legal-action enumerator

New module `apps/server/src/engine/turn/list-legal-actions.ts`. This is the interface
`technical_spec_v1.md` §3 committed to, and it is engine code — not bot code. The simulator,
the bot, and (later, optionally) the client's "why is this greyed out" tooltips all read it.

```
listLegalActions(state: GameState, playerId: string): readonly TurnAction[]
```

Returns the existing `TurnAction` union from `perform-action.ts` — no new action type. The
contract:

1. **Every returned action must be accepted by `performTurnAction`.** No returned action may be
   rejected. Guarded by a property test (§10.2).
2. **`{ type: 'draw' }` is always present.** It has no cost and no precondition, so the list
   is never empty and a fallback always exists.
3. **Legality is decided by calling the real validators, never by re-deriving them.**
   `handler.canPlay(context)` for plays, and the same resource checks the economy modules
   apply. A second copy of a legality rule is a second place for it to drift.
4. **`canPlay` alone is not sufficient for `playCard`.** The play-cost affordability gate is
   neither in `canPlay` nor in an economy module — it is **inline in `playCardAction`**
   (`perform-action.ts`): `getCard(cardId).cost.points`, then `actor.points < playPoints` →
   `'Not enough points.'`. An enumerator that filters by `canPlay` alone over-offers
   unaffordable plays and fails §10.2 for every points-cost card except Regeneration (which
   checks its own cost) and Tax (life cost, not gated at legality at all). Either extract that
   gate into a shared predicate both `playCardAction` and the enumerator call, or replicate it
   *and* have §10.2 prove the replication — the first is preferable, since rule 3's whole point
   is to have one copy.
5. **Enumeration is bounded** (see below). An unbounded list is a latent hang.

Two small code changes this module requires, neither of them behavioural:
`MAX_LIVES_PER_USE` in `handlers/regeneration.ts` is module-private and must be exported;
`attackDamageFor` takes an `AttackCardId` while `PendingEffectView.cardId` is the wider
`CardId`, so every call from view-derived data needs an explicit narrowing check rather than a
cast (`AGENTS.md` §6 — never cast to silence a strictness error).

What has to be enumerated, and the bound on each:

| Action | Enumeration | Bound |
|---|---|---|
| `draw` | Always. | 1 |
| `playCard` — targeted | Each held copy × each non-eliminated opponent, filtered by `canPlay`. | hand × 3 |
| `playCard` — self-only | Each held copy with `targetPlayerId` omitted, filtered by `canPlay`. | hand |
| `playCard` — Regeneration | `quantity` 1…4, filtered by `canPlay` (which already checks affordability at `pointsPerLife`). | 4 |
| `playMultipleAttacks` | **Assassin only** (`traits.allowsMultipleAttacksPerTurn`). Full subset × target enumeration is exponential and must not be written. | see below |
| `buyCard` | Each `SharedCardId` whose `buyCost` is payable. | 10 |
| `sellCard` | Each **hand** copy that resolves to a shared-card definition. Specials are not sellable (`sellCard` rejects them). | hand |
| `upgradeCard` | Each held hand or special copy with `isUpgraded === false`, when `upgradePoints >= 1`. | hand + specials |
| `buyUpgradePoint` / `sellUpgradePoint` | When affordable per `UPGRADE_POINT_ECONOMY`. | 2 |
| `buySpecialCard` | When `points >= SPECIAL_CARD_PURCHASE_COST` (20). | 1 |

**Assassin multi-attack — bounded generator, not enumeration.** Sizes 2 and 3 only, built
greedily rather than exhaustively: order held attacks by damage descending
(`attackDamageFor`), order opponents by the threat ranking of §4.4, then emit a small fixed
set of candidate combinations (highest-damage pair on the top-ranked target; highest-damage
pair split across the top two targets; the same for size 3 when affordable). The cap is a
**tunable default: at most 8 candidates**. Justification: `playMultipleAttacksAction` is
all-or-nothing and charges the sum of play costs, so most subsets are unaffordable anyway, and
the marginal value of the 9th candidate is not worth an exponential generator. Recorded as a
deliberate approximation — this is the one place V3 knowingly does not enumerate the full
legal space.

**A note on where this runs.** `listLegalActions` takes the real `GameState`, which appears to
contradict decision 2. It does not, and the reason is the invariant in §10.1: for the V1 card
set the legal set computed from truth is **identical** to the legal set computed from the
acting player's own view, because no `canPlay` reads hidden opponent state. The enumerator
therefore leaks nothing to its caller. §10.1 makes that a guarded invariant instead of a
coincidence.

### 4.4 Decision policy

New module `apps/server/src/bots/heuristic-policy.ts`.

```
decide(view: PlayingStateView, actions: readonly TurnAction[], rng: Rng): TurnAction
```

`view` is the sole information input — no `GameState` parameter, enforced by the signature.
Pure and synchronous. Same input, same `rng` seed, same output.

**Derived reads, all from `view` and nothing else:**

| Signal | How | Note |
|---|---|---|
| Own resources, hand, specials, kit | `view.self` | |
| Incoming threat | `view.pendingEffects` filtered on `targetPlayerId === view.you`, damage via `attackDamageFor(cardId, isUpgraded) × damageMultiplier` | Attack cards only; `damageMultiplier` carries upgraded-Mirror doubling. |
| Cumulative damage taken per opponent | Sum `livesLost` over `actionLog` entries of kind `actionResolved` with `outcome === 'applied'`, grouped by `targetPlayerId` | The honest substitute for hidden lives. Absolute lives are **not** knowable without Spy, because starting lives come from the hidden kit. |
| Spied opponents | `view.players[].spied` | When present, use real `lives` (upgraded Spy) or the frozen `resourcesSnapshot` (base Spy) instead of the proxy above, and say so in the log line. |
| Opponent shield up | `view.players[].activeShield` | Public signal (PROTOCOL 20 / #V3-0 kept): prefer a large hit or a non-attack card against a shielded seat rather than chipping into it. |
| Redirectable attack pending | A `listEligibleMirrorTargets`-equivalent read over `view.pendingEffects` | The existing function takes a `Player`, not a view, and returns pending *effects* rather than targets despite its name — so the policy needs its own view-side equivalent, filtering on attack `cardId` and (base Mirror) `isUpgraded === false`. The enumerator already gates Mirror's legality; the policy only needs to pick which effect and which new target. |

**Threat ranking of opponents** (used for every target choice): most cumulative damage taken
first; ties broken by fewest cards known held (Spy only, otherwise no signal); final tie broken
by `rng`. Never by seat order — a fixed tiebreak makes bots gang up on seat 0 and would poison
every simulator result.

**Scoring bands.** Scored, not hard-coded priority, so a single number tunes behaviour. Bands
are ordered by intent; the weights inside them are **tunable defaults and explicitly not
validated**:

1. **Lethal now** — an attack whose damage ≥ a *known* (Spy-confirmed) target's lives.
2. **Survive** — own lives ≤ incoming pending damage: Mirror if legal, else Shield, else
   Regeneration at the largest affordable quantity, else Cloning.
3. **Deny** — Absorber against an opponent whose last turn shows a large `livesLost` in the log;
   Thief against the opponent with the highest observed spending.
4. **Pressure** — best damage-per-point attack on the top-ranked target; Assassin multi-attack
   candidates scored as the sum of their parts minus the sum of their costs.
5. **Invest** — `upgradeCard` on the highest-damage attack held; `buyUpgradePoint`;
   `buyCard`; `buySpecialCard` only above a points floor, because it is a **20-point lottery**
   (`buySpecialCard` does `rng.pick(SPECIAL_CARD_IDS)` — the buyer cannot choose).
6. **Sustain** — `draw`; `Tax` only while lives are comfortably above the incoming threat,
   since it always costs 1 life.

**Kit-specific clauses, deliberately minimal:** Kamikaze never plays base `Suicide`
(self-elimination, and rules spec §6 gives no reward for it) — only the upgraded copy, and only
when it would eliminate at least one opponent under the Spy-confirmed or proxy estimate.
Untouchable's immunity to Thief and Spy is already handled by scoring: those cards resolve
`immune` against it, so their score against that target is zero once the kit is known.

### 4.5 Difficulty

```
type BotDifficulty = 'easy' | 'normal' | 'hard'
```

One axis: the probability of substituting a uniformly random legal action for the top-scored
one. **Tunable defaults:**

| Tier | Random-action rate |
|---|---|
| `easy` | 0.55 |
| `normal` | 0.20 |
| `hard` | 0.00 |

Constraints:

- **No tier gets extra information.** Every tier reads the same `PlayingStateView`
  (decision 2). A "cheating" tier was rejected because two tiers reading different inputs are
  not comparable in the simulator, which is the whole point of having the simulator.
- **Noise draws from the seeded generator**, derived per decision:
  `createRng(`${state.seed}:bot:${botId}:${state.turnSequence}`)` — the pattern
  `performTurnAction` already uses for its own default rng. A bot using `Math.random` breaks
  replay for the entire game (golden rule 5).
- **`hard` is not "good".** It is "this heuristic, undegraded". Naming it `hard` is a UX
  label, not a claim about strength. §8.3 depends on being honest about this.

### 4.6 Sub-choices

Bots must answer both sub-choices **synchronously and inline**, not by letting the timer
expire. Letting the default fire would be functionally survivable — `expireMirrorChoice` and
`applyDefaultEliminationRewards` exist — but it costs 20 seconds of real time per occurrence
in a played game, and in the simulator it would make every bot eliminator take `2 × 4 lives`
forever, silently flattening a real strategic decision out of the data.

| Sub-choice | Human path today | Bot path |
|---|---|---|
| Mirror redirect | `beginMirrorTimer(client, …)` → `client.send(MIRROR_CHOICE_REQUIRED)` → `chooseMirrorTarget` | No timer, no send. Driver calls `completeMirrorChoice(state, botId, pendingEffectId, newTargetPlayerId)` directly, with the effect and target chosen by the policy from `view.pendingEffects` and the §4.4 threat ranking. |
| Elimination reward | `sendRewardChoiceRequired` → `client.send(REWARD_CHOICE_REQUIRED)` → `chooseEliminationReward` | No timer, no send. Driver calls `completeEliminationRewardChoice(state, botId, eliminationId, [c1, c2])`. Card options come from `listAvailableRewardCards(state, eliminatedPlayerId)` — the same list the human is sent, so no extra information. |

Reward policy (**tunable defaults**): take the highest-damage attack available as a card when
one is present and affordable to use later; otherwise `lives` while below half of
`view` -known safety, otherwise `points`. Both picks may be identical (rules spec §6).

`sendRewardChoiceRequired`'s current silent `return` when no client matches must become an
explicit branch: bot seat → route to the driver; human seat with no client (dropped) → keep
today's behaviour and let the timer default. A silent no-op that happens to work for one case
and quietly misbehaves for another is exactly the class of bug golden rule 2 warns about.

### 4.7 Consecutive bot turns

Three bots and one human means up to three bot turns in a row. Each bot turn calls
`applyTurnResult` → `advanceTurn` → next seat is a bot → decide again. Synchronous recursion
here overflows the stack for the same reason `runAbsentAutoDraw` already documents.

Every bot turn must therefore be entered through a `setTimeout` — `BOT_THINK_MS` in a room,
`0` in the simulator — never by direct call from the previous turn's completion. Tested with a
four-bot room to prove no recursion and no dropped turn.

---

## 5. Solo mode

Solo mode is a **normal room with bots**, not a second engine and not an offline client. The
alternative — running the engine in the browser — was not considered seriously: it would put
rule logic on the client, which `AGENTS.md` §4 forbids outright, and would fork the engine.

Consequences, all of them positive and none of them new code paths: identical rules, identical
protocol, identical action log, identical finished-game write, and a solo game is reviewable in
exactly the same way as a multiplayer one.

**Home screen** gains a third path beside Create and Join: *Play solo*. It collects

- opponent count: 1, 2, or 3 (total seats 2–4, capped by `MAX_PLAYERS`)
- difficulty, applied to all opponents at once

then creates a room, seats that many bots, and starts immediately — the lobby is skipped. Per
opponent difficulty is deliberately not offered here; it is available in the lobby (§6) for
anyone who wants it, and offering it twice would be two UIs for one thing.

Built from V2's existing `Button` and `Dialog`. No new dependency, no new design token.

**The Table screen is unchanged**, except that bot seats are labelled (§7). No spectator mode,
no "watch bots play", no fast-forward, no pause.

---

## 6. Bots in a multiplayer lobby

Host-only, pre-start:

- **Add bot** — enabled while `seats.length < MAX_PLAYERS`. Appends a `BotSeat` at the chosen
  difficulty.
- **Remove bot** — per bot seat.
- **Change a bot's difficulty** — per bot seat, so a mixed lobby is possible.
- The `Players (n/4)` count and the seat list include bots, each marked as a bot with its
  difficulty visible to **everyone**, not only the host. A human must never be unable to tell
  whether an opponent is a bot.
- Adding a bot reduces the human slots available, and the room lock follows total occupancy
  (§4.1). A human joining by code when the lobby is bot-full is refused by the existing lock —
  no new rejection path.
- **Non-host clients see the bot seats but get no controls.** Rejection is server-side, as
  `START_GAME` already is; a hidden button is not validation (golden rule 8).

---

## 7. Protocol changes

V3 changes the client/server contract, so `PROTOCOL_VERSION` moves **20 → 21**. Unlike V2, this
is expected rather than a stop-and-ask (`technical_spec_v2.md` §1) — but it is still one bump
for the whole of V3, declared here, not one per lot.

> **Baseline (closed #V3-0, 2026-08-03).** V3 starts at PROTOCOL **20** (`activeShield` public —
> presence + upgrade tier; remaining points private). See `docs/agent/decisions.md`. L15-05
> bumps **20 → 21**.

**New client → server intents** (host-only, lobby-only, all revalidated server-side):

| Message | Payload |
|---|---|
| `addBot` | `{ difficulty: BotDifficulty }` |
| `removeBot` | `{ playerId: string }` |
| `setBotDifficulty` | `{ playerId: string; difficulty: BotDifficulty }` |

**Changed server → client views:**

| Type | Added field |
|---|---|
| `LobbySeatView` | `isBot: boolean`, `botDifficulty?: BotDifficulty` |
| `PublicPlayerView` | `isBot: boolean`, `botDifficulty?: BotDifficulty` |

`BotDifficulty` lives in `packages/shared/src/domain/bot.ts` — one definition, imported by both
sides (`AGENTS.md` §4). Solo mode needs **no** new intent: it is `create` plus N × `addBot`
plus `startGame`, which is also why solo mode inherits the existing validation for free.

**No new server → client event.** A bot's turn already produces `actionPlayed`,
`actionResolved`, `turnStarted`, `playerEliminated` exactly as a human's does. Nothing about a
bot's play needs a new wire event, and adding one would fork the client's rendering path.

---

## 8. Headless simulation runner

New app or package (see §11, open decision #V3-1): a CLI that runs games with no `GameRoom`, no
Colyseus, no sockets, no timers, no Postgres.

```
run(config) →
  createInitialState({ seats, seed, kitAssignment? })
  while no winner:
    actions = listLegalActions(state, state.currentTurnPlayerId)
    view    = buildPlayingViewFor({ recipientSessionId: current, … })
    action  = decide(view, actions, rng)
    result  = performTurnAction(state, current, action)
    if result.mirrorChoicePending  → completeMirrorChoice(…)
    if result.rewardChoicePending  → completeEliminationRewardChoice(…)
  emit one row
```

The loop is a faithful reproduction of `GameRoom`'s orchestration minus transport and timers.
That duplication is a real risk: the room and the simulator can drift, and then simulator
results describe a game nobody plays. Mitigation in §10.3 — a shared orchestration helper both
drivers call, so the sequencing exists once.

**Configuration:** number of games, player count, per-seat difficulty, base seed, optional
forced kit assignment, output path.

**Forced kit assignment is required, not optional.** `makePlayer` picks kits with
`rng.pick(KIT_IDS)` — **with replacement** — so a random batch gives uncontrolled and
unbalanced per-matchup sample sizes, and four-Kamikaze games. `createInitialState` gains an
optional `kitAssignment?: readonly KitId[]` (one entry per seat, in seat order) used by the
simulator and tests only. Production paths keep the existing random draw untouched.

**Output — one row per game**, JSONL or CSV. Where each field comes from, checked against the
snapshot builder rather than assumed:

| Field | Source |
|---|---|
| seed, winner, `turnSequence` | Already computed by `buildFinishedGameSnapshot` (game level) |
| Per-seat kit, final `lives` / `points` / `upgradePoints` / `shield` / `shieldIsUpgraded` | Already computed by `buildPlayerRecord` |
| Per-seat `cardsPlayedCount`, `cardsPlayedById`, `buyCount`, `sellCount`, `upgradeCount` | Already computed by `buildPlayerRecord` |
| Elimination order, eliminator, reason | **Not** a per-player metric. It is a third structure, `finished_game_eliminations`, which `buildFinishedGameSnapshot` passes through untouched from its `eliminations` input rather than computing. The runner must supply it itself, from `TurnResult.eliminations`. |
| Per-seat difficulty, seat count | **No existing counterpart at all.** New to V3 — see also §9's Postgres columns. |

So "reuse the snapshot builder" is accurate for the game-level and per-player metrics and
inaccurate for eliminations and difficulty. Reuse the first two; write the last two.

**Determinism is the acceptance criterion**: the same base seed and config must produce a
byte-identical output file. Without that, no result is checkable and no regression is
detectable. §8.1 is the reason that is not free today.

### 8.1 The determinism hole to close first

`performTurnAction` is not fully reproducible today. Two paths read the wall clock and write
the result **into `GameState`**: `handlers/mirror.ts` sets
`state.mirrorChoice.deadlineMs = Date.now() + MIRROR_SUB_CHOICE_MS`, and
`elimination-rewards.ts` does the same for `state.rewardChoice.deadlineMs`.

Neither is I/O and neither is a timer, so §3.1's claim about the turn functions holds in
substance — but a non-reproducible value lands in the authoritative state. The byte-identical
criterion above is unreachable if either field reaches an output row or a state hash, and
§10.3's equivalence test compares whole `GameState` objects, so it hits this too.

Two ways out, ruled as #V3-6: **inject a clock** into the two call sites (cleanest, makes the
whole engine replayable, touches two files), or **exclude both fields** from the runner's output
and from every comparison (cheaper, leaves a non-reproducible field in state, and the next
person to hash a `GameState` rediscovers this). Recommendation: inject the clock. A replayable
engine is worth more than two lines saved, and the exclusion route does not actually get §10.3
out of trouble.

### 8.2 What the runner does not write

Simulated games are **not** written to Postgres. The finished-game log exists to record real
games; a batch of 10 000 simulated games would make every future query start with an exclusion
clause. Batch output stays a file. (Games played in solo mode against bots *are* real games and
*are* written — see §9.)

### 8.3 What simulator output can and cannot prove

Stated plainly because this is where V3 is easiest to over-read.

**It can:** detect gross imbalance — a kit that wins far above its share across every
difficulty setting and every matchup; find rule combinations that hang, loop, or produce
absurd states; measure game length distribution; confirm no crash across thousands of games;
detect a regression when a rule is later changed.

**It cannot:** tell you a kit is *fairly* balanced. Self-play among instances of one mediocre
heuristic measures the heuristic at least as much as it measures the game. A kit that beats
this policy may lose badly to a human who exploits the policy's blind spots — and this policy
has known ones by construction: no lookahead, no bluffing, no opponent modelling, and a Mirror
choice that cannot anticipate a redirect chain.

Practical consequence: treat a 70 % win rate as *"look here"*, and treat a 55 % win rate as
*noise until proven otherwise*. Any rebalancing decision taken on the strength of a small
simulated edge would be a decision taken on the strength of the bot's weaknesses. The
hypotheses already flagged in `technical_spec_v1.md` Appendix A — upgraded Suicide's reward
cascade, Cloning as a cheap escape hatch, Spy devalued by fully public actions — are the ones
worth screening first, because each predicts a *gross* effect that this instrument can actually
see.

---

## 9. Persistence

Games played in a room — solo included — keep writing to Postgres once at game end
(`persistFinishedGame`). They are real games and belong in the log.

But they must be **distinguishable**, or the log stops being usable for its stated purpose.
Migration `002_bot_seats.sql`:

- `finished_games.has_bots boolean NOT NULL DEFAULT false`
- `finished_game_players.is_bot boolean NOT NULL DEFAULT false`
- `finished_game_players.bot_difficulty text NULL`

Explicit migration only, never auto-run on boot — the convention already recorded for
`001_finished_games.sql`.

Without this, the first balance query over `finished_games` after V3 ships silently averages
human games with games against `easy` bots, and no later migration can separate them
retroactively. The cost of adding three columns now is trivial; the cost of not having them is
that the entire pre-V3-plus-post-V3 dataset becomes uninterpretable.

---

## 10. Invariants and guard tests

Each of these encodes an assumption V3 depends on. Each gets a test whose failure is the point.

### 10.1 No card's legality depends on hidden opponent state

**Verified by audit, 2026-08-03**, across all 16 V1 handlers: every `canPlay` reads only the
presence of a target, the actor's own resources, or the actor's own pending effects. Combined
with `PlayingStateView.pendingEffects` being **global** in `buildPlayingViewFor`, this means the
legal set computed from `GameState` is identical to the legal set derivable from the acting
player's own view. It is what makes decision 2 nearly free.

It is also fragile. One future card whose `canPlay` reads a hidden opponent field — an
opponent's exact points, a hidden card count — silently turns `listLegalActions` into an
information leak, because a bot (or any client probing) could infer the hidden value from
whether an action is offered.

**Guard test:** for a fixture state, assert `listLegalActions(state, p)` equals the set
enumerated from `buildPlayingViewFor(p)` alone, for every player, across a spread of states
including active Spy relations. Failing this test is not a test bug — it means a card leaks and
needs a ruling.

Two related properties, worth recording while this is fresh: a rejected action does **not**
consume the turn (`handleAction` returns before setting `actionTakenThisTurn`), and rejection
messages differ by cause. Probing is therefore free for any client. Today that leaks nothing,
precisely because of the invariant above. If the invariant ever breaks, probing becomes an
exploit for humans too — not just bots.

### 10.2 Everything enumerated is accepted

Property test: for a spread of generated states, every action in `listLegalActions(state, p)`
must return `ok: true` from `performTurnAction` on a clone of that state. Catches both an
enumerator that over-offers and a validator that drifted from it.

### 10.3 Room and simulator sequence a turn identically

The room and the simulator both orchestrate: act → resolve → sub-choices → advance. Written
twice, they will diverge, and the divergence will be invisible until simulator conclusions stop
applying to real games.

Extract the sequencing into one helper both drivers call, and test that a scripted sequence of
actions produces an identical final `GameState` (same seed) whether driven through the room or
through the simulator.

### 10.4 A bot never blocks a room

Tests: a four-bot room plays to completion with no recursion and no stall; a bot whose policy
throws falls back to `draw` and the turn advances; no bot seat ever accumulates
`consecutiveTimeouts` or `automaticTurnsTaken`; no `MIRROR_CHOICE_REQUIRED` or
`REWARD_CHOICE_REQUIRED` timer is ever armed for a bot seat.

---

## 11. Open decisions — rule before the dependent task starts

**Undefined, not inferred.** Each blocks a specific task.

| # | Question | Options | Blocks |
|---|---|---|---|
| **#V3-0** | ~~What is V3's actual starting point?~~ **Closed 2026-08-03:** kept PROTOCOL **20** (`activeShield` public). See `docs/agent/decisions.md`. | — | — |
| **#V3-1** | Where does the simulator live? | (a) `apps/simulator` — a third app, consistent with `apps/server` / `apps/client`, but a third `package.json` and tsconfig to maintain. (b) A `bin/` script inside `apps/server` — no new workspace member, but a batch tool shipped inside the game server. | L18-04 |
| **#V3-2** | Does the client show *what* a bot decided, beyond the existing public log? | Nothing extra is required — a bot's play already broadcasts `actionPlayed` like a human's. But debugging a heuristic from the public log alone is painful, and a dev-only reasoning panel is a distinct feature with a real cost. | L17-05 |
| **#V3-3** | ~~Last human leaves a room containing bots~~ **Closed 2026-08-03:** **(b)** mid-game play out and write finished game; lobby with only bots → dispose, write nothing. See `docs/agent/decisions.md`. | — | — |
| **#V3-4** | Do the difficulty labels stay `easy` / `normal` / `hard`? | `hard` means "this heuristic, undegraded" (§4.5), which is not hard. Alternatives that promise less: `Calm` / `Steady` / `Sharp`, or numbered levels. Cosmetic, but it sets a player expectation the bot cannot meet. | L17-01 |
| **#V3-5** | Is the bot's scoring weight table exposed as configuration? | A single tunable file is enough for V3; exposing weights via CLI flags would let the simulator sweep them, which is genuinely useful and genuinely scope creep. Recommendation: constants in one module, no CLI sweep in V3. | L16-04 |
| **#V3-6** | Clock injection or field exclusion for §8.1? | Injecting a clock into the two `Date.now()` call sites makes the engine fully replayable and touches two files; excluding the two deadline fields is cheaper but leaves a non-reproducible value in authoritative state and does not satisfy §10.3. Recommendation: inject. | L18-01 |

---

## 12. Definition of Done — V3

V3 is engine and server work, so V1's automated gate applies in full — plus one addition for
the bot policy, which like a V2 visual task has no single automated notion of "correct".

- [ ] `pnpm verify` green — typecheck, lint, every existing test, unchanged in behaviour
- [ ] No V1 or V2 test weakened, skipped, or deleted to accommodate a bot path
- [ ] No game rule changed. Any task that appears to need one **stops and asks** (golden rule 6)
- [ ] Every new engine function has tests; every guard test in §10 that the task touches passes
- [ ] `PROTOCOL_VERSION` bumped exactly once for the whole of V3 (§7), never per lot
- [ ] Determinism holds: same seed and config → identical simulator output
- [ ] For a policy or difficulty task, the developer has watched a bot play a full game and
      signed off that it is not obviously stupid — a green `pnpm verify` on a heuristic is
      necessary, not sufficient
- [ ] The task's own **Acceptance** line in `docs/backlog_v3.md` is satisfied
- [ ] Status flipped to `Done` in `docs/backlog_v3.md`, in the same change as the code
- [ ] Committed with a Conventional Commit referencing the task id (`AGENTS.md` §10)

---

## 13. Out of V3 scope

Not to be implemented, even partially, even "to lay groundwork" — same discipline as
technical spec v1 §9 and v2 §9:

- The 11 other kits and their cards, and Team / God / Quick modes
- Any learning bot, search, tree, MCTS, or neural policy. A decoupled service for that stays a
  future option (`decisions.md`), and V3's job is to make it possible, not to start it
- Bot lookahead, bluffing, or opponent modelling beyond the derived reads listed in §4.4
- Difficulty tiers that read `GameState` (rejected, decision 2)
- Matchmaking, ranking, bot personalities or names beyond a labelled seat
- Spectator mode, replay playback, fast-forward, pause
- Accounts, in-progress persistence, monetization
- **Any rebalancing decision.** V3 delivers the instrument; reading it is a later pass
- Rewriting the rules spec. Golden rule 1's human-owned task is unaffected by V3
