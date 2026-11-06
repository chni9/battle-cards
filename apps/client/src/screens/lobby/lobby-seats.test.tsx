// @vitest-environment happy-dom
/**
 * Lobby seats as a mini arena: technical spec v7 §7.2, §11 (Q25); parity lobby-player-list,
 * lobby-add-bot, lobby-host-seat-kick; plan Review Focus 4 (L76-12).
 */
import { ACTION_REJECT_MESSAGE, type LobbySeatView } from '@card-battle/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { v7SeatColor } from '../../ui/palette';
import { ADD_BOT_DIFFICULTY_LABEL, ADD_BOT_LABEL, botDifficultyLabel, KICK_LABEL, KICK_TITLE, lobbyPlayersHeading } from './lobby-copy';
import { LobbyScreen, type LobbyScreenProps } from './lobby-screen';
import { LobbySeats, type LobbySeatsProps } from './lobby-seats';
import {
  expectNoLobbyIntent, guestLobbyView, hostLobbyView, isLobbyControlDisabled, LOBBY_BOT, LOBBY_GUEST, LOBBY_HOST, lobbySeat,
  makeLobbyProps, walkInLobbyView,
} from './test-lobby';

function renderLobby(overrides: Partial<LobbyScreenProps> = {}) {
  const props = makeLobbyProps(overrides);
  return { ...renderUi(<LobbyScreen {...props} />, { reducedMotion: true }), props };
}
afterEach(() => {
  vi.restoreAllMocks();
});
/** A hex as happy-dom reads it back (the PlayerName test pattern). */
function cssColor(hex: string): string {
  const probe = document.createElement('span');
  probe.style.color = hex;
  return probe.style.color;
}

/** Eight seats with 24-character nicknames: the host, then bots and humans in turn; p2 is not ready. */
const FULL_TABLE: readonly LobbySeatView[] = Array.from({ length: 8 }, (_, index): LobbySeatView => {
  const nickname = `Seat ${index} with a long name`.padEnd(24, '.');
  return index % 2 === 1
    ? { id: `p${index}`, nickname, isBot: true, botDifficulty: 'easy', isReady: true }
    : { id: `p${index}`, nickname, isBot: false, isReady: index !== 2 };
});
const fullTable = () => hostLobbyView({ you: 'p0', hostPlayerId: 'p0', players: FULL_TABLE });

describe('seats as a mini arena (spec v7 §7.2, §11 Q25)', () => {
  it('colors each seat by its view.players index, avatar and name alike', () => {
    const players = [LOBBY_GUEST, LOBBY_BOT, LOBBY_HOST];
    renderLobby({ view: hostLobbyView({ players }) });
    players.forEach((seat, index) => {
      const element = lobbySeat(seat.id);
      const name = within(element).getByText(seat.nickname);
      expect([name.getAttribute('data-seat-index'), name.style.color]).toEqual([String(index), cssColor(v7SeatColor(index))]);
      const hues = [...element.querySelectorAll('[data-seat-index]')].map((node) => node.getAttribute('data-seat-index'));
      expect(hues.length, `${seat.id} avatar and name`).toBeGreaterThanOrEqual(2);
      expect(new Set(hues)).toEqual(new Set([String(index)]));
    });
  });
  it('keeps eight 24-character nicknames whole, as text and in the difficulty names, with no kit on any seat', () => {
    renderLobby({ view: fullTable() });
    expect(screen.getByRole('heading', { name: lobbyPlayersHeading(8) })).toBeTruthy();
    for (const seat of FULL_TABLE) {
      expect(seat.nickname).toHaveLength(24);
      const element = lobbySeat(seat.id);
      expect(within(element).getByText(seat.nickname)).toBeTruthy();
      expect(element.querySelector('[data-zone="kit-portrait"]')).toBeNull();
      if (seat.isBot) expect(within(element).getByRole('radiogroup', { name: botDifficultyLabel(seat.nickname) })).toBeTruthy();
    }
  });
  it('marks each seat with a check or a cross icon, named Ready or Not ready', () => {
    renderLobby();
    expect(within(lobbySeat('host')).getByRole('img', { name: 'Ready' }).getAttribute('data-icon')).toBe('check');
    expect(within(lobbySeat('guest')).getByRole('img', { name: 'Not ready' }).getAttribute('data-icon')).toBe('close');
    expect(within(lobbySeat('bot-1')).getByRole('img', { name: 'Ready' }).getAttribute('data-icon')).toBe('check');
  });
});

