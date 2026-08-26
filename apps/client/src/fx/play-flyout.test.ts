/**
 * Token flyout measurement selectors — L51-09.
 */

import { describe, expect, it } from 'vitest';

import {
  tokenFlyoutResourceSelector,
  tokenFlyoutSeatSelector,
} from './play-flyout';

describe('measureTokenFlyout playerId (L51-09)', () => {
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
});
