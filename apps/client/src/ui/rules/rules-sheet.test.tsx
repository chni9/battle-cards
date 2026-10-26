// @vitest-environment happy-dom
/** Read-only Table rules sheet (technical spec v7 §6.7, §6.11, §7.4; Q15). */
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getKit, KIT_IDS, type KitId, type LobbyRules } from '@card-battle/shared';

import { renderUi } from '../../test/render';
import { RulesSheet } from './rules-sheet';

const EDITABLE_ROLES = [
  'slider', 'checkbox', 'radio', 'switch', 'textbox', 'spinbutton', 'combobox', 'listbox',
] as const;

function rules(overrides: Partial<LobbyRules> = {}): LobbyRules {
  return { excludedKitIds: [], randomOnly: false, turnTimeSeconds: 60, ...overrides };
}

function kitFace(container: HTMLElement, kitId: KitId): HTMLElement {
  const face = container.querySelector<HTMLElement>(`[data-kit-id="${kitId}"]`);
  if (face === null) {
    throw new Error(`No kit face for ${kitId}`);
  }
  return face;
}

describe('RulesSheet', () => {
  it('renders nothing while closed', () => {
    renderUi(<RulesSheet open={false} rules={rules()} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the turn time, Random only and every kit with the excluded ones labelled', () => {
    const excludedKitIds: readonly KitId[] = ['untouchable', 'wizard'];
    const shown = rules({ excludedKitIds, randomOnly: true, turnTimeSeconds: 300 });
    renderUi(<RulesSheet open rules={shown} onClose={vi.fn()} />);
    const sheet = screen.getByRole('dialog', { name: 'Table rules' });
    expect(within(sheet).getByText('Human turn')).toBeTruthy();
    expect(within(sheet).getByText('300s')).toBeTruthy();
    expect(within(sheet).getByText('Random')).toBeTruthy();
    expect(within(sheet).getAllByText('Excluded')).toHaveLength(2);
    for (const kitId of KIT_IDS) {
      const face = kitFace(sheet, kitId);
      const excluded = excludedKitIds.includes(kitId);
      expect(within(face).getByText(getKit(kitId).name)).toBeTruthy();
      expect(face.getAttribute('data-excluded'), kitId).toBe(excluded ? 'true' : 'false');
      expect(within(face).queryByText('Excluded') !== null, kitId).toBe(excluded);
    }
  });

  it('leaves the Random mark out when randomOnly is off', () => {
    renderUi(<RulesSheet open rules={rules()} onClose={vi.fn()} />);
    expect(within(screen.getByRole('dialog', { name: 'Table rules' })).queryByText('Random')).toBeNull();
  });

  it('has no editable control', () => {
    renderUi(<RulesSheet open rules={rules({ excludedKitIds: ['ghost'] })} onClose={vi.fn()} />);
    const sheet = screen.getByRole('dialog', { name: 'Table rules' });
    for (const role of EDITABLE_ROLES) {
      expect(within(sheet).queryAllByRole(role), role).toHaveLength(0);
    }
    expect(
      sheet.querySelectorAll('input, select, textarea, [contenteditable], [aria-pressed]'),
    ).toHaveLength(0);
    for (const button of within(sheet).queryAllByRole('button')) {
      expect(button.getAttribute('aria-label') ?? button.textContent.trim()).toBe('Close');
    }
  });

  it('closes through onClose on Escape, as a read-only sheet', async () => {
    const onClose = vi.fn();
    const { user } = renderUi(<RulesSheet open rules={rules()} onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes through onClose on Close', async () => {
    const onClose = vi.fn();
    const { user } = renderUi(<RulesSheet open rules={rules()} onClose={onClose} />);
    await user.click(
      within(screen.getByRole('dialog', { name: 'Table rules' })).getByRole('button', { name: 'Close' }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('dims the portrait only: the name and the "Excluded" caption never sit under the dimming (Q15)', () => {
    renderUi(<RulesSheet open rules={rules({ excludedKitIds: ['ghost'] })} onClose={vi.fn()} />);
    const face = kitFace(screen.getByRole('dialog', { name: 'Table rules' }), 'ghost');
    const dimmed = face.querySelector('.opacity-40.grayscale');
    expect(dimmed?.querySelector('[data-zone="kit-portrait"]')).not.toBeNull();
    expect(within(face).getByText('Excluded').closest('.opacity-40')).toBeNull();
    expect(within(face).getByText('Ghost').closest('.opacity-40')).toBeNull();
    const allowed = kitFace(screen.getByRole('dialog', { name: 'Table rules' }), 'wizard');
    expect(allowed.querySelector('.opacity-40, .grayscale')).toBeNull();
  });

  it('leaves the portraits to the visible kit names: no image is announced', () => {
    renderUi(<RulesSheet open rules={rules()} onClose={vi.fn()} />);
    expect(within(screen.getByRole('dialog', { name: 'Table rules' })).queryAllByRole('img')).toHaveLength(0);
  });

  it('puts focus on Close when it opens', () => {
    renderUi(<RulesSheet open rules={rules()} onClose={vi.fn()} />);
    const sheet = screen.getByRole('dialog', { name: 'Table rules' });
    expect(document.activeElement).toBe(within(sheet).getByRole('button', { name: 'Close' }));
  });
});
