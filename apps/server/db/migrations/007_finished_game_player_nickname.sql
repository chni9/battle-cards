-- L61-02 — display nickname on finished_game_players (not unique identity).

ALTER TABLE finished_game_players
  ADD COLUMN IF NOT EXISTS nickname text;
