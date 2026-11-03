// @vitest-environment happy-dom
/**
 * Kit sheet — technical spec v7 §6.6.5 (all current sections), Q46; L30-05 (every `KitTraits`
 * field has a rendered section), moved here from the V2 kit inspect onto the arena sheet.
 */
import { getKit, KIT_IDS } from '@card-battle/shared';
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { KIT_DETAILS_SECTION_TITLES, KIT_TRAIT_SECTION_FOR } from '../../ui/kit/kit-details-sections';
import { KIT_TRAIT_SECTION_KEYS } from '../../view-model/kit-inspect-traits';
import { KitSheet } from './kit-sheet';

describe('KitSheet (spec v7 §6.6.5, L74-02)', () => {
  it.each(KIT_IDS)('renders a section for every KitTraits field for %s (L30-05)', (kitId) => {
    renderUi(<KitSheet open kitId={kitId} onClose={vi.fn()} />);
    const sheet = screen.getByRole('dialog', { name: getKit(kitId).name });
    expect(sheet.getAttribute('data-arena-sheet')).toBe(`kit:${kitId}`);
    for (const key of KIT_TRAIT_SECTION_KEYS) {
      expect(within(sheet).getByRole('heading', { name: KIT_DETAILS_SECTION_TITLES[KIT_TRAIT_SECTION_FOR[key]] })).toBeTruthy();
    }
  });

  it('closes through onClose on Esc', async () => {
    const onClose = vi.fn();
    const { user } = renderUi(<KitSheet open kitId="tactician" onClose={onClose} />);
    expect(screen.getByRole('dialog', { name: 'Tactician' })).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
