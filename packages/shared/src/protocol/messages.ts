/**
 * The client/server message contract — technical spec §5.2 and §5.3.
 *
 * Spec §5.2 createRoom / joinRoom map to the matchmaker (decisions.md L1-01).
 * `playCard` / `sellCard` / `upgradeCard` key on `instanceId` (Lot 2 ruling).
 */

import type { CardId } from '../domain/card';
import type {
  ChooseEliminationRewardPayload,
  RewardChoiceRequiredPayload,
} from './reward-choice';
import type { StateView } from './state-view';

export const GAME_ROOM_NAME = 'game';

export const STATE_UPDATE = 'stateUpdate';
export const CLIENT_READY = 'clientReady';
export const START_GAME = 'startGame';
export const DRAW_CARD = 'drawCard';
export const PLAY_CARD = 'playCard';
export const PLAY_MULTIPLE_ATTACKS = 'playMultipleAttacks';
export const BUY_CARD = 'buyCard';
export const SELL_CARD = 'sellCard';
export const UPGRADE_CARD = 'upgradeCard';
export const BUY_UPGRADE_POINT = 'buyUpgradePoint';
export const SELL_UPGRADE_POINT = 'sellUpgradePoint';
export const BUY_SPECIAL_CARD = 'buySpecialCard';
export const CHOOSE_MIRROR_TARGET = 'chooseMirrorTarget';
export const CHOOSE_ELIMINATION_REWARD = 'chooseEliminationReward';
export const ERROR_MESSAGE = 'error';
export const TURN_STARTED = 'turnStarted';
export const ACTION_PLAYED = 'actionPlayed';
export const ACTION_RESOLVED = 'actionResolved';
export const PLAYER_ELIMINATED = 'playerEliminated';
export const GAME_OVER = 'gameOver';
export const MIRROR_CHOICE_REQUIRED = 'mirrorChoiceRequired';
export const REWARD_CHOICE_REQUIRED = 'rewardChoiceRequired';

export type {
  ChooseEliminationRewardPayload,
  RewardChoice,
  RewardChoiceRequiredPayload,
} from './reward-choice';

export interface TurnStartedPayload {
  activePlayerId: string;
  deadlineMs: number;
}

export type PublicActionKind =
  | 'draw'
  | 'playCard'
  | 'playMultipleAttacks'
  | 'buyCard'
  | 'sellCard'
  | 'upgradeCard'
  | 'buyUpgradePoint'
  | 'sellUpgradePoint'
  | 'buySpecialCard';

export interface PublicAttackPlay {
  cardId: CardId;
  targetPlayerId: string;
}

export interface ActionPlayedPayload {
  actorPlayerId: string;
  action: PublicActionKind;
  cardId?: CardId;
  targetPlayerId?: string;
  /** Present when action is `playMultipleAttacks` (Assassin). */
  attacks?: readonly PublicAttackPlay[];
  turnSequence: number;
}

export interface ActionResolvedPayload {
  effectId: string;
  sourcePlayerId: string;
  targetPlayerId: string;
  cardId: CardId;
  livesLost: number;
  shieldAbsorbed: number;
  /**
   * Resolve result — L4-03.
   * `immune`: kit `immuneTo` (Untouchable vs Thief/Spy).
   * `cancelled`: mutual attack, Spy/Thief counter, or upgraded Shield block.
   * `applied`: effect ran (damage / steal / Spy grant).
   */
  outcome: 'applied' | 'immune' | 'cancelled';
}

export type EliminationReason = 'combat' | 'absence' | 'inactivity' | 'leave';

export interface PlayerEliminatedPayload {
  playerId: string;
  eliminatorPlayerId: string | null;
  /** Absent from older combat paths until PROTOCOL_VERSION 17 — prefer setting explicitly. */
  reason?: EliminationReason;
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

export interface PlayMultipleAttacksPayload {
  attacks: readonly { instanceId: string; targetPlayerId: string }[];
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

export interface ChooseMirrorTargetPayload {
  pendingEffectId: string;
  newTargetPlayerId: string;
}

export interface MirrorChoiceRequiredPayload {
  eligibleEffectIds: readonly string[];
  deadlineMs: number;
}

export interface ServerToClientMessages {
  [STATE_UPDATE]: StateView;
  [ERROR_MESSAGE]: { message: string };
  [TURN_STARTED]: TurnStartedPayload;
  [ACTION_PLAYED]: ActionPlayedPayload;
  [ACTION_RESOLVED]: ActionResolvedPayload;
  [PLAYER_ELIMINATED]: PlayerEliminatedPayload;
  [GAME_OVER]: GameOverPayload;
  [MIRROR_CHOICE_REQUIRED]: MirrorChoiceRequiredPayload;
  [REWARD_CHOICE_REQUIRED]: RewardChoiceRequiredPayload;
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
  [PLAY_MULTIPLE_ATTACKS]: PlayMultipleAttacksPayload;
  [BUY_CARD]: BuyCardPayload;
  [SELL_CARD]: SellCardPayload;
  [UPGRADE_CARD]: UpgradeCardPayload;
  [BUY_UPGRADE_POINT]: undefined;
  [SELL_UPGRADE_POINT]: undefined;
  [BUY_SPECIAL_CARD]: undefined;
  [CHOOSE_MIRROR_TARGET]: ChooseMirrorTargetPayload;
  [CHOOSE_ELIMINATION_REWARD]: ChooseEliminationRewardPayload;
}
