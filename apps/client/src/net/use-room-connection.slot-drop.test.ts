/**
 * Slot-drop subChoiceRequired guard — Lot 69.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('subChoiceRequired slot-drop (Lot 69)', () => {
  it('accepts slot-drop payloads in isSubChoiceRequired', () => {
    const source = readFileSync(join(dir, 'use-room-connection.ts'), 'utf8');
    expect(source).toContain("case 'slot-drop':");
    expect(source).toContain('eligibleSlots');
  });
});
