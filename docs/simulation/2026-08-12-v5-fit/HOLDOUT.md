# Holdout report — L33-04 (canonical)

## Primary writeup — fit-v8 (random-kit split, valid-gated ES)

Profile: `tuned-v5-candidate` at hash `5686e970ce462b79`  
Artifacts: `docs/simulation/2026-08-12-v5-fit-v8/`  
Gauntlet: `[heuristic-v4]`  
Split hash: `2cd7fde7f9431541`

| Split | Win rate | Wilson CI | Wins / Losses / Stalls |
|---|---|---|---|
| Train | 0.5626 | [0.5190, 0.6053] | 283 / 220 / 97 |
| Holdout | 0.4505 | [0.4072, 0.4946] | 223 / 272 / 105 |

Gap (train − holdout): **0.1121**  
**Overfitting:** gap wider than the confidence interval width — reported, not smoothed.

## Earlier candidate — fit-v5 (mixed kits, valid gate)

Hash `4514e2bfd9f533f1` · `docs/simulation/2026-08-12-v5-fit-v5/`

| Split | Win rate | Wilson CI | Wins / Losses / Stalls |
|---|---|---|---|
| Train | 0.5865 | [0.5312, 0.6398] | 183 / 129 / 88 |
| Holdout | 0.5155 | [0.4611, 0.5696] | 166 / 156 / 78 |

Gap 0.071 — within CI width (no overfitting flag under that rule).

Large seat-rotated probes vs `heuristic-v4` (same profile):

| Seed | Games | Decided | Win rate | One-sided p |
|---|---|---|---|---|
| `l33-05-gate-probe` | 2 000 | 1 550 | 0.512 | ≈ 0.17 |
| `l33-05-gate-large` | 12 000 | 9 178 | 0.509 | ≈ 0.041 |
| `l33-05-gate-xl` | 25 000 | 19 065 | 0.504 | ≈ 0.12 |

The apparent train edge **does not survive** large held-out measurement. See
`decisions.md` 2026-08-12 · L33-05 blocked.

## Method notes

- Train/holdout seeds materialised before gen 0 (`fit-split.ts`).
- Band bases not mutated (v1/v2 showed band mutation overfits train seeds).
- Fitness workers chunk matchups; no `GameState` on the wire.
- Reporter: `pnpm --filter @card-battle/server exec tsx src/simulation/report-holdout.ts --out <dir> --profile <id>`
