# Holdout report — L33-04 (canonical)

Canonical tuned candidate after L33-03 fitting: profile `tuned-v5-candidate`
(hash `4514e2bfd9f533f1`), fit run `docs/simulation/2026-08-12-v5-fit-v5/`.

Weights hash: `4514e2bfd9f533f1`  
Split hash: `7a9ddbfe0cd80e66`  
Gauntlet: `[heuristic-v4]`

| Split | Win rate | Wilson CI | Wins / Losses / Stalls |
|---|---|---|---|
| Train | 0.5865 | [0.5312, 0.6398] | 183 / 129 / 88 |
| Holdout | 0.5155 | [0.4611, 0.5696] | 166 / 156 / 78 |

Gap (train − holdout): 0.0710  

Gap within CI width — **no overfitting flag** under the CI-width rule.

### Interpretation

Holdout is only slightly above 0.5. A larger seat-rotated probe
(`gate-large.json`, 12 000 games, seed `l33-05-gate-large`) measured
win rate **0.509** (4 673 / 4 505 / 2 822 stalls) with one-sided p ≈ 0.041
vs fair coin — a real but thin edge, not yet L33-05 gate strength at N=2 000
(needs ≈0.53) unless N is raised enough for this edge to clear p < 0.01.

Earlier runs (v1–v4) with tiny train sets or band-base mutation produced
large train/holdout gaps; scalar-only sparse mutation + a train-internal
valid gate is what produced this candidate. See sibling `README.md` and
`2026-08-12-v5-fit-v3/` / `…-v4/` for the discarded artefacts.
