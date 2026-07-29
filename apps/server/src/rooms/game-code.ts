/**
 * Short game codes used as Colyseus `roomId` — L1-01, technical spec §5.2 / §7.
 *
 * Six uppercase A–Z letters. Uniqueness is enforced via the Presence API when the room
 * assigns its id (Colyseus custom-room-id recipe).
 */

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const GAME_CODE_LENGTH = 6;

/** Presence set that tracks live game codes so two rooms never share one. */
export const GAME_CODE_PRESENCE_CHANNEL = '$card-battle-game-codes';

/** One candidate code. Collisions are resolved by the caller against Presence. */
export function generateGameCodeCandidate(): string {
  let result = '';

  for (let index = 0; index < GAME_CODE_LENGTH; index += 1) {
    const offset = Math.floor(Math.random() * LETTERS.length);
    const letter = LETTERS[offset];

    if (letter === undefined) {
      throw new Error('GAME_CODE alphabet indexing failed');
    }

    result += letter;
  }

  return result;
}

/** Normalise a player-typed code: trim, uppercase. Rejects wrong length / charset. */
export function normaliseGameCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();

  if (code.length !== GAME_CODE_LENGTH) {
    return null;
  }

  for (const char of code) {
    if (!LETTERS.includes(char)) {
      return null;
    }
  }

  return code;
}
