/**
 * Tutorial seat override after Classic deal — technical spec v6 §5.3 /
 * designer 2026-08-25 (L45-01).
 *
 * Called only from the room when `playKind === 'tutorial'`, after
 * `createInitialState` and before the first action. Do not import from
 * the simulator default path.
 *
 * Tax is minted via Indestructible `alwaysUpgraded`, then forced base
 * (`isUpgraded === false`) so the lesson is +4 points (rules spec §3), not +6.
 */

import {
  TUTORIAL_BOT_HAND_CARD_IDS,
  TUTORIAL_BOT_KIT_ID,
  TUTORIAL_BOT_LIVES,
  TUTORIAL_BOT_POINTS,
  TUTORIAL_BOT_SPECIAL_CARD_IDS,
  TUTORIAL_BOT_UPGRADE_POINTS,
  TUTORIAL_HUMAN_HAND_CARD_IDS,
  TUTORIAL_HUMAN_KIT_ID,
  TUTORIAL_HUMAN_LIVES,
  TUTORIAL_HUMAN_POINTS,
  TUTORIAL_HUMAN_SPECIAL_CARD_IDS,
  TUTORIAL_HUMAN_UPGRADE_POINTS,
  type CardId,
  type GameState,
  type Player,
} from '@card-battle/shared';

import { acquireCardToHand, acquireSpecialCard } from '../kits/acquire-card';

export interface TutorialSeatIds {
  humanId: string;
  botId: string;
}

export function applyTutorialSetup(state: GameState, seats: TutorialSeatIds): void {
  if (seats.humanId === seats.botId) {
    throw new RangeError('applyTutorialSetup needs two distinct seat ids');
  }

  const human = findSeat(state, seats.humanId);
  const bot = findSeat(state, seats.botId);

  overlaySeat(human, {
    kitId: TUTORIAL_HUMAN_KIT_ID,
    lives: TUTORIAL_HUMAN_LIVES,
    points: TUTORIAL_HUMAN_POINTS,
    upgradePoints: TUTORIAL_HUMAN_UPGRADE_POINTS,
    handIds: TUTORIAL_HUMAN_HAND_CARD_IDS,
    specialIds: TUTORIAL_HUMAN_SPECIAL_CARD_IDS,
    forceTaxBase: true,
  });
  overlaySeat(bot, {
    kitId: TUTORIAL_BOT_KIT_ID,
    lives: TUTORIAL_BOT_LIVES,
    points: TUTORIAL_BOT_POINTS,
    upgradePoints: TUTORIAL_BOT_UPGRADE_POINTS,
    handIds: TUTORIAL_BOT_HAND_CARD_IDS,
    specialIds: TUTORIAL_BOT_SPECIAL_CARD_IDS,
    forceTaxBase: false,
  });

  state.players = [human, bot];
  state.currentTurnPlayerId = human.id;
  state.visibility = [];
  state.pool = [];
}

function findSeat(state: GameState, playerId: string): Player {
  const player = state.players.find((entry) => entry.id === playerId);

  if (player === undefined) {
    throw new RangeError(`applyTutorialSetup: unknown seat ${playerId}`);
  }

  return player;
}

function overlaySeat(
  player: Player,
  spec: {
    kitId: Player['kitId'];
    lives: number;
    points: number;
    upgradePoints: number;
    handIds: readonly CardId[];
    specialIds: readonly CardId[];
    forceTaxBase: boolean;
  },
): void {
  player.kitId = spec.kitId;
  player.lives = spec.lives;
  player.points = spec.points;
  player.upgradePoints = spec.upgradePoints;
  player.shield = 0;
  player.shieldIsUpgraded = false;
  player.hand = [];
  player.specialCards = [];
  player.pendingEffects = [];
  player.activePersistentEffects = [];
  player.turnLedger = {
    livesLost: 0,
    pointsSpent: 0,
    upgradePointsSpent: 0,
    pointsLostToTheft: 0,
    upgradePointsLostToTheft: 0,
  };
  player.isEliminated = false;
  player.blockTurnsRemaining = 0;
  player.blockAttacksForbidden = false;
  player.attackBlockCharges = 0;
  player.duplicationActive = false;
  player.eliminationSnapshot = null;
  player.pendingReanimation = null;
  player.absorbWindowPendingPlayerIds = null;

  for (const [index, cardId] of spec.handIds.entries()) {
    acquireCardToHand(player, cardId, `${player.id}:tutorial:hand:${String(index)}:${cardId}`);
  }

  for (const [index, cardId] of spec.specialIds.entries()) {
    acquireSpecialCard(
      player,
      cardId,
      `${player.id}:tutorial:special:${String(index)}:${cardId}`,
    );
  }

  if (spec.forceTaxBase) {
    for (const card of player.hand) {
      if (card.cardId === 'tax') {
        card.isUpgraded = false;
      }
    }
  }
}
