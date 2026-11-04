// @vitest-environment happy-dom
/**
 * Token flyout overlay chrome — L51-14 and §8.3, rewritten from a source-text read as an overlay
 * behavior test (technical spec v7 §12.1; classification row for this file; L75-08).
 */
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { renderUi } from '../test/render';
import { TableFxContext, type TableFxContextValue } from './table-fx-hooks';
import { TableFxOverlay } from './table-fx-overlay';
import type { TableFxEvent } from './table-fx-types';

function tokenEvent(id: string, asCard: boolean): Extract<TableFxEvent, { kind: 'tokenFlyout' }> {
  return {
    id, kind: 'tokenFlyout', artUrl: `${id}.png`,
    from: { left: 0, top: 0, width: 64, height: 64 }, to: { left: 200, top: 400, width: 40, height: 40 },
    ...(asCard ? { asCard: true } : {}), expiresAt: Number.MAX_SAFE_INTEGER,
  };
}
function overlay(events: readonly TableFxEvent[], reducedMotion: boolean) {
  const value: TableFxContextValue = { enqueue: vi.fn(), events };
  return renderUi(createElement(TableFxContext.Provider, { value }, createElement(TableFxOverlay)), { reducedMotion });
}
const drawn = (): (string | null)[] => Array.from(document.querySelectorAll('[data-zone="table-fx"] [data-fx]'), (node) => node.getAttribute('data-fx'));

describe('measureTokenFlyout playerId (L51-09 / L51-13)', () => {
  it('token chip chrome is asCard-only — width must not promote resource icons (L51-14) (table-fx-overlay)', () => {
    overlay([tokenEvent('chip', false), tokenEvent('ghost', true)], false);
    expect(drawn()).toEqual(['token-flyout', 'card-flyout']);
  });

  it('draws no chip and no card ghost under reduced motion (§8.3)', () => {
    overlay([tokenEvent('chip', false), tokenEvent('ghost', true)], true);
    expect(drawn()).toEqual([]);
  });
});
