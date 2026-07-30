/**
 * Client connection and intents — technical spec §3, §5.
 */

import {
  ACTION_PLAYED,
  ACTION_RESOLVED,
  BUY_CARD,
  BUY_UPGRADE_POINT,
  CLIENT_READY,
  DRAW_CARD,
  ERROR_MESSAGE,
  GAME_OVER,
  GAME_ROOM_NAME,
  PLAY_CARD,
  PLAYER_ELIMINATED,
  PROTOCOL_VERSION,
  SELL_CARD,
  SELL_UPGRADE_POINT,
  START_GAME,
  STATE_UPDATE,
  TURN_STARTED,
  type ActionPlayedPayload,
  type ActionResolvedPayload,
  type CardId,
  type GameOverPayload,
  type RoomJoinOptions,
  type StateView,
  type TurnStartedPayload,
} from '@card-battle/shared';
import { Client, type Room } from '@colyseus/sdk';
import { useCallback, useRef, useState } from 'react';

const DEFAULT_SERVER_URL = 'http://localhost:2567';

export type RoomConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed';

export interface RoomConnection {
  status: RoomConnectionStatus;
  view: StateView | null;
  error: string | null;
  gameCode: string | null;
  lastTurnStarted: TurnStartedPayload | null;
  lastActionPlayed: ActionPlayedPayload | null;
  lastActionResolved: ActionResolvedPayload | null;
}

const INITIAL: RoomConnection = {
  status: 'idle',
  view: null,
  error: null,
  gameCode: null,
  lastTurnStarted: null,
  lastActionPlayed: null,
  lastActionResolved: null,
};

export interface UseRoomConnectionResult extends RoomConnection {
  createGame: (nickname: string) => Promise<void>;
  joinGame: (gameCode: string, nickname: string) => Promise<void>;
  leaveGame: () => Promise<void>;
  startGame: () => void;
  drawCard: () => void;
  playCard: (instanceId: string, targetPlayerId: string) => void;
  buyCard: (cardId: CardId) => void;
  sellCard: (instanceId: string) => void;
  buyUpgradePoint: () => void;
  sellUpgradePoint: () => void;
}