describe('Add bot and bot difficulty (parity lobby-add-bot, lobby-player-list)', () => {
  it('adds a bot at the chosen difficulty, and choosing alone sends nothing', async () => {
    const { user, props } = renderLobby();
    const choice = screen.getByRole('radiogroup', { name: ADD_BOT_DIFFICULTY_LABEL });
    expect(within(choice).getByRole('radio', { name: 'Normal' }).getAttribute('aria-checked')).toBe('true');
    await user.click(within(choice).getByRole('radio', { name: 'Hard' }));
    expectNoLobbyIntent(props);
    await user.click(screen.getByRole('button', { name: ADD_BOT_LABEL }));
    expect(props.onAddBot).toHaveBeenCalledTimes(1);
    expect(props.onAddBot).toHaveBeenCalledWith('hard');
  });
  it('disables Add bot and its difficulty at 8 seats, with the room-full reason', () => {
    const { props } = renderLobby({ view: fullTable() });
    const addBot = screen.getByRole('button', { name: ADD_BOT_LABEL });
    expect(isLobbyControlDisabled(addBot)).toBe(true);
    expect(screen.getByText(ACTION_REJECT_MESSAGE['add-bot-room-full'])).toBeTruthy();
    fireEvent.click(addBot);
    expect(props.onAddBot).not.toHaveBeenCalled();
    for (const radio of within(screen.getByRole('radiogroup', { name: ADD_BOT_DIFFICULTY_LABEL })).getAllByRole('radio')) {
      expect(isLobbyControlDisabled(radio)).toBe(true);
    }
  });
  it('sends setBotDifficulty from a bot difficulty control, only for a new tier', async () => {
    const { user, props } = renderLobby();
    const control = within(lobbySeat('bot-1')).getByRole('radiogroup', { name: botDifficultyLabel('Bot Cy') });
    await user.click(within(control).getByRole('radio', { name: 'Normal' }));
    expect(props.onSetBotDifficulty).not.toHaveBeenCalled();
    await user.click(within(control).getByRole('radio', { name: 'Hard' }));
    expect(props.onSetBotDifficulty).toHaveBeenCalledTimes(1);
    expect(props.onSetBotDifficulty).toHaveBeenCalledWith('bot-1', 'hard');
  });
  it('gives a guest and a walk-in no difficulty control and no Add bot', () => {
    for (const view of [guestLobbyView(), walkInLobbyView()]) {
      const { unmount } = renderLobby({ view });
      expect(screen.queryAllByRole('radiogroup')).toHaveLength(0);
      expect(screen.queryByRole('button', { name: ADD_BOT_LABEL })).toBeNull();
      unmount();
    }
  });
});

describe('Kick confirm (plan Review Focus 4)', () => {
  it('closes the confirm and sends nothing when the target leaves, and does not reopen when it returns', async () => {
    const { user, props, rerender } = renderLobby();
    await user.click(within(lobbySeat('guest')).getByRole('button', { name: KICK_LABEL }));
    expect(screen.getByRole('dialog', { name: KICK_TITLE }).getAttribute('data-lobby-sheet')).toBe('kick-confirm');
    rerender(<LobbyScreen {...props} view={hostLobbyView({ players: [LOBBY_HOST, LOBBY_BOT] })} />);
    // An exiting V7 sheet is already aria-hidden: wait for its removal with `hidden: true`.
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: KICK_TITLE, hidden: true })).toBeNull();
    });
    rerender(<LobbyScreen {...props} view={hostLobbyView()} />);
    expect(screen.queryByRole('dialog', { name: KICK_TITLE, hidden: true })).toBeNull();
    expectNoLobbyIntent(props);
  });
  it('sends one kickPlayer on a double click of the confirm Kick', async () => {
    const { user, props } = renderLobby();
    await user.click(within(lobbySeat('bot-1')).getByRole('button', { name: KICK_LABEL }));
    const kick = within(screen.getByRole('dialog', { name: KICK_TITLE })).getByRole('button', { name: KICK_LABEL });
    fireEvent.click(kick);
    fireEvent.click(kick);
    expect(props.onKickPlayer).toHaveBeenCalledTimes(1);
    expect(props.onKickPlayer).toHaveBeenCalledWith('bot-1');
  });
});

describe('LobbySeats while locked (plan A.4; L76-14 wires the status)', () => {
  function seatsProps(overrides: Partial<LobbySeatsProps> = {}): LobbySeatsProps {
    return { view: hostLobbyView(), locked: true, onAddBot: vi.fn(), onKickPlayer: vi.fn(), onSetBotDifficulty: vi.fn(), ...overrides };
  }
  it('disables Add bot, every difficulty and every Kick, and a Kick press opens nothing', () => {
    const props = seatsProps();
    renderUi(<LobbySeats {...props} />, { reducedMotion: true });
    expect(isLobbyControlDisabled(screen.getByRole('button', { name: ADD_BOT_LABEL }))).toBe(true);
    for (const radio of screen.getAllByRole('radio')) expect(isLobbyControlDisabled(radio)).toBe(true);
    for (const kick of screen.getAllByRole('button', { name: KICK_LABEL })) {
      expect(isLobbyControlDisabled(kick)).toBe(true);
      fireEvent.click(kick);
    }
    expect(screen.queryByRole('dialog', { hidden: true })).toBeNull();
    for (const spy of [props.onAddBot, props.onKickPlayer, props.onSetBotDifficulty]) expect(spy).not.toHaveBeenCalled();
  });
  it('closes an open Kick confirm when the lobby locks, and does not reopen it after', async () => {
    const props = seatsProps({ locked: false });
    const { user, rerender } = renderUi(<LobbySeats {...props} />, { reducedMotion: true });
    await user.click(within(lobbySeat('guest')).getByRole('button', { name: KICK_LABEL }));
    expect(screen.getByRole('dialog', { name: KICK_TITLE })).toBeTruthy();
    rerender(<LobbySeats {...props} locked />);
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: KICK_TITLE, hidden: true })).toBeNull();
    });
    rerender(<LobbySeats {...props} locked={false} />);
    expect(screen.queryByRole('dialog', { name: KICK_TITLE, hidden: true })).toBeNull();
    expect(props.onKickPlayer).not.toHaveBeenCalled();
  });
});
