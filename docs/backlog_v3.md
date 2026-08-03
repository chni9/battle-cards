# Backlog — Card Battle V3

> **Active task tracker** for V3 (bots, solo mode, simulation). Scoped by
> `docs/technical_spec_v3.md`.
> V1 (engine, protocol, four screens) and V2 (visual layer) are closed — see
> `docs/backlog_v1.md` and `docs/backlog_v2.md` (archives).
> **Keep each task's status current as you finish it** — see `/AGENTS.md` §9.
> Open decisions are tracked in `agent/decisions.md` and listed in technical spec v3 §11,
> not duplicated here.

Status values: `To do` · `In progress` · `Done` · `Blocked`

## How to read this

**Sequencing principle**

- Three phases. **Foundations** (Lots 15–16) — seat abstraction, legal-action enumerator,
  decision policy, difficulty — carry all the risk and are provable entirely in Vitest with no
  UI. **Playable surfaces** (Lot 17) — solo mode and lobby bots — sit on a foundation that
  already passes its tests. **Simulation** (Lot 18) depends on Lot 16 only, not on Lot 17: if
  the UI work slips, the balance instrument still lands (technical spec v3 §2).
- Lot 15 before Lot 16 is not negotiable. Writing a policy before a bot can hold a seat means
  writing it against a mock, and the mock will be wrong.

**Execution order**

- Follow the ID order. The "Depends on" column gives the strict prerequisites. Two tasks with
  no shared dependency can be run in parallel, but a solo developer gains little from that.

**Complexity**

- S: one agent pass, quick review. M: several passes, careful review. L: to be broken into
  sub-tasks by the agent before any code is written.

**Risk**

- High: an error here triggers no alert and surfaces weeks later. Read the produced code line
  by line, don't settle for green tests.
- Medium: error detectable while playing, but costly to fix after the fact.
- Low: error visible immediately.

**References**

- Technical spec v3 §N refers to `technical_spec_v3.md`. Rules truth still comes from
  `spec_bataille_des_cartes_en.md`; engine, protocol and Definition of Done truth from
  `technical_spec_v1.md`. **V3 changes neither.**
- Engine conventions: `docs/agent/engine.md`. Card handlers: `docs/agent/card-handler.md`.
  Protocol and views: `docs/agent/protocol.md`. Client: `docs/agent/frontend.md`.
  Postgres: `docs/agent/db.md`.

**Scope lock**

- No new rule, card, kit, or mode. A bot playing badly is a bot problem and is **never** grounds
  for touching a rule. A V3 task that looks like it needs a rule change is out of bounds: stop
  and ask (V1 golden rule 6).
- `PROTOCOL_VERSION` is bumped **exactly once** for the whole of V3, in L15-05. No other task
  bumps it. The target number depends on the precondition above being closed first.

**V3-specific watch points**

- **A bot is never a privileged caller.** Every bot action goes through the same
  `performTurnAction` validation as a human's. The server stays authoritative over its own bots
  (golden rule 8).
- **Bot noise must draw from the seeded generator** (golden rule 5). One `Math.random` inside a
  policy breaks replay for the entire game and silently invalidates every simulator result.
- **Every number in technical spec v3 marked "tunable default" is an invention**, not a
  measurement: the noise rates, the scoring weights, `BOT_THINK_MS`, the 8-candidate Assassin
  cap. Do not cite one as validated, and do not tune one silently — record the change.
- **§10's guard tests are the point of §10.** A failing §10.1 does not mean the test is wrong;
  it means a card leaks hidden state through its legality and needs a ruling.
- **Simulator output measures the heuristic at least as much as it measures the game**
  (technical spec v3 §8.3). No task in this backlog concludes anything about balance.

**Out of scope**

- The 11 other kits and their cards, Team/God/Quick modes, any learning bot, search or tree,
  bot lookahead or bluffing, difficulty tiers that read `GameState`, matchmaking, ranking,
  spectator/replay/fast-forward, accounts, in-progress persistence, monetization, and **any
  rebalancing decision** — technical spec v3 §13.

## Progress

9 of 22 V3 tasks done.

| Lot | Tasks | Done |
|---|---|---|
| 15 · Seat abstraction and protocol | 6 | 6 |
| 16 · Bot brain | 6 | 3 |
| 17 · Solo mode and lobby bots | 5 | 0 |
| 18 · Headless simulation | 5 | 0 |

## Milestones

