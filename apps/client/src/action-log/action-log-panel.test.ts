/**
 * Action log Why control — L45-05 / technical spec v6 §5.4.
 * Hidden in every mode (no protocol bump; botReason may still arrive on the wire).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('ActionLogPanel Why (L45-05)', () => {
  it('does not render a Why control', () => {
    const source = readFileSync(join(dir, 'action-log-panel.tsx'), 'utf8');
    expect(source).not.toMatch(/>Why</);
    expect(source).not.toContain('formatBotReason');
    expect(source).not.toContain('Show bot reason');
  });
});
