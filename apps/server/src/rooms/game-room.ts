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
  CLIENT_READY,
  DRAW_CARD,
  ERROR_MESSAGE,
  GAME_OVER,
  PLAY_CARD,
  PLAYER_ELIMINATED,
  PROTOCOL_VERSION,
  SELL_CARD,
  START_GAME,
  STATE_UPDATE,
  TURN_STARTED,
  type ActionLogEntryView,
  type ActionPlayedPayload,
  type BuyCardPayload,
  type CardId,
  type GameState,
  type LobbySeatView,
  type PlayCardPayload,
  type SellCardPayload,
  type ServerToClientMessages,
} from '@card-battle/shared';
import { ErrorCode, Room, ServerError, type Client } from 'colyseus';

import { createInitialState } from '../engine/create-initial-state';
import { performTurnAction, type TurnAction } from '../engine/turn/perform-action';
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

const TURN_DURATION_MS = 30_000;

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
  private actionLog: ActionLogEntryView[] = [];

  override async onCreate(): Promise<void> {
    this.roomId = await this.allocateGameCode();
    console.log(`[${this.roomId}] room created`);
  }

  override async onDispose(): Promise<void> {
    this.clearTurnTimer();
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
      this.beginTurnTimer();
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

      if (parsed.targetPlayerId === undefined) {
        client.send(ERROR_MESSAGE, { message: 'A target is required.' });
        return;
      }

      this.handleAction(client, {
        type: 'playCard',
        instanceId: parsed.instanceId,
        targetPlayerId: parsed.targetPlayerId,
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

  override onLeave(client: GameClient): void {
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

  private handleAction(client: GameClient, action: TurnAction): void {
    const state = this.gameState;

    if (state === null || this.winnerPlayerId !== null) {
      client.send(ERROR_MESSAGE, { message: 'The game is not in progress.' });
      return;
    }

    if (this.actionTakenThisTurn) {
      client.send(ERROR_MESSAGE, { message: 'You already acted this turn.' });
      return;
    }

    const result = performTurnAction(state, client.sessionId, action);

    if (!result.ok) {
      client.send(ERROR_MESSAGE, { message: result.message });
      return;
    }

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
    };

    this.actionLog.push(played);
    this.broadcast(ACTION_PLAYED, played);

    for (const resolved of result.resolved) {
      this.broadcast(ACTION_RESOLVED, resolved);
    }

    for (const playerId of result.eliminatedPlayerIds) {
      this.broadcast(PLAYER_ELIMINATED, {
        playerId,
        eliminatorPlayerId: null,
      });
    }

    if (result.winnerPlayerId !== null) {
      this.winnerPlayerId = result.winnerPlayerId;
      this.broadcast(GAME_OVER, { winnerPlayerId: result.winnerPlayerId });
      this.sendStateToEveryone();
      return;
    }

    this.actionTakenThisTurn = false;
    this.beginTurnTimer();
    this.sendStateToEveryone();
    this.broadcastTurnStarted();
  }

  private beginTurnTimer(): void {
    this.clearTurnTimer();
    const state = this.gameState;

    if (state?.currentTurnPlayerId === null || state === null) {
      this.turnDeadlineMs = null;
      return;
    }

    this.turnDeadlineMs = Date.now() + TURN_DURATION_MS;
    const activePlayerId = state.currentTurnPlayerId;

    this.turnTimer = setTimeout(() => {
      this.onTurnTimeout(activePlayerId);
    }, TURN_DURATION_MS);
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

    console.log(`[${this.roomId}] turn timeout — auto draw for ${expectedPlayerId}`);
    const client = this.clients.find((entry) => entry.sessionId === expectedPlayerId);

    if (client !== undefined) {
      this.handleAction(client, { type: 'draw' });
      return;
    }

    // Player missing from clients: still advance via engine.
    const result = performTurnAction(state, expectedPlayerId, { type: 'draw' });

    if (!result.ok) {
      return;
    }

    this.actionLog.push(result.actionPlayed);
    this.broadcast(ACTION_PLAYED, result.actionPlayed);

    for (const resolved of result.resolved) {
      this.broadcast(ACTION_RESOLVED, resolved);
    }

    this.actionTakenThisTurn = false;
    this.beginTurnTimer();
    this.sendStateToEveryone();
    this.broadcastTurnStarted();
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

  if (!('targetPlayerId' in payload)) {
    return { instanceId };
  }

  const { targetPlayerId } = payload;

  if (typeof targetPlayerId !== 'string') {
    return null;
  }

  return { instanceId, targetPlayerId };
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
