/**
 * First-real-game hint selector — L46-02 / technical spec v6 §5.2.
 */

import type { PendingEffectView } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import {
  incomingAttackTargetingYouIds,
  incomingTargetingYouIds,
  incomingThiefTargetingYouIds,
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
    hasIncomingThief: false,
    hasRewardChoice: false,
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

  it('on-turn order is threats then dock lessons', () => {
    expect(selectHint(input({ hasIncomingAttack: true }))).toBe('incoming');
    expect(selectHint(input({ hasIncomingThief: true }))).toBe('incoming-thief');
    expect(
      selectHint(input({ hasIncomingAttack: true, hasIncomingThief: true })),
    ).toBe('incoming');
    expect(selectHint(input())).toBe('your-turn');
    expect(selectHint(input({ dismissed: ['your-turn'] }))).toBe('draw');
    expect(selectHint(input({ dismissed: ['your-turn', 'draw'] }))).toBe('hand');
    expect(
      selectHint(input({ dismissed: ['your-turn', 'draw', 'hand'] })),
    ).toBe('specials');
    expect(
      selectHint(input({ dismissed: ['your-turn', 'draw', 'hand', 'specials'] })),
    ).toBe('shop');
    expect(
      selectHint(
        input({ dismissed: ['your-turn', 'draw', 'hand', 'specials', 'shop'] }),
      ),
    ).toBe('resources');
    expect(
      selectHint(
        input({
          dismissed: ['your-turn', 'draw', 'hand', 'specials', 'shop', 'resources'],
        }),
      ),
    ).toBe('hidden-kit');
  });

  it('off-turn only offers threats then hidden-kit', () => {
    expect(selectHint(input({ isMyTurn: false, hasIncomingAttack: true }))).toBe(
      'incoming',
    );
    expect(selectHint(input({ isMyTurn: false, hasIncomingThief: true }))).toBe(
      'incoming-thief',
    );
    expect(selectHint(input({ isMyTurn: false }))).toBe('hidden-kit');
    expect(
      selectHint(
        input({
          isMyTurn: false,
          hasUnspiedLivingOpponent: false,
          dismissed: ['incoming', 'incoming-thief'],
        }),
      ),
    ).toBeNull();
    expect(selectHint(input({ isMyTurn: false, dismissed: ['hidden-kit'] }))).toBeNull();
  });

  it('reward outranks threats while POV is choosing', () => {
    expect(
      selectHint(
        input({
          hasRewardChoice: true,
          hasIncomingAttack: true,
          hasIncomingThief: true,
          isMyTurn: false,
        }),
      ),
    ).toBe('reward');
    expect(
      selectHint(
        input({
          hasRewardChoice: true,
          dismissed: ['reward'],
          hasIncomingAttack: true,
        }),
      ),
    ).toBe('incoming');
  });

  it('Incoming attack hint is not Spy, Thief, or a persistent chip', () => {
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
          hasIncomingThief: incomingThiefTargetingYouIds(
            effects.filter((effect) => effect.cardId === 'spy'),
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

  it('Incoming thief is not Spy, an attack, or a persistent chip', () => {
    const effects = [
      pending({
        id: 'spy',
        sourcePlayerId: 'bob',
        targetPlayerId: 'you',
        cardId: 'spy',
      }),
      pending({
        id: 'attack',
        sourcePlayerId: 'bob',
        targetPlayerId: 'you',
        cardId: 'basic-attack',
      }),
      pending({
        id: 'upt',
        sourcePlayerId: 'bob',
        targetPlayerId: 'you',
        cardId: 'upgrade-point-thief',
      }),
    ];
    expect(incomingThiefTargetingYouIds(effects, 'you').has('spy')).toBe(false);
    expect(incomingThiefTargetingYouIds(effects, 'you').has('attack')).toBe(false);
    expect(incomingThiefTargetingYouIds(effects, 'you').has('upt')).toBe(true);
    expect(
      selectHint(
        input({
          isMyTurn: false,
          dismissed: ['incoming'],
          hasIncomingThief: incomingThiefTargetingYouIds(effects, 'you').size > 0,
        }),
      ),
    ).toBe('incoming-thief');
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
          dismissed: [
            'your-turn',
            'draw',
            'hand',
            'specials',
            'shop',
            'resources',
            'hidden-kit',
          ],
        }),
      ),
    ).toBeNull();
  });
});

describe('hintIdsDismissedBy (L46-02)', () => {
  const idle = { hasIncomingAttack: false, hasIncomingThief: false };

  it('Draw is a playing intent and also dismisses draw', () => {
    expect(hintIdsDismissedBy('draw', idle)).toEqual(['your-turn', 'draw']);
    expect(
      hintIdsDismissedBy('draw', { hasIncomingAttack: true, hasIncomingThief: false }),
    ).toEqual(['your-turn', 'incoming', 'draw']);
    expect(
      hintIdsDismissedBy('draw', { hasIncomingAttack: false, hasIncomingThief: true }),
    ).toEqual(['your-turn', 'incoming-thief', 'draw']);
  });

  it('opening Shop, a portrait, or a dock card dismisses only that id', () => {
    expect(
      hintIdsDismissedBy('open-shop', { hasIncomingAttack: true, hasIncomingThief: true }),
    ).toEqual(['shop']);
    expect(hintIdsDismissedBy('inspect-opponent', idle)).toEqual(['hidden-kit']);
    expect(hintIdsDismissedBy('inspect-hand', idle)).toEqual(['hand']);
    expect(hintIdsDismissedBy('inspect-special', idle)).toEqual(['specials']);
    expect(hintIdsDismissedBy('confirm-reward', idle)).toEqual(['reward']);
    expect(hintIdsDismissedBy('incoming-thief-cleared', idle)).toEqual(['incoming-thief']);
  });
});
