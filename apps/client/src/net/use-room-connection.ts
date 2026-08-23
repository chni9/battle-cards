/**
 * Client connection and intents — technical spec §3, §5, §5.7 (L7 reconnect).
 */

import {
  ACTION_PLAYED,
  ACTION_RESOLVED,
  ADD_BOT,
  BUY_CARD,
  BUY_SPECIAL_CARD,
  BUY_UPGRADE_POINT,
  CHOOSE_KIT,
  DEACTIVATE_PERSISTENT,
  ACTIVATE_DUPLICATION,
  RESOLVE_SUB_CHOICE,
  CLIENT_READY,
  DRAW_CARD,
  ERROR_MESSAGE,
  FORFEIT,
  GAME_OVER,
  GAME_ROOM_NAME,
  SUB_CHOICE_REQUIRED,
  PLAY_CARD,
  PLAY_MULTIPLE_ATTACKS,
  PLAYER_ELIMINATED,
  PROTOCOL_VERSION,
  REMOVE_BOT,
  SELL_CARD,
  SELL_UPGRADE_POINT,
  SET_BOT_DIFFICULTY,
  UPGRADE_CARD,
  START_GAME,
  STATE_UPDATE,
  TURN_STARTED,
  isActionRejectCode,
  type ActionPlayedPayload,
  type ActionRejectCode,
  type ActionResolvedPayload,
  type BotDifficulty,
  type CardId,
  type GameOverPayload,
  type LobbyKitSelection,
  type PlayCardPayload,
  type PlayMultipleAttacksPayload,
  type ResolveSubChoicePayload,
  type RoomJoinOptions,
  type StateView,
  type SubChoiceRequiredPayload,
  type TurnStartedPayload,
} from '@card-battle/shared';
import { Client, type Room } from '@colyseus/sdk';
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { resolveServerUrl } from './resolve-server-url';

const RECONNECT_TOKEN_KEY = 'card-battle:reconnection-token';

/**
 * Colyseus endpoint: `VITE_SERVER_URL` override, localhost:2567 in dev, same-origin
 * `window.location.origin` behind Coolify (no :2567 — proxy serves WS on the page host).
 */
function serverUrl(): string {
  return resolveServerUrl(
    import.meta.env.VITE_SERVER_URL,
    typeof window !== 'undefined'
      ? {
          protocol: window.location.protocol,
          hostname: window.location.hostname,
          origin: window.location.origin,
        }
      : undefined,
  );
}

/** Cover grace + absent reclaim window (manual server-side until elim). */
const RECONNECT_MAX_RETRIES = 120;
const RECONNECT_MAX_DELAY_MS = 5_000;

export type RoomConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'failed';

export interface PlayCardOptions {
  targetPlayerId?: string;
  quantity?: number;
  /** Hand card consumed by Card Transformer (L24-02). */
  consumeInstanceId?: string;
}

/** Protocol ERROR_MESSAGE payload after L39-01 / PROTOCOL 27. */
export interface ActionRejectPayload {
  code: ActionRejectCode;
  message: string;
}

export interface RoomConnection {
  status: RoomConnectionStatus;
  view: StateView | null;
  /** Inline string for home/lobby alerts and connection failures. */
  error: string | null;
  /**
   * Last illegal-action reject (L39-02). Table shows IllegalActionDialog;
   * lobby/home ignore `code` and use `error` / `message`.
   */
  actionReject: ActionRejectPayload | null;
  gameCode: string | null;
  lastTurnStarted: TurnStartedPayload | null;
  lastActionPlayed: ActionPlayedPayload | null;
  lastActionResolved: ActionResolvedPayload | null;
  /** Unicast sub-choice for this client (technical spec v4 §4.4 / L30-03). */
  subChoice: SubChoiceRequiredPayload | null;
  /**
   * Solo create → addBot → startGame in flight (L17-01).
   * App keeps Home visible so Lobby does not flash.
   */
  soloLaunchPending: boolean;
}

