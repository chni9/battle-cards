/**
 * The client/server message contract — technical spec §5.2 and §5.3.
 *
 * Spec §5.2 createRoom / joinRoom map to the matchmaker (decisions.md L1-01).
 * `playCard` / `sellCard` / `upgradeCard` key on `instanceId` (Lot 2 ruling).
 */

import type { CardId } from '../domain/card';
import type { StateView } from './state-view';

export const GAME_ROOM_NAME = 'game';

export const STATE_UPDATE = 'stateUpdate';
export const CLIENT_READY = 'clientReady';
export const START_GAME = 'startGame';
export const DRAW_CARD = 'drawCard';
export const PLAY_CARD = 'playCard';
export const BUY_CARD = 'buyCard';
export const SELL_CARD = 'sellCard';
export const UPGRADE_CARD = 'upgradeCard';
export const BUY_UPGRADE_POINT = 'buyUpgradePoint';
export const SELL_UPGRADE_POINT = 'sellUpgradePoint';
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

export type PublicActionKind =
  | 'draw'
  | 'playCard'
  | 'buyCard'
  | 'sellCard'
  | 'upgradeCard'
  | 'buyUpgradePoint'
  | 'sellUpgradePoint';

export interface ActionPlayedPayload {
  actorPlayerId: string;
  action: PublicActionKind;
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
  instanceId: string;
  targetPlayerId?: string;
  /** Lives to buy when playing Regeneration (1–4). Ignored for other cards. */
  quantity?: number;
}

export interface BuyCardPayload {
  cardId: CardId;
}

export interface SellCardPayload {
  instanceId: string;
}

export interface UpgradeCardPayload {
  instanceId: string;
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
  [BUY_CARD]: BuyCardPayload;
  [SELL_CARD]: SellCardPayload;
  [UPGRADE_CARD]: UpgradeCardPayload;
  [BUY_UPGRADE_POINT]: undefined;
  [SELL_UPGRADE_POINT]: undefined;
}
