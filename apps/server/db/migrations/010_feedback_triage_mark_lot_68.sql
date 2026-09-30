-- Mark the 28 Sep pass (Lot 68). Older rows stay pending.
-- Matches created_at plus message so each database updates only its own rows.
-- Eliminated means disqualified / won't do.

UPDATE feedback_reports
SET status = 'done'
WHERE created_at = '2026-09-28T19:18:27.202Z'
  AND message = 'Ghost should have tax already upgraded and have an up point';

UPDATE feedback_reports
SET status = 'done'
WHERE created_at = '2026-09-28T16:14:37.092Z'
  AND message = 'Super attack blocked for no reason again';

UPDATE feedback_reports
SET status = 'done'
WHERE created_at = '2026-09-28T16:09:22.795Z'
  AND message = 'Shield + should block imposition';

UPDATE feedback_reports
SET status = 'done'
WHERE created_at = '2026-09-28T16:04:00.429Z'
  AND message = 'we should be able to attack a dead that attacked us to counter it';

UPDATE feedback_reports
SET status = 'done'
WHERE created_at = '2026-09-28T15:56:48.643Z'
  AND message = 'When activating block, the count of round of sentence shouldn''t go down';

UPDATE feedback_reports
SET status = 'done'
WHERE created_at = '2026-09-28T15:55:19.002Z'
  AND message = 'Super attack got blocked for no reason';

UPDATE feedback_reports
SET status = 'done'
WHERE created_at = '2026-09-28T15:52:55.158Z'
  AND message = 'When reanimated, it should unspy from everyone';

UPDATE feedback_reports
SET status = 'done'
WHERE created_at = '2026-09-28T10:02:05.588Z'
  AND message = 'Couldn’t absorb sold up point';

UPDATE feedback_reports
SET status = 'done'
WHERE created_at = '2026-09-28T09:45:42.017Z'
  AND message = 'I used superattack+ on opponent but it did not block the other super attack+';

UPDATE feedback_reports
SET status = 'done'
WHERE created_at = '2026-09-28T13:29:51.361Z'
  AND message = 'Attack thief did not block all incoming attacks';

UPDATE feedback_reports
SET status = 'done'
WHERE created_at = '2026-09-28T11:28:13.279Z'
  AND message = 'Strong attacked has been blocked for no reason here';

UPDATE feedback_reports
SET status = 'eliminated'
WHERE created_at = '2026-09-28T15:09:58.121Z'
  AND message = 'Nigga';
