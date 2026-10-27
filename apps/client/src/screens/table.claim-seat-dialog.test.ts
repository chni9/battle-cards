/**
 * Walk-in watching-hands copy — L57-16.
 * Table part, split from screens/claim-seat-dialog.test.ts by owner lot (technical spec v7 §12.1, L72-02).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

describe('walkInSeesPrivateHands (L57-16)', () => {
  it('hides watching-hands copy while the overlay is fogged', () => {
    const table = readFileSync(join(here, 'table.tsx'), 'utf8');
    expect(table).toContain('walkInSeesPrivateHands');
    expect(table).toContain('Hands stay hidden until you stay spectating or sit.');
  });
});
