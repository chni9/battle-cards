import {
  ACTION_CARD_IDS,
  ATTACK_CARD_IDS,
  getKit,
  KIT_IDS,
  type CardId,
} from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { createInitialState } from './create-initial-state';
import { createRng } from './rng';

describe('createInitialState (L4-02)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('assigns kit resources, card counts, and specials from the roster', () => {
    const state = createInitialState({ seats, seed: 'kit-dist-1' });

    for (const player of state.players) {
      expect(KIT_IDS).toContain(player.kitId);
      const kit = getKit(player.kitId);
      expect(player.lives).toBe(kit.startingResources.lives);
      expect(player.points).toBe(kit.startingResources.points);
      expect(player.upgradePoints).toBe(kit.startingResources.upgradePoints);
      expect(player.hand).toHaveLength(
        kit.startingCardCounts.action + kit.startingCardCounts.attack,
      );

      const actionCount = player.hand.filter((card) =>
        (ACTION_CARD_IDS as readonly CardId[]).includes(card.cardId),
      ).length;
      const attackCount = player.hand.filter((card) =>
        (ATTACK_CARD_IDS as readonly CardId[]).includes(card.cardId),
      ).length;
      expect(actionCount).toBe(kit.startingCardCounts.action);
      expect(attackCount).toBe(kit.startingCardCounts.attack);

      expect(player.specialCards.map((card) => card.cardId)).toEqual(kit.specialCards);
    }
  });

  it('allows duplicate kits across players (with replacement)', () => {
    // Enough seats that collisions are likely; assert the algorithm permits equals.
    const manySeats = [
      { id: 'a', nickname: 'A' },
      { id: 'b', nickname: 'B' },
      { id: 'c', nickname: 'C' },
      { id: 'd', nickname: 'D' },
    ] as const;

    let sawDuplicate = false;

    for (let attempt = 0; attempt < 40; attempt += 1) {
      const state = createInitialState({ seats: manySeats, seed: `dup-${attempt}` });
      const kits = state.players.map((player) => player.kitId);
      if (new Set(kits).size < kits.length) {
        sawDuplicate = true;
        break;
      }
    }

    expect(sawDuplicate).toBe(true);
  });

  it('produces a stable deal for the same seed (kit and card ids)', () => {
    const first = createInitialState({ seats, seed: 'order-seed' });
    const second = createInitialState({ seats, seed: 'order-seed' });

    expect(second.players.map((player) => player.id)).toEqual(
      first.players.map((player) => player.id),
    );
    expect(second.players.map((player) => player.kitId)).toEqual(
      first.players.map((player) => player.kitId),
    );
    expect(
      second.players.map((player) => player.hand.map((card) => card.cardId)),
    ).toEqual(first.players.map((player) => player.hand.map((card) => card.cardId)));
    expect(second.currentTurnPlayerId).toBe(first.currentTurnPlayerId);
  });

  it('uses the shuffled order as turn order, starting with the first seat', () => {
    const rng = createRng('order-seed');
    const expectedOrder = rng.shuffle([...seats]).map((seat) => seat.id);
    const state = createInitialState({ seats, seed: 'order-seed' });

    expect(state.players.map((player) => player.id)).toEqual(expectedOrder);
    expect(state.currentTurnPlayerId).toBe(expectedOrder[0]);
  });

  it('rejects fewer than two seats', () => {
    expect(() => createInitialState({ seats: [{ id: 'a', nickname: 'Solo' }] })).toThrow(
      RangeError,
    );
  });

  it('Scientific starting Spies arrive already upgraded', () => {
    let scientific:
      | ReturnType<typeof createInitialState>['players'][number]
      | undefined;

    for (let attempt = 0; attempt < 200; attempt += 1) {
      const state = createInitialState({ seats, seed: `sci-start-${attempt}` });
      scientific = state.players.find(
        (player) =>
          player.kitId === 'scientific' &&
          player.hand.some((card) => card.cardId === 'spy'),
      );
      if (scientific !== undefined) {
        break;
      }
    }

    expect(scientific).toBeDefined();
    if (scientific === undefined) {
      return;
    }

    const spies = scientific.hand.filter((entry) => entry.cardId === 'spy');
    expect(spies.length).toBeGreaterThan(0);
    for (const card of spies) {
      expect(card.isUpgraded).toBe(true);
    }
  });
});

describe('createInitialState kitAssignment (L18-02)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
    { id: 'c', nickname: 'Carol' },
    { id: 'd', nickname: 'Dave' },
  ] as const;

  it('binds kits to input seat ids before shuffle', () => {
    const assignment = [
      'assassin',
      'kamikaze',
      'scientific',
      'untouchable',
    ] as const;
    const state = createInitialState({
      seats,
      seed: 'forced-kits-shuffle',
      kitAssignment: assignment,
    });

    for (const [index, seat] of seats.entries()) {
      const player = state.players.find((entry) => entry.id === seat.id);
      expect(player?.kitId).toBe(assignment[index]);
    }

    // Turn order may differ from input order.
    expect(state.players.map((player) => player.id)).not.toEqual(seats.map((seat) => seat.id));
  });

  it('omitting kitAssignment matches random draw bit-for-bit for a seed', () => {
    const first = createInitialState({ seats, seed: 'omit-kits-parity' });
    const second = createInitialState({ seats, seed: 'omit-kits-parity' });

    const byId = (state: ReturnType<typeof createInitialState>) =>
      Object.fromEntries(
        state.players.map((player) => [
          player.id,
          {
            kitId: player.kitId,
            hand: player.hand.map((card) => card.cardId),
            specials: player.specialCards.map((card) => card.cardId),
          },
        ]),
      );

    expect(byId(second)).toEqual(byId(first));
  });

  it('rejects kitAssignment length mismatch', () => {
    expect(() =>
      createInitialState({
        seats: [
          { id: 'a', nickname: 'A' },
          { id: 'b', nickname: 'B' },
        ],
        kitAssignment: ['assassin'],
      }),
    ).toThrow(RangeError);
  });
});

describe('createInitialState forcedKitsBySeatId (L49-01)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('binds a lobby pick to that seat and leaves the other random', () => {
    const state = createInitialState({
      seats,
      seed: 'lobby-pick-seed',
      forcedKitsBySeatId: new Map([['a', 'assassin']]),
    });

    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');
    expect(alice?.kitId).toBe('assassin');
    expect(bob).toBeDefined();
    expect(KIT_IDS).toContain(bob?.kitId);
  });

  it('omitting forcedKitsBySeatId matches a fully random deal for a seed', () => {
    const first = createInitialState({ seats, seed: 'lobby-omit-parity' });
    const second = createInitialState({ seats, seed: 'lobby-omit-parity' });
    expect(second.players.map((player) => player.kitId)).toEqual(
      first.players.map((player) => player.kitId),
    );
  });
});
