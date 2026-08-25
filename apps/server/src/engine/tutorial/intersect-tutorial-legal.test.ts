import { TUTORIAL_LAST_INDEX, tutorialStepAt } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { findPlayer } from '../turn/advance-turn';
import {
  bootTutorialHarness,
  playTutorialIndex,
  playTutorialThrough,
  tutorialActorId,
  tutorialLegalAt,
} from './tutorial-script-harness';
import { isTutorialActionAllowed } from './intersect-tutorial-legal';

describe('tutorial script filter (L45-03 / technical spec v6 §5.4)', () => {
  it.each(Array.from({ length: TUTORIAL_LAST_INDEX + 1 }, (_, index) => index))(
    'index %i allows only the scripted kind',
    (index) => {
      const harness = bootTutorialHarness(`tutorial-index-${String(index)}`);
      playTutorialThrough(harness, index - 1);
      expect(harness.state.currentTurnPlayerId).toBe(tutorialActorId(harness, index));
      const legal = tutorialLegalAt(harness, index);
      expect(legal.length).toBeGreaterThan(0);
      expect(legal.some((action) => action.type === 'buyCard' && action.cardId === 'basic-attack')).toBe(
        false,
      );

      if (index === 3) {
        const actor = findPlayer(harness.state, tutorialActorId(harness, index));
        expect(
          legal.every((action) => {
            if (action.type !== 'playCard') {
              return true;
            }
            const card = actor?.hand.find((held) => held.instanceId === action.instanceId);
            return card?.cardId === 'basic-attack' && !card.isUpgraded;
          }),
        ).toBe(true);
      }

      const result = playTutorialIndex(harness);
      expect(result.ok).toBe(true);
    },
  );

  it('rejects a non-scripted action at index 0 without consuming the turn', () => {
    const harness = bootTutorialHarness('tutorial-reject-draw');
    const actorId = tutorialActorId(harness, 0);
    const tax = harness.state.players[0]?.hand.find((card) => card.cardId === 'tax');
    expect(tax).toBeDefined();
    if (tax === undefined) {
      return;
    }
    expect(
      isTutorialActionAllowed(harness.state, actorId, 0, {
        type: 'playCard',
        instanceId: tax.instanceId,
      }),
    ).toBe(false);
    expect(harness.state.currentTurnPlayerId).toBe(actorId);
  });

  it('keeps bot lives at 4 after the equal Basic cancel (indices 3–4)', () => {
    const harness = bootTutorialHarness('tutorial-cancel-lives');
    playTutorialThrough(harness, 4);
    const bot = findPlayer(harness.state, harness.seats.botId);
    expect(bot?.lives).toBe(4);
  });

  it('leaves the human at 1 life after Strong resolves (index 17)', () => {
    const harness = bootTutorialHarness('tutorial-strong-hit');
    playTutorialThrough(harness, 17);
    const human = findPlayer(harness.state, harness.seats.humanId);
    expect(human?.lives).toBe(1);
  });

  it('grants 4 points from the second base Tax (index 21)', () => {
    const harness = bootTutorialHarness('tutorial-second-tax');
    playTutorialThrough(harness, 20);
    const before = findPlayer(harness.state, harness.seats.humanId)?.points ?? 0;
    const result = playTutorialIndex(harness);
    expect(result.ok).toBe(true);
    const after = findPlayer(harness.state, harness.seats.humanId)?.points ?? 0;
    expect(after - before).toBe(4);
    const tax = findPlayer(harness.state, harness.seats.humanId)?.hand.find(
      (card) => card.cardId === 'tax',
    );
    expect(tax?.isUpgraded).toBe(false);
  });

  it('drops the bot to 1 life after Basic+ hits (index 26)', () => {
    const harness = bootTutorialHarness('tutorial-bot-to-one');
    playTutorialThrough(harness, 26);
    const bot = findPlayer(harness.state, harness.seats.botId);
    expect(bot?.lives).toBe(1);
  });

  it('makes the human the winner after index 30', () => {
    const harness = bootTutorialHarness('tutorial-human-wins');
    playTutorialThrough(harness, 30);
    const bot = findPlayer(harness.state, harness.seats.botId);
    const human = findPlayer(harness.state, harness.seats.humanId);
    expect(bot?.isEliminated).toBe(true);
    expect(human?.isEliminated).toBe(false);
  });
});

describe('tutorialStepAt coverage (L45-03)', () => {
  it('script still names every index the filter tests', () => {
    for (let index = 0; index <= TUTORIAL_LAST_INDEX; index += 1) {
      expect(tutorialStepAt(index)?.index).toBe(index);
    }
  });
});
