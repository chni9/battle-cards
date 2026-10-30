/**
 * Forced slot-drop — Lot 69.
 */

import type { GameState, Player } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { makeCounterEffect } from '../../testing/factories';
import { createInitialState } from '../create-initial-state';
import { completeSlotDrop, performTurnAction } from '../turn/perform-action';
import { applyDefaultSlotDrop, beginSlotDrop, cancelSlotDrop } from './slot-drop';

describe('forced slot-drop', () => {
  it('default expiry skips Curse and drops oldest other slot', () => {
    const state = createInitialState({
      seats: [{ id: 'a', nickname: 'A' }, { id: 'b', nickname: 'B' }],
      seed: 'slot-drop-default',
    });
    const a = state.players.find((player) => player.id === 'a');
    if (a === undefined) {
      throw new Error('missing a');
    }

    a.shield = 4;
    a.shieldSlotQueuedAt = 1;
    a.activePersistentEffects = [
      makeCounterEffect({
        id: 'curse-on-me',
        cardId: 'curse',
        counter: null,
        slotQueuedAt: 2,
      }),
      makeCounterEffect({ id: 'p1', cardId: 'poison', counter: 3, slotQueuedAt: 3 }),
    ];

    beginSlotDrop(state, {
      chooserPlayerId: a.id,
      slotOwnerId: a.id,
      pending: { kind: 'persistent', ownerPlayerId: a.id, cardId: 'roulette', isUpgraded: false, counter: 2 },
      nowMs: 0,
    });

    expect(applyDefaultSlotDrop(state, a.id).ok).toBe(true);
    expect(a.shield).toBe(0);
    expect(a.activePersistentEffects.some((effect) => effect.cardId === 'curse')).toBe(true);
    expect(a.activePersistentEffects.some((effect) => effect.cardId === 'poison')).toBe(true);
    expect(a.activePersistentEffects.some((effect) => effect.cardId === 'roulette')).toBe(true);
  });
});

/** Every card copy on the table: hands, specials, active persistents, pool, and the held fifth activation. */
function cardCopies(state: GameState): string[] {
  const copies = state.pool.map((card) => card.cardId);

  for (const player of state.players) {
    copies.push(
      ...player.hand.map((card) => card.cardId),
      ...player.specialCards.map((card) => card.cardId),
      ...player.activePersistentEffects.map((effect) => effect.cardId),
    );
  }

  const choice = state.subChoice;

  if (choice?.kind === 'slot-drop' && choice.pendingActivation.kind === 'persistent') {
    copies.push(choice.pendingActivation.cardId);
  }

  return copies.toSorted();
}

function fullSlots(player: Player): void {
  player.shield = 4;
  player.shieldIsUpgraded = false;
  player.shieldSlotQueuedAt = 1;
  player.activePersistentEffects = [
    makeCounterEffect({ id: 'p1', cardId: 'poison', counter: 5, slotQueuedAt: 2 }),
    makeCounterEffect({ id: 'p2', cardId: 'imposition', counter: 5, slotQueuedAt: 3 }),
    makeCounterEffect({ id: 'p3', cardId: 'super-absorber', counter: 5, slotQueuedAt: 4 }),
  ];
}

const FIFTH_SLOT_PLAYS = [
  { name: 'own Points Generator', cardId: 'points-generator', onVictim: false },
  { name: 'Curse on a full victim', cardId: 'curse', onVictim: true },
] as const;

describe('fifth slot keeps one copy of the played card (rules spec §5 Active slots)', () => {
  function playFifth(play: (typeof FIFTH_SLOT_PLAYS)[number]) {
    const state = createInitialState({
      seats: [{ id: 'a', nickname: 'A' }, { id: 'b', nickname: 'B' }],
      seed: `slot-cap-copies-${play.cardId}`,
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');
    if (a === undefined || b === undefined) {
      throw new Error('missing seats');
    }

    state.currentTurnPlayerId = a.id;
    state.turnSequence = 10;
    state.pool = [];
    fullSlots(play.onVictim ? b : a);
    a.points = 20;
    a.specialCards = [{ instanceId: 'played-1', cardId: play.cardId, isUpgraded: false }];
    const before = cardCopies(state);

    const played = performTurnAction(state, a.id, {
      type: 'playCard',
      instanceId: 'played-1',
      ...(play.onVictim ? { targetPlayerId: b.id } : {}),
    });
    expect(played.ok).toBe(true);
    expect(state.subChoice?.kind).toBe('slot-drop');

    return { state, a, slotOwner: play.onVictim ? b : a, before };
  }

  it.each(FIFTH_SLOT_PLAYS)('$name: holding the pick pools no copy', (play) => {
    const { state, before } = playFifth(play);

    expect(state.pool.some((card) => card.cardId === play.cardId)).toBe(false);
    expect(cardCopies(state)).toEqual(before);
  });

  it.each(FIFTH_SLOT_PLAYS)('$name: Cancel returns the card to specials only', (play) => {
    const { state, a, slotOwner, before } = playFifth(play);

    expect(cancelSlotDrop(state, a.id).ok).toBe(true);
    expect(a.specialCards.map((card) => card.instanceId)).toEqual(['played-1']);
    expect(slotOwner.activePersistentEffects.some((e) => e.cardId === play.cardId)).toBe(false);
    expect(state.pool.some((card) => card.cardId === play.cardId)).toBe(false);
    expect(cardCopies(state)).toEqual(before);
  });

  it.each(FIFTH_SLOT_PLAYS)('$name: Drop activates the card and pools only the dropped one', (play) => {
    const { state, a, slotOwner, before } = playFifth(play);

    expect(completeSlotDrop(state, a.id, 'p1').ok).toBe(true);
    expect(slotOwner.activePersistentEffects.some((e) => e.cardId === play.cardId)).toBe(true);
    expect(slotOwner.activePersistentEffects.some((e) => e.cardId === 'poison')).toBe(false);
    expect(state.pool.map((card) => card.cardId)).toEqual(['poison']);
    expect(cardCopies(state)).toEqual(before);
  });
});
