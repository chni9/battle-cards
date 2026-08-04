# First gross-imbalance screen (L18-05)

**Date:** 2026-08-04  
**Config:** [`config.json`](./config.json) · **Aggregates:** [`aggregates.json`](./aggregates.json) · **Raw:** [`games.jsonl`](./games.jsonl)  
**Seed base:** `gross-imbalance-2026-08-04`  
**Policy:** V3 heuristic at **hard** (noise 0). Difficulty sweeps deferred.

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
| Completed | 1296 |
| Stalled (hit `MAX_TURNS` = 2500) | **104 (~7.4%)** |
| Median `turnSequence` (completed) | 36 |
| Mean `turnSequence` | ~60 |
| Elimination reasons | combat only (1658 events) |

Stalls are a real instrument finding: hard self-play can enter long invest / chip /
Untouchable loops with no elimination. They are **counted, not assigned a winner**.

## Win rate by starting kit (all completed games)

| Kit | Wins / games | Rate |
|---|---|---|
| Kamikaze | 583 / 745 | **78%** — look here |
| Assassin | 292 / 741 | 39% |
| Scientific | 209 / 720 | 29% |
| Untouchable | 212 / 748 | 28% |

Kamikaze’s share is well above the 70% screen threshold against this policy. That is
**not** a fairness proof: it may be the policy failing to punish Suicide / life-loss
lines, or failing to race Kamikaze before upgraded Suicide comes online.

## 1v1 matchups (canonical kit order)

| Matchup | Wins (A–B) | Games | Read |
|---|---|---|---|
| Kamikaze vs Untouchable | 163–27 | 190 | Look here (Kamikaze) |
| Kamikaze vs Scientific | 161–18 | 179 | Look here (Kamikaze) |
| Assassin vs Kamikaze | 32–163 | 195 | Look here (Kamikaze) |
| Assassin vs Untouchable | 122–69 | 191 | Soft lean Assassin (~64%) |
| Assassin vs Scientific | 105–69 | 174 | Soft lean Assassin (~60%) |
| Scientific vs Untouchable | 93–93 | 186 | Coin flip under this policy |

## Appendix A hypotheses — what the numbers can and cannot say

From `technical_spec_v1.md` Appendix A “balancing pass”:

1. **Upgraded Suicide reward cascade (Kamikaze)**  
   **Consistent with a “look here” on Kamikaze** (~78% overall; dominates Untouchable,
   Scientific, and Assassin in 1v1). Attributable **partly to the game** (Suicide is a
   real asymmetric tool) and **partly to the policy** (hard heuristic may undervalue
   racing / disrupting Kamikaze setup). **Not** a rebalance decision.

2. **Cloning as cheap escape hatch (Scientific)**  
   Scientific does **not** show a gross win-rate spike here (29% overall). Cloning
   still muddies final-kit stats (hence `startingKitId`). This screen does **not**
   support “Cloning is overtuned” against this bot; it also does not clear Cloning —
   a human who uses Cloning as a wipe may still break the heuristic’s assumptions.

3. **Spy devalued by public actions**  
   Not directly measurable from win rates alone. Assassin middling (39%) and
   Scientific low (29%) are compatible with “Spy lines under-scored or less valuable
   once actions are public,” but equally compatible with policy blind spots on
   intel / lethal-now. **No kit conclusion.**

## What may be policy artefact

- **104 stalls** — hang rate is high enough that any hard batch must report it.
  Likely invest-first / low-aggression loops, especially with Untouchable immunity
  to attack damage.
- **Kamikaze dominance** — may shrink if a future policy races Suicide setup or
  values Tax / Imposition differently. Until then, treat as “look here,” not “nerf.”
- **Assassin soft edges** (~60–64% vs Untouchable/Scientific) sit in the noisy band;
  do not read as imbalance.

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
