// @vitest-environment happy-dom
/**
 * The lobby's reject alert and its reconnecting lock: technical spec v7 §7.2, §7.7, §13 (Q26, Q29);
 * Appendix A `lobby-inline-reject-alert`, `lobby-sticky-reject-alert`, `lobby-header-status`;
 * A.9 rulings 4, 6 and 8 (L76-14).
 */
import { ACTION_REJECT_MESSAGE, KIT_IDS, type LobbyStateView } from '@card-battle/shared';
import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { STATUS_LABELS } from '../status-labels';
import { LOBBY_DISMISS_LABEL } from './lobby-copy';
import { LobbyScreen, type LobbyScreenProps } from './lobby-screen';
import {
  expectNoLobbyIntent, guestLobbyView, hostLobbyView, LOBBY_BOT, LOBBY_GUEST, LOBBY_HOST, lobbySeat, makeLobbyProps,
} from './test-lobby';

/** Not needed by any assertion: pins a desktop box so the sheets center, whatever the happy-dom default size. */
class FakeVisualViewport extends EventTarget { offsetTop = 0; offsetLeft = 0; width = 1440; height = 900; }
/** A native `disabled` or the `aria-disabled` of a `focusableWhenDisabled` Button. */
const isDisabled = (element: HTMLElement): boolean =>
  element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true';
// Toasts and sheets portal to document.body: lobby controls are queried inside <main>.
const main = (): HTMLElement => screen.getByRole('main');
const button = (name: string): HTMLElement => within(main()).getByRole('button', { name });
const dialog = (name: string): HTMLElement => screen.getByRole('dialog', { name });
const gone = async (name: string): Promise<void> => {
  await waitFor(() => { expect(screen.queryByRole('dialog', { name })).toBeNull(); });
};
function setup(overrides: Partial<LobbyScreenProps>) {
  const props = makeLobbyProps(overrides);
  const result = renderUi(<LobbyScreen {...props} />, { reducedMotion: true });
  const show = (next: Partial<LobbyScreenProps>): void => { result.rerender(<LobbyScreen {...props} {...next} />); };
  return { props, show, ...result };
}
/** The guest is ready, so Start is enabled while connected. */
const readyHostView = (): LobbyStateView =>
  hostLobbyView({ players: [LOBBY_HOST, { ...LOBBY_GUEST, isReady: true }, LOBBY_BOT] });

