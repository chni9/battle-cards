// @vitest-environment happy-dom
/** The lobby's Claim a seat: technical spec v7 §7.2 (Q24), §10.6; Appendix A `lobby-walk-in-notice`; A.9 rulings 6 and 9 (L76-16). */
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { CLAIM_SEAT_LABEL } from './lobby-copy';
import { LobbyScreen } from './lobby-screen';
import { expectNoLobbyIntent, guestLobbyView, makeLobbyProps, walkInLobbyView } from './test-lobby';

const claimSeat = (): HTMLElement | null => within(screen.getByRole('main')).queryByRole('button', { name: CLAIM_SEAT_LABEL });
const isDisabled = (element: HTMLElement): boolean =>
  element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true';

describe('lobby Claim a seat (§7.2, Q24, A.9 ruling 9)', () => {
  it("gives a walk-in a primary Claim a seat only while App passes onReopenClaim; a press calls it and sends nothing", async () => {
    const onReopenClaim = vi.fn<() => void>();
    const props = makeLobbyProps({ view: walkInLobbyView(), onReopenClaim });
    const { user, rerender } = renderUi(<LobbyScreen {...props} />, { reducedMotion: true });
    const button = claimSeat();
    if (button === null) throw new Error('no Claim a seat');
    expect(button.getAttribute('data-variant')).toBe('primary');
    await user.click(button);
    expect(onReopenClaim).toHaveBeenCalledTimes(1);
    expectNoLobbyIntent(props);
    rerender(<LobbyScreen {...makeLobbyProps({ view: walkInLobbyView() })} />); // the set emptied: App passes none
    expect(claimSeat()).toBeNull();
  });

  it('shows no Claim a seat to a seated guest, even with onReopenClaim (it lives in the walk-in banner)', () => {
    renderUi(<LobbyScreen {...makeLobbyProps({ view: guestLobbyView(), onReopenClaim: vi.fn() })} />);
    expect(claimSeat()).toBeNull();
  });

  it('keeps Claim a seat live while reconnecting (A.9 ruling 6)', async () => {
    const onReopenClaim = vi.fn<() => void>();
    const { user } = renderUi(<LobbyScreen {...makeLobbyProps({ view: walkInLobbyView(), status: 'reconnecting', onReopenClaim })} />);
    const button = claimSeat();
    if (button === null) throw new Error('no Claim a seat');
    expect(isDisabled(button)).toBe(false);
    await user.click(button);
    expect(onReopenClaim).toHaveBeenCalledTimes(1);
  });
});
