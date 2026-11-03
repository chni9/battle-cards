// @vitest-environment happy-dom
/**
 * Lobby screen behavior: technical spec v7 §7.2 and §12.1. These are the rendered replacements of
 * the six lobby source-text tests (L76-02). Parity rows: `lobby-player-list`, `lobby-kick-confirm`,
 * `lobby-host-seat-kick`, `lobby-your-kit`, `lobby-action-row`, `lobby-kit-picker-dialog`,
 * `global-feedback-entry-points`, `global-visual-viewport-fit`. The tests use only the plan A.4
 * hooks and names, so they hold through the L76-12 restyle. A test that opens or closes a dialog
 * asserts that no intent fired.
 */
import { defaultLobbyRules, getKit, KIT_IDS } from '@card-battle/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import { submitFeedback } from '../../feedback/submit-feedback';
import { renderUi } from '../../test/render';
import { LobbyScreen, type LobbyScreenProps } from './lobby-screen';
import {
  expectNoLobbyIntent, guestLobbyView, hostLobbyView, isLobbyControlDisabled, LOBBY_BOT, LOBBY_GUEST,
  LOBBY_HOST, lobbyBackdrop, lobbySeat, makeLobbyProps, walkInLobbyView,
} from './test-lobby';

vi.mock('../../feedback/submit-feedback', () => ({
  submitFeedback: vi.fn(() => Promise.resolve({ ok: true as const })),
}));

function renderLobby(overrides: Partial<LobbyScreenProps> = {}) {
  const props = makeLobbyProps(overrides);
  return { ...renderUi(<LobbyScreen {...props} />, { reducedMotion: true }), props };
}
/** True when `later` comes after `earlier` in document order. */
function follows(earlier: Node, later: Node): boolean {
  return (earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}
const KICK_CONFIRM = 'Kick this player?';
const READY_GUEST = { ...LOBBY_GUEST, isReady: true };

beforeEach(() => {
  vi.mocked(submitFeedback).mockClear();
});

describe('lobby seats (L49-02, L57-16; parity lobby-player-list)', () => {
  it('lists every seat under Players (3/8) with (you), Host and the bot label, for every viewer', () => {
    const viewers = [
      { view: hostLobbyView(), you: 'host' },
      { view: guestLobbyView(), you: 'guest' },
      { view: walkInLobbyView(), you: null },
    ];
    for (const { view, you } of viewers) {
      const { unmount } = renderLobby({ view });
      expect(screen.getByRole('heading', { name: 'Players (3/8)' })).toBeTruthy();
      for (const seat of [LOBBY_HOST, LOBBY_GUEST, LOBBY_BOT]) {
        const text = lobbySeat(seat.id).textContent;
        expect(text.includes(`${seat.nickname} (you)`), `${seat.id} for ${String(you)}`).toBe(seat.id === you);
      }
      expect(within(lobbySeat('host')).getByText('Host')).toBeTruthy();
      expect(within(lobbySeat('guest')).queryByText('Host')).toBeNull();
      expect(lobbySeat('bot-1').textContent).toContain('Bot·Normal');
      unmount();
    }
  });

  it('puts the ready mark of each seat, named Ready or Not ready, before the nickname', () => {
    renderLobby();
    for (const seat of [LOBBY_HOST, LOBBY_GUEST, LOBBY_BOT]) {
      const scope = within(lobbySeat(seat.id));
      const mark = scope.getByLabelText(seat.isReady ? 'Ready' : 'Not ready');
      const name = scope.getByText(new RegExp(`^${seat.nickname}`));
      expect(follows(mark, name), seat.id).toBe(true);
    }
  });

  it('never renders a kit on a seat; the chosen kit shows only on Your kit', () => {
    renderLobby({ view: hostLobbyView({ yourKitSelection: 'assassin' }) });
    const kitNames = KIT_IDS.map((kitId) => getKit(kitId).name);
    for (const seat of [LOBBY_HOST, LOBBY_GUEST, LOBBY_BOT]) {
      const element = lobbySeat(seat.id);
      expect(element.querySelector('[data-zone="kit-portrait"]'), seat.id).toBeNull();
      for (const name of kitNames) expect(element.textContent, `${seat.id} / ${name}`).not.toContain(name);
    }
    const shown = screen.getAllByText(getKit('assassin').name);
    expect(shown).toHaveLength(1);
    expect(shown[0]?.closest('[data-lobby-seat]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Choose kit' })).toBeTruthy();
  });

  it('shows Random kit on Your kit for a random pick', () => {
    renderLobby();
    expect(screen.getByText('Random kit')).toBeTruthy();
  });
});

