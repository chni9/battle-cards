# Gross-imbalance screen — post heuristic stance pass

**Date:** 2026-08-05 (re-run after stance pass)  
**Config:** [`config.json`](./config.json) · **Aggregates:** [`aggregates.json`](./aggregates.json) · **Raw:** [`games.jsonl`](./games.jsonl)  
**Seed base:** `gross-imbalance-2026-08-04` (unchanged deals)  
**Policy:** Hard heuristic with build / contest / finish stance (Tax+/Regen+ farm,
Absorber+ ledger, contest defense keep). Spec:
`docs/superpowers/specs/2026-08-05-heuristic-stance-design.md`.

## What this instrument is

Self-play among instances of one mediocre heuristic. Technical spec v3 §8.3: ~70% =
*"look here"*, ~55% = noise. **Concludes nothing about balance; changes no rule.**

Win rates use **starting kits** (`startingKitId`).

## Run summary

| Metric | Value |
|---|---|
| Attempted | 1400 |
| Completed | 1165 |
| Stalled (`MAX_TURNS` = 2500) | **235 (~16.8%)** — up from ~5% after the scoring-hole fix |
| Median `turnSequence` | see aggregates |
| Elimination reasons | combat |

Higher stall rate is a **policy signal**: more Invest / farm / defense keep can loop
without kills. Report stalls; do not invent winners.

## Win rate by starting kit (completed)

| Kit | Wins / games | Rate |
|---|---|---|
| Untouchable | 451 / 685 | **66%** — soft lean |
| Assassin | 428 / 735 | **58%** — soft lean |
| Scientific | 142 / 627 | 23% |
| Kamikaze | 144 / 639 | 23% |

Kamikaze’s earlier soft lean (~63% post scoring-hole fix) **collapsed** under this
stance — consistent with farm/defense bias delaying Suicide lines, and with Assassin
finish / Sentence paths improving. Still not a nerf warrant from this screen alone.

## 1v1 matchups

| Matchup | Wins (A–B) | Games | Read |
|---|---|---|---|
| Kamikaze vs Untouchable | 29–137 | 166 | Look here (Untouchable) |
| Kamikaze vs Scientific | 48–66 | 114 | Soft lean Scientific |
| Assassin vs Kamikaze | 144–37 | 181 | Look here (Assassin) |
| Assassin vs Untouchable | 118–73 | 191 | Soft lean Assassin |
| Assassin vs Scientific | 149–36 | 185 | Look here (Assassin) |
| Scientific vs Untouchable | 13–137 | 150 | Look here (Untouchable) |

## What may be policy artefact

- **235 stalls** — farm/contest loops; tune or accept as hang signal.
- **Kamikaze floor** — may recover if finish stance recognises Suicide setup earlier.
- **Untouchable lean** — Imposition / Spy Thief / defense keep may be overtuned vs kits
  that need to race.

## Prior superseded rates (do not cite for balance)

| Pass | Kamikaze | Untouchable | Assassin | Scientific | Stalls |
|---|---|---|---|---|---|
| Draw-tied specials (broken) | ~78% | ~28% | ~39% | ~29% | ~7% |
| Scoring-hole fix | ~63% | ~60% | ~34% | ~19% | ~5% |
| **Stance pass (this)** | **23%** | **66%** | **58%** | **23%** | **~17%** |

## Reproduction

```bash
pnpm --filter @card-battle/server exec tsx src/simulation/run-gross-imbalance.ts
```
