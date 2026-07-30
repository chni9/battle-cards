/**
 * Per-recipient view construction — technical spec §5.1, AGENTS golden rule 4.
 *
 * One function, one recipient. No "full view" builder to filter down from.
 */

import type {
  ActionLogEntryView,
  FinishedStateView,
  GameState,
  LobbySeatView,
  LobbyStateView,
  PendingEffectView,
  PlayingStateView,
  PrivateSelfView,
  PublicPlayerView,
  SpiedPlayerView,
} from '@card-battle/shared';

import { findSpyRelation } from './visibility-matrix';

export interface LobbyViewInput {
  recipientSessionId: string;
  gameCode: string;
  hostPlayerId: string;
  seats: readonly LobbySeatView[];
}

export function buildLobbyViewFor(input: LobbyViewInput): LobbyStateView {
  const { recipientSessionId, gameCode, hostPlayerId, seats } = input;

  if (!seats.some((seat) => seat.id === recipientSessionId)) {
    throw new Error(`Cannot build a view for ${recipientSessionId}: not in the room`);
  }

  return {
    phase: 'lobby',
    you: recipientSessionId,
    gameCode,
    hostPlayerId,
    players: seats.map((seat) => ({ id: seat.id, nickname: seat.nickname })),
  };
}

export interface PlayingViewInput {
  recipientSessionId: string;
  gameCode: string;
  state: GameState;
  turnDeadlineMs: number | null;
  actionLog: readonly ActionLogEntryView[];
}

function buildSpiedView(
  state: GameState,
  recipientSessionId: string,
  subject: GameState['players'][number],
): SpiedPlayerView | undefined {
  if (subject.id === recipientSessionId) {
    return undefined;
  }

  const relation = findSpyRelation(state, recipientSessionId, subject.id);

  if (relation === undefined) {
    return undefined;
  }

  const spied: SpiedPlayerView = {
    kitId: subject.kitId,
    hand: subject.hand.map((card) => ({ ...card })),
    specialCards: subject.specialCards.map((card) => ({ ...card })),
  };

  if (relation.level === 'full-resources') {
    spied.points = subject.points;
    spied.upgradePoints = subject.upgradePoints;
  }

  return spied;
}

export function buildPlayingViewFor(input: PlayingViewInput): PlayingStateView {
  const { recipientSessionId, gameCode, state, turnDeadlineMs, actionLog } = input;
  const selfPlayer = state.players.find((player) => player.id === recipientSessionId);

  if (selfPlayer === undefined) {
    throw new Error(`Cannot build a view for ${recipientSessionId}: not in the room`);
  }

  const pendingEffects: PendingEffectView[] = state.players.flatMap((player) =>
    player.pendingEffects.map((effect) => ({
      id: effect.id,
      sourcePlayerId: effect.sourcePlayerId,
      targetPlayerId: effect.targetPlayerId,
      cardId: effect.cardId,
      isUpgraded: effect.isUpgraded,
      queuedAt: effect.queuedAt,
    })),
  );

  const players: PublicPlayerView[] = state.players.map((player) => {
    const spied = buildSpiedView(state, recipientSessionId, player);
    return {
      id: player.id,
      nickname: player.nickname,
      lives: player.lives,
      shield: player.shield,
      shieldIsUpgraded: player.shieldIsUpgraded,
      cardCount: player.hand.length + player.specialCards.length,
      isEliminated: player.isEliminated,
      isYou: player.id === recipientSessionId,
      ...(spied !== undefined ? { spied } : {}),
    };
  });

  const self: PrivateSelfView = {
    points: selfPlayer.points,
    upgradePoints: selfPlayer.upgradePoints,
    kitId: selfPlayer.kitId,
    hand: selfPlayer.hand.map((card) => ({ ...card })),
    specialCards: selfPlayer.specialCards.map((card) => ({ ...card })),
  };

  return {
    phase: 'playing',
    you: recipientSessionId,
    gameCode,
    currentTurnPlayerId: state.currentTurnPlayerId,
    turnSequence: state.turnSequence,
    turnOrder: state.players.map((player) => player.id),
    turnDeadlineMs,
    players,
    self,
    pendingEffects,
    actionLog: [...actionLog],
  };
}

export interface FinishedViewInput {
  recipientSessionId: string;
  gameCode: string;
  state: GameState;
  winnerPlayerId: string;
}

export function buildFinishedViewFor(input: FinishedViewInput): FinishedStateView {
  const { recipientSessionId, gameCode, state, winnerPlayerId } = input;

  if (!state.players.some((player) => player.id === recipientSessionId)) {
    throw new Error(`Cannot build a view for ${recipientSessionId}: not in the room`);
  }

  return {
    phase: 'finished',
    you: recipientSessionId,
    gameCode,
    winnerPlayerId,
    players: state.players.map((player) => ({
      id: player.id,
      nickname: player.nickname,
      lives: player.lives,
      shield: player.shield,
      shieldIsUpgraded: player.shieldIsUpgraded,
      cardCount: player.hand.length + player.specialCards.length,
      isEliminated: player.isEliminated,
      isYou: player.id === recipientSessionId,
    })),
  };
}