describe('Choose kit (L49-02; parity lobby-your-kit, lobby-kit-picker-dialog)', () => {
  it('opens the kit picker from Choose kit and sends nothing', async () => {
    const { user, props } = renderLobby();
    await user.click(screen.getByRole('button', { name: 'Choose kit' }));
    expect(screen.getByRole('dialog', { name: 'Choose kit' })).toBeTruthy();
    expectNoLobbyIntent(props);
  });

  it('sends chooseKit only from Select this kit', async () => {
    const { user, props } = renderLobby();
    await user.click(screen.getByRole('button', { name: 'Choose kit' }));
    const picker = screen.getByRole('dialog', { name: 'Choose kit' });
    await user.click(within(picker).getByRole('button', { name: getKit('assassin').name }));
    expectNoLobbyIntent(props);
    await user.click(screen.getByRole('button', { name: 'Select this kit' }));
    expect(props.onChooseKit).toHaveBeenCalledTimes(1);
    expect(props.onChooseKit).toHaveBeenCalledWith('assassin');
  });

  it('hides Choose kit under Random only', () => {
    renderLobby({ view: hostLobbyView({ lobbyRules: { ...defaultLobbyRules(), randomOnly: true } }) });
    expect(screen.queryByRole('button', { name: 'Choose kit' })).toBeNull();
  });

  it('shows a walk-in Watching the lobby, the waiting copy, and no kit card, Ready or Start', () => {
    renderLobby({ view: walkInLobbyView() });
    expect(screen.getByText('Watching the lobby')).toBeTruthy();
    expect(screen.getByText('Waiting for the host to start…')).toBeTruthy();
    for (const name of ['Choose kit', 'Ready', 'Start game']) {
      expect(screen.queryByRole('button', { name }), name).toBeNull();
    }
  });
});

describe('Kick (L57-09; parity lobby-kick-confirm, lobby-host-seat-kick)', () => {
  it('gives the host Kick on every other seat, bot and human, and none on their own', () => {
    renderLobby();
    expect(within(lobbySeat('host')).queryByRole('button', { name: 'Kick' })).toBeNull();
    expect(within(lobbySeat('guest')).getByRole('button', { name: 'Kick' })).toBeTruthy();
    expect(within(lobbySeat('bot-1')).getByRole('button', { name: 'Kick' })).toBeTruthy();
  });

  it('gives a guest and a walk-in no Kick at all', () => {
    for (const view of [guestLobbyView(), walkInLobbyView()]) {
      const { unmount } = renderLobby({ view });
      expect(screen.queryAllByRole('button', { name: 'Kick' })).toHaveLength(0);
      unmount();
    }
  });

  it('opens Kick this player? from a seat Kick and sends nothing', async () => {
    const { user, props } = renderLobby();
    await user.click(within(lobbySeat('guest')).getByRole('button', { name: 'Kick' }));
    const confirm = screen.getByRole('dialog', { name: KICK_CONFIRM });
    expect(within(confirm).getByText('Bea will leave this lobby. They can join again with the code.')).toBeTruthy();
    expectNoLobbyIntent(props);
  });

  it.each(['Cancel', 'Esc', 'the backdrop'] as const)('closes the confirm on %s and sends nothing', async (way) => {
    const { user, props } = renderLobby();
    await user.click(within(lobbySeat('guest')).getByRole('button', { name: 'Kick' }));
    const confirm = screen.getByRole('dialog', { name: KICK_CONFIRM });
    if (way === 'Cancel') await user.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    else if (way === 'Esc') await user.keyboard('{Escape}');
    else await user.click(lobbyBackdrop(confirm));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: KICK_CONFIRM })).toBeNull();
    });
    expectNoLobbyIntent(props);
  });

  it.each([
    ['guest', 'Bea'],
    ['bot-1', 'Bot Cy'],
  ] as const)('kicks %s only from the confirm Kick, then closes', async (id, nickname) => {
    const { user, props } = renderLobby();
    await user.click(within(lobbySeat(id)).getByRole('button', { name: 'Kick' }));
    const confirm = screen.getByRole('dialog', { name: KICK_CONFIRM });
    expect(within(confirm).getByText(`${nickname} will leave this lobby. They can join again with the code.`)).toBeTruthy();
    await user.click(within(confirm).getByRole('button', { name: 'Kick' }));
    expect(props.onKickPlayer).toHaveBeenCalledTimes(1);
    expect(props.onKickPlayer).toHaveBeenCalledWith(id);
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: KICK_CONFIRM })).toBeNull();
    });
  });

  it('has no remove-bot callback: bots leave through Kick', () => {
    expectTypeOf<LobbyScreenProps>().not.toHaveProperty('onRemoveBot');
    expect('onRemoveBot' in makeLobbyProps()).toBe(false);
  });
});

