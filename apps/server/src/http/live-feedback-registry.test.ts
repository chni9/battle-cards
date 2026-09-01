import { afterEach, describe, expect, it } from 'vitest';

import {
  lookupLiveFeedbackContext,
  registerLiveFeedbackRoom,
  resetLiveFeedbackRegistryForTests,
  unregisterLiveFeedbackRoom,
} from './live-feedback-registry';

describe('live feedback registry (L47-02)', () => {
  afterEach(() => {
    resetLiveFeedbackRegistryForTests();
  });

  it('returns a seed-free snapshot for a live game code', () => {
    registerLiveFeedbackRoom('ABCDEF', () => ({
      gameCode: 'ABCDEF',
      playKind: 'tutorial',
      protocolVersion: 30,
      logTail: [{ kind: 'rewardsClaimed', eliminatorPlayerId: 'a', eliminatedPlayerId: 'b', turnSequence: 1 }],
    }));

    const found = lookupLiveFeedbackContext('ABCDEF');
    expect(found?.playKind).toBe('tutorial');
    expect(found?.gameCode).toBe('ABCDEF');
    expect(JSON.stringify(found)).not.toContain('seed');
  });

  it('forgets a room after unregister', () => {
    registerLiveFeedbackRoom('ABCDEF', () => ({
      gameCode: 'ABCDEF',
      playKind: 'classic',
      protocolVersion: 30,
      logTail: [],
    }));
    unregisterLiveFeedbackRoom('ABCDEF');
    expect(lookupLiveFeedbackContext('ABCDEF')).toBeNull();
  });
});
