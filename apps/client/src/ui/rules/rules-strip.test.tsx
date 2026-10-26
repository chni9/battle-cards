// @vitest-environment happy-dom
/** Table rules strip (technical spec v7 §6.11, §7.4; Q15). */
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { getKit, KIT_IDS, type KitId, type LobbyRules } from '@card-battle/shared';

import { renderUi } from '../../test/render';
import { RulesStrip } from './rules-strip';

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

function strip(): HTMLElement {
  return screen.getByRole('button', { name: 'Table rules' });
}

describe('RulesStrip', () => {
  it.each([
    { seconds: 45, label: '45s' },
    { seconds: 180, label: '180s' },
    { seconds: 300, label: '300s' },
  ])('shows $label from the received rules, never a clamped value', ({ seconds, label }) => {
    renderUi(<RulesStrip rules={rules({ turnTimeSeconds: seconds })} />);
    expect(within(strip()).getByText(label)).toBeTruthy();
  });

  it('shows the Random-only mark when randomOnly is set', () => {
    renderUi(<RulesStrip rules={rules({ randomOnly: true })} />);
    expect(within(strip()).getByText('Random')).toBeTruthy();
  });

  it('shows no Random-only mark when randomOnly is off', () => {
    renderUi(<RulesStrip rules={rules({ randomOnly: false })} />);
    expect(within(strip()).queryByText('Random')).toBeNull();
  });

  it('labels each excluded kit "Excluded" and leaves allowed kits unlabelled', () => {
    const excludedKitIds: readonly KitId[] = ['kamikaze', 'ghost', 'gambler'];
    renderUi(<RulesStrip rules={rules({ excludedKitIds })} />);
    expect(within(strip()).getAllByText('Excluded')).toHaveLength(3);
    for (const kitId of KIT_IDS) {
      const face = kitFace(strip(), kitId);
      const excluded = excludedKitIds.includes(kitId);
      expect(within(face).getByAltText(getKit(kitId).name)).toBeTruthy();
      expect(face.getAttribute('data-excluded'), kitId).toBe(excluded ? 'true' : 'false');
      expect(within(face).queryByText('Excluded') !== null, kitId).toBe(excluded);
    }
  });

  it('opens a read-only Table rules sheet with no editable control on tap', async () => {
    const { user } = renderUi(
      <RulesStrip rules={rules({ excludedKitIds: ['ghost'], randomOnly: true, turnTimeSeconds: 300 })} />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(strip());
    const sheet = screen.getByRole('dialog', { name: 'Table rules' });
    expect(within(sheet).getByText('300s')).toBeTruthy();
    expect(within(sheet).getByText('Random')).toBeTruthy();
    expect(within(sheet).getAllByText('Excluded')).toHaveLength(1);
    expect(within(sheet).queryAllByRole('slider')).toHaveLength(0);
    expect(
      sheet.querySelectorAll('input, select, textarea, [contenteditable], [aria-pressed]'),
    ).toHaveLength(0);
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(strip());
    });
  });

  it('marks the press motion reduced under prefers-reduced-motion', () => {
    renderUi(<RulesStrip rules={rules()} />, { reducedMotion: true });
    expect(strip().getAttribute('data-motion')).toBe('reduced');
  });

  it('marks the press motion full by default', () => {
    renderUi(<RulesStrip rules={rules()} />);
    expect(strip().getAttribute('data-motion')).toBe('full');
  });

  it('dims each excluded portrait only: its "Excluded" caption keeps full opacity (Q15)', () => {
    renderUi(<RulesStrip rules={rules({ excludedKitIds: ['ghost'] })} />);
    const face = kitFace(strip(), 'ghost');
    const dimmed = face.querySelector('.opacity-40.grayscale');
    expect(dimmed?.querySelector('[data-zone="kit-portrait"]')).not.toBeNull();
    expect(within(face).getByText('Excluded').closest('.opacity-40')).toBeNull();
    expect(kitFace(strip(), 'wizard').querySelector('.opacity-40, .grayscale')).toBeNull();
  });

  it('is one dialog-opening button that takes the caller className', () => {
    renderUi(<RulesStrip rules={rules()} className="mt-6" />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(strip().getAttribute('aria-haspopup')).toBe('dialog');
    expect(strip().classList.contains('mt-6')).toBe(true);
  });

  it('puts focus on the sheet\'s Close when it opens', async () => {
    const { user } = renderUi(<RulesStrip rules={rules()} />);
    await user.click(strip());
    const sheet = screen.getByRole('dialog', { name: 'Table rules' });
    expect(document.activeElement).toBe(within(sheet).getByRole('button', { name: 'Close' }));
  });
});
