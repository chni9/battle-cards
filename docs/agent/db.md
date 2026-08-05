# docs/agent/db.md — Finished-game Postgres log

> Read before touching the finished-game schema, migrations, `DATABASE_URL`, or the
> end-of-game write. Transverse rules → `/AGENTS.md`. Protocol → `protocol.md`.
>
> Sources: technical spec §3 · backlog L8-01 / L8-02 · open decision #4 (closed 2026-08-01).
>
> **Status:** hybrid schema + one fire-and-forget write at game over live under
> `apps/server/src/db/` and `apps/server/db/migrations/`.

## Golden rules

1. **Postgres holds finished games only.** Never persist in-progress or lobby state
   (technical spec §3). A mid-game restart loses the match — accepted for V1.
2. **One write, at game over.** `GameRoom.onGameOver` builds a snapshot and calls
   `persistFinishedGame`. No other call site.
3. **A write failure must never interrupt the match.** Soft-skip when `DATABASE_URL` is
   unset; log and swallow on write errors. In `NODE_ENV=production`, log at error level.
4. **`GameState.seed` is server-only.** It is stored in the log for replay/balancing and
   must never appear in a client view.
5. **Migrations are explicit in local/dev.** Run
   `pnpm --filter @card-battle/server db:migrate` against `DATABASE_URL`.
   **Production exception:** the Docker entrypoint (`docker/entrypoint.sh`) runs
   migrations once before `listen`, and exits non-zero if they fail (fail-fast).
   Do not add migrate-on-boot to the `tsx`/`pnpm dev` path.

## Schema map

| Table | Role |
|---|---|
| `finished_games` | One row per match: room id, mode, seed, winner, `turn_sequence`, timestamps, `duration_ms`, public `action_log` JSONB (Events), `export_log` JSONB (full Excel-parity Turns+Events, nullable on pre-migrate rows), `has_bots` (L17-04) |
| `finished_game_players` | Per-player kits, final resources/holdings, denormalized play/buy/sell/upgrade aggregates (Approach B), `is_bot` / `bot_difficulty` (L17-04) |
| `finished_game_eliminations` | Ordered elim list with `reason` (`combat` \| `absence` \| `inactivity` \| `leave`) |

SQL: `apps/server/db/migrations/001_finished_games.sql`, `002_bot_seats.sql`,
`003_finished_game_export_log.sql`.  
Types + builder + writer: `apps/server/src/db/`.

`export_log` matches `FinishedStateView.exportLog` / the Excel workbook (`turns` =
before/after private snapshots, `events` = public action log). On new writes,
`export_log.events` mirrors `action_log`. Private hands/kits stay server-only —
same trust boundary as the finished Excel download. Headless simulation still
does not write Postgres.

Turn count in the log is **`turn_sequence`** (= `GameState.turnSequence` at end), not a
separate player-turn counter.

## Env

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | Postgres connection string. Unset → soft-skip persist (warn locally, error in production) |

## Commands

```bash
# Apply pending *.sql under apps/server/db/migrations (idempotent via schema_migrations)
DATABASE_URL=postgres://… pnpm --filter @card-battle/server db:migrate
```

In production, `docker/entrypoint.sh` runs the same command before starting the server.

## Extending metrics

Prefer additive columns or jsonb fields on the existing tables. Document the change in
`decisions.md`. Keep the builder pure and unit-tested; keep the room write fire-and-forget.
