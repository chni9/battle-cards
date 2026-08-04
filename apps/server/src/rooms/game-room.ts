/**
 * The game room — technical spec §3, §5.
 *
 * Colyseus is transport only. Authoritative GameState is a plain object; each client gets
 * its own stateUpdate. See docs/agent/decisions.md.
 */

import {
  ACTION_PLAYED,
  ACTION_RESOLVED,
  ADD_BOT,
  BUY_CARD,
  BUY_SPECIAL_CARD,
  BUY_UPGRADE_POINT,
  CHOOSE_ELIMINATION_REWARD,
  CHOOSE_MIRROR_TARGET,
  CLIENT_READY,
  DRAW_CARD,
  ERROR_MESSAGE,
  GAME_OVER,
  isBotDifficulty,
  MIRROR_CHOICE_REQUIRED,
  PLAY_CARD,
  PLAY_MULTIPLE_ATTACKS,
  PLAYER_ELIMINATED,
  PROTOCOL_VERSION,
  REMOVE_BOT,
  REWARD_CHOICE_REQUIRED,
  SELL_CARD,
  SELL_UPGRADE_POINT,
  SET_BOT_DIFFICULTY,
  UPGRADE_CARD,
  START_GAME,
  STATE_UPDATE,
  TURN_STARTED,
  type ActionLogEntryView,
  type ActionPlayedPayload,
  type AddBotPayload,
  type BotDecisionReason,
  type BotDifficulty,
  type BuyCardPayload,
  type CardId,
  type ChooseEliminationRewardPayload,
  type ChooseMirrorTargetPayload,
  type EliminationReason,
  type GameState,
  type LobbySeatView,
  type PlayCardPayload,
  type PlayMultipleAttacksPayload,
  type RemoveBotPayload,
  type RewardChoice,
  type SellCardPayload,
  type SetBotDifficultyPayload,
  type UpgradeCardPayload,
  type ExportTurnRowView,
  type ServerToClientMessages,
} from '@card-battle/shared';
import { CloseCode, ErrorCode, Room, ServerError, type Client } from 'colyseus';

import { buildFinishedGameSnapshot } from '../db/build-finished-game-snapshot';
import type { FinishedGameEliminationRecord } from '../db/finished-game-types';
import { BotDriver } from '../bots/bot-driver';
import {
  pickEliminationRewardsWithReason,
  pickMirrorRedirect,
} from '../bots/heuristic-policy';
import { classifyRewardRoute, classifyTurnEntry } from '../bots/turn-entry';
import { persistFinishedGame } from '../db/write-finished-game';
import { createInitialState } from '../engine/create-initial-state';
import { buildExportTurnRow, snapshotPlayersForExport } from '../export/turn-history';
import { RECONNECT_GRACE_MS } from '../engine/lifecycle/constants';
import {
  markAbsent,
  markDisconnected,
  markReconnected,
  recordAbsentAutoTurn,
  recordConnectedTimeout,
  remainingMs,
  resetConnectedTimeouts,
} from '../engine/lifecycle/connection';
import { createRng } from '../engine/rng';
import { advanceTurn, findPlayer } from '../engine/turn/advance-turn';
import {
  REWARD_SUB_CHOICE_MS,
  eliminateWithoutReward,
  findSoleSurvivorId,
  hasPendingEliminationRewards,
  listAvailableRewardCards,
} from '../engine/turn/elimination-rewards';
import { MIRROR_SUB_CHOICE_MS } from '../engine/turn/mirror-choice';
import { performAndCompleteTurn } from '../engine/turn/orchestrate-turn';
import {
  completeEliminationRewardChoice,
  completeMirrorChoice,
  expireEliminationRewardChoice,
  expireMirrorChoice,
  performTurnAction,
  type TurnAction,
  type TurnResult,
} from '../engine/turn/perform-action';
import {
  buildFinishedViewFor,
  buildLobbyViewFor,
  buildPlayingViewFor,
} from '../protocol/build-view-for';
import {
  GAME_CODE_PRESENCE_CHANNEL,
  generateGameCodeCandidate,
} from './game-code';
import {
  addBotRejectionMessage,
  canAddBot,
  canRemoveBot,
  canSetBotDifficulty,
  canStartGame,
  MAX_PLAYERS,
  removeBotRejectionMessage,
  setBotDifficultyRejectionMessage,
  startGameRejectionMessage,
} from './lobby-rules';
import {
  shouldDisposeLobbyWithOnlyBots,
  shouldKeepRoomAlive,
} from './last-human-leave';
import {
  createBotSeat,
  isBotSeat,
  isHumanSeat,
  shouldLockForOccupancy,
  shouldUnlockForOccupancy,
  type Seat,
} from './seats';

type GameClient = Client<{ messages: ServerToClientMessages }>;

