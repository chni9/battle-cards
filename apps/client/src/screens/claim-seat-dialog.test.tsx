// @vitest-environment happy-dom
/**
 * The claim sheet: technical spec v7 §7.7 (any dismissal is Stay), §6.7, §10.6; Appendix A
 * `claim-seat-dialog`, `global-claim-seat-overlay`, `claim-seat-dismiss-stay`; L57-13, L57-15;
 * A.9 ruling 5; Review Focus 5 (L76-16). Replaces the source-text `claim-seat-dialog.test.ts`.
 */
import type { ClaimableSeatView } from '@card-battle/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../test/render';
import { v7SeatColor } from '../ui/palette';
import { ClaimSeatDialog, type ClaimSeatDialogProps } from './claim-seat-dialog';

const TITLE = 'Sit as a disconnected player?';
/** `view.players` order: a seat's hue is its index here. */
const PLAYER_IDS = ['host', 'p-ana', 'p-ana-2', 'p-ana-3'];
const ANA: ClaimableSeatView = { playerId: 'p-ana', nickname: 'Ana' };
const ANA_TWIN: ClaimableSeatView = { playerId: 'p-ana-2', nickname: 'Ana' };
const ANA_LOWER: ClaimableSeatView = { playerId: 'p-ana-3', nickname: 'ana' };

function props(overrides: Partial<ClaimSeatDialogProps> = {}): ClaimSeatDialogProps {
  return { open: true, seats: [ANA, ANA_TWIN, ANA_LOWER], playerIds: PLAYER_IDS, stayLabel: 'Stay spectating', onClaim: vi.fn(), onStay: vi.fn(), ...overrides };
}
function renderOnce(overrides: Partial<ClaimSeatDialogProps> = {}) {
  const p = props(overrides);
  return { p, ...renderUi(<ClaimSeatDialog {...p} />, { reducedMotion: true }) };
}
const sheet = (): HTMLElement => screen.getByRole('dialog', { name: TITLE });
function row(playerId: string): HTMLElement {
  const found = sheet().querySelector<HTMLElement>(`[data-claim-seat="${playerId}"]`);
  if (found === null) throw new Error(`no seat row ${playerId}`);
  return found;
}
const pressed = (playerId: string): string | null => row(playerId).getAttribute('aria-pressed');
function dotColor(playerId: string): string {
  const dot = row(playerId).querySelector<HTMLElement>('[data-claim-seat-dot]');
  if (dot === null) throw new Error(`no dot on ${playerId}`);
  return dot.style.backgroundColor;
}
/** A hex as happy-dom reads back a background colour (the table-banner-host test pattern). */
function cssBackground(hex: string): string {
  const probe = document.createElement('span');
  probe.style.backgroundColor = hex;
  return probe.style.backgroundColor;
}
const sitHere = (): HTMLElement => within(sheet()).getByRole('button', { name: 'Sit here' });
const isDisabled = (element: HTMLElement): boolean =>
  element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true';
/** A 390×844 phone, so the Dialog is a bottom sheet with a swipe handle (never the default window). */
class FakeVisualViewport extends EventTarget { offsetTop = 0; offsetLeft = 0; width = 390; height = 844; }

afterEach(() => { vi.unstubAllGlobals(); });

