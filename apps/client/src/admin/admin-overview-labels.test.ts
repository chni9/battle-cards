import { describe, expect, it } from 'vitest';

import {
  ADMIN_PLAYED_ACTION_IDS,
  ACTION_RESOLUTION_OUTCOMES,
  FEEDBACK_KINDS,
} from '@card-battle/shared';

import {
  adminCardLabel,
  combatOutcomeLabel,
  durationBucketLabel,
  feedbackKindLabel,
  hourUtcLabel,
  occupancyLabel,
  playedActionLabel,
  seatIndexLabel,
  winnerLivesBucketLabel,
} from './admin-overview-labels';

describe('admin overview labels (L62-05)', () => {
  it('names every played action', () => {
    for (const action of ADMIN_PLAYED_ACTION_IDS) {
      const label = playedActionLabel(action);
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toBe(action);
    }
    expect(playedActionLabel('draw')).toBe('Draw');
    expect(playedActionLabel('playMultipleAttacks')).toBe('Multi-attack');
    expect(playedActionLabel('clearSpy')).toBe('Unspy');
  });

  it('names shared and special cards from the catalog', () => {
    expect(adminCardLabel('spy')).toBe('Spy');
    expect(adminCardLabel('basic-attack')).toBe('Basic attack');
    expect(adminCardLabel('invisibility')).toBe('Invisibility');
    expect(adminCardLabel('suicide')).toBe('Suicide');
    expect(adminCardLabel('not-a-card')).toBe('not-a-card');
  });

  it('labels buckets, hours, seats, outcomes, and feedback', () => {
    expect(durationBucketLabel('under5min')).toBe('Under 5 min');
    expect(winnerLivesBucketLabel('16plus')).toBe('16+ lives');
    expect(occupancyLabel(4)).toBe('4 seats');
    expect(hourUtcLabel(9)).toBe('09:00 UTC');
    expect(seatIndexLabel(0)).toBe('Seat 1');
    expect(combatOutcomeLabel('applied')).toBe('Applied');
    expect(feedbackKindLabel('bug')).toBe('Bug');
    expect(ACTION_RESOLUTION_OUTCOMES.map(combatOutcomeLabel).every((label) => label.length > 0)).toBe(
      true,
    );
    expect(FEEDBACK_KINDS.map(feedbackKindLabel)).toEqual(['Bug', 'Confusion', 'Idea']);
  });
});
