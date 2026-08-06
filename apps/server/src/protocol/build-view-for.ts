/**
 * Per-recipient view construction — technical spec §5.1, AGENTS golden rule 4.
 *
 * One function, one recipient. No "full view" builder to filter down from.
 *
 * Spy (2026-07-30 resources ruling): kit + card lists always; base adds frozen
 * full-resource snapshot; upgraded adds live lives/points/UP/shield (rules §3).
 *
 * Server-only fields omitted from every view (never defaulted; classified here):
 * - `GameState.seed`
 * - `GameState.nextPoolInstanceSeq` (technical spec v4 §5.1)
 * - sub-choice slot/queue (unicast events, not StateView)
 */

import type {
  ActionLogEntryView,
  BotDifficulty,
  EliminationRevealView,
  ExportTurnRowView,
  FinishedStateView,
  GameExportLogView,
  GameRecapView,
  GameState,
  LobbySeatView,
  LobbyStateView,
  PendingEffectView,
  PersistentEffectView,
  PlayingStateView,
  PrivateSelfView,
  PublicPlayerView,
  SpiedPlayerView,
} from '@card-battle/shared';

import { aggregateActionsForPlayer } from '../db/aggregate-action-log';
import type { FinishedGameEliminationRecord } from '../db/finished-game-types';
import { findSpyRelation } from './visibility-matrix';

function mapPersistentEffects(
  effects: GameState['players'][number]['activePersistentEffects'],
): PersistentEffectView[] {
  return effects.map((effect) => ({
    id: effect.id,
    cardId: effect.cardId,
    isUpgraded: effect.isUpgraded,
    counter: effect.counter,
    targetPlayerId: effect.targetPlayerId,
  }));
}

function buildEliminationReveal(
  player: GameState['players'][number],
): EliminationRevealView | undefined {
  const snapshot = player.eliminationSnapshot;

  if (!player.isEliminated || snapshot === null) {
    return undefined;
  }

  return {
    kitId: snapshot.kitId,
    hand: snapshot.hand.map((card) => ({ ...card })),
    specialCards: snapshot.specialCards.map((card) => ({ ...card })),
    lives: snapshot.lives,
    points: snapshot.points,
    upgradePoints: snapshot.upgradePoints,
    shield: snapshot.shield,
    shieldIsUpgraded: snapshot.shieldIsUpgraded,
    turnSequence: snapshot.turnSequence,
  };
}

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
    players: seats.map((seat) => {
      const view: LobbySeatView = {
        id: seat.id,
        nickname: seat.nickname,
        isBot: seat.isBot,
      };

      if (seat.botDifficulty !== undefined) {
        view.botDifficulty = seat.botDifficulty;
      }

      return view;
    }),
  };
}

export interface PlayingViewInput {
  recipientSessionId: string;
  gameCode: string;
  state: GameState;
  turnDeadlineMs: number | null;
  actionLog: readonly ActionLogEntryView[];
  /** Bot seat difficulties keyed by player id — from room seats, not GameState. */
  botDifficulties?: ReadonlyMap<string, BotDifficulty>;
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
    spied.lives = subject.lives;
    spied.points = subject.points;
    spied.upgradePoints = subject.upgradePoints;
    spied.shield = subject.shield;
  } else if (relation.resourcesSnapshot !== undefined) {
    spied.resourcesSnapshot = { ...relation.resourcesSnapshot };
  }

  return spied;
}

/**
 * Per-recipient action-log redaction (designer 2026-08-06):
 * - `activateDuplication` → opaque `draw` unless self or Spy on the actor
 * - `playerReanimated.kitId` omitted unless self or Spy on the revived seat
 * Excel `exportLog` keeps the full server log.
 */
