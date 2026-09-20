/**
 * Sentence seat chip — L63-03 playtest.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

function read(rel: string): string {
  return readFileSync(join(dir, rel), 'utf8');
}

describe('Sentence chip (L63-03)', () => {
  it('shows the Sentence card next to the caster with remaining turns in red', () => {
    const chip = read('sentence-chip.tsx');
    expect(chip).toContain('data-sentence-chip');
    expect(chip).toContain("cardId: 'sentence'");
    expect(chip).toContain('text-cta-red');
    expect(chip).toContain('remainingOwnerTurns');
    // Sentence has no activated PNG — Card(activated) throws and blanks the table.
    expect(chip).not.toMatch(/detail="thumb"\s+activated/);
  });

  it('sits on opponent and private seats instead of a Sentence · pill', () => {
    const opponent = read('opponent-zone.tsx');
    const priv = read('private-zone.tsx');
    const badges = read('flow-status-badges.tsx');
    expect(opponent).toContain('SentenceChip');
    expect(priv).toContain('SentenceChip');
    expect(badges).not.toContain('Sentence ·');
    expect(badges).not.toContain('pendingSentences');
  });
});
