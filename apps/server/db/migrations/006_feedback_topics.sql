-- Feedback area chips (technical spec v6 §7.2 / L47-06).
-- Additive. Existing rows stay `{}` so pre-chip bugs are still listable.
-- Bug ≥1 topic is enforced in POST parse, not SQL: old rows would fail a CHECK.
-- Explicit migrate only — never auto-run on server boot.
-- No seed column.

ALTER TABLE feedback_reports
  ADD COLUMN topics text[] NOT NULL DEFAULT '{}';

ALTER TABLE feedback_reports
  ADD CONSTRAINT feedback_reports_topics_check
  CHECK (
    topics <@ ARRAY['ui', 'gameplay', 'card', 'shop', 'bot', 'tutorial', 'other']::text[]
  );
