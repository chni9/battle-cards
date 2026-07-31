/**
 * Root game state — technical spec §4.1, rules spec §6 and §7.
 */

import type { CardInstance } from './card';
import type { Player } from './player';
import type { SpyRelation } from './visibility';

/** V1 implements Classic only. Team, God and Quick modes are out of scope (technical spec §9). */
export type GameMode = 'classic';

/**
 * Rules spec §7: a player can never exceed this many lives, whatever the source of the
 * gain, and any excess is lost. Applies to Regeneration, Absorber, Imposition,
 * elimination rewards and upgraded Cloning alike (technical spec §6.3).
 */
export const CLASSIC_LIFE_LIMIT = 25;

export interface GameState {
  mode: GameMode;
  /**
   * The life cap in force, held on the state rather than read from a constant so the
   * per-mode caps of rules spec §7 do not get hardcoded into the rules logic.
   */
  lifeLimit: number;
  players: Player[];
  /**
   * The shared pool (rules spec §1): sold cards, used special cards, and the cards of
   * eliminated players. Write-only in V1 — no V1 card reads from it (technical spec §6.3).
   */
  pool: CardInstance[];
  /** `null` before the first turn begins. */
  currentTurnPlayerId: string | null;
  /**
   * Monotonic global counter, incremented as the game advances. Serves as the
   * `queuedAt` stamp of every queued effect, which is why it is global and never
   * per player.
   */
  turnSequence: number;
  /**
   * Seed of the game's pseudo-random generator, so a reported game can be replayed and
   * the game log (technical spec §3) can record what produced a distribution.
   *
   * **Server-only — never include it in a view sent to a client.** A client holding the
   * seed can predict every remaining draw: Sentence's victim, the special card purchase,
   * Mirror's default target. Not a field of technical spec §4.1's list; added in L0-05.
   */
  seed: string;
  /**
   * Spy visibility matrix: who may see whose private kit/hand/resources
   * (technical spec §5.1). Empty until Spy resolves (L3-05).
   */
  visibility: SpyRelation[];
  /**
   * Active Mirror sub-choice, or `null`. While set, the Mirror user's turn has paid
   * but has not yet resolved pending effects (technical spec §5.5–5.6).
   */
  mirrorChoice: MirrorChoiceState | null;
  /**
   * Third-party sources that dealt life loss (or a lethal effect) to a victim during
   * the current resolve+persist phase. Consumed when eliminations are marked (L6).
   * Self damage is never recorded.
   */
  eliminationContributors: EliminationContributor[];
  /**
   * Pending elimination reward jobs (2 picks each). Server-only queue; the active head
   * is mirrored in `rewardChoice` (technical spec §5.5–§5.6, rules spec §6).
   */
  rewardQueue: EliminationRewardJob[];
  /**
   * Active elimination reward sub-choice, or `null`. While set, turn advance and
   * game-over are paused (Mirror-shaped gate).
   */
  rewardChoice: RewardChoiceState | null;
}

/** One third-party contributor to a potential elimination this phase. */
export interface EliminationContributor {
  victimPlayerId: string;
  sourcePlayerId: string;
}

/** Queued reward selection for one eliminated player (rules spec §6). */
export interface EliminationRewardJob {
  eliminationId: string;
  eliminatedPlayerId: string;
  eliminatorPlayerId: string;
}

/** In-flight reward sub-choice — technical spec §5.5. */
export interface RewardChoiceState {
  eliminationId: string;
  eliminatorPlayerId: string;
  eliminatedPlayerId: string;
  deadlineMs: number;
}

/** In-flight Mirror redirect sub-choice — technical spec §5.5. */
export interface MirrorChoiceState {
  playerId: string;
  isUpgraded: boolean;
  eligibleEffectIds: readonly string[];
  deadlineMs: number;
}
