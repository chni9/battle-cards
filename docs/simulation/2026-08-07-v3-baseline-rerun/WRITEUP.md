# Gross-imbalance screen — V3 baseline re-run (L31-01)

**Date:** 2026-08-07  
**Config:** [`config.json`](./config.json) · **Aggregates:** [`aggregates.json`](./aggregates.json) · **Raw:** [`games.jsonl`](./games.jsonl)  
**Seed base:** `gross-imbalance-2026-08-04` (same seed string as the original screen)  
**Policy:** Hard heuristic after L20-17 residual fallback / immunity fixes (and all later
Lot 20–30 content code that shares the same policy path).

## What this instrument is

Self-play among instances of one mediocre heuristic. Technical spec v3 §8.3: ~70% =
*"look here"*, ~55% = noise. **Concludes nothing about balance; changes no rule.**

Win rates use **starting kits** (`startingKitId`).

This folder sits **beside** [`../2026-08-04-gross-imbalance/`](../2026-08-04-gross-imbalance/)
and does not replace it. The 2026-08-04 / stance-pass screen was produced while at least four
cards were played near-randomly against drawing (fallback tied to `{ type: 'draw' }`). L20-17
fixed that fallthrough; this run is the comparable 4-kit baseline for V4.

**Comparability caveat:** same seed string does **not** replay August 2026 deals byte-for-byte.
Prophet sequential draws and other V4 engine paths shift RNG streams (L27-04). Compare
**published rates**, not row identity.

**Wall-clock:** pilot ≈ 88 ms/game; this 1400-attempt run ≈ 89 s wall on the author machine.

## Run summary

| Metric | This run | Prior stance pass (`2026-08-04-gross-imbalance`) | Δ |
|---|---|---|---|
| Attempted | 1400 | 1400 | 0 |
| Completed | 1210 | 1165 | +45 |
| Stalled (`MAX_TURNS` = 2500) | **190 (~13.6%)** | 235 (~16.8%) | **−3.2 pp** |
| Median `turnSequence` | 40 | 49 | −9 |

Stalls stay counted, never assigned a winner.

## Win rate by starting kit (completed)

| Kit | This run | Prior stance | Δ (pp) |
|---|---|---|---|
| Untouchable | 448 / 691 (**64.8%**) | 451 / 685 (**66%**) | **−1.2** |
| Assassin | 441 / 740 (**59.6%**) | 428 / 735 (**58%**) | **+1.6** |
| Kamikaze | 186 / 679 (**27.4%**) | 144 / 639 (**23%**) | **+4.4** |
| Scientific | 135 / 656 (**20.6%**) | 142 / 627 (**23%**) | **−2.4** |

No kit crosses the ~70% “look here” threshold on this re-run. Kamikaze recovers somewhat from
the stance-pass floor but stays far below its defective-era ~78% / scoring-hole ~63% figures
(see prior WRITEUP superseded table — do not cite those for balance).

## 1v1 matchups

| Matchup | This (A–B / games) | Prior stance (A–B / games) | Read |
|---|---|---|---|
| Kamikaze vs Untouchable | 34–140 / 174 | 29–137 / 166 | Look here (Untouchable) — unchanged call |
| Scientific vs Untouchable | 13–138 / 151 | 13–137 / 150 | Look here (Untouchable) |
| Assassin vs Untouchable | 129–64 / 193 | 118–73 / 191 | Soft lean Assassin (stronger than prior) |
| Kamikaze vs Scientific | 70–75 / 145 | 48–66 / 114 | Noise — nearly even |
| Assassin vs Kamikaze | 131–56 / 187 | 144–37 / 181 | Look here (Assassin) — Kamikaze wins up |
| Assassin vs Scientific | 160–27 / 187 | 149–36 / 185 | Look here (Assassin) |

## Stall attribution (this run)

| Kit | Stalled seats / seated | Stall share of seats |
|---|---|---|
| Scientific | 144 / 800 | 18.0% |
| Kamikaze | 121 / 800 | 15.1% |
| Untouchable | 109 / 800 | 13.6% |
| Assassin | 60 / 800 | 7.5% |

Highest 1v1 stall cells: `kamikaze_vs_scientific` (55/200), `scientific_vs_untouchable` (49/200).
No balance conclusion from stall composition.

## What may be policy artefact

- Stall rate down vs stance pass — still a hang signal, not a fairness metric.
- Kit-rate moves are modest (±1–4 pp) relative to the defective-era swings; treat as
  re-baseline noise unless a later V4 screen shows the same lean against new kits.

## Reproduction

```bash
pnpm --filter @card-battle/server exec tsx src/simulation/run-gross-imbalance.ts -- \
  --kits untouchable,kamikaze,scientific,assassin \
  --games-per-cell 200 \
  --seed gross-imbalance-2026-08-04 \
  --out docs/simulation/2026-08-07-v3-baseline-rerun \
  --four-player-mode fixed \
  --four-player-mix untouchable,kamikaze,scientific,assassin \
  --four-player-games 200
```

`--out` is resolved from the monorepo root (not `apps/server` cwd).
