# V5 engage-search fitted evaluator — 2026-08-18

Lot 40 (L40-04): refit the logistic evaluator on `search-v5-engage` self-play,
then gate fitted vs linear at the **same** offline iteration budget (L37-04
pattern). No rule or value change. `DEFAULT_POLICY_ID` stays `heuristic-v4`.

## Data

| Artifact | Notes |
|---|---|
| `features.jsonl` | Belief-matched snapshots from `search-v5-engage` vs self, seed `l40-04-train`, 80×2 seat-rotated mirrored kits, 64 iterations, `--max-turns 200` |
| `games.jsonl` / `games.arena-summary.json` | 132 completed, 28 stalled (stalls contribute zero rows) |
| `dataset/` | Seed-split train/val/test + `manifest.json` (`contentHash` `e3e0b23432a75616`) |

**Stall rows:** none labelled (L33-06 / L37-01). Split by **seed**, never by row.

## Model

| Field | Value |
|---|---|
| File | `apps/server/src/bots/eval/models/logistic-v5-engage.json` |
| Kind | logistic |
| `contentHash` | `b0228a9ba3703da0` |
| Profile | `search-engage-fitted-logistic` (not default; does not overwrite `logistic-v5`) |
| Test log-loss / Brier | ≈ 0.590 / 0.203 |
| Inference parity | max abs error ~1e-15 |

Better holdout than the L37 heuristic bootstrap (`logistic-v5` ≈ 0.709 / 0.258).
Still not a promotion signal — the arena gate is.

## Commands

```bash
pnpm --filter @card-battle/server arena -- \
  --games 80 --policy-a search-v5-engage --policy-b search-v5-engage \
  --seed l40-04-train --kit-modes mirrored --search-iterations 64 \
  --max-turns 200 \
  --feature-snapshots ../../docs/simulation/2026-08-18-v5-engage-fitted/features.jsonl \
  --out ../../docs/simulation/2026-08-18-v5-engage-fitted/games.jsonl

pnpm --filter @card-battle/server fit:assemble -- \
  --in ../../docs/simulation/2026-08-18-v5-engage-fitted/features.jsonl \
  --out ../../docs/simulation/2026-08-18-v5-engage-fitted/dataset \
  --seed l40-04-split

pnpm --filter @card-battle/server fit:logistic -- \
  --dataset ../../docs/simulation/2026-08-18-v5-engage-fitted/dataset \
  --out src/bots/eval/models/logistic-v5-engage.json \
  --report ../../docs/simulation/2026-08-18-v5-engage-fitted/calibration.json \
  --policy-id search-v5-engage --games-approx 132

pnpm --filter @card-battle/server gate:fitted-eval -- \
  --prior engage --fitted-profile search-engage-fitted-logistic \
  --search-iterations 64 --max-turns 400 \
  --games 2000 --seed l40-04-gate \
  --out ../../docs/simulation/2026-08-18-v5-engage-fitted/gate.json
```

## Gate / promotion

Compares `search-v5-engage` + fitted vs `search-v5-engage` + linear at 64
iterations. Promote the fitted evaluator **inside engage-search only** on
**p < 0.01** and playtest. Do **not** flip `DEFAULT_POLICY_ID`. Do not fold
fitted into room `search-v5`.

L37-03 (GBDT): not built. Logistic **lost** to linear (not a thin miss of
p < 0.01). Trees on this 2p self-play set would chase a worse leaf eval.

Smoke (`l40-04-gate-smoke`, 40 games): 21–17 fitted, 2 stalls, p ≈ 0.31 —
wiring only.

| Field | Full gate (`l40-04-gate`) |
|---|---|
| Requested / decided / stalls | 2 000 / 1 815 / 185 |
| Fitted wins / linear wins | 882 / 933 |
| Win rate | **0.486** (Wilson 0.463–0.509) |
| One-sided p (H1: >0.5) | ≈ **0.89** |
| Candidate hash | `a09c0e3fd256e397` |
| Incumbent hash | `d3ab376c6a4ed37f` |
| Iterations / max turns | 64 / 400 |
| Elapsed | 474 733 ms (~8 min, 4 workers) |
| **passed** | **false** |

`search-v5-engage` keeps the **linear** evaluator. Artifacts: `gate.json`,
`gate-smoke.json`.
