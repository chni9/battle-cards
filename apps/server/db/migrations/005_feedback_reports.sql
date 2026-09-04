-- Tester feedback reports (technical spec v6 §7.2 / L47-01).
-- Filename 005: 004 already applied is_tutorial only (decisions.md 2026-08-20).
-- Explicit migrate only — never auto-run on server boot.
-- No seed column — GameState.seed is server-only.

CREATE TABLE feedback_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL,
  message text NOT NULL,
  contact text,
  nickname text,
  game_code text,
  screen text NOT NULL,
  protocol_version int NOT NULL,
  play_kind text,
  log_tail jsonb,
  user_agent text,
  CONSTRAINT feedback_reports_kind_check CHECK (kind IN ('bug', 'confusion', 'idea'))
);
