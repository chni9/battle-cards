# Persist full Excel-parity export log — design

**Date:** 2026-08-05  
**Status:** Approved — implement  

## Goal

Every finished Colyseus room game stores `GameExportLogView` (Turns before/after + Events) in Postgres, matching the Excel download, for later bot tuning via SQL.

## Locked decisions

| Topic | Choice |
|---|---|
| Content | Full Excel parity (turns + events) |
| Storage | `finished_games.export_log` JSONB |
| Access | Persist only; query via SQL later |
| Keep `action_log` | Yes (Events; existing aggregates) |
| Simulator | Still no Postgres write |

## Schema

Migration `003_finished_game_export_log.sql`:

```sql
ALTER TABLE finished_games
  ADD COLUMN export_log jsonb;
```

Nullable for pre-migrate rows. New writes always set a full object.

## Data flow

`GameRoom.turnHistory` + `actionLog` → `buildFinishedGameSnapshot` → `exportLog: { turns, events }` → `persistFinishedGame` INSERT.

## Out of scope

Admin/API UI, normalized turn tables, sim → DB.
