/**
 * Dock resource row wires visible captions — L43-01.
 * Incoming lives on its own full-width row (L53-07).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { resourceCaptionMode } from '../../design/components/resource-captions';
import { DOCK_RESOURCE_CAPTION_VISIBLE } from './private-zone';

const dir = dirname(fileURLToPath(import.meta.url));

describe('dock resource captions (L43-01)', () => {
  it('opts the dock row into visible captions, not sr-only', () => {
    expect(DOCK_RESOURCE_CAPTION_VISIBLE).toBe(true);
    expect(resourceCaptionMode(DOCK_RESOURCE_CAPTION_VISIBLE)).toBe('visible');
  });
});

describe('private-zone Incoming row (L53-07)', () => {
  it('gives Incoming its own full-width row without a 36px clip', () => {
    const source = readFileSync(join(dir, 'private-zone.tsx'), 'utf8');
    expect(source).toContain('data-zone="incoming-pending"');
    expect(source).not.toContain('max-h-9');
    expect(source).not.toContain('overflow-y-hidden');
  });
});
