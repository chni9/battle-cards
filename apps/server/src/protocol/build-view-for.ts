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
 * `GameState.poolBuyCost` is public (L58-02).
 * `GameState.pendingSentences` is public (PROTOCOL_VERSION 37).
 */

import type {
  ActionLogEntryView,
  BotDifficulty,
  ClaimableSeatView,
  EliminationRevealView,
  ExportTurnRowView,
  FinishedStateView,
  GameExportLogView,
  GameRecapView,
  GameState,
  LobbyKitSelection,
  LobbySeatView,
  LobbyStateView,
  PendingEffectView,
  PersistentEffectView,
  PlayKind,
  PlayingStateView,
  PrivateSelfView,
  PublicPlayerView,
  SpiedPlayerView,
} from '@card-battle/shared';

import { aggregateActionsForPlayer } from '../db/aggregate-action-log';
import type { FinishedGameEliminationRecord } from '../db/finished-game-types';
import { isAbsorbWindowOpen } from '../engine/turn/absorb-window';
import { findSpyRelation, isEliminatedSpectator, recipientSeesPrivateOf } from './visibility-matrix';

/**
 * Type filler for walk-in spectators (L57-13). The client hides the private dock
 * when `isSpectator` is set; this is never a seated kit.
 */
const EMPTY_SPECTATOR_SELF: PrivateSelfView = {
  lives: 0,
  shield: 0,
  shieldIsUpgraded: false,
  points: 0,
  upgradePoints: 0,
  kitId: 'untouchable',
  hand: [],
  specialCards: [],
  activePersistentEffects: [],
  attackBlockCharges: 0,
};

function withSpectatorFields<T extends object>(
  view: T,
  input: {
    walkInSpectator?: boolean;
    claimableSeats?: readonly ClaimableSeatView[];
  },
): T {
  const extra: { isSpectator?: true; claimableSeats?: readonly ClaimableSeatView[] } = {};

  if (input.walkInSpectator === true) {
    extra.isSpectator = true;
  }

  if (input.claimableSeats !== undefined && input.claimableSeats.length > 0) {
    extra.claimableSeats = input.claimableSeats;
  }

  return { ...view, ...extra };
}

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
  /** Recipient's own pick only — never a map of every seat (L49-01). */
  yourKitSelection: LobbyKitSelection;
  /** Walk-in lobby watcher (L57-13). Omit for seated recipients. */
  isSpectator?: true;
  claimableSeats?: readonly ClaimableSeatView[];
}

export function buildLobbyViewFor(input: LobbyViewInput): LobbyStateView {
  const { recipientSessionId, gameCode, hostPlayerId, seats, yourKitSelection } = input;
  const walkInSpectator = input.isSpectator === true;

  if (!walkInSpectator && !seats.some((seat) => seat.id === recipientSessionId)) {
    throw new Error(`Cannot build a view for ${recipientSessionId}: not in the room`);
  }

  return withSpectatorFields(
    {
      phase: 'lobby',
      you: recipientSessionId,
      gameCode,
      hostPlayerId,
      yourKitSelection,
      players: seats.map((seat) => {
        const view: LobbySeatView = {
          id: seat.id,
          nickname: seat.nickname,
          isBot: seat.isBot,
          isReady: seat.isReady,
        };

        if (seat.botDifficulty !== undefined) {
          view.botDifficulty = seat.botDifficulty;
        }

        return view;
      }),
    },
    {
      walkInSpectator,
      ...(input.claimableSeats !== undefined ? { claimableSeats: input.claimableSeats } : {}),
    },
  );
}

export interface PlayingViewInput {
  recipientSessionId: string;
  gameCode: string;
  state: GameState;
  turnDeadlineMs: number | null;
  actionLog: readonly ActionLogEntryView[];
  /** Bot seat difficulties keyed by player id — from room seats, not GameState. */
  botDifficulties?: ReadonlyMap<string, BotDifficulty>;
  /** Room-owned overlay (technical spec v6 §8 / L41-03). Default `'classic'`. */
  playKind?: PlayKind;
  /** Room-owned overlay (technical spec v6 §8 / L41-03). Default `null`. */
  tutorialIndex?: number | null;
  /** Walk-in Classic spectator (L57-13). Identity only — overlay is `walkInSeesPrivate`. */
  walkInSpectator?: true;
  /**
   * Walk-in Spy overlay (L57-16). Omit while a claim picker is still open so
   * kits stay hidden until Stay spectating or the list empties.
   */
  walkInSeesPrivate?: true;
  claimableSeats?: readonly ClaimableSeatView[];
}

