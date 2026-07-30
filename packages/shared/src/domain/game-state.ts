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
}
