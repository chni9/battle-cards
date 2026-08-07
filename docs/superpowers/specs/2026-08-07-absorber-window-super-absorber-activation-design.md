# Absorber last-turn window + Super Absorber activation snapshot

**Date:** 2026-08-07  
**Status:** Approved  
**Sources:** rules spec §3 Absorber, §5 Super Absorber; designer session 2026-08-07

## Intent

1. **Super Absorber** on activation absorbs each opponent’s current last-turn ledger (points spent, upgrade points spent, lives lost — never theft fields), then keeps absorbing on every later victim turn while the counter holds. Upgraded ×2 and `GameState.lifeLimit` unchanged.
2. **Absorber** may target a player eliminated on their last complete turn until every player who was still alive at that elimination has begun one turn; then that corpse leaves Absorber (and Super Absorber activation) targets.

## Rules

### Absorber

Opponents include eliminated players still inside the post-elimination absorb window. The window opens at elimination with the set of living player ids (excluding the victim). Each time one of those players begins a turn, they are removed from the set. When the set is empty, the corpse is no longer absorbable and their turn ledger is reset for absorb purposes.

### Super Absorber

On play/activation, immediately absorb from **all** opponents in the absorb window (living + in-window eliminated). Ongoing ticks remain living victims only, after their action, existing order vs Poison (#V4-21 / decisions.md).

## Domain

```ts
/** Living player ids who must still begin a turn before this corpse leaves the Absorber window. `null` when not eliminated or window closed. */
absorbWindowPendingPlayerIds: string[] | null;
```

- Living players: always absorbable; field stays `null`.
- Helper: `isAbsorberTargetable(actor, target)` → other player and (`!target.isEliminated` or pending set non-empty).
- Reanimation clears the window (`null`; ledger already reset).
- Public view exposes enough for the Absorber picker (e.g. `absorbWindowOpen: boolean`).

## Engine

| Area | Change |
|---|---|
| Elimination | Open absorb window when marking eliminated |
| `beginTurnFor` | Tick pending sets; close + reset ledger |
| `reanimate-player` | Clear window |
| Legal Absorber targets | Living ∪ in-window eliminated |
| `perform-action` playCard gate | Allow eliminated **only** for `absorber` when in window |
| Super Absorber `play` | After activate, snapshot-absorb all in-window opponents |
| Tick path | Shared `absorbLedger` helper with activation |

## Client

Absorber target list: living opponents plus eliminated with absorb window open. Other targeted cards stay living-only.

## Out of scope

SA tick order vs Poison, counter depletion, life-cap rules; other cards targeting corpses; heuristic retune beyond legal-action fallout.
