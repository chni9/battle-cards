// @vitest-environment happy-dom
/**
 * Kit picker sheet — technical spec v7 §7.3, §6.7 (read-only sheets stack; Esc closes the top one), §11 (Q23);
 * Appendix A `lobby-kit-picker-dialog`, `home-solo-kit-picker`, `lobby-dialog-dismiss-map`,
 * `lobby-rules-change-guest-effects`; plan Review Focus 1 and A.9 rulings 3 and 5. L76-10.
 */
import { act, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { defaultLobbyRules, KIT_IDS, type LobbyKitSelection } from '@card-battle/shared';

import { renderUi } from '../../test/render';
import { EXCLUDED_LABEL } from '../../ui/ui-copy';
import { ILLEGAL_ACTION_COPY } from '../illegal-action-copy';
import { KitPickerSheet, type KitPickerSheetProps } from './kit-picker-sheet';
import { kitTileStats } from './kit-tile-stats';
import { KIT_PICKER_LEAD, RANDOM_KIT_ASSIGN_COPY, RANDOM_KIT_PRIVACY_COPY } from '../kit-pick-copy';
import { LOBBY_KIT_PICKER_SELECTIONS, lobbyKitSelectionLabel } from './lobby-kit-picker';

function setup(overrides: Partial<KitPickerSheetProps> = {}) {
  const props: KitPickerSheetProps = {
    open: true, current: 'random', rules: defaultLobbyRules(), onSelect: vi.fn(), onClose: vi.fn(), ...overrides,
  };
  const result = renderUi(<KitPickerSheet {...props} />, { reducedMotion: true });
  return { ...result, props };
}
function tile(selection: LobbyKitSelection): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[data-kit-picker-tile="${selection}"]`);
  if (element === null) throw new Error(`no tile for ${selection}`);
  return element;
}
const head = (selection: LobbyKitSelection): HTMLElement => within(tile(selection)).getByRole('button');
const kitSheet = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-lobby-sheet="kit"]');
const values = (element: HTMLElement): (string | null)[] => [...element.querySelectorAll('dd')].map((dd) => dd.textContent);
const selectIn = (title: string): HTMLElement =>
  within(screen.getByRole('dialog', { name: title })).getByRole('button', { name: 'Select this kit' });

describe('KitPickerSheet (L76-10)', () => {
  it('lists Random then all 16 kits in KIT_IDS order, each tile named by its label', () => {
    setup();
    const grid = screen.getByRole('dialog', { name: 'Choose kit' });
    expect(grid.getAttribute('data-lobby-sheet')).toBe('kit-picker');
    expect([...grid.querySelectorAll('[data-kit-picker-tile]')].map((el) => el.getAttribute('data-kit-picker-tile')))
      .toEqual(['random', ...KIT_IDS]);
    for (const selection of LOBBY_KIT_PICKER_SELECTIONS) {
      expect(within(tile(selection)).getByRole('button', { name: lobbyKitSelectionLabel(selection) })).toBeTruthy();
    }
  });

  it('marks the current pick aria-pressed, and no other tile', () => {
    setup({ current: 'wizard' });
    expect([...document.querySelectorAll('[data-kit-picker-tile] button[aria-pressed="true"]')]).toEqual([head('wizard')]);
  });

  it('prints each kit\'s KIT_CATALOG stats on its tile, and none on Random', () => {
    setup();
    for (const kitId of KIT_IDS) expect(values(tile(kitId)), kitId).toEqual(kitTileStats(kitId).map((stat) => stat.value));
    expect(values(tile('tactician'))).toEqual(['1', '15', '0', '4', '2', '2']);
    expect(values(tile('random'))).toEqual([]);
  });

  it('keeps an excluded kit listed, greyed and labelled Excluded; it can never open or reach Select (Q23)', async () => {
    const { user, props } = setup({ rules: { ...defaultLobbyRules(), excludedKitIds: ['assassin'] } });
    expect(tile('assassin').querySelector('[data-excluded="true"]')).not.toBeNull();
    expect(within(tile('assassin')).getByText(EXCLUDED_LABEL)).toBeTruthy();
    expect(head('assassin').hasAttribute('disabled')).toBe(true);
    await user.click(head('assassin'));
    expect(kitSheet()).toBeNull();
    expect(screen.queryByRole('button', { name: 'Select this kit' })).toBeNull();
    expect(props.onSelect).not.toHaveBeenCalled();
    expect(tile('wizard').querySelector('[data-excluded="true"]')).toBeNull();
  });

  it('a tile opens the kit sheet above the grid; Select this kit sends the pick, then closes', async () => {
    const calls: string[] = [];
    const { user } = setup({ onSelect: (selection) => { calls.push(`select:${selection}`); }, onClose: () => { calls.push('close'); } });
    await user.click(head('wizard'));
    const sheet = screen.getByRole('dialog', { name: 'Wizard' });
    expect(sheet.getAttribute('data-lobby-sheet')).toBe('kit');
    expect(sheet.querySelector('[data-kit-id="wizard"]')).not.toBeNull();
    expect(document.querySelector('[data-lobby-sheet="kit-picker"]')).not.toBeNull();
    expect(calls).toEqual([]);
    await user.click(selectIn('Wizard'));
    expect(calls).toEqual(['select:wizard', 'close']);
  });

  it('the Random tile opens Random kit with the allowed-kits copy; Select sends random', async () => {
    const { user, props } = setup({ current: 'wizard' });
    await user.click(head('random'));
    expect(screen.getByRole('dialog', { name: 'Random kit' }).textContent).toMatch(/one of the allowed kits/);
    await user.click(selectIn('Random kit'));
    expect(props.onSelect).toHaveBeenCalledWith('random');
  });

  it('Back and Esc step back one level; Back, Esc and Close never change the pick', async () => {
    const { user, props } = setup();
    await user.click(head('wizard'));
    await user.click(within(screen.getByRole('dialog', { name: 'Wizard' })).getByRole('button', { name: 'Back' }));
    await waitFor(() => {
      expect(kitSheet()).toBeNull();
    });
    await user.click(head('wizard'));
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(kitSheet()).toBeNull();
    });
    expect(screen.getByRole('dialog', { name: 'Choose kit' })).toBeTruthy();
    expect(props.onClose).not.toHaveBeenCalled();
    expect(head('random').getAttribute('aria-pressed')).toBe('true');
    await user.keyboard('{Escape}');
    expect(props.onClose).toHaveBeenCalledTimes(1);
    await user.click(within(screen.getByRole('dialog', { name: 'Choose kit' })).getByRole('button', { name: 'Close' }));
    expect(props.onClose).toHaveBeenCalledTimes(2);
    expect(props.onSelect).not.toHaveBeenCalled();
  });

  it('the host excludes the kit being read: Select turns disabled at once with its reason and sends nothing, and the grid greys it (Review Focus 1)', async () => {
    const { user, props, rerender } = setup();
    await user.click(head('assassin'));
    const select = selectIn('Assassin');
    act(() => {
      select.focus();
    });
    rerender(<KitPickerSheet {...props} rules={{ ...defaultLobbyRules(), excludedKitIds: ['assassin'] }} />);
    expect(select.getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(select);
    expect(screen.getByText(ILLEGAL_ACTION_COPY['choose-kit-excluded'].body)).toBeTruthy();
    await user.click(select);
    expect(props.onSelect).not.toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Assassin' })).toBeTruthy();
    expect(within(tile('assassin')).getByText(EXCLUDED_LABEL)).toBeTruthy();
    expect(head('assassin').hasAttribute('disabled')).toBe(true);
  });

  it('Random only shows no sheet even while open, so turning it on closes an open picker', async () => {
    const { user, props, rerender } = setup();
    await user.click(head('wizard'));
    rerender(<KitPickerSheet {...props} rules={{ ...defaultLobbyRules(), randomOnly: true }} />);
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(props.onSelect).not.toHaveBeenCalled();
    rerender(<KitPickerSheet {...props} rules={defaultLobbyRules()} />);
    expect(screen.getByRole('dialog', { name: 'Choose kit' })).toBeTruthy();
    await waitFor(() => {
      expect(kitSheet()).toBeNull();
    });
  });

  it('while disabled the sheets still open and close, and Select sends nothing', async () => {
    const { user, props } = setup({ disabled: true });
    await user.click(head('wizard'));
    expect(selectIn('Wizard').getAttribute('aria-disabled')).toBe('true');
    await user.click(selectIn('Wizard'));
    expect(props.onSelect).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole('dialog', { name: 'Wizard' })).getByRole('button', { name: 'Back' }));
    await waitFor(() => {
      expect(kitSheet()).toBeNull();
    });
  });

  it('a double tap on Select this kit sends the pick once per kit-sheet open (A.9 ruling 5)', async () => {
    const { user, props } = setup();
    await user.click(head('wizard'));
    await user.dblClick(selectIn('Wizard'));
    expect([vi.mocked(props.onSelect).mock.calls.length, vi.mocked(props.onClose).mock.calls.length]).toEqual([1, 1]);
    await user.click(within(screen.getByRole('dialog', { name: 'Wizard' })).getByRole('button', { name: 'Back' }));
    await waitFor(() => {
      expect(kitSheet()).toBeNull();
    });
    await user.click(head('wizard'));
    await user.click(selectIn('Wizard'));
    expect(props.onSelect).toHaveBeenCalledTimes(2);
  });
  it('leads the grid with who can see your kit and that Random is the default (L76-03 copy, carried from lobby-kit-picker-dialog.test.tsx)', () => {
    setup();
    expect(within(screen.getByRole('dialog', { name: 'Choose kit' })).getByText(KIT_PICKER_LEAD)).toBeTruthy();
  });
  it('the Random kit sheet says the kit comes from the allowed kits and who can see it, and opening sends nothing (L76-03 copy, carried)', async () => {
    const { user, props } = setup();
    await user.click(head('random'));
    const sheet = screen.getByRole('dialog', { name: 'Random kit' });
    expect(within(sheet).getByText(RANDOM_KIT_ASSIGN_COPY)).toBeTruthy();
    expect(within(sheet).getByText(RANDOM_KIT_PRIVACY_COPY)).toBeTruthy();
    expect(sheet.textContent).not.toMatch(/16 kits|before this picker existed|an equivalent/);
    expect([props.onSelect, props.onClose].map((fn) => vi.mocked(fn).mock.calls.length)).toEqual([0, 0]);
  });
});
