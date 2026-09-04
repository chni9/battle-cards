# docs/agent/db.md — Finished-game Postgres log

> Read before touching the finished-game schema, migrations, `DATABASE_URL`, or the
> end-of-game write. Transverse rules → `/AGENTS.md`. Protocol → `protocol.md`.
>
> Sources: technical spec §3 · backlog L8-01 / L8-02 · open decision #4 (closed 2026-08-01).
>
> **Status:** hybrid finished-game schema plus tester `feedback_reports` (L47-01)
> live under `apps/server/src/db/` and `apps/server/db/migrations/`.

## Golden rules

1. **Postgres holds finished games and tester feedback.** Never persist in-progress
   or lobby state (technical spec §3). A mid-game restart loses the match — accepted
   for V1. Feedback is HTTP (`feedback_reports`), not a second game-log write.
2. **One finished-game write, at game over.** `GameRoom.onGameOver` builds a snapshot
   and calls `persistFinishedGame`. Feedback inserts are a separate helper
   (`insertFeedbackReport`) from `POST /api/feedback`.
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
| `finished_games` | One row per match: room id, mode, seed, winner, `turn_sequence`, timestamps, `duration_ms`, public `action_log` JSONB (Events), `export_log` JSONB (full Excel-parity Turns+Events, nullable on pre-migrate rows), `has_bots` (L17-04), `is_tutorial` (L41-04, default false) |
| `finished_game_players` | Per-player kits, final resources/holdings, denormalized play/buy/sell/upgrade aggregates (Approach B), `is_bot` / `bot_difficulty` (L17-04) |
| `finished_game_eliminations` | Ordered elim list with `reason` (`combat` \| `absence` \| `inactivity` \| `leave`) |
| `feedback_reports` | Tester Bug / Confusion / Idea rows (L47-01 / L47-06 / technical spec v6 §7.2). No seed column. `kind` CHECK ∈ (`bug`,`confusion`,`idea`). `topics text[]` CHECK contained-by (`ui`,`gameplay`,`card`,`shop`,`bot`,`tutorial`,`other`); bug ≥1 topic is POST-only so pre-chip rows still list. `log_tail` is a public action-log slice, nullable; `game_code` nullable (Home). |

SQL: `apps/server/db/migrations/001_finished_games.sql`, `002_bot_seats.sql`,
`003_finished_game_export_log.sql`, `004_finished_games_tutorial.sql`,
`005_feedback_reports.sql`, `006_feedback_topics.sql`.  
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
| `DATABASE_URL` | Postgres connection string. Unset → soft-skip persist (warn locally, error in production); feedback POST/inbox GET return 503 |
| `INBOX_PASSWORD` | Shared secret for `GET /api/inbox` (`X-Inbox-Password`). Unset or empty → 404 (do not advertise the inbox). Failed guesses: 10 / 10 min / IP then 429; a correct password still succeeds |

## Commands

```bash
# Apply pending *.sql under apps/server/db/migrations (idempotent via schema_migrations)
DATABASE_URL=postgres://… pnpm --filter @card-battle/server db:migrate
```

In production, `docker/entrypoint.sh` runs the same command before starting the server.

## Extending metrics

Prefer additive columns or jsonb fields on the existing tables. Document the change in
`decisions.md`. Keep the builder pure and unit-tested; keep the room write fire-and-forget.
