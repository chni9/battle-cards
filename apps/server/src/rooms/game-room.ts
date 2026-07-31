/**
 * The game room — technical spec §3, §5.
 *
 * Colyseus is transport only. Authoritative GameState is a plain object; each client gets
 * its own stateUpdate. See docs/agent/decisions.md.
 */

import {
  ACTION_PLAYED,
  ACTION_RESOLVED,
  BUY_CARD,
  BUY_SPECIAL_CARD,
  BUY_UPGRADE_POINT,
  CHOOSE_ELIMINATION_REWARD,
  CHOOSE_MIRROR_TARGET,
  CLIENT_READY,
  DRAW_CARD,
  ERROR_MESSAGE,
  GAME_OVER,
  MIRROR_CHOICE_REQUIRED,
  PLAY_CARD,
  PLAY_MULTIPLE_ATTACKS,
  PLAYER_ELIMINATED,
  PROTOCOL_VERSION,
  REWARD_CHOICE_REQUIRED,
  SELL_CARD,
  SELL_UPGRADE_POINT,
  UPGRADE_CARD,
  START_GAME,
  STATE_UPDATE,
  TURN_STARTED,
  type ActionLogEntryView,
  type ActionPlayedPayload,
  type BuyCardPayload,
  type CardId,
  type ChooseEliminationRewardPayload,
  type ChooseMirrorTargetPayload,
  type GameState,
  type LobbySeatView,
  type PlayCardPayload,
  type PlayMultipleAttacksPayload,
  type RewardChoice,
  type SellCardPayload,
  type UpgradeCardPayload,
  type ServerToClientMessages,
} from '@card-battle/shared';
import { CloseCode, ErrorCode, Room, ServerError, type Client } from 'colyseus';

import { createInitialState } from '../engine/create-initial-state';
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
  canStartGame,
  MAX_PLAYERS,
  startGameRejectionMessage,
} from './lobby-rules';

type GameClient = Client<{ messages: ServerToClientMessages }>;

