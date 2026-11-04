// @vitest-environment happy-dom
/** Lobby kit picker (technical spec v7 §7.2, §7.3; Appendix A `lobby-your-kit`, `lobby-kit-picker-dialog`,
 * `lobby-rules-change-guest-effects`). L76-10. */
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { defaultLobbyRules } from '@card-battle/shared';

import { renderUi } from '../../test/render';
import { EXCLUDED_LABEL } from '../../ui/ui-copy';
import { RANDOM_ONLY_LOBBY_LINE } from '../kit-pick-copy';
import { LobbyScreen } from './lobby-screen';
import { expectNoLobbyIntent, guestLobbyView, makeLobbyProps } from './test-lobby';

const grid = (): HTMLElement => screen.getByRole('dialog', { name: 'Choose kit' });

describe('lobby kit picker (L76-10)', () => {
  it('Choose kit opens the picker; Close sends nothing; Select sends onChooseKit once and closes it', async () => {
    const props = makeLobbyProps({ view: guestLobbyView() });
    const { user } = renderUi(<LobbyScreen {...props} />, { reducedMotion: true });
    await user.click(screen.getByRole('button', { name: 'Choose kit' }));
    expect(grid().getAttribute('data-lobby-sheet')).toBe('kit-picker');
    await user.click(within(grid()).getByRole('button', { name: 'Close' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Choose kit' })).toBeNull();
    });
    expectNoLobbyIntent(props);
    await user.click(screen.getByRole('button', { name: 'Choose kit' }));
    await user.click(within(grid()).getByRole('button', { name: 'Wizard' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Wizard' })).getByRole('button', { name: 'Select this kit' }));
    expect(props.onChooseKit).toHaveBeenCalledTimes(1);
    expect(props.onChooseKit).toHaveBeenCalledWith('wizard');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('keeps an excluded kit in the grid, greyed, labelled and not selectable', async () => {
    const props = makeLobbyProps({ view: guestLobbyView({ lobbyRules: { ...defaultLobbyRules(), excludedKitIds: ['ghost'] } }) });
    const { user } = renderUi(<LobbyScreen {...props} />, { reducedMotion: true });
    await user.click(screen.getByRole('button', { name: 'Choose kit' }));
    const ghost = grid().querySelector<HTMLElement>('[data-kit-picker-tile="ghost"]');
    if (ghost === null) throw new Error('no ghost tile');
    expect(within(ghost).getByText(EXCLUDED_LABEL)).toBeTruthy();
    expect(within(ghost).getByRole('button').hasAttribute('disabled')).toBe(true);
  });

  it('turning Random only on closes the picker and swaps Choose kit for the dealt line; turning it off does not reopen it', async () => {
    const props = makeLobbyProps({ view: guestLobbyView() });
    const { user, rerender } = renderUi(<LobbyScreen {...props} />, { reducedMotion: true });
    await user.click(screen.getByRole('button', { name: 'Choose kit' }));
    rerender(<LobbyScreen {...props} view={guestLobbyView({ lobbyRules: { ...defaultLobbyRules(), randomOnly: true } })} />);
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Choose kit' })).toBeNull();
    });
    expect(screen.queryByRole('button', { name: 'Choose kit' })).toBeNull();
    expect(screen.getByText(RANDOM_ONLY_LOBBY_LINE)).toBeTruthy();
    rerender(<LobbyScreen {...props} view={guestLobbyView()} />);
    expect(screen.getByRole('button', { name: 'Choose kit' })).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Choose kit' })).toBeNull();
    expectNoLobbyIntent(props);
  });
});
