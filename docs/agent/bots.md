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
- Registered today: `heuristic-v4` (frozen incumbent, ignores `ctx.actionLog`) and
  `random-legal` (uniform legal pick). Later policies (`heuristic-tuned-v5`,
  `search-v5`) register the same interface — the worker resolves by `policyId`.

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

- `bots/eval/features.ts` — `extractFeatures(state, playerId)` / `FEATURE_LAYOUT_VERSION`.
- `bots/eval/evaluate.ts` — `evaluate` / `evaluateFromFeatures` → win-prob vector (#V5-7).
- Belief slots reserved (zeros). Same feature vector for Lot 37.

## Feature snapshots (L33-06)

- Off by default. Arena: `--feature-snapshots <path.jsonl>`.
- Stalled games contribute **zero** rows (throw before label).

## Fitting / optimizer (L33-03…05)

- `(1+λ)-ES` in `simulation/optimize-weights.ts`; fitness vs frozen gauntlet
  (`simulation/gauntlet.ts`, currently `[heuristic-v4]`).
- Train/holdout split written before gen 0 (`fit-split.ts`). Report with
  `report-holdout.ts` (train vs holdout + Wilson CI; gap > CI width → overfitting).
- Mutate action scalars + `survivalTermWeight` only; band bases stay fixed.
- Fitness workers: `fitness-pool.ts` / `fitness-worker.ts` — weights + matchups on
  the wire, never `GameState`. Matchups are chunked across workers.
- Promotion gate: `gate-tuned-v5.ts` — seat-rotated holdout, p < 0.01 vs
  `heuristic-v4`, then register `heuristic-tuned-v5`.

## Arena / workers

- Arena: `simulation/run-arena.ts` (L32-06) — seat rotation mandatory; gate
  promotes default policy only (#V5-10), not merges.
- Workers: `bots/search/worker/` (L32-08) — payload excludes `GameState`. Fallback:
  sync `heuristic-v4` → draw only if that throws. Room `BotDriver.decideAndAct` requests
  the pool asynchronously; Vitest uses `SyncSearchPool` so unit tests do not spawn threads.
- Forward-model budgets cite L32-05 numbers in `decisions.md`.
  Run: `pnpm --filter @card-battle/server bench:forward-model`.
