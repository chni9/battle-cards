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
| Stalled (`MAX_TURNS` = 2500) | 2622 (~11.4%) — detail in L31-03 |
| Median `turnSequence` | 32 |

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
