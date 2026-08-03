-- Bot seat markers on finished-game log (technical spec v3 §9, L17-04).
-- Explicit migrate only — never auto-run on server boot.

ALTER TABLE finished_games
  ADD COLUMN has_bots boolean NOT NULL DEFAULT false;

ALTER TABLE finished_game_players
  ADD COLUMN is_bot boolean NOT NULL DEFAULT false;

ALTER TABLE finished_game_players
  ADD COLUMN bot_difficulty text NULL;