function mapActionLogForRecipient(
  actionLog: readonly ActionLogEntryView[],
  recipientSessionId: string,
  state: GameState,
): ActionLogEntryView[] {
  return actionLog.map((entry) => {
    if (entry.kind === 'actionPlayed' && entry.action === 'activateDuplication') {
      if (entry.actorPlayerId === recipientSessionId) {
        return entry;
      }

      if (findSpyRelation(state, recipientSessionId, entry.actorPlayerId) !== undefined) {
        return entry;
      }

      const opaque: ActionLogEntryView = {
        kind: 'actionPlayed',
        actorPlayerId: entry.actorPlayerId,
        action: 'draw',
        turnSequence: entry.turnSequence,
      };

      if (entry.botReason !== undefined) {
        return { ...opaque, botReason: entry.botReason };
      }

      return opaque;
    }

    if (entry.kind === 'playerReanimated') {
      if (entry.playerId === recipientSessionId) {
        return entry;
      }

      if (findSpyRelation(state, recipientSessionId, entry.playerId) !== undefined) {
        return entry;
      }

      return {
        kind: 'playerReanimated',
        playerId: entry.playerId,
        turnSequence: entry.turnSequence,
      };
    }

    return entry;
  });
}

/** Duplicator window: self and Spy recipients only (designer 2026-08-06). */
function duplicationActiveForRecipient(
  player: GameState['players'][number],
  recipientSessionId: string,
  spied: SpiedPlayerView | undefined,
): boolean {
  if (player.id === recipientSessionId || spied !== undefined) {
    return player.duplicationActive;
  }

  return false;
}

export function buildPlayingViewFor(input: PlayingViewInput): PlayingStateView {
  const { recipientSessionId, gameCode, state, turnDeadlineMs, actionLog, botDifficulties } =
    input;
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
      damageMultiplier: effect.damageMultiplier,
      redirectedBy: effect.redirectedBy,
    })),
  );

  const players: PublicPlayerView[] = state.players.map((player) => {
    const spied = buildSpiedView(state, recipientSessionId, player);
    const eliminationReveal = buildEliminationReveal(player);
    const difficulty = botDifficulties?.get(player.id);
    const isBot = difficulty !== undefined;
    const view: PublicPlayerView = {
      id: player.id,
      nickname: player.nickname,
      isEliminated: player.isEliminated,
      isYou: player.id === recipientSessionId,
      isBot,
      connection: {
        status: player.connectionState.status,
        disconnectedAt: player.connectionState.disconnectedAt,
        automaticTurnsTaken: player.connectionState.automaticTurnsTaken,
        consecutiveTimeouts: player.connectionState.consecutiveTimeouts,
      },
      activePersistentEffects: mapPersistentEffects(player.activePersistentEffects),
      activeShield:
        player.shield > 0 ? { isUpgraded: player.shieldIsUpgraded } : null,
      blockTurnsRemaining: player.blockTurnsRemaining,
      blockAttacksForbidden: player.blockAttacksForbidden,
      activeAttackBlock: player.attackBlockCharges > 0 ? true : null,
      duplicationActive: duplicationActiveForRecipient(
        player,
        recipientSessionId,
        spied,
      ),
      pendingReanimation:
        player.pendingReanimation === null
          ? null
          : { isUpgraded: player.pendingReanimation.isUpgraded },
    };

    if (difficulty !== undefined) {
      view.botDifficulty = difficulty;
    }

    if (spied !== undefined) {
      view.spied = spied;
    }

    if (eliminationReveal !== undefined) {
      view.eliminationReveal = eliminationReveal;
    }

    return view;
  });

  const self: PrivateSelfView = {
    lives: selfPlayer.lives,
    shield: selfPlayer.shield,
    shieldIsUpgraded: selfPlayer.shieldIsUpgraded,
    points: selfPlayer.points,
    upgradePoints: selfPlayer.upgradePoints,
    kitId: selfPlayer.kitId,
    hand: selfPlayer.hand.map((card) => ({ ...card })),
    specialCards: selfPlayer.specialCards.map((card) => ({ ...card })),
    activePersistentEffects: mapPersistentEffects(selfPlayer.activePersistentEffects),
    attackBlockCharges: selfPlayer.attackBlockCharges,
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
    actionLog: mapActionLogForRecipient(actionLog, recipientSessionId, state),
    pool: state.pool.map((card) => ({ ...card })),
  };
}

