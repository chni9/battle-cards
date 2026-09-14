import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'feedback-dialog.tsx'),
  'utf8',
);

describe('FeedbackDialog submit (technical spec v6 §7.1 / L47-03 / L57-05)', () => {
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

  it('shows Kind / About / Contact in ask-mode with Skip, including Return home', () => {
    expect(source).toContain('resolveFeedbackSubmitFields(mode, kind, topics)');
    expect(source).toContain(
      'buildFeedbackPayload(\n      submitted.kind,\n      message,\n      context,\n      contact,\n    )',
    );
    expect(source).toContain('FEEDBACK_ASK_LEAD');
    expect(source).toContain("mode === 'ask' ? 'Skip' : 'Cancel'");
    expect(source).toContain('Contact (optional)');
    expect(source).toContain('FEEDBACK_KINDS.map');
    expect(source).toContain('FEEDBACK_ABOUT_LEGEND');
    expect(source).not.toContain("mode === 'manual' ? (");
    expect(source).not.toContain(
      "mode === 'ask'\n        ? buildFeedbackPayload",
    );
  });
});