export interface StartSoloGameOptions {
  nickname: string;
  opponentCount: 1 | 2 | 3;
  difficulty: BotDifficulty;
  kitSelection?: LobbyKitSelection;
}

const INITIAL: RoomConnection = {
  status: 'idle',
  view: null,
  error: null,
  actionReject: null,
  gameCode: null,
  lastTurnStarted: null,
  lastActionPlayed: null,
  lastActionResolved: null,
  subChoice: null,
  soloLaunchPending: false,
};

export interface UseRoomConnectionResult extends RoomConnection {
  createGame: (nickname: string) => Promise<void>;
  joinGame: (gameCode: string, nickname: string) => Promise<void>;
  leaveGame: () => Promise<void>;
  /** Playing forfeit — send FORFEIT, keep the socket (L43-06). */
  forfeit: () => void;
  /** Dismiss IllegalActionDialog (clears actionReject + inline error). */
  clearActionReject: () => void;
  startGame: () => void;
  startSoloGame: (options: StartSoloGameOptions) => Promise<void>;
  addBot: (difficulty: BotDifficulty) => void;
  removeBot: (playerId: string) => void;
  setBotDifficulty: (playerId: string, difficulty: BotDifficulty) => void;
  chooseKit: (selection: LobbyKitSelection) => void;
  drawCard: () => void;
  playCard: (instanceId: string, options?: PlayCardOptions) => void;
  playMultipleAttacks: (
    attacks: readonly { instanceId: string; targetPlayerId: string }[],
  ) => void;
  resolveSubChoice: (payload: ResolveSubChoicePayload) => void;
  buyCard: (cardId: CardId) => void;
  sellCard: (instanceId: string) => void;
  upgradeCard: (instanceId: string) => void;
  buyUpgradePoint: () => void;
  buySpecialCard: () => void;
  sellUpgradePoint: () => void;
  deactivatePersistent: (effectId: string) => void;
  activateDuplication: () => void;
}

