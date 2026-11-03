// @vitest-environment happy-dom
/** Solo kit picker (technical spec v7 §7.1, §7.3; Appendix A `home-solo-kit-picker`, `solo-menu-rules-side-effects`). L76-10. */
import { defaultLobbyRules, latestReleaseNote } from '@card-battle/shared';
import { screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { renderUi } from '../../test/render';
import { HOW_TO_PLAY_SEEN_KEY } from '../../ui/help-storage';
import { LAST_SEEN_RELEASE_ID_KEY } from '../../ui/release-storage';
import { EXCLUDED_LABEL } from '../../ui/ui-copy';
import { RANDOM_ONLY_SOLO_LINE } from '../kit-pick-copy';
import { HomeScreen } from './home-screen';
import { expectNoHomeIntent, makeHomeProps } from './test-home';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(HOW_TO_PLAY_SEEN_KEY, '1');
  localStorage.setItem(LAST_SEEN_RELEASE_ID_KEY, latestReleaseNote().id);
});
async function openSolo(props = makeHomeProps({ nickname: 'Ada' })) {
  const result = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
  await result.user.click(screen.getByRole('button', { name: 'Play solo' }));
  return { ...result, props };
}
const grid = (): HTMLElement => screen.getByRole('dialog', { name: 'Choose kit' });
/** Every sheet has left the DOM. `queryByRole` alone is not enough: an exiting sheet is already aria-hidden. */
async function allClosed(): Promise<void> {
  await waitFor(() => {
    expect(document.querySelector('[data-zone="sheet-overlay"]')).toBeNull();
  });
}
async function editRules(user: UserEvent, control: string): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Table rules' }));
  await user.click(within(screen.getByRole('dialog', { name: 'Table rules' })).getByRole('button', { name: control }));
  await user.keyboard('{Escape}');
  await allClosed();
}

describe('solo kit picker (L76-10)', () => {
  it('Select only sets the local pick; nothing leaves until Start solo game', async () => {
    const { user, props } = await openSolo();
    await user.click(screen.getByRole('button', { name: 'Choose kit' }));
    await user.click(within(grid()).getByRole('button', { name: 'Assassin' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Assassin' })).getByRole('button', { name: 'Select this kit' }));
    await allClosed();
    expectNoHomeIntent(props);
    expect(screen.getByText('Assassin')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Start solo game' }));
    expect(props.onStartSolo).toHaveBeenCalledWith(1, 'normal', 'assassin', { lobbyRules: defaultLobbyRules(), includeTurnTime: false });
  });

  it('Back, Esc and Close keep the solo pick', async () => {
    const { user, props } = await openSolo();
    await user.click(screen.getByRole('button', { name: 'Choose kit' }));
    await user.click(within(grid()).getByRole('button', { name: 'Wizard' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Wizard' })).getByRole('button', { name: 'Back' }));
    await user.click(within(grid()).getByRole('button', { name: 'Close' }));
    await allClosed();
    await user.click(screen.getByRole('button', { name: 'Choose kit' }));
    await user.click(within(grid()).getByRole('button', { name: 'Wizard' }));
    await user.keyboard('{Escape}');
    await user.keyboard('{Escape}');
    await allClosed();
    expect(screen.getByText('Random kit')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Start solo game' }));
    expect(props.onStartSolo).toHaveBeenCalledWith(1, 'normal', 'random', { lobbyRules: defaultLobbyRules(), includeTurnTime: false });
  });

  it('greys the kits the local rules exclude, and Random only swaps Choose kit for the dealt line', async () => {
    const { user } = await openSolo();
    await editRules(user, 'Ghost');
    await user.click(screen.getByRole('button', { name: 'Choose kit' }));
    const ghost = grid().querySelector<HTMLElement>('[data-kit-picker-tile="ghost"]');
    if (ghost === null) throw new Error('no ghost tile');
    expect(within(ghost).getByText(EXCLUDED_LABEL)).toBeTruthy();
    expect(within(ghost).getByRole('button').hasAttribute('disabled')).toBe(true);
    await user.click(within(grid()).getByRole('button', { name: 'Close' }));
    await allClosed();
    await editRules(user, 'Random');
    expect(screen.queryByRole('button', { name: 'Choose kit' })).toBeNull();
    expect(screen.getByText(RANDOM_ONLY_SOLO_LINE)).toBeTruthy();
  });
});