describe('Ready and Start (L57-11; parity lobby-action-row)', () => {
  it('lets a guest who is not ready press Ready, with its check icon, which sends setReady(true)', async () => {
    const { user, props } = renderLobby({ view: guestLobbyView() });
    const ready = screen.getByRole('button', { name: 'Ready' });
    expect(ready.querySelector('svg')).not.toBeNull();
    expect(screen.getByText('Press Ready when you are set.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start game' })).toBeNull();
    await user.click(ready);
    expect(props.onSetReady).toHaveBeenCalledTimes(1);
    expect(props.onSetReady).toHaveBeenCalledWith(true);
  });

  it('lets a ready guest press Cancel ready, which sends setReady(false)', async () => {
    const { user, props } = renderLobby({ view: guestLobbyView({ players: [LOBBY_HOST, READY_GUEST, LOBBY_BOT] }) });
    expect(screen.getByText('Waiting for the host to start…')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Ready' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Cancel ready' }));
    expect(props.onSetReady).toHaveBeenCalledTimes(1);
    expect(props.onSetReady).toHaveBeenCalledWith(false);
  });

  it('gives the host Start and no Ready, disabled until every human guest is ready', async () => {
    const { user, props, rerender } = renderLobby();
    expect(screen.queryByRole('button', { name: 'Ready' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancel ready' })).toBeNull();
    const grey = screen.getByRole('button', { name: 'Start game' });
    expect(isLobbyControlDisabled(grey)).toBe(true);
    fireEvent.click(grey);
    expect(props.onStart).not.toHaveBeenCalled();
    rerender(<LobbyScreen {...props} view={hostLobbyView({ players: [LOBBY_HOST, READY_GUEST, LOBBY_BOT] })} />);
    const start = screen.getByRole('button', { name: 'Start game' });
    expect(isLobbyControlDisabled(start)).toBe(false);
    await user.click(start);
    expect(props.onStart).toHaveBeenCalledTimes(1);
  });

  it('enables Start for the host plus bots, and keeps it disabled for the host alone', () => {
    const { unmount } = renderLobby({ view: hostLobbyView({ players: [LOBBY_HOST, LOBBY_BOT] }) });
    expect(isLobbyControlDisabled(screen.getByRole('button', { name: 'Start game' }))).toBe(false);
    unmount();
    renderLobby({ view: hostLobbyView({ players: [LOBBY_HOST] }) });
    expect(isLobbyControlDisabled(screen.getByRole('button', { name: 'Start game' }))).toBe(true);
  });

  it('leaves at once from Leave, with no confirm', async () => {
    const { user, props } = renderLobby();
    await user.click(screen.getByRole('button', { name: 'Leave' }));
    expect(props.onLeave).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('Feedback (L47-03; parity global-feedback-entry-points)', () => {
  it('opens manual Feedback for screen lobby with the game code and the nickname', async () => {
    const { user, props } = renderLobby();
    expect(screen.queryByText(/Feedback on the felt/)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Feedback' }));
    const dialog = screen.getByRole('dialog', { name: 'Feedback' });
    expectNoLobbyIntent(props);
    await user.click(within(dialog).getByRole('button', { name: 'UI' }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Message' }), 'Kick looks odd');
    await user.click(within(dialog).getByRole('button', { name: 'Send' }));
    expect(submitFeedback).toHaveBeenCalledTimes(1);
    const [payload] = vi.mocked(submitFeedback).mock.calls[0] ?? [];
    expect(payload).toMatchObject({ screen: 'lobby', gameCode: 'ABCDEF', nickname: 'Ada', message: 'Kick looks odd' });
    expect(payload).not.toHaveProperty('playKind');
    expect(payload).not.toHaveProperty('logTail');
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Feedback' })).toBeNull();
    });
    expectNoLobbyIntent(props);
  });
});

describe('chat (L76-02 moves the lobby to ui/chat ChatLog)', () => {
  it('sends the trimmed chat body through onSendChat', async () => {
    const { user, props } = renderLobby();
    await user.type(screen.getByRole('textbox', { name: 'Message' }), '  hello lobby  {Enter}');
    expect(props.onSendChat).toHaveBeenCalledTimes(1);
    expect(props.onSendChat).toHaveBeenCalledWith('hello lobby');
  });
});

describe('viewport (L53-07; parity global-visual-viewport-fit)', () => {
  it('scrolls inside #root: main is the scroll container and nothing uses 100dvh', () => {
    renderLobby();
    const main = screen.getByRole('main');
    expect(main.className.split(/\s+/)).toEqual(expect.arrayContaining(['overflow-y-auto', 'overscroll-contain']));
    expect(main.className).not.toContain('overflow-hidden');
    expect(document.body.innerHTML).not.toContain('100dvh');
  });
});
