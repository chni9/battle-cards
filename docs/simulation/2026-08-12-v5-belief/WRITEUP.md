# Belief calibration (L34-06)

**Date:** 2026-08-12
**Task:** L34-06

## What was measured

Determinizations from `determinizeFromView` against simulator ground truth.
Kit posteriors scored from `inferBelief` (MAP / top-3). Life error uses the
midpoint of the reconstructed life interval. Hand scores are card-id multiset
precision/recall on sampled worlds (hand + specials).

**This writeup concludes nothing about balance and changes no value.**

## Config

| Field | Value |
|---|---|
| Games | 40 |
| Players | 4 |
| K samples / decision | 8 |
| Base seed | `l34-06-belief-calib` |
| Completed / stalled | 36 / 4 |

## Impossible worlds

Rate: **0.000000** (0 / 124376).
Acceptance requires **0**.

## Accuracy vs turn number

Blind early, then collapse where public tells uniquely identify a kit
(`UNIQUENESS_GUARANTEED_KIT_IDS`). Prophet / shared-special cases may keep
multi-kit support by design (designer A / L34-02).

| Turn bucket | Decisions | Kit top-1 | Kit top-3 | Uniq top-1 | Life MAE | Hand P | Hand R |
|---|---:|---:|---:|---:|---:|---:|---:|
| 0-9 | 400 | 0.231 | 0.356 | 0.244 | 1.851 | 0.414 | 0.400 |
| 10-29 | 800 | 0.573 | 0.656 | 0.584 | 1.268 | 0.588 | 0.580 |
| 30-59 | 1112 | 0.699 | 0.766 | 0.714 | 2.028 | 0.690 | 0.696 |
| 60-99 | 1010 | 0.810 | 0.868 | 0.824 | 2.729 | 0.744 | 0.764 |
| 100+ | 12225 | 0.851 | 0.940 | 0.871 | 4.225 | 0.775 | 0.803 |

## Totals

| Metric | Value |
|---|---|
| Decisions | 15547 |
| Kit top-1 | 0.796 |
| Kit top-3 | 0.881 |
| Uniqueness top-1 | 0.815 |
| Life MAE | 3.660 |
| Hand precision | 0.741 |
| Hand recall | 0.763 |
| Impossible rate | 0.000000 |

## Reproduction

```bash
pnpm --filter @card-battle/server bench:determinizer -- --games 40 --k 8 --seed l34-06-belief-calib --out docs/simulation/2026-08-12-v5-belief
```

Same seed + config → identical aggregates.

