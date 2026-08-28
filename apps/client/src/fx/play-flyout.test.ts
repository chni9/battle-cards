/**
 * Token flyout measurement selectors — L51-09 / L51-13.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  DECK_CARD_FLYOUT_HEIGHT,
  DECK_CARD_FLYOUT_WIDTH,
  tokenFlyoutPovSelector,
  tokenFlyoutResourceSelector,
  tokenFlyoutSeatSelector,
} from './play-flyout';

const dir = dirname(fileURLToPath(import.meta.url));

describe('measureTokenFlyout playerId (L51-09 / L51-13)', () => {
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
    expect(tokenFlyoutPovSelector('me')).toBe(
      '[data-zone="private-zone"][data-player-id="me"]',
    );
    expect(tokenFlyoutResourceSelector('point')).not.toContain('opponent-seat');
  });

  it('sizes buy/sell card ghosts toward the felt center (L51-13)', () => {
    const source = readFileSync(join(dir, 'play-flyout.ts'), 'utf8');
    expect(source).toContain('measureDeckCardFlyout');
    expect(source).toContain('[data-zone="card-band"]');
    expect(source).not.toContain('measureOpponentCardLogFlyout');
    expect(DECK_CARD_FLYOUT_WIDTH).toBe(48);
    expect(DECK_CARD_FLYOUT_HEIGHT).toBe(72);
  });

  it('enqueues opponent buy/sell ghosts as small cards, not playCard flyouts (L51-13)', () => {
    const table = readFileSync(join(dir, '../screens/table.tsx'), 'utf8');
    expect(table).toContain('enqueueDeckCardGhost');
    expect(table).toContain('regenFlowChips');
    expect(table).toContain("asCard: true");
    expect(table).not.toContain('measurePlayFlyout');
    expect(table).not.toContain('enqueueSellCardGhost');
  });
});
