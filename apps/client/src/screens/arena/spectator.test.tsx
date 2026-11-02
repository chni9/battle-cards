// @vitest-environment happy-dom
/**
 * Spectator, eliminated and Reanimating POV: technical spec v7 §6.3, §6.12, §7.2, §10.6, §13 (Q24,
 * Q38); Appendix A `walk-in-spectator-mode`, `table-prompts`, `claim-seat-dismiss-stay`,
 * `unspy-dialog`, `table-subchoice-wait-reanimation-kit`; A.8 rulings 7 and 9; Lot 74 Part 1
 * final review Minor 15 (L74-23).
 */
import type { SubChoiceRequiredPayload } from '@card-battle/shared';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderUi, type RenderUiOptions } from '../../test/render';
import { TABLE_BANNER_MS } from '../../view-model/table-banner';
import { makePending, makeSelf } from '../../view-model/test-fixtures';
import { ArenaScreen, type ArenaScreenProps } from './arena-screen';
import { expectNoArenaIntent, makeArenaProps, makeArenaView } from './test-view';

const MIRROR: SubChoiceRequiredPayload = { kind: 'mirror', eligibleEffectIds: [], deadlineMs: 1 };
const HIDDEN = 'Hands stay hidden until you stay spectating or sit.';
const VISIBLE = 'Watching this table. Hands and kits are visible the same way as an eliminated player.';
const LOCKED = 'You are a spectator. Actions are locked while rewards (if any) resolve.';
const ELIMINATED = makeArenaView({ pov: 'eliminated', overrides: { currentTurnPlayerId: 'p1' } });

