# Heuristic stance pass — design

**Date:** 2026-08-05  
**Status:** Approved  
**Inputs:** Playtest exports BNBBSH, CTHNVP, ESCEKV; designer strategies; approach **2** (stance signal in scorer).

## Problem

Hard bots under-upgrade and under-play Mirror / Shield / Absorber. `secondaryInvest` only values attack upgrades, so Tax / Regen / Mirror / Shield / Absorber upgrades lose to Tax spam and sell-to-fund Spy. Human logs show Tax+ ↔ Regen+ farm, then upgraded finishers; Absorber+ used when the last complete turn spent upgrade points / enough points / useful lives.

## Goals

1. Farm with **Tax+ ↔ Regen+** (not `buyLives`) while building.
2. Upgrade and keep Mirror / Shield / Absorber / attacks as position tools.
3. **Stance** from view + public log: `build` | `contest` | `finish` — leave farm when a seat is dying or when setup is ready and opponents look threatening.
4. Absorber+ scoring from last-complete-turn ledger proxies; upgrade-point absorb is high but below lethal/finish.
5. Policy-only; no rule changes; tunables remain inventions (#V3-5).

## Non-goals

- Lot 29 new-card branches, learning bots, scripted turn macros.
- Inventing opponent HP without Spy or pending-queue math.
- Rebalancing cards/kits from this pass alone.

## Architecture

```
decide(view, actions, rng)
  └─ buildContext(view, rng)
       ├─ existing: incomingThreat, threatOrder, observedSpend, lastTurnLoss, …
       ├─ NEW: lastTurnPointsSpent, lastTurnUpgradePointsSpent (per seat)
       ├─ NEW: stance ∈ { build, contest, finish }
       └─ NEW: pointReserve (contest)
  └─ scoreAction(…)  — same bands; stance modulates bonuses / refuses
```

Still view-only (decision 2). Same view + seed → same action.

## Stance

First matching row wins:

| Stance | When |
|---|---|
| `finish` | Lethal-now available, **or** a living seat is *dying* (Spy lives ≤ best affordable upgraded strike damage; or Sentence+ ready as Assassin; or public pending already finishes them). |
| `contest` | Setup ready **and** threat signal: opponent `actionPlayed` upgraded Strong/Super (or upgrade of those), pending upgraded attack inbound, or Spy shows them clearly ahead on lives/points. |
| `build` | Default. |

**Setup ready** (tunable checklist — all that apply to cards actually held):

- Tax upgraded or not in hand
- Regen upgraded or not in hand
- At least one of: upgraded attack, upgraded Sentence, upgraded Mirror, upgraded Shield

Absent cards do not block readiness forever.

## Economy (`build`)

While life-safe (`lives > incomingThreat + TAX_LIFE_BUFFER`), prefer by score:

1. Upgrade Tax (base held)
2. Play Tax+ / Tax
3. Upgrade Regen (base held)
4. Play Regen+ after Tax drain or when lives ≤ soft threshold
5. `buyUpgradePoint` when a priority upgrade target exists
6. Upgrade Mirror / Shield / Absorber / best attack before filler shop

No `buyLives` in this loop.

## Upgrades & defense

| Target | Bias |
|---|---|
| Tax, Regen | High Invest (farm engines) |
| Mirror, Shield | Invest in `build`; stronger in `contest` / under threat |
| Absorber | Invest once; play per Absorber rules |
| Strong / Super | Invest; in `contest` match seen upgraded Super with Super+ / Mirror+ |
| Sentence | Invest when Assassin near finish / setup ready |

**Point reserve (`contest`):** refuse Tax/shop that would drop points below `max(Mirror cost, Shield cost, matching attack cost)` when those cards are held and a public upgraded-attack threat exists — unless Survive/finish.

**Selling:** do not sell Mirror/Shield/Absorber in `contest` or when they are sole defense; sell-to-fund Spy only in early `build`.

## Absorber+

Extend last-complete-turn helpers (already used for lives) with **points spent** and **upgrade points spent** proxies from that seat’s last complete `actionPlayed` turn (play/buy costs; `upgradeCard` ⇒ 1 UP; `buyUpgradePoint`).

| Signal | Score intent |
|---|---|
| `upgradePointsSpent > 0` | Strong Deny/Invest, **strictly below** lethal-now / finish Pressure |
| else `pointsSpent > absorberCost + kitDraw` | Worth playing (Deny/Invest) |
| else useful `livesLost` (≥ Regen heal, or no Regen and lives low) | Life top-up |
| else | Below draw |

Base Absorber: lives branch only.

## Aggression

- **`finish`:** allow chip Pressure if Spy lives ≤ damage and affordable; focus weakest dying seat; prefer Super+ / Sentence+ on strong seats when ready.
- **`build`:** keep “upgraded and damage ≥ STRIKE_MIN_DAMAGE” for non-finish Pressure.
- **`contest`:** counter prep over new Tax cycles; existing Survive Mirror/Shield and mutual-cancel paths stay.

## Files

| File | Change |
|---|---|
| `apps/server/src/bots/heuristic-policy.ts` | Stance, ledger proxies, Absorber+, farm/upgrade/reserve/finish scoring |
| `apps/server/src/bots/heuristic-weights.ts` | Named tunables for new bonuses / thresholds |
| `apps/server/src/bots/heuristic-policy.test.ts` | Stance + Absorber + farm + contest fixtures |
| `docs/agent/decisions.md` | Dated entry citing the three exports |
| `docs/simulation/2026-08-04-gross-imbalance/` | Re-screen after verify (optional but expected) |

## Tests (acceptance sketches)

1. Upgrade Tax preferred over playing base Tax when both legal and life-safe.
2. Absorber+ on a seat that spent UP last complete turn beats draw; loses to Spy-confirmed lethal attack.
3. Spy-known low-life seat → attack chosen over Tax+ (`finish`).
4. `contest` with public upgraded Super inbound → keep Mirror (do not sell) when Mirror held.
5. Absorber+ with only small points spent (≤ cost + draw) and no UP / useful lives → not chosen over draw.

## Risks

- Stance thresholds are inventions; may need a second playtest pass.
- Ledger proxies from the action log may undercount vs engine `TurnLedger` (theft excluded by rules for Absorber anyway).
- More Invest bias can reintroduce hard stalls — report stall rate on re-screen.

## Out of scope reminders

Golden rules unchanged. Bot never reads `GameState`. Fallthrough stays `sustain − UNSCORED_PLAY_PENALTY`.
