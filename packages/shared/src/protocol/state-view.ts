/**
 * What a client receives about the game — technical spec §5.1.
 *
 * The server builds one of these **per recipient**. No complete-state type exists to filter.
 */

import type { CardId, CardInstance } from '../domain/card';
import type { KitId } from '../domain/kit';
import type { ConnectionStatus } from '../domain/player';

/** Mirrors `EliminationReason` in messages.ts — kept local to avoid a circular import. */
export type ActionLogEliminationReason = 'combat' | 'absence' | 'inactivity' | 'leave';

/** Mirrors `PublicActionKind` — local copy avoids messages ↔ state-view cycle. */
export type ActionLogPlayedAction =
  | 'draw'
  | 'playCard'
  | 'playMultipleAttacks'
  | 'buyCard'
  | 'sellCard'
  | 'upgradeCard'
  | 'buyUpgradePoint'
  | 'sellUpgradePoint'
  | 'buySpecialCard';

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

/** Public connection slice — technical spec §5.7, L7 / L9-01. Readable by every seat. */
export interface PublicConnectionView {
  status: ConnectionStatus;
  disconnectedAt: number | null;
  automaticTurnsTaken: number;
  consecutiveTimeouts: number;
}

/** Public slice of another player — status only (2026-07-30 rulings). */
export interface PublicPlayerView {
  id: string;
  nickname: string;
  isEliminated: boolean;
  /** True when this player is the recipient — private fields filled below. */
  isYou: boolean;
  connection: PublicConnectionView;
  /**
   * Active persistent specials (Imposition, Points Generator) — public for every seat
   * (developer ruling 2026-08-02). Not Spy-gated.
   */
  activePersistentEffects: readonly PersistentEffectView[];
  /** Filled only when the recipient spies this player (L3-05). */
  spied?: SpiedPlayerView;
}

/**
 * Spy-gated slice of another player — only when the recipient has a Spy relation
 * on them (technical spec §5.1, rules §3).
 *
 * Both levels: kit + full hand/special card lists forever.
 * Base (`kit-and-cards`): frozen resource snapshot from resolve turn.
 * Upgraded (`full-resources`): live lives, points, upgrade points, shield.
 */
export interface SpiedPlayerView {
  kitId: KitId;
  hand: readonly CardInstance[];
  specialCards: readonly CardInstance[];
  /** Live resources — upgraded Spy only. */
  lives?: number;
  points?: number;
  upgradePoints?: number;
  shield?: number;
  /** Frozen resources at first Spy resolve — base Spy. */
  resourcesSnapshot?: {
    lives: number;
    points: number;
    upgradePoints: number;
    shield: number;
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
  /** Own active persistents (also listed on PublicPlayerView for you). */
  activePersistentEffects: readonly PersistentEffectView[];
}

/** Active persistent special on a seat — public (developer ruling 2026-08-02). */
export interface PersistentEffectView {
  id: string;
  cardId: CardId;
  isUpgraded: boolean;
  counter: number | null;
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
 * Spy (base): kit + cards + frozen resource snapshot. Spy (upgraded): kit + cards + live
 * resources (lives, points, upgrade points, shield).
 * Server-only: never `seed`.
 *
 * Developer ruling 2026-07-30: lives and shield are **not** public without Spy
 * (overrides tech §5.1 table for unspied opponents).
 * Hand **card count** is also private — revealed only via Spy (`spied.hand` / specials).
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
  /**
   * Public history since game start (technical spec §7 / L9-02).
   * Discriminated by `kind` — plays, resolutions, elims, Mirror redirects,
   * opaque reward claims. Card identity included on plays (ruling §6.2 #7).
   */
  actionLog: readonly ActionLogEntryView[];
}

/** Played action — same public fields as `actionPlayed` wire payload. */
export interface ActionPlayedLogEntry {
  kind: 'actionPlayed';
  actorPlayerId: string;
  action: ActionLogPlayedAction;
  cardId?: CardId;
  /** Present when `playCard` / multi-attack entries carry upgrade state. */
  isUpgraded?: boolean;
  targetPlayerId?: string;
  attacks?: readonly { cardId: CardId; targetPlayerId: string; isUpgraded: boolean }[];
  turnSequence: number;
}

/** Effect resolution outcome — durable copy of `actionResolved`. */
export interface ActionResolvedLogEntry {
  kind: 'actionResolved';
  effectId: string;
  sourcePlayerId: string;
  targetPlayerId: string;
  cardId: CardId;
  isUpgraded: boolean;
  livesLost: number;
  shieldAbsorbed: number;
  outcome: 'applied' | 'immune' | 'cancelled';
  turnSequence: number;
}

/** Public elimination — durable copy of `playerEliminated`. */
export interface PlayerEliminatedLogEntry {
  kind: 'playerEliminated';
  playerId: string;
  eliminatorPlayerId: string | null;
  reason: ActionLogEliminationReason;
  turnSequence: number;
}

/** Mirror redirected a pending attack onto a new target. */
export interface MirrorRedirectedLogEntry {
  kind: 'mirrorRedirected';
  actorPlayerId: string;
  cardId: CardId;
  previousTargetPlayerId: string;
  newTargetPlayerId: string;
  turnSequence: number;
}

/**
 * Elimination rewards were claimed (or defaulted on timeout).
 * Opaque — never includes the specific picks (L9-02 product ruling).
 */
export interface RewardsClaimedLogEntry {
  kind: 'rewardsClaimed';
  eliminatorPlayerId: string;
  eliminatedPlayerId: string;
  turnSequence: number;
}

export type ActionLogEntryView =
  | ActionPlayedLogEntry
  | ActionResolvedLogEntry
  | PlayerEliminatedLogEntry
  | MirrorRedirectedLogEntry
  | RewardsClaimedLogEntry;

export type ActionLogEntryKind = ActionLogEntryView['kind'];

/** Per-player public aggregates for the end-screen recap (L9-03). */
export interface GameRecapPlayerView {
  playerId: string;
  cardsPlayedCount: number;
  buyCount: number;
  sellCount: number;
  upgradeCount: number;
}

export interface GameRecapEliminationView {
  playerId: string;
  eliminatorPlayerId: string | null;
  reason: ActionLogEliminationReason;
}

/**
 * Public game-over summary — no kits, hands, seed, or private resources
 * (visibility §5.1 / 2026-07-30; L9-03).
 */
export interface GameRecapView {
  turnSequence: number;
  players: readonly GameRecapPlayerView[];
  eliminations: readonly GameRecapEliminationView[];
}

export interface FinishedStateView {
  phase: 'finished';
  you: string;
  gameCode: string;
  winnerPlayerId: string;
  players: readonly PublicPlayerView[];
  recap: GameRecapView;
}

export type StateView = LobbyStateView | PlayingStateView | FinishedStateView;

/** @deprecated Use `StateView`. */
export type PlaceholderStateView = StateView;
