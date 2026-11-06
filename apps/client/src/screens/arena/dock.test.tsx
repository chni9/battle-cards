// @vitest-environment happy-dom
/**
 * Dock: technical spec v7 §6.1 item 5, §6.12, §11, §12.2; Appendix A `economy-bar`,
 * `unspy-dialog`, `private-zone-identity`; A.8 rulings 4 and 7 (L74-13). The ArenaScreenProps
 * spies stand in for the connection (`onClearSpy` → `connection.clearSpy`).
 */
import type { PlayingStateView, PublicPlayerView, SubChoiceRequiredPayload } from '@card-battle/shared';
import { act, screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { visibleLeafTexts, visibleText } from '../../test/glyph-queries';
import { renderUi, type RenderUiOptions } from '../../test/render';
import { DUR_BASE_MS } from '../../ui/motion/motion-tokens';
import { DISABLED_REASON_COPY, type DisabledReason } from '../../view-model/action-reasons';
import { selfStrip } from '../../view-model/self-strip';
import { UNSPY_PICKER_HINT } from '../../view-model/table-copy';
import { makeCard, makeSelf } from '../../view-model/test-fixtures';
import { ArenaScreen, type ArenaScreenProps } from './arena-screen';
import { Dock, type DockCommit } from './dock';
import { expectNoArenaIntent, makeArenaProps, makeArenaView } from './test-view';

const MIRROR: SubChoiceRequiredPayload = { kind: 'mirror', eligibleEffectIds: [], deadlineMs: 1 };
const SPYING = { spyingOnYou: true } as const;
function withSeat(view: PlayingStateView, playerId: string, patch: Partial<PublicPlayerView>): PlayingStateView {
  return { ...view, players: view.players.map((player) => (player.id === playerId ? { ...player, ...patch } : player)) };
}
const viewWith = (self: Parameters<typeof makeSelf>[0], overrides: Partial<PlayingStateView> = {}): PlayingStateView =>
  makeArenaView({ overrides: { self: makeSelf(self), ...overrides } });
function setup(view: PlayingStateView, overrides: Partial<ArenaScreenProps> = {}, options: RenderUiOptions = {}) {
  const spies = {
    onDraw: vi.fn<ArenaScreenProps['onDraw']>(),
    onClearSpy: vi.fn<ArenaScreenProps['onClearSpy']>(),
    onActivateDuplication: vi.fn<() => void>(),
  };
  const props = makeArenaProps({ view, ...spies, ...overrides });
  return { ...spies, props, ...renderUi(<ArenaScreen {...props} />, options) };
}
function dock(): HTMLElement {
  const element = document.querySelector<HTMLElement>('[data-arena-region="dock"]');
  if (element === null) throw new Error('no dock region');
  return element;
}
const draw = (): HTMLElement => within(dock()).getByRole('button', { name: /^Draw, plus / });
const unspy = (): HTMLElement => within(dock()).getByRole('button', { name: 'Unspy, minus 10 pts' });
const unspySheet = (): HTMLElement => screen.getByRole('dialog', { name: 'Unspy' });
const isDisabled = (button: HTMLElement): boolean => button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true';
function reasonOf(button: HTMLElement): string {
  const ids = button.getAttribute('aria-describedby') ?? '';
  return ids.split(' ').map((id) => document.getElementById(id)?.textContent ?? '').join(' ').trim();
}

describe('Draw (§6.1 item 5, L59-01, L64-05)', () => {
  it('shows +N with the point icon and no word, keeps V2 names and sends drawCard once', async () => {
    const { user, onDraw } = setup(makeArenaView());
    const button = draw();
    expect([button.getAttribute('aria-label'), button.getAttribute('title')]).toEqual(['Draw, plus 1 pt', 'Draw, plus 1 pt']);
    expect(visibleText(button).trim()).toBe('+1');
    expect(button.querySelector('[data-icon="point"]')).not.toBeNull();
    expect(button.getAttribute('data-hint-anchor')).toBe('draw');
    await user.click(button);
    expect(onDraw).toHaveBeenCalledTimes(1);
  });

  it("shows a Gambler's rolled payout and turns red only above 10", () => {
    const rolled = withSeat(viewWith({ kitId: 'gambler' }), 'me', { drawGain: 37 });
    const { unmount } = setup(rolled);
    expect([draw().getAttribute('aria-label'), draw().getAttribute('data-variant')]).toEqual(['Draw, plus 37 pts', 'danger']);
    unmount();
    setup(viewWith({ kitId: 'gambler' }));
    expect([draw().getAttribute('aria-label'), draw().getAttribute('data-variant')]).toEqual(['Draw, plus 10 pts', 'primary']);
  });
});

describe('Unspy (L58-07, L58-09)', () => {
  it.each<{ label: string; view: () => PlayingStateView; subChoice: SubChoiceRequiredPayload | null; reason: DisabledReason }>([
    { label: 'no living spy', view: () => viewWith({ points: 20 }), subChoice: null, reason: 'no-living-spy' },
    { label: 'under 10 points', view: () => withSeat(viewWith({ points: 9 }), 'p1', SPYING), subChoice: null, reason: 'not-enough-points' },
    { label: 'off-turn', view: () => withSeat(viewWith({ points: 20 }, { currentTurnPlayerId: 'p1' }), 'p1', SPYING), subChoice: null, reason: 'not-your-turn' },
    { label: 'a sub-choice open', view: () => withSeat(viewWith({ points: 20 }), 'p1', SPYING), subChoice: MIRROR, reason: 'actions-locked' },
  ])('is rendered but disabled with its reason: $label', async ({ view, subChoice, reason }) => {
    const { user, props } = setup(view(), { subChoice });
    const button = unspy();
    expect(isDisabled(button)).toBe(true);
    expect(reasonOf(button)).toBe(DISABLED_REASON_COPY[reason]);
    await user.click(button);
    expect(screen.queryByRole('dialog', { name: 'Unspy' })).toBeNull();
    expectNoArenaIntent(props);
  });

  it("reserves two reason lines under Unspy and one under Draw, so 'Nobody is spying on you' fits and the dock keeps its height (L74-26 gate G5)", () => {
    setup(viewWith({ points: 20 }));
    const slotOf = (button: HTMLElement): Element | null => button.parentElement?.querySelector('[data-reason-slot]') ?? null;
    const classesOf = (button: HTMLElement): (boolean | undefined)[] =>
      ['line-clamp-2', 'min-h-9', 'line-clamp-1', 'min-h-[18px]'].map((name) => slotOf(button)?.classList.contains(name));
    expect(classesOf(unspy())).toEqual([true, true, false, false]);
    expect(classesOf(draw())).toEqual([false, false, true, true]);
  });

  it('preselects a single spy, and Confirm sends clearSpy once', async () => {
    const { user, onClearSpy, props } = setup(withSeat(viewWith({ points: 10 }), 'p1', SPYING));
    expect(visibleText(unspy()).trim()).toBe('−10');
    expect(unspy().querySelector('[data-icon="unspy"]')).not.toBeNull();
    await user.click(unspy());
    const dialog = unspySheet();
    expect(within(dialog).getByText(UNSPY_PICKER_HINT)).not.toBeNull();
    expect(within(dialog).getByRole('button', { name: 'p1' }).getAttribute('aria-pressed')).toBe('true');
    expectNoArenaIntent(props);
    await user.click(within(dialog).getByRole('button', { name: 'Confirm' }));
    expect(onClearSpy.mock.calls).toEqual([['p1']]);
    expect(screen.queryByRole('dialog', { name: 'Unspy' })).toBeNull();
  });

  it("never lists an eliminated spectator's overlay", async () => {
    const view = withSeat(withSeat(makeArenaView({ tiers: { p2: 'eliminated' }, overrides: { self: makeSelf({ points: 10 }) } }), 'p1', SPYING), 'p2', SPYING);
    const { user, props } = setup(view);
    await user.click(unspy());
    const dialog = unspySheet();
    expect(within(dialog).queryByRole('button', { name: /^p2/ })).toBeNull();
    expect(within(dialog).getByRole('button', { name: 'p1' }).getAttribute('aria-pressed')).toBe('true');
    expectNoArenaIntent(props);
  });

  it('with two spies Confirm waits for a pick, and Cancel resets the pick', async () => {
    const view = withSeat(withSeat(viewWith({ points: 10 }), 'p1', SPYING), 'p2', SPYING);
    const { user, onClearSpy, props } = setup(view);
    await user.click(unspy());
    expect(isDisabled(within(unspySheet()).getByRole('button', { name: 'Confirm' }))).toBe(true);
    await user.click(within(unspySheet()).getByRole('button', { name: 'p2' }));
    await user.click(within(unspySheet()).getByRole('button', { name: 'Cancel' }));
    expectNoArenaIntent(props);
    await user.click(unspy());
    expect(within(unspySheet()).getByRole('button', { name: 'p2' }).getAttribute('aria-pressed')).toBe('false');
    await user.click(within(unspySheet()).getByRole('button', { name: 'p2' }));
    await user.click(within(unspySheet()).getByRole('button', { name: 'Confirm' }));
    expect(onClearSpy.mock.calls).toEqual([['p2']]);
  });
});

describe('no UP on the dock (L43-02, L75-10)', () => {
  it('never shows the UP abbreviation on the dock, and keeps the Draw, Shop and Unspy names (L43-02, L75-10)', () => {
    setup(withSeat(viewWith({ points: 20, upgradePoints: 2 }), 'p1', SPYING));
    expect(visibleText(dock())).not.toMatch(/\bUP\b/);
    expect(visibleLeafTexts(dock()).filter((text) => /\bUP\b/.test(text))).toEqual([]);
    expect([draw(), within(dock()).getByRole('button', { name: 'Shop' }), unspy()].every((button) => button.isConnected)).toBe(true);
  });
});

describe('Stats only on the finished board (§6.12, L74-24, L75-10)', () => {
  it('shows no Stats while the game is playing, even when the screen is handed a Stats reopen', () => {
    setup(makeArenaView(), { onShowStats: vi.fn() });
    expect(within(dock()).queryByRole('button', { name: 'Stats' })).toBeNull();
    expect(within(dock()).getByRole('button', { name: 'Shop' })).toBeTruthy();
  });
});

describe('Activate duplication and the other POVs', () => {
  it('shows Activate duplication only for a Duplicator, and it sends once', async () => {
    const { user, onActivateDuplication, unmount } = setup(viewWith({ kitId: 'duplicator' }));
    await user.click(within(dock()).getByRole('button', { name: 'Activate duplication' }));
    expect(onActivateDuplication).toHaveBeenCalledTimes(1);
    unmount();
    setup(viewWith({ kitId: 'kamikaze' }));
    expect(within(dock()).queryByRole('button', { name: 'Activate duplication' })).toBeNull();
  });

  it('keeps the Shop word label and anchor, and opens the Shop sheet off-turn, sending nothing (L74-14)', async () => {
    const { user, props } = setup(makeArenaView({ overrides: { currentTurnPlayerId: 'p1' } }));
    const shop = within(dock()).getByRole('button', { name: 'Shop' });
    expect([shop.getAttribute('data-hint-anchor'), isDisabled(shop)]).toEqual(['shop', false]);
    await user.click(shop);
    expect(screen.getByRole('dialog', { name: 'Shop' })).toBeTruthy();
    expectNoArenaIntent(props);
  });

  it('an eliminated Watching POV keeps a disabled dock without Unspy (ruling 7)', () => {
    setup(makeArenaView({ pov: 'eliminated' }));
    expect(isDisabled(draw())).toBe(true);
    expect(reasonOf(draw())).toBe(DISABLED_REASON_COPY['actions-locked']);
    expect(within(dock()).queryByRole('button', { name: /^Unspy/ })).toBeNull();
    expect(within(dock()).getByRole('button', { name: 'Shop' })).not.toBeNull();
  });

  it('a walk-in gets no dock controls, while the region stays (Q38)', () => {
    setup(makeArenaView({ pov: 'walk-in' }));
    expect(within(dock()).queryAllByRole('button')).toEqual([]);
  });

  it('ignores Draw for DUR_BASE_MS after targeting is cancelled (bar double tap)', async () => {
    vi.useFakeTimers();
    const view = viewWith({ points: 10, hand: [makeCard('spy', { instanceId: 'spy-1' })] });
    const { user, onDraw, props } = setup(view, {}, { advanceTimers: vi.advanceTimersByTime });
    await user.click(within(document.querySelector<HTMLElement>('[data-arena-region="hand"]') ?? document.body).getByRole('button', { name: 'Spy' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Spy' })).getByRole('button', { name: /^Use/ }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(draw());
    expectNoArenaIntent(props);
    act(() => { vi.advanceTimersByTime(DUR_BASE_MS); });
    await user.click(draw());
    expect(onDraw).toHaveBeenCalledTimes(1);
  });
});

describe('one send per control per view (final review I3, ruling R2)', () => {
  const REJECT: ArenaScreenProps['actionReject'] = { code: 'already-acted', message: 'You already acted this turn.' };
  const hand = (): HTMLElement => document.querySelector<HTMLElement>('[data-arena-region="hand"]') ?? document.body;
  /** Spy → Use → Cancel: targeting ends and the tap guard is up for DUR_BASE_MS. */
  async function cancelTargeting(user: UserEvent): Promise<void> {
    await user.click(within(hand()).getByRole('button', { name: 'Spy' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Spy' })).getByRole('button', { name: /^Use/ }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
  }

  it('a double tap on Draw sends one drawCard', async () => {
    const { user, onDraw } = setup(makeArenaView());
    await user.dblClick(draw());
    expect(onDraw).toHaveBeenCalledTimes(1);
  });

  it('a double tap on Activate duplication sends one activateDuplication', async () => {
    const { user, onActivateDuplication } = setup(viewWith({ kitId: 'duplicator' }));
    await user.dblClick(within(dock()).getByRole('button', { name: 'Activate duplication' }));
    expect(onActivateDuplication).toHaveBeenCalledTimes(1);
  });

  it('a reject re-arms Draw: Draw, reject, then Draw sends again', async () => {
    const { user, onDraw, props, rerender } = setup(makeArenaView());
    await user.click(draw());
    await user.click(draw());
    expect(onDraw).toHaveBeenCalledTimes(1);
    // The server rejects the draw with no state update: only `actionReject` changes.
    rerender(<ArenaScreen {...props} actionReject={REJECT} />);
    expect(isDisabled(draw())).toBe(false);
    await user.click(draw());
    expect(onDraw).toHaveBeenCalledTimes(2);
  });

  it('a new view re-arms Draw', async () => {
    const view = makeArenaView();
    const { user, onDraw, props, rerender } = setup(view);
    await user.dblClick(draw());
    expect(onDraw).toHaveBeenCalledTimes(1);
    rerender(<ArenaScreen {...props} view={{ ...view }} />);
    await user.click(draw());
    expect(onDraw).toHaveBeenCalledTimes(2);
  });

  it('a send the tap guard swallows leaves Draw live, and the next double tap sends once', async () => {
    vi.useFakeTimers();
    const view = viewWith({ points: 10, hand: [makeCard('spy', { instanceId: 'spy-1' })] });
    const { user, onDraw, props } = setup(view, {}, { advanceTimers: vi.advanceTimersByTime });
    await cancelTargeting(user);
    await user.click(draw());
    expectNoArenaIntent(props);
    act(() => { vi.advanceTimersByTime(DUR_BASE_MS); });
    await user.dblClick(draw());
    expect(onDraw).toHaveBeenCalledTimes(1);
  });

  it('a disabled Activate duplication sends nothing when clicked (ledger 131)', async () => {
    const { user, props } = setup(viewWith({ kitId: 'duplicator' }, { currentTurnPlayerId: 'p1' }));
    const button = within(dock()).getByRole('button', { name: 'Activate duplication' });
    expect(isDisabled(button)).toBe(true);
    expect(reasonOf(button)).toBe(DISABLED_REASON_COPY['not-your-turn']);
    await user.click(button);
    expectNoArenaIntent(props);
  });

  it('an Unspy Confirm the tap guard swallows keeps the sheet and its pick (Minor 9)', async () => {
    vi.useFakeTimers();
    const view = withSeat(viewWith({ points: 10, hand: [makeCard('spy', { instanceId: 'spy-1' })] }), 'p1', SPYING);
    const { user, onClearSpy, props } = setup(view, {}, { advanceTimers: vi.advanceTimersByTime });
    await cancelTargeting(user);
    await user.click(unspy());
    await user.click(within(unspySheet()).getByRole('button', { name: 'Confirm' }));
    expectNoArenaIntent(props);
    expect(within(unspySheet()).getByRole('button', { name: 'p1' }).getAttribute('aria-pressed')).toBe('true');
    act(() => { vi.advanceTimersByTime(DUR_BASE_MS); });
    await user.click(within(unspySheet()).getByRole('button', { name: 'Confirm' }));
    expect(onClearSpy.mock.calls).toEqual([['p1']]);
    expect(screen.queryByRole('dialog', { name: 'Unspy' })).toBeNull();
  });

  it('marks Draw or Shop for the tutorial, and while locked Shop and Unspy open nothing (L75-04, A.8.6, A.8.7)', async () => {
    const view = withSeat(viewWith({ points: 20 }), 'p1', SPYING);
    const onOpenShop = vi.fn<() => void>();
    const dockFor = (extra: { tutorialHighlight: 'draw' | 'shop'; locked: boolean }) => (
      <Dock model={selfStrip(view, { subChoice: null, readOnly: false }).dock} isMyTurn turnSequence={1} view={view}
        commit={vi.fn<DockCommit>(() => true)} actionReject={null} onOpenShop={onOpenShop} {...extra} />
    );
    const marks = () => Array.from(document.querySelectorAll('[data-tutorial-highlight]')).map((e) => [e.getAttribute('data-tutorial-highlight'), e.getAttribute('data-hint-anchor')]);
    const { user, rerender } = renderUi(dockFor({ tutorialHighlight: 'draw', locked: true }));
    expect(marks()).toEqual([['draw', 'draw']]);
    await user.click(screen.getByRole('button', { name: 'Shop' }));
    await user.click(screen.getByRole('button', { name: 'Unspy, minus 10 pts' }));
    expect([onOpenShop.mock.calls.length, screen.queryByRole('dialog', { name: 'Unspy' })]).toEqual([0, null]);
    rerender(dockFor({ tutorialHighlight: 'shop', locked: false }));
    expect(marks()).toEqual([['shop', 'shop']]);
    await user.click(screen.getByRole('button', { name: 'Shop' }));
    expect(onOpenShop).toHaveBeenCalledTimes(1);
  });
});
