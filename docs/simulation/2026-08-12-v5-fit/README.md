# V5 fit run — 2026-08-12 (Lot 33)

## Runs

| Run | Seed | Notes | Train WR | Holdout WR | Elite hash |
|---|---|---|---|---|---|
| v3 | `l33-03-fit-v3` | scalar-only mutate, train=40 | 0.650 | 0.484 | `32d22fb9ffe583c7` |
| v4 | `l33-03-fit-v4` | sparse mutate + workers, train=100, 40 gens | 0.582 | 0.503 | `47868f042f395634` |
| **v5** | `l33-03-fit-v5` | + valid gate, train=200, 25 gens | **0.587** | **0.516** | `4514e2bfd9f533f1` |

## Gauntlet

Frozen: `[heuristic-v4]` only (L33-03).

## Optimizer

`(1+λ)-ES` over action scalars + `survivalTermWeight`. Band bases fixed.
Bands mutated in early probes overfit train seeds (v1/v2) — see holdout reports.

## L33-04 holdout (canonical: v5)

See `2026-08-12-v5-fit-v5/holdout-report.md`.

Gap (train − holdout) = 0.071 — within CI width; not flagged as overfitting by the
CI-width rule, but holdout remains near 0.5 so the profile is **not** yet gate-ready
for L33-05 (needs ~0.53+ at N=2000 for p < 0.01).
