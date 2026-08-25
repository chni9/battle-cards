/**
 * Seeded tutorial walk 0–30 — L45-07 / technical spec v6 §5.3–§5.4.
 */

import { describe, expect, it } from 'vitest';

import { findPlayer } from '../turn/advance-turn';
import {
  bootTutorialHarness,
  playTutorialIndex,
  playTutorialThrough,
  tutorialLegalAt,
} from './tutorial-script-harness';

describe('tutorial script integration (L45-07 / technical spec v6 §5.4)', () => {
  it('drives indices 0–30 to a human win with the must-show beats', () => {
    const harness = bootTutorialHarness('tutorial-l45-07');
    const { humanId, botId } = harness.seats;
    const humanAt = (): NonNullable<ReturnType<typeof findPlayer>> => {
      const player = findPlayer(harness.state, humanId);
      expect(player).toBeDefined();
      if (player === undefined) {
        throw new Error('missing human');
      }
      return player;
    };
    const botAt = (): NonNullable<ReturnType<typeof findPlayer>> => {
      const player = findPlayer(harness.state, botId);
      expect(player).toBeDefined();
      if (player === undefined) {
        throw new Error('missing bot');
      }
      return player;
    };

    expect(humanAt().hand.some((card) => card.cardId === 'absorber')).toBe(false);
    const startShields = humanAt().hand.filter((card) => card.cardId === 'shield').length;
    expect(startShields).toBe(2);
    expect(humanAt().upgradePoints).toBe(1);

    playTutorialThrough(harness, 7);
    expect(
      harness.state.visibility.some(
        (relation) => relation.viewerId === humanId && relation.subjectId === botId,
      ),
    ).toBe(false);

    playTutorialIndex(harness);
    expect(harness.index).toBe(9);
    expect(
      harness.state.visibility.some(
        (relation) => relation.viewerId === humanId && relation.subjectId === botId,
      ),
    ).toBe(true);

    playTutorialThrough(harness, 9);
    expect(humanAt().hand.filter((card) => card.cardId === 'shield').length).toBe(1);

    playTutorialThrough(harness, 10);
    const incomingSpy = humanAt().pendingEffects.some((effect) => effect.cardId === 'spy');
    expect(incomingSpy).toBe(true);

    playTutorialIndex(harness);
    expect(harness.index).toBe(12);
    expect(humanAt().pendingEffects.some((effect) => effect.cardId === 'spy')).toBe(false);
    expect(
      harness.state.visibility.some(
        (relation) => relation.viewerId === botId && relation.subjectId === humanId,
      ),
    ).toBe(false);

    playTutorialThrough(harness, 12);
    const pointsBeforeUp = humanAt().points;
    const upBeforeBuy = humanAt().upgradePoints;
    playTutorialIndex(harness);
    expect(humanAt().upgradePoints).toBe(upBeforeBuy + 1);
    expect(humanAt().points).toBeLessThan(pointsBeforeUp);

    playTutorialThrough(harness, 14);
    playTutorialIndex(harness);
    expect(humanAt().hand.some((card) => card.cardId === 'absorber')).toBe(true);

    playTutorialThrough(harness, 16);
    expect(humanAt().lives).toBe(1);
    expect(humanAt().shield).toBe(0);
    playTutorialIndex(harness);
    expect(humanAt().lives).toBe(1);
    expect(humanAt().shield).toBeGreaterThan(0);

    playTutorialThrough(harness, 18);
    expect(humanAt().lives).toBe(1);
    expect(
      humanAt().specialCards.some((card) => card.cardId === 'super-regeneration'),
    ).toBe(true);
    playTutorialIndex(harness);
    expect(humanAt().lives).toBe(10);
    expect(
      humanAt().specialCards.some((card) => card.cardId === 'super-regeneration'),
    ).toBe(false);

    playTutorialThrough(harness, 20);
    const pointsBeforeTax = humanAt().points;
    playTutorialIndex(harness);
    expect(humanAt().points - pointsBeforeTax).toBe(4);
    expect(humanAt().hand.find((card) => card.cardId === 'tax')?.isUpgraded).toBe(false);

    playTutorialThrough(harness, 25);
    expect(botAt().lives).toBe(4);
    playTutorialIndex(harness);
    expect(botAt().lives).toBe(1);

    const livesBeforeAbsorber = humanAt().lives;
    expect(humanAt().hand.some((card) => card.cardId === 'absorber')).toBe(true);
    playTutorialIndex(harness);
    expect(humanAt().lives).toBe(livesBeforeAbsorber + 3);
    expect(humanAt().hand.some((card) => card.cardId === 'absorber')).toBe(true);

    const last = playTutorialThroughToEnd(harness);
    if (!last.ok) {
      throw new Error(`tutorial finish rejected: ${last.code}`);
    }
    expect(last.winnerPlayerId).toBe(humanId);
    expect(botAt().isEliminated).toBe(true);
    expect(humanAt().isEliminated).toBe(false);
    expect(humanAt().hand.filter((card) => card.cardId === 'basic-attack')).toHaveLength(1);

    for (const player of harness.state.players) {
      expect(player.lives).toBeLessThanOrEqual(harness.state.lifeLimit);
    }
  });

  it('never lists buying Basic and never calls Math.random', () => {
    const random = Math.random;
    let randomCalls = 0;
    Math.random = () => {
      randomCalls += 1;
      return random();
    };

    try {
      const harness = bootTutorialHarness('tutorial-l45-07-no-random');
      while (harness.index <= 30) {
        const legal = tutorialLegalAt(harness);
        expect(
          legal.some((action) => action.type === 'buyCard' && action.cardId === 'basic-attack'),
        ).toBe(false);
        const result = playTutorialIndex(harness);
        expect(result.ok).toBe(true);
      }
      expect(randomCalls).toBe(0);
    } finally {
      Math.random = random;
    }
  });
});

function playTutorialThroughToEnd(
  harness: ReturnType<typeof bootTutorialHarness>,
): ReturnType<typeof playTutorialIndex> {
  let last: ReturnType<typeof playTutorialIndex> | undefined;
  while (harness.index <= 30) {
    last = playTutorialIndex(harness);
    if (!last.ok) {
      throw new Error(`tutorial step rejected: ${last.code}`);
    }
  }
  if (last === undefined) {
    throw new Error('empty walk');
  }
  return last;
}
