// @vitest-environment happy-dom
/**
 * The guest rules toast on the rendered lobby: technical spec v7 §7.4 (Q16, Q17), §10.6;
 * A.9 rulings 4 and 10 (L76-15).
 */
import { defaultLobbyRules, type LobbyRules } from '@card-battle/shared';
import { act, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { LOBBY_DISMISS_LABEL, PICK_RESET_BODY, RULES_CHANGED_TITLE } from './lobby-copy';
import { LobbyScreen } from './lobby-screen';
import { LOBBY_RULES_TOAST_MS } from './rules-change-notice';
import { expectNoLobbyIntent, guestLobbyView, hostLobbyView, makeLobbyProps } from './test-lobby';

const rules = (overrides: Partial<LobbyRules> = {}): LobbyRules => ({ ...defaultLobbyRules(), ...overrides });
const toast = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-zone="toast"]');
function openToast(): HTMLElement {
  const found = toast();
  if (found === null) throw new Error('no toast');
  return found;
}

describe('guest rules toast (§7.4, Q16, Q17, A.9 rulings 4 and 10)', () => {
  it("toasts 'Rules changed' to a seated guest when the host changes a rule; OK closes it and sends nothing", async () => {
    const props = makeLobbyProps({ view: guestLobbyView() });
    const { user, rerender } = renderUi(<LobbyScreen {...props} />, { reducedMotion: true });
    expect(toast()).toBeNull(); // the first view never toasts
    rerender(<LobbyScreen {...props} view={guestLobbyView({ lobbyRules: rules({ turnTimeSeconds: 90 }) })} />);
    const card = openToast();
    expect(card.textContent).toContain(RULES_CHANGED_TITLE);
    expect(card.textContent).not.toContain(PICK_RESET_BODY);
    expect(card.closest('[role="status"]')).not.toBeNull(); // tone info: polite
    await user.click(within(card).getByRole('button', { name: LOBBY_DISMISS_LABEL }));
    await waitFor(() => { expect(toast()).toBeNull(); });
    expectNoLobbyIntent(props);
  });

  it("adds the reset line when the host's exclusion moved the guest's pick to Random", () => {
    const props = makeLobbyProps({ view: guestLobbyView({ yourKitSelection: 'assassin' }) });
    const { rerender } = renderUi(<LobbyScreen {...props} />, { reducedMotion: true });
    rerender(<LobbyScreen {...props} view={guestLobbyView({ yourKitSelection: 'random', lobbyRules: rules({ excludedKitIds: ['assassin'] }) })} />);
    expect(openToast().textContent).toContain(RULES_CHANGED_TITLE);
    expect(openToast().textContent).toContain(PICK_RESET_BODY);
  });

  it('never toasts the host', () => {
    const props = makeLobbyProps({ view: hostLobbyView() });
    const { rerender } = renderUi(<LobbyScreen {...props} />, { reducedMotion: true });
    rerender(<LobbyScreen {...props} view={hostLobbyView({ lobbyRules: rules({ turnTimeSeconds: 90 }) })} />);
    expect(toast()).toBeNull();
  });

  it('stays open through later views, keeps the reset line, and closes itself LOBBY_RULES_TOAST_MS after it opened', async () => {
    vi.useFakeTimers();
    const excluded = rules({ excludedKitIds: ['assassin'] });
    const props = makeLobbyProps({ view: guestLobbyView({ yourKitSelection: 'assassin' }) });
    const { rerender } = renderUi(<LobbyScreen {...props} />, { reducedMotion: true, advanceTimers: vi.advanceTimersByTime });
    rerender(<LobbyScreen {...props} view={guestLobbyView({ yourKitSelection: 'random', lobbyRules: excluded })} />);
    act(() => { vi.advanceTimersByTime(1000); });
    rerender(<LobbyScreen {...props} view={guestLobbyView({ yourKitSelection: 'random', lobbyRules: excluded })} />); // same rules
    rerender(<LobbyScreen {...props} view={guestLobbyView({ yourKitSelection: 'random', lobbyRules: rules({ excludedKitIds: ['assassin', 'ghost'] }) })} />);
    expect(openToast().textContent).toContain(PICK_RESET_BODY);
    act(() => { vi.advanceTimersByTime(LOBBY_RULES_TOAST_MS - 1001); });
    expect(toast()).not.toBeNull();
    act(() => { vi.advanceTimersByTime(1); });
    await waitFor(() => { expect(toast()).toBeNull(); });
  });
});
