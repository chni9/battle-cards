/**
 * Client connection and intents — technical spec §3, §5.
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
  GAME_ROOM_NAME,
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
  type ActionPlayedPayload,
  type ActionResolvedPayload,
  type CardId,
  type ChooseEliminationRewardPayload,
  type GameOverPayload,
  type MirrorChoiceRequiredPayload,
  type PlayCardPayload,
  type PlayMultipleAttacksPayload,
  type RewardChoice,
  type RewardChoiceRequiredPayload,
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

export interface PlayCardOptions {
  targetPlayerId?: string;
  quantity?: number;
}

export interface RoomConnection {
  status: RoomConnectionStatus;
  view: StateView | null;
  error: string | null;
  gameCode: string | null;
  lastTurnStarted: TurnStartedPayload | null;
  lastActionPlayed: ActionPlayedPayload | null;
  lastActionResolved: ActionResolvedPayload | null;
  /** Set when the server asks this client for a Mirror redirect (L3-09). */
  mirrorChoice: MirrorChoiceRequiredPayload | null;
  /** Set when the server asks this client for an elimination reward (Lot 6). */
  rewardChoice: RewardChoiceRequiredPayload | null;
}

const INITIAL: RoomConnection = {
  status: 'idle',
  view: null,
  error: null,
  gameCode: null,
  lastTurnStarted: null,
  lastActionPlayed: null,
  lastActionResolved: null,
  mirrorChoice: null,
  rewardChoice: null,
};

export interface UseRoomConnectionResult extends RoomConnection {
  createGame: (nickname: string) => Promise<void>;
  joinGame: (gameCode: string, nickname: string) => Promise<void>;
  leaveGame: () => Promise<void>;
  startGame: () => void;
  drawCard: () => void;
  playCard: (instanceId: string, options?: PlayCardOptions) => void;
  playMultipleAttacks: (
    attacks: readonly { instanceId: string; targetPlayerId: string }[],
  ) => void;
  chooseMirrorTarget: (pendingEffectId: string, newTargetPlayerId: string) => void;
  chooseEliminationReward: (
    eliminationId: string,
    choices: [RewardChoice, RewardChoice],
  ) => void;
  buyCard: (cardId: CardId) => void;
  sellCard: (instanceId: string) => void;
  upgradeCard: (instanceId: string) => void;
  buyUpgradePoint: () => void;
  buySpecialCard: () => void;
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
        setConnection((previous) => ({
          ...previous,
          lastTurnStarted: payload,
          // Mirror / reward sub-choices end before the next turn starts (play or expiry).
          mirrorChoice: null,
          rewardChoice: null,
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

    room.onMessage(MIRROR_CHOICE_REQUIRED, (payload: unknown) => {
      if (isMirrorChoiceRequired(payload)) {
        setConnection((previous) => ({ ...previous, mirrorChoice: payload }));
      }
    });

    room.onMessage(REWARD_CHOICE_REQUIRED, (payload: unknown) => {
      if (isRewardChoiceRequired(payload)) {
        setConnection((previous) => ({ ...previous, rewardChoice: payload }));
      }
    });

    room.onMessage(PLAYER_ELIMINATED, () => {
      // stateUpdate follows with isEliminated flags
    });

    room.onMessage(GAME_OVER, (payload: unknown) => {
      if (isGameOver(payload)) {
        setConnection((previous) => ({
          ...previous,
          error: null,
          mirrorChoice: null,
          rewardChoice: null,
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

  const playCard = useCallback((instanceId: string, options?: PlayCardOptions): void => {
    const payload: PlayCardPayload = {
      instanceId,
      ...(options?.targetPlayerId !== undefined
        ? { targetPlayerId: options.targetPlayerId }
        : {}),
      ...(options?.quantity !== undefined ? { quantity: options.quantity } : {}),
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

  const chooseMirrorTarget = useCallback(
    (pendingEffectId: string, newTargetPlayerId: string): void => {
      roomRef.current?.send(CHOOSE_MIRROR_TARGET, {
        pendingEffectId,
        newTargetPlayerId,
      });
      setConnection((previous) => ({ ...previous, mirrorChoice: null }));
    },
    [],
  );

  const chooseEliminationReward = useCallback(
    (eliminationId: string, choices: [RewardChoice, RewardChoice]): void => {
      const payload: ChooseEliminationRewardPayload = { eliminationId, choices };
      roomRef.current?.send(CHOOSE_ELIMINATION_REWARD, payload);
      setConnection((previous) => ({ ...previous, rewardChoice: null }));
    },
    [],
  );

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

  return {
    ...connection,
    createGame,
    joinGame,
    leaveGame,
    startGame,
    drawCard,
    playCard,
    playMultipleAttacks,
    chooseMirrorTarget,
    chooseEliminationReward,
    buyCard,
    sellCard,
    upgradeCard,
    buyUpgradePoint,
    buySpecialCard,
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
    'livesLost' in payload &&
    'outcome' in payload &&
    (payload.outcome === 'applied' ||
      payload.outcome === 'immune' ||
      payload.outcome === 'cancelled')
  );
}

function isMirrorChoiceRequired(payload: unknown): payload is MirrorChoiceRequiredPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'eligibleEffectIds' in payload &&
    'deadlineMs' in payload &&
    Array.isArray(payload.eligibleEffectIds) &&
    typeof payload.deadlineMs === 'number'
  );
}

function isRewardChoiceRequired(payload: unknown): payload is RewardChoiceRequiredPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'eliminationId' in payload &&
    'eliminatedPlayerId' in payload &&
    'availableCards' in payload &&
    'deadlineMs' in payload &&
    typeof payload.eliminationId === 'string' &&
    typeof payload.eliminatedPlayerId === 'string' &&
    Array.isArray(payload.availableCards) &&
    typeof payload.deadlineMs === 'number'
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