function setup(overrides: Partial<ArenaScreenProps> = {}, options: RenderUiOptions = {}) {
  const props = makeArenaProps(overrides);
  const result = renderUi(<ArenaScreen {...props} />, options);
  const update = (next: Partial<ArenaScreenProps>): void => {
    result.rerender(<ArenaScreen {...props} {...next} />);
  };
  return { ...result, props, update };
}
function region(name: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(`[data-arena-region="${name}"]`);
  if (found === null) throw new Error(`no ${name} region`);
  return found;
}
function overlay(): HTMLElement {
  const found = document.querySelector<HTMLElement>('[data-pov-elimination]');
  if (found === null) throw new Error('no POV elimination overlay');
  return found;
}
const tiers = (): (string | null)[] =>
  Array.from(document.querySelectorAll('[data-zone="opponent-seat"]'), (seat) => seat.getAttribute('data-tier'));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Watching strip (spec v7 §6.12, Q38, §7.2)', () => {
  it('gives a walk-in Watching, Leave table and no dock; Claim a seat shows only with onReopenClaim and sends nothing', async () => {
    const onReopenClaim = vi.fn<() => void>();
    const walkIn = makeArenaView({ pov: 'walk-in', tiers: { me: 'spy-plus' } });
    const { user, props, unmount } = setup({ view: walkIn, onReopenClaim });
    const strip = region('self-strip');
    expect(within(strip).getByRole('heading', { name: 'Watching' })).toBeTruthy();
    expect(within(strip).getByText(VISIBLE)).toBeTruthy();
    expect(within(strip).getByRole('button', { name: 'Leave table' })).toBeTruthy();
    expect(strip.querySelector('[data-zone="resources"]')).toBeNull();
    expect(within(region('dock')).queryAllByRole('button')).toEqual([]);
    await user.click(within(strip).getByRole('button', { name: 'Claim a seat' }));
    expect(onReopenClaim).toHaveBeenCalledTimes(1);
    expectNoArenaIntent(props);
    unmount();
    setup({ view: walkIn });
    expect(within(region('self-strip')).queryByRole('button', { name: 'Claim a seat' })).toBeNull();
  });

  it('shows a walk-in behind an open claim picker no kit and the hands-hidden line (L57-16)', () => {
    setup({ view: makeArenaView({ pov: 'walk-in', overrides: { claimableSeats: [{ playerId: 'p1', nickname: 'p1' }] } }), onReopenClaim: vi.fn() });
    expect(within(region('self-strip')).getByText(HIDDEN)).toBeTruthy();
    expect(tiers()).toEqual(['unspied', 'unspied', 'unspied']);
    // `opponent-seat.tsx` puts the anchor on the seat root while the kit is hidden (Q66).
    expect(document.querySelectorAll('[data-zone="opponent-seat"][data-hint-anchor="hidden-kit"]')).toHaveLength(3);
  });

  it.each(['walk-in', 'eliminated'] as const)('opens the flag confirm from the %s strip’s Leave table, and Leave leaves once (A.9.4)', async (pov) => {
    const { user, props } = setup({ view: pov === 'walk-in' ? makeArenaView({ pov: 'walk-in' }) : ELIMINATED });
    await user.click(within(region('self-strip')).getByRole('button', { name: 'Leave table' }));
    const confirm = screen.getByRole('dialog', { name: 'Leave the table?' });
    expect(document.activeElement).toBe(within(confirm).getByRole('button', { name: 'Stay' }));
    expectNoArenaIntent(props);
    const leave = within(confirm).getByRole('button', { name: 'Leave' });
    fireEvent.click(leave);
    fireEvent.click(leave);
    expect(props.onLeave).toHaveBeenCalledTimes(1);
    expect(props.onForfeit).not.toHaveBeenCalled();
  });

  it('keeps an eliminated Watching POV its own strip, thumbs and dock under Watching, with the locked line (rulings 7 and 9)', () => {
    setup({ view: makeArenaView({ pov: 'eliminated', overrides: { currentTurnPlayerId: 'p1', self: makeSelf({ shield: 2 }) } }) });
    const strip = region('self-strip');
    expect(within(strip).getByRole('heading', { name: 'Watching' })).toBeTruthy();
    expect(within(strip).getByText(LOCKED)).toBeTruthy();
    expect(strip.querySelector('[data-zone="resources"][data-hint-anchor="resources"]')).not.toBeNull();
    expect(within(strip).getByRole('list', { name: 'Active cards' })).toBeTruthy();
    expect(within(region('dock')).getByRole('button', { name: /^Draw, plus / })).toBeTruthy();
  });

  it('labels an eliminated POV with pendingReanimation Reanimating, with the seated tiers, Unspy, no Watching and no overlay (§6.3)', () => {
    setup({ view: makeArenaView({ pov: 'reanimating', tiers: { p1: 'base-spy' }, overrides: { currentTurnPlayerId: 'p1' } }) });
    const strip = region('self-strip');
    expect(within(strip).getByText('Reanimating')).toBeTruthy();
    expect(within(strip).queryByRole('heading', { name: 'Watching' })).toBeNull();
    expect(within(strip).queryByRole('button', { name: 'Leave table' })).toBeNull();
    expect(tiers()).toEqual(['base-spy', 'unspied']);
    expect(within(region('dock')).getByRole('button', { name: /^Unspy/ })).toBeTruthy();
    expect(overlay().textContent).toBe('');
  });
});

