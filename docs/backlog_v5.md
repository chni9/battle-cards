# Backlog — Card Battle V5

> **Active task tracker** for V5 (search bots, belief model, tuned and fitted evaluation).
> Scoped by `docs/technical_spec_v5.md`.
> V1 (engine, protocol, screens), V2 (visual layer), V3 (bots, solo, simulation) and V4 (full
> content) are closed — see `docs/backlog_v1.md` … `docs/backlog_v4.md` (archives).
> **V4's Lot 31 must be `Done` and published before L32-07 can pass.** Designer ruling 2026-08-07
> (technical spec v5 §2.1 #4).
> **Keep each task's status current as you finish it** — see `/AGENTS.md` §9.
> Open decisions are tracked in `agent/decisions.md` and listed in technical spec v5 §13, not
> duplicated here.

Status values: `To do` · `In progress` · `Done` · `Blocked`

## How to read this

**Sequencing principle**

Seven phases, in this order, and the order is not negotiable. The rule behind it: **nothing that
cannot be measured gets built.** V5's failure mode is not a crash — it is shipping a slower bot that
everyone believes is stronger because no instrument existed to say otherwise. This project has
already published one screen produced under an undetected defect (technical spec v4 §3.3 #4); the
sequencing exists so it does not happen twice.

1. **Instrument (Lot 32).** A policy registry, a frozen incumbent, an arena that can say whether B
   beats A with a confidence interval, a forward-model benchmark, and the worker isolation that both
   protects the event loop and structurally enforces the no-cheating ruling. Until this lot closes,
   every claim about bot strength in this repo is unfalsifiable.
2. **Fitting (Lot 33).** Weights become data; a state evaluator is written; an optimizer runs. This
   is where the first real strength gain arrives, and it is not a warm-up — Lot 35's search uses the
   tuned heuristic as its action prior and as its rollout policy. Search without it does not
   converge at room budgets.
3. **Belief (Lot 34).** The determinizer. The schedule risk of the whole version, and the one
   component with no reference implementation. Its calibration is published before any search is
   written against it.
4. **Search (Lot 35).** Textbook by comparison. Deliberately last of the three, because a search
   over unmeasured beliefs with an untuned evaluator is slower than the greedy policy it replaces
   and no stronger.
5. **Runtime (Lot 36).** Room integration, budgets, fallback, difficulty, latency.
6. **Fitted evaluator (Lot 37).** Replaces the hand-written evaluator inside search, only if the
   arena says it wins. Training data is a by-product of Lots 33 and 35, not a separate collection
   effort.
7. **Screen (Lot 38).** Re-measure the game under the V5 policy and publish beside the V4 screen.
   It concludes nothing about balance and changes no value.

**Execution order**

Follow the ID order. The "Depends on" column gives strict prerequisites. Two tasks with no shared
dependency can run in parallel, but a solo developer gains little from that — except in Lots 33 and
37, where the work is mostly compute and can run unattended while another task is written.

**Complexity**

S: one agent pass, quick review. M: several passes, careful review. L: to be broken into sub-tasks
by the agent before any code is written.

**Risk**

High: an error here triggers no alert and surfaces weeks later. Read the produced code line by line,
do not settle for green tests. Medium: detectable while playing, costly to fix afterwards. Low:
visible immediately.

**References**

Technical spec v5 §N refers to `technical_spec_v5.md`. Rules truth stays
`spec_bataille_des_cartes_en.md`; engine, protocol and Definition of Done truth stay
`technical_spec_v1.md`; content truth stays `technical_spec_v4.md`; the existing bot and simulator
architecture stays `technical_spec_v3.md`.
Conventions: `docs/agent/engine.md`, `card-handler.md`, `protocol.md`, `frontend.md`, `db.md`,
`testing.md`. A new playbook `docs/agent/bots.md` is created in L32-02 and maintained thereafter.

**Scope lock**

- **No value is changed anywhere in V5.** Not a price, not a damage number, not a starting resource,
  not a counter. A task that appears to need a rebalance stops and asks. Same clause as V4.
- **No rule is invented.** Every case the rules spec does not resolve is an entry in technical spec
  v5 §13. A task blocked on one stays `Blocked`; a §13 **recommendation is not a licence to
  implement**.
- **No neural network, no GPU, no Python in the runtime.** Designer ruling (technical spec v5 §2.1
  #3). Fitting stops at a linear model or a tree ensemble with pure-TypeScript inference.
- **No cheating bot, anywhere** — room or offline simulator. Designer ruling (§2.1 #1).
- **No new mode, no player-count change.** A task that would "prepare" for them is out of bounds.
- `PROTOCOL_VERSION` is bumped **exactly once** for the whole of V5, in **L36-04**, because that is
  the only task that changes a wire payload. No other task bumps it.

**V5-specific watch points**

- **A search that mutates the live room's `GameState` is the worst bug this version can produce.**
  It is silent, cross-player, and unreproducible from a bug report. The engine mutates in place at
  ~77 sites (technical spec v4 §10.3) and `performTurnAction` is not transactional on every failure
  path. **L32-04's deep-equality guard is not optional and may not be weakened to pass.**
- **The no-cheating ruling has two enforcements and both must survive refactoring**: the policy
  entry point and `determinizeFromView` take no `GameState` (type-level), and the worker payload
  type structurally excludes it (process-level). A future contributor cannot leak the real state by
  accident; they would have to widen the message type deliberately. Anyone widening it is doing
  something wrong.
- **An unfalsifiable belief model is how V5 fails quietly.** Lot 34 publishes calibration *before*
  Lot 35 starts. A determinizer that samples worlds contradicted by something the bot has actually
  observed is worse than no search at all — it teaches the tree that impossible worlds are possible.
  The impossible-world rate must be **0**, not "low".
- **A tuned weight set that wins only on its training seeds is a measurement artefact.** L33-04's
  holdout is not a formality. Fitness is measured against a **frozen gauntlet**, never against the
  current population alone — population-only fitness produces a bot that beats its own ancestors
  while losing to the original.
- **`heuristic-v4` is the yardstick and is never modified again** (L32-03). If the yardstick moves,
  every prior and future measurement becomes uninterpretable.
- **Determinism is a contract, not a nicety.** Iteration budgets in the simulator, never wall-clock.
  Parallelism across decisions and games, never within one search tree. A root-parallel merge whose
  result depends on thread completion order silently destroys reproducibility, and nothing will flag
  it.
- **A green `pnpm verify` on a bot is necessary and not sufficient.** V3's Definition of Done clause
  applies to every policy task in this backlog: the developer watches a full game and signs off.
- **Do not "fix" the Assassin `playMultipleAttacks` candidate cap of 8** (L16-02). It is a
  deliberate approximation, the full space is exponential, and technical spec v3 §4.3 says it must
  never be written.
- **Do not rewrite the engine for bot performance.** If the forward model is too slow, shrink the
  search — lower the depth cap, prune harder, improve the evaluator. An engine rewrite for a bot is
  a rule-correctness risk taken for a bot, and golden rule 7's surviving sentence still holds:
  a bot playing badly is never grounds for touching a rule.

---

## Lot 32 — Instrument

Nothing in Lots 33–38 may start before this lot closes. L32-01 is a governance task with no code:
three closed rulings currently instruct every agent in this repo to refuse the rest of this backlog.

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L32-01 | **Blocked on #V5-5, #V5-6, #V5-9.** Record the reopening of the three closed rulings that block V5, in `docs/agent/decisions.md` as dated append-only entries, and rewrite `AGENTS.md` golden rule 7 in the same change. The three: search / lookahead / learning bots (`AGENTS.md` golden rule 7, technical spec v3 §13, v4 §12); opponent modelling beyond V3 §4.4's derived reads (v4 §12), reopened **bounded** to public fields and the public action log within one game; and **#V3-5** (weights stay module constants), reopened minimally per technical spec v5 §5.2. State explicitly that **technical spec v3 decision 2 is NOT reopened** — the policy still receives no `GameState`. **Acceptance:** an agent reading only `AGENTS.md` and `decisions.md` can tell that search is in scope and that reading hidden state is not. **Watch point:** leaving golden rule 7 as written means every future agent session stops and asks before touching Lot 33 onward; this is not documentation hygiene, it is the gate on the whole version. | S | **High** | — | Done |
| L32-02 | Introduce the `BotPolicy` interface and the policy registry in `apps/server/src/bots/registry.ts`: `id`, `weightsHash`, `decide`, `pickMirrorRedirect`, `pickEliminationRewards`, and the four sub-choice picks. Rewire `bots/bot-driver.ts`, `rooms/game-room.ts` (all four `performBotAction` hooks) and `simulation/run-game.ts` to resolve a policy from the registry instead of importing `heuristic-policy`'s free functions directly. Create `docs/agent/bots.md` in the same change. **Acceptance:** two policies are registered and a test drives a full simulated game with a different policy per seat; no call site imports `heuristic-policy` directly any more. **Watch point:** L29-08 deliberately routed *every* remaining bot `rng.pick` / `rng.shuffle` through `sub-choice-picks.ts` "for parity between the room path and the headless simulator" (`decisions.md` 2026-08-05). The registry must preserve that parity — a policy reachable from the room but not from the simulator makes every screen a measurement of something other than what players face. | **L** | **High** | L32-01 | Done |
| L32-03 | Freeze `heuristic-v4` as the permanent incumbent. Register today's policy under that id and lock its behaviour with a fixed-seed regression test that asserts the exact action chosen at a fixed set of positions across all 15 kits. **Acceptance:** the test fails if any weight in `heuristic-weights.ts`, any branch in `score-play/`, or any threshold in `heuristic-life-thresholds.ts` changes. **Watch point:** this test exists to make the yardstick immovable, so the correct response to it failing is never to update the expectations — it is to move the change into a new policy id. Say so in the test file's header comment. | S | **High** | L32-02 | Done |
| L32-04 | `cloneGameState(state): GameState` in `apps/server/src/bots/search/clone-state.ts`, plus the two guard tests V5 rests on. First: clone, mutate every mutable field of the clone (players, hands, specials, pending effects, persistents, pool, ledgers), assert the original is untouched — the round-trip test that removes the maintenance liability of a hand-written clone. Second, and non-negotiable: take a real `GameState`, snapshot it structurally, run a full bot decision against a view built from it, assert deep equality afterwards. Start from `structuredClone`; `GameState` holds no `Map`, `Set`, `Date` or class instance, which the first test also proves. **Acceptance:** both tests pass, and a new field added to `Player` without being cloned fails the first one. **Watch point:** the second test is the only thing standing between a search bug and silent cross-player state corruption in production. It may not be skipped, weakened, or moved behind a flag. (Technical spec v5 §10.1.) | M | **High** | L32-01 | Done |
| L32-05 | `apps/server/src/bots/search/bench-forward-model.ts` — measure, on a 4-player mid-game state with a populated pool and several active persistents: `structuredClone` cost per state and cloned byte size; hand-written `cloneGameState` cost; turns per second through `performAndCompleteTurn` with `SIM_NOW_MS`; truncated playouts per second single-threaded. Run through `pnpm`, never a bare `node`. **Acceptance:** the numbers are recorded in `docs/agent/decisions.md`, and every search budget written anywhere in V5 cites this task. **Watch point:** the repo pins its Node runtime via `devEngines.runtime` (`README.md`); a bare `node` invocation benchmarks the system install and produces numbers that do not describe production. | M | Medium | L32-04 | Done |
| L32-06 | The arena: `apps/server/src/simulation/run-arena.ts`. Policy A vs policy B, N games, seeded. **Seat rotation is mandatory** — every configuration played in every seat permutation, or the result measures seat advantage rather than policy. Two kit modes, reported separately: mirrored (both policies get the same kit in the same seed) and random. Output: win rate, **Wilson confidence interval**, Elo delta, stall count, mean and p50 turn count, per-kit breakdown, decision-latency distribution, and both policies' `weightsHash`. JSONL, same shape discipline as `run-batch.ts`; simulated games never write Postgres (#V3-1). **Acceptance:** running A vs A returns a win rate whose confidence interval contains 0.5; same seed and config → identical output. **Watch point:** without mandatory seat rotation and mirrored kits, a 3-point win rate difference is indistinguishable from seat advantage, and every subsequent gate in this backlog becomes noise. | **L** | **High** | L32-02 | Done |
| L32-07 | Validate the arena against the closed V4 screen. Run `heuristic-v4` against itself under the arena and confirm the per-kit rates land inside the confidence interval of the published `docs/simulation/<date>-v4-content/` figures. **Acceptance:** a short writeup stating agreement or naming the discrepancy; a discrepancy is a defect in the arena or in the registry rewiring, not a finding about kits. **Watch point:** requires V4's Lot 31 to be `Done` and published (designer ruling §2.1 #4). If it is not, this task is `Blocked`, and so is every gate downstream of it — because "the new bots are better" would have nothing valid to be measured against, which is the exact mistake the V3 screen already made. | M | **High** | L32-06, L31-04 | Done |
| L32-08 | Worker-thread harness in `apps/server/src/bots/search/worker/`. A pool sized `min(cores − 1, configured)`; a `SearchRequest` payload type carrying **only** `{ view, actionLog, legalActions, budget, policyId, weightsProfile }`; a `SearchResponse` of `{ action, reason, stats }`. Replace the synchronous `decideAndAct` path in `bot-driver.ts` with a request to the pool. Add the fallback chain: worker timeout / crash / illegal return → synchronous `heuristic-v4` decide → and only if *that* throws, `draw`. **Acceptance:** a test proves `SearchRequest` does not typecheck when handed a `GameState`; a test proves a killed worker produces a legal heuristic action rather than a draw; the Colyseus event loop is not blocked for the duration of a decision. **Watch point:** the current fallback goes straight to `{ type: 'draw' }` (`bot-driver.ts` `catch` blocks), which under load turns every bot into a passive spectator — a real behaviour bug that this task fixes as a side effect. Do not preserve it. | **L** | **High** | L32-02 | Done |

---

## Lot 33 — Fitting

The first lot that produces a stronger bot. Mostly compute: L33-03 can run unattended for days while
L33-06 and Lot 34 are written. Its output is also a hard prerequisite for Lot 35 — the tuned
heuristic is the search's action prior *and* its rollout policy.

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L33-01 | Minimal reopening of #V3-5: a typed `PolicyWeights` object in `bots/policy-weights.ts` whose **frozen default is byte-identical to today's constants** in `heuristic-weights.ts` and `heuristic-life-thresholds.ts`. Loadable from a checked-in JSON profile by the arena and the optimizer, never from env or a network source in the room path. Each profile carries a content hash. The module constants remain, as that default. **Acceptance:** `heuristic-v4` with the default profile passes L32-03's frozen regression test unchanged, byte for byte. **Watch point:** #V3-5 is reopened *only* to the extent of this task. No CLI sweep flags, no env override, no runtime reload — the ruling's substance (weights are not configuration) survives; only their storage changes. | M | **High** | L32-01, L32-02 | Done |
| L33-02 | The state evaluator: `evaluate(state, playerId): Float64Array` in `bots/eval/`, returning an estimated **probability of being sole survivor** per living player, summing to ≈1. This is new code — `heuristic-policy.ts` scores *actions*, not *positions*, and no part of it is reusable here. Extract the feature vector (technical spec v5 §5.1) into `bots/eval/features.ts` so Lot 37 can reuse it unchanged. Phase A implementation is a linear combination whose weights live in `PolicyWeights`. **Acceptance:** the evaluator is monotone in the obvious directions (more lives, fewer opponents, more pending damage against opponents all move self-probability the right way), proven by tests; values sum to 1 within tolerance on 1 000 random reachable positions. **Watch point:** the target is win probability, **not** damage margin (#V5-7). A margin-based evaluator produces a bot that trades its own position for damage, which in a 2-to-4-player elimination game is how it loses to the seat it did not attack. | **L** | **High** | L33-01 | Done |
| L33-03 | The optimizer: CEM or (1+λ)-ES over `PolicyWeights`, in `apps/server/src/simulation/optimize-weights.ts`, evaluated in parallel across the L32-08 worker pool. Fitness is win rate against a **frozen gauntlet** — `heuristic-v4` plus every previous champion — never against the current population alone. Checkpoint every generation so a multi-day run survives a restart. **Acceptance:** the run produces a profile that beats `heuristic-v4` in the arena; the fitness curve and the gauntlet composition are recorded. **Watch point:** population-only fitness produces intransitive drift — a bot that beats its own ancestors while losing to the original — and the fitness curve looks healthy the whole time. The gauntlet is what makes progress absolute rather than relative. | **L** | Medium | L33-02, L32-06, L32-08 | To do |
| L33-04 | Split seeds and matchups into training and holdout sets before L33-03's first run, and report the tuned profile on the holdout only. **Acceptance:** the writeup gives training and holdout win rates side by side; a gap wider than the confidence interval is reported as overfitting, not smoothed over. **Watch point:** all 15 kits are the whole game, so the meaningful holdout is **seeds and matchups**, not content. A profile tuned and reported on the same seeds is a measurement artefact, and this repo has already published one. | M | **High** | L33-03 | To do |
| L33-05 | Promote the tuned profile: register it as `heuristic-tuned-v5`, gate it on beating `heuristic-v4` in the arena with **p < 0.01** over a seat-rotated holdout set of at least 2 000 games, and make it the default policy for solo and bot-filled rooms. **Acceptance:** the gate result, its seed set and both weights hashes are recorded in `decisions.md`. **Watch point:** the developer watches a full game against the new profile and signs off before it becomes the default (V3 Definition of Done clause). A profile that wins the gate and plays visibly stupidly is a signal that the arena is measuring the wrong thing. | M | Medium | L33-04 | To do |
| L33-06 | Feature-snapshot logging for Lot 37: at every decision in an arena or simulator game, write the L33-02 feature vector and the acting player id to JSONL alongside the existing game rows, labelled at game end with the winner. Off by default; enabled by an explicit flag, because it multiplies output size. **Acceptance:** a 1 000-game run produces a training file whose row count matches the summed decision count, and the label of every row matches the winner recorded in the game row. **Watch point:** stalled games have no winner. Rows from a stalled game must be **dropped, not labelled**, or the fitted evaluator learns from 17% of games whose outcome is undefined. | S | Low | L33-02 | Done |

---

## Lot 34 — Belief

The schedule risk of V5. The search in Lot 35 is textbook; reconstructing a defensible posterior
over kits, resources and hands from a public action log is bespoke work with no reference
implementation. Do not start Lot 35 before L34-06 is published.

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L34-01 | **Blocked on #V5-2.** Read out of the code whether the shop supply is finite or unlimited — `list-legal-economy.ts`, `buyCard` in `perform-action.ts`, and the `buyCost` fields in `card-catalog.ts` — and have the designer rule it. Record the ruling in `decisions.md`. **Acceptance:** the ruling states, in one sentence, whether an opponent's possible hand contents are constrained by what has already left the pool. **Watch point:** the two readings give completely different belief mathematics — a constrained deal versus a frequency prior over card ids — and L34-04 cannot be written under either until this is answered. Do not infer it from the code alone; the code's behaviour and the designer's intent are two different sources (golden rule 6). | S | **High** | — | Blocked |
| L34-02 | Kit posterior per opponent in `bots/belief/kit-posterior.ts`, from public evidence only: a special card played identifies its owner near-uniquely via `KIT_CATALOG.specialCards`; a public `outcome: 'immune'` narrows to kits whose `immuneTo` covers that card; an upgraded card played by a seat that never spent an upgrade point implies `alwaysUpgraded`; any `playMultipleAttacks` reveals `allowsMultipleAttacksPerTurn`. A kit contradicted by any observation gets probability **zero**. **Acceptance:** a test replays a scripted game and asserts the posterior collapses to the true kit within N public plays for each of the 15 kits, and never assigns non-zero probability to a contradicted kit. **Watch point:** Prophet draws random specials (#V4-27), so a special played by a Prophet is weak evidence for the kit that normally owns it. Over-inferring here produces a bot confidently searching the wrong world. | **L** | **High** | L34-01 | To do |
| L34-03 | Resource reconstruction by log integration in `bots/belief/resources.ts`. Opponent lives and points are **private** — `enumerationStateFromView` falls back to `lives: 1`, `points: 0`, and `knownOpponentLives` returns `null` — so they are derived: start from the sampled kit's `startingResources`, then integrate every publicly logged change (`actionResolved.livesLost`, `shieldAbsorbed`, public gains, elimination rewards). Where the log is silent — persistent ticks, Points Generator income, theft amounts — carry an **interval** and sample within it. **Acceptance:** on a scripted game with no hidden income, the reconstructed life total matches ground truth exactly; with hidden income, the true value lies inside the reconstructed interval on every turn. **Watch point:** the interval width *is* the bot's uncertainty and must reach the evaluator as a feature (technical spec v5 §5.1, Belief group). Collapsing it to a point estimate makes the bot equally confident about a seat it has watched all game and one it has never seen. | **L** | **High** | L34-02 | To do |
| L34-04 | Hand and special sampling in `bots/belief/hands.ts`, consistent with the sampled kit's `startingCardCounts`, every card publicly played, sold, dumped to the pool or claimed as a reward, and the hand-size accounting from L34-03. Implementation follows the #V5-2 ruling. **Acceptance:** a sampled hand never contains a card whose every instance is provably elsewhere (in the pool, in the bot's own hand, or publicly consumed); sampled hand sizes match ground truth within the accounted interval. **Watch point:** Card Thief steals and Card Transformer results are private by design (technical spec v4 §5.1), so hand size is genuinely ambiguous after either. Model that ambiguity; do not paper over it with a point estimate. | M | **High** | L34-03 | To do |
| L34-05 | `determinizeFromView(view, log, rng): GameState` in `bots/belief/determinize.ts`, assembling L34-02 to L34-04 on top of an extended `enumerationStateFromView` — extended, not duplicated; everything it already reconstructs correctly (pool, pending effects, persistents, block, charges, reanimation) is kept verbatim. **The signature takes no `GameState`.** Spy relations are filled from the acting player's own relations only (#V4-35 precedent). **Acceptance:** the consistency guard passes — every sampled world is a legal `GameState`, agrees with the view on every public field, and yields **the same legal action set for the acting player** as `listLegalActions` on the real state, reusing `list-legal-actions-view-guard.test.ts`'s machinery. **Watch point:** a failing consistency guard is a **belief or rule question, not a flaky test** — same discipline as the §10.1 guard it extends. Stop and ask. | M | **High** | L34-04 | To do |
| L34-06 | Calibration harness `bench-determinizer.ts` and the published calibration. In the simulator ground truth is available: sample K determinizations per decision and report kit top-1 and top-3 accuracy over game time, life-total mean absolute error, hand-content precision and recall, and the **rate of impossible determinizations, which must be 0**. Publish under `docs/simulation/<date>-v5-belief/` with the same discipline as a balance screen: it concludes nothing about balance and changes no value. **Acceptance:** the writeup states accuracy as a function of turn number, so the reader can see how long the bot stays blind at the start of a game. **Watch point:** this task is what makes the belief model falsifiable. Skipping it does not save time — it moves the cost to Lot 35, where a search over badly-sampled worlds is confidently wrong and the cause is three lots upstream. | M | **High** | L34-05 | To do |

---

## Lot 35 — Search

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L35-01 | **Blocked on #V5-1.** Rule ISMCTS with per-iteration re-determinization versus N-tree PIMC, then scaffold the chosen algorithm in `bots/search/`. **Acceptance:** the ruling is recorded with the L32-05 throughput numbers cited as its justification, not as a preference. **Watch point:** the recommendation is ISMCTS on sample-efficiency grounds, but the deciding evidence is L32-05's measured playouts per second — if the forward model is fast enough, PIMC's simplicity may be worth more than ISMCTS's efficiency. Rule from the numbers. | S | Medium | L34-06 | Blocked |
| L35-02 | The node model. A node is **a decision belonging to one player**, not a turn: a single turn can contain several nodes owned by different players (an elimination reward is chosen by the eliminator, mid-resolution). Every sub-choice kind — Mirror, steal, pool-pick, special-pick, reanimation-kit, elimination-reward — is a search node answered by the policy under search, not by a fixed hook. Chance transitions (Sentence's victim, the 20-point special purchase, Prophet's starting specials, Mirror's default target on expiry) are sampled with the node's seeded rng and averaged over visits, never enumerated. **Acceptance:** a test drives a search through a position containing each sub-choice kind and asserts the choice varied with the search's value estimates rather than with a fixed rule. **Watch point:** answering sub-choices randomly inside rollouts produces value estimates that are worst precisely where the game is most decided — which pending attack to Mirror, which four cards to absorb. This is the same class of defect as the V4 scoring hole, one level deeper. | **L** | **High** | L35-01 | To do |
| L35-03 | Multiplayer values: each node stores a **vector** of values, one per living player, and the node's owner maximizes their own component (max^n). **Paranoid is explicitly rejected** — in a 3-to-4-player free-for-all it produces a bot that plays as though under coordinated assault, over-defending against the wrong seat while two others race ahead. Implements #V5-7 (evaluator target) and #V5-8 (opponents modelled as playing the same policy). **Acceptance:** in a scripted 3-player position where the correct play is to let two opponents fight, the search does not attack the weakened seat. **Watch point:** max^n assumes no coalitions, and that assumption is wrong against coordinated humans. Record it as an accepted limitation (technical spec v5 §11 #3); do not attempt to fix it in V5. | M | **High** | L35-02 | To do |
| L35-04 | PUCT action priors from the tuned policy: `P(a) = softmax(heuristicScore(a) / τ)`, with `τ` in `PolicyWeights`, plus progressive widening over the action set. `scoreActions` (L29-02, already exported for diagnostics) is the prior source — no second copy of the scoring logic. **Acceptance:** a test proves the search's first N expansions follow the prior ordering, and that a search with a uniform prior converges measurably slower on the same position. **Watch point:** the Assassin `playMultipleAttacks` candidate set is a deliberate ≤8 approximation (L16-02). Widening it here to "help the search" reintroduces the exponential enumeration technical spec v3 §4.3 forbids. | M | Medium | L35-03, L33-05 | To do |
| L35-05 | Truncation and backup. Cut rollouts at the depth cap and back up L33-02's value vector; the rollout policy inside the horizon is the tuned heuristic, **never random**. The depth cap is a `PolicyWeights` parameter whose **floor is two complete rounds** (4 to 8 decision plies at 2 to 4 players), because delayed resolution means an attack's consequence lands one full round later — a shallower search cannot see the effect of its own primary action and reduces to a slower greedy policy. **Acceptance:** a test asserts the configured depth cap never falls below two full rounds for the current seat count; a search at the floor beats the greedy policy on a fixed position set. **Watch point:** with p50 = 49 turns and a maximum of 1 258, and ~17% of games stalling at `MAX_TURNS`, a random playout to a terminal state is both far too slow and, one time in six, undefined. The truncation is not an optimisation — it is what makes the search well-defined. | M | **High** | L35-04 | To do |
| L35-06 | Sub-choice coverage assertion (technical spec v5 §10.5): a test that enumerates every `SubChoiceState` kind and asserts each is reachable as a search node and answered by the policy under search. **Acceptance:** adding a new sub-choice kind without a search node fails this test. **Watch point:** a kind that silently falls back to a fixed heuristic inside a rollout is a scoring hole of exactly the kind that already invalidated one published screen. Assert coverage; do not assume it. | S | **High** | L35-02 | To do |
| L35-07 | Promote the search policy: register `search-v5`, gate it on beating `heuristic-tuned-v5` in the arena with **p < 0.01** over a seat-rotated holdout set of at least 2 000 games, at the offline iteration budget. **Acceptance:** the gate result, both weights hashes, the iteration budget and the measured decision latency are recorded in `decisions.md`. **Watch point:** if search loses to the tuned heuristic, the cause is upstream — belief calibration (L34-06), evaluator quality (L33-02), or depth below the floor (L35-05) — and the correct response is to read those three, not to raise the budget until the number moves. | M | **High** | L35-05, L35-06 | To do |

---

## Lot 36 — Runtime

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L36-01 | Wire `search-v5` into the room through the L32-08 worker pool. **Iteration budget in the simulator and the arena; wall-clock budget in the room**, capped well below the turn timer with margin, and capped by `bot-think-ms` rather than added to it. **Acceptance:** a full 4-bot room plays to completion with search enabled and no room stall (technical spec v3 §10.4); same seed + weights hash + iteration budget → identical simulator output. **Watch point:** a wall-clock budget in the simulator destroys reproducibility, and nothing will flag it — the output simply differs between runs on a busy machine. The budget type is chosen by context, not by convenience. | M | **High** | L35-07, L32-08 | To do |
| L36-02 | Complete the fallback chain and instrument it: worker timeout, crash or illegal return → synchronous `heuristic-v4` → `draw` only if that throws. Emit a distinct log line per fallback so the rate is observable in production. **Acceptance:** a test kills a worker mid-decision and proves a legal heuristic action is played, not a draw; the fallback rate is visible without attaching a debugger. **Watch point:** a fallback rate that rises silently under load is how a search bot degrades into the V4 bot without anyone noticing. | S | **High** | L36-01 | To do |
| L36-03 | **Blocked on #V5-3.** Re-derive the difficulty tiers from one policy: Hard = full budget, no substitution; Normal = reduced budget (order 1/8) plus mild action-value sampling; Easy = `heuristic-v4` with the existing substitution rate. Rule whether weaker tiers keep uniform random substitution (`difficulty-noise.ts`) or switch to **softmax sampling over the search's own action values at a temperature**. **Acceptance:** the wire values `easy` / `normal` / `hard` and the `formatBotDifficulty` labels are unchanged (#V3-4); only what sits behind them changes. **Watch point:** uniform substitution beside a searching bot reads as **erratic, not weak** — nine excellent turns then a random shop purchase is more jarring to a human than a uniformly mediocre opponent. This is a player-experience regression that no test will catch. | M | Medium | L36-01 | Blocked |
| L36-04 | **Blocked on #V5-4.** Add `search-best` and `search-fallback` to `BOT_REASON_CODES` and rule whether the public `Why` panel may carry search statistics. Bump `PROTOCOL_VERSION` — **the only bump in all of V5**. **Acceptance:** the client's `format-bot-reason.ts` renders both new codes; a test proves no numeric evaluation, visit count or win-probability estimate reaches `BotDecisionReason.params`. **Watch point:** #V3-2 made the reason panel **public to every seat**. The bot's evaluation aggregates its own private hand quality, so publishing a win-probability number leaks private information through an explainability feature — a hidden-information leak arriving by way of a UI affordance, which is the last place anyone will look for one. | S | **High** | L36-01 | Blocked |
| L36-05 | Measure and sign off. Record the decision-latency distribution in the room under a realistic multi-room load, prove p99 sits inside the §8.2 budget, and have the developer play a full game against `search-v5` at each difficulty tier and sign off. **Acceptance:** the latency figures are recorded; the developer's sign-off names what the bot did well and what it did visibly wrong. **Watch point:** a green `pnpm verify` on a bot is necessary and not sufficient (V3 Definition of Done clause). Expect the bot to be tactically sharp and credulous about bluffing (technical spec v5 §6.6) — that is the algorithm working as designed, not a defect to file. | M | **High** | L36-01, L36-02, L36-03, L36-04 | To do |

---

## Lot 37 — Fitted evaluator

Mostly unattended compute. Can be written while Lot 36 is in review, but its gate depends on a
working search.

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L37-01 | Training pipeline from L33-06's snapshots: assemble feature rows, label each with whether the acting player eventually won, **drop every row from a stalled game**, and split into train / validation / test by seed so no game contributes to two splits. **Acceptance:** the row counts per split are recorded; no seed appears in more than one split; stalled games contribute zero rows. **Watch point:** splitting by row rather than by seed leaks the outcome across splits — every decision in one game shares one label — and the validation score then looks excellent for a model that has memorised game identity. | M | Medium | L33-06, L35-07 | To do |
| L37-02 | Fit a logistic regression over the L33-02 feature vector, export it as plain JSON, and implement inference in `bots/eval/fitted.ts`. No ONNX, no native dependency, no Python in the server path (designer ruling §2.1 #3). **Acceptance:** TypeScript inference reproduces the training-time predictions to within floating-point tolerance on the test split. **Watch point:** the model's calibration matters more than its accuracy — the search backs up these numbers as probabilities and averages them over visits. Report a calibration curve, not just a log-loss. | M | Medium | L37-01 | To do |
| L37-03 | Fit a gradient-boosted tree ensemble, export as plain JSON trees, implement inference in TypeScript — **only if L37-04's gate on the logistic model does not already pass**, or if it passes by a margin the ensemble might widen. **Acceptance:** same reproduction tolerance as L37-02; inference cost per call measured and recorded, because it sits in the search's inner loop. **Watch point:** an ensemble that is more accurate but slower can make the search weaker at a fixed budget — fewer, better-evaluated nodes is not always the trade to take. The arena decides, not the log-loss. | M | Medium | L37-02 | To do |
| L37-04 | Gate: search using the fitted evaluator beats search using the hand-written evaluator, in the arena, with **p < 0.01** at the same iteration budget. Promote only on a pass. **Acceptance:** the result and both weights hashes are recorded. **Watch point:** "the model fits well" is not the acceptance criterion and never was. A well-fitted evaluator that loses games is not an improvement, and this gate exists to make that outcome cheap to accept. | S | **High** | L37-02 | To do |

---

## Lot 38 — Screen

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L38-01 | Re-run the gross-imbalance screen under the promoted V5 policy, at the same games-per-cell figure as the V4 screen so the two are comparable, and log any coverage dropped — a silent cap reads as full coverage. **Acceptance:** the run completes with the stall rate reported and no game assigned an invented winner. **Watch point:** the stall rate may move in either direction under search — better play can end games faster, or find longer stable loops. Report the movement; do not explain it. | M | Medium | L37-04, L36-05 | To do |
| L38-02 | Publish under `docs/simulation/<date>-v5-search/` with config, aggregates, raw JSONL and a writeup, beside the V4 screen. **It concludes nothing about balance and changes no value.** The writeup states, verbatim and near the top, the technical spec v5 §11 limitations — in particular that a determinized bot **under-reports exploits requiring perfect information**, and that the figures are therefore a floor on how broken something is, never a ceiling. Name every card that appeared in fewer than N games. **Acceptance:** a reader who knows nothing about V5 can tell from the writeup alone what the numbers do and do not license. **Watch point:** this screen will be the input to the rebalancing version. Every hedge omitted here becomes a value changed for the wrong reason later. | S | Medium | L38-01 | To do |
| L38-03 | Determinism check on the published run: re-execute from the recorded seed, weights hash and iteration budget, and assert byte-identical output. **Acceptance:** the check passes and its command is recorded in the writeup's Reproduction section, as in the V3 and V4 screens. **Watch point:** if it fails, the cause is wall-clock leaking into a budget or thread completion order leaking into a merge (technical spec v5 §8.3) — not a flaky test. The screen is not published until it passes. | S | **High** | L38-01 | To do |

---

## Task count and honest sizing

| Lot | Tasks | Of which `Blocked` on a ruling |
|---|---|---|
| 32 — Instrument | 8 | 0 |
| 33 — Fitting | 6 | 0 |
| 34 — Belief | 6 | 1 |
| 35 — Search | 7 | 1 |
| 36 — Runtime | 5 | 2 |
| 37 — Fitted evaluator | 4 | 0 |
| 38 — Screen | 3 | 0 |
| **Total** | **39** | **4** |

**27 of 39 tasks are rated High risk and 8 are rated L complexity** — a higher proportion than any
previous version, and it is not inflation. V5's characteristic failure modes are all silent: a
mutation leaking into live room state, hidden information leaking through a worker payload or a UI
affordance, a weight set overfitted to its own training seeds, a belief model nobody measured, and
wall-clock leaking into a budget that was supposed to be reproducible. None of them produce a stack
trace. Several of them produce a bot that looks fine and a screen that reads clean.

**Four tasks remain blocked on a designer ruling** (L34-01, L35-01, L36-03, L36-04). L32-01 is
`Done` — golden rule 7 no longer instructs agents to refuse V5.

**The schedule risk is Lot 34, not Lot 35.** Monte-Carlo tree search over an existing engine is
well-trodden and the engine already exposes the seams it needs — an injected clock, injected
sub-choice hooks, a legal-action enumerator, and a state that is plain JSON. Reconstructing a
defensible posterior over kits, resources and hands from a public action log is bespoke, has no
reference implementation, and is the one component whose quality caps everything downstream. If this
version overruns, it overruns there.

**Two mappings are deliberately not one-to-one**, so do not read the lot tables as a feature
checklist: L33-02 delivers both the evaluator and the feature extractor that Lot 37 reuses unchanged,
and L37-03 may legitimately end as "not built" if L37-04's gate passes on the logistic model — a
`Done` status on a task whose outcome was to build nothing is the correct record of that decision,
with the reason in the commit body.
