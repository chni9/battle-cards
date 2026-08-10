/**
 * Bot policies — technical spec v5 §7.1 (L32-02).
 *
 * Sources: `docs/technical_spec_v5.md` §7–§8 · `docs/backlog_v5.md` Lot 32 ·
 * v3 decision 2 (policy receives no `GameState`, not reopened).
 */

## Contract

- Every room and simulator bot decision resolves a **`BotPolicy`** from
  `apps/server/src/bots/registry.ts`. Do not import `heuristic-policy.ts` or
  `sub-choice-picks.ts` from `bot-driver`, `game-room`, or `run-game` — that
  breaks room/sim parity (decisions.md 2026-08-05 / L29-08).
- **`decide(view, actions, rng, ctx)`** — no `GameState`. `ctx.actionLog` is the
  public action log (#V5-9). Spy-revealed opponent fields live on the per-recipient
  **view**; use them only for seats this bot has Spyed.
- Registered today: `heuristic-v4` (frozen incumbent, ignores `ctx.actionLog`) and
  `random-legal` (uniform legal pick). Later policies (`heuristic-tuned-v5`,
  `search-v5`) register the same interface — the worker resolves by `policyId`.

## Parity

A policy reachable from the room must be reachable from the headless simulator
with the same hooks (Mirror, steal, pool, special, reanimation kit, rewards).
Screens measure what players face only when that holds.

## Freeze

`heuristic-v4` is the yardstick (L32-03). If its freeze test fails, **do not**
update expectations — put the change under a new policy id.

## Arena / workers

- Arena: `simulation/run-arena.ts` (L32-06) — seat rotation mandatory; gate
  promotes default policy only (#V5-10), not merges.
- Workers: `bots/search/worker/` (L32-08) — payload excludes `GameState`. Fallback:
  sync `heuristic-v4` → draw only if that throws.
- Forward-model budgets cite L32-05 numbers in `decisions.md`.
  Run: `pnpm --filter @card-battle/server bench:forward-model`.
