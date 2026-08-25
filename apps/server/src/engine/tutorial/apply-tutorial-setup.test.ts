import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  TUTORIAL_BOT_HAND_CARD_IDS,
  TUTORIAL_BOT_KIT_ID,
  TUTORIAL_BOT_LIVES,
  TUTORIAL_BOT_POINTS,
  TUTORIAL_HUMAN_HAND_CARD_IDS,
  TUTORIAL_HUMAN_KIT_ID,
  TUTORIAL_HUMAN_LIVES,
  TUTORIAL_HUMAN_POINTS,
  TUTORIAL_HUMAN_SPECIAL_CARD_IDS,
  TUTORIAL_HUMAN_UPGRADE_POINTS,
} from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { applyTutorialSetup } from './apply-tutorial-setup';

const seats = [
  { id: 'a', nickname: 'Alice' },
  { id: 'b', nickname: 'Bob' },
] as const;

function snapshotDeal(seed: string) {
  const state = createInitialState({ seats, seed });
  return {
    ids: state.players.map((player) => player.id),
    kits: state.players.map((player) => player.kitId),
    hands: state.players.map((player) => player.hand.map((card) => card.cardId)),
    specials: state.players.map((player) => player.specialCards.map((card) => card.cardId)),
    lives: state.players.map((player) => player.lives),
    points: state.players.map((player) => player.points),
    current: state.currentTurnPlayerId,
  };
}

describe('applyTutorialSetup (L45-01 / technical spec v6 §5.3)', () => {
  it('leaves a fixed-seed Classic start unchanged when not called', () => {
    expect(snapshotDeal('tutorial-classic-parity')).toEqual(
      snapshotDeal('tutorial-classic-parity'),
    );
  });

  it('does not mutate a Classic deal that was never passed in', () => {
    const classic = createInitialState({ seats, seed: 'tutorial-no-leak' });
    const before = structuredClone(classic);
    const tutorial = createInitialState({ seats, seed: 'tutorial-no-leak' });
    applyTutorialSetup(tutorial, { humanId: 'a', botId: 'b' });
    expect(classic).toEqual(before);
    expect(snapshotDeal('tutorial-no-leak')).toEqual({
      ids: classic.players.map((player) => player.id),
      kits: classic.players.map((player) => player.kitId),
      hands: classic.players.map((player) => player.hand.map((card) => card.cardId)),
      specials: classic.players.map((player) =>
        player.specialCards.map((card) => card.cardId),
      ),
      lives: classic.players.map((player) => player.lives),
      points: classic.players.map((player) => player.points),
      current: classic.currentTurnPlayerId,
    });
  });

  it('matches the designer 2026-08-25 loadout and forces human first', () => {
    const state = createInitialState({ seats, seed: 'tutorial-loadout' });
    applyTutorialSetup(state, { humanId: 'a', botId: 'b' });

    expect(state.players.map((player) => player.id)).toEqual(['a', 'b']);
    expect(state.currentTurnPlayerId).toBe('a');

    const human = state.players[0];
    const bot = state.players[1];
    expect(human).toBeDefined();
    expect(bot).toBeDefined();
    if (human === undefined || bot === undefined) {
      return;
    }

    expect(human.nickname).toBe('Alice');
    expect(human.kitId).toBe(TUTORIAL_HUMAN_KIT_ID);
    expect(human.lives).toBe(TUTORIAL_HUMAN_LIVES);
    expect(human.points).toBe(TUTORIAL_HUMAN_POINTS);
    expect(human.upgradePoints).toBe(TUTORIAL_HUMAN_UPGRADE_POINTS);
    expect(human.hand.map((card) => card.cardId)).toEqual([...TUTORIAL_HUMAN_HAND_CARD_IDS]);
    expect(human.specialCards.map((card) => card.cardId)).toEqual([
      ...TUTORIAL_HUMAN_SPECIAL_CARD_IDS,
    ]);
    const tax = human.hand.find((card) => card.cardId === 'tax');
    expect(tax?.isUpgraded).toBe(false);
    expect(human.hand.filter((card) => card.cardId === 'basic-attack')).toHaveLength(1);
    expect(human.hand.filter((card) => card.cardId === 'shield')).toHaveLength(2);
    expect(human.hand.some((card) => card.cardId === 'absorber')).toBe(false);
    expect(human.shield).toBe(0);

    expect(bot.kitId).toBe(TUTORIAL_BOT_KIT_ID);
    expect(bot.lives).toBe(TUTORIAL_BOT_LIVES);
    expect(bot.points).toBe(TUTORIAL_BOT_POINTS);
    expect(bot.specialCards).toEqual([]);
    expect(bot.hand.map((card) => card.cardId)).toEqual([...TUTORIAL_BOT_HAND_CARD_IDS]);
  });

  it('is not imported from the simulator default path', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const runGame = readFileSync(join(here, '../../simulation/run-game.ts'), 'utf8');
    expect(runGame).not.toMatch(/applyTutorialSetup/);
  });
});
