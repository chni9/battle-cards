/**
 * Bot fifth-slot drop must resume the turn like human handleSlotDrop.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(dir, 'game-room.ts'), 'utf8');

describe('applyBotSlotDropChoice turn resume', () => {
  it('calls continueAfterRewards after applyTurnResult when the game continues', () => {
    const fn = source.slice(
      source.indexOf('private applyBotSlotDropChoice'),
      source.indexOf('private failBotSlotDropChoice'),
    );
    expect(fn).toContain('this.applyTurnResult(result)');
    expect(fn).toContain('this.continueAfterRewards(this.turnContinuationFrom(result))');
    expect(fn).toContain('result.winnerPlayerId !== null');
  });

  it('failBotSlotDropChoice success path also continues after applyTurnResult', () => {
    const fn = source.slice(
      source.indexOf('private failBotSlotDropChoice'),
      source.indexOf('private failBotReanimationKitChoice'),
    );
    expect(fn).toContain('this.applyTurnResult(result)');
    expect(fn).toContain('this.continueAfterRewards(this.turnContinuationFrom(result))');
  });
});
