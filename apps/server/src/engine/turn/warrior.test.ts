/**
 * Warrior kit — rules spec §4, #V4-26 / #V4-37, backlog L27-06.
 */

import { getKit } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { buyCard } from '../economy/buy-card';
import { createInitialState } from '../create-initial-state';
import { acquireSpecialCard } from '../kits/acquire-card';

describe('Warrior kit (L27-06 / #V4-26 / #V4-37)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('matches §8.2 catalog — shared attacks alwaysUpgraded, Card Absorber', () => {
    const kit = getKit('warrior');
    expect(kit.startingResources).toEqual({
      lives: 10,
      points: 0,
      upgradePoints: 0,
      draw: 1,
    });
    expect(kit.startingCardCounts).toEqual({ action: 3, attack: 3 });
    expect(kit.traits.alwaysUpgraded).toEqual([
      'basic-attack',
      'strong-attack',
      'super-attack',
    ]);
    expect(kit.specialCards).toEqual(['card-absorber']);

    const state = createInitialState({
      seats,
      seed: 'warrior-catalog',
      kitAssignment: ['warrior', 'kamikaze'],
    });
    const player = state.players.find((p) => p.kitId === 'warrior');
    expect(player).toBeDefined();
    if (player === undefined) {
      return;
    }

    expect(player.specialCards.map((c) => c.cardId)).toEqual(['card-absorber']);
    const attacks = player.hand.filter(
      (c) =>
        c.cardId === 'basic-attack' ||
        c.cardId === 'strong-attack' ||
        c.cardId === 'super-attack',
    );
    expect(attacks.length).toBe(3);
    expect(attacks.every((c) => c.isUpgraded)).toBe(true);
  });

  it('Super attack bought mid-game arrives upgraded without consuming an upgrade point', () => {
    const state = createInitialState({
      seats,
      seed: 'warrior-super-buy',
      kitAssignment: ['warrior', 'kamikaze'],
    });
    const actor = state.players.find((p) => p.kitId === 'warrior');
    expect(actor).toBeDefined();
    if (actor === undefined) {
      return;
    }

    actor.points = 50;
    actor.upgradePoints = 3;
    actor.hand = [];

    const upBefore = actor.upgradePoints;
    const bought = buyCard(state, actor.id, 'super-attack');
    expect(bought.ok).toBe(true);
    if (!bought.ok) {
      return;
    }

    expect(bought.instance.isUpgraded).toBe(true);
    expect(actor.upgradePoints).toBe(upBefore);
  });

  it('MEGA ATTACK acquisition is NOT auto-upgraded (#V4-37)', () => {
    const state = createInitialState({
      seats,
      seed: 'warrior-mega',
      kitAssignment: ['warrior', 'kamikaze'],
    });
    const actor = state.players.find((p) => p.kitId === 'warrior');
    expect(actor).toBeDefined();
    if (actor === undefined) {
      return;
    }

    actor.upgradePoints = 2;
    const upBefore = actor.upgradePoints;
    const mega = acquireSpecialCard(actor, 'mega-attack', 'mega-1');
    expect(mega.isUpgraded).toBe(false);
    expect(actor.upgradePoints).toBe(upBefore);
    expect(getKit('warrior').traits.alwaysUpgraded).not.toContain('mega-attack');
  });

  it('Cloning onto Warrior does not retro-upgrade existing attacks (#V4-26)', () => {
    const state = createInitialState({
      seats,
      seed: 'warrior-clone-onto',
      kitAssignment: ['untouchable', 'warrior'],
    });
    const actor = state.players.find((p) => p.kitId === 'untouchable');
    expect(actor).toBeDefined();
    if (actor === undefined) {
      return;
    }

    actor.hand = [
      { instanceId: 'atk-plain', cardId: 'super-attack', isUpgraded: false },
    ];
    actor.upgradePoints = 0;

    // Cloning mutates kitId; alwaysUpgraded is acquisition-time only.
    actor.kitId = 'warrior';
    expect(actor.hand[0]?.isUpgraded).toBe(false);

    // A new acquisition after the clone *does* upgrade.
    actor.points = 50;
    const bought = buyCard(state, actor.id, 'basic-attack');
    expect(bought.ok).toBe(true);
    if (!bought.ok) {
      return;
    }
    expect(bought.instance.isUpgraded).toBe(true);
    expect(actor.hand.find((c) => c.instanceId === 'atk-plain')?.isUpgraded).toBe(false);
  });

  it('Warrior cloning another kit keeps already-upgraded attacks (#V4-26)', () => {
    const state = createInitialState({
      seats,
      seed: 'warrior-clone-away',
      kitAssignment: ['warrior', 'untouchable'],
    });
    const actor = state.players.find((p) => p.kitId === 'warrior');
    expect(actor).toBeDefined();
    if (actor === undefined) {
      return;
    }

    actor.hand = [
      { instanceId: 'atk-up', cardId: 'super-attack', isUpgraded: true },
    ];

    actor.kitId = 'untouchable';
    expect(actor.hand[0]?.isUpgraded).toBe(true);

    // New shared attack after leaving Warrior is NOT auto-upgraded.
    actor.points = 50;
    const bought = buyCard(state, actor.id, 'basic-attack');
    expect(bought.ok).toBe(true);
    if (!bought.ok) {
      return;
    }
    expect(bought.instance.isUpgraded).toBe(false);
    expect(actor.hand.find((c) => c.instanceId === 'atk-up')?.isUpgraded).toBe(true);
  });
});
