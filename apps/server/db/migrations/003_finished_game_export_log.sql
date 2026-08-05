-- Full Excel-parity export log on finished games (2026-08-05).
-- Turns before/after + Events as GameExportLogView JSONB.
-- Nullable: rows written before this migrate have no export_log.

ALTER TABLE finished_games
  ADD COLUMN export_log jsonb;