export interface FinishedViewInput {
  recipientSessionId: string;
  gameCode: string;
  state: GameState;
  winnerPlayerId: string;
  actionLog: readonly ActionLogEntryView[];
  eliminations: readonly FinishedGameEliminationRecord[];
  botDifficulties?: ReadonlyMap<string, BotDifficulty>;
  /** Before/after turn snapshots for Excel — Lot 19. */
  turnHistory?: readonly ExportTurnRowView[];
}

export function buildGameRecapView(
  state: GameState,
  actionLog: readonly ActionLogEntryView[],
  eliminations: readonly FinishedGameEliminationRecord[],
): GameRecapView {
  return {
    turnSequence: state.turnSequence,
    players: state.players.map((player) => {
      const aggregates = aggregateActionsForPlayer(player.id, actionLog);

      return {
        playerId: player.id,
        cardsPlayedCount: aggregates.cardsPlayedCount,
        buyCount: aggregates.buyCount,
        sellCount: aggregates.sellCount,
        upgradeCount: aggregates.upgradeCount,
      };
    }),
    eliminations: eliminations.map((entry) => ({
      playerId: entry.playerId,
      eliminatorPlayerId: entry.eliminatorPlayerId,
      reason: entry.reason,
    })),
  };
}

export function buildFinishedViewFor(input: FinishedViewInput): FinishedStateView {
  const {
    recipientSessionId,
    gameCode,
    state,
    winnerPlayerId,
    actionLog,
    eliminations,
    botDifficulties,
    turnHistory = [],
  } = input;

  if (!state.players.some((player) => player.id === recipientSessionId)) {
    throw new Error(`Cannot build a view for ${recipientSessionId}: not in the room`);
  }

  const exportLog: GameExportLogView = {
    turns: [...turnHistory],
    events: [...actionLog],
  };

  // PROTOCOL 24 — same per-recipient visibility as playing; no turn clock.
  const finalTable = buildPlayingViewFor({
    recipientSessionId,
    gameCode,
    state,
    turnDeadlineMs: null,
    actionLog,
    ...(botDifficulties !== undefined ? { botDifficulties } : {}),
  });

  return {
    phase: 'finished',
    you: recipientSessionId,
    gameCode,
    winnerPlayerId,
    finalTable,
    players: state.players.map((player) => {
      const difficulty = botDifficulties?.get(player.id);
      const eliminationReveal = buildEliminationReveal(player);
      const spied = buildSpiedView(state, recipientSessionId, player);
      const view: PublicPlayerView = {
        id: player.id,
        nickname: player.nickname,
        isEliminated: player.isEliminated,
        isYou: player.id === recipientSessionId,
        isBot: difficulty !== undefined,
        connection: {
          status: player.connectionState.status,
          disconnectedAt: player.connectionState.disconnectedAt,
          automaticTurnsTaken: player.connectionState.automaticTurnsTaken,
          consecutiveTimeouts: player.connectionState.consecutiveTimeouts,
        },
        activePersistentEffects: mapPersistentEffects(player.activePersistentEffects),
        activeShield:
          player.shield > 0 ? { isUpgraded: player.shieldIsUpgraded } : null,
        blockTurnsRemaining: player.blockTurnsRemaining,
        blockAttacksForbidden: player.blockAttacksForbidden,
        activeAttackBlock: player.attackBlockCharges > 0 ? true : null,
        duplicationActive: duplicationActiveForRecipient(
          player,
          recipientSessionId,
          spied,
        ),
        pendingReanimation:
          player.pendingReanimation === null
            ? null
            : { isUpgraded: player.pendingReanimation.isUpgraded },
      };

      if (difficulty !== undefined) {
        view.botDifficulty = difficulty;
      }

      if (eliminationReveal !== undefined) {
        view.eliminationReveal = eliminationReveal;
      }

      return view;
    }),
    recap: buildGameRecapView(state, actionLog, eliminations),
    exportLog,
  };
}
