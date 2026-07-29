import { describe, expect, it } from 'vitest';

import { GAME_CODE_LENGTH, generateGameCodeCandidate, normaliseGameCode } from './game-code';

describe('game code (L1-01)', () => {
  it(`produces a ${GAME_CODE_LENGTH}-letter A–Z candidate`, () => {
    const code = generateGameCodeCandidate();

    expect(code).toHaveLength(GAME_CODE_LENGTH);
    expect(code).toMatch(/^[A-Z]+$/);
  });

  it('normalises typed codes to uppercase', () => {
    expect(normaliseGameCode('abcDef')).toBe('ABCDEF');
  });

  it('rejects wrong length or non-letter characters', () => {
    expect(normaliseGameCode('ABC')).toBeNull();
    expect(normaliseGameCode('ABCDEFG')).toBeNull();
    expect(normaliseGameCode('ABC12D')).toBeNull();
  });
});
