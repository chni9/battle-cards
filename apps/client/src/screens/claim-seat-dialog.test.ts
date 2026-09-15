/**
 * Claim-seat picker copy — L57-13.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { claimStayLabel } from './claim-seat';

const here = dirname(fileURLToPath(import.meta.url));

describe('claimStayLabel (L57-13)', () => {
  it('keeps a lobby guest on their new seat and spectates otherwise', () => {
    expect(claimStayLabel({ isSpectator: false, phase: 'lobby' })).toBe('Keep this seat');
    expect(claimStayLabel({ isSpectator: true, phase: 'lobby' })).toBe('Stay spectating');
    expect(claimStayLabel({ isSpectator: true, phase: 'playing' })).toBe('Stay spectating');
  });
});

describe('claim seat dialog (L57-13)', () => {
  it('lists claimable nicknames without auto-matching', () => {
    const source = readFileSync(join(here, 'claim-seat-dialog.tsx'), 'utf8');
    expect(source).toContain('Sit as a disconnected player?');
    expect(source).toContain('Nicknames are not unique');
    expect(source).toContain('onClaim');
    expect(source).not.toContain('toLowerCase');
  });
});
