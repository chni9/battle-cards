-- Finished-game log (technical spec §3, backlog L8-01).
-- Explicit migrate only — never auto-run on server boot.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE finished_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL,
  mode text NOT NULL,
  seed text NOT NULL,
  winner_player_id text NOT NULL,
  turn_sequence int NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL,
  duration_ms int NOT NULL,
  action_log jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE finished_game_players (
  game_id uuid NOT NULL REFERENCES finished_games (id) ON DELETE CASCADE,
  player_id text NOT NULL,
  seat_index int NOT NULL,
  kit_id text NOT NULL,
  is_winner boolean NOT NULL,
  is_eliminated boolean NOT NULL,
  lives int NOT NULL,
  points int NOT NULL,
  upgrade_points int NOT NULL,
  shield int NOT NULL,
  shield_is_upgraded boolean NOT NULL,
  hand jsonb NOT NULL,
  special_cards jsonb NOT NULL,
  cards_played_count int NOT NULL,
  cards_played_by_id jsonb NOT NULL,
  buy_count int NOT NULL,
  sell_count int NOT NULL,
  upgrade_count int NOT NULL,
  PRIMARY KEY (game_id, player_id)
);

CREATE TABLE finished_game_eliminations (
  game_id uuid NOT NULL REFERENCES finished_games (id) ON DELETE CASCADE,
  order_index int NOT NULL,
  player_id text NOT NULL,
  eliminator_player_id text,
  reason text NOT NULL,
  PRIMARY KEY (game_id, order_index)
);
