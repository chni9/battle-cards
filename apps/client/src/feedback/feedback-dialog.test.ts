import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'feedback-dialog.tsx'),
  'utf8',
);

describe('FeedbackDialog submit (technical spec v6 §7.1 / L47-03 / L57-02)', () => {
  it('claims the in-flight gate before POST so a double-click cannot dual-insert', () => {
    const submitAt = source.indexOf('const onSubmit');
    const fetchAt = source.indexOf('submitFeedback(');
    const gateAt = source.indexOf('beginFeedbackSend(inFlight)');
    expect(submitAt).toBeGreaterThan(0);
    expect(gateAt).toBeGreaterThan(submitAt);
    expect(fetchAt).toBeGreaterThan(gateAt);
    expect(source).toContain('endFeedbackSend(inFlight)');
    expect(source).toContain('FEEDBACK_TOPICS');
    expect(source).toContain('toggleFeedbackTopic');
    expect(source).toContain('canSendFeedbackForm');
    expect(source).toContain('feedbackSendHint');
  });

  it('asks with one sentence and keeps Kind / About / Contact on manual only', () => {
    expect(source).toContain('resolveFeedbackSubmitFields(mode, kind, topics)');
    expect(source).toContain('buildFeedbackPayload(submitted.kind, message, context)');
    expect(source).toContain(
      "mode === 'ask'\n        ? buildFeedbackPayload(submitted.kind, message, context)\n        : buildFeedbackPayload(submitted.kind, message, context, contact)",
    );
    expect(source).toContain('FEEDBACK_ASK_LEAD');
    expect(source).toContain("mode === 'ask' ? (");
    expect(source).toContain("mode === 'manual' ? (");
    expect(source).toContain('Contact (optional)');
  });
});
