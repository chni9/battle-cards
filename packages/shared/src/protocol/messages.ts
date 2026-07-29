/**
 * The client/server message contract — technical spec §5.2 and §5.3.
 *
 * Spec §5.2 createRoom / joinRoom map to the matchmaker (decisions.md L1-01).
 */

import type { CardId } from '../domain/card';
import type { StateView } from './state-view';

export const GAME_ROOM_NAME = 'game';

export const STATE_UPDATE = 'stateUpdate';
export const CLIENT_READY = 'clientReady';
export const START_GAME = 'startGame';
export const DRAW_CARD = 'drawCard';
export const PLAY_CARD = 'playCard';
export const ERROR_MESSAGE = 'error';
export const TURN_STARTED = 'turnStarted';
export const ACTION_PLAYED = 'actionPlayed';
export const ACTION_RESOLVED = 'actionResolved';
export const PLAYER_ELIMINATED = 'playerEliminated';
export const GAME_OVER = 'gameOver';

export interface TurnStartedPayload {
  activePlayerId: string;
  deadlineMs: number;
}

export interface ActionPlayedPayload {
  actorPlayerId: string;
  action: 'draw' | 'playCard';
  cardId?: CardId;
  targetPlayerId?: string;
  turnSequence: number;
}

export interface ActionResolvedPayload {
  effectId: string;
  sourcePlayerId: string;
  targetPlayerId: string;
  cardId: CardId;
  livesLost: number;
  shieldAbsorbed: number;
}

export interface PlayerEliminatedPayload {
  playerId: string;
  eliminatorPlayerId: string | null;
}

export interface GameOverPayload {
  winnerPlayerId: string;
}

export interface PlayCardPayload {
  cardId: CardId;
  targetPlayerId?: string;
}

export interface ServerToClientMessages {
  [STATE_UPDATE]: StateView;
  [ERROR_MESSAGE]: { message: string };
  [TURN_STARTED]: TurnStartedPayload;
  [ACTION_PLAYED]: ActionPlayedPayload;
  [ACTION_RESOLVED]: ActionResolvedPayload;
  [PLAYER_ELIMINATED]: PlayerEliminatedPayload;
  [GAME_OVER]: GameOverPayload;
}

export interface RoomJoinOptions {
  protocolVersion: number;
  nickname: string;
}

export type JoinRoomOptions = RoomJoinOptions;

export interface ClientToServerMessages {
  [CLIENT_READY]: undefined;
  [START_GAME]: undefined;
  [DRAW_CARD]: undefined;
  [PLAY_CARD]: PlayCardPayload;
}
