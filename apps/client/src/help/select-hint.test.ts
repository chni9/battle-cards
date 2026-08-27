/**
 * First-real-game hint selector — L46-02 / technical spec v6 §5.2.
 */

import type { PendingEffectView } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import {
  incomingAttackTargetingYouIds,
  incomingTargetingYouIds,
} from '../fx/incoming-threat-diff';

import {
  hintIdsDismissedBy,
  selectHint,
  shouldShowFirstGameHints,
} from './select-hint';
import type { SelectHintInput } from './select-hint';

function input(partial: Partial<SelectHintInput> = {}): SelectHintInput {
  return {
    playKind: 'classic',
    readOnly: false,
    selfEliminated: false,
    isMyTurn: true,
    skipAll: false,
    dismissed: [],
    hasIncomingAttack: false,
    hasUnspiedLivingOpponent: true,
    ...partial,
  };
}

function pending(
  partial: Pick<PendingEffectView, 'id' | 'sourcePlayerId' | 'targetPlayerId' | 'cardId'> &
    Partial<PendingEffectView>,
): PendingEffectView {
  return {
    isUpgraded: false,
    queuedAt: 1,
    damageMultiplier: 1,
    redirectedBy: null,
    ...partial,
  };
}

describe('shouldShowFirstGameHints (L46-01)', () => {
  it('does not run during tutorial', () => {
    expect(shouldShowFirstGameHints(input({ playKind: 'tutorial' }))).toBe(false);
  });

  it('does not run for spectators or finished inspect', () => {
    expect(shouldShowFirstGameHints(input({ selfEliminated: true }))).toBe(false);
    expect(shouldShowFirstGameHints(input({ readOnly: true }))).toBe(false);
  });
});

describe('selectHint (L46-02)', () => {
  it('returns null for tutorial, skipAll, and spectators', () => {
    expect(selectHint(input({ playKind: 'tutorial' }))).toBeNull();
    expect(selectHint(input({ skipAll: true }))).toBeNull();
    expect(selectHint(input({ selfEliminated: true }))).toBeNull();
  });

  it('on-turn order is incoming > your-turn > draw > shop > resources > hidden-kit', () => {
    expect(selectHint(input({ hasIncomingAttack: true }))).toBe('incoming');
    expect(selectHint(input())).toBe('your-turn');
    expect(selectHint(input({ dismissed: ['your-turn'] }))).toBe('draw');
    expect(selectHint(input({ dismissed: ['your-turn', 'draw'] }))).toBe('shop');
    expect(
      selectHint(input({ dismissed: ['your-turn', 'draw', 'shop'] })),
    ).toBe('resources');
    expect(
      selectHint(
        input({ dismissed: ['your-turn', 'draw', 'shop', 'resources'] }),
      ),
    ).toBe('hidden-kit');
  });

  it('off-turn only offers incoming then hidden-kit', () => {
    expect(selectHint(input({ isMyTurn: false, hasIncomingAttack: true }))).toBe(
      'incoming',
    );
    expect(selectHint(input({ isMyTurn: false }))).toBe('hidden-kit');
    expect(
      selectHint(
        input({
          isMyTurn: false,
          hasUnspiedLivingOpponent: false,
          dismissed: ['incoming'],
        }),
      ),
    ).toBeNull();
    expect(selectHint(input({ isMyTurn: false, dismissed: ['hidden-kit'] }))).toBeNull();
  });

  it('Incoming hint is not Spy, Thief, or a persistent chip', () => {
    const effects = [
      pending({
        id: 'persistent:imp->you',
        sourcePlayerId: 'bob',
        targetPlayerId: 'you',
        cardId: 'imposition',
      }),
      pending({
        id: 'spy',
        sourcePlayerId: 'bob',
        targetPlayerId: 'you',
        cardId: 'spy',
      }),
      pending({
        id: 'thief',
        sourcePlayerId: 'bob',
        targetPlayerId: 'you',
        cardId: 'thief',
      }),
      pending({
        id: 'attack',
        sourcePlayerId: 'bob',
        targetPlayerId: 'you',
        cardId: 'basic-attack',
      }),
    ];
    expect(incomingTargetingYouIds(effects, 'you').has('spy')).toBe(true);
    expect(incomingAttackTargetingYouIds(effects, 'you').has('spy')).toBe(false);
    expect(incomingAttackTargetingYouIds(effects, 'you').has('thief')).toBe(false);
    expect(incomingAttackTargetingYouIds(effects, 'you').has('persistent:imp->you')).toBe(
      false,
    );
    expect(incomingAttackTargetingYouIds(effects, 'you').has('attack')).toBe(true);
    expect(
      selectHint(
        input({
          isMyTurn: false,
          hasIncomingAttack: incomingAttackTargetingYouIds(
            effects.filter((effect) => effect.cardId === 'spy' || effect.cardId === 'thief'),
            'you',
          ).size > 0,
        }),
      ),
    ).toBe('hidden-kit');
    expect(
      selectHint(
        input({
          hasIncomingAttack: incomingAttackTargetingYouIds(effects, 'you').size > 0,
        }),
      ),
    ).toBe('incoming');
  });

  it('Got it on hidden-kit does not reselect it later', () => {
    expect(
      selectHint(
        input({
          isMyTurn: false,
          dismissed: ['hidden-kit'],
          hasIncomingAttack: false,
        }),
      ),
    ).toBeNull();
    expect(
      selectHint(
        input({
          dismissed: ['your-turn', 'draw', 'shop', 'resources', 'hidden-kit'],
        }),
      ),
    ).toBeNull();
  });
});

describe('hintIdsDismissedBy (L46-02)', () => {
  it('Draw is a playing intent and also dismisses draw', () => {
    expect(hintIdsDismissedBy('draw', { hasIncomingAttack: false })).toEqual([
      'your-turn',
      'draw',
    ]);
    expect(hintIdsDismissedBy('draw', { hasIncomingAttack: true })).toEqual([
      'your-turn',
      'draw',
      'incoming',
    ]);
  });

  it('opening Shop or an opponent portrait dismisses only that id', () => {
    expect(hintIdsDismissedBy('open-shop', { hasIncomingAttack: true })).toEqual([
      'shop',
    ]);
    expect(
      hintIdsDismissedBy('inspect-opponent', { hasIncomingAttack: false }),
    ).toEqual(['hidden-kit']);
  });
});
