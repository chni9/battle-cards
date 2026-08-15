/**
 * Bot policies — technical spec v5 §7.1 (L32-02).
 *
 * Sources: `docs/technical_spec_v5.md` §7–§8 · `docs/backlog_v5.md` Lot 32 ·
 * v3 decision 2 (policy receives no `GameState`, not reopened).
 */

## Contract

- Every room and simulator bot decision resolves a **`BotPolicy`** from
  `apps/server/src/bots/registry.ts`. Do not import `heuristic-policy.ts` or
  `sub-choice-picks.ts` from `bot-driver`, `game-room`, or `run-game` — that
  breaks room/sim parity (decisions.md 2026-08-05 / L29-08).
- **`decide(view, actions, rng, ctx)`** — no `GameState`. `ctx.actionLog` is the
  public action log (#V5-9). Spy-revealed opponent fields live on the per-recipient
  **view**; use them only for seats this bot has Spyed.
- Registered today: `heuristic-v4` (frozen incumbent, ignores `ctx.actionLog`),
  `heuristic-tuned-v5` (experimental one-round re-rank; **not** room default until
  L33-05 gate), `search-v5` (ISMCTS; **not** room default until L35-07 gate), and
  `random-legal` (uniform legal pick). The worker resolves by `policyId`.

## Parity

A policy reachable from the room must be reachable from the headless simulator
with the same hooks (Mirror, steal, pool, special, reanimation kit, rewards).
Screens measure what players face only when that holds.

## Freeze

`heuristic-v4` is the yardstick (L32-03). If its freeze test fails, **do not**
update expectations — put the change under a new policy id.

## Weights profiles (L33-01)

- Typed `PolicyWeights` lives in `bots/policy-weights.ts`. Module constants in
  `heuristic-weights.ts` / life-thresholds remain the frozen default source.
- Checked-in profiles under `bots/profiles/` resolve by **id** (`default`, later
  tuned ids). Content hash via `computePolicyWeightsHash`. `heuristic-v4`'s
  `weightsHash` stays `computeHeuristicV4WeightsHash` (module exports only).
- Arena CLI: `--weights-profile <id>`. Room path never loads from env/network —
  only via a registered policy that closes over a checked-in profile.
- Inline score-play magic numbers are **not** in `PolicyWeights` (L33-01 scope).

## State evaluator (L33-02)

- `bots/eval/features.ts` — `extractFeatures(state, playerId, belief?)` / `FEATURE_LAYOUT_VERSION`.
- `bots/eval/evaluate.ts` — `evaluate` / `evaluateFromFeatures` → win-prob vector (#V5-7).
- Belief slots fill from optional `BeliefSummary` (L34-03). Omitted → zeros. `evaluate` does
  **not** take belief until Lot 35.

## Feature snapshots (L33-06 / L37-01)

- Off by default. Arena: `--feature-snapshots <path.jsonl>`.
- Stalled games contribute **zero** rows (throw before label).
- **L37-01:** capture is belief-matched — `buildPlayingViewFor` + `inferBelief(view, log)`
  + `extractFeatures(state, id, belief.summary)`. Belief APIs still take no `GameState`.
  Pre-L37 snapshots with zero belief widths must not train production models.
- Assemble: `pnpm --filter @card-battle/server fit:assemble` → seed-split train/val/test
  (`assemble-fitted-dataset.ts`). Split by **seed**, never by row.

## Fitted evaluator (Lot 37)

- Inference: `bots/eval/fitted.ts` (plain JSON logistic; GBDT reserved).
- Dispatch: `evaluateFromFeatures` reads `weights.evaluator.kind`
  (`linear` | `fitted-logistic` | `fitted-gbdt`) + optional `fittedModelId`.
- Fit: `pnpm --filter @card-battle/server fit:logistic`.
- Profile: `search-fitted-logistic` → `logistic-v5` model. Default evaluator stays **linear**.
- Gate: `pnpm --filter @card-battle/server gate:fitted-eval` — search+fitted vs
  search+linear at the same offline iteration budget. Promote only on p < 0.01 +
  playtest; do **not** flip `DEFAULT_POLICY_ID` (L35-07).
- L37-03 GBDT: build only if logistic gate fails or passes thinly.
- Artifacts: `docs/simulation/2026-08-13-v5-fitted/`.

## Fitting / optimizer (L33-03…05)

- `(1+λ)-ES` in `simulation/optimize-weights.ts`; fitness vs frozen gauntlet
  (`simulation/gauntlet.ts`, currently `[heuristic-v4]`).
- Train/holdout split written before gen 0 (`fit-split.ts`). Report with
  `report-holdout.ts` (train vs holdout + Wilson CI; gap > CI width → overfitting).
- Mutate action scalars + `survivalTermWeight` only; band bases stay fixed.
- Fitness workers: `fitness-pool.ts` / `fitness-worker.ts` — weights + matchups on
  the wire, never `GameState`. Matchups are chunked across workers.
- Promotion gate: `gate-tuned-v5.ts` — seat-rotated holdout, p < 0.01 vs
  `heuristic-v4`, then flip `DEFAULT_POLICY_ID` to `heuristic-tuned-v5`.
- **L33-05 still Blocked** (weight-only and one-round re-rank both fail the
  gate — see `decisions.md` 2026-08-12). `heuristic-tuned-v5` is registered for
  experiments (`one-ply-rerank.ts`: determinize → one round → evaluate, margin
  flip) but is **not** the room default. Do not soften p < 0.01 without a
  designer ruling.

## Belief — kit posterior (L34-02)

- `kitPosteriorForOpponent(opponentPlayerId, view, log): KitPosterior` in
  `bots/belief/kit-posterior.ts`. Public evidence only; no `GameState`.
- Spy `view.players[].spied.kitId` is a point mass. Otherwise a uniform prior over
  `KIT_IDS` is Bayes-updated from the public log.
- Tells: special `playCard` / `playMultipleAttacks` (catalog owner likelihood 1;
  Prophet `1-(1-1/20)^2`; impossible → 0); `outcome: 'immune'` only when some kit
  lists that `cardId` in `immuneTo` (thief/spy → Untouchable). Immune on other
  cards is Invisibility / Cloning-on-invisible — do not zero the roster.
  `playMultipleAttacks` → `allowsMultipleAttacksPerTurn`. Upgraded `playCard` with
  no prior `upgradeCard` / `buyUpgradePoint` → `alwaysUpgraded` when some kit
  lists that card.
- `sampleKit(posterior, rng)` weighted-samples a `KitId`.
- Uniqueness table: `bots/belief/kit-uniqueness.ts` (`UNIQUENESS_GUARANTEED_KIT_IDS`,
  `kitsOwningSpecial`, `isUniquenessGuaranteedKit`). Prophet is never uniqueness-
  guaranteed from specials alone. `imposition` is shared (Untouchable + Duplicator).
- **If we add new kits with shared or random specials, update `kit-uniqueness.ts`
  and this section.**

## Belief — resource reconstruction (L34-03)

- `reconstructOpponentResources(opponentPlayerId, kitId, view, log, lifeLimit)` in
  `bots/belief/resources.ts`. Public log only; no `GameState`.
- Unspied: start from `getKit(kitId).startingResources`, then integrate public
  `actionResolved.livesLost`, shop/play costs from catalogs, draw (`kit.draw`),
  upgrade-point economy, and `buySpecialCard` (−`SPECIAL_CARD_PURCHASE_COST`).
  Silent changes (regen quantity 1–4, persistent ticks, theft amounts, opaque
  `rewardsClaimed`) stay **intervals**.
- Spied live `lives` / `points` / `upgradePoints` are point intervals (width 0).
  Prefer those over `resourcesSnapshot`. Views have no `lifeLimit` — pass
  `CLASSIC_LIFE_LIMIT` (Classic `GameState.lifeLimit` is that constant; do not
  hardcode 25).
- `buildBeliefSummary` → `lifeWidthByOpponentOffset` as `(hi-lo)/lifeLimit` for
  living opponents in seat order relative to perspective (offsets 1..3, missing → 0).
- `extractFeatures(state, id, belief?)` writes those widths into `BELIEF_FEATURE_INDICES`.
  `evaluate` still calls `extractFeatures` without belief (zeros) until Lot 35.
- `sampleFromInterval(interval, rng)` uniform integer in `[lo, hi]` via `rng.next()` in `[0,1)`.

## Belief — hand and special sampling (L34-04)

- `accountOpponentHandSizes` / `sampleOpponentHandAndSpecials` in `bots/belief/hands.ts`.
  Public log only; no `GameState`. Pluggable `HandPrior` (`hand-prior.ts`); v1 is
  `uniformZonePrior`.
- **Shared cards stay in hand when played** (`playCardAction` in `perform-action.ts`).
  Specials are consumed. `buyCard` / `sellCard` change the matching zone; `draw` does
  not add cards. Playing a shared card is evidence of holding that id, not a size change.
- **#V5-2 unlimited shop:** do not forbid a `cardId` because a copy sits in the pool.
  Hard constraint is instance identity — never mint an `instanceId` from `view.self.hand`,
  `self.specialCards`, or `view.pool`.
- Spy-revealed `hand` / `specialCards` are copied as a point. Prophet starting specials
  have known *count* (`randomStartingSpecialCount`) and unknown ids (sample from
  `SPECIAL_CARD_IDS`). Kit specials not yet publicly played are preferred, then the prior.
- Card Thief / Attack Thief / Card Transformer / Card Absorber / opaque rewards **widen
  intervals** (technical spec v4 §5.1). Do not collapse them to a point.

## Belief — determinize (L34-05)

Pipeline, public evidence only — **no `GameState` in** (technical spec v5 §4.2):

1. `inferBelief(view, log): BeliefState` — per-opponent kit posterior, MAP-conditioned
   resource and hand-size intervals, and `BeliefSummary` for `view.you`. No sampling.
   `eliminationReveal.kitId` is a point mass (public death freeze).
2. `sampleDeterminizedState(belief, view, log, rng): GameState` — public skeleton from
   `enumerationStateFromView` (seed `determinize:${gameCode}:${you}:${turnSequence}:${rng}`),
   then per living opponent: `sampleKit` → `reconstructOpponentResources` →
   `sampleFromInterval` → `accountOpponentHandSizes` + `sampleOpponentHandAndSpecials`
   (`uniformZonePrior`). Spy slices are already point masses / point-copies.
3. `determinizeFromView(view, log, rng)` = (1) then (2). Arity 3; never a `GameState`
   parameter. `visibility` stays `[]` — Spy only via this seat's view slices (#V4-35).

Overlay keeps the enumeration skeleton verbatim (pool, pending, persistents, block,
charges, reanimation, self). Public `activeShield.isUpgraded` is written onto the
sampled opponent (enumeration always left `shieldIsUpgraded: false` for unspied seats).
Eliminated seats take `eliminationReveal` / snapshot; they are not resampled.

`extractFeatures(state, id, belief.summary)` is the evaluator path for life-interval
widths. `evaluate` still omits belief until Lot 35.

**Calibration gate (L34-06) before Lot 35.** Published:
`docs/simulation/2026-08-12-v5-belief/` (impossible rate **0**). Re-run:
`pnpm --filter @card-battle/server bench:determinizer`. Do not start Lot 35
search until calibration is current after belief changes. An unmeasured
determinizer is how V5 fails quietly.

## Search — ISMCTS (L35-01…)

- **Algorithm (#V5-1):** ISMCTS with per-iteration re-determinization — ruled from
  L32-05 throughput (~2.5×10³ truncated playouts/s), not preference. See
  `decisions.md` 2026-08-13.
- Scaffold under `bots/search/`: `search-types.ts`, `search-budget.ts`
  (`OFFLINE_SEARCH_ITERATIONS = 64`, depth floor 2, widening `c=1`/`α=0.5`),
  `info-set-key.ts`, `list-search-decisions.ts`, `apply-search-decision.ts`,
  `priors.ts`, `puct.ts`, `ismcts.ts`, `search-rollout.ts`.
- **L35-02:** `listSearchDecisions` / `applySearchDecision` — one node per
  main action or sub-choice; elimination-reward owner is the eliminator.
  Combinatorial pool/reward sets capped at 32. Do not call
  `performAndCompleteTurn` for tree steps (collapses the chain).
- **L35-03 / #V5-8:** max^n value vectors; `selectChild` maximizes the owner's
  component (paranoid rejected). Same policy for all seats. Coalitions = §11 #3
  accepted limitation.
- **L35-04:** `buildDecisionPriors` — `softmax(scoreActions / τ)` for main
  actions; uniform over sub-choice lists; progressive widening via
  `widenedPriorSlice`.
- **L35-05:** depth floor ≥2 full rounds; rollouts use base heuristic (never
  random); backup is belief-aware `evaluateFromFeatures`.
- **L35-06:** `sub-choice-coverage.ts` — `SEARCH_SUB_CHOICE_HANDLERS` must stay
  exhaustive over `SubChoiceKind`.
- **L35-07:** registered `search-v5` (`policies/search-v5.ts`). Gate script:
  `simulation/gate-search-v5.ts` (parallel policy-id workers). **Blocked** —
  arena gate vs `heuristic-v4` failed (`docs/simulation/2026-08-13-v5-search-gate/`);
  `DEFAULT_POLICY_ID` stays `heuristic-v4`. Sub-choice picks delegate to
  `heuristic-v4`.
- Per decide: `inferBelief` once; per iteration: `sampleDeterminizedState`.
  Eval path: `extractFeatures(..., belief.summary)` + `evaluateFromFeatures`
  (bare `evaluate()` still zeros belief).
- Base heuristic for priors/rollouts/gate: Lot 33 champion — room default
  `heuristic-v4` while L33-05 is Blocked; `heuristic-tuned-v5` is experimental
  only. Depth floor ≥2 full rounds is the strength lever (not more one-round
  probes).
- Progressive widening constants stay module-level until a later weights schema
  migration. Assassin multi-attack candidate cap ≤8 stays (L16-02).
- No `GameState` on `decide` / worker wire. No root-parallel merge inside one tree.

## Arena / workers

- Arena: `simulation/run-arena.ts` (L32-06) — seat rotation mandatory; gate
  promotes default policy only (#V5-10), not merges.
- Workers: `bots/search/worker/` (L32-08) — payload excludes `GameState`. Fallback:
  sync `heuristic-v4` → draw only if that throws. Room `BotDriver.decideAndAct` requests
  the pool asynchronously; Vitest uses `SyncSearchPool` so unit tests do not spawn threads.
  Fallback stages log `bot.fallback.<stage>` (L36-02): `worker_timeout`, `worker_crash`,
  `illegal_action`, `heuristic`, `draw` — greppable without a debugger.
- Forward-model budgets cite L32-05 numbers in `decisions.md`.
  Run: `pnpm --filter @card-battle/server bench:forward-model`.

## Gross-imbalance screen (L38)

- Same instrument as Lot 31: `run-gross-imbalance.ts` → `runScreen`.
- Flags: `--policy`, `--weights-profile`, `--search-iterations`, `--concurrency`.
  Omitted `--policy` stays `DEFAULT_POLICY_ID` (`heuristic-v4`). The **V5 published
  screen** passes `--policy search-v5 --search-iterations 64` (room Hard path;
  designer 2026-08-15). Do not pass `search-fitted-logistic` unless L37-04 has
  passed and folded fitted into search.
- `config.json` records `policyId`, `weightsProfile`, `policyWeightsHash`,
  `resolvedWeightsHash` (profile hash when set, else the registered hash), and
  `searchIterations`. A silent matrix cap vs V4 is written to `coverageDroppedVsV4`.
- Parallelism is **across games** (`screen-worker.ts`); JSONL is **sorted by seed**
  so completion order cannot leak. Never wall-clock in the simulator.
- Replay: `verify-screen-determinism.ts --published <dir>` (L38-03).

## Runtime budgets (L36-01)

- **Room:** wall-clock only, capped by `bot-think-ms` (not added to it). Search starts
  immediately on `scheduleTurn`; after the decision, the driver waits so elapsed ≥
  `thinkMs` (perceived floor). Pool timeout = `thinkMs + 250ms` slack.
- **Difficulty (L36-03 / #V5-3):** Hard = full wall-clock `search-v5`, no substitution.
  Normal = `floor(thinkMs/8)` + softmax over root visit scores. Easy = sync
  `heuristic-v4` (skips worker) + existing uniform `DIFFICULTY_RANDOM_RATES`.
  `DEFAULT_POLICY_ID` stays `heuristic-v4` until a future gate passes (L35-07 failed).
- **Simulator / arena:** iteration budget only (`searchIterations` / offline default
  64). Never wall-clock — reproducibility DoD.
- Hard search budget is `thinkMs − ROOM_SEARCH_BUDGET_MARGIN_MS` (50) so a finishing
  iteration stays inside the think envelope. Bench:
  `pnpm --filter @card-battle/server bench:room-latency`.
