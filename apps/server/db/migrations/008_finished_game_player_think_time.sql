-- L62-02 — recap think time on finished_game_players (nullable on pre-migrate rows).

ALTER TABLE finished_game_players
  ADD COLUMN IF NOT EXISTS think_time_ms int;
