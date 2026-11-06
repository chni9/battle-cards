// @vitest-environment happy-dom
/** Lobby Your kit card: technical spec v7 §7.2, §7.3; parity lobby-your-kit, lobby-walk-in-notice (L76-12). */
import { defaultLobbyRules, getKit } from '@card-battle/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { CHOOSE_KIT_LABEL, RANDOM_ONLY_LOBBY_LINE, RANDOM_ONLY_SOLO_LINE } from '../kit-pick-copy';
import { YOUR_KIT_TITLE } from './lobby-copy';
import { LobbyKitCard } from './lobby-kit-card';
import { LobbyScreen, type LobbyScreenProps } from './lobby-screen';
import { guestLobbyView, hostLobbyView, isLobbyControlDisabled, makeLobbyProps } from './test-lobby';

function renderLobby(overrides: Partial<LobbyScreenProps> = {}) {
  const props = makeLobbyProps(overrides);
  return { ...renderUi(<LobbyScreen {...props} />, { reducedMotion: true }), props };
}
afterEach(() => {
  vi.restoreAllMocks();
});

const RANDOM_ONLY = { ...defaultLobbyRules(), randomOnly: true };

describe('LobbyKitCard (spec v7 §7.2, §7.3; parity lobby-your-kit)', () => {
  it('shows the current pick as a kit portrait and its label', () => {
    renderLobby({ view: hostLobbyView({ yourKitSelection: 'assassin' }) });
    const card = screen.getByRole('region', { name: YOUR_KIT_TITLE });
    expect(card.querySelector('[data-zone="kit-portrait"]')?.getAttribute('data-kit-face')).toBe('art');
    expect(within(card).getByText(getKit('assassin').name)).toBeTruthy();
  });
  it('while locked, still opens the picker, and Select this kit is disabled (plan A.4)', async () => {
    const onChooseKit = vi.fn();
    const { user } = renderUi(
      <LobbyKitCard selection="random" rules={defaultLobbyRules()} walkIn={false} isHost={false} locked onChooseKit={onChooseKit} />,
      { reducedMotion: true },
    );
    await user.click(screen.getByRole('button', { name: CHOOSE_KIT_LABEL }));
    await user.click(within(screen.getByRole('dialog', { name: 'Choose kit' })).getByRole('button', { name: getKit('assassin').name }));
    const select = screen.getByRole('button', { name: 'Select this kit' });
    expect(isLobbyControlDisabled(select)).toBe(true);
    fireEvent.click(select);
    expect(onChooseKit).not.toHaveBeenCalled();
  });
  it('under Random only, tells the host that kits will be dealt at random, with no Your kit card', () => {
    renderLobby({ view: hostLobbyView({ yourKitSelection: 'assassin', lobbyRules: RANDOM_ONLY }) });
    expect(screen.getByText(RANDOM_ONLY_SOLO_LINE)).toBeTruthy();
    expect(screen.queryByText(RANDOM_ONLY_LOBBY_LINE)).toBeNull();
    expect(screen.queryByRole('heading', { name: YOUR_KIT_TITLE })).toBeNull();
    expect(screen.queryByRole('button', { name: CHOOSE_KIT_LABEL })).toBeNull();
  });
  it('under Random only, tells a guest that the host is dealing kits at random, with no Your kit card', () => {
    renderLobby({ view: guestLobbyView({ yourKitSelection: 'assassin', lobbyRules: RANDOM_ONLY }) });
    expect(screen.getByText(RANDOM_ONLY_LOBBY_LINE)).toBeTruthy();
    expect(screen.queryByText(RANDOM_ONLY_SOLO_LINE)).toBeNull();
    expect(screen.queryByRole('heading', { name: YOUR_KIT_TITLE })).toBeNull();
    expect(screen.queryByRole('button', { name: CHOOSE_KIT_LABEL })).toBeNull();
  });
});
