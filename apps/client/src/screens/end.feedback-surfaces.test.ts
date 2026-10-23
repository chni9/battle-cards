/**
 * Feedback surfaces — technical spec v6 §7.1 / L47-03.
 * End part, split from feedback/feedback-surfaces.test.ts by owner lot (technical spec v7 §12.1, L72-02).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const screens = dirname(fileURLToPath(import.meta.url));

function read(rel: string): string {
  return readFileSync(join(screens, rel), 'utf8');
}

describe('feedback surfaces (technical spec v6 §7.1 / L47-03)', () => {
  it('wires Feedback on Home, Lobby, Table, and Game over (end)', () => {
    const end = read('end.tsx');

    expect(end).toContain('onOpenFeedback={onOpenManualFeedback}');
    expect(end).toContain('onOpenFeedback={onOpenStatsFeedback}');
    expect(end).toContain('isEndStatsOpen');
    expect(end).toContain('shouldAskFeedbackAfterStatsClose');
    expect(end).toContain('shouldMarkEndFeedbackAsked');
    expect(end).toContain('mode={feedbackMode}');
    expect(end).toContain('onClose={onStatsClose}');
    expect(end).toContain('onLeave={requestLeave}');
    expect(end).not.toContain('onLeave={onLeave}');
    expect(end).toContain('finishedHubLeaveAction');
    expect(end).toContain('finishedHubPlayAgainAction');
    expect(end).toContain('playAgainPending');
    expect(end).toContain('shouldLeaveAfterAskDismiss');
    expect(end).toContain('setLeavePending(true)');
    expect(end.split('setLeavePending(true)').length).toBe(2);
    expect(end).toContain('onOpenStatsFeedback');
  });
});
