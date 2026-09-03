import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'feedback-dialog.tsx'),
  'utf8',
);

describe('FeedbackDialog submit (technical spec v6 §7.1 / L47-03)', () => {
  it('claims the in-flight gate before POST so a double-click cannot dual-insert', () => {
    const submitAt = source.indexOf('const onSubmit');
    const fetchAt = source.indexOf('submitFeedback(');
    const gateAt = source.indexOf('beginFeedbackSend(inFlight)');
    expect(submitAt).toBeGreaterThan(0);
    expect(gateAt).toBeGreaterThan(submitAt);
    expect(fetchAt).toBeGreaterThan(gateAt);
    expect(source).toContain('endFeedbackSend(inFlight)');
  });
});
