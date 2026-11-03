// @vitest-environment happy-dom
/**
 * Kit picker copy: technical spec v7 §10.1 (`RandomKitDetails` row and the pre-Lot-69 picker lead), L76-03.
 * L76-10 replaces the dialog with `screens/lobby/kit-picker-sheet.tsx` and carries these assertions over.
 */
import { KIT_IDS, type LobbyKitSelection } from '@card-battle/shared';
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderUi } from '../test/render';
import { KIT_PICKER_LEAD, RANDOM_KIT_ASSIGN_COPY, RANDOM_KIT_PRIVACY_COPY } from './kit-pick-copy';
import { LobbyKitPickerDialog } from './lobby-kit-picker-dialog';

function renderPicker() {
  const onSelect = vi.fn<(selection: LobbyKitSelection) => void>();
  const onClose = vi.fn<() => void>();
  const result = renderUi(
    <LobbyKitPickerDialog open current="random" allowedKitIds={KIT_IDS} onClose={onClose} onSelect={onSelect} />,
    { reducedMotion: true },
  );
  return { ...result, onSelect, onClose };
}

describe('kit picker copy (spec v7 §10.1, L76-03)', () => {
  it('leads the grid with who can see your kit and that Random is the default', () => {
    renderPicker();
    expect(within(screen.getByRole('dialog', { name: 'Choose kit' })).getByText(KIT_PICKER_LEAD)).toBeTruthy();
  });

  it('says the Random kit comes from the allowed kits and who can see it, and sends nothing', async () => {
    const { user, onSelect, onClose } = renderPicker();
    await user.click(screen.getByRole('button', { name: 'Random kit' }));
    const preview = screen.getByRole('dialog', { name: 'Random kit' });
    expect(within(preview).getByText(RANDOM_KIT_ASSIGN_COPY)).toBeTruthy();
    expect(within(preview).getByText(RANDOM_KIT_PRIVACY_COPY)).toBeTruthy();
    expect(preview.textContent).not.toMatch(/16 kits|before this picker existed|an equivalent/);
    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
