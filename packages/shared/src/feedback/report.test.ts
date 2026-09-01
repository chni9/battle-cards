import { describe, expect, it } from 'vitest';

import {
  FEEDBACK_KINDS,
  FEEDBACK_LOG_TAIL_MAX,
  FEEDBACK_SCREENS,
  isFeedbackKind,
  isFeedbackScreen,
} from './report';

describe('feedback report unions (technical spec v6 §7 / L47-01)', () => {
  it('accepts only bug, confusion, and idea', () => {
    expect(FEEDBACK_KINDS).toEqual(['bug', 'confusion', 'idea']);
    expect(isFeedbackKind('bug')).toBe(true);
    expect(isFeedbackKind('confusion')).toBe(true);
    expect(isFeedbackKind('idea')).toBe(true);
    expect(isFeedbackKind('rating')).toBe(false);
  });

  it('accepts the spec screen union including lobby and tutorial', () => {
    expect(FEEDBACK_SCREENS).toEqual(['home', 'lobby', 'table', 'end', 'tutorial']);
    expect(isFeedbackScreen('home')).toBe(true);
    expect(isFeedbackScreen('inbox')).toBe(false);
  });

  it('caps the public log tail at 30 entries', () => {
    expect(FEEDBACK_LOG_TAIL_MAX).toBe(30);
  });
});
