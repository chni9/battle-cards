import { describe, expect, it } from 'vitest';

import {
  FEEDBACK_KINDS,
  FEEDBACK_LOG_TAIL_MAX,
  FEEDBACK_SCREENS,
  FEEDBACK_TOPICS,
  formatFeedbackTopics,
  isFeedbackKind,
  isFeedbackScreen,
  isFeedbackTopicsComplete,
  normalizeFeedbackTopics,
  toggleFeedbackTopic,
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

  it('normalizes topic chips in catalog order and rejects unknown ids', () => {
    expect(FEEDBACK_TOPICS).toEqual([
      'ui',
      'gameplay',
      'card',
      'shop',
      'bot',
      'tutorial',
      'other',
    ]);
    expect(normalizeFeedbackTopics(undefined)).toEqual([]);
    expect(normalizeFeedbackTopics(['card', 'ui', 'card'])).toEqual(['ui', 'card']);
    expect(normalizeFeedbackTopics(['ui', 'nope'])).toBeNull();
    expect(normalizeFeedbackTopics('ui')).toBeNull();
    expect(isFeedbackTopicsComplete('bug', [])).toBe(false);
    expect(isFeedbackTopicsComplete('bug', ['ui'])).toBe(true);
    expect(isFeedbackTopicsComplete('idea', [])).toBe(true);
    expect(toggleFeedbackTopic(['ui'], 'card')).toEqual(['ui', 'card']);
    expect(toggleFeedbackTopic(['ui', 'card'], 'ui')).toEqual(['card']);
    expect(formatFeedbackTopics(['ui', 'card'])).toBe('UI, Card');
  });
});
