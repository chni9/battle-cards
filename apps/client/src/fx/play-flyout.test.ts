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
  INCOMING_COLLAPSED_ZONE,
  LOG_COLLAPSED_ZONE,
  OPPONENTS_COLLAPSED_ZONE,
  tokenFlyoutPovSelector,
  tokenFlyoutResourceSelector,
  tokenFlyoutSeatSelector,
} from '../ui/fx-anchors';
import { tokenFlyoutUsesCardChrome } from './table-fx-types';

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
    expect(source).toContain('measurePlayCardGhost');
    expect(source).toContain('measureDeckCardFlyout');
    expect(source).toContain('[data-zone="card-band"]');
    expect(source).not.toContain('measureOpponentCardLogFlyout');
    expect(DECK_CARD_FLYOUT_WIDTH).toBe(48);
    expect(DECK_CARD_FLYOUT_HEIGHT).toBe(72);
  });

  it('token chip chrome is asCard-only — width must not promote resource icons (L51-14)', () => {
    expect(tokenFlyoutUsesCardChrome({ asCard: true })).toBe(true);
    expect(tokenFlyoutUsesCardChrome({})).toBe(false);
  });

  it('aims flyouts at collapsed chrome when the panel is unmounted (L53-07)', () => {
    expect(LOG_COLLAPSED_ZONE).toBe('log-collapsed');
    expect(OPPONENTS_COLLAPSED_ZONE).toBe('opponents-collapsed');
    expect(INCOMING_COLLAPSED_ZONE).toBe('incoming-collapsed');
    const source = readFileSync(join(dir, 'play-flyout.ts'), 'utf8');
    expect(source).toContain('queryActionLogAnchor');
    expect(source).toContain('queryOpponentsCollapsedAnchor');
    expect(source).toContain('queryPlayerFxAnchor');
    expect(source).toContain('queryPendingFlashAnchor');
    expect(source).toContain('measureIncomingCollapsedCue');
    expect(source).toContain('LOG_COLLAPSED_ZONE');
    expect(source).toContain('OPPONENTS_COLLAPSED_ZONE');
    const overlay = readFileSync(join(dir, 'table-fx-overlay.tsx'), 'utf8');
    expect(overlay).toContain('queryPendingFlashAnchor');
    expect(overlay).toContain('queryPlayerFxAnchor');
    expect(overlay).toContain('visibleClientRect');
  });
});