describe('ClaimSeatDialog (§7.7, L57-13, L57-15)', () => {
  it('lists every claimable seat apart, same nicknames included, in its seat hue under the V7 copy, with nothing pre-selected (L57-13)', async () => {
    const { p, user } = renderOnce();
    expect(within(sheet()).getByText('Nicknames are not unique. Pick the seat by color, or keep watching.')).toBeDefined();
    const ids = ['p-ana', 'p-ana-2', 'p-ana-3'];
    expect(ids.map((id) => row(id).textContent)).toEqual(['Ana', 'Ana', 'ana']);
    expect(ids.map(dotColor)).toEqual([1, 2, 3].map((index) => cssBackground(v7SeatColor(index))));
    expect(ids.map(pressed)).toEqual(['false', 'false', 'false']);
    expect(isDisabled(sitHere())).toBe(true);
    await user.click(sitHere());
    expect(p.onClaim).not.toHaveBeenCalled();
    await user.click(row('p-ana-2'));
    expect(ids.map(pressed)).toEqual(['false', 'true', 'false']);
    await user.click(sitHere());
    expect(vi.mocked(p.onClaim).mock.calls).toEqual([['p-ana-2']]);
    expect(p.onStay).not.toHaveBeenCalled();
  });

  it('pre-selects the only listed seat, so Sit here claims it at once (L57-15)', async () => {
    const { p, user } = renderOnce({ seats: [ANA_TWIN] });
    expect(pressed('p-ana-2')).toBe('true');
    expect(isDisabled(sitHere())).toBe(false);
    await user.click(sitHere());
    expect(vi.mocked(p.onClaim).mock.calls).toEqual([['p-ana-2']]);
  });

  it("tags only the lobby host's seat Host, and none when App passes no host (table, End)", () => {
    const { unmount } = renderOnce({ hostPlayerId: 'p-ana' });
    expect(within(row('p-ana')).queryByText('Host')).not.toBeNull();
    expect(within(row('p-ana-2')).queryByText('Host')).toBeNull();
    unmount();
    renderOnce();
    expect(within(sheet()).queryByText('Host')).toBeNull();
  });

  it('labels Stay with the stay label App gives it', () => {
    renderOnce({ stayLabel: 'Keep this seat' });
    expect(within(sheet()).getByRole('button', { name: 'Keep this seat' })).toBeDefined();
    expect(within(sheet()).queryByRole('button', { name: 'Stay spectating' })).toBeNull();
  });

  it('makes every dismissal Stay: the Stay button, Esc, a backdrop press and a swipe-down each call onStay once (§7.7, L57-16)', async () => {
    vi.stubGlobal('visualViewport', new FakeVisualViewport());
    const viaButton = renderOnce();
    await viaButton.user.click(within(sheet()).getByRole('button', { name: 'Stay spectating' }));
    expect([vi.mocked(viaButton.p.onStay).mock.calls.length, vi.mocked(viaButton.p.onClaim).mock.calls.length]).toEqual([1, 0]);
    viaButton.unmount();
    const viaEsc = renderOnce();
    await viaEsc.user.keyboard('{Escape}');
    expect([vi.mocked(viaEsc.p.onStay).mock.calls.length, vi.mocked(viaEsc.p.onClaim).mock.calls.length]).toEqual([1, 0]);
    viaEsc.unmount();
    const viaBackdrop = renderOnce();
    const overlay = sheet().closest<HTMLElement>('[data-zone="sheet-overlay"]');
    if (overlay === null) throw new Error('no sheet overlay');
    await viaBackdrop.user.click(overlay);
    expect([vi.mocked(viaBackdrop.p.onStay).mock.calls.length, vi.mocked(viaBackdrop.p.onClaim).mock.calls.length]).toEqual([1, 0]);
    viaBackdrop.unmount();
    const viaSwipe = renderOnce();
    const handle = sheet().querySelector<HTMLElement>('[data-zone="sheet-handle"]');
    if (handle === null) throw new Error('no swipe handle');
    fireEvent.pointerDown(handle, { pointerId: 1, clientY: 100 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 220 });
    expect([vi.mocked(viaSwipe.p.onStay).mock.calls.length, vi.mocked(viaSwipe.p.onClaim).mock.calls.length]).toEqual([1, 0]);
  });

  it('drops a pick that leaves the set, disables Sit here, and sends one claim per set on a double tap (Review Focus 5)', async () => {
    const { p, user, rerender } = renderOnce();
    await user.click(row('p-ana-3'));
    rerender(<ClaimSeatDialog {...p} seats={[ANA, ANA_TWIN]} />); // another player claimed p-ana-3 first
    expect([pressed('p-ana'), pressed('p-ana-2')]).toEqual(['false', 'false']);
    expect(isDisabled(sitHere())).toBe(true);
    await user.click(sitHere());
    expect(p.onClaim).not.toHaveBeenCalled();
    await user.click(row('p-ana-2'));
    await user.dblClick(sitHere());
    expect(vi.mocked(p.onClaim).mock.calls).toEqual([['p-ana-2']]);
    rerender(<ClaimSeatDialog {...p} seats={[ANA_TWIN]} />); // a new set is a new question: Sit here re-arms
    await user.click(sitHere());
    expect(vi.mocked(p.onClaim).mock.calls).toEqual([['p-ana-2'], ['p-ana-2']]);
  });

  it('forgets a pick that left the set, so it is not selected again if the seat returns (#137)', async () => {
    const { p, user, rerender } = renderOnce();
    await user.click(row('p-ana-3'));
    rerender(<ClaimSeatDialog {...p} seats={[ANA, ANA_TWIN]} />);
    rerender(<ClaimSeatDialog {...p} seats={[ANA, ANA_TWIN, ANA_LOWER]} />);
    expect(pressed('p-ana-3')).toBe('false');
    expect(isDisabled(sitHere())).toBe(true);
  });

  it('locks Sit here while reconnecting, keeps it focusable, and leaves Stay live (P1 m1)', async () => {
    const { p, user } = renderOnce({ seats: [ANA_TWIN], locked: true });
    expect(isDisabled(sitHere())).toBe(true);
    sitHere().focus();
    expect(document.activeElement).toBe(sitHere());
    await user.click(sitHere());
    expect(p.onClaim).not.toHaveBeenCalled();
    await user.click(within(sheet()).getByRole('button', { name: 'Stay spectating' }));
    expect(p.onStay).toHaveBeenCalledTimes(1);
  });
});
