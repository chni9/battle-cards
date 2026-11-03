/**
 * Kit privacy and kit pick copy shared by the lobby, the solo menu, the kit picker and How to play:
 * technical spec v7 §10.1 (the Lot 76 rows, Q11 = B), L76-03.
 *
 * Since Lot 69 a basic Spy shows only resources, and a kit shows only to an upgraded Spy, a Spy
 * Thief or an eliminated player. Since Lot 70 the host may exclude kits, so Random draws from the
 * allowed ones. The How to play Kits body repeats `KIT_PRIVACY_COPY` verbatim, and
 * `how-to-play-content.test.ts` pins that. Every string is listed for designer review (§10, §10.6).
 */

export const KIT_PRIVACY_COPY = 'Opponents see your kit only with an upgraded Spy or Spy Thief, or once you are eliminated.';

export const KIT_PICKER_LEAD = `${KIT_PRIVACY_COPY} Random is the default.`;

export const RANDOM_KIT_ASSIGN_COPY = 'The server assigns one of the allowed kits at random when the game starts.';

export const RANDOM_KIT_PRIVACY_COPY = 'Opponents see which kit you received only with an upgraded Spy or Spy Thief, or once you are eliminated.';

/**
 * Random only replaces the Your kit card in the lobby (spec v7 §7.3): the first sentence of the
 * `choose-kit-random-only` reject copy (`illegal-action-copy.ts`). L76-10; designer review (§10.6).
 */
export const RANDOM_ONLY_LOBBY_LINE = 'The host is dealing kits at random.';

/** The same on the solo menu, where the player is the host (spec v7 §7.3, §10.6; designer review). L76-10. */
export const RANDOM_ONLY_SOLO_LINE = 'Kits will be dealt at random.';
