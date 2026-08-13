# Technical spec — Card Battle, version 5 (Search bots, belief model, tuned and learned evaluation)

> Scope owner: the designer. Source hierarchy unchanged (`AGENTS.md` §2).
> This spec **reopens** three rulings that V1–V4 held closed. They are listed in §2.2 and must
> be confirmed in writing before Lot 32 starts, because every coding agent in this repo is
> currently instructed to refuse this work.
> Rules spec: `docs/spec_bataille_des_cartes_en.md`. Prior specs: `technical_spec_v1..v4.md`.
> V5 changes **no rule and no value**. Same discipline as V4.

---

## 1. Objective and non-objectives

### Objective

Replace the 1-ply greedy heuristic with a **searching bot that plans several turns ahead**, whose
evaluation of a position is **fitted to self-play outcomes** rather than hand-guessed, and which
**never sees a single byte of information a human in the same seat could not see**.

Three deliverables, in dependency order:

1. **A measurement harness** (§7) that can say whether policy B is better than policy A, with a
   confidence interval. The repo has no such instrument today: `run-gross-imbalance.ts` measures
   *kits* under one fixed policy. It cannot compare two policies, so no claim about bot strength
   made before this exists is falsifiable.
2. **A tuned heuristic and a fitted state evaluator** (§5) — the "learning" that ships first, and
   the component search depends on.
3. **A determinized Monte-Carlo tree search** over the real engine (§4, §6), running off the
   authoritative game loop, in worker threads, with a hard fairness boundary enforced by the
   process boundary and by the type signature.

### Non-objectives

- **No rule change. No value change.** Not a price, not a damage number, not a starting resource.
  A V5 task that appears to need a rebalance stops and asks. Same clause as V4 §2.1 #4.