beforeEach(() => { vi.stubGlobal('visualViewport', new FakeVisualViewport()); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('lobby reject alert (§7.2, §7.7, Q26, A.9 ruling 4)', () => {
  const message = ACTION_REJECT_MESSAGE['start-not-all-ready'];

  it('shows the reject in a role="alert" line with an OK beside it; OK calls onDismissError once and sends nothing', async () => {
    const { user, props } = setup({ error: message });
    const block = main().querySelector<HTMLElement>('[data-lobby-alert]');
    if (block === null) throw new Error('no lobby alert');
    const alert = within(block).getByRole('alert');
    expect(alert.textContent).toBe(message);
    const ok = within(block).getByRole('button', { name: LOBBY_DISMISS_LABEL });
    expect(alert.contains(ok)).toBe(false); // the live region announces the message only
    await user.click(ok);
    expect(props.onDismissError).toHaveBeenCalledTimes(1);
    expectNoLobbyIntent(props);
  });

  it('renders no alert and no OK without an error', () => {
    setup({ error: null });
    expect(main().querySelector('[data-lobby-alert]')).toBeNull();
    expect(within(main()).queryByRole('alert')).toBeNull();
  });
});

describe('lobby while reconnecting (§7.2, Q29, A.9 ruling 6)', () => {
  it('reads the connection in a polite status line, Reconnecting… included', () => {
    const { show } = setup({ status: 'connected' });
    expect(within(main()).getByRole('status').textContent).toContain(STATUS_LABELS.connected);
    show({ status: 'reconnecting' });
    expect(within(main()).getByRole('status').textContent).toContain(STATUS_LABELS.reconnecting);
  });

  it('host: Start, Add bot, both difficulty controls and Kick lock and send nothing; Leave and Copy stay live; the reconnect unlocks them', async () => {
    const { user, props, show } = setup({ view: readyHostView(), status: 'reconnecting' });
    const locked = (): HTMLElement[] => [
      button('Start game'),
      button('Add bot'),
      within(lobbySeat('guest')).getByRole('button', { name: 'Kick' }),
      within(lobbySeat('bot-1')).getByRole('button', { name: 'Kick' }),
      ...within(main()).getAllByRole('radio'), // the bot's difficulty and Add bot's difficulty
    ];
    expect(locked().every(isDisabled)).toBe(true);
    expect(within(main()).getByRole('radiogroup', { name: 'Bot Cy difficulty' }).getAttribute('aria-disabled')).toBe('true');
    for (const control of locked()) await user.click(control);
    expectNoLobbyIntent(props);
    await user.click(button('Leave'));
    expect(props.onLeave).toHaveBeenCalledTimes(1);
    await user.click(button('Copy'));
    expect(await screen.findByRole('dialog', { name: 'Code copied' })).toBeDefined(); // the copy awaits the clipboard
    await user.keyboard('{Escape}');
    await gone('Code copied');
    show({ status: 'connected' });
    expect(locked().some(isDisabled)).toBe(false);
    await user.click(button('Start game'));
    expect(props.onStart).toHaveBeenCalledTimes(1);
  });

  it('host: the Table rules sheet still opens, with every editor control disabled; Close works', async () => {
    const { user, props } = setup({ status: 'reconnecting' });
    await user.click(button('Table rules'));
    const sheet = dialog('Table rules');
    const close = within(sheet).getByRole('button', { name: 'Close' });
    const editorButtons = within(sheet).getAllByRole('button').filter((control) => control !== close);
    expect(editorButtons.length).toBeGreaterThanOrEqual(KIT_IDS.length + 3); // 16 kits, All, None, Random
    expect([within(sheet).getByRole('slider'), ...editorButtons].every(isDisabled)).toBe(true);
    for (const control of editorButtons) await user.click(control);
    expectNoLobbyIntent(props);
    await user.click(close);
    await gone('Table rules');
  });

  it('guest: Ready, Select this kit and chat lock and send nothing; the kit picker still opens and Feedback stays live', async () => {
    const { user, props } = setup({ view: guestLobbyView(), status: 'reconnecting' });
    expect(isDisabled(button('Ready'))).toBe(true);
    await user.click(button('Ready'));
    await user.click(button('Choose kit'));                    // opening sends nothing: live (ruling 6)
    await user.click(within(dialog('Choose kit')).getByRole('button', { name: 'Assassin' }));
    const select = within(dialog('Assassin')).getByRole('button', { name: 'Select this kit' });
    expect(isDisabled(select)).toBe(true);
    await user.click(select);
    await user.keyboard('{Escape}');                            // Esc steps back one level (A.5)
    await gone('Assassin');
    await user.keyboard('{Escape}');
    await gone('Choose kit');
    const message = within(main()).getByRole<HTMLInputElement>('textbox', { name: 'Message' });
    await user.type(message, 'brb{Enter}');
    const send = button('Send');
    expect(isDisabled(send)).toBe(true);
    await user.click(send);
    expect(message.value).toBe('brb');
    await user.click(button('Feedback'));
    expect(dialog('Feedback')).toBeDefined();
    expectNoLobbyIntent(props);
  });

  it('closes an open Kick confirm when the connection drops, and it stays closed after the reconnect', async () => {
    const { user, props, show } = setup({ status: 'connected' });
    await user.click(within(lobbySeat('guest')).getByRole('button', { name: 'Kick' }));
    expect(dialog('Kick this player?')).toBeDefined();
    show({ status: 'reconnecting' });
    await gone('Kick this player?');
    show({ status: 'connected' });
    expect(screen.queryByRole('dialog', { name: 'Kick this player?' })).toBeNull();
    expectNoLobbyIntent(props);
  });
});
