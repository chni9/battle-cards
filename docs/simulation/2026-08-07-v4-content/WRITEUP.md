# Gross-imbalance screen — V4 content (Lots 21–30)

**Date:** 2026-08-07  
**Config:** [`config.json`](./config.json) · **Aggregates:** [`aggregates.json`](./aggregates.json) · **Raw:** [`games.jsonl`](./games.jsonl)  
**Seed base:** `gross-imbalance-v4-2026-08-07`  
**Policy:** Hard heuristic after Lots 20–30 (all V4 cards and kits scored).  
**V3 4-kit re-baseline:** [`../2026-08-07-v3-baseline-rerun/`](../2026-08-07-v3-baseline-rerun/)

## What this instrument is

Self-play among instances of one mediocre heuristic. Technical spec v3 §8.3: ~70% =
*"look here"*, ~55% = noise. **Concludes nothing about balance; changes no rule or value.**

Win rates use **starting kits** (`startingKitId`).

**Wall-clock:** ≈ 25 minutes for 23 000 attempts (~65 ms/game) on the author machine.

## Coverage (L31-02)

| Slice | Config | Notes |
|---|---|---|
| 1v1 | **105** unordered pairs × **200** games | Full `C(15,2)` matrix; nothing dropped |
| 4p | **2000** games, **random** kits with replacement | Same as production (`kitAssignment` omitted). Not exhaustive over `C(15,4)`. Duplicate-kit tables possible — exploratory only |
| Difficulty | `hard` only | Sweeps deferred |

See `config.json` → `coverageNote`.

## Run summary

| Metric | Value |
|---|---|
| Attempted | 23 000 (21 000 1v1 + 2000 4p) |
| Completed | 20 378 |
| Stalled (`MAX_TURNS` = 2500) | **2622 (~11.4%)** |
| Median `turnSequence` | 32 |
| Mean `turnSequence` | 51.9 |

## Measurement target — Tactician Draw 4 (#V4-25 / L31-02)

Hypothesis recorded at L27-02: kit draw **4** plus inactivity auto-draw on `{ type: 'draw' }`
might make deliberate idle profitable (timeout farming is a room concern; headless bots never
timeout, but they can still over-choose draw).

| Kit | Mean draws / completed game | Stall share of seated games |
|---|---|---|
| Specialist | 9.41 | 9.1% |
| Wizard | 7.31 | 11.1% |
| Scientific | 5.49 | 16.9% |
| **Tactician** | **3.76** | **8.6%** |
| Assassin | 3.47 | 4.5% |
| Untouchable | 2.00 | 11.6% |
| Warrior | 1.33 | 2.9% |
| Duplicator | 0.00 | 10.7% |

**Observation (not a balance conclusion):** on this screen Tactician does **not** over-index on
draws or stalls versus the field. Specialist and Wizard draw more often; Ghost / Scientific /
Kamikaze stall more often. Draw value **unchanged** in V4.

## Stall rate (L31-03)

Stalls stay **counted, never assigned a winner**.

Overall stall rate: **2622 / 23 000 ≈ 11.4%** (lower than the V3 stance-pass ~16.8% and the
L31-01 4-kit re-baseline ~13.6%, on a much larger matrix). Median completed-game
`turnSequence` is **32** (mean 51.9).

### Kits over-represented in stalls (seated-game share)

| Kit | Stalled seats / seated | Share |
|---|---|---|
| Ghost | 644 / 3347 | **19.2%** |
| Scientific | 559 / 3315 | **16.9%** |
| Kamikaze | 486 / 3337 | **14.6%** |
| Indestructible | 435 / 3355 | **13.0%** |
| Witch | 416 / 3319 | **12.5%** |
| Juggernaut | 400 / 3302 | 12.1% |
| Untouchable | 389 / 3340 | 11.6% |
| Upgrader | 379 / 3373 | 11.2% |
| Wizard | 374 / 3368 | 11.1% |
| Prophet | 358 / 3327 | 10.8% |
| Duplicator | 358 / 3348 | 10.7% |
| Specialist | 299 / 3297 | 9.1% |
| Tactician | 289 / 3345 | 8.6% |
| Assassin | 149 / 3302 | 4.5% |
| Warrior | 97 / 3325 | 2.9% |

Ghost leads stall seats — consistent with a durable / second-life kit family, but this is a
**hang signal**, not a nerf warrant. Spec v4 §7 flagged Invisibility, Super Regeneration,
Indestructible and Reanimation as structural stall risk; Ghost (Reanimation + life-loss points)
and Indestructible appear in the top band; Warrior almost never stalls.

