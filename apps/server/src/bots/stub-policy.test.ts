import { describe, expect, it } from 'vitest';

import type { PendingEffect } from '@card-battle/shared';

import { createInitialState } from '../engine/create-initial-state';
import { pickStubMirrorChoice, stubRewardChoices } from './stub-policy';

describe('stub policy (L15-04)', () => {
  it('picks first eligible effect and first other alive player', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'bot', nickname: 'Bot' },
        { id: 'c', nickname: 'C' },
      ],
      seed: 'stub-mirror',
    });

    const bot = state.players.find((player) => player.id === 'bot');

    if (bot === undefined) {
      throw new Error('missing bot');
    }

    const effect: PendingEffect = {
      id: 'e1',
      cardId: 'basic-attack',
      sourcePlayerId: 'a',
      targetPlayerId: 'bot',
      queuedAt: 1,
      isUpgraded: false,
      damageMultiplier: 1,
      redirectedBy: null,
      chosenInstanceId: null,
    };
    bot.pendingEffects.push(effect);
    state.mirrorChoice = {
      playerId: 'bot',
      eligibleEffectIds: ['e1'],
      isUpgraded: false,
      deadlineMs: Date.now() + 20_000,
    };

    const expectedTarget = state.players.find(
      (player) => player.id !== 'bot' && !player.isEliminated,
    );

    expect(pickStubMirrorChoice(state)).toEqual({
      pendingEffectId: 'e1',
      newTargetPlayerId: expectedTarget?.id,
    });
  });

  it('returns 2× lives for stub rewards', () => {
    expect(stubRewardChoices()).toEqual([{ type: 'lives' }, { type: 'lives' }]);
  });
});
