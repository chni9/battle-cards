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
   The Coolify **staging** image uses the same entrypoint against **its own**
   Postgres — never the production `DATABASE_URL`. **PR preview** containers on
   that staging app also migrate-then-listen against the **same** staging
   `DATABASE_URL`, so preview games appear in staging `/admin`
   (`docs/agent/deploy.md`). Do not add migrate-on-boot to the `tsx`/`pnpm dev`
   path.

## Schema map

| Table | Role |
|---|---|
| `finished_games` | One row per match: room id, mode, seed, winner, `turn_sequence`, timestamps, `duration_ms`, public `action_log` JSONB (Events), `export_log` JSONB (full Excel-parity Turns+Events, nullable on pre-migrate rows), `has_bots` (L17-04), `is_tutorial` (L41-04, default false) |
| `finished_game_players` | Per-player kits, final resources/holdings, denormalized play/buy/sell/upgrade aggregates (Approach B), `is_bot` / `bot_difficulty` (L17-04), `nickname` at game end (L61-02; display-only), `think_time_ms` recap clock (L62-02; null on pre-migrate rows) |
| `finished_game_eliminations` | Ordered elim list with `reason` (`combat` \| `absence` \| `inactivity` \| `leave`) |
| `feedback_reports` | Tester Bug / Confusion / Idea rows (L47-01 / L47-06 / technical spec v6 §7.2). No seed column. `kind` CHECK ∈ (`bug`,`confusion`,`idea`). `topics text[]` CHECK contained-by (`ui`,`gameplay`,`card`,`shop`,`bot`,`tutorial`,`other`); bug ≥1 topic is POST-only so pre-chip rows still list. `log_tail` is a public action-log slice, nullable; `game_code` nullable (Home). |

SQL: `apps/server/db/migrations/001_finished_games.sql`, `002_bot_seats.sql`,
`003_finished_game_export_log.sql`, `004_finished_games_tutorial.sql`,
`005_feedback_reports.sql`, `006_feedback_topics.sql`,
`007_finished_game_player_nickname.sql`,
`008_finished_game_player_think_time.sql`.  
Types + builder + writer: `apps/server/src/db/`.

`export_log` matches `FinishedStateView.exportLog` / the Excel workbook (`turns` =
before/after private snapshots, `events` = public action log). On new writes,
`export_log.events` mirrors `action_log`. Private hands/kits stay server-only —
same trust boundary as the finished Excel download. Headless simulation still
does not write Postgres.

Persist sets `is_tutorial` from the room overlay `playKind` (`true` only for tutorial
rooms). Headless arena / gross-imbalance screens **do not query** `finished_games`
today; they run in-process. Any future SQL reader of finished games **must** exclude
`is_tutorial = true` so tutorial rows never enter balance numbers. Do not invent a
`WHERE` in unused code.

Feedback never stores `GameState.seed`. `load-finished-feedback-context` selects
`room_id, is_tutorial, action_log` only when enriching a report from a finished row.

Turn count in the log is **`turn_sequence`** (= `GameState.turnSequence` at end), not a
separate player-turn counter.

## Env

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | Postgres connection string. Unset → soft-skip persist (warn locally, error in production); feedback POST, inbox GET, and admin GET return 503 |
| `INBOX_PASSWORD` | Shared secret for `GET /api/inbox` and `GET /api/admin/*` (`X-Inbox-Password`). Unset or empty → 404 (do not advertise the inbox/admin). Failed guesses: 10 / 10 min / IP then 429, **one** limiter for both surfaces (constructed in `index.ts`); a correct password still succeeds |

## Commands

```bash
# Apply pending *.sql under apps/server/db/migrations (idempotent via schema_migrations)
DATABASE_URL=postgres://… pnpm --filter @card-battle/server db:migrate
```

In the Coolify image (staging, staging PR previews, and production),
`docker/entrypoint.sh` runs the same command before starting the server.

## Extending metrics

Prefer additive columns or jsonb fields on the existing tables. Document the change in
`decisions.md`. Keep the builder pure and unit-tested; keep the room write fire-and-forget.

## Admin Overview (Lot 62)

`GET /api/admin/overview` aggregates the finished-game log in SQL. Match mix
(`bots=all|humans|withBots`) filters `finished_games`. `actors=humans|bots|both`
(default `both`) joins `finished_game_players` and applies `is_bot` only to seat /
action series — mixed tables still contribute the selected seats. Combat sums
`action_log` `actionResolved.livesLost` / `shieldAbsorbed` / `outcome` for attack
card ids only (golden rule 2); Tax / Suicide / Imposition are not damage.
Do not read `export_log` (private hands). Do not GIN-index `action_log` unless a
query is slow. `think_time_ms` is nullable on pre-008 rows. Nicknames are not
identity. Headless arena still does not write Postgres.

Seat win share applies `actors` to both wins and `game_count` (selected seats at
that index). Feedback `reportsPerGame` divides date-window reports by
date-window `finished_games` (`ended_at`); occupancy, kit, match mix, and
tutorial do not change that denominator.

Hidden Spy / Thief / persistent **plays** count `actionPlayed` `playCard` only
(shop, upgrade, and manual `deactivatePersistent` share `cardId` but are not
plays). Persistent deactivations include auto-loss (`persistentDeactivated`)
and manual `deactivatePersistent`. Rematch room-code counts use the same
match-filter `WHERE` as the outer query, so a tutorial in a reused Play-again
room does not mark the first real match as a rematch.
