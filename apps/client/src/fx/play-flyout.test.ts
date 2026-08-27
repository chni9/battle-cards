/**
 * Token flyout measurement selectors — L51-09 / L51-11.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  tokenFlyoutResourceSelector,
  tokenFlyoutSeatSelector,
} from './play-flyout';

const dir = dirname(fileURLToPath(import.meta.url));

describe('measureTokenFlyout playerId (L51-09 / L51-11)', () => {
  it('scopes opponent resources to the seat and POV to the dock', () => {
    expect(tokenFlyoutResourceSelector('point')).toBe(
      '[data-zone="resources"] [data-resource-kind="point"]',
    );
    expect(tokenFlyoutResourceSelector('life', 'p2')).toBe(
      '[data-zone="opponent-seat"][data-player-id="p2"] [data-resource-kind="life"]',
    );
    expect(tokenFlyoutSeatSelector('p2')).toBe(
      '[data-zone="opponent-seat"][data-player-id="p2"]',
    );
    expect(tokenFlyoutResourceSelector('point')).not.toContain('opponent-seat');
  });

  it('sizes opponent sold-card ghosts large enough to read (L51-11)', () => {
    const source = readFileSync(join(dir, 'play-flyout.ts'), 'utf8');
    expect(source).toContain('measureOpponentCardLogFlyout');
    expect(source).toContain('width: 72');
    expect(source).toContain('height: 108');
  });
});