- **No neural network, no GPU, no Python in the runtime.** Designer ruling (§2.1 #3): learning
  stops at a fitted linear or tree-ensemble evaluator with pure-TypeScript inference. AlphaZero-style
  policy+value training is out of V5 (§12), and stays out at least until the rebalancing pass has
  frozen the game's values — a trained network is the most rebalance-fragile artefact this project
  could produce.
- **No cheating bot, anywhere — including the offline balance simulator.** Designer ruling
  (§2.1 #1). The accepted cost of that ruling is recorded honestly in §11.
- **No new game mode.** Team, God and Quick stay out.
- **No player-count change.** 2 to 4, per #V4-30.
- **No per-human opponent profiling across games.** Adaptive modelling of a *named player's* habits
  is out (§12); the bot models the *seat*, from this game's public record only.

---

## 2. V5 scope

**In:**

| Item | Section |
|---|---|
| Policy registry — several policies coexist and can be pitted against each other | §3.2, §7.1 |
| Head-to-head arena: seat-rotated, kit-controlled, seeded, Wilson CI + Elo | §7.2 |
| Forward-model benchmark and the clone strategy it selects | §4.1 |
| Belief model / determinizer: view + public action log → a plausible full `GameState` | §4.2 |
| Belief calibration harness (the determinizer is scored against ground truth) | §7.4 |
| State evaluator `V(state, playerId) → win-probability vector` — new code, not a refactor | §5.1 |
| Weight optimizer (CEM / (1+λ)-ES) over policy, evaluator and search parameters | §5.2 |
| Fitted evaluator trained on self-play outcomes (logistic or GBDT, TS inference) | §5.3 |
| ISMCTS / PIMC over the real engine, max^n values, heuristic priors, truncated rollouts | §6 |
| Worker-thread execution and the room-side budget, fallback and latency contract | §8 |
| Difficulty re-derived from one policy (budget + temperature) | §9 |

**Out:** §12.

### 2.1 Decisions taken by the designer, 2026-08-07

Recorded here because they scope the whole of V5.

1. **The bot never reads hidden information.** Determinized search only, in the room *and* in the
   offline balance simulator. The accepted consequence — a determinized bot is a weaker balance
   instrument than a full-information one, and will under-report exploits that require perfect
   reads — is accepted, stated in §11, and must be repeated in every V5 simulation writeup.
2. **One bot, optimised for strongest play.** There is no separate "fun opponent" product. The
   player-facing bot is the strongest bot, throttled (§9). The consequence — that difficulty tiers
   are now a *throttle* on one policy, and that the existing uniform-random noise will read as
   erratic rather than weak beside a searching bot — is #V5-3.
3. **Learning stops at a fitted evaluator.** Tuned weights (§5.2) then a fitted state evaluator
   (§5.3). No neural network, no GPU, no Python sidecar.
4. **Lot 31 closes before Lot 32 opens.** V4's simulation lot (L31-01..04) is finished and
   published first, so V5 has a valid V4 baseline to be compared against. Without it, "the new bots
   are better" is an unfalsifiable claim — the same mistake the V3 screen already made once, under
   the scoring-hole defect (`docs/agent/decisions.md`, 2026-08-04).

### 2.2 Rulings V5 reopens — confirm in writing before Lot 32

These are **not** implementation details. Three closed rulings block this work outright, and the
repo's own instructions tell agents to refuse it. Each needs an explicit reopening entry in
`docs/agent/decisions.md` and a corresponding edit to `AGENTS.md`.

| Closed ruling | Where | What V5 needs |
|---|---|---|
| "**Learning bots, search and lookahead stay out**" | `AGENTS.md` golden rule 7; technical spec v3 §13; technical spec v4 §12 | Reopened for V5 in full. `AGENTS.md` golden rule 7 must be rewritten, or every agent session will stop and ask. |
| "**Opponent modelling beyond V3 §4.4's derived reads**" is out | technical spec v4 §12 | Reopened, **bounded**: modelling is limited to inference from *public* fields and the *public* action log, within one game. §4.2. |
| **#V3-5** — scoring weights stay module constants; "exposing weights for simulator sweeps is scope creep" | `decisions.md` 2026-08-03 | Reopened minimally (§5.2): weights become a typed, frozen-by-default data object. The module constants remain, as the default profile. Nothing else about #V3-5 changes. |

**Decision 2 of technical spec v3 — `decide` takes no `GameState` — is NOT reopened.** V5 keeps it
literally. The searching policy still receives only a view; it *constructs* the state it searches
(§4.2). This is deliberate: it is what makes ruling §2.1 #1 enforceable by a type signature instead
of by vigilance.

---

## 3. What exists, and what has to be built

### 3.1 Already in place and reusable unchanged

| Asset | Why it matters to V5 |
|---|---|
| `performAndCompleteTurn` (`engine/turn/orchestrate-turn.ts`) | A complete forward model already exists, and already takes **injected sub-choice hooks** and an **injected clock**. The seam search needs is built. |
| Injected clock (#V3-6, `SIM_NOW_MS = 0`) | Wall-clock cannot leak into a search tree. Reuse the same fixed clock. |
| Seeded `Rng` (`engine/rng.ts`), no `Math.random()` anywhere | Reproducible search is possible at all. |
| `listLegalActions(state, playerId)` | Action enumeration for search nodes. Assassin candidates already capped at 8 (L16-02) — do **not** "fix" that in V5. |
| `enumerationStateFromView(view, seed)` | ~60% of the determinizer already written: pool, pending effects, persistents, block, charges, reanimation are all reconstructed correctly. What it stubs is exactly what §4.2 must replace. |
| `list-legal-actions-view-guard.test.ts` and the §10.1 parity invariant | The determinizer's correctness test already has its machinery. |
| Simulation harness (`run-game.ts`, `run-batch.ts`, `aggregate.ts`), JSONL output | The arena and the training-data pipeline are extensions of this, not new systems. |
| `GameState` is plain JSON data | No `Map`, `Set`, `Date` or class instance in `GameState`, `Player`, `CardInstance`, `PendingEffect`, `PersistentEffect`. `structuredClone` is therefore valid. Verified by reading the domain types; §4.1 makes it a guard test rather than an assumption. |
| `BotDecisionReason` / `botReason` (#V3-2) | The explainability contract survives; V5 adds codes, it does not replace the mechanism. |

### 3.2 Missing, and therefore V5 work

| Gap | Consequence today |
|---|---|
| **No policy abstraction.** `heuristic-policy.ts`'s free functions are imported directly by `bot-driver.ts`, `game-room.ts` and `simulation/run-game.ts`. | Two policies cannot coexist, so no A/B comparison is possible. This is the first refactor and the highest-leverage one. |
| **No state evaluator.** `heuristic-policy.ts` scores **actions**, not **positions**. | Search has nothing to back up from a truncated node. This is new code, and it is the component most likely to be underestimated. |
| **No belief model.** `enumerationStateFromView` stubs every unspied opponent kit as `kamikaze`, every unspied hand as `[]`, every unspied life total as `1`. | Search on that state is a bot that believes its opponents hold no cards and are one hit from death. Worse than no search. |
| **No arena.** | "The bots are bad" and "the bots are better" are both currently unfalsifiable statements. |
| **No forward-model benchmark.** | Every search-budget number in this spec is a placeholder until it is measured. §4.1 is task one for that reason. |
| **No weight-tuning loop.** ~40 constants in `heuristic-weights.ts`, hand-set, several explicitly recorded as *"untested — not to be cited as measured"* (`decisions.md` 2026-08-05, L29-03). | The single cheapest available strength gain has never been taken. |
| **No worker isolation.** Bot decisions run on the Colyseus event loop via `setTimeout`. | Any search longer than a few milliseconds degrades every other room in the process. |

### 3.3 Facts about the current bot that shape the design

Stated because they are the actual reasons the bots play badly, and because two of them are
frequently misdiagnosed as "the heuristic is the problem".

1. **The policy is 1-ply and greedy.** `decideWithReason` scores each legal action once and picks
   the argmax, breaking ties with `rng.pick`. There is no model of what happens next.
2. **Delayed resolution makes 1-ply structurally blind.** A queued effect resolves on the target's
   turn, *after* they act (golden rule 3). A 1-ply policy therefore never observes the consequence
   of its own attack. This is not a tuning problem; it is a horizon problem, and it sets a **hard
   floor of two full rounds** on any useful search depth (§6.4).
3. **`Hard` is the raw greedy policy.** `DIFFICULTY_RANDOM_RATES.hard = 0`. The only difficulty axis
   is the probability of substituting a uniformly random legal action. There is no stronger setting
   to reach for; the heuristic's ceiling *is* Hard's ceiling.
4. **The weights were never optimised.** Every one is a hand-set module constant. `decisions.md`
   flags the L29-03 rescaling as untested in its own entry.
5. **Opponent lives and points are private.** `enumerationStateFromView` falls back to `lives: 1`,
   `points: 0` for unspied seats; `knownOpponentLives` returns `null`. A bot without Spy cannot see
   how close anyone is to dying. This is the single most consequential fact for §4.2 and §5.1, and
   it is why the belief model is not optional.
6. **~17% of self-play games stall** at `MAX_TURNS = 2500` (`docs/simulation/2026-08-04-gross-imbalance/`).
   Game length is heavily skewed: p50 = 49 turns, max = 1258. Random rollouts to a terminal state
   are therefore both far too slow and, one time in six, undefined. §6.5.

---

## 4. Architecture — the forward model and the belief model

### 4.1 The forward model: clone per node, and measure before choosing

**Contract.** `applySearchTurn(state, playerId, action, rng, hooks) → SearchStepResult`, wrapping
`performAndCompleteTurn` with a fixed clock (`SIM_NOW_MS`) and search-driven sub-choice hooks.

**Rule, non-negotiable: search never mutates a state it does not own.** The engine mutates in place
at ~77 sites across 35 files (technical spec v4 §10.3), `performTurnAction` is not transactional on
every failure path, and `redirectPendingAttack` splices and mutates. Every search node therefore
owns its own clone. A leaked mutation into a live room's `GameState` would be silent, cross-player,
and effectively impossible to reproduce from a bug report.

**Guard test (mandatory, and the most important test in V5):** take a real `GameState`, deep-freeze
a structural snapshot, run a full search decision against a view built from it, assert the state is
deep-equal to the snapshot afterwards.

**Clone strategy — decided by measurement, not by preference.** Task L32-01 benchmarks, on a
4-player mid-game state with a populated pool and several active persistents:

| Metric | Why |
|---|---|
| `structuredClone` cost per state (µs), and cloned byte size | Baseline |
| Hand-written `cloneGameState` cost (typed, field-by-field) | Usually 2–5× faster than `structuredClone`; costs one maintenance liability (a new `Player` field silently not copied) — which a round-trip equality test removes |
| Turns per second through `applySearchTurn` | The number every budget in §6 is derived from |
| Full truncated playouts per second, single thread | The number that decides whether ISMCTS is viable in TypeScript at all |

**Escalation ladder, in order, and no further:** `structuredClone` → hand-written `cloneGameState`
(with a `clone → mutate → assert independence` test) → **stop**. Copy-on-write and undo-logs are
explicitly **out** (§12): the engine's mutation surface makes an undo log a permanent correctness
liability, and V5 does not need it to be correct.

**Decision gate.** If measured throughput cannot support at least a few hundred truncated playouts
per decision within the room's latency budget (§8.2), the correct response is to *shrink the search*
(lower depth cap, stronger action pruning, better evaluator) — **not** to rewrite the engine. An
engine rewrite for bot performance is a rule-correctness risk taken for a bot, and golden rule 7's
old sentence — *"a bot playing badly is never grounds for touching a rule"* — survives V5 intact.

### 4.2 The belief model — determinization from public information only

This is the hard part of V5, the part most likely to overrun, and the part that ruling §2.1 #1
makes unavoidable.

**Contract.**

```ts
determinizeFromView(
  view: PlayingStateView,
  log: readonly ActionLogEntryView[],
  rng: Rng,
): GameState
```

**No `GameState` parameter. Ever.** The fairness ruling is enforced by this signature, by the
worker-process boundary (§8.1), and by a guard test asserting the search module's import graph
never reaches the room's authoritative state.

**Available evidence, and only this:**

| Source | Contains |
|---|---|
| `PlayingStateView.self` | The bot's own complete private state |
| `PlayingStateView.players[]` (public) | `isEliminated`, `activePersistentEffects`, `blockTurnsRemaining`, `blockAttacksForbidden`, `activeAttackBlock` (presence), `pendingReanimation`, `activeShield` (presence + tier) |
| `PlayingStateView.pool` | Public since V4 §4.3 — every sold, used and dumped card |
| `PlayingStateView.pendingEffects` | The public delayed-resolution queue |
| `spied` relations | Only those where **this bot** is the observer (#V4-35 precedent) |
| The public action log | `actionPlayed` (actor, action kind, `cardId`, `isUpgraded`, target), `actionResolved` (`livesLost`, `shieldAbsorbed`, `outcome`), `mirrorRedirected`, `playerReanimated`, `rewardsClaimed` |
| Static catalogs | `CARD_CATALOG`, `KIT_CATALOG`, `SPECIAL_CARD_CATALOG` |

**Construction, in four stages.**

**(a) Public skeleton.** Extend `enumerationStateFromView` rather than duplicating it. Everything it
already reconstructs correctly is kept verbatim.

**(b) Kit posterior per opponent.** Public evidence is far stronger than it looks:

- A **special card played** identifies its owner's kit near-uniquely — `suicide` → Kamikaze,
  `cloning` → Scientific, `sentence` / `points-generator` → Assassin, `block` → Tactician,
  `super-regeneration` → Indestructible, and so on down `KIT_CATALOG.specialCards`. Prophet is the
  deliberate exception (#V4-27 random specials) and must not be over-inferred.
- A public **`outcome: 'immune'`** resolve narrows to kits whose `immuneTo` covers that card. The
  current heuristic already exploits exactly this (`decisions.md` 2026-08-04, ONMMBZ entry).
- An **upgraded card played by a seat that never spent an upgrade point** implies `alwaysUpgraded`.
- **`allowsMultipleAttacksPerTurn`** is revealed by any `playMultipleAttacks`.
- Per-kit `upgradePointBuyCost` (Upgrader, #V4-28) is revealed by an observed buy price if the log
  carries it.

Maintain a posterior over `KIT_IDS`; a kit contradicted by any observation gets probability zero.
**A determinization inconsistent with something the bot has actually seen is worse than no search
at all** — it teaches the tree that impossible worlds are possible.

**(c) Resource reconstruction by log integration.** Because opponent lives and points are private
(§3.3 #5), they must be *derived*, not stubbed:

```
opponent_lives ≈ KIT_CATALOG[sampledKit].startingResources.lives
               + Σ public gains  −  Σ public livesLost (from actionResolved)
               ± an interval for changes the log does not publish
```

Where the log is silent — persistent ticks, Points Generator income, theft amounts, elimination
reward magnitudes — carry an **interval** rather than a point value, and sample within it. The width
of that interval *is* the bot's uncertainty, and it is the honest thing to search over.

**(d) Hand sampling.** Sample each opponent's hand and specials consistently with:
the inferred kit's `startingCardCounts`; every card publicly played, sold, dumped to the pool, or
claimed as a reward; and the hand-size accounting from (c).

> **#V5-2 closed (L34-01, 2026-08-12):** shop supply is **unlimited** (rules spec §1; designer
> ruling). Hands are sampled from kit-anchored accounting plus a pluggable prior over card ids —
> not a constrained deal. The pool does not constrain what an opponent *could* still hold.

**Guard tests.**

1. **Consistency.** Every determinization is a legal `GameState`, agrees with the view on every
   public field, and yields **the same legal action set for the acting player** as
   `listLegalActions` on the real state. This is §10.1 extended and reuses its existing machinery.
2. **Calibration** (§7.4). In the simulator, ground truth is available. Sample determinizations at
   every decision and score them per field against the truth: kit top-1 accuracy, life-total
   absolute error, hand-content precision/recall. **Without this the belief model is unfalsifiable**,
   and an unfalsifiable belief model is how a search bot ends up confidently worse than the greedy
   one it replaced.

### 4.3 Sub-choices are search nodes, not hooks

`resolveMirror`, `resolveSteal`, `resolvePoolPick`, `resolveSpecialPick`, `resolveReanimationKit`
and `resolveReward` are today answered by fixed heuristics inside `run-game.ts` and `bot-driver.ts`.

Inside the search they must be **decision nodes owned by the player who owns the choice** — because
they are exactly the choices that matter most (which pending attack to Mirror, which card to steal,
which four cards to absorb from the pool). Answering them randomly inside a rollout produces value
estimates that are worst precisely where the game is most decided.

Consequence: the search's node type is *"a decision belonging to player P"*, not *"a turn"*. A
single turn can contain several nodes belonging to different players (an elimination reward is
chosen by the eliminator, mid-resolution).

### 4.4 Chance nodes

Seeded draws — Sentence's victim, the 20-point special purchase, Prophet's starting specials,
Mirror's default target on expiry — are stochastic transitions. Handle them the standard MCTS way:
sample with the node's own seeded rng and average over visits. Do **not** enumerate them.

---

## 5. Evaluation and fitting — the "learning" that ships

### 5.1 The state evaluator (new code)

```ts
evaluate(state: GameState, features: FeatureVector): Float64Array  // one value per living player
```

Semantics: **estimated probability that player *i* is the sole survivor**, from this position.
Values sum to ≈1 over living players. Not damage margin, not a score — probability. A margin-based
evaluator makes the bot trade its own position for damage, which in a 2-to-4-player elimination game
is how a bot loses to the player it did not attack.

Features, all derivable from a determinized state, all normalized:

| Group | Features |
|---|---|
| Resources | lives / `lifeLimit`, points, upgrade points, shield, shield tier — self and per opponent |
| Tempo | pending incoming damage, pending outgoing damage, mutual-cancel pairs live |
| Material | hand size, upgraded-card count, specials held, summed card value |
| Persistents | active on self, active by self, counters remaining |
| Kit | trait flags of the inferred kit, `startingResources.draw` |
| Structural | living opponent count, turn position, `blockTurnsRemaining`, `attackBlockCharges`, `duplicationActive`, `pendingReanimation` armed |
| Belief | width of the life-total interval per opponent — i.e. how much the bot does *not* know |

Phase A: a hand-written linear combination over these features, weights tuned by §5.2.
Phase B: replaced by the fitted model of §5.3. **Same feature vector for both**, so Phase B is a
drop-in and Phase A is not thrown away.

### 5.2 Weight optimization — the first real strength gain

**Parameter vector:** the `heuristic-weights.ts` constants + the evaluator weights + search
hyperparameters (exploration constant, prior temperature, depth cap).

**Minimal reopening of #V3-5.** Weights become a typed `PolicyWeights` object whose **frozen default
is byte-identical to today's constants**, loadable from a JSON profile by the arena and the
optimizer. The module constants stay, as that default. Nothing else about #V3-5 changes, and the
room never loads a profile from anywhere but a checked-in file.

**Optimizer:** CEM or (1+λ)-ES. Gradient-free, tolerant of a noisy objective, trivially parallel
across worker threads. Not Bayesian optimization — the dimensionality is too high for it to pay.

**Fitness:** win rate against a **frozen gauntlet** — the V4 policy plus every previous champion —
never against the current population alone. Population-only fitness produces intransitive drift with
no absolute progress, and a bot that beats its own ancestors while losing to the original.

**Overfitting control:** tune on a training split of seeds and matchups; report on a held-out split
never used in tuning. A weight set that wins only on its training seeds is a measurement artefact,
and this project has already published one of those.

**Every weights profile gets a content hash, recorded in every simulation output.** A screen whose
policy cannot be identified is uninterpretable six weeks later.

### 5.3 The fitted evaluator

Training data is a by-product of the arena: snapshot the §5.1 feature vector at every decision,
label with the eventual winner, write JSONL alongside the existing game rows.

Model: **logistic regression first** (interpretable, fast, tiny, a strong baseline), then a
**gradient-boosted tree ensemble** if the arena shows it wins. Both export to plain JSON and
evaluate in a few hundred lines of TypeScript — no ONNX runtime, no native dependency, no Python
in the server path, per ruling §2.1 #3.

**Retraining after a rebalance is minutes, not weeks.** That is the entire reason this spec stops
short of a neural network: you have a rebalancing pass coming, and everything downstream of it must
be cheap to redo.

**Acceptance for Phase B is not "the model fits well".** It is: search using the fitted evaluator
beats search using the tuned hand-written evaluator, in the arena, with p < 0.01. A well-fitted
evaluator that loses games is not an improvement.

---

## 6. Search

### 6.1 Algorithm

**ISMCTS with per-iteration re-determinization**, recommended over N-tree PIMC (#V5-1): it shares
statistics across sampled worlds and needs far fewer total simulations for the same decision quality
— which matters when the forward model is TypeScript and the room budget is tens of milliseconds.
PIMC is the simpler fallback if ISMCTS's information-set bookkeeping proves too costly.

### 6.2 Multiplayer values — max^n, and an explicit rejection of Paranoid

Each node stores a **vector** of values, one per living player; the node's owner maximizes their own
component. **Paranoid (assume everyone targets me) is rejected**: in a 3–4 player free-for-all it
produces a bot that plays as though under coordinated assault, which in practice means over-defending
against the wrong seat while two others race ahead.

Known and accepted limitation (§11): max^n assumes no coalitions. Against three humans who *do*
coordinate, this bot will be weak. That is out of V5's reach and should not be pretended away.

### 6.3 Action priors from the tuned heuristic

The branching factor is large (play × targets, buy, sell, upgrade, buy upgrade point, buy special,
deactivate persistent, activate duplication, draw, plus up to 8 Assassin multi-attack candidates).
At room-scale budgets, plain UCB1 over that set will not converge.

Use **PUCT with the tuned heuristic as the prior**: `P(a) = softmax(heuristicScore(a) / τ)`. The
Phase A work is therefore not merely a warm-up — it is a load-bearing component of the search. This
is also why §5.2 comes before §6 in the backlog and not after.

### 6.4 Depth — a hard floor of two full rounds

Delayed resolution (golden rule 3) means an attack's consequence lands one full round later. A
search shallower than **two complete rounds** — 4 to 8 decision plies at 2 to 4 players — cannot see
the effect of its own primary action, and reduces to a slower version of the current greedy policy.

The depth cap is a tuned parameter with **two rounds as its floor**, not its default.

### 6.5 Truncation and rollouts — never random, never to terminal

- **No random rollouts.** With p50 = 49 turns and a max of 1258, a random playout is both far too
  slow and, in the ~17% of stalling games, undefined.
- **Rollout policy = the tuned heuristic** (fast, already exists, and now actually tuned).
- **Truncate at the depth cap and back up the §5.1 evaluator's value vector.** The stall problem
  disappears inside the search this way; it remains real in the arena, where it is reported as a
  first-class finding, never assigned a winner (V4 §7 discipline, unchanged).

### 6.6 Known pathologies — stated, not hidden

Determinized search has two documented failure modes, and this game exercises both:

- **Strategy fusion.** The search implicitly assumes it will *know* the hidden information at future
  decision points, so it systematically **undervalues information gathering (Spy) and is naive about
  bluffing**. ISMCTS reduces this; nothing eliminates it.
- **Non-locality.** The search cannot represent an opponent who plays differently *because* of what
  they are hiding.

Your delayed-resolution bluff mechanic — the core of the game's identity — is precisely the mechanic
this class of algorithm handles worst. **Expect a bot that is tactically sharp and strategically
credulous about deception.** If playtests show it is exploitable by repeated bluffing, that is the
algorithm working as designed, not a bug, and the fix is a research problem, not a tuning pass.

---

## 7. Measurement — built first, because nothing else is falsifiable without it

### 7.1 Policy registry

```ts
interface BotPolicy {
  readonly id: string;                    // 'heuristic-v4' | 'search-v5' | ...
  readonly weightsHash: string;
  decide(view, actions, rng, ctx): PolicyDecision;
  pickMirrorRedirect(...): MirrorPolicyPick | null;
  pickEliminationRewards(...): RewardPolicyPicks;
  pickSteal / pickPool / pickSpecial / pickReanimationKit(...): ...;
}
```

`bot-driver.ts`, `game-room.ts` and `simulation/run-game.ts` resolve a policy from the registry
instead of importing `heuristic-policy`'s free functions directly. `heuristic-v4` is registered as
the frozen incumbent and **is never modified again** — it is the yardstick.

### 7.2 The arena

`run-arena.ts`: policy A vs policy B, N games, seeded.

- **Seat rotation is mandatory** — every configuration is played in every seat permutation, or the
  result measures seat advantage.
- **Kit control:** mirrored assignment (both policies get the same kit in the same seed) *and* a
  random-assignment mode. Reported separately.
- Output: win rate, **Wilson confidence interval**, Elo delta, stall count, mean and p50 game
  length, per-kit breakdown, latency distribution, and both policies' weights hashes.
- **Regression gate:** a policy becomes the default only after beating the incumbent champion with
  p < 0.01 on a fixed held-out seed set.

### 7.3 Forward-model benchmark

`bench-forward-model.ts`, from §4.1. Its numbers are cited in the Lot 32 writeup and every search
budget in the repo derives from them. No search budget is chosen by intuition.

### 7.4 Belief calibration harness

`bench-determinizer.ts`. Runs simulated games where ground truth is known, samples K determinizations
per decision, and reports: kit top-1 and top-3 accuracy over game time; life-total mean absolute
error; hand-content precision and recall; and the rate of *impossible* determinizations (must be 0).

Published with the same discipline as a balance screen: it concludes nothing about balance and
changes no value.

---

## 8. Runtime — the live room

### 8.1 Worker threads, and the fairness boundary they enforce

Search runs in a `worker_threads` pool sized `min(cores − 1, configured)`. The worker receives a
**serializable payload only**:

```
{ view, actionLog, legalActions, budget, policyId, weightsProfile }
```

and returns `{ action, reason, stats }`.

The authoritative `GameState` is **not serializable into that payload** and is never sent. The
process boundary is therefore a second, structural enforcement of ruling §2.1 #1, on top of the
`determinizeFromView` signature. A future contributor cannot accidentally hand the searcher the real
state; they would have to deliberately widen the message type.

Secondary benefit: the Colyseus event loop stops being blocked by bot thinking, which today it is,
for every room in the process.

### 8.2 Budget, latency and fallback

| Context | Budget | Why |
|---|---|---|
| Simulator / arena | **Iteration count** | Wall-clock budgets make output non-reproducible, which would break the repo's determinism contract outright |
| Live room | **Wall-clock**, capped well below the turn timer | Responsiveness; reproducibility of a live game is knowingly given up here and must be stated in the DoD |

**Fallback chain on worker timeout, crash or an illegal return:** synchronous `heuristic-v4` decide
→ and only if *that* throws, `draw`. Today's fallback goes straight to `draw`, which under load
turns bots into passive spectators — a real behaviour bug that V5 fixes as a side effect.

`bot-think-ms` remains the floor on perceived thinking time; the search budget is capped by it, not
added to it.

### 8.3 Determinism rules

- Search rng derives from the existing scheme: `${seed}:bot:${botId}:${turnSequence}:search:${i}`.
- **Parallelism is across decisions and games, never within one search tree.** No root-parallel
  merge whose result depends on thread completion order.
- Same seed + same weights hash + same iteration budget → identical JSONL. This is a DoD line.

---

## 9. Difficulty under "one bot"

Ruling §2.1 #2 means difficulty is a **throttle on one policy**, not a choice between policies.

| Tier | Composition |
|---|---|
| Hard | Full search budget, no substitution |
| Normal | Reduced budget (order 1/8) plus mild action-value sampling |
| Easy | `heuristic-v4`, no search, existing substitution rate |

**Flagged consequence (#V5-3).** The existing mechanism — substituting a *uniformly random legal
action* — will read as **erratic rather than weak** beside a searching bot: nine excellent turns
followed by a random shop purchase is more jarring to a human than a uniformly mediocre opponent.

Recommendation, to be ruled on: replace uniform substitution with **softmax sampling over the
search's own action values at a temperature**. Same "one policy, throttled" principle; the weaker
tiers then make *plausible* mistakes rather than absurd ones. This changes no rule and is a policy
tunable.

---

## 10. Invariants and guard tests

V1–V4 invariants stay in force. V5 adds:

### 10.1 The search never touches authoritative state
Deep-equality of a live `GameState` before and after a full bot decision. Non-negotiable (§4.1).

### 10.2 The search never receives hidden information
Two enforcements, both tested: `determinizeFromView` and the policy entry point take no `GameState`;
and the worker payload type structurally excludes it (§8.1).

### 10.3 Determinization consistency
Every sampled world is a legal `GameState`, agrees with the view on every public field, and produces
the acting player's legal action set identically to `listLegalActions` on the real state (§10.1
extended).

### 10.4 Determinism
Same seed + weights hash + iteration budget → byte-identical simulator output.

### 10.5 Sub-choice coverage
Every sub-choice kind is reachable as a search node and answered by the policy under search. A kind
that silently falls back to a fixed heuristic inside a rollout is a scoring hole of exactly the kind
that already invalidated one published screen — assert coverage, do not assume it.

### 10.6 Frozen incumbent
`heuristic-v4`'s behaviour is locked by a fixed-seed regression test. If the yardstick moves, every
prior measurement becomes uninterpretable.

---

## 11. Limitations you are accepting — stated plainly

Not caveats. Consequences of decisions already taken, which will be visible in play and in the data.

1. **Determinized search is a weaker balance instrument than a cheating one** (ruling §2.1 #1).
   It cannot find exploits that require perfect reads, so V5's balance screen will **under-report**
   lines that only a full-information player could execute. Every V5 writeup must say this.
2. **Strategy fusion will make the bot naive about bluffing** (§6.6) — against the mechanic that
   defines your game.
3. **max^n assumes no coalitions** (§6.2). Against coordinated humans in 3–4 player games the bot
   will be exploitable, and no amount of budget fixes it.
4. **Belief quality caps search quality.** A search over badly-sampled worlds is confidently wrong.
   §7.4 exists so this is measured rather than argued about — and it is the most likely reason for
   V5 to end up *slower and no stronger* than V4 if it is skipped.
5. **One bot for two purposes** (ruling §2.1 #2). Optimising purely for strength means the
   player-facing experience is a throttle setting, not a design. Expect a second pass on
   *feel* later; V5 does not deliver one.
6. **Effort is dominated by the belief model, not the search.** MCTS over an existing engine is
   well-trodden. Reconstructing a defensible posterior over kits, resources and hands from a public
   action log is bespoke work with no reference implementation, and it is where this version will
   overrun if it overruns.

---

## 12. Out of V5 scope

Not to be implemented, even partially, even "to lay groundwork" — same discipline as v1 §9, v2 §9,
v3 §13, v4 §12:

- **Neural networks, GPU training, ONNX or any Python component in the runtime.**
- **Any full-information / cheating bot**, in the room or offline (ruling §2.1 #1).
- **Any rule or value change.** V5 measures; the rebalancing pass is its own version.
- **Copy-on-write or undo-log forward models** (§4.1 escalation ladder stops before them).
- **Team, God and Quick modes.** Player counts beyond 2–4.
- **Cross-game profiling of individual human players.**
- **Root-parallel or tree-parallel search** (§8.3 determinism).
- Accounts, persistence of in-progress games, monetization, spectator mode, replay playback.

---

## 13. Open decisions — rule before the dependent task starts

**Undefined, not inferred.** Golden rule 6.

| # | Question | Recommendation | Blocks |
|---|---|---|---|
| **#V5-1** | ISMCTS with per-iteration re-determinization, or N-tree PIMC? | **Closed (L35-01):** ISMCTS. Justified by L32-05 (~2.5×10³ truncated playouts/s): enough for a few hundred iterations/decision, but sample efficiency still wins at room budgets. PIMC remains fallback only if info-set bookkeeping measures too costly. | — |
| **#V5-2** | **Is the card shop supply finite or unlimited?** | **Closed (L34-01):** unlimited. Opponent hands are not constrained by pool outflow; sample via kit accounting + pluggable card-id prior. | — |
| **#V5-3** | Weaker difficulty tiers: keep uniform random substitution, or softmax over search action values? | **Softmax temperature.** Uniform substitution beside a searching bot reads as erratic, not weak. | Lot 36 |
| **#V5-4** | Does the public `Why` panel expose search statistics (visits, estimated win probability)? | **No numbers.** The bot's evaluation aggregates its own private hand quality; publishing it to every seat leaks private information through an explainability feature. Keep `botReason` coarse — add `search-best` and `search-fallback` codes only. | Lot 35 |
| **#V5-5** | Confirm the minimal reopening of #V3-5 (weights as a typed, hash-identified data object with today's constants as the frozen default). | Confirm. Without it §5.2 cannot exist. | Lot 33 |
| **#V5-6** | Confirm reopening `AGENTS.md` golden rule 7 / v4 §12 — search, lookahead and bounded opponent modelling are in scope for V5. | Confirm **in writing**, and edit `AGENTS.md` in the same change, or every agent session stops and asks. | Lot 32 |
| **#V5-7** | Evaluator target: pure win probability, or win probability plus a small survival term? | **Pure win probability**, with a survival term available as a tuned parameter initialised at 0. A survival bonus stabilises long games but produces a bot that turtles; let the optimizer decide its weight rather than the author. | Lot 33 |
| **#V5-8** | Does the search model opponents as playing the same policy (self-play assumption), or as weaker? | **Closed (L35-03):** same policy (self-play / max^n). Paranoid rejected. Coalitions are an accepted §11 limitation. | — |
| **#V5-9** | The policy signature gains the public action log as a parameter. Confirm. | Confirm — the log is public by #V3-2, so this grants the bot nothing a human lacks, but it is a signature change to the decision-2 contract and should be ruled rather than slipped in. | Lot 32 |
| **#V5-10** | Does the arena's regression gate block a merge, or only a default-policy change? | **Default-policy change only.** Blocking merges on a stochastic gate makes the repo unworkable for a solo developer. | Lot 32 |

---

## 14. Definition of Done — V5

V1's automated gate, V3's bot clause and V4's additions all apply, plus:

- [ ] `pnpm verify` green
- [ ] **No rule and no value changed anywhere**
- [ ] **No search code path accepts a `GameState` originating from a live room** (§10.2)
- [ ] The live-state deep-equality guard passes (§10.1)
- [ ] Determinization consistency test passes; zero impossible worlds sampled (§10.3)
- [ ] Determinism holds: same seed + weights hash + iteration budget → identical output (§10.4)
- [ ] Every sub-choice kind is covered as a search node (§10.5)
- [ ] `heuristic-v4`'s frozen regression test passes unchanged (§10.6)
- [ ] The candidate policy beats the incumbent in the arena with **p < 0.01** over a seat-rotated,
      held-out seed set of at least 2 000 games
- [ ] p99 room decision latency is inside the §8.2 budget, measured, not assumed
- [ ] The weights profile hash is recorded in every published output
- [ ] For a policy task, the developer has watched a bot play a full game and signed off
      (V3 clause, unchanged — a green `pnpm verify` on a bot is necessary and not sufficient)
- [ ] Backlog status flipped in the same change as the code; Conventional Commit references the task id

---

## Appendix A — Suggested lot sequencing

Sequenced so that each lot produces something falsifiable, and so that the two riskiest components
(the belief model, the search) land only after the instrument that can judge them exists.

| Lot | Content | Gate it must pass before the next lot opens |
|---|---|---|
| **32** — Instrument | Policy registry; frozen `heuristic-v4`; arena with seat rotation, Wilson CI, Elo; forward-model benchmark; worker-thread harness | The arena reproduces the V4 baseline within its own confidence interval |
| **33** — Fitting | `PolicyWeights` as data; state evaluator (hand-written); CEM/ES optimizer; frozen gauntlet; train/holdout split | The tuned policy beats `heuristic-v4` in the arena, p < 0.01, on held-out seeds |
| **34** — Belief | `determinizeFromView`; kit posterior; log-integrated resources; hand sampling; consistency + calibration harnesses | Calibration published; zero impossible worlds; kit top-1 accuracy reported over game time |
| **35** — Search | ISMCTS/PIMC; sub-choice nodes; chance nodes; max^n vectors; PUCT priors; truncation; `botReason` codes | Search beats the Lot 33 tuned policy in the arena, p < 0.01 |
| **36** — Runtime | Worker pool in the room; budgets; fallback chain; difficulty re-derivation; latency measurement | p99 latency inside budget; a full human-vs-bot game watched and signed off |
| **37** — Fitted evaluator | Feature snapshots; logistic then GBDT; JSON export; TS inference | Fitted evaluator beats the hand-written one *inside search*, p < 0.01 |
| **38** — Screen | Re-run the balance screen under the V5 policy; publish beside the V4 screen | Concludes nothing about balance; changes no value; states the §11 limitations |

**Honest sizing.** Lot 32 is a week. Lot 33 is where the first real strength gain arrives and is
mostly compute. Lots 34 and 35 are the bulk of V5, and **Lot 34 is the schedule risk** — the search
is textbook, the belief model is bespoke. Lots 36–38 are integration and reporting. Do not start
Lot 35 before Lot 34's calibration is published: a search over unmeasured beliefs is how this
version ends up slower than what it replaced.