### 1v1 matchups with highest stall rates

| Matchup | Stalled / attempted |
|---|---|
| Ghost vs Scientific | 72 / 200 (36%) |
| Duplicator vs Wizard | 69 / 200 (34%) |
| Ghost vs Kamikaze | 65 / 200 (32%) |
| Kamikaze vs Scientific | 62 / 200 (31%) |
| Scientific vs Witch | 56 / 200 (28%) |
| Untouchable vs Wizard | 55 / 200 (28%) |
| Ghost vs Witch | 55 / 200 (28%) |
| Ghost vs Juggernaut | 54 / 200 (27%) |

No balance inference from stall cells.

## Win rate by starting kit (completed) — L31-04

| Kit | Wins / games | Rate | Flag |
|---|---|---|---|
| Warrior | 2591 / 3228 | **80.3%** | look here |
| Prophet | 1804 / 2969 | 60.8% | soft lean |
| Juggernaut | 1679 / 2902 | 57.9% | soft lean |
| Upgrader | 1732 / 2994 | 57.8% | soft lean |
| Untouchable | 1582 / 2951 | 53.6% | noise band |
| Assassin | 1579 / 3153 | 50.1% | |
| Tactician | 1335 / 3056 | 43.7% | |
| Ghost | 1169 / 2703 | 43.2% | |
| Witch | 1185 / 2903 | 40.8% | |
| Indestructible | 1152 / 2920 | 39.5% | |
| Duplicator | 1163 / 2990 | 38.9% | |
| Specialist | 1003 / 2998 | 33.5% | |
| Wizard | 957 / 2994 | 32.0% | |
| Scientific | 717 / 2756 | 26.0% | |
| Kamikaze | 730 / 2851 | 25.6% | |

**Input to a later rebalancing version (not a recommendation):** Warrior crosses ~70% overall.
Prophet / Juggernaut / Upgrader sit in the soft-lean band. Kamikaze and Scientific remain at the
floor among starting kits on this heuristic.

## 1v1 matchups at ~70%+ (look here)

Selected completed cells where one side won ≥70% of finished games (full list in
`aggregates.json` → `winRateByMatchup`). Extreme examples:

| Matchup | Wins (A–B) / games | Dominant |
|---|---|---|
| Warrior vs Wizard | 194–6 / 200 | Warrior 97% |
| Assassin vs Warrior | 10–188 / 198 | Warrior 95% |
| Specialist vs Warrior | 13–185 / 198 | Warrior 93% |
| Scientific vs Untouchable | 13–150 / 163 | Untouchable 92% |
| Kamikaze vs Prophet | 16–161 / 177 | Prophet 91% |
| Assassin vs Specialist | 177–20 / 197 | Assassin 90% |
| Warrior vs Witch | 170–22 / 192 | Warrior 89% |
| Specialist vs Untouchable | 25–167 / 192 | Untouchable 87% |

Many Warrior matchups clear 70%. Treat as **policy + content** signal for a future pass —
self-play among one heuristic is not fairness.

## Undersampled cards (N = 100)

Games in which the card appears in any seat’s `cardsPlayedById` at least once.
Threshold **N = 100** (documented in `config.json`).

| Card | Appearance games |
|---|---|
| `suicide` | **10** |

All other declared cards (30 distinct ids observed) appear in ≥100 completed games.
**Suicide** is effectively unmeasured on this screen (Kamikaze floor + policy reluctance) —
do not assume its balance from these aggregates.

## What may be policy artefact

- Warrior’s always-upgraded attacks and MEGA access may be overtuned **against this bot**, or
  the bot may under-defend that line.
- High stall kits (Ghost, Scientific, Kamikaze) may reflect invest / chip / second-life loops
  rather than win power (their win rates are mid or low).
- Random 4p win rates mix into `winRateByKit` and are **not** matchup-controlled.

## Reproduction

```bash
pnpm --filter @card-battle/server exec tsx src/simulation/run-gross-imbalance.ts -- \
  --kits untouchable,kamikaze,scientific,assassin,upgrader,tactician,indestructible,prophet,specialist,witch,warrior,wizard,juggernaut,ghost,duplicator \
  --games-per-cell 200 \
  --seed gross-imbalance-v4-2026-08-07 \
  --out docs/simulation/2026-08-07-v4-content \
  --four-player-mode random \
  --four-player-games 2000
```

`--out` resolves from the monorepo root.