describe('POV elimination overlay (spec v7 §6.12)', () => {
  it('shows You are dead on the elimination edge for TABLE_BANNER_MS, takes no press, and replaces the banner', () => {
    vi.useFakeTimers();
    const { update } = setup({ view: makeArenaView() });
    expect(document.querySelector('[data-banner="turn"]')).not.toBeNull(); // the arena's banner host (L74-17)
    expect(overlay().textContent).toBe('');
    update({ view: ELIMINATED });
    expect(overlay().textContent).toBe('You are dead');
    expect([overlay().getAttribute('role'), overlay().classList.contains('pointer-events-none')]).toEqual(['status', true]);
    expect(within(overlay()).queryAllByRole('button')).toEqual([]);
    expect(document.querySelector('[data-banner="dead"]')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(TABLE_BANNER_MS);
    });
    expect(overlay().textContent).toBe('');
    expect(document.querySelector('[data-banner="dead"]')).toBeNull();
  });

  it('shows You are dead on a first paint already eliminated, for TABLE_BANNER_MS (designer 2026-11-02)', () => {
    vi.useFakeTimers();
    setup({ view: ELIMINATED });
    expect(overlay().textContent).toBe('You are dead');
    act(() => {
      vi.advanceTimersByTime(TABLE_BANNER_MS);
    });
    expect(overlay().textContent).toBe('');
  });

  it.each<{ label: string; next: Partial<ArenaScreenProps> }>([
    { label: 'a sub-choice is open', next: { view: ELIMINATED, subChoice: MIRROR } },
    { label: 'a Reanimation is pending', next: { view: makeArenaView({ pov: 'reanimating', overrides: { currentTurnPlayerId: 'p1' } }) } },
  ])('never renders while $label', ({ next }) => {
    vi.useFakeTimers();
    const { update } = setup({ view: makeArenaView() });
    update(next);
    expect(overlay().textContent).toBe('');
  });
});

describe('seat sheets after a claim (final review Minor 15)', () => {
  it('closes a seat sheet whose player became the POV, so no arrow lights for the POV', async () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, 0, 375, 480));
    const attack = makePending({ id: 'eff-1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack' });
    const { user, update } = setup({ view: makeArenaView({ pov: 'walk-in', overrides: { pendingEffects: [attack] } }) });
    await user.click(within(region('arena')).getByRole('button', { name: 'me' }));
    expect(document.querySelector('[data-threat-arrow="eff-1"]')?.getAttribute('data-highlighted')).toBe('true');
    update({ view: makeArenaView({ overrides: { pendingEffects: [attack] } }) }); // the walk-in sat in seat 'me'
    expect(document.querySelector('[data-threat-arrow="eff-1"]')).not.toBeNull();
    expect(document.querySelectorAll('[data-highlighted]')).toHaveLength(0);
  });

  it('closes every sheet when the POV changes, so a Spy reveal a walk-in opened never stays on screen after a claim', async () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, 0, 375, 480));
    const { user, props, update } = setup({ view: makeArenaView({ pov: 'walk-in', tiers: { p1: 'spy-plus' } }) });
    await user.click(within(region('arena')).getByRole('button', { name: 'p1' }));
    const hand = document.querySelector<HTMLElement>('[data-seat-sheet-section="hand"]');
    if (hand === null) throw new Error('no revealed hand');
    const [first] = within(hand).getAllByRole('button');
    if (first === undefined) throw new Error('no hand thumb');
    await user.click(first);
    expect(screen.getByRole('dialog', { name: 'Basic attack' })).toBeTruthy();
    update({ view: makeArenaView() }); // the walk-in sat in seat 'me', which sees no Spy relation
    expect(screen.queryAllByRole('dialog')).toEqual([]);
    // Both close through their exit (the press shield), then unmount.
    await waitFor(() => {
      expect(document.querySelector('[data-arena-sheet]')).toBeNull();
    });
    expectNoArenaIntent(props);
  });

  it('keeps the chat sheet open across a claim, with its unsent draft (final review: chat re-renders from the live view)', async () => {
    const { user, props, update } = setup({ view: makeArenaView({ pov: 'walk-in', overrides: { gameCode: 'CLAIMCHAT' } }) });
    await user.click(within(region('top-bar')).getByRole('button', { name: /^Chat/ }));
    await user.type(within(screen.getByRole('dialog', { name: 'Chat' })).getByRole('textbox', { name: 'Message' }), 'hi all');
    update({ view: makeArenaView({ overrides: { gameCode: 'CLAIMCHAT' } }) }); // the walk-in sat in seat 'me'
    const chat = screen.getByRole('dialog', { name: 'Chat' });
    expect(within(chat).getByRole<HTMLInputElement>('textbox', { name: 'Message' }).value).toBe('hi all');
    expectNoArenaIntent(props);
  });
});
