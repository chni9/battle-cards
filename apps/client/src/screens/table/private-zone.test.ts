/**
 * Dock resource row wires visible captions — L43-01.
 * Incoming sits beside the kit and stacks vertically (L53-07).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { resourceCaptionMode } from '../../design/components/resource-captions';
import {
  DOCK_RESOURCE_CAPTION_VISIBLE,
  INCOMING_STACK_MAX_CLASS,
} from './private-zone';

const dir = dirname(fileURLToPath(import.meta.url));

describe('dock resource captions (L43-01)', () => {
  it('opts the dock row into visible captions, not sr-only', () => {
    expect(DOCK_RESOURCE_CAPTION_VISIBLE).toBe(true);
    expect(resourceCaptionMode(DOCK_RESOURCE_CAPTION_VISIBLE)).toBe('visible');
  });
});

describe('private-zone Incoming beside kit (L53-07)', () => {
  it('keeps Incoming on the identity row with a vertical stack cap', () => {
    const source = readFileSync(join(dir, 'private-zone.tsx'), 'utf8');
    expect(source).toContain('data-zone="incoming-pending"');
    expect(source).toContain(INCOMING_STACK_MAX_CLASS);
    expect(source).toContain('overflow-y-auto');
    expect(source).toContain('stack');
    expect(source).not.toContain('max-h-9');
    expect(source).not.toContain(
      'w-full shrink-0 overflow-visible py-1 overscroll-x-contain',
    );
  });
});
