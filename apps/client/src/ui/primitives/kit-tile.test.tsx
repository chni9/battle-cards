// @vitest-environment happy-dom
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderUi } from '../../test/render';
import { EXCLUDED_LABEL } from '../ui-copy';
import { KitTile, type KitTileProps, type KitTileStat } from './kit-tile';

const STATS: readonly KitTileStat[] = [
  { icon: 'life', label: 'Lives', value: '20' },
  { icon: 'point', label: 'Points', value: '3' },
];

function tile(overrides: Partial<KitTileProps> = {}) {
  return <KitTile name="Warrior" portrait={<span data-testid="portrait" />} stats={STATS} {...overrides} />;
}

describe('KitTile (technical spec v7 §7.3, Q15, Q23)', () => {
  it('selects through a button with aria-pressed', async () => {
    const onSelect = vi.fn();
    const { user, rerender } = renderUi(tile({ onSelect }));
    const button = screen.getByRole('button', { name: 'Warrior' });
    expect(button.getAttribute('aria-pressed')).toBe('false');
    await user.click(button);
    expect(onSelect).toHaveBeenCalledTimes(1);
    rerender(tile({ onSelect, selected: true }));
    expect(screen.getByRole('button', { name: 'Warrior' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('renders the caller stats with spoken labels', () => {
    renderUi(tile());
    expect(screen.getByText('Lives').classList.contains('sr-only')).toBe(true);
    expect(screen.getByText('20')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('the info control opens details without selecting', async () => {
    const onSelect = vi.fn();
    const onInfo = vi.fn();
    const { user } = renderUi(tile({ onSelect, onInfo, infoLabel: 'Warrior details' }));
    await user.click(screen.getByRole('button', { name: 'Warrior details' }));
    expect(onInfo).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('renders no info control without an infoLabel', () => {
    renderUi(tile({ onSelect: vi.fn(), onInfo: vi.fn() }));
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('excluded: greyed, labelled "Excluded" and never selectable', async () => {
    const onSelect = vi.fn();
    const { user, container } = renderUi(tile({ onSelect, selected: true, excluded: true }));
    const button = screen.getByRole('button');
    expect(button.textContent).toContain(EXCLUDED_LABEL);
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(container.querySelector('[data-excluded="true"]')).not.toBeNull();
    await user.click(button);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('is display-only without onSelect', () => {
    renderUi(tile());
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Warrior')).toBeTruthy();
  });
});