const TURN_DURATION_MS = (() => {
  const raw = process.env['TURN_DURATION_MS'];
  if (raw === undefined) {
    return 30_000;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 5_000 ? parsed : 30_000;
})();

export class GameRoom extends Room<{ client: GameClient }> {
  override maxClients = MAX_PLAYERS;

  private seats: Seat[] = [];
  private hostSessionId: string | null = null;
  private hasStarted = false;
  private gameState: GameState | null = null;
  private winnerPlayerId: string | null = null;
  private readonly botDriver = new BotDriver({
    isBotSeat: (playerId) => {
      const seat = this.seats.find((entry) => entry.sessionId === playerId);
      return seat !== undefined && isBotSeat(seat);
    },
    getGameState: () => this.gameState,
    isGameOver: () => this.winnerPlayerId !== null,
    getPlayingView: (botId) => {
      const state = this.gameState;

      if (state === null) {
        return null;
      }

      return buildPlayingViewFor({
        recipientSessionId: botId,
        gameCode: this.roomId,
        state,
        turnDeadlineMs: this.turnDeadlineMs,
        actionLog: this.actionLog,
        botDifficulties: this.botDifficulties(),
      });
    },
    getBotDifficulty: (botId) => {
      const seat = this.seats.find((entry) => entry.sessionId === botId);

      if (seat === undefined || !isBotSeat(seat)) {
        return 'hard';
      }

      return seat.difficulty;
    },
    performBotAction: (botId, action, reason) => {
      this.performBotAction(botId, action, reason);
    },
    performBotDraw: (botId, reason) => {
      this.performAutoDraw(botId, reason);
    },
    completeBotMirror: (botId, pendingEffectId, newTargetPlayerId, reason) => {
      this.applyBotMirrorChoice(botId, pendingEffectId, newTargetPlayerId, reason);
    },
    completeBotReward: (botId, eliminationId, choices, reason) => {
      this.applyBotRewardChoice(botId, eliminationId, [choices[0], choices[1]], reason);
    },
    failBotReward: (botId) => {
      this.failBotRewardChoice(botId);
    },
  });
  /** Wall-clock start of the match (not lobby create). Feeds the finished-game log. */
  private startedAtMs: number | null = null;
  /**
   * Next bot action/log reason to attach (L17-05). Cleared when consumed.
   * Explanatory only — never affects legality or resolution.
   */
  private pendingBotReason: BotDecisionReason | null = null;
  /** Elimination history for the finished-game log (wire reasons; not on GameState). */
  private eliminations: FinishedGameEliminationRecord[] = [];
  private actionTakenThisTurn = false;
  private turnDeadlineMs: number | null = null;
  private turnTimer: ReturnType<typeof setTimeout> | null = null;
  private mirrorTimer: ReturnType<typeof setTimeout> | null = null;
  private rewardTimer: ReturnType<typeof setTimeout> | null = null;
  private actionLog: ActionLogEntryView[] = [];
  /** Before/after player-param history for finished Excel export — Lot 19. */
  private turnHistory: ExportTurnRowView[] = [];
  /** Colyseus manual reconnection Deferreds — reject on elim / Leave / game over. */
  private reconnectionRejectors = new Map<string, (reason?: Error) => void>();
  private absentTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private pausedTurnRemainingMs: number | null = null;
  private pausedMirrorRemainingMs: number | null = null;
  private pausedRewardRemainingMs: number | null = null;

  override async onCreate(): Promise<void> {
    this.roomId = await this.allocateGameCode();
    console.log(`[${this.roomId}] room created`);
  }

  override async onDispose(): Promise<void> {
    this.clearTurnTimer();
    this.clearMirrorTimer();
    this.clearRewardTimer();
    this.clearAllAbsentTimers();
    this.botDriver.clear();
    this.rejectAllReconnections(new Error('Room disposed'));
    await this.presence.srem(GAME_CODE_PRESENCE_CHANNEL, this.roomId);
  }

  override onAuth(_client: GameClient, options: unknown): boolean {
    if (this.hasStarted) {
      throw new ServerError(ErrorCode.APPLICATION_ERROR, 'This game has already started.');
    }

    const clientVersion = readProtocolVersion(options);

    if (clientVersion !== PROTOCOL_VERSION) {
      const sent = clientVersion === null ? 'no version' : `v${clientVersion}`;

      throw new ServerError(
        ErrorCode.APPLICATION_ERROR,
        `Protocol version mismatch: the server speaks v${PROTOCOL_VERSION}, this client sent ${sent}. Reload the page.`,
      );
    }

    if (readNickname(options) === null) {
      throw new ServerError(ErrorCode.APPLICATION_ERROR, 'A nickname is required to join.');
    }

    return true;
  }

  override messages = {
    [CLIENT_READY]: (client: GameClient): void => {
      this.sendStateTo(client);
    },

    [START_GAME]: (client: GameClient): void => {
      const hostSessionId = this.hostSessionId;

      if (hostSessionId === null) {
        client.send(ERROR_MESSAGE, { message: 'No host is seated.' });
        return;
      }

      const rejection = canStartGame({
        requesterSessionId: client.sessionId,
        hostSessionId,
        seatCount: this.seats.length,
        hasStarted: this.hasStarted,
      });

      if (rejection !== null) {
        client.send(ERROR_MESSAGE, { message: startGameRejectionMessage(rejection) });
        return;
      }

      this.hasStarted = true;
      this.startedAtMs = Date.now();
      this.eliminations = [];
      this.gameState = createInitialState({
        seats: this.seats.map((seat) => ({ id: seat.sessionId, nickname: seat.nickname })),
      });
      this.actionTakenThisTurn = false;
      this.actionLog = [];
      void this.lock();
      console.log(
        `[${this.roomId}] game started — ${this.gameState.players.map((player) => player.nickname).join(', ')}`,
      );
      this.refreshAutoDispose();
      this.beginTurnOrAbsentAutoPlay();
      this.sendStateToEveryone();
      this.broadcastTurnStarted();
    },

    [ADD_BOT]: (client: GameClient, payload: unknown): void => {
      this.handleAddBot(client, payload);
    },

    [REMOVE_BOT]: (client: GameClient, payload: unknown): void => {
      this.handleRemoveBot(client, payload);
    },

    [SET_BOT_DIFFICULTY]: (client: GameClient, payload: unknown): void => {
      this.handleSetBotDifficulty(client, payload);
    },

    [DRAW_CARD]: (client: GameClient): void => {
      this.handleAction(client, { type: 'draw' });
    },

    [PLAY_CARD]: (client: GameClient, payload: unknown): void => {
      const parsed = readPlayCardPayload(payload);

      if (parsed === null) {
        client.send(ERROR_MESSAGE, { message: 'Invalid playCard payload.' });
        return;
      }

      this.handleAction(client, {
        type: 'playCard',
        instanceId: parsed.instanceId,
        ...(parsed.targetPlayerId !== undefined
          ? { targetPlayerId: parsed.targetPlayerId }
          : {}),
        ...(parsed.quantity !== undefined ? { quantity: parsed.quantity } : {}),
      });
    },

    [PLAY_MULTIPLE_ATTACKS]: (client: GameClient, payload: unknown): void => {
      const parsed = readPlayMultipleAttacksPayload(payload);

      if (parsed === null) {
        client.send(ERROR_MESSAGE, { message: 'Invalid playMultipleAttacks payload.' });
        return;
      }

      this.handleAction(client, {
        type: 'playMultipleAttacks',
        attacks: parsed.attacks,
      });
    },

    [BUY_CARD]: (client: GameClient, payload: unknown): void => {
      const parsed = readBuyCardPayload(payload);

      if (parsed === null) {
        client.send(ERROR_MESSAGE, { message: 'Invalid buyCard payload.' });
        return;
      }

      this.handleAction(client, { type: 'buyCard', cardId: parsed.cardId });
    },

    [SELL_CARD]: (client: GameClient, payload: unknown): void => {
      const parsed = readSellCardPayload(payload);

      if (parsed === null) {
        client.send(ERROR_MESSAGE, { message: 'Invalid sellCard payload.' });
        return;
      }

      this.handleAction(client, { type: 'sellCard', instanceId: parsed.instanceId });
    },

    [UPGRADE_CARD]: (client: GameClient, payload: unknown): void => {
      const parsed = readUpgradeCardPayload(payload);

      if (parsed === null) {
        client.send(ERROR_MESSAGE, { message: 'Invalid upgradeCard payload.' });
        return;
      }

      this.handleAction(client, { type: 'upgradeCard', instanceId: parsed.instanceId });
    },

    [BUY_UPGRADE_POINT]: (client: GameClient): void => {
      this.handleAction(client, { type: 'buyUpgradePoint' });
    },

    [BUY_SPECIAL_CARD]: (client: GameClient): void => {
      this.handleAction(client, { type: 'buySpecialCard' });
    },

    [SELL_UPGRADE_POINT]: (client: GameClient): void => {
      this.handleAction(client, { type: 'sellUpgradePoint' });
    },

    [CHOOSE_MIRROR_TARGET]: (client: GameClient, payload: unknown): void => {
      this.handleMirrorChoice(client, payload);
    },

    [CHOOSE_ELIMINATION_REWARD]: (client: GameClient, payload: unknown): void => {
      this.handleRewardChoice(client, payload);
    },
  };

  override onJoin(client: GameClient, options: unknown): void {
    const nickname = readNickname(options);

    if (nickname === null) {
      throw new ServerError(ErrorCode.APPLICATION_ERROR, 'A nickname is required to join.');
    }

    this.seats.push({ kind: 'human', sessionId: client.sessionId, nickname });
    this.hostSessionId ??= client.sessionId;

    console.log(
      `[${this.roomId}] ${nickname} (${client.sessionId}) joined — ${this.seats.length} seated`,
    );

    if (shouldLockForOccupancy(this.seats.length)) {
      void this.lock();
    }

    this.sendStateToEveryoneExcept(client);
  }

  /**
   * Unexpected disconnect mid-game — technical spec §5.7, L7-01.
   * Keep the seat reclaimable (`manual`) until elim or game over.
   */
  override async onDrop(client: GameClient): Promise<void> {
    const state = this.gameState;

    if (!this.hasStarted || state === null || this.winnerPlayerId !== null) {
      return;
    }

    const player = findPlayer(state, client.sessionId);

    if (player === undefined || player.isEliminated) {
      return;
    }

    console.log(`[${this.roomId}] ${client.sessionId} dropped — grace ${RECONNECT_GRACE_MS}ms`);
    markDisconnected(player, Date.now());
    this.pauseTimersOwnedBy(client.sessionId);
    this.scheduleAbsentTransition(client.sessionId);
    this.sendStateToEveryone();

    const deferred = this.allowReconnection(client, 'manual');
    this.reconnectionRejectors.set(client.sessionId, (reason?: Error) => {
      // Deferred.reject is loosely typed on the Colyseus Deferred helper.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Colyseus Deferred.reject
      deferred.reject(reason ?? new Error('Reconnection closed'));
    });

    try {
      await deferred;
    } catch {
      // Rejected on elim / Leave / dispose, or never reclaimed.
    } finally {
      this.reconnectionRejectors.delete(client.sessionId);
    }
  }

  override onReconnect(client: GameClient): void {
    const state = this.gameState;

    if (state === null) {
      return;
    }

    const player = findPlayer(state, client.sessionId);

    if (player === undefined || player.isEliminated) {
      return;
    }

    console.log(`[${this.roomId}] ${client.sessionId} reconnected`);
    markReconnected(player);
    this.clearAbsentTimer(client.sessionId);
    this.resumeTimersOwnedBy(client.sessionId);
    this.sendStateToEveryone();
  }

  override onLeave(client: GameClient, code?: number): void {
    const consented = code === CloseCode.CONSENTED;

    if (this.hasStarted && this.gameState !== null && this.winnerPlayerId === null) {
      if (consented) {
        this.handleConsentedLeave(client.sessionId);
      }

      // Permanent leave after drop (reconnection rejected): seat may stay for lobby id map;
      // player remains in gameState (possibly already eliminated).
      this.clearAbsentTimer(client.sessionId);
      this.rejectReconnection(client.sessionId, new Error('Client left'));
      return;
    }

    this.seats = this.seats.filter((seat) => seat.sessionId !== client.sessionId);

    if (this.hostSessionId === client.sessionId) {
      this.hostSessionId = this.seats[0]?.sessionId ?? null;
    }

    console.log(`[${this.roomId}] ${client.sessionId} left — ${this.seats.length} seated`);

    if (!this.hasStarted && shouldUnlockForOccupancy(this.seats.length)) {
      void this.unlock();
    }

    if (
      shouldDisposeLobbyWithOnlyBots({
        hasStarted: this.hasStarted,
        humanSeatCount: this.seats.filter(isHumanSeat).length,
        botSeatCount: this.seats.filter(isBotSeat).length,
      })
    ) {
      // Lobby orphan bots: dispose, write nothing (#V3-3b complement).
      void this.disconnect();
      return;
    }

    this.sendStateToEveryoneExcept(client);
  }

  private handleConsentedLeave(sessionId: string): void {
    const state = this.gameState;

    if (state === null) {
      return;
    }

    const player = findPlayer(state, sessionId);

    if (player === undefined || player.isEliminated) {
      return;
    }

    console.log(`[${this.roomId}] ${sessionId} consented leave — forfeit`);
    this.clearAbsentTimer(sessionId);
    this.rejectReconnection(sessionId, new Error('Player left'));
    eliminateWithoutReward(state, sessionId);
    this.recordElimination({
      playerId: sessionId,
      eliminatorPlayerId: null,
      reason: 'leave',
    });

    if (this.finishIfSoleSurvivor(state)) {
      return;
    }

    this.refreshAutoDispose();

    if (state.currentTurnPlayerId === sessionId && !this.actionTakenThisTurn) {
      this.clearTurnTimer();
      advanceTurn(state);
      this.actionTakenThisTurn = false;
      this.beginTurnOrAbsentAutoPlay();
      this.sendStateToEveryone();
      this.broadcastTurnStarted();
      return;
    }

    this.sendStateToEveryone();
  }

  private handleAddBot(client: GameClient, payload: unknown): void {
    const hostSessionId = this.hostSessionId;

    if (hostSessionId === null) {
      client.send(ERROR_MESSAGE, { message: 'No host is seated.' });
      return;
    }

    const parsed = readAddBotPayload(payload);

    if (parsed === null) {
      client.send(ERROR_MESSAGE, { message: 'Invalid addBot payload.' });
      return;
    }

    const rejection = canAddBot({
      requesterSessionId: client.sessionId,
      hostSessionId,
      seatCount: this.seats.length,
      hasStarted: this.hasStarted,
    });

    if (rejection !== null) {
      client.send(ERROR_MESSAGE, { message: addBotRejectionMessage(rejection) });
      return;
    }

    this.seats.push(createBotSeat(this.seats, parsed.difficulty));

    if (shouldLockForOccupancy(this.seats.length)) {
      void this.lock();
    }

    this.refreshAutoDispose();
    this.sendStateToEveryone();
  }

  private handleRemoveBot(client: GameClient, payload: unknown): void {
    const hostSessionId = this.hostSessionId;

    if (hostSessionId === null) {
      client.send(ERROR_MESSAGE, { message: 'No host is seated.' });
      return;
    }

    const parsed = readRemoveBotPayload(payload);

    if (parsed === null) {
      client.send(ERROR_MESSAGE, { message: 'Invalid removeBot payload.' });
      return;
    }

    const target = this.seats.find((seat) => seat.sessionId === parsed.playerId);
    const rejection = canRemoveBot({
      requesterSessionId: client.sessionId,
      hostSessionId,
      hasStarted: this.hasStarted,
      targetExists: target !== undefined,
      targetIsBot: target !== undefined && isBotSeat(target),
    });

    if (rejection !== null) {
      client.send(ERROR_MESSAGE, { message: removeBotRejectionMessage(rejection) });
      return;
    }

    this.seats = this.seats.filter((seat) => seat.sessionId !== parsed.playerId);

    if (shouldUnlockForOccupancy(this.seats.length)) {
      void this.unlock();
    }

    this.refreshAutoDispose();
    this.sendStateToEveryone();
  }

  private handleSetBotDifficulty(client: GameClient, payload: unknown): void {
    const hostSessionId = this.hostSessionId;

    if (hostSessionId === null) {
      client.send(ERROR_MESSAGE, { message: 'No host is seated.' });
      return;
    }

    const parsed = readSetBotDifficultyPayload(payload);

    if (parsed === null) {
      client.send(ERROR_MESSAGE, { message: 'Invalid setBotDifficulty payload.' });
      return;
    }

    const target = this.seats.find((seat) => seat.sessionId === parsed.playerId);
    const rejection = canSetBotDifficulty({
      requesterSessionId: client.sessionId,
      hostSessionId,
      hasStarted: this.hasStarted,
      targetExists: target !== undefined,
      targetIsBot: target !== undefined && isBotSeat(target),
    });

    if (rejection !== null) {
      client.send(ERROR_MESSAGE, { message: setBotDifficultyRejectionMessage(rejection) });
      return;
    }

    if (target === undefined || !isBotSeat(target)) {
      return;
    }

    target.difficulty = parsed.difficulty;
    this.sendStateToEveryone();
  }

  private handleAction(client: GameClient, action: TurnAction): void {
    const state = this.gameState;

    if (state === null || this.winnerPlayerId !== null) {
      client.send(ERROR_MESSAGE, { message: 'The game is not in progress.' });
      return;
    }

    if (this.hasActiveMirrorChoice(state)) {
      client.send(ERROR_MESSAGE, { message: 'Finish your Mirror choice first.' });
      return;
    }

    if (hasPendingEliminationRewards(state)) {
      client.send(ERROR_MESSAGE, { message: 'Finish elimination rewards first.' });
      return;
    }

    if (this.actionTakenThisTurn) {
      client.send(ERROR_MESSAGE, { message: 'You already acted this turn.' });
      return;
    }

    const actor = findPlayer(state, client.sessionId);

    if (actor !== undefined) {
      resetConnectedTimeouts(actor);
    }

    const before = snapshotPlayersForExport(state);
    const result = performTurnAction(state, client.sessionId, action);

    if (!result.ok) {
      client.send(ERROR_MESSAGE, { message: result.message });
      return;
    }

    this.recordTurnHistory(before, result);
    this.applyTurnResult(result);

    if (result.mirrorChoicePending === true) {
      const choice = state.mirrorChoice;

      if (choice === null) {
        client.send(ERROR_MESSAGE, { message: 'Mirror choice missing.' });
        return;
      }

      this.beginMirrorTimer(client, choice.deadlineMs, choice.eligibleEffectIds);
      this.sendStateToEveryone();
      return;
    }

    if (result.rewardChoicePending === true) {
      this.beginRewardTimer(state);
      this.sendStateToEveryone();
      return;
    }

    if (result.winnerPlayerId !== null) {
      return;
    }

    this.beginTurnOrAbsentAutoPlay();
    this.sendStateToEveryone();
    this.broadcastTurnStarted();
  }

  private handleMirrorChoice(client: GameClient, payload: unknown): void {
    const state = this.gameState;
    const parsed = readChooseMirrorTargetPayload(payload);

    if (state === null || this.winnerPlayerId !== null) {
      client.send(ERROR_MESSAGE, { message: 'The game is not in progress.' });
      return;
    }

    if (parsed === null) {
      client.send(ERROR_MESSAGE, { message: 'Invalid chooseMirrorTarget payload.' });
      return;
    }

    const result = completeMirrorChoice(
      state,
      client.sessionId,
      parsed.pendingEffectId,
      parsed.newTargetPlayerId,
    );

    if (!result.ok) {
      client.send(ERROR_MESSAGE, { message: result.message });
      return;
    }

    this.clearMirrorTimer();
    this.applyTurnResult(result);

    if (result.rewardChoicePending === true) {
      this.beginRewardTimer(state);
      this.sendStateToEveryone();
      return;
    }

    if (result.winnerPlayerId !== null) {
      return;
    }

    this.beginTurnOrAbsentAutoPlay();
    this.sendStateToEveryone();
    this.broadcastTurnStarted();
  }

  private handleRewardChoice(client: GameClient, payload: unknown): void {
    const state = this.gameState;
    const parsed = readChooseEliminationRewardPayload(payload);

    if (state === null || this.winnerPlayerId !== null) {
      client.send(ERROR_MESSAGE, { message: 'The game is not in progress.' });
      return;
    }

    if (parsed === null) {
      client.send(ERROR_MESSAGE, { message: 'Invalid chooseEliminationReward payload.' });
      return;
    }

    const result = completeEliminationRewardChoice(
      state,
      client.sessionId,
      parsed.eliminationId,
      parsed.choices,
    );

    if (!result.ok) {
      client.send(ERROR_MESSAGE, { message: result.message });
      return;
    }

    this.clearRewardTimer();
    this.appendRewardsClaimed(result.rewardsClaimed);
    this.continueAfterRewards(result);
  }

  private recordTurnHistory(
    before: ReturnType<typeof snapshotPlayersForExport>,
    result: TurnResult,
  ): void {
    const state = this.gameState;

    if (state === null) {
      return;
    }

    const after = snapshotPlayersForExport(state);
    const played = result.actionPlayed;

    this.turnHistory.push(
      buildExportTurnRow({
        turnSequence: played.turnSequence,
        actorPlayerId: played.actorPlayerId,
        action: played.action,
        ...(played.cardId !== undefined ? { cardId: played.cardId } : {}),
        ...(played.isUpgraded !== undefined ? { isUpgraded: played.isUpgraded } : {}),
        ...(played.targetPlayerId !== undefined
          ? { targetPlayerId: played.targetPlayerId }
          : {}),
        ...(played.attacks !== undefined ? { attacks: played.attacks } : {}),
        before,
        after,
      }),
    );
  }

  private applyTurnResult(result: TurnResult): void {
    this.actionTakenThisTurn = true;
    this.clearTurnTimer();

    const turnSequence = result.actionPlayed.turnSequence;

    if (result.mirrorRedirect !== undefined) {
      const botReason = this.consumePendingBotReason();
      this.actionLog.push({
        kind: 'mirrorRedirected',
        actorPlayerId: result.mirrorRedirect.actorPlayerId,
        cardId: result.mirrorRedirect.cardId,
        previousTargetPlayerId: result.mirrorRedirect.previousTargetPlayerId,
        newTargetPlayerId: result.mirrorRedirect.newTargetPlayerId,
        turnSequence: result.mirrorRedirect.turnSequence,
        ...(botReason !== null ? { botReason } : {}),
      });
    } else {
      const botReason = this.consumePendingBotReason();
      const played: ActionPlayedPayload = {
        actorPlayerId: result.actionPlayed.actorPlayerId,
        action: result.actionPlayed.action,
        turnSequence,
        ...(result.actionPlayed.cardId !== undefined
          ? { cardId: result.actionPlayed.cardId }
          : {}),
        ...(result.actionPlayed.isUpgraded !== undefined
          ? { isUpgraded: result.actionPlayed.isUpgraded }
          : {}),
        ...(result.actionPlayed.targetPlayerId !== undefined
          ? { targetPlayerId: result.actionPlayed.targetPlayerId }
          : {}),
        ...(result.actionPlayed.attacks !== undefined
          ? { attacks: result.actionPlayed.attacks }
          : {}),
        ...(botReason !== null ? { botReason } : {}),
      };

      this.actionLog.push({ kind: 'actionPlayed', ...played });
      this.broadcast(ACTION_PLAYED, played);
    }

    for (const resolved of result.resolved) {
      this.actionLog.push({
        kind: 'actionResolved',
        effectId: resolved.effectId,
        sourcePlayerId: resolved.sourcePlayerId,
        targetPlayerId: resolved.targetPlayerId,
        cardId: resolved.cardId,
        isUpgraded: resolved.isUpgraded,
        livesLost: resolved.livesLost,
        shieldAbsorbed: resolved.shieldAbsorbed,
        outcome: resolved.outcome,
        turnSequence,
      });
      this.broadcast(ACTION_RESOLVED, resolved);
    }

    for (const playerId of result.eliminatedPlayerIds) {
      const elimination = result.eliminations.find((entry) => entry.playerId === playerId);

      this.rejectReconnection(playerId, new Error('Player eliminated'));
      this.clearAbsentTimer(playerId);
      this.recordElimination({
        playerId,
        eliminatorPlayerId: elimination?.eliminatorPlayerId ?? null,
        reason: 'combat',
      });
    }

    if (result.winnerPlayerId !== null) {
      this.onGameOver(result.winnerPlayerId);
      return;
    }

    this.actionTakenThisTurn = false;
  }

  private appendRewardsClaimed(claimed: {
    eliminatorPlayerId: string;
    eliminatedPlayerId: string;
  }): void {
    const turnSequence = this.gameState?.turnSequence ?? 0;
    const botReason = this.consumePendingBotReason();

    this.actionLog.push({
      kind: 'rewardsClaimed',
      eliminatorPlayerId: claimed.eliminatorPlayerId,
      eliminatedPlayerId: claimed.eliminatedPlayerId,
      turnSequence,
      ...(botReason !== null ? { botReason } : {}),
    });
  }

  private consumePendingBotReason(): BotDecisionReason | null {
    const reason = this.pendingBotReason;
    this.pendingBotReason = null;
    return reason;
  }

  private setPendingBotReason(reason: BotDecisionReason | undefined): void {
    this.pendingBotReason = reason ?? null;
  }

  private beginMirrorTimer(
    client: GameClient,
    deadlineMs: number,
    eligibleEffectIds: readonly string[],
    durationMs?: number,
  ): void {
    this.clearMirrorTimer();
    this.pausedMirrorRemainingMs = null;

    const remainingFromDeadline = Math.max(0, deadlineMs - Date.now());
    const ms =
      durationMs ??
      (remainingFromDeadline === 0 ? MIRROR_SUB_CHOICE_MS : remainingFromDeadline);
    const effectiveDeadline = durationMs !== undefined ? Date.now() + ms : deadlineMs;

    const state = this.gameState;

    if (state?.mirrorChoice != null && durationMs !== undefined) {
      state.mirrorChoice = { ...state.mirrorChoice, deadlineMs: effectiveDeadline };
    }

    client.send(MIRROR_CHOICE_REQUIRED, {
      eligibleEffectIds,
      deadlineMs: effectiveDeadline,
    });

    this.mirrorTimer = setTimeout(() => {
      this.onMirrorTimeout();
    }, ms > 0 ? ms : MIRROR_SUB_CHOICE_MS);
  }

  private onMirrorTimeout(): void {
    const state = this.gameState;

    if (state?.mirrorChoice == null || this.winnerPlayerId !== null) {
      return;
    }

    const result = expireMirrorChoice(state, createRng(state.seed));

    if (!result.ok) {
      state.mirrorChoice = null;
      return;
    }

    this.clearMirrorTimer();
    this.applyTurnResult(result);

    if (result.rewardChoicePending === true) {
      this.beginRewardTimer(state);
      this.sendStateToEveryone();
      return;
    }

    if (result.winnerPlayerId !== null) {
      return;
    }

    this.beginTurnOrAbsentAutoPlay();
    this.sendStateToEveryone();
    this.broadcastTurnStarted();
  }

  private beginRewardTimer(state: GameState, durationMs?: number): void {
    this.clearRewardTimer();
    this.pausedRewardRemainingMs = null;

    const choice = state.rewardChoice;

    if (choice === null) {
      return;
    }

    const seat = this.seats.find((entry) => entry.sessionId === choice.eliminatorPlayerId);
    const hasClient = this.clients.some((c) => c.sessionId === choice.eliminatorPlayerId);
    const route = classifyRewardRoute(seat, hasClient);

    if (route === 'bot') {
      // No REWARD_CHOICE_REQUIRED timer for bots — driver answers inline (v3 §4.6).
      this.botDriver.handleRewardChoice(choice.eliminatorPlayerId);
      return;
    }

    this.sendRewardChoiceRequired(state);

    const remainingFromDeadline = Math.max(0, choice.deadlineMs - Date.now());
    const ms =
      durationMs ??
      (remainingFromDeadline === 0 ? REWARD_SUB_CHOICE_MS : remainingFromDeadline);

    if (durationMs !== undefined) {
      choice.deadlineMs = Date.now() + ms;
      this.sendRewardChoiceRequired(state);
    }

    this.rewardTimer = setTimeout(() => {
      this.onRewardTimeout();
    }, ms > 0 ? ms : REWARD_SUB_CHOICE_MS);
  }

  private onRewardTimeout(): void {
    const state = this.gameState;

    if (state?.rewardChoice == null || this.winnerPlayerId !== null) {
      return;
    }

    const result = expireEliminationRewardChoice(state);

    if (!result.ok) {
      state.rewardChoice = null;
      return;
    }

    this.clearRewardTimer();
    this.appendRewardsClaimed(result.rewardsClaimed);
    this.continueAfterRewards(result);
  }

  private clearRewardTimer(): void {
    if (this.rewardTimer !== null) {
      clearTimeout(this.rewardTimer);
      this.rewardTimer = null;
    }
  }

  private sendRewardChoiceRequired(state: GameState): void {
    const choice = state.rewardChoice;

    if (choice === null) {
      return;
    }

    const seat = this.seats.find((entry) => entry.sessionId === choice.eliminatorPlayerId);
    const client = this.clients.find((entry) => entry.sessionId === choice.eliminatorPlayerId);
    const route = classifyRewardRoute(seat, client !== undefined);

    if (route === 'bot') {
      this.botDriver.handleRewardChoice(choice.eliminatorPlayerId);
      return;
    }

    if (route === 'human-dropped') {
      // Dropped human: keep today's timer default (armed by beginRewardTimer).
      return;
    }

    if (client === undefined) {
      return;
    }

    client.send(REWARD_CHOICE_REQUIRED, {
      eliminationId: choice.eliminationId,
      eliminatedPlayerId: choice.eliminatedPlayerId,
      availableCards: listAvailableRewardCards(state, choice.eliminatedPlayerId),
      deadlineMs: choice.deadlineMs,
    });
  }

  private continueAfterRewards(result: {
    rewardChoicePending: boolean;
    winnerPlayerId: string | null;
  }): void {
    if (result.winnerPlayerId !== null) {
      this.onGameOver(result.winnerPlayerId);
      return;
    }

    if (result.rewardChoicePending) {
      const state = this.gameState;

      if (state === null) {
        return;
      }

      this.beginRewardTimer(state);
      this.sendStateToEveryone();
      return;
    }

    this.actionTakenThisTurn = false;
    this.beginTurnOrAbsentAutoPlay();
    this.sendStateToEveryone();
    this.broadcastTurnStarted();
  }

  /**
   * Start the turn timer, or drive a bot / absent seat.
   * technical spec §5.7; bot branch — technical spec v3 §4.2 (before connected).
   *
   * Absent auto-draws are deferred with `setTimeout(0)` so consecutive absent seats
   * do not recurse synchronously (stack overflow when several seats are absent).
   */
  private beginTurnOrAbsentAutoPlay(): void {
    const state = this.gameState;

    if (state?.currentTurnPlayerId == null) {
      this.turnDeadlineMs = null;
      return;
    }

    const activePlayerId = state.currentTurnPlayerId;
    const seat = this.seats.find((entry) => entry.sessionId === activePlayerId);
    const active = findPlayer(state, activePlayerId);
    const entry = classifyTurnEntry(seat, active?.connectionState.status);

    if (entry === 'bot') {
      this.clearTurnTimer();
      this.turnDeadlineMs = null;
      this.botDriver.scheduleTurn(activePlayerId);
      return;
    }

    if (entry === 'absent') {
      const playerId = activePlayerId;
      setTimeout(() => {
        this.runAbsentAutoDraw(playerId);
      }, 0);
      return;
    }

    if (entry === 'disconnected') {
      // Grace window: do not start the 30s timer — wait for reconnect or absent.
      this.clearTurnTimer();
      this.turnDeadlineMs = null;
      this.pausedTurnRemainingMs = TURN_DURATION_MS;
      return;
    }

    this.beginTurnTimer(TURN_DURATION_MS);
  }

  private beginTurnTimer(durationMs: number): void {
    this.clearTurnTimer();
    this.pausedTurnRemainingMs = null;
    const state = this.gameState;

    if (state?.currentTurnPlayerId === null || state === null) {
      this.turnDeadlineMs = null;
      return;
    }

    const ms = Math.max(0, durationMs);
    this.turnDeadlineMs = Date.now() + ms;
    const activePlayerId = state.currentTurnPlayerId;

    this.turnTimer = setTimeout(() => {
      this.onTurnTimeout(activePlayerId);
    }, ms);
  }

  private hasActiveMirrorChoice(state: GameState): boolean {
    return state.mirrorChoice !== null;
  }

  private clearMirrorTimer(): void {
    if (this.mirrorTimer !== null) {
      clearTimeout(this.mirrorTimer);
      this.mirrorTimer = null;
    }
  }

  private onTurnTimeout(expectedPlayerId: string): void {
    const state = this.gameState;

    if (
      state === null ||
      this.winnerPlayerId !== null ||
      this.actionTakenThisTurn ||
      state.currentTurnPlayerId !== expectedPlayerId
    ) {
      return;
    }

    const actor = findPlayer(state, expectedPlayerId);

    if (actor?.connectionState.status === 'disconnected') {
      return;
    }

    console.log(`[${this.roomId}] turn timeout — auto draw for ${expectedPlayerId}`);

    let shouldElimForInactivity = false;

    if (actor?.connectionState.status === 'connected') {
      shouldElimForInactivity = recordConnectedTimeout(actor);
    }

    this.performAutoDraw(expectedPlayerId);

    if (!shouldElimForInactivity) {
      return;
    }

    const still = findPlayer(state, expectedPlayerId);

    if (still !== undefined && !still.isEliminated && this.getWinnerPlayerId() === null) {
      this.applyLifecycleElimination(expectedPlayerId, 'inactivity');
    }
  }

  private performAutoDraw(playerId: string, reason?: BotDecisionReason): void {
    const seat = this.seats.find((entry) => entry.sessionId === playerId);
    const resolvedReason =
      reason ??
      (seat !== undefined && isBotSeat(seat) ? { code: 'policy-fallback' as const } : undefined);
    this.performBotAction(playerId, { type: 'draw' }, resolvedReason);
  }

  /**
   * Bot (or absent auto-draw) action path — sequences act → Mirror → rewards via the
   * shared orchestrator (technical spec v3 §4.2 / §10.3), then broadcasts.
   */
  private performBotAction(
    playerId: string,
    action: TurnAction,
    reason?: BotDecisionReason,
  ): void {
    const state = this.gameState;

    if (state === null) {
      return;
    }

    this.setPendingBotReason(reason);
    const before = snapshotPlayersForExport(state);
    let historyRecorded = false;

    const hooks = {
      resolveMirror: (s: GameState, actorId: string) => {
        const view = this.buildBotPlayingView(actorId);

        if (view === null) {
          throw new Error('no view for Mirror');
        }

        const pick = pickMirrorRedirect(
          view,
          createRng(`${s.seed}:bot:${actorId}:mirror:${s.turnSequence}`),
          s.mirrorChoice?.eligibleEffectIds,
        );

        if (pick === null) {
          throw new Error('Mirror pick failed');
        }

        this.setPendingBotReason(pick.reason);
        return pick;
      },
      resolveReward: (s: GameState) => {
        const choice = s.rewardChoice;

        if (choice === null) {
          throw new Error('reward pending without rewardChoice');
        }

        const seat = this.seats.find(
          (entry) => entry.sessionId === choice.eliminatorPlayerId,
        );

        // Human eliminator (incl. kill on a bot's turn) must get REWARD_CHOICE_REQUIRED.
        if (seat === undefined || !isBotSeat(seat)) {
          return null;
        }

        const view = this.buildBotPlayingView(choice.eliminatorPlayerId);

        if (view === null) {
          throw new Error('no view for reward');
        }

        const available = listAvailableRewardCards(s, choice.eliminatedPlayerId);
        const picks = pickEliminationRewardsWithReason(
          view,
          available,
          s.lifeLimit,
          createRng(
            `${s.seed}:bot:${choice.eliminatorPlayerId}:reward:${s.turnSequence}`,
          ),
        );
        this.setPendingBotReason(picks.reason);
        return {
          chooserPlayerId: choice.eliminatorPlayerId,
          eliminationId: choice.eliminationId,
          choices: picks.choices,
        };
      },
    };

    let result: TurnResult | { ok: false; message: string };

    try {
      result = performAndCompleteTurn(state, playerId, action, hooks, {
        nowMs: Date.now(),
        onTurnResult: (step) => {
          if (!historyRecorded) {
            this.recordTurnHistory(before, step);
            historyRecorded = true;
          }

          this.applyTurnResult(step);
        },
        onRewardResult: (reward) => {
          this.appendRewardsClaimed(reward.rewardsClaimed);
        },
      });
    } catch (error) {
      this.pendingBotReason = null;
      if (action.type !== 'draw') {
        this.performAutoDraw(playerId, { code: 'policy-fallback' });
        return;
      }

      console.error(`[${this.roomId}] bot turn threw for ${playerId}`, error);
      this.recoverStuckBotTurn(playerId);
      return;
    }

    if (!result.ok) {
      this.pendingBotReason = null;
      if (action.type !== 'draw') {
        this.performAutoDraw(playerId, { code: 'policy-fallback' });
        return;
      }

      // Draw itself failed — without advancing, bot seats hang forever (no turn timer).
      console.error(`[${this.roomId}] bot draw failed for ${playerId}: ${result.message}`);
      this.recoverStuckBotTurn(playerId);
      return;
    }

    if (result.rewardChoicePending === true) {
      this.beginRewardTimer(state);
      this.sendStateToEveryone();
      return;
    }

    // Winner after rewards is not seen by applyTurnResult (onRewardResult only logs).
    if (result.winnerPlayerId !== null) {
      if (this.winnerPlayerId === null) {
        this.onGameOver(result.winnerPlayerId);
      }
      return;
    }

    this.beginTurnOrAbsentAutoPlay();
    this.sendStateToEveryone();
    this.broadcastTurnStarted();
  }

  private recoverStuckBotTurn(playerId: string): void {
    const state = this.gameState;

    if (state === null || this.winnerPlayerId !== null) {
      return;
    }

    if (state.rewardChoice !== null) {
      this.failBotRewardChoice(playerId);
      return;
    }

    if (state.mirrorChoice !== null) {
      const expired = expireMirrorChoice(state, createRng(state.seed));

      if (expired.ok) {
        this.clearMirrorTimer();
        this.applyTurnResult(expired);

        if (expired.rewardChoicePending === true) {
          this.beginRewardTimer(state);
          this.sendStateToEveryone();
          return;
        }

        if (expired.winnerPlayerId !== null) {
          return;
        }
      } else {
        state.mirrorChoice = null;
      }
    }

    if (state.currentTurnPlayerId === playerId && !this.actionTakenThisTurn) {
      // Cannot legally act — skip seat so the table does not freeze.
      advanceTurn(state);
    }

    this.actionTakenThisTurn = false;
    this.beginTurnOrAbsentAutoPlay();
    this.sendStateToEveryone();
    this.broadcastTurnStarted();
  }

  private buildBotPlayingView(botId: string): ReturnType<typeof buildPlayingViewFor> | null {
    const state = this.gameState;

    if (state === null) {
      return null;
    }

    return buildPlayingViewFor({
      recipientSessionId: botId,
      gameCode: this.roomId,
      state,
      turnDeadlineMs: this.turnDeadlineMs,
      actionLog: this.actionLog,
      botDifficulties: this.botDifficulties(),
    });
  }

  /** Inline Mirror completion for BotDriver (reward-after-human still uses applyBot*). */
  private applyBotMirrorChoice(
    botId: string,
    pendingEffectId: string,
    newTargetPlayerId: string,
    reason?: BotDecisionReason,
  ): void {
    const state = this.gameState;

    if (state === null || this.winnerPlayerId !== null) {
      return;
    }

    this.setPendingBotReason(reason);
    const result = completeMirrorChoice(state, botId, pendingEffectId, newTargetPlayerId);

    if (!result.ok) {
      this.pendingBotReason = null;
      this.performAutoDraw(botId, { code: 'policy-fallback' });
      return;
    }

    this.clearMirrorTimer();
    this.applyTurnResult(result);

    if (result.rewardChoicePending === true) {
      this.beginRewardTimer(state);
      this.sendStateToEveryone();
      return;
    }

    if (result.winnerPlayerId !== null) {
      return;
    }

    this.beginTurnOrAbsentAutoPlay();
    this.sendStateToEveryone();
    this.broadcastTurnStarted();
  }

  private applyBotRewardChoice(
    botId: string,
    eliminationId: string,
    choices: [RewardChoice, RewardChoice],
    reason?: BotDecisionReason,
  ): void {
    const state = this.gameState;

    if (state === null || this.winnerPlayerId !== null) {
      return;
    }

    this.setPendingBotReason(reason);
    const result = completeEliminationRewardChoice(state, botId, eliminationId, choices);

    if (!result.ok) {
      this.pendingBotReason = null;
      // Illegal pick must not leave rewardChoice pending — that freezes the table.
      this.failBotRewardChoice(botId);
      return;
    }

    this.clearRewardTimer();
    this.appendRewardsClaimed(result.rewardsClaimed);
    this.continueAfterRewards(result);
  }

  /** Default the pending reward when a bot cannot complete it. */
  private failBotRewardChoice(botId: string): void {
    const state = this.gameState;

    if (state === null || this.winnerPlayerId !== null) {
      return;
    }

    const choice = state.rewardChoice;

    if (choice?.eliminatorPlayerId !== botId) {
      return;
    }

    console.error(`[${this.roomId}] bot reward failed for ${botId} — expiring defaults`);
    const result = expireEliminationRewardChoice(state);

    if (!result.ok) {
      state.rewardChoice = null;
      this.actionTakenThisTurn = false;
      this.beginTurnOrAbsentAutoPlay();
      this.sendStateToEveryone();
      this.broadcastTurnStarted();
      return;
    }

    this.clearRewardTimer();
    this.appendRewardsClaimed(result.rewardsClaimed);
    this.continueAfterRewards(result);
  }

  private runAbsentAutoDraw(playerId: string): void {
    const state = this.gameState;

    if (state === null || this.getWinnerPlayerId() !== null) {
      return;
    }

    if (state.currentTurnPlayerId !== playerId || this.actionTakenThisTurn) {
      return;
    }

    const player = findPlayer(state, playerId);

    if (
      player === undefined ||
      player.isEliminated ||
      player.connectionState.status !== 'absent'
    ) {
      return;
    }

    console.log(`[${this.roomId}] absent auto-draw for ${playerId}`);
    const shouldElim = recordAbsentAutoTurn(player);
    this.performAutoDraw(playerId);

    if (!shouldElim) {
      return;
    }

    const still = findPlayer(state, playerId);

    if (still !== undefined && !still.isEliminated && this.getWinnerPlayerId() === null) {
      this.applyLifecycleElimination(playerId, 'absence');
    }
  }

  private getWinnerPlayerId(): string | null {
    return this.winnerPlayerId;
  }

  private broadcastTurnStarted(): void {
    const state = this.gameState;
    const activePlayerId = state?.currentTurnPlayerId;
    const deadlineMs = this.turnDeadlineMs;

    if (activePlayerId === null || activePlayerId === undefined || deadlineMs === null || state === null) {
      return;
    }

    const activePlayer = findPlayer(state, activePlayerId);
    const blockTurnsRemaining = activePlayer?.blockTurnsRemaining ?? 0;

    this.broadcast(TURN_STARTED, { activePlayerId, deadlineMs, blockTurnsRemaining });
  }

  private clearTurnTimer(): void {
    if (this.turnTimer !== null) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
  }

  private scheduleAbsentTransition(sessionId: string): void {
    this.clearAbsentTimer(sessionId);
    const timer = setTimeout(() => {
      this.onReconnectGraceExpired(sessionId);
    }, RECONNECT_GRACE_MS);
    this.absentTimers.set(sessionId, timer);
  }

  private onReconnectGraceExpired(sessionId: string): void {
    this.absentTimers.delete(sessionId);
    const state = this.gameState;

    if (state === null || this.winnerPlayerId !== null) {
      return;
    }

    const player = findPlayer(state, sessionId);

    if (
      player === undefined ||
      player.isEliminated ||
      player.connectionState.status !== 'disconnected'
    ) {
      return;
    }

    console.log(`[${this.roomId}] ${sessionId} absent after grace`);
    markAbsent(player);

    // Sub-choice defaults if they own an open prompt.
    if (state.mirrorChoice?.playerId === sessionId) {
      this.onMirrorTimeout();
      this.sendStateToEveryone();
      return;
    }

    if (state.rewardChoice?.eliminatorPlayerId === sessionId) {
      this.onRewardTimeout();
      this.sendStateToEveryone();
      return;
    }

    if (state.currentTurnPlayerId === sessionId && !this.actionTakenThisTurn) {
      this.runAbsentAutoDraw(sessionId);
      return;
    }

    this.sendStateToEveryone();
  }

  private pauseTimersOwnedBy(sessionId: string): void {
    const state = this.gameState;
    const now = Date.now();

    if (state === null) {
      return;
    }

    if (state.currentTurnPlayerId === sessionId && this.turnDeadlineMs !== null) {
      this.pausedTurnRemainingMs = remainingMs(this.turnDeadlineMs, now);
      this.clearTurnTimer();
    }

    if (state.mirrorChoice?.playerId === sessionId && this.mirrorTimer !== null) {
      this.pausedMirrorRemainingMs = remainingMs(state.mirrorChoice.deadlineMs, now);
      this.clearMirrorTimer();
    }

    if (state.rewardChoice?.eliminatorPlayerId === sessionId && this.rewardTimer !== null) {
      this.pausedRewardRemainingMs = remainingMs(state.rewardChoice.deadlineMs, now);
      this.clearRewardTimer();
    }
  }

  private resumeTimersOwnedBy(sessionId: string): void {
    const state = this.gameState;

    if (state === null || this.winnerPlayerId !== null) {
      return;
    }

    if (
      state.currentTurnPlayerId === sessionId &&
      !this.actionTakenThisTurn &&
      this.pausedTurnRemainingMs !== null
    ) {
      const remaining = this.pausedTurnRemainingMs;
      this.pausedTurnRemainingMs = null;
      this.beginTurnTimer(remaining);
      this.broadcastTurnStarted();
    }

    if (state.mirrorChoice?.playerId === sessionId && this.pausedMirrorRemainingMs !== null) {
      const remaining = this.pausedMirrorRemainingMs;
      this.pausedMirrorRemainingMs = null;
      const client = this.clients.find((entry) => entry.sessionId === sessionId);

      if (client !== undefined) {
        this.beginMirrorTimer(
          client,
          state.mirrorChoice.deadlineMs,
          state.mirrorChoice.eligibleEffectIds,
          remaining,
        );
      }
    }

    if (
      state.rewardChoice?.eliminatorPlayerId === sessionId &&
      this.pausedRewardRemainingMs !== null
    ) {
      const remaining = this.pausedRewardRemainingMs;
      this.pausedRewardRemainingMs = null;
      this.beginRewardTimer(state, remaining);
    }
  }

  private applyLifecycleElimination(
    playerId: string,
    reason: 'absence' | 'inactivity' | 'leave',
  ): void {
    const state = this.gameState;

    if (state === null || this.winnerPlayerId !== null) {
      return;
    }

    if (!eliminateWithoutReward(state, playerId)) {
      return;
    }

    this.rejectReconnection(playerId, new Error('Player eliminated'));
    this.clearAbsentTimer(playerId);
    this.recordElimination({
      playerId,
      eliminatorPlayerId: null,
      reason,
    });

    if (this.finishIfSoleSurvivor(state)) {
      return;
    }

    if (state.currentTurnPlayerId === playerId) {
      this.clearTurnTimer();
      advanceTurn(state);
      this.actionTakenThisTurn = false;
      this.beginTurnOrAbsentAutoPlay();
      this.sendStateToEveryone();
      this.broadcastTurnStarted();
      return;
    }

    this.sendStateToEveryone();
  }

  private finishIfSoleSurvivor(state: GameState): boolean {
    const survivor = findSoleSurvivorId(state);

    if (survivor === null) {
      return false;
    }

    this.clearTurnTimer();
    this.clearMirrorTimer();
    this.clearRewardTimer();
    this.onGameOver(survivor);
    return true;
  }

  private recordElimination(entry: {
    playerId: string;
    eliminatorPlayerId: string | null;
    reason: EliminationReason;
  }): void {
    this.eliminations.push(entry);
    this.actionLog.push({
      kind: 'playerEliminated',
      playerId: entry.playerId,
      eliminatorPlayerId: entry.eliminatorPlayerId,
      reason: entry.reason,
      turnSequence: this.gameState?.turnSequence ?? 0,
    });
    this.broadcast(PLAYER_ELIMINATED, entry);
  }

  /**
   * Sole game-over exit: broadcast, views, then fire-and-forget finished-game write
   * (technical spec §3, L8-02). Write failure must never affect the match.
   * #V3-3b: after persist, dispose the room (bots may have been the only occupants).
   */
  private onGameOver(winnerPlayerId: string): void {
    this.winnerPlayerId = winnerPlayerId;
    this.rejectAllReconnections(new Error('Game over'));
    this.broadcast(GAME_OVER, { winnerPlayerId });
    this.sendStateToEveryone();

    const state = this.gameState;
    const startedAtMs = this.startedAtMs;

    if (state === null || startedAtMs === null) {
      console.warn(`[${this.roomId}] finished-game persist skipped — missing state or start time`);
      this.refreshAutoDispose();
      if (this.clients.length === 0) {
        void this.disconnect();
      }
      return;
    }

    const snapshot = buildFinishedGameSnapshot({
      roomId: this.roomId,
      startedAtMs,
      endedAtMs: Date.now(),
      winnerPlayerId,
      gameState: state,
      actionLog: this.actionLog,
      eliminations: this.eliminations,
      botDifficultiesByPlayerId: this.botDifficulties(),
    });

    void persistFinishedGame(snapshot);
    this.refreshAutoDispose();
    // Humans still need the finished view. Dispose only when no sockets remain (bot-only finish).
    if (this.clients.length === 0) {
      void this.disconnect();
    }
  }

  /**
   * Colyseus disposes empty rooms by default. Mid-game with bots and no sockets must
   * stay alive until game over (#V3-3b). technical spec v3 §4.1 / §11.
   */
  private refreshAutoDispose(): void {
    const keep = shouldKeepRoomAlive({
      hasBots: this.seats.some(isBotSeat),
      hasStarted: this.hasStarted,
      winnerPlayerId: this.winnerPlayerId,
    });
    this.autoDispose = !keep;
  }

  private rejectReconnection(sessionId: string, reason: Error): void {
    const reject = this.reconnectionRejectors.get(sessionId);

    if (reject !== undefined) {
      reject(reason);
      this.reconnectionRejectors.delete(sessionId);
    }
  }

  private rejectAllReconnections(reason: Error): void {
    for (const sessionId of [...this.reconnectionRejectors.keys()]) {
      this.rejectReconnection(sessionId, reason);
    }
  }

  private clearAbsentTimer(sessionId: string): void {
    const timer = this.absentTimers.get(sessionId);

    if (timer !== undefined) {
      clearTimeout(timer);
      this.absentTimers.delete(sessionId);
    }
  }

  private clearAllAbsentTimers(): void {
    for (const sessionId of [...this.absentTimers.keys()]) {
      this.clearAbsentTimer(sessionId);
    }
  }

  private seatViews(): LobbySeatView[] {
    return this.seats.map((seat) => {
      if (isBotSeat(seat)) {
        return {
          id: seat.sessionId,
          nickname: seat.nickname,
          isBot: true,
          botDifficulty: seat.difficulty,
        };
      }

      return {
        id: seat.sessionId,
        nickname: seat.nickname,
        isBot: false,
      };
    });
  }

  private botDifficulties(): ReadonlyMap<string, BotDifficulty> {
    const map = new Map<string, BotDifficulty>();

    for (const seat of this.seats) {
      if (isBotSeat(seat)) {
        map.set(seat.sessionId, seat.difficulty);
      }
    }

    return map;
  }

  private sendStateToEveryone(): void {
    for (const client of this.clients) {
      this.sendStateTo(client);
    }
  }

  private sendStateToEveryoneExcept(excluded: GameClient): void {
    for (const client of this.clients) {
      if (client.sessionId !== excluded.sessionId) {
        this.sendStateTo(client);
      }
    }
  }

  private sendStateTo(client: GameClient): void {
    const hostPlayerId = this.hostSessionId;

    if (!this.hasStarted || this.gameState === null) {
      if (hostPlayerId === null) {
        return;
      }

      client.send(
        STATE_UPDATE,
        buildLobbyViewFor({
          recipientSessionId: client.sessionId,
          gameCode: this.roomId,
          hostPlayerId,
          seats: this.seatViews(),
        }),
      );
      return;
    }

    if (this.winnerPlayerId !== null) {
      client.send(
        STATE_UPDATE,
        buildFinishedViewFor({
          recipientSessionId: client.sessionId,
          gameCode: this.roomId,
          state: this.gameState,
          winnerPlayerId: this.winnerPlayerId,
          actionLog: this.actionLog,
          eliminations: this.eliminations,
          botDifficulties: this.botDifficulties(),
          turnHistory: this.turnHistory,
        }),
      );
      return;
    }

    client.send(
      STATE_UPDATE,
      buildPlayingViewFor({
        recipientSessionId: client.sessionId,
        gameCode: this.roomId,
        state: this.gameState,
        turnDeadlineMs: this.turnDeadlineMs,
        actionLog: this.actionLog,
        botDifficulties: this.botDifficulties(),
      }),
    );
  }

  private async allocateGameCode(): Promise<string> {
    const currentIds = await this.presence.smembers(GAME_CODE_PRESENCE_CHANNEL);
    let code = generateGameCodeCandidate();

    while (currentIds.includes(code)) {
      code = generateGameCodeCandidate();
    }

    await this.presence.sadd(GAME_CODE_PRESENCE_CHANNEL, code);
    return code;
  }
}

function readAddBotPayload(payload: unknown): AddBotPayload | null {
  if (typeof payload !== 'object' || payload === null || !('difficulty' in payload)) {
    return null;
  }

  const difficulty = payload.difficulty;

  if (!isBotDifficulty(difficulty)) {
    return null;
  }

  return { difficulty };
}

function readRemoveBotPayload(payload: unknown): RemoveBotPayload | null {
  if (typeof payload !== 'object' || payload === null || !('playerId' in payload)) {
    return null;
  }

  if (typeof payload.playerId !== 'string' || payload.playerId.length === 0) {
    return null;
  }

  return { playerId: payload.playerId };
}

function readSetBotDifficultyPayload(payload: unknown): SetBotDifficultyPayload | null {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('playerId' in payload) ||
    !('difficulty' in payload)
  ) {
    return null;
  }

  if (typeof payload.playerId !== 'string' || payload.playerId.length === 0) {
    return null;
  }

  if (!isBotDifficulty(payload.difficulty)) {
    return null;
  }

  return { playerId: payload.playerId, difficulty: payload.difficulty };
}

