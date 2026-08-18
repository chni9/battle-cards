# Arena validation vs V4 screen (L32-07)

**Date:** 2026-08-10  
**Task:** L32-07  
**V4 reference:** [`docs/simulation/2026-08-07-v4-content/`](../2026-08-07-v4-content/)  
**Arena raw:** [`arena-games.jsonl`](./arena-games.jsonl) · [`comparison.json`](./comparison.json)

## What was measured

`heuristic-v4` vs itself through the L32-06 arena (registry path), **random** kits,
**hard** difficulty, seat rotation mandatory (80 base seeds × 2 orientations = up to 160
completed games). Kit win rates are counted from each seat's `startingKitId` in the
JSONL — not from the arena's policy-A self-play half-count (which is always 0.5).

## Stall rates

| Source | Stall rate |
|---|---|
| V4 screen | 0.114 (2622 / 23000) |
| Arena validation | 0.113 (18 / 160) |

## Per-kit agreement

For each kit, agreement means the V4 published rate sits inside the arena sample's
Wilson CI **or** the arena rate sits inside the V4 screen's Wilson CI.

**Verdict: agreement**

All 15 kits agree within confidence intervals. No arena/registry defect found.

| Kit | V4 rate | Arena rate | Agree |
|---|---:|---:|:---:|
| kamikaze | 0.256 (n=2851) | 0.500 (n=12) | yes |
| untouchable | 0.536 (n=2951) | 0.619 (n=21) | yes |
| scientific | 0.260 (n=2756) | 0.333 (n=18) | yes |
| assassin | 0.501 (n=3153) | 0.571 (n=14) | yes |
| upgrader | 0.578 (n=2994) | 0.438 (n=16) | yes |
| tactician | 0.437 (n=3056) | 0.250 (n=16) | yes |
| indestructible | 0.395 (n=2920) | 0.345 (n=29) | yes |
| prophet | 0.608 (n=2969) | 0.731 (n=26) | yes |
| specialist | 0.335 (n=2998) | 0.214 (n=14) | yes |
| witch | 0.408 (n=2903) | 0.550 (n=20) | yes |
| warrior | 0.803 (n=3228) | 0.762 (n=21) | yes |
| wizard | 0.320 (n=2994) | 0.313 (n=16) | yes |
| juggernaut | 0.579 (n=2902) | 0.667 (n=21) | yes |
| ghost | 0.432 (n=2703) | 0.600 (n=15) | yes |
| duplicator | 0.389 (n=2990) | 0.440 (n=25) | yes |

## Reproduction

```bash
pnpm --filter @card-battle/server exec tsx src/simulation/validate-arena-vs-v4.ts
```

Base seed `l32-07-v4-validation`. Same seed + config → identical JSONL.
