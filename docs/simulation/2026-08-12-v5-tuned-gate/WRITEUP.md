# L33-05 tuned gate probes — 2026-08-12

Structural unblock attempt (designer: keep gate, add lookahead). **Did not pass.**

Canonical decision writeup: `docs/agent/decisions.md` · 2026-08-12 · L33-05
structural one-round re-rank still blocked.

| File | Seed | Games | Win rate | Passed |
|---|---|---|---|---|
| `gate-probe.json` | `l33-05-gate-probe-1ply` | 400 | 0.502 | no |
| `gate-probe-b.json` | `l33-05-gate-probe-1ply-b` | 600 | 0.484 | no |
| `gate-probe-1round.json` | `l33-05-gate-probe-1round` | 400 | 0.531 | no (small-N) |
| `gate.json` (overwritten) | `l33-05-gate-marginflip` | 3000 | **0.500** | **no** |
| `gate-probe-margin.json` | life-margin objective | 800 | 0.482 | no |
| `gate-probe-marginflip.json` | margin flip | 600 | 0.524 | no (small-N) |

Re-run:

```bash
pnpm --filter @card-battle/server exec tsx src/simulation/gate-tuned-v5.ts \
  --policy heuristic-tuned-v5 --games 3000 --seed l33-05-gate-marginflip \
  --out ../../docs/simulation/2026-08-12-v5-tuned-gate/gate.json
```
