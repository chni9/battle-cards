/**
 * Pending chip callout chrome — L51-07.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { pendingChipCalloutTone } from './pending-chip-tone';

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

describe('pending queue compact strip (L53-07)', () => {
  it('keeps the compact title on the same row as the chips', () => {
    const source = readFileSync(join(dir, 'pending-queue.tsx'), 'utf8');
    expect(source).toContain('flex-row items-center');
    expect(source).toContain('flex-1 flex-nowrap');
  });

  it('stacks Incoming chips instead of a horizontal nowrap strip', () => {
    const source = readFileSync(join(dir, 'pending-queue.tsx'), 'utf8');
    expect(source).toContain('stack?: boolean');
    expect(source).toContain('stacked');
    expect(source).toContain('flex h-full min-h-0 min-w-0 flex-col');
  });
});