export function useRoomConnection(): UseRoomConnectionResult {
  const [connection, setConnection] = useState<RoomConnection>(INITIAL);
  const roomRef = useRef<Room | null>(null);
  const intentionalLeaveRef = useRef(false);
  const soloLaunchPendingRef = useRef(false);
  const attachRoomRef = useRef<(room: Room) => void>(() => {
    /* assigned below */
  });

  const attachRoom = useCallback((room: Room): void => {
    roomRef.current = room;
    intentionalLeaveRef.current = false;

    room.reconnection.enabled = true;
    room.reconnection.maxRetries = RECONNECT_MAX_RETRIES;
    room.reconnection.maxDelay = RECONNECT_MAX_DELAY_MS;
    room.reconnection.minDelay = 500;

    persistToken(room.reconnectionToken);

    room.onMessage(STATE_UPDATE, (payload: unknown) => {
      if (isStateView(payload)) {
        if (payload.phase === 'playing') {
          persistToken(room.reconnectionToken);
          soloLaunchPendingRef.current = false;
        } else if (payload.phase === 'finished') {
          clearToken();
          soloLaunchPendingRef.current = false;
        }

        setConnection((previous) => ({
          ...previous,
          status: 'connected',
          view: payload,
          // Keep IllegalActionDialog open until dismiss — bot/peer state sync must not close it.
          error: previous.actionReject !== null ? previous.error : null,
          gameCode: payload.gameCode,
          soloLaunchPending:
            previous.soloLaunchPending && payload.phase !== 'playing',
        }));
      }
    });

    room.onMessage(ERROR_MESSAGE, (payload: unknown) => {
      if (isErrorPayload(payload)) {
        if (soloLaunchPendingRef.current) {
          soloLaunchPendingRef.current = false;
          intentionalLeaveRef.current = true;
          clearToken();
          const current = roomRef.current;
          roomRef.current = null;
          if (current !== null) {
            current.reconnection.enabled = false;
            void current.leave(true);
          }
          setConnection({
            ...INITIAL,
            status: 'failed',
            error: payload.message,
            actionReject: payload,
          });
          return;
        }

        setConnection((previous) => ({
          ...previous,
          error: payload.message,
          actionReject: payload,
        }));
      }
    });

    room.onMessage(TURN_STARTED, (payload: unknown) => {
      if (isTurnStarted(payload)) {
        setConnection((previous) => ({
          ...previous,
          lastTurnStarted: payload,
          subChoice: null,
        }));
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

    room.onMessage(SUB_CHOICE_REQUIRED, (payload: unknown) => {
      if (isSubChoiceRequired(payload)) {
        setConnection((previous) => ({ ...previous, subChoice: payload }));
      }
    });

    room.onMessage(PLAYER_ELIMINATED, () => {
      // stateUpdate follows with isEliminated flags
    });

    room.onMessage(GAME_OVER, (payload: unknown) => {
      if (isGameOver(payload)) {
        clearToken();
        setConnection((previous) => ({
          ...previous,
          error: null,
          actionReject: null,
          subChoice: null,
        }));
        void payload;
      }
    });

    room.onError((_code, message) => {
      setConnection((previous) => ({
        ...previous,
        status: 'failed',
        error: message ?? null,
        actionReject: null,
      }));
    });

    room.onDrop(() => {
      if (intentionalLeaveRef.current) {
        return;
      }

      setConnection((previous) => ({
        ...previous,
        status: 'reconnecting',
        error: null,
        actionReject: null,
      }));
    });

    room.onReconnect(() => {
      persistToken(room.reconnectionToken);
      room.send(CLIENT_READY);
      setConnection((previous) => ({
        ...previous,
        status: 'connected',
        error: null,
        actionReject: null,
      }));
    });

    room.onLeave((_code, reason) => {
      roomRef.current = null;

      if (intentionalLeaveRef.current) {
        clearToken();
        setConnection(INITIAL);
        return;
      }

      // Auto-reconnect exhausted — try one more manual reclaim while token is valid.
      const token = readToken();

      if (token !== null) {
        void attemptManualReconnect(token, setConnection, roomRef, (nextRoom) => {
          attachRoomRef.current(nextRoom);
        });
        return;
      }

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

  useEffect(() => {
    attachRoomRef.current = attachRoom;
  }, [attachRoom]);

  const createGame = useCallback(
    async (nickname: string): Promise<void> => {
      intentionalLeaveRef.current = true;
      await leaveCurrent(roomRef);
      intentionalLeaveRef.current = false;
      clearToken();
      setConnection({ ...INITIAL, status: 'connecting' });

      const client = new Client(serverUrl());
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
      intentionalLeaveRef.current = true;
      await leaveCurrent(roomRef);
      intentionalLeaveRef.current = false;
      clearToken();
      setConnection({ ...INITIAL, status: 'connecting' });

      const client = new Client(serverUrl());
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
    intentionalLeaveRef.current = true;
    soloLaunchPendingRef.current = false;
    clearToken();
    const room = roomRef.current;

    if (room !== null) {
      room.reconnection.enabled = false;
      roomRef.current = null;
      await room.leave(true);
    }

    setConnection(INITIAL);
  }, []);

  const forfeit = useCallback((): void => {
    roomRef.current?.send(FORFEIT);
  }, []);

  const clearActionReject = useCallback((): void => {
    setConnection((previous) => ({
      ...previous,
      error: null,
      actionReject: null,
    }));
  }, []);

  const startGame = useCallback((): void => {
    roomRef.current?.send(START_GAME);
  }, []);

  const addBot = useCallback((difficulty: BotDifficulty): void => {
    roomRef.current?.send(ADD_BOT, { difficulty });
  }, []);

  const removeBot = useCallback((playerId: string): void => {
    roomRef.current?.send(REMOVE_BOT, { playerId });
  }, []);

  const setBotDifficulty = useCallback(
    (playerId: string, difficulty: BotDifficulty): void => {
      roomRef.current?.send(SET_BOT_DIFFICULTY, { playerId, difficulty });
    },
    [],
  );

  const chooseKit = useCallback((selection: LobbyKitSelection): void => {
    roomRef.current?.send(CHOOSE_KIT, { kitId: selection });
  }, []);

  const startSoloGame = useCallback(
    async (options: StartSoloGameOptions): Promise<void> => {
      intentionalLeaveRef.current = true;
      await leaveCurrent(roomRef);
      intentionalLeaveRef.current = false;
      clearToken();
      soloLaunchPendingRef.current = true;
      setConnection({ ...INITIAL, status: 'connecting', soloLaunchPending: true });

      const client = new Client(serverUrl());
      const joinOptions: RoomJoinOptions = {
        protocolVersion: PROTOCOL_VERSION,
        nickname: options.nickname.trim(),
      };

      try {
        const room = await client.create(GAME_ROOM_NAME, joinOptions);
        attachRoom(room);

        if (options.kitSelection !== undefined && options.kitSelection !== 'random') {
          room.send(CHOOSE_KIT, { kitId: options.kitSelection });
        }

        for (let index = 0; index < options.opponentCount; index += 1) {
          room.send(ADD_BOT, { difficulty: options.difficulty });
        }

        room.send(START_GAME);
      } catch (error) {
        soloLaunchPendingRef.current = false;
        setConnection({
          ...INITIAL,
          status: 'failed',
          error: describe(error),
          soloLaunchPending: false,
        });
      }
    },
    [attachRoom],
  );

  const drawCard = useCallback((): void => {
    roomRef.current?.send(DRAW_CARD);
  }, []);

  const playCard = useCallback((instanceId: string, options?: PlayCardOptions): void => {
    const payload: PlayCardPayload = {
      instanceId,
      ...(options?.targetPlayerId !== undefined
        ? { targetPlayerId: options.targetPlayerId }
        : {}),
      ...(options?.quantity !== undefined ? { quantity: options.quantity } : {}),
      ...(options?.consumeInstanceId !== undefined
        ? { consumeInstanceId: options.consumeInstanceId }
        : {}),
    };
    roomRef.current?.send(PLAY_CARD, payload);
  }, []);

  const playMultipleAttacks = useCallback(
    (attacks: readonly { instanceId: string; targetPlayerId: string }[]): void => {
      const payload: PlayMultipleAttacksPayload = { attacks };
      roomRef.current?.send(PLAY_MULTIPLE_ATTACKS, payload);
    },
    [],
  );

  const resolveSubChoice = useCallback((payload: ResolveSubChoicePayload): void => {
    roomRef.current?.send(RESOLVE_SUB_CHOICE, payload);
    setConnection((previous) => ({ ...previous, subChoice: null }));
  }, []);

  const buyCard = useCallback((cardId: CardId): void => {
    roomRef.current?.send(BUY_CARD, { cardId });
  }, []);

  const sellCard = useCallback((instanceId: string): void => {
    roomRef.current?.send(SELL_CARD, { instanceId });
  }, []);

  const upgradeCard = useCallback((instanceId: string): void => {
    roomRef.current?.send(UPGRADE_CARD, { instanceId });
  }, []);

  const buyUpgradePoint = useCallback((): void => {
    roomRef.current?.send(BUY_UPGRADE_POINT);
  }, []);

  const buySpecialCard = useCallback((): void => {
    roomRef.current?.send(BUY_SPECIAL_CARD);
  }, []);

  const sellUpgradePoint = useCallback((): void => {
    roomRef.current?.send(SELL_UPGRADE_POINT);
  }, []);

  const deactivatePersistent = useCallback((effectId: string): void => {
    roomRef.current?.send(DEACTIVATE_PERSISTENT, { effectId });
  }, []);

  const activateDuplication = useCallback((): void => {
    roomRef.current?.send(ACTIVATE_DUPLICATION);
  }, []);

  return {
    ...connection,
    createGame,
    joinGame,
    leaveGame,
    forfeit,
    clearActionReject,
    startGame,
    startSoloGame,
    addBot,
    removeBot,
    setBotDifficulty,
    chooseKit,
    drawCard,
    playCard,
    playMultipleAttacks,
    resolveSubChoice,
    buyCard,
    sellCard,
    upgradeCard,
    buyUpgradePoint,
    buySpecialCard,
    sellUpgradePoint,
    deactivatePersistent,
    activateDuplication,
  };
}

async function attemptManualReconnect(
  token: string,
  setConnection: Dispatch<SetStateAction<RoomConnection>>,
  roomRef: { current: Room | null },
  attachRoom: (room: Room) => void,
): Promise<void> {
  setConnection((previous) => ({
    ...previous,
    status: 'reconnecting',
    error: null,
    actionReject: null,
  }));

  const client = new Client(serverUrl());

  try {
    const room = await client.reconnect(token);
    attachRoom(room);
  } catch (error) {
    clearToken();
    roomRef.current = null;
    setConnection({
      ...INITIAL,
      status: 'disconnected',
      error: describe(error),
    });
  }
}

async function leaveCurrent(roomRef: { current: Room | null }): Promise<void> {
  const room = roomRef.current;

  if (room !== null) {
    room.reconnection.enabled = false;
    roomRef.current = null;
    await room.leave(true);
  }
}

function persistToken(token: string): void {
  try {
    sessionStorage.setItem(RECONNECT_TOKEN_KEY, token);
  } catch {
    // sessionStorage may be unavailable
  }
}

function readToken(): string | null {
  try {
    return sessionStorage.getItem(RECONNECT_TOKEN_KEY);
  } catch {
    return null;
  }
}

function clearToken(): void {
  try {
    sessionStorage.removeItem(RECONNECT_TOKEN_KEY);
  } catch {
    // ignore
  }
}

function isStateView(payload: unknown): payload is StateView {
  if (typeof payload !== 'object' || payload === null || !('phase' in payload)) {
    return false;
  }

  const { phase } = payload;

  return phase === 'lobby' || phase === 'playing' || phase === 'finished';
}

function isErrorPayload(payload: unknown): payload is ActionRejectPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'message' in payload &&
    typeof payload.message === 'string' &&
    'code' in payload &&
    isActionRejectCode(payload.code)
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
    'livesLost' in payload &&
    'isUpgraded' in payload &&
    typeof payload.isUpgraded === 'boolean' &&
    'outcome' in payload &&
    (payload.outcome === 'applied' ||
      payload.outcome === 'immune' ||
      payload.outcome === 'cancelled' ||
      payload.outcome === 'blocked')
  );
}

function isSubChoiceRequired(payload: unknown): payload is SubChoiceRequiredPayload {
  if (typeof payload !== 'object' || payload === null || !('kind' in payload)) {
    return false;
  }

  if (!('deadlineMs' in payload) || typeof payload.deadlineMs !== 'number') {
    return false;
  }

  switch (payload.kind) {
    case 'mirror':
      return 'eligibleEffectIds' in payload && Array.isArray(payload.eligibleEffectIds);
    case 'elimination-reward':
      return (
        'eliminationId' in payload &&
        typeof payload.eliminationId === 'string' &&
        'eliminatedPlayerId' in payload &&
        typeof payload.eliminatedPlayerId === 'string' &&
        'availableCards' in payload &&
        Array.isArray(payload.availableCards)
      );
    case 'steal-pick':
      return (
        'victimPlayerId' in payload &&
        typeof payload.victimPlayerId === 'string' &&
        'eligibleInstanceIds' in payload &&
        Array.isArray(payload.eligibleInstanceIds)
      );
    case 'pool-pick':
      return (
        'eligibleInstanceIds' in payload &&
        Array.isArray(payload.eligibleInstanceIds) &&
        'maxCount' in payload &&
        typeof payload.maxCount === 'number'
      );
    case 'special-pick':
      return 'eligibleCardIds' in payload && Array.isArray(payload.eligibleCardIds);
    case 'reanimation-kit':
      return 'eligibleKitIds' in payload && Array.isArray(payload.eligibleKitIds);
    default:
      return false;
  }
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
