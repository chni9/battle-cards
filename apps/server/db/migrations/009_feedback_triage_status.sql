-- Designer triage on tester reports (Lot 68).
-- Existing rows stay pending. Eliminated means disqualified / won't do.
-- Explicit migrate only — never auto-run on server boot.

ALTER TABLE feedback_reports
  ADD COLUMN status text NOT NULL DEFAULT 'pending';

ALTER TABLE feedback_reports
  ADD CONSTRAINT feedback_reports_status_check
  CHECK (status IN ('pending', 'done', 'eliminated'));
