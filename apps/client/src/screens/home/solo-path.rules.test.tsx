// @vitest-environment happy-dom
/** Solo table rules (technical spec v7 §7.1, §7.4, §13 Q3/Q31, Q8; Appendix A `home-solo-table-rules`,
 * `solo-menu-rules`, `solo-menu-rules-side-effects`, `rules-turn-time-default-override`). L76-09. */
import { defaultLobbyRules, latestReleaseNote } from '@card-battle/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { renderUi } from '../../test/render';
import { HOW_TO_PLAY_SEEN_KEY } from '../../ui/help-storage';
import { LAST_SEEN_RELEASE_ID_KEY } from '../../ui/release-storage';
import { SERVER_DEFAULT_LABEL } from '../../ui/ui-copy';
import { HomeScreen } from './home-screen';
import { expectNoHomeIntent, makeHomeProps } from './test-home';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(HOW_TO_PLAY_SEEN_KEY, '1');                         // no soft gate on Play solo
  localStorage.setItem(LAST_SEEN_RELEASE_ID_KEY, latestReleaseNote().id);  // no What's new auto-open
});

async function openSolo(props = makeHomeProps({ nickname: 'Ada' })) {
  const result = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
  await result.user.click(screen.getByRole('button', { name: 'Play solo' }));
  return { ...result, props };
}
const strip = (): HTMLElement => screen.getByRole('button', { name: 'Table rules' });
const sheet = (): HTMLElement => screen.getByRole('dialog', { name: 'Table rules' });
async function closeSheet(user: UserEvent): Promise<void> {
  await user.keyboard('{Escape}');
  await waitFor(() => {
    expect(screen.queryByRole('dialog', { name: 'Table rules' })).toBeNull();
  });
}

describe('solo table rules (L76-09)', () => {
  it('an untouched solo menu reads Server default and launches with includeTurnTime false', async () => {
    const { user, props } = await openSolo();
    expect(within(strip()).getByText(SERVER_DEFAULT_LABEL)).toBeTruthy();
    await user.click(strip());
    expect(within(sheet()).getByRole('slider', { name: 'Human turn' }).getAttribute('aria-valuetext')).toBe(SERVER_DEFAULT_LABEL);
    await closeSheet(user);
    expectNoHomeIntent(props);
    await user.click(screen.getByRole('button', { name: 'Start solo game' }));
    expect(props.onStartSolo).toHaveBeenCalledWith(1, 'normal', 'random', { lobbyRules: defaultLobbyRules(), includeTurnTime: false });
  });

  it('kit and Random edits apply locally and keep includeTurnTime false', async () => {
    const { user, props } = await openSolo();
    await user.click(strip());
    await user.click(within(sheet()).getByRole('button', { name: 'Ghost' }));
    await user.click(within(sheet()).getByRole('button', { name: 'Random' }));
    expect(within(sheet()).getByRole('button', { name: 'Ghost' }).getAttribute('aria-pressed')).toBe('false');
    await closeSheet(user);
    expect(within(strip()).getByText(SERVER_DEFAULT_LABEL)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Start solo game' }));
    expect(props.onStartSolo).toHaveBeenCalledWith(1, 'normal', 'random', {
      lobbyRules: { excludedKitIds: ['ghost'], randomOnly: true, turnTimeSeconds: 60 }, includeTurnTime: false,
    });
  });

  it('only a slider release flips includeTurnTime: the strip then shows the seconds and the launch sends them', async () => {
    const { user, props } = await openSolo();
    await user.click(strip());
    const slider = within(sheet()).getByRole('slider', { name: 'Human turn' });
    fireEvent.pointerDown(slider);
    fireEvent.input(slider, { target: { value: '90' } });
    expect(within(strip()).getByText(SERVER_DEFAULT_LABEL)).toBeTruthy();
    fireEvent.pointerUp(slider);
    expect(within(strip()).getByText('90s')).toBeTruthy();
    await closeSheet(user);
    await user.click(screen.getByRole('button', { name: 'Start solo game' }));
    expect(props.onStartSolo).toHaveBeenCalledWith(1, 'normal', 'random', {
      lobbyRules: { ...defaultLobbyRules(), turnTimeSeconds: 90 }, includeTurnTime: true,
    });
  });

  it('excluding the local pick resets it to Random', async () => {
    const props = makeHomeProps({
      nickname: 'Ada',
      soloMenuSeed: { opponentCount: 1, difficulty: 'normal', kitSelection: 'assassin', lobbyRules: defaultLobbyRules() },
    });
    const { user } = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
    expect(screen.getByText('Assassin')).toBeTruthy();
    await user.click(strip());
    await user.click(within(sheet()).getByRole('button', { name: 'Assassin' }));
    await closeSheet(user);
    expect(screen.getByText('Random kit')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Start solo game' }));
    expect(props.onStartSolo).toHaveBeenCalledWith(1, 'normal', 'random', {
      lobbyRules: { excludedKitIds: ['assassin'], randomOnly: false, turnTimeSeconds: 60 }, includeTurnTime: true,
    });
  });

  it('disables the editor during a solo launch while the strip still opens (Q8)', async () => {
    const { user, props, rerender } = await openSolo();
    rerender(<HomeScreen {...props} soloLaunchPending />);
    await user.click(strip());
    expect(within(sheet()).getByRole('slider', { name: 'Human turn' }).hasAttribute('disabled')).toBe(true);
    for (const name of ['All', 'None', 'Random', 'Ghost']) {
      expect(within(sheet()).getByRole('button', { name }).hasAttribute('disabled'), name).toBe(true);
    }
    expectNoHomeIntent(props);
  });
});
