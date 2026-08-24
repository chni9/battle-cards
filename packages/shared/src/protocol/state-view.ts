/**
 * What a client receives about the game — technical spec §5.1.
 *
 * The server builds one of these **per recipient**. No complete-state type exists to filter.
 */

import type { ActionResolutionOutcome } from './action-outcome';
import type { CardId, CardInstance } from '../domain/card';
import type { BotDecisionReason, BotDifficulty } from '../domain/bot';
import type { PendingEffectRedirectSource } from '../domain/effect';
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
  | 'buySpecialCard'
  | 'deactivatePersistent'
  | 'activateDuplication';

/** A seated player as seen in the lobby — nicknames are public once joined. */
export interface LobbySeatView {
  id: string;
  nickname: string;
  /** True for virtual bot seats (PROTOCOL_VERSION 21). */
  isBot: boolean;
  /** Present only when `isBot` is true. */
  botDifficulty?: BotDifficulty;
}

/**
 * Lobby kit pick (PROTOCOL_VERSION 30 / L49-01). `'random'` is the default and
 * matches rules spec §4 until the player confirms a catalog kit. Never placed
 * on `LobbySeatView` — opponents must not see another seat's choice.
 */
export type LobbyKitSelection = KitId | 'random';

/**
 * Lobby view (L1-01). No hands or resources: the game has not started.
 */
