-- Tutorial flag on finished-game log (technical spec v6 §7.2 / L41-04).
-- Explicit migrate only — never auto-run on server boot.
-- DEFAULT false keeps pre-V6 rows classic.

ALTER TABLE finished_games
  ADD COLUMN is_tutorial boolean NOT NULL DEFAULT false;
