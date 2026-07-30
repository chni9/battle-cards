/**
 * What a client receives about the game — technical spec §5.1.
 *
 * The server builds one of these **per recipient**. No complete-state type exists to filter.
 */

import type { CardId, CardInstance } from '../domain/card';
import type { KitId } from '../domain/kit';

/** A seated player as seen in the lobby — nicknames are public once joined. */
export interface LobbySeatView {
  id: string;
  nickname: string;
}

/**
 * Lobby view (L1-01). No hands or resources: the game has not started.
 */
export interface LobbyStateView {
  phase: 'lobby';
  you: string;
  gameCode: string;
  hostPlayerId: string;
  players: readonly LobbySeatView[];
}

/** Public slice of another player — status only (2026-07-30 rulings). */
export interface PublicPlayerView {
  id: string;
  nickname: string;
  isEliminated: boolean;
  /** True when this player is the recipient — private fields filled below. */
  isYou: boolean;
  /** Filled only when the recipient spies this player (L3-05). */
  spied?: SpiedPlayerView;
}

/**
 * Spy-gated slice of another player — only when the recipient has a Spy relation
 * on them (technical spec §5.1).
 *
 * Both levels: kit + full hand/special card lists forever.
 * Base (`kit-and-cards`): also a frozen points snapshot from resolve turn.
 * Upgraded (`full-resources`): also live points (developer ruling: tokens = points).
 */
export interface SpiedPlayerView {
  kitId: KitId;
  hand: readonly CardInstance[];
  specialCards: readonly CardInstance[];
  /** Live points — upgraded Spy only. */
  points?: number;
  /** Frozen points at first Spy resolve — base Spy (always shown when present). */
  pointsSnapshot?: {
    points: number;
    turnSequence: number;
  };
}

/** Private resources — only on the recipient's own entry. */
export interface PrivateSelfView {
  lives: number;
  shield: number;
  shieldIsUpgraded: boolean;
  points: number;
  upgradePoints: number;
  kitId: KitId;
  hand: readonly CardInstance[];
  specialCards: readonly CardInstance[];
}

export interface PendingEffectView {
  id: string;
  sourcePlayerId: string;
  targetPlayerId: string;
  cardId: CardId;
  isUpgraded: boolean;
  queuedAt: number;
  damageMultiplier: number;
}

/**
 * Playing view (L1-09). Built per recipient.
 *
 * Private: own kit, hand, lives, shield, exact resources.
 * Public: card count, elimination status, pending queue, turn order, actions.
 * Spy (base): kit + cards + frozen points snapshot. Spy (upgraded): kit + cards + live points.
 * Server-only: never `seed`.
 *
 * Developer ruling 2026-07-30: lives and shield are **not** public (overrides tech §5.1
 * table for those two fields until kits / playtest revisits).
 * Developer ruling 2026-07-30 (evening): hand **card count** is also private — revealed
 * only via Spy (`spied.hand` / `spied.specialCards`).
 */
export interface PlayingStateView {
  phase: 'playing';
  you: string;
  gameCode: string;
  currentTurnPlayerId: string | null;
  turnSequence: number;
  turnOrder: readonly string[];
  /** Absolute deadline epoch ms for the current turn, or null if none. */
  turnDeadlineMs: number | null;
  players: readonly PublicPlayerView[];
  /** Present only for the recipient. */
  self: PrivateSelfView;
  pendingEffects: readonly PendingEffectView[];
  /** Public action log entries (card identity included — ruling §6.2 #7). */
  actionLog: readonly ActionLogEntryView[];
}

export interface ActionLogEntryView {
  actorPlayerId: string;
  action:
    | 'draw'
    | 'playCard'
    | 'playMultipleAttacks'
    | 'buyCard'
    | 'sellCard'
    | 'upgradeCard'
    | 'buyUpgradePoint'
    | 'sellUpgradePoint';
  cardId?: CardId;
  targetPlayerId?: string;
  attacks?: readonly { cardId: CardId; targetPlayerId: string }[];
  turnSequence: number;
}

export interface FinishedStateView {
  phase: 'finished';
  you: string;
  gameCode: string;
  winnerPlayerId: string;
  players: readonly PublicPlayerView[];
}

export type StateView = LobbyStateView | PlayingStateView | FinishedStateView;

/** @deprecated Use `StateView`. */
export type PlaceholderStateView = StateView;
