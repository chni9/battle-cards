/**
 * Dock resource row wires visible captions — L43-01.
 */

import { describe, expect, it } from 'vitest';

import { resourceCaptionMode } from '../../design/components/resource-captions';
import { DOCK_RESOURCE_CAPTION_VISIBLE } from './private-zone';

describe('dock resource captions (L43-01)', () => {
  it('opts the dock row into visible captions, not sr-only', () => {
    expect(DOCK_RESOURCE_CAPTION_VISIBLE).toBe(true);
    expect(resourceCaptionMode(DOCK_RESOURCE_CAPTION_VISIBLE)).toBe('visible');
  });
});