| Milestone | Reached at the end of | What must be true | Expected proof |
|---|---|---|---|
| **M8** | Lot 15 · Seats | A seat exists without a Colyseus `Client`; a bot seat can be added, removed, re-configured and counted; no bot seat ever arms a turn or sub-choice timer. Protocol bumped once, **20 → 21** (#V3-0 closed at baseline 20). | A room of 1 human + 3 bots reaches `startGame` and plays turns with a stub policy that always draws; `pnpm verify` green; Lot 15 §10.4 subset green (full 4-bot completion is L16-06). |
| **M9** | Lot 16 · Bot brain | `listLegalActions` is exhaustive-and-accepted, the policy plays a complete game from the view alone including both sub-choices, difficulty is one seeded number. | §10.1 and §10.2 guard tests green; a full 4-bot game completes with no timeout default fired; developer has watched one game and signed off. |
| **M10** | Lot 17 · Playable | Solo mode is reachable from Home in three clicks; a host can fill lobby seats with bots at chosen difficulties; bot seats are labelled for everyone. | Developer plays a solo game start to finish and a mixed human+bot lobby game; V2 animations read correctly at bot pace. |
| **M11** | Lot 18 · Simulation | N games run with no room and no timers, deterministic from a seed, with controlled kit matchups and aggregated output. | Same seed and config → byte-identical output file; §10.3 room-vs-simulator equivalence test green; first gross-imbalance screen produced and read. |

_Task count = number of tasks in the lot named in column B only, not the cumulative count since the start._

## Lot 15 · Seat abstraction and protocol

### L15-01 · `BotDifficulty` in shared — `Done`

`packages/shared/src/domain/bot.ts`: the `BotDifficulty` union, derived from an `as const` array
so the values exist at runtime (`AGENTS.md` §6). One definition, imported by server and client.

- **Reference** Technical spec v3 §5, §7 · **Depends on** nothing · **Complexity** S · **Risk** Low
- **Watch point** Union over enum, `as const` array for the runtime values — same pattern as `packages/shared/src/domain/card.ts`. Do not duplicate the labels in the client.
- **Acceptance** `BotDifficulty` importable from `@card-battle/shared`; the difficulty labels exist in exactly one place in the repo

### L15-02 · Seat union and occupancy — `Done`

Replace `Seat` in `game-room.ts` with the `HumanSeat | BotSeat` union in a new
`apps/server/src/rooms/seats.ts`. Switch every occupancy read from `this.clients.length` to
`seats.length`, including the `lock()` / `unlock()` decisions and `canStartGame`'s `seatCount`.
Bot `sessionId` is server-generated, `bot-` prefixed, unique in the room; bot nicknames may not
collide with a human's or another bot's.

- **Reference** Technical spec v3 §4.1 · **Depends on** L15-01 · **Complexity** M · **Risk** High
- **Watch point** `sessionId` stays the one player identity across `GameState`, the protocol, the action log and Postgres — a bot must not get a second id kind. And `maxClients` still governs *sockets*: total occupancy is now a separate concept. Mixing the two is how a fifth player joins a full room.
- **Acceptance** A room holding 1 human + 3 bot seats reports `4/4`, is locked to new joins, and `canStartGame` returns `null`; removing a bot unlocks it; `pnpm verify` green with every existing lobby test unchanged

### L15-03 · Host-only bot lobby rules — `Done`

Extend `lobby-rules.ts` with pure predicates for `addBot` / `removeBot` / `setBotDifficulty`:
host-only, pre-start only, capacity-bounded, target must be an existing bot seat. Rejection
messages in the same shape as `startGameRejectionMessage`.

- **Reference** Technical spec v3 §4.1, §6 · **Depends on** L15-02 · **Complexity** S · **Risk** Low
- **Watch point** Keep it pure, in `lobby-rules.ts`, so the reject cases are unit-tested without a Colyseus room — the reason `canStartGame` lives there. A non-host client will send these messages; server-side rejection is the validation, a hidden button is not (golden rule 8).
- **Acceptance** Each rejection case (not host, already started, room full, unknown bot id, target is a human seat) has a test and a distinct message

### L15-04 · Bot seat lifecycle isolation — `Done`

A bot seat is permanently `connected`: it never enters `disconnected` or `absent`, never
accumulates `consecutiveTimeouts` or `automaticTurnsTaken`, and never arms a turn, Mirror or
reward timer. Add the bot branch to `beginTurnOrAbsentAutoPlay` **before** its `connected`
branch, and to `sendRewardChoiceRequired` (replacing its current silent `return` on
"no client found" with two explicit branches: bot seat → driver; dropped human → keep today's
timer default).

- **Reference** Technical spec v3 §4.1, §4.2, §4.6 · **Depends on** L15-02 · **Complexity** M · **Risk** High
- **Watch point** `sendRewardChoiceRequired` today returns silently when no client matches the eliminator. With bots that becomes "the bot is never asked and defaults to 2×4 lives after 20 real seconds" — functional, invisible, and wrong. Make both branches explicit.
- **Acceptance** Lot 15 §10.4 subset green: no bot seat shows a non-`connected` status or a non-zero timeout counter; no `MIRROR_CHOICE_REQUIRED` / `REWARD_CHOICE_REQUIRED` **timer** is ever armed for a bot; consecutive bot turns enter via `setTimeout` with no sync recursion; stub always draws when asked. Full “4-bot room plays to completion” remains **L16-06**.
### L15-05 · Protocol: bot intents and view fields (PROTOCOL_VERSION 20 → 21) — `Done`

Add `addBot` / `removeBot` / `setBotDifficulty` client→server intents and `isBot` /
`botDifficulty` to `LobbySeatView` and `PublicPlayerView`. Wire the room handlers to L15-03's
predicates. Bump `PROTOCOL_VERSION` once, here.

- **Reference** Technical spec v3 §7 · **Depends on** L15-03, **#V3-0** (closed: baseline 20) · **Complexity** M · **Risk** Medium
- **Watch point** Baseline is PROTOCOL **20** (#V3-0 closed). This task bumps **20 → 21** once. Do not bump on top of any other uncommitted version change.
- **Watch point** **No new server→client event.** A bot's turn already broadcasts `actionPlayed` / `actionResolved` / `turnStarted` exactly as a human's does; adding a bot-specific event forks the client's rendering path for no gain. This is the only task in V3 that touches `PROTOCOL_VERSION`.
- **Acceptance** A client at the previous version is refused with the existing mismatch message; bot seats appear with their difficulty in the lobby view of **every** recipient, not only the host; `buildPlayingViewFor` marks bot players for everyone

### L15-06 · Last human leaves a bot room — `Done`

Implement the ruling on open decision #V3-3. Reachable today via consented leave and currently
**undefined**: a solo game whose human leaves would otherwise play out with three bots in an
empty room and write a finished game to Postgres.

- **Reference** Technical spec v3 §4.1, §11 #V3-3 · **Depends on** L15-02 · **Complexity** S · **Risk** Medium
- **Watch point** Ruled **(b)** play-out-and-write mid-game; lobby-only bots → dispose, write nothing. See `docs/agent/decisions.md`.
- **Acceptance** The ruled behaviour is implemented and tested for both paths (consented leave and reconnection-grace expiry) with 1 human + N bots

## Lot 16 · Bot brain

### L16-01 · `listLegalActions` — `Done`

New `apps/server/src/engine/turn/list-legal-actions.ts`, returning the existing `TurnAction`
union. Enumerate per the table in technical spec v3 §4.3, calling the real validators
(`handler.canPlay`, the economy modules' resource checks) rather than re-deriving any legality
rule. `{ type: 'draw' }` is always present.

- **Reference** Technical spec v3 §4.3 · **Depends on** nothing (engine-only) · **Complexity** L · **Risk** High
- **Watch point** This is the interface `technical_spec_v1.md` §3 promised and the largest piece of V3 — **break it into sub-tasks before writing code** (§4.3's table is the natural split). A second copy of a legality rule is a second place for it to drift: never re-implement a `canPlay` condition here. Not bot code — engine code.
- **Watch point** **`canPlay` alone is not sufficient for `playCard`.** The play-cost affordability gate is inline in `playCardAction` (`perform-action.ts`), not in `canPlay` and not in an economy module. Filtering by `canPlay` alone over-offers unaffordable plays and fails §10.2 for every points-cost card except Regeneration and Tax. Extract that gate into a shared predicate both call sites use — see technical spec v3 §4.3 rule 4.
- **Watch point** Two non-behavioural prerequisites: export `MAX_LIVES_PER_USE` from `handlers/regeneration.ts` (module-private today), and narrow `PendingEffectView.cardId` (`CardId`) before passing it to `attackDamageFor` (`AttackCardId`) — never with a cast (`AGENTS.md` §6).
- **Acceptance** §10.2 property test green (every enumerated action returns `ok: true` from `performTurnAction` on a state clone); `draw` present in every state; no unbounded loop for any hand size

### L16-02 · Assassin multi-attack candidate generator — `Done`

Bounded generator for `playMultipleAttacks`, sizes 2 and 3 only, built greedily from
damage-ordered attacks and threat-ordered targets. Hard cap: 8 candidates.

- **Reference** Technical spec v3 §4.3 · **Depends on** L16-01 · **Complexity** M · **Risk** Medium
- **Watch point** Full subset × target enumeration is exponential and **must not be written**. This is the one place V3 knowingly does not enumerate the full legal space — record it as a deliberate approximation in `decisions.md`, not as a bug to fix later. `playMultipleAttacksAction` is all-or-nothing and charges the sum of play costs, so most subsets are unaffordable anyway.
- **Acceptance** Every generated candidate is accepted by `performTurnAction`; candidate count never exceeds 8 for any hand; a non-Assassin kit generates none

### L16-03 · View-only legality guard test — `Done`

Encode invariant §10.1: for a spread of fixture states, including active base and upgraded Spy
relations, assert `listLegalActions(state, p)` equals the set derivable from
`buildPlayingViewFor(p)` alone, for every player.

- **Reference** Technical spec v3 §10.1 · **Depends on** L16-01 · **Complexity** M · **Risk** High
- **Watch point** Verified true by audit on 2026-08-03 for all 16 V1 handlers, and **fragile**: one future card whose `canPlay` reads a hidden opponent field turns the enumerator into an information leak, exploitable by a human client too (rejected actions are free and their messages differ by cause). A failure of this test is a rule question, not a test bug — **stop and ask.**
- **Acceptance** Test green today; test fails loudly if a handler is changed to read a hidden opponent field; the invariant and its consequence are written into `docs/agent/engine.md`

### L16-04 · Heuristic policy — `To do`

New `apps/server/src/bots/heuristic-policy.ts`:
`decide(view: PlayingStateView, actions, rng): TurnAction`. Derived reads and scoring bands per
technical spec v3 §4.4. Weights as named constants in one module.

- **Reference** Technical spec v3 §4.4 · **Depends on** L16-01, L16-02 · **Complexity** L · **Risk** Medium
- **Watch point** The signature takes **no** `GameState` — that is the enforcement of decision 2, not a stylistic choice. Absolute opponent lives are **not** knowable without Spy (starting lives come from the hidden kit); the legitimate proxy is cumulative `livesLost` summed from the public action log. Opponent tiebreaks go through `rng`, never seat order: a fixed tiebreak makes bots gang up on seat 0 and poisons every simulator result. Every weight is a tunable default — label them as such in the code.
- **Acceptance** A 4-bot game completes with no exception and no timeout default fired; the policy never returns an action absent from `actions`; same view + same seed → same action

### L16-05 · Difficulty as seeded noise — `To do`

One axis: probability of substituting a uniformly random legal action for the top-scored one.
Defaults `easy` 0.55 / `normal` 0.20 / `hard` 0.00. Noise draws from
`createRng(`${state.seed}:bot:${botId}:${state.turnSequence}`)`.

- **Reference** Technical spec v3 §4.5 · **Depends on** L16-04 · **Complexity** S · **Risk** Medium
- **Watch point** No tier reads extra information (decision 2) — a "cheating" tier was rejected because tiers reading different inputs are not comparable in the simulator. `Math.random` here silently destroys replay for the whole game (golden rule 5). `hard` means "this heuristic, undegraded" — not "hard".
- **Acceptance** Replaying a game from its seed reproduces every bot decision exactly, at every tier; `hard` never substitutes; over a large sample `easy` substitutes at ≈0.55

### L16-06 · Bot driver and sub-choices — `To do`

New `apps/server/src/bots/bot-driver.ts`: owns the room-side bot lifecycle (§4.2), routes both
sub-choices inline via `completeMirrorChoice` and `completeEliminationRewardChoice` (§4.6),
enters every bot turn through a `setTimeout` (`BOT_THINK_MS`, default 900 ms, env-overridable;
0 in the simulator), and falls back to `performAutoDraw` on any throw.

- **Reference** Technical spec v3 §4.2, §4.6, §4.7 · **Depends on** L15-04, L16-04, L16-05 · **Complexity** L · **Risk** High
- **Watch point** Consecutive bot turns **must** be deferred through `setTimeout`, never called directly from the previous turn's completion — the same recursion `runAbsentAutoDraw` already guards against, and with 3 bots it is reachable in normal play. `BOT_THINK_MS` is not cosmetic: V2's Lot 14 animations are driven by broadcasts, and three bots acting inside 50 ms show the human nothing.
- **Acceptance** 4-bot room plays to completion with no recursion and no dropped turn; a policy that throws degrades to `draw` and the turn advances; no Mirror or reward default ever fires for a bot in a full game

## Lot 17 · Solo mode and lobby bots

### L17-01 · Solo mode entry on Home — `To do`

A third path beside Create and Join: opponent count (1–3) and one difficulty for all opponents.
Creates a room, seats that many bots, starts immediately — the lobby is skipped.

- **Reference** Technical spec v3 §5 · **Depends on** L15-05, L16-06 · **Complexity** M · **Risk** Low
- **Watch point** Solo mode needs **no new intent**: it is `create` + N × `addBot` + `startGame`, which is exactly why it inherits the existing validation for free. Per-opponent difficulty is deliberately not offered here (it is in the lobby) — two UIs for one thing. Build from V2's `Button` and `Dialog`; no new dependency, no new design token.
- **Acceptance** Three clicks from Home to a running 1v1 solo game; 1, 2 and 3 opponents all work; no client-side rule or decision logic added (`AGENTS.md` §4)

### L17-02 · Lobby bot controls — `To do`

Host-only add / remove / change-difficulty per bot seat, with the `Players (n/4)` count and seat
list including bots.

- **Reference** Technical spec v3 §6 · **Depends on** L15-05 · **Complexity** M · **Risk** Low
- **Watch point** Non-host clients see the bot seats but get no controls; rejection is server-side, as `START_GAME` already is. Adding a bot reduces the human slots available and the lock follows total occupancy — a human joining a bot-full lobby is refused by the existing lock, with no new rejection path.
- **Acceptance** A host builds a mixed 2-human + 2-bot lobby with different difficulties per bot and starts it; a non-host's `addBot` is rejected with L15-03's message

### L17-03 · Bot labelling on Lobby and Table — `To do`

Every seat that is a bot is visibly a bot, with its difficulty, to **every** player on both
screens. Reuses V2's existing components and tokens.

- **Reference** Technical spec v3 §6, §7 · **Depends on** L15-05, L17-02 · **Complexity** S · **Risk** Low
- **Watch point** A human must never be unable to tell whether an opponent is a bot. Not host-only information.
- **Acceptance** Bot label and difficulty visible on Lobby and Table for every recipient; an eliminated bot still renders L10-05's generic treatment

### L17-04 · Postgres bot markers (migration 002) — `To do`

`002_bot_seats.sql`: `finished_games.has_bots`, `finished_game_players.is_bot`,
`finished_game_players.bot_difficulty`. Populate them in
`build-finished-game-snapshot.ts` / `write-finished-game.ts`.

- **Reference** Technical spec v3 §9 · **Depends on** L15-02 · **Complexity** S · **Risk** High
- **Watch point** Without this, the first balance query after V3 ships silently averages human games with games against `easy` bots, and **no later migration can separate them retroactively**. Explicit migration only, never auto-run on boot (`docs/agent/db.md`).
- **Acceptance** A solo game's row has `has_bots = true` with per-player `is_bot` / `bot_difficulty` set; an all-human game is unchanged from today; existing games keep working under the defaults

### L17-05 · Bot reasoning visibility — `To do`

Implement the ruling on open decision #V3-2.

- **Reference** Technical spec v3 §11 #V3-2 · **Depends on** L17-03 · **Complexity** S · **Risk** Low
- **Watch point** **Blocked until #V3-2 is ruled.** Nothing extra is *required* — a bot's play already appears in the public action log. If a dev-only reasoning panel is ruled in, it must not become a second source of truth for game state and must not ship enabled to a normal player.
- **Acceptance** The ruled behaviour is implemented, or the task is closed as "no additional visibility" with that ruling recorded in `decisions.md`

## Lot 18 · Headless simulation

### L18-01 · Deterministic sub-choice deadlines — `To do`

Close the reproducibility hole in technical spec v3 §8.1: `handlers/mirror.ts` and
`elimination-rewards.ts` both read `Date.now()` and store the result inside `GameState`
(`mirrorChoice.deadlineMs`, `rewardChoice.deadlineMs`). Implement the ruling — inject a clock
into both call sites (recommended) or exclude both fields everywhere.

- **Reference** Technical spec v3 §8.1 · **Depends on** nothing (engine-only) · **Complexity** S · **Risk** Medium
- **Watch point** **Do this before L18-03, not after.** The byte-identical acceptance criterion is unreachable while a wall-clock value lives in authoritative state, and §10.3's equivalence test compares whole `GameState` objects, so the "just exclude the fields" route does not get that test out of trouble either. Injecting the clock must not change a single human-game behaviour: the room still passes the real clock.
- **Acceptance** Two identical scripted games from the same seed produce deeply equal `GameState` objects including both deadline fields; no change to observed room behaviour; `pnpm verify` green

### L18-02 · Controlled kit assignment — `To do`

`createInitialState` gains an optional `kitAssignment?: readonly KitId[]` (one entry per seat,
in seat order), used by the simulator and tests only.

- **Reference** Technical spec v3 §8 · **Depends on** nothing · **Complexity** S · **Risk** Medium
- **Watch point** `makePlayer` picks kits with `rng.pick(KIT_IDS)` — **with replacement** — so four Kamikaze in one game is legal. A random batch therefore gives uncontrolled per-matchup sample sizes, which makes per-kit conclusions meaningless. Production paths keep the existing random draw untouched: this is an injection point, not a behaviour change.
- **Acceptance** A forced assignment produces exactly those kits in seat order; omitting it reproduces today's random draw bit-for-bit for a given seed

### L18-03 · Shared turn-orchestration helper — `To do`

Extract the act → resolve → sub-choices → advance sequencing so the room and the simulator call
one implementation. Add the §10.3 equivalence test: a scripted action sequence produces an
identical final `GameState` (same seed) through either driver.

- **Reference** Technical spec v3 §8, §10.3 · **Depends on** L16-06, L18-01 · **Complexity** M · **Risk** High
- **Watch point** Written twice, the room and the simulator **will** diverge, and the divergence stays invisible until simulator conclusions stop applying to real games. Do this before the runner, not after — retrofitting it means rewriting the runner.
- **Acceptance** §10.3 test green; `game-room.ts` no longer holds its own copy of the sequencing; no behaviour change to a human game

### L18-04 · Batch runner CLI — `To do`

Runs N games with no room, no sockets, no timers. Config: game count, player count, per-seat
difficulty, base seed, optional forced kit assignment, output path. One JSONL/CSV row per game,
per the field-source table in technical spec v3 §8.

- **Reference** Technical spec v3 §8 · **Depends on** L18-01, L18-02, L18-03 · **Complexity** L · **Risk** Medium
- **Watch point** Reuse of `build-finished-game-snapshot.ts` covers the game-level and per-player metrics **only**. Elimination order / eliminator / reason are not per-player metrics it computes — they are passed through from its `eliminations` input, so the runner supplies them from `TurnResult.eliminations`. Per-seat difficulty and seat count have no counterpart today at all.
- **Watch point** **Blocked on #V3-1** (own app vs a `bin/` script in `apps/server`) before the first file is created. Simulated games are **not** written to Postgres (§8.2) — a batch of 10 000 would make every future query start with an exclusion clause. `BOT_THINK_MS` is 0 here. Determinism is the acceptance criterion, not a nice-to-have: without it no result is checkable and no regression detectable.
- **Acceptance** Same base seed and config → byte-identical output file across runs; 1 000 games complete with no exception; nothing is written to Postgres

### L18-05 · First gross-imbalance screen — `To do`

Run the batch across the 4 V1 kits at all three difficulties, aggregate win rate by kit and by
matchup, game-length distribution, and elimination causes. Write up what the numbers do and do
not support.

- **Reference** Technical spec v3 §8.3 · **Depends on** L18-04 · **Complexity** M · **Risk** Medium
- **Watch point** **This task concludes nothing about balance and changes no rule.** Read §8.3 before writing a word: self-play among instances of one mediocre heuristic measures the heuristic at least as much as the game. Treat 70 % as "look here" and 55 % as noise. Screen the hypotheses already on record in `technical_spec_v1.md` Appendix A first — upgraded Suicide's reward cascade, Cloning as a cheap escape hatch, Spy devalued by public actions — because each predicts a gross effect this instrument can actually see. Any rebalancing decision is a separate, later, human-owned pass.
- **Acceptance** Aggregated results committed with the run config and seeds; the write-up states explicitly which observations are attributable to the game and which may be artefacts of the policy's known blind spots