function readProtocolVersion(options: unknown): number | null {
  if (typeof options !== 'object' || options === null || !('protocolVersion' in options)) {
    return null;
  }

  const { protocolVersion } = options;

  return typeof protocolVersion === 'number' ? protocolVersion : null;
}

function readNickname(options: unknown): string | null {
  if (typeof options !== 'object' || options === null || !('nickname' in options)) {
    return null;
  }

  const { nickname } = options;

  if (typeof nickname !== 'string') {
    return null;
  }

  const trimmed = nickname.trim();

  if (trimmed.length === 0 || trimmed.length > 24) {
    return null;
  }

  return trimmed;
}

function readPlayCardPayload(payload: unknown): PlayCardPayload | null {
  if (typeof payload !== 'object' || payload === null || !('instanceId' in payload)) {
    return null;
  }

  const { instanceId } = payload;

  if (typeof instanceId !== 'string' || instanceId.length === 0) {
    return null;
  }

  let targetPlayerId: string | undefined;

  if ('targetPlayerId' in payload) {
    const value = payload.targetPlayerId;

    if (typeof value !== 'string') {
      return null;
    }

    targetPlayerId = value;
  }

  let quantity: number | undefined;

  if ('quantity' in payload) {
    const value = payload.quantity;

    if (typeof value !== 'number' || !Number.isInteger(value)) {
      return null;
    }

    quantity = value;
  }

  return {
    instanceId,
    ...(targetPlayerId !== undefined ? { targetPlayerId } : {}),
    ...(quantity !== undefined ? { quantity } : {}),
  };
}

