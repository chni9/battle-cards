import { ATTACK_CARD_IDS, type CardId } from '@card-battle/shared';
import { describe, expect, it, vi } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { createRng } from '../rng';
import { stealRandomCard, takeCardFrom } from './steal-card';

describe('takeCardFrom (technical spec v4 §4.2)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  function victim() {
    const state = createInitialState({ seats, seed: 'take-card-from' });
    const player = state.players[0];

    if (player === undefined) {
      throw new Error('missing player');
    }

    return player;
  }

  it('extracts a card from hand by instanceId', () => {
    const target = victim();
    target.hand = [
      { instanceId: 'atk-1', cardId: 'basic-attack', isUpgraded: false },
      { instanceId: 'spy-1', cardId: 'spy', isUpgraded: false },
    ];

    const card = takeCardFrom(target, 'spy-1');

    expect(card).toEqual({ instanceId: 'spy-1', cardId: 'spy', isUpgraded: false });
    expect(target.hand).toHaveLength(1);
    expect(target.hand[0]?.instanceId).toBe('atk-1');
  });

  it('extracts a card from specialCards when not in hand', () => {
    const target = victim();
    target.specialCards = [
      { instanceId: 'su-1', cardId: 'suicide', isUpgraded: false },
    ];

    const card = takeCardFrom(target, 'su-1');

    expect(card?.cardId).toBe('suicide');
    expect(target.specialCards).toHaveLength(0);
  });

  it('returns undefined when the instance is missing', () => {
    const target = victim();
    target.hand = [{ instanceId: 'atk-1', cardId: 'basic-attack', isUpgraded: false }];

    expect(takeCardFrom(target, 'missing')).toBeUndefined();
    expect(target.hand).toHaveLength(1);
  });
});

describe('stealRandomCard (technical spec v4 §4.2)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  function victim() {
    const state = createInitialState({ seats, seed: 'steal-random-card' });
    const player = state.players[0];

    if (player === undefined) {
      throw new Error('missing player');
    }

    return player;
  }

  it('draws through the injected rng', () => {
    const target = victim();
    target.hand = [
      { instanceId: 'atk-1', cardId: 'basic-attack', isUpgraded: false },
      { instanceId: 'spy-1', cardId: 'spy', isUpgraded: false },
    ];
    const rng = createRng('steal-random-pick');
    const pickSpy = vi.spyOn(rng, 'pick');

    const stolen = stealRandomCard(target, rng);

    expect(pickSpy).toHaveBeenCalledOnce();
    expect(stolen).toBeDefined();
    expect(target.hand).toHaveLength(1);
    expect(
      [...target.hand, ...target.specialCards].some(
        (card) => card.instanceId === stolen?.instanceId,
      ),
    ).toBe(false);
  });

  it('is reproducible for the same rng state', () => {
    const run = (): string | undefined => {
      const target = victim();
      target.hand = [
        { instanceId: 'atk-1', cardId: 'basic-attack', isUpgraded: false },
        { instanceId: 'spy-1', cardId: 'spy', isUpgraded: false },
        { instanceId: 'th-1', cardId: 'thief', isUpgraded: false },
      ];
      const rng = createRng('steal-repro');
      return stealRandomCard(target, rng)?.instanceId;
    };

    expect(run()).toBe(run());
  });

  it('returns undefined when the victim holds no cards', () => {
    const target = victim();
    target.hand = [];
    target.specialCards = [];
    const rng = createRng('steal-empty');

    expect(stealRandomCard(target, rng)).toBeUndefined();
  });

  it('respects an optional filter', () => {
    const target = victim();
    target.hand = [
      { instanceId: 'atk-1', cardId: 'basic-attack', isUpgraded: false },
      { instanceId: 'spy-1', cardId: 'spy', isUpgraded: false },
    ];
    const attackIds = new Set<CardId>(ATTACK_CARD_IDS);
    const rng = createRng('steal-filter');
    const pick = vi.spyOn(rng, 'pick');

    const stolen = stealRandomCard(target, rng, (card) => attackIds.has(card.cardId));

    expect(pick).toHaveBeenCalledOnce();
    expect(stolen?.cardId).toBe('basic-attack');
    expect(target.hand).toHaveLength(1);
    expect(target.hand[0]?.cardId).toBe('spy');
  });

  it('returns undefined when the filter excludes every card', () => {
    const target = victim();
    target.hand = [{ instanceId: 'spy-1', cardId: 'spy', isUpgraded: false }];
    const rng = createRng('steal-no-match');
    const pick = vi.spyOn(rng, 'pick');

    expect(stealRandomCard(target, rng, () => false)).toBeUndefined();
    expect(pick).not.toHaveBeenCalled();
    expect(target.hand).toHaveLength(1);
  });
});
