import { describe, expect, it } from 'vitest';

import type { PlayingStateView } from '@card-battle/shared';

import { createRng } from '../../engine/rng';
import type { TurnAction } from '../../engine/turn/perform-action';
import {
  TUTORIAL_SCRIPT_V6_POLICY_ID,
  pickTutorialScriptAction,
  tutorialScriptV6Policy,
} from './tutorial-script-v6';

const HUMAN = 'human';
const BOT = 'bot';

const BASIC: TurnAction = {
  type: 'playCard',
  instanceId: 'bot:basic',
  targetPlayerId: HUMAN,
};
const STRONG: TurnAction = {
  type: 'playCard',
  instanceId: 'bot:strong',
  targetPlayerId: HUMAN,
};
const SPY: TurnAction = {
  type: 'playCard',
  instanceId: 'bot:spy',
  targetPlayerId: HUMAN,
};
const THIEF: TurnAction = {
  type: 'playCard',
  instanceId: 'bot:thief',
  targetPlayerId: HUMAN,
};
const DRAW: TurnAction = { type: 'draw' };

const ACTIONS: readonly TurnAction[] = [DRAW, BASIC, STRONG, SPY, THIEF];

function viewAt(tutorialIndex: number): PlayingStateView {
  return {
    phase: 'playing',
    you: BOT,
    gameCode: 'TUTO',
    currentTurnPlayerId: BOT,
    turnSequence: tutorialIndex,
    turnOrder: [HUMAN, BOT],
    turnDeadlineMs: null,
    players: [
      {
        id: HUMAN,
        nickname: 'You',
        isEliminated: false,
        isYou: false,
        isBot: false,
        connection: {
          status: 'connected',
          disconnectedAt: null,
          automaticTurnsTaken: 0,
          consecutiveTimeouts: 0,
        },
        activePersistentEffects: [],
        activeShield: null,
        blockTurnsRemaining: 0,
        blockAttacksForbidden: false,
        activeAttackBlock: null,
        duplicationActive: false,
        pendingReanimation: null,
        absorbWindowOpen: false,
      },
      {
        id: BOT,
        nickname: 'Alpha',
        isEliminated: false,
        isYou: true,
        isBot: true,
        botDifficulty: 'easy',
        connection: {
          status: 'connected',
          disconnectedAt: null,
          automaticTurnsTaken: 0,
          consecutiveTimeouts: 0,
        },
        activePersistentEffects: [],
        activeShield: null,
        blockTurnsRemaining: 0,
        blockAttacksForbidden: false,
        activeAttackBlock: null,
        duplicationActive: false,
        pendingReanimation: null,
        absorbWindowOpen: false,
      },
    ],
    self: {
      lives: 4,
      shield: 0,
      shieldIsUpgraded: false,
      points: 16,
      upgradePoints: 0,
      kitId: 'ghost',
      hand: [
        { instanceId: 'bot:basic', cardId: 'basic-attack', isUpgraded: false },
        { instanceId: 'bot:strong', cardId: 'strong-attack', isUpgraded: false },
        { instanceId: 'bot:thief', cardId: 'thief', isUpgraded: false },
        { instanceId: 'bot:spy', cardId: 'spy', isUpgraded: false },
      ],
      specialCards: [],
      activePersistentEffects: [],
      attackBlockCharges: 0,
    },
    pendingEffects: [],
    actionLog: [],
    pool: [],
    playKind: 'tutorial',
    tutorialIndex,
  };
}

describe('tutorial-script-v6 (L45-02 / technical spec v6 §5.4)', () => {
  it('registers under tutorial-script-v6', () => {
    expect(tutorialScriptV6Policy.id).toBe(TUTORIAL_SCRIPT_V6_POLICY_ID);
  });

  it('maps bot indices to the scripted cards and otherwise Draws', () => {
    expect(pickTutorialScriptAction(viewAt(2), ACTIONS)).toEqual(BASIC);
    expect(pickTutorialScriptAction(viewAt(4), ACTIONS)).toEqual(DRAW);
    expect(pickTutorialScriptAction(viewAt(10), ACTIONS)).toEqual(SPY);
    expect(pickTutorialScriptAction(viewAt(16), ACTIONS)).toEqual(STRONG);
    expect(pickTutorialScriptAction(viewAt(18), ACTIONS)).toEqual(THIEF);
    expect(pickTutorialScriptAction(viewAt(28), ACTIONS)).toEqual(STRONG);
    expect(pickTutorialScriptAction(viewAt(30), ACTIONS)).toEqual(DRAW);
  });

  it('does not read GameState — decide uses the view and the action list', () => {
    const decision = tutorialScriptV6Policy.decide(viewAt(2), ACTIONS, createRng('t'), {
      actionLog: [],
    });
    expect(decision.action).toEqual(BASIC);
  });
});
