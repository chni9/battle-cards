-- Host table rules on the finished-game row, plus in-game chat (Lot 70).
-- Tutorial rows leave the three rule columns null. Chat rows share this write.
-- A room that dies before the game finishes writes nothing.

ALTER TABLE finished_games
  ADD COLUMN excluded_kit_ids text[],
  ADD COLUMN random_only boolean,
  ADD COLUMN turn_time_seconds integer,
  ADD CONSTRAINT finished_games_lobby_rules_check CHECK (
    (
      excluded_kit_ids IS NULL
      AND random_only IS NULL
      AND turn_time_seconds IS NULL
    )
    OR (
      excluded_kit_ids IS NOT NULL
      AND random_only IS NOT NULL
      AND turn_time_seconds IS NOT NULL
      AND turn_time_seconds >= 5
    )
  );

CREATE TABLE game_chat_messages (
  game_id uuid NOT NULL REFERENCES finished_games (id) ON DELETE CASCADE,
  order_index integer NOT NULL,
  sender_id text NOT NULL,
  nickname text NOT NULL,
  role text NOT NULL,
  body text NOT NULL,
  round_index integer NOT NULL,
  PRIMARY KEY (game_id, order_index),
  CONSTRAINT game_chat_messages_role_check CHECK (
    role IN ('living', 'eliminated', 'spectator')
  ),
  CONSTRAINT game_chat_messages_body_check CHECK (
    char_length(body) >= 1 AND char_length(body) <= 200
  ),
  CONSTRAINT game_chat_messages_round_check CHECK (round_index >= 0)
);
