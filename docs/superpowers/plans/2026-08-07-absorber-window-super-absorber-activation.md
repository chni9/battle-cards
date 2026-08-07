# Absorber Window + Super Absorber Activation Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox syntax.

**Goal:** Absorber can target in-window eliminated players; Super Absorber absorbs past ledgers on activation.

**Architecture:** `absorbWindowPendingPlayerIds` on Player; tick on `beginTurnFor`; shared `absorbLedgerFromVictim` for SA activation + ticks; Absorber-only exception in legal targets and perform-action.

**Tech Stack:** TypeScript, Vitest, existing engine primitives.

## Global Constraints

- Never invent rules beyond the approved design (`docs/superpowers/specs/2026-08-07-absorber-window-super-absorber-activation-design.md`).
- `applyDamage` / `applyLifeLoss` stay separate; life gains via `grantLives` / lifeLimit.
- SA still ignores theft ledger fields.
- No PROTOCOL_VERSION bump if only adding a public boolean on player view (additive).
- User rule: do not commit unless asked.

---

### Task 1: Domain + absorb-window primitive

**Files:**
- Modify: `packages/shared/src/domain/player.ts`
- Modify: `packages/shared/src/protocol/state-view.ts`
- Create: `apps/server/src/engine/turn/absorb-window.ts`
- Modify: `apps/server/src/engine/create-initial-state.ts`, `apps/server/src/testing/factories.ts`, `apps/server/src/engine/reanimate-player.ts`, `apps/server/src/engine/turn/enumeration-state-from-view.ts`
- Test: `apps/server/src/engine/turn/absorb-window.test.ts`

- [ ] Add `absorbWindowPendingPlayerIds: string[] | null` to Player; `absorbWindowOpen: boolean` on PublicPlayerView
- [ ] Implement open / tick / isAbsorberTargetable / clear helpers
- [ ] Wire init, factory, reanimate, enumeration stubs
- [ ] Tests for open, tick-to-close, reanimate clear

### Task 2: Elimination + turn advance wiring

**Files:**
- Modify: `apps/server/src/engine/turn/elimination-rewards.ts`
- Modify: `apps/server/src/engine/turn/advance-turn.ts`
- Test: extend absorb-window or absorber tests

- [ ] Open window on both elimination paths
- [ ] `beginTurnFor` calls tick
- [ ] Test full cycle expiry

### Task 3: Absorber targeting (server + client)

**Files:**
- Modify: `apps/server/src/engine/turn/list-legal-play-card.ts`
- Modify: `apps/server/src/engine/turn/perform-action.ts`
- Modify: `apps/server/src/protocol/build-view-for.ts`
- Modify: `apps/client/src/screens/table/card-actions.tsx`
- Test: `apps/server/src/engine/turn/absorber.test.ts`

- [ ] Legal Absorber targets include in-window corpses
- [ ] perform-action allows absorber→corpse; other cards still reject
- [ ] View exposes `absorbWindowOpen`
- [ ] Client Absorber picker uses window flag
- [ ] Tests: absorb death ledger; reject after window closes

### Task 4: Super Absorber activation snapshot

**Files:**
- Modify: `apps/server/src/engine/turn/apply-persistent-effects.ts` (extract helper) or new `absorb-ledger.ts`
- Modify: `apps/server/src/cards/handlers/super-absorber.ts`
- Test: `apps/server/src/engine/turn/super-absorber.test.ts`

- [ ] Shared absorb helper
- [ ] On play, snapshot all in-window opponents
- [ ] Tests: activation absorb living + corpse; ticks still work; theft ignored; life cap

### Task 5: Specs + decisions

**Files:**
- Modify: `docs/spec_bataille_des_cartes_en.md`, `docs/agent/decisions.md`, optionally `docs/agent/engine.md`

- [ ] Document rules + ruling
- [ ] `pnpm verify`