export interface LobbyStateView {
  phase: 'lobby';
  you: string;
  gameCode: string;
  hostPlayerId: string;
  players: readonly LobbySeatView[];
  /**
   * Recipient's own lobby kit pick only (PROTOCOL_VERSION 30).
   * Other seats' choices are omitted from this view entirely.
   */
  yourKitSelection: LobbyKitSelection;
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
  /** Virtual bot seat (PROTOCOL_VERSION 21). Visible to every recipient. */
  isBot: boolean;
  /** Present only when `isBot` is true. */
  botDifficulty?: BotDifficulty;
  connection: PublicConnectionView;
  /**
   * Active persistent specials (Imposition, Points Generator) — public for every seat
   * (developer ruling 2026-08-02). Not Spy-gated.
   */
  activePersistentEffects: readonly PersistentEffectView[];
  /**
   * Combat Shield is up (`Player.shield > 0`). Remaining points stay private;
   * only presence + upgrade tier are public so it can render as an active card
   * (PROTOCOL_VERSION 20). `null` when no shield.
   */
  activeShield: { isUpgraded: boolean } | null;
  /**
   * Consecutive turns remaining (Block) — public for every seat (technical spec v4 §5.1).
   * 0 when inactive.
   */
  blockTurnsRemaining: number;
  /**
   * Block attack ban active (L25-01). Public so opponents know why attacks are illegal.
   * True on the last chain turn even when `blockTurnsRemaining` is already 0.
   */
  blockAttacksForbidden: boolean;
  /**
   * Attack Thief block armed (`Player.attackBlockCharges > 0`). Exact count stays
   * private on `PrivateSelfView` (technical spec v4 §5.1 / L23-03). `null` when none.
   */
  activeAttackBlock: true | null;
  /**
   * Duplicator anticipatory window active (rules spec §4 / L28-02).
   * Spy-gated (designer 2026-08-06): true only for the seat itself (`isYou`) or when
   * the recipient spies this player; otherwise always `false`.
   */
  duplicationActive: boolean;
  /**
   * Revive queued after elim consumed armed Reanimation (#V4-12 / L26). Public so
   * the table knows the match is not over. `null` when none.
   */
  pendingReanimation: { isUpgraded: boolean } | null;
  /**
   * Eliminated seat still in the Absorber last-turn window (PROTOCOL_VERSION 25).
   * Always `false` while living.
   */
  absorbWindowOpen: boolean;
  /** Filled only when the recipient spies this player (L3-05). */
  spied?: SpiedPlayerView;
  /**
   * Death-time freeze of kit / cards / tokens — present when `isEliminated`
   * (PROTOCOL_VERSION 22 / Lot 19). Visible to every recipient.
   */
  eliminationReveal?: EliminationRevealView;
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

/**
 * Public death reveal — Lot 19 / PROTOCOL_VERSION 22.
 * Frozen at elimination before reward hold / pool dump; not a Spy relation.
 */
export interface EliminationRevealView {
  kitId: KitId;
  hand: readonly CardInstance[];
  specialCards: readonly CardInstance[];
  lives: number;
  points: number;
  upgradePoints: number;
  shield: number;
  shieldIsUpgraded: boolean;
  turnSequence: number;
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
  /** Exact Attack Thief charge count — private (tech v4 §5.1 / L23-03). */
  attackBlockCharges: number;
}

/** Active persistent special on a seat — public (developer ruling 2026-08-02). */
export interface PersistentEffectView {
  id: string;
  cardId: CardId;
  isUpgraded: boolean;
  counter: number | null;
  /**
   * Legacy single-target field. Curse is victim-owned (designer 2026-08-07) so this is
   * always `null` for Curse; other persistents leave it null too.
   */
  targetPlayerId: string | null;
}

export interface PendingEffectView {
  id: string;
  sourcePlayerId: string;
  targetPlayerId: string;
  cardId: CardId;
  isUpgraded: boolean;
  queuedAt: number;
  damageMultiplier: number;
  redirectedBy: PendingEffectRedirectSource | null;
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

/**
 * Teaching overlay on playing / finished views (technical spec v6 §8 / L41-02).
 * Not a `GameMode` and not on `GameState` (decisions.md 2026-08-20).
 */
export type PlayKind = 'classic' | 'tutorial';

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
  /**
   * Shared pool — rules spec §1 "visible to all players"; technical spec v4 §4.3 / §5.1.
   * Required so `enumerationStateFromView` can reconstruct pool contents for §10.1.
   */
  pool: readonly CardInstance[];
  /**
   * Public teaching overlay (technical spec v6 §8). Classic rooms: `'classic'`.
   */
  playKind: PlayKind;
  /**
   * Public tutorial cursor, or `null` when `playKind === 'classic'`
   * (technical spec v6 §8).
   */
  tutorialIndex: number | null;
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
  /** Bot explanatory reason only — L17-05 / #V3-2. Absent for humans. */
  botReason?: BotDecisionReason;
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
  outcome: ActionResolutionOutcome;
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
  /** Bot explanatory reason only — L17-05 / #V3-2. Absent for humans. */
  botReason?: BotDecisionReason;
}

/** Curse passed by a successful attack (lives lost ≥ 1) — designer 2026-08-07 / PROTOCOL_VERSION 26. */
export interface CurseTransferredLogEntry {
  kind: 'curseTransferred';
  fromPlayerId: string;
  toPlayerId: string;
  cardId: 'curse';
  isUpgraded: boolean;
  effectId: string;
  turnSequence: number;
}

/** Player revived via Reanimation — rules spec §5, L26 / L30-06.
 * In-game action log never includes `kitId` (designer 2026-08-24 / L50-03).
 * Excel `exportLog` still carries the kit.
 */
export interface PlayerReanimatedLogEntry {
  kind: 'playerReanimated';
  playerId: string;
  /** Omitted from every in-game recipient view (L50-03). */
  kitId?: KitId;
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
  /** Bot explanatory reason only — L17-05 / #V3-2. Absent for humans. */
  botReason?: BotDecisionReason;
}

export type ActionLogEntryView =
  | ActionPlayedLogEntry
  | ActionResolvedLogEntry
  | PlayerEliminatedLogEntry
  | MirrorRedirectedLogEntry
  | CurseTransferredLogEntry
  | PlayerReanimatedLogEntry
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
 * Public game-over summary — L9-03.
 * PROTOCOL_VERSION 22 adds `eliminationReveal` on dead seats and `exportLog` for Excel.
 */
export interface GameRecapView {
  turnSequence: number;
  players: readonly GameRecapPlayerView[];
  eliminations: readonly GameRecapEliminationView[];
}

/** Pending attack summary for export snapshots — Lot 19. */
export interface ExportPendingAttackView {
  cardId: CardId;
  isUpgraded: boolean;
  sourcePlayerId: string;
  targetPlayerId: string;
  damageMultiplier: number;
  redirectedBy: PendingEffectRedirectSource | null;
}

/** Full private params for one seat at a point in time — finished export only. */
export interface ExportPlayerParamsView {
  playerId: string;
  nickname: string;
  kitId: KitId;
  lives: number;
  points: number;
  upgradePoints: number;
  shield: number;
  shieldIsUpgraded: boolean;
  isEliminated: boolean;
  hand: readonly CardInstance[];
  specialCards: readonly CardInstance[];
  pendingAttacks: readonly ExportPendingAttackView[];
}

/** One turn row: action + every seat before and after — Lot 19. */
export interface ExportTurnRowView {
  turnSequence: number;
  actorPlayerId: string;
  action: ActionLogPlayedAction;
  cardId?: CardId;
  isUpgraded?: boolean;
  targetPlayerId?: string;
  attacks?: readonly {
    cardId: CardId;
    isUpgraded: boolean;
    targetPlayerId: string;
  }[];
  before: readonly ExportPlayerParamsView[];
  after: readonly ExportPlayerParamsView[];
}

export interface GameExportLogView {
  turns: readonly ExportTurnRowView[];
  events: readonly ActionLogEntryView[];
}

export interface FinishedStateView {
  phase: 'finished';
  you: string;
  gameCode: string;
  winnerPlayerId: string;
  players: readonly PublicPlayerView[];
  recap: GameRecapView;
  /** Complete before/after turn log + events for Excel download (PROTOCOL 22). */
  exportLog: GameExportLogView;
  /**
   * Frozen per-recipient playing snapshot of the finished board (PROTOCOL 24).
   * Same visibility rules as an in-progress `PlayingStateView`; `turnDeadlineMs` is
   * always `null`. Lets the client keep the table visible under a closable stats dialog.
   */
  finalTable: PlayingStateView;
  /**
   * Public teaching overlay (technical spec v6 §8 / L41-02). Same pair as
   * `finalTable.playKind` / `finalTable.tutorialIndex`.
   */
  playKind: PlayKind;
  tutorialIndex: number | null;
}

export type StateView = LobbyStateView | PlayingStateView | FinishedStateView;

/** @deprecated Use `StateView`. */
export type PlaceholderStateView = StateView;
