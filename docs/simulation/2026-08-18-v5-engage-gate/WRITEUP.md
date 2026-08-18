# L40-05 search-v5-engage promotion gate

**Result: failed.** `search-v5-engage` beats frozen `heuristic-v4` on point
estimate (52.2%) but **p ≈ 0.032**, not p < 0.01. Rooms stay on `search-v5`.
Do not raise `searchIterations`. `DEFAULT_POLICY_ID` stays `heuristic-v4`.

Full record: `docs/agent/decisions.md` (2026-08-18 · L40-05).

## Reproduce

```bash
pnpm --filter @card-battle/server exec tsx src/simulation/gate-search-v5.ts \
  --games 2000 --seed l40-05-gate --policy search-v5-engage \
  --max-turns 400 --workers 4 \
  --out ../../docs/simulation/2026-08-18-v5-engage-gate/gate.json
```

Offline iteration budget is `OFFLINE_SEARCH_ITERATIONS` (64). Champion while
L33-05 is Blocked: frozen gauntlet = `heuristic-v4`.

## Files

| File | Role |
|---|---|
| `gate.json` | Formal 2 000-game gate |
| `gate-smoke.json` | 40-game smoke (24–11, p ≈ 0.02 — not the gate) |
| `playtest-mix.json` | Headless 4p action mix vs `search-v5` (L36-05 analog) |
