/**
 * First-real-game hint selector — L46-02 / technical spec v6 §5.2.
 */

import type { PendingEffectView } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { incomingTargetingYouIds } from '../fx/incoming-threat-diff';

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
    hasRealIncoming: false,
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
    expect(selectHint(input({ hasRealIncoming: true }))).toBe('incoming');
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
    expect(selectHint(input({ isMyTurn: false, hasRealIncoming: true }))).toBe(
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

  it('Incoming hint is not a persistent presentation chip', () => {
    const effects = [
      pending({
        id: 'persistent:imp->you',
        sourcePlayerId: 'bob',
        targetPlayerId: 'you',
        cardId: 'imposition',
      }),
      pending({
        id: 'real',
        sourcePlayerId: 'bob',
        targetPlayerId: 'you',
        cardId: 'basic-attack',
      }),
    ];
    expect(incomingTargetingYouIds(effects, 'you').has('persistent:imp->you')).toBe(
      false,
    );
    expect(incomingTargetingYouIds(effects, 'you').has('real')).toBe(true);
    expect(
      selectHint(
        input({
          hasRealIncoming: incomingTargetingYouIds(
            effects.filter((effect) => effect.id.startsWith('persistent:')),
            'you',
          ).size > 0,
        }),
      ),
    ).toBe('your-turn');
  });
});

describe('hintIdsDismissedBy (L46-02)', () => {
  it('Draw is a playing intent and also dismisses draw', () => {
    expect(hintIdsDismissedBy('draw', { hasRealIncoming: false })).toEqual([
      'your-turn',
      'draw',
    ]);
    expect(hintIdsDismissedBy('draw', { hasRealIncoming: true })).toEqual([
      'your-turn',
      'draw',
      'incoming',
    ]);
  });

  it('opening Shop or an opponent portrait dismisses only that id', () => {
    expect(hintIdsDismissedBy('open-shop', { hasRealIncoming: true })).toEqual([
      'shop',
    ]);
    expect(
      hintIdsDismissedBy('inspect-opponent', { hasRealIncoming: false }),
    ).toEqual(['hidden-kit']);
  });
});
