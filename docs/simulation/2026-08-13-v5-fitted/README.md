# V5 fitted evaluator — 2026-08-13

Training pipeline and logistic baseline for Lot 37 (technical spec v5 §5.3).

## Data

| Artifact | Notes |
|---|---|
| `features.jsonl` | Belief-matched snapshots (L37-01 capture) from 80×2 seat-rotated arena games, `heuristic-v4` vs self, seed `l37-train` |
| `games.jsonl` / `games.arena-summary.json` | Arena game rows |
| `dataset/` | Seed-split train/val/test + `manifest.json` (`contentHash` `c9de8adb143b51c5`) |

**Stall rows:** none labelled (L33-06 / L37-01).  
**Policy note:** bootstrap fit used `heuristic-v4` self-play for wall-clock. Production promotion expects a **refit on `search-v5` self-play** before trusting L37-04 (plan training lock). Belief widths may still be sparse early-game.

## Model

| Field | Value |
|---|---|
| File | `apps/server/src/bots/eval/models/logistic-v5.json` |
| Kind | logistic |
| `contentHash` | `7226f3503a302a90` |
| Profile | `search-fitted-logistic` |

Calibration: `calibration.json` (test log-loss ≈ 0.709, Brier ≈ 0.258). Weak vs random — expected for small heuristic bootstrap; not a promotion signal.

## Commands

```bash
pnpm --filter @card-battle/server fit:assemble -- \
  --in ../../docs/simulation/2026-08-13-v5-fitted/features.jsonl \
  --out ../../docs/simulation/2026-08-13-v5-fitted/dataset \
  --seed l37-01-split

pnpm --filter @card-battle/server fit:logistic -- \
  --dataset ../../docs/simulation/2026-08-13-v5-fitted/dataset \
  --out src/bots/eval/models/logistic-v5.json \
  --report ../../docs/simulation/2026-08-13-v5-fitted/calibration.json \
  --policy-id search-v5 --games-approx N

pnpm --filter @card-battle/server gate:fitted-eval -- \
  --games 2000 --seed l37-04-gate \
  --out ../../docs/simulation/2026-08-13-v5-fitted/gate.json
```

## Gate / promotion

L37-04 script: `gate:fitted-eval`. Compares `search-v5` + fitted profile vs `search-v5` + linear at `OFFLINE_SEARCH_ITERATIONS` (64). Promote fitted as search-v5 evaluator default only on **p < 0.01** and developer playtest. Do **not** flip `DEFAULT_POLICY_ID` (L35-07 still Blocked).

L37-03 (GBDT): not built until the logistic gate fails or passes thinly.