function buildSpiedView(
  state: GameState,
  recipientId: string,
  subject: GameState['players'][number],
  walkInSpectator: boolean,
): SpiedPlayerView | undefined {
  if (subject.id === recipientId) {
    return undefined;
  }

  const relation = findSpyRelation(state, recipientId, subject.id);
  const recipient = state.players.find((player) => player.id === recipientId);
  const spectatorFullVision =
    walkInSpectator || (recipient !== undefined && isEliminatedSpectator(recipient));

  if (relation === undefined && !spectatorFullVision) {
    return undefined;
  }

  const spied: SpiedPlayerView = {
    kitId: subject.kitId,
    hand: subject.hand.map((card) => ({ ...card })),
    specialCards: subject.specialCards.map((card) => ({ ...card })),
  };

  if (spectatorFullVision || relation?.level === 'full-resources') {
    spied.lives = subject.lives;
    spied.points = subject.points;
    spied.upgradePoints = subject.upgradePoints;
    spied.shield = subject.shield;
  } else if (relation?.resourcesSnapshot !== undefined) {
    spied.resourcesSnapshot = { ...relation.resourcesSnapshot };
  }

  return spied;
}

/**
 * Per-recipient action-log redaction (designer 2026-08-06):
 * - `activateDuplication` → opaque `draw` unless self, Spy, or eliminated spectator
 * - `playerReanimated.kitId` omitted unless self, Spy, or eliminated spectator
 * Excel `exportLog` keeps the full server log.
 */
