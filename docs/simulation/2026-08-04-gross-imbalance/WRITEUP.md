# Gross-imbalance screen (L18-05) — post scoring-hole fix

**Date:** 2026-08-04 (re-run after heuristic fallthrough fix)  
**Config:** [`config.json`](./config.json) · **Aggregates:** [`aggregates.json`](./aggregates.json) · **Raw:** [`games.jsonl`](./games.jsonl)  
**Seed base:** `gross-imbalance-2026-08-04` (unchanged — same deals, new policy)  
**Policy:** V3 heuristic at **hard** (noise 0), with explicit scores for Sentence /
Imposition / Spy Thief / Points Generator (see `docs/agent/decisions.md`).

## Why this folder was overwritten

The first pass (same seed) scored every unbranched `playCard` as `sustain` (= draw =
100). Ties went to `rng.pick`, so base **Sentence** (self-elim risk) and other
specials were coin-flipped against draw. Assassin / Untouchable rates were partly
artefact. Numbers below replace that pass; do not cite the earlier 78% / 39% / 28%
kit rates.

## What this instrument is

Self-play among instances of one mediocre heuristic (no lookahead, no bluffing, no
opponent modelling). Technical spec v3 §8.3: treat ~70% win rate as *"look here"*,
~55% as noise until proven otherwise. **This screen concludes nothing about balance
and changes no rule.**

Win rates use **starting kits** (`startingKitId`). Final `kitId` can change after
Cloning and must not be used for matchup attribution.

## Run summary

| Metric | Value |
|---|---|
| Attempted cells | 6×200 1v1 + 200 four-player one-of-each = 1400 |
| Completed | 1326 |
| Stalled (hit `MAX_TURNS` = 2500) | **74 (~5.3%)** (was ~7.4% on broken policy) |
| Median `turnSequence` (completed) | 28 |
| Mean `turnSequence` | ~39 |
| Elimination reasons | combat only (1702 events) |

Stalls remain a real instrument finding: hard self-play can enter long invest / chip /
Untouchable loops with no elimination. They are **counted, not assigned a winner**.

## Win rate by starting kit (all completed games)

| Kit | Wins / games | Rate |
|---|---|---|
| Kamikaze | 473 / 755 | **63%** — soft lean (no longer ≥70% “look here”) |
| Untouchable | 451 / 757 | **60%** — soft lean (was ~28% under draw-tied specials) |
| Assassin | 256 / 754 | 34% |
| Scientific | 146 / 762 | 19% |

Kamikaze no longer clears the §8.3 look-here bar alone. Untouchable’s jump matches
giving Imposition / Spy Thief real Invest / Deny scores instead of draw lottery.
Scientific stays low — still compatible with Cloning / Spy under-use, not a nerf
warrant.

## 1v1 matchups (canonical kit order)

| Matchup | Wins (A–B) | Games | Read |
|---|---|---|---|
| Kamikaze vs Untouchable | 99–91 | 190 | Coin flip (was Kamikaze blowout) |
| Kamikaze vs Scientific | 158–31 | 189 | Look here (Kamikaze) |
| Assassin vs Kamikaze | 26–162 | 188 | Look here (Kamikaze) |
| Assassin vs Untouchable | 92–94 | 186 | Coin flip |
| Assassin vs Scientific | 132–60 | 192 | Soft lean Assassin (~69%) |
| Scientific vs Untouchable | 38–155 | 193 | Look here (Untouchable) |

## Appendix A hypotheses — what the numbers can and cannot say

From `technical_spec_v1.md` Appendix A “balancing pass”:

1. **Upgraded Suicide reward cascade (Kamikaze)**  
   Still strong vs Scientific and Assassin in 1v1, but **not** a gross overall spike
   once Untouchable specials are scored (~63% overall; even vs Untouchable). Treat as
   “watch in human play,” not “nerf from this screen.”

2. **Cloning as cheap escape hatch (Scientific)**  
   Scientific remains weak (19% overall). This screen does **not** support “Cloning is
   overtuned” against this bot.

3. **Spy devalued by public actions**  
   Still not separable from policy blind spots. Assassin middling; Scientific low.

## What may be policy artefact

- **74 stalls** — still report on every hard batch.
- **Untouchable soft lean** — may shrink if a future policy races Imposition / burns
  counters harder, or if Spy Thief Deny is overtuned.
- **Scientific floor** — may be Cloning / intel under-scoring rather than kit weakness.

## First-pass rates (superseded — do not cite)

| Kit | Broken-policy rate |
|---|---|
| Kamikaze | ~78% |
| Assassin | ~39% |
| Scientific | ~29% |
| Untouchable | ~28% |

## Out of scope (deferred)

- Difficulty sweeps (`easy` / `normal`)
- Rebalancing any card, kit, or reward
- Learning bots / search (technical spec v3 §13)

## Reproduction

```bash
pnpm --filter @card-battle/server exec tsx src/simulation/run-gross-imbalance.ts
```

Same `BASE_SEED` and `GAMES_PER_CELL` in `run-gross-imbalance.ts` → same completed
rows (stalls are deterministic given the same `MAX_TURNS` and policy).
