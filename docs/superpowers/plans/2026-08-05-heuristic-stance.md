# Heuristic Stance Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teach the V3 hard heuristic build/contest/finish stances, Tax+/Regen+ farm, real Mirror/Shield/Absorber upgrades, and Absorber+ ledger scoring from playtest logs BNBBSH/CTHNVP/ESCEKV.

**Architecture:** Extend `buildContext` with stance + last-complete-turn spend maps; modulate existing band scores (no new reason codes unless needed). Tunables in `heuristic-weights.ts` only (#V3-5).

**Tech Stack:** TypeScript, Vitest, existing `heuristic-policy.ts` / view-only `PlayingStateView`.

## Global Constraints

- View-only policy — never read `GameState` (technical spec v3 decision 2).
- Tunables are inventions — record in `decisions.md`, never cite as measured (#V3-5).
- Fallthrough stays `sustain − UNSCORED_PLAY_PENALTY`.
- No Lot 29 card branches; no rule changes.
- `pnpm verify` green before Done; commit when asked or per task if executing plan commits.

## File map

| File | Responsibility |
|---|---|
| `apps/server/src/bots/heuristic-weights.ts` | New named bonuses / thresholds |
| `apps/server/src/bots/heuristic-policy.ts` | Stance, ledger proxies, scoring changes |
| `apps/server/src/bots/heuristic-policy.test.ts` | Acceptance fixtures from design §Tests |
| `docs/agent/decisions.md` | Dated entry |
| `docs/simulation/2026-08-04-gross-imbalance/` | Re-screen after verify |

---

### Task 1: Weights + last-turn spend proxies + stance in context

**Files:**
- Modify: `apps/server/src/bots/heuristic-weights.ts`
- Modify: `apps/server/src/bots/heuristic-policy.ts` (`PolicyContext`, `buildContext`, helpers)
- Test: `apps/server/src/bots/heuristic-policy.test.ts`

**Interfaces:**
- Produces: `type HeuristicStance = 'build' | 'contest' | 'finish'`
- Produces: `PolicyContext.stance`, `.pointReserve`, `.lastTurnPointsSpent`, `.lastTurnUpgradePointsSpent`, `.lastTurnLoss` (existing)
- Produces: `deriveStance(view, ctxPartial): HeuristicStance`

- [ ] **Step 1: Add weights**

```ts
export const UPGRADE_TAX_BONUS = 80;
export const UPGRADE_REGEN_BONUS = 75;
export const UPGRADE_MIRROR_BONUS = 55;
export const UPGRADE_SHIELD_BONUS = 50;
export const UPGRADE_ABSORBER_BONUS = 45;
export const ABSORBER_UP_DENY_BONUS = 120;
export const ABSORBER_POINTS_DENY_BONUS = 70;
export const FINISH_CHIP_BONUS = 50;
export const CONTEST_DEFENSE_KEEP = 200; // sell refusal margin via -inf
```

- [ ] **Step 2: Implement `lastCompleteTurnSpendByActor`**

For each seat’s last complete `actionPlayed` turnSequence (same skip-in-progress rule as lives helper), sum:
- `playCard` / multi-attack: `getCard(cardId).cost.points`
- `buyCard`: `getCard(cardId).buyCost.points` (0 if life-priced)
- `buyUpgradePoint`: known economy cost from shared constants / `getCard` if any
- `buySpecialCard` / `buyLives`: respective point costs
- `upgradeCard`: 0 points, +1 upgrade point
Return `{ points: Map, upgradePoints: Map }`.

- [ ] **Step 3: Implement setup-ready + threat + dying + `deriveStance`**

Wire into `buildContext`. Compute `pointReserve` in contest: max cost among held Mirror/Shield/affordable counter attack when threat present, else 0.

- [ ] **Step 4: Tests for stance helpers via `decide` behaviour** (finish vs build in Task 3–4); for Task 1 add one test that Absorber ledger path can see UP spend once scoring lands — or defer pure unit via decide in Task 3.

- [ ] **Step 5: Commit** `feat(bots): add stance context and turn-spend proxies`

---

### Task 2: Upgrade / farm / reserve / sell scoring

**Files:**
- Modify: `heuristic-policy.ts` (`secondaryInvest`, `scoreAction` buy/upgrade/sell/tax/regen)
- Test: `heuristic-policy.test.ts`

- [ ] **Step 1: Failing test — upgrade Tax beats play base Tax**

```ts
it('upgrades Tax before playing base Tax when life-safe (stance build)', () => {
  const view = baseView({
    self: baseSelf({
      lives: 12,
      points: 20,
      upgradePoints: 1,
      hand: [
        { instanceId: 'tax-1', cardId: 'tax', isUpgraded: false },
      ],
    }),
  });
  const actions: TurnAction[] = [
    { type: 'playCard', instanceId: 'tax-1' },
    { type: 'upgradeCard', instanceId: 'tax-1' },
    { type: 'draw' },
  ];
  expect(decide(view, actions, createRng('upgrade-tax'))).toEqual({
    type: 'upgradeCard',
    instanceId: 'tax-1',
  });
});
```

- [ ] **Step 2: Expand `secondaryInvest`** for tax/regen/mirror/shield/absorber/sentence with weight bonuses; boost attack upgrades in contest.

- [ ] **Step 3: Point reserve** — Tax/shop/`buyUpgradePoint` that would leave `points - cost < pointReserve` → `-∞` unless stance is `finish` or Survive path.

- [ ] **Step 4: Sell** — Mirror/Shield/Absorber → `-∞` in `contest` (and when sole defense under inbound threat); allow sell-to-fund Spy only in early `build`.

- [ ] **Step 5: Test contest keeps Mirror**

```ts
it('does not sell Mirror in contest when opponent upgraded Super publicly', () => {
  // actionLog: opponent upgradeCard or playCard super-attack isUpgraded
  // self holds mirror, setup ready (tax+/regen+ or attacks+)
  // actions: sell Mirror vs draw — expect draw (or upgrade/play defense), never sell
});
```

- [ ] **Step 6: Commit** `feat(bots): score farm upgrades and contest defense keep`

---

### Task 3: Absorber+ ledger scoring

**Files:**
- Modify: `heuristic-policy.ts` (absorber branch in `scorePlayCard`)
- Test: `heuristic-policy.test.ts`

- [ ] **Step 1: Failing tests** — UP spend beats draw; small points spend does not; UP absorb loses to Spy lethal.

- [ ] **Step 2: Replace weak Absorber fallthrough** with ordered rules from design §Absorber+.

- [ ] **Step 3: Commit** `feat(bots): score Absorber+ from last-turn ledger`

---

### Task 4: Finish aggression

**Files:**
- Modify: `heuristic-policy.ts` (Pressure / Sentence when `stance === 'finish'`)
- Test: `heuristic-policy.test.ts`

- [ ] **Step 1: Failing test** — Spy lives 2, basic attack affordable → attack over Tax+.

- [ ] **Step 2: In `finish`, score attacks that can reach known lives with `pressure + FINISH_CHIP_BONUS` even if not upgraded / below STRIKE_MIN_DAMAGE; prefer dying seat.

- [ ] **Step 3: Commit** `feat(bots): finish stance prioritizes weak seats`

---

### Task 5: Docs + verify + re-screen

**Files:**
- Modify: `docs/agent/decisions.md`
- Modify: `docs/simulation/2026-08-04-gross-imbalance/*`

- [ ] **Step 1:** Append decisions entry citing exports + stance design path.
- [ ] **Step 2:** `pnpm verify`
- [ ] **Step 3:** Re-run `run-gross-imbalance.ts`, update WRITEUP.
- [ ] **Step 4:** Commit docs/sim (and any leftover) — user may batch; prefer one final commit if tasks above already committed.

---

## Spec coverage

| Spec section | Task |
|---|---|
| Stance build/contest/finish | 1, 2, 4 |
| Tax+/Regen+ farm | 2 |
| Upgrade Mirror/Shield/Absorber | 2 |
| Point reserve / no sell contest | 2 |
| Absorber+ rules | 3 |
| Finish chip / weak seat | 4 |
| decisions + re-screen | 5 |