export function useRoomConnection(): UseRoomConnectionResult {
  const [connection, setConnection] = useState<RoomConnection>(INITIAL);
  const roomRef = useRef<Room | null>(null);

  const attachRoom = useCallback((room: Room): void => {
    roomRef.current = room;

    room.onMessage(STATE_UPDATE, (payload: unknown) => {
      if (isStateView(payload)) {
        setConnection((previous) => ({
          ...previous,
          status: 'connected',
          view: payload,
          error: null,
          gameCode: payload.gameCode,
        }));
      }
    });

    room.onMessage(ERROR_MESSAGE, (payload: unknown) => {
      if (isErrorPayload(payload)) {
        setConnection((previous) => ({ ...previous, error: payload.message }));
      }
    });

    room.onMessage(TURN_STARTED, (payload: unknown) => {
      if (isTurnStarted(payload)) {
        setConnection((previous) => ({ ...previous, lastTurnStarted: payload }));
      }
    });

    room.onMessage(ACTION_PLAYED, (payload: unknown) => {
      if (isActionPlayed(payload)) {
        setConnection((previous) => ({ ...previous, lastActionPlayed: payload }));
      }
    });

    room.onMessage(ACTION_RESOLVED, (payload: unknown) => {
      if (isActionResolved(payload)) {
        setConnection((previous) => ({ ...previous, lastActionResolved: payload }));
      }
    });

    room.onMessage(PLAYER_ELIMINATED, () => {
      // stateUpdate follows with isEliminated flags
    });

    room.onMessage(GAME_OVER, (payload: unknown) => {
      if (isGameOver(payload)) {
        setConnection((previous) => ({
          ...previous,
          // view will arrive via stateUpdate; keep winner visible if needed
          error: null,
        }));
        void payload;
      }
    });

    room.onError((_code, message) => {
      setConnection((previous) => ({
        ...previous,
        status: 'failed',
        error: message ?? null,
      }));
    });

    room.onLeave((_code, reason) => {
      roomRef.current = null;
      setConnection({
        ...INITIAL,
        status: 'disconnected',
        error: reason ?? null,
      });
    });

    setConnection((previous) => ({
      ...previous,
      status: 'connected',
      gameCode: room.roomId,
    }));

    room.send(CLIENT_READY);
  }, []);

  const createGame = useCallback(
    async (nickname: string): Promise<void> => {
      await leaveCurrent(roomRef);
      setConnection({ ...INITIAL, status: 'connecting' });

      const client = new Client(import.meta.env.VITE_SERVER_URL ?? DEFAULT_SERVER_URL);
      const options: RoomJoinOptions = {
        protocolVersion: PROTOCOL_VERSION,
        nickname: nickname.trim(),
      };

      try {
        const room = await client.create(GAME_ROOM_NAME, options);
        attachRoom(room);
      } catch (error) {
        setConnection({ ...INITIAL, status: 'failed', error: describe(error) });
      }
    },
    [attachRoom],
  );

  const joinGame = useCallback(
    async (gameCode: string, nickname: string): Promise<void> => {
      await leaveCurrent(roomRef);
      setConnection({ ...INITIAL, status: 'connecting' });

      const client = new Client(import.meta.env.VITE_SERVER_URL ?? DEFAULT_SERVER_URL);
      const options: RoomJoinOptions = {
        protocolVersion: PROTOCOL_VERSION,
        nickname: nickname.trim(),
      };

      try {
        const room = await client.joinById(gameCode.trim().toUpperCase(), options);
        attachRoom(room);
      } catch (error) {
        setConnection({ ...INITIAL, status: 'failed', error: describe(error) });
      }
    },
    [attachRoom],
  );

  const leaveGame = useCallback(async (): Promise<void> => {
    await leaveCurrent(roomRef);
    setConnection(INITIAL);
  }, []);

  const startGame = useCallback((): void => {
    roomRef.current?.send(START_GAME);
  }, []);

  const drawCard = useCallback((): void => {
    roomRef.current?.send(DRAW_CARD);
  }, []);

  const playCard = useCallback((instanceId: string, targetPlayerId: string): void => {
    roomRef.current?.send(PLAY_CARD, { instanceId, targetPlayerId });
  }, []);

  const buyCard = useCallback((cardId: CardId): void => {
    roomRef.current?.send(BUY_CARD, { cardId });
  }, []);

  const sellCard = useCallback((instanceId: string): void => {
    roomRef.current?.send(SELL_CARD, { instanceId });
  }, []);

  const buyUpgradePoint = useCallback((): void => {
    roomRef.current?.send(BUY_UPGRADE_POINT);
  }, []);

  const sellUpgradePoint = useCallback((): void => {
    roomRef.current?.send(SELL_UPGRADE_POINT);
  }, []);

  return {
    ...connection,
    createGame,
    joinGame,
    leaveGame,
    startGame,
    drawCard,
    playCard,
    buyCard,
    sellCard,
    buyUpgradePoint,
    sellUpgradePoint,
  };
}

async function leaveCurrent(roomRef: { current: Room | null }): Promise<void> {
  const room = roomRef.current;

  if (room !== null) {
    roomRef.current = null;
    await room.leave();
  }
}

function isStateView(payload: unknown): payload is StateView {
  if (typeof payload !== 'object' || payload === null || !('phase' in payload)) {
    return false;
  }

  const { phase } = payload;

  return phase === 'lobby' || phase === 'playing' || phase === 'finished';
}

function isErrorPayload(payload: unknown): payload is { message: string } {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'message' in payload &&
    typeof payload.message === 'string'
  );
}

function isTurnStarted(payload: unknown): payload is TurnStartedPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'activePlayerId' in payload &&
    'deadlineMs' in payload &&
    typeof payload.activePlayerId === 'string' &&
    typeof payload.deadlineMs === 'number'
  );
}

function isActionPlayed(payload: unknown): payload is ActionPlayedPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'actorPlayerId' in payload &&
    'action' in payload &&
    'turnSequence' in payload
  );
}

function isActionResolved(payload: unknown): payload is ActionResolvedPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'effectId' in payload &&
    'livesLost' in payload
  );
}

function isGameOver(payload: unknown): payload is GameOverPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'winnerPlayerId' in payload &&
    typeof payload.winnerPlayerId === 'string'
  );
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not reach the server';
}