interface Seat {
  sessionId: string;
  nickname: string;
}

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
  private actionTakenThisTurn = false;
  private turnDeadlineMs: number | null = null;
  private turnTimer: ReturnType<typeof setTimeout> | null = null;
  private mirrorTimer: ReturnType<typeof setTimeout> | null = null;
  private rewardTimer: ReturnType<typeof setTimeout> | null = null;
  private actionLog: ActionLogEntryView[] = [];
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
      this.gameState = createInitialState({
        seats: this.seats.map((seat) => ({ id: seat.sessionId, nickname: seat.nickname })),
      });
      this.actionTakenThisTurn = false;
      this.actionLog = [];
      void this.lock();
      console.log(
        `[${this.roomId}] game started — ${this.gameState.players.map((player) => player.nickname).join(', ')}`,
      );
      this.beginTurnOrAbsentAutoPlay();
      this.sendStateToEveryone();
      this.broadcastTurnStarted();
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

    this.seats.push({ sessionId: client.sessionId, nickname });
    this.hostSessionId ??= client.sessionId;

    console.log(
      `[${this.roomId}] ${nickname} (${client.sessionId}) joined — ${this.seats.length} seated`,
    );

    if (this.clients.length >= this.maxClients) {
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

    if (!this.hasStarted && this.clients.length < this.maxClients) {
      void this.unlock();
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
    this.broadcast(PLAYER_ELIMINATED, {
      playerId: sessionId,
      eliminatorPlayerId: null,
      reason: 'leave',
    });

    if (this.finishIfSoleSurvivor(state)) {
      return;
    }

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

    const result = performTurnAction(state, client.sessionId, action);

    if (!result.ok) {
      client.send(ERROR_MESSAGE, { message: result.message });
      return;
    }

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
    this.continueAfterRewards(result);
  }

  private applyTurnResult(result: TurnResult): void {
    this.actionTakenThisTurn = true;
    this.clearTurnTimer();

    const played: ActionPlayedPayload = {
      actorPlayerId: result.actionPlayed.actorPlayerId,
      action: result.actionPlayed.action,
      turnSequence: result.actionPlayed.turnSequence,
      ...(result.actionPlayed.cardId !== undefined
        ? { cardId: result.actionPlayed.cardId }
        : {}),
      ...(result.actionPlayed.targetPlayerId !== undefined
        ? { targetPlayerId: result.actionPlayed.targetPlayerId }
        : {}),
      ...(result.actionPlayed.attacks !== undefined
        ? { attacks: result.actionPlayed.attacks }
        : {}),
    };

    this.actionLog.push(played);
    this.broadcast(ACTION_PLAYED, played);

    for (const resolved of result.resolved) {
      this.broadcast(ACTION_RESOLVED, resolved);
    }

    for (const playerId of result.eliminatedPlayerIds) {
      const elimination = result.eliminations.find((entry) => entry.playerId === playerId);

      this.rejectReconnection(playerId, new Error('Player eliminated'));
      this.clearAbsentTimer(playerId);
      this.broadcast(PLAYER_ELIMINATED, {
        playerId,
        eliminatorPlayerId: elimination?.eliminatorPlayerId ?? null,
        reason: 'combat',
      });
    }

    if (result.winnerPlayerId !== null) {
      this.winnerPlayerId = result.winnerPlayerId;
      this.rejectAllReconnections(new Error('Game over'));
      this.broadcast(GAME_OVER, { winnerPlayerId: result.winnerPlayerId });
      this.sendStateToEveryone();
      return;
    }

    this.actionTakenThisTurn = false;
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
    this.sendRewardChoiceRequired(state);

    const choice = state.rewardChoice;

    if (choice === null) {
      return;
    }

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

    const client = this.clients.find((entry) => entry.sessionId === choice.eliminatorPlayerId);

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
      this.winnerPlayerId = result.winnerPlayerId;
      this.rejectAllReconnections(new Error('Game over'));
      this.broadcast(GAME_OVER, { winnerPlayerId: result.winnerPlayerId });
      this.sendStateToEveryone();
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
   * Start the turn timer, or immediately auto-draw if the active seat is absent.
   * technical spec §5.7.
   */
  private beginTurnOrAbsentAutoPlay(): void {
    const state = this.gameState;

    if (state?.currentTurnPlayerId == null) {
      this.turnDeadlineMs = null;
      return;
    }

    const active = findPlayer(state, state.currentTurnPlayerId);

    if (active?.connectionState.status === 'absent') {
      this.runAbsentAutoDraw(active.id);
      return;
    }

    if (active?.connectionState.status === 'disconnected') {
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

  private performAutoDraw(playerId: string): void {
    const state = this.gameState;

    if (state === null) {
      return;
    }

    const result = performTurnAction(state, playerId, { type: 'draw' });

    if (!result.ok) {
      return;
    }

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

  private runAbsentAutoDraw(playerId: string): void {
    const state = this.gameState;

    if (state === null || this.winnerPlayerId !== null) {
      return;
    }

    const player = findPlayer(state, playerId);

    if (player === undefined || player.isEliminated) {
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

    if (activePlayerId === null || activePlayerId === undefined || deadlineMs === null) {
      return;
    }

    this.broadcast(TURN_STARTED, { activePlayerId, deadlineMs });
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
    this.broadcast(PLAYER_ELIMINATED, {
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

    this.winnerPlayerId = survivor;
    this.rejectAllReconnections(new Error('Game over'));
    this.clearTurnTimer();
    this.clearMirrorTimer();
    this.clearRewardTimer();
    this.broadcast(GAME_OVER, { winnerPlayerId: survivor });
    this.sendStateToEveryone();
    return true;
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
    return this.seats.map((seat) => ({ id: seat.sessionId, nickname: seat.nickname }));
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

