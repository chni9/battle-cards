/**
 * Pending chip callout chrome — L51-07.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { pendingChipCalloutTone } from './pending-queue';

const dir = dirname(fileURLToPath(import.meta.url));

describe('pending queue callouts (L51-07)', () => {
  it('uses red for attack-tone chips and orange for other real pending', () => {
    expect(pendingChipCalloutTone('basic-attack')).toBe('threat');
    expect(pendingChipCalloutTone('sentence')).toBe('threat');
    expect(pendingChipCalloutTone('spy')).toBe('guide');
    expect(pendingChipCalloutTone('thief')).toBe('guide');
  });

  it('wraps real chips with a no-arrow tutorial callout', () => {
    const source = readFileSync(join(dir, 'pending-queue.tsx'), 'utf8');
    expect(source).toContain('arrow={false}');
    expect(source).toContain('isPersistentPresentationId');
    expect(source).not.toContain('threatHighlightIds');
    expect(source).not.toContain('arrow="top"');
  });

  it('keeps coach arrows on scripted table controls', () => {
    const table = readFileSync(join(dir, '../table.tsx'), 'utf8');
    expect(table).toContain('arrow="top"');
    expect(table).toContain('arrow="bottom"');
    expect(table).not.toContain('threatHighlightIds');
    expect(table).not.toContain('tutorialIncomingThreatIds');
  });
});