function mapActionLogForRecipient(
  actionLog: readonly ActionLogEntryView[],
  recipientSessionId: string,
  state: GameState,
  walkInSpectator = false,
): ActionLogEntryView[] {
  return actionLog.map((entry) => {
    if (entry.kind === 'actionPlayed' && entry.action === 'activateDuplication') {
      if (recipientSeesPrivateOf(state, recipientSessionId, entry.actorPlayerId, walkInSpectator)) {
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
      return {
        kind: 'playerReanimated',
        playerId: entry.playerId,
        turnSequence: entry.turnSequence,
      };
    }

    return entry;
  });
}

/** Duplicator window: self, Spy, or eliminated spectator (designer 2026-08-06). */
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
  const playKind = input.playKind ?? 'classic';
  const tutorialIndex = input.tutorialIndex ?? null;
  const walkInSpectator = input.walkInSpectator === true;
  const walkInSeesPrivate = input.walkInSeesPrivate === true;
  const selfPlayer = state.players.find((player) => player.id === recipientSessionId);

  if (selfPlayer === undefined && !walkInSpectator) {
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
    const spied = buildSpiedView(state, recipientSessionId, player, walkInSeesPrivate);
    const eliminationReveal = buildEliminationReveal(player);
    const difficulty = botDifficulties?.get(player.id);
    const isBot = difficulty !== undefined;
    const view: PublicPlayerView = {
      id: player.id,
      nickname: player.nickname,
      isEliminated: player.isEliminated,
      isYou: !walkInSpectator && player.id === recipientSessionId,
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
      absorbWindowOpen: isAbsorbWindowOpen(player),
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

    if (
      player.id !== recipientSessionId &&
      !player.isEliminated &&
      findSpyRelation(state, player.id, recipientSessionId) !== undefined
    ) {
      view.spyingOnYou = true;
    }

    return view;
  });

  const self: PrivateSelfView =
    selfPlayer === undefined
      ? EMPTY_SPECTATOR_SELF
      : {
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

  return withSpectatorFields(
    {
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
      actionLog: mapActionLogForRecipient(
        actionLog,
        recipientSessionId,
        state,
        walkInSeesPrivate,
      ),
      pool: state.pool.map((card) => ({ ...card })),
      poolBuyCost: state.poolBuyCost,
      pendingSentences: state.pendingSentences.map((entry) => ({ ...entry })),
      playKind,
      tutorialIndex,
    },
    {
      walkInSpectator,
      ...(input.claimableSeats !== undefined ? { claimableSeats: input.claimableSeats } : {}),
    },
  );
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
  /** Room-owned overlay (technical spec v6 §8 / L41-03). Default `'classic'`. */
  playKind?: PlayKind;
  /** Room-owned overlay (technical spec v6 §8 / L41-03). Default `null`. */
  tutorialIndex?: number | null;
  walkInSpectator?: true;
  walkInSeesPrivate?: true;
  claimableSeats?: readonly ClaimableSeatView[];
  /** Room wall-clock map — omitted / missing seat → `thinkTimeMs: 0` (L60-04). */
  thinkTimeMsByPlayerId?: ReadonlyMap<string, number>;
}

export function buildGameRecapView(
  state: GameState,
  actionLog: readonly ActionLogEntryView[],
  eliminations: readonly FinishedGameEliminationRecord[],
  options: {
    botDifficulties?: ReadonlyMap<string, BotDifficulty>;
    thinkTimeMsByPlayerId?: ReadonlyMap<string, number>;
    omitKitId?: boolean;
  } = {},
): GameRecapView {
  const omitKitId = options.omitKitId === true;
  const botDifficulties = options.botDifficulties;
  const thinkTimeMsByPlayerId = options.thinkTimeMsByPlayerId;

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
        ...(omitKitId ? {} : { kitId: player.kitId }),
        isBot: botDifficulties?.has(player.id) === true,
        livesLost: player.matchStats.livesLost,
        livesGained: player.matchStats.livesGained,
        pointsSpent: player.matchStats.pointsSpent,
        pointsGained: player.matchStats.pointsGained,
        upgradePointsSpent: player.matchStats.upgradePointsSpent,
        specialsPlayedCount: aggregates.specialsPlayedCount,
        buyCardCount: aggregates.buyCardCount,
        sellCardCount: aggregates.sellCardCount,
        drawCount: aggregates.drawCount,
        attacksPlayedCount: aggregates.attacksPlayedCount,
        damageDealt: aggregates.damageDealt,
        kills: aggregates.kills,
        thinkTimeMs: thinkTimeMsByPlayerId?.get(player.id) ?? 0,
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
  const playKind = input.playKind ?? 'classic';
  const tutorialIndex = input.tutorialIndex ?? null;
  const walkInSpectator = input.walkInSpectator === true;
  const walkInSeesPrivate = input.walkInSeesPrivate === true;
  const selfPlayer = state.players.find((player) => player.id === recipientSessionId);

  if (selfPlayer === undefined && !walkInSpectator) {
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
    playKind,
    tutorialIndex,
    ...(botDifficulties !== undefined ? { botDifficulties } : {}),
    ...(walkInSpectator ? { walkInSpectator: true } : {}),
    ...(walkInSeesPrivate ? { walkInSeesPrivate: true } : {}),
    ...(input.claimableSeats !== undefined ? { claimableSeats: input.claimableSeats } : {}),
  });

  return withSpectatorFields(
    {
      phase: 'finished',
      you: recipientSessionId,
      gameCode,
      winnerPlayerId,
      finalTable,
      players: state.players.map((player) => {
        const difficulty = botDifficulties?.get(player.id);
        const eliminationReveal = buildEliminationReveal(player);
        const spied = buildSpiedView(state, recipientSessionId, player, walkInSeesPrivate);
        const view: PublicPlayerView = {
          id: player.id,
          nickname: player.nickname,
          isEliminated: player.isEliminated,
          isYou: !walkInSpectator && player.id === recipientSessionId,
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
          absorbWindowOpen: isAbsorbWindowOpen(player),
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
      }),
      recap: buildGameRecapView(state, actionLog, eliminations, {
        omitKitId: walkInSpectator && !walkInSeesPrivate,
        ...(botDifficulties !== undefined ? { botDifficulties } : {}),
        ...(input.thinkTimeMsByPlayerId !== undefined
          ? { thinkTimeMsByPlayerId: input.thinkTimeMsByPlayerId }
          : {}),
      }),
      exportLog,
      playKind,
      tutorialIndex,
    },
    {
      walkInSpectator,
      ...(input.claimableSeats !== undefined ? { claimableSeats: input.claimableSeats } : {}),
    },
  );
}