function readPlayMultipleAttacksPayload(
  payload: unknown,
): PlayMultipleAttacksPayload | null {
  if (typeof payload !== 'object' || payload === null || !('attacks' in payload)) {
    return null;
  }

  const { attacks } = payload;

  if (!Array.isArray(attacks) || attacks.length < 2) {
    return null;
  }

  const parsed: { instanceId: string; targetPlayerId: string }[] = [];

  for (const entry of attacks as unknown[]) {
    if (typeof entry !== 'object' || entry === null) {
      return null;
    }

    if (!('instanceId' in entry) || !('targetPlayerId' in entry)) {
      return null;
    }

    const { instanceId, targetPlayerId } = entry;

    if (
      typeof instanceId !== 'string' ||
      instanceId.length === 0 ||
      typeof targetPlayerId !== 'string' ||
      targetPlayerId.length === 0
    ) {
      return null;
    }

    parsed.push({ instanceId, targetPlayerId });
  }

  return { attacks: parsed };
}

function readBuyCardPayload(payload: unknown): BuyCardPayload | null {
  if (typeof payload !== 'object' || payload === null || !('cardId' in payload)) {
    return null;
  }

  const { cardId } = payload;

  if (typeof cardId !== 'string') {
    return null;
  }

  return { cardId: cardId as CardId };
}

