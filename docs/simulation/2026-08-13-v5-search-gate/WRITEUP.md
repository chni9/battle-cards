# L35-07 search-v5 promotion gate

**Result: failed.** `search-v5` does not beat `heuristic-v4` at p < 0.01.
`DEFAULT_POLICY_ID` stays `heuristic-v4`. Full record: `docs/agent/decisions.md`
(2026-08-13 · L35-07).

## Reproduce

```bash
pnpm --filter @card-battle/server exec tsx src/simulation/gate-search-v5.ts \
  --games 2000 --seed l35-07-gate --workers 8 \
  --out ../../docs/simulation/2026-08-13-v5-search-gate/gate.json
```

Offline iteration budget is `OFFLINE_SEARCH_ITERATIONS` (64). Champion while
L33-05 is Blocked: frozen gauntlet = `heuristic-v4`.

## Files

| File | Role |
|---|---|
| `gate.json` | Formal 2 000-game gate |
| `gate-probe.json` | 200-game smoke (coin flip) |