function readSellCardPayload(payload: unknown): SellCardPayload | null {
  if (typeof payload !== 'object' || payload === null || !('instanceId' in payload)) {
    return null;
  }

  const { instanceId } = payload;

  if (typeof instanceId !== 'string' || instanceId.length === 0) {
    return null;
  }

  return { instanceId };
}

function readUpgradeCardPayload(payload: unknown): UpgradeCardPayload | null {
  return readSellCardPayload(payload);
}

function readChooseMirrorTargetPayload(payload: unknown): ChooseMirrorTargetPayload | null {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('pendingEffectId' in payload) ||
    !('newTargetPlayerId' in payload)
  ) {
    return null;
  }

  const { pendingEffectId, newTargetPlayerId } = payload;

  if (typeof pendingEffectId !== 'string' || pendingEffectId.length === 0) {
    return null;
  }

  if (typeof newTargetPlayerId !== 'string' || newTargetPlayerId.length === 0) {
    return null;
  }

  return { pendingEffectId, newTargetPlayerId };
}

function readChooseEliminationRewardPayload(
  payload: unknown,
): ChooseEliminationRewardPayload | null {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('eliminationId' in payload) ||
    !('choices' in payload)
  ) {
    return null;
  }

  const { eliminationId, choices } = payload;

  if (typeof eliminationId !== 'string' || eliminationId.length === 0) {
    return null;
  }

  if (!Array.isArray(choices) || choices.length !== 2) {
    return null;
  }

  const first = readRewardChoice(choices[0]);
  const second = readRewardChoice(choices[1]);

  if (first === null || second === null) {
    return null;
  }

  return { eliminationId, choices: [first, second] };
}

function readRewardChoice(value: unknown): RewardChoice | null {
  if (typeof value !== 'object' || value === null || !('type' in value)) {
    return null;
  }

  const { type } = value;

  if (type === 'lives' || type === 'points' || type === 'upgradePoint') {
    return { type };
  }

  if (type !== 'card' || !('instanceId' in value)) {
    return null;
  }

  const { instanceId } = value;

  if (typeof instanceId !== 'string' || instanceId.length === 0) {
    return null;
  }

  return { type: 'card', instanceId };
}

