// @vitest-environment happy-dom
/**
 * The tutorial on the arena: technical spec v7 §6.12, §6.6.3, §6.10, §8.3, §14.3; Lot 75 plan
 * Appendix A.8 (L75-04); Review Focus 3 (the coach over a sheet) and Review Focus 1's coach half.
 */
import {
  TUTORIAL_LOOK_COACH, TUTORIAL_TOUR_STEPS, tutorialStepAt,
  type MirrorChoiceRequiredPayload, type PlayingStateView, type TutorialTourHighlight,
} from '@card-battle/shared';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { Z_INDEX } from '../../ui/layers';
import {
  ACTION_LOG_OPEN_LABEL, HIDE_COACH_ARIA_LABEL, HOW_TO_PLAY_ARIA_LABEL,
  OPEN_COACH_ARIA_LABEL, SKIP_TUTORIAL_ACTION_LABEL, SKIP_TUTORIAL_ARIA_LABEL, SKIP_TUTORIAL_CONFIRM_TITLE,
} from '../../view-model/table-copy';
import { makePending } from '../../view-model/test-fixtures';
import { TUTORIAL_IDLE_MS, TUTORIAL_IDLE_PLAY_TITLE } from '../../view-model/tutorial-coach-copy';
import { ArenaScreen, type ArenaScreenProps } from './arena-screen';
import { CANCEL_ACTION_LABEL } from './card-sheet-actions';
import { HAND_GROUP_COPY } from './hand-fan-model';
import { SUB_CHOICE_COPY } from './sub-choice/sub-choice-model';
import {
  ARENA_INTENT_PROPS, ARENA_TEST_BOXES, expectNoArenaIntent, makeArenaProps, makeTutorialArenaView,
  stubArenaLayout, type ArenaLayoutStub,
} from './test-view';
import { MENU_LABEL } from './top-bar-model';

let stub: ArenaLayoutStub | null = null;
afterEach(() => { stub?.restore(); stub = null; });

type User = ReturnType<typeof renderUi>['user'];
function setup(index: number, props: Partial<ArenaScreenProps> = {}, view: Partial<PlayingStateView> = {}) {
  const all = makeArenaProps({ view: makeTutorialArenaView(index, view), ...props });
  return { props: all, ...renderUi(<ArenaScreen {...all} />, { reducedMotion: true }) };
}
function one(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector);
  if (element === null) throw new Error(`no ${selector}`);
  return element;
}
const all = (selector: string): Element[] => Array.from(document.querySelectorAll(selector));
const region = (name: string): HTMLElement => one(`[data-arena-region="${name}"]`);
const mode = (): string | null => one('main[data-arena="next"]').getAttribute('data-layout-mode');
const coach = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-zone="tutorial-coach"]');
const coachTitle = (): string | null => coach()?.querySelector('h2')?.textContent ?? null;
const gotIt = (): HTMLElement => one('[data-zone="tutorial-coach"] [data-tutorial-ack="got-it"]');
const hideCoach = (): HTMLElement => within(one('[data-zone="tutorial-coach"]')).getByRole('button', { name: HIDE_COACH_ARIA_LABEL });
const menuButton = (): HTMLElement => within(region('top-bar')).getByRole('button', { name: MENU_LABEL });
const handCard = (id: string): HTMLElement => one(`[data-arena-region="hand"] [data-instance-id="${id}"]`);
const seatButton = (id: string): HTMLElement => one(`[data-zone="opponent-seat"][data-player-id="${id}"] > button`);
const dockButton = (anchor: 'draw' | 'shop'): HTMLElement => one(`[data-arena-region="dock"] [data-hint-anchor="${anchor}"]`);
const isDisabled = (button: HTMLElement): boolean => button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true';
async function ack(user: User, times: number): Promise<void> {
  for (let step = 0; step < times; step += 1) await user.click(gotIt());
}
// PRIMARY and the lift: the commit-veto.test.tsx pattern.
const PRIMARY = { pointerId: 1, isPrimary: true, button: 0 } as const;
function lift(card: HTMLElement): void {
  fireEvent.pointerDown(card, { ...PRIMARY, clientX: 100, clientY: 700 });
  fireEvent.pointerMove(window, { ...PRIMARY, clientX: 103, clientY: 688 });
}
/** `data-tutorial-highlight` marks exactly `expected`, in document order, each with `id` (A.8.6). */
function expectMarked(id: string, expected: readonly Element[]): void {
  expect(expected.length).toBeGreaterThan(0);
  const marked = all('[data-tutorial-highlight]');
  expect(marked.map((element) => element.getAttribute('data-tutorial-highlight'))).toEqual(expected.map(() => id));
  expect(marked.every((element, at) => element === expected[at])).toBe(true);
}
const TOUR_TARGET: Readonly<Record<TutorialTourHighlight, () => readonly Element[]>> = {
  'your-zone': () => [region('self-strip'), region('hand'), region('dock')],
  hand: () => all('[data-arena-region="hand"] [data-zone="hand"]'),
  specials: () => all('[data-arena-region="hand"] [data-zone="specials"]'),
  resources: () => all('[data-arena-region="self-strip"] [data-zone="resources"]'),
  incoming: () => all('[data-arena-region="arena"] [data-zone="pending"]'),
  shop: () => [dockButton('shop')],
  opponent: () => all('[data-zone="opponent-seat"]'),
  'action-log': () => all('[data-arena-region="ticker"] [data-zone="log-collapsed"]'),
  timer: () => all('[data-arena-region="top-bar"] [data-top-bar="turn"]'),
  kit: () => all('[data-arena-region="self-strip"] [data-zone="kit-portrait"]'),
  flag: () => [within(region('top-bar')).getByRole('button', { name: SKIP_TUTORIAL_ARIA_LABEL })],
};
const MODES = [
  { mode: 'portrait', box: null },
  { mode: 'landscape-compact', box: ARENA_TEST_BOXES.landscape },
  { mode: 'desktop', box: ARENA_TEST_BOXES.desktop },
] as const;
const TOUR_ROWS = MODES.flatMap(({ mode: name, box }) =>
  TUTORIAL_TOUR_STEPS.map((step, n) => ({ name, box, n, id: step.highlight, title: step.coach.title })));
const INCOMING = makePending({ id: 'tut-e1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack' });
const MIRROR: MirrorChoiceRequiredPayload = { kind: 'mirror', eligibleEffectIds: ['tut-e1'], deadlineMs: 40_000 };
const spiedOn = (): Partial<PlayingStateView> => ({
  players: makeTutorialArenaView(0).players.map((player) => (player.id === 'p1' ? { ...player, spyingOnYou: true } : player)),
});

describe('the board tour (§6.12, §14.3, Q60)', () => {
  it.each(TOUR_ROWS)('$name, step $n: marks exactly the $id element, and Got it sends nothing', async ({ name, box, n, id, title }) => {
    if (box !== null) stub = stubArenaLayout(box.viewport, box.arena);
    const { user, props } = setup(0);
    expect(mode()).toBe(name);
    await ack(user, n);
    expect(coachTitle()).toBe(title);
    expectMarked(id, TOUR_TARGET[id]());
    await ack(user, 1);
    expect(document.querySelector(`[data-tutorial-highlight="${id}"]`)).toBeNull();
    expectNoArenaIntent(props);
  });

  it('ends after the eleventh Got it on the Draw lesson, with no Got it left', async () => {
    const { user, props } = setup(0);
    await ack(user, TUTORIAL_TOUR_STEPS.length);
    expect(coachTitle()).toBe(tutorialStepAt(0)?.coach?.title);
    expect(coach()?.querySelector('[data-tutorial-ack]')).toBeNull();
    expectNoArenaIntent(props);
  });

  it('marks an empty group too: the specials caption with no special card (Q60)', async () => {
    const { user } = setup(0, {}, { self: { ...makeTutorialArenaView(0).self, specialCards: [] } });
    await ack(user, 2);
    expectMarked('specials', TOUR_TARGET.specials());
    expect(one('[data-zone="specials"]').textContent).toContain(HAND_GROUP_COPY.specials.empty);
  });
});

describe('the tour and the Look gate lock the table (§6.6.3, open questions 8 and 9)', () => {
  it('during the tour Draw, a hand tap, a drag, Shop and Unspy send or open nothing; a seat tap still opens its sheet', async () => {
    const { user, props } = setup(0, {}, spiedOn());
    const unspy = one('[data-arena-region="dock"] [data-unspy]');
    expect([isDisabled(dockButton('draw')), isDisabled(dockButton('shop')), isDisabled(unspy)]).toEqual([false, false, false]);
    await user.click(dockButton('draw'));
    await user.click(handCard('tax-1'));
    lift(handCard('basic-attack-1'));
    expect(document.querySelector('[data-zone="hand-drag-ghost"]')).toBeNull();
    fireEvent.pointerUp(window, { ...PRIMARY, clientX: 103, clientY: 688 });
    await user.click(dockButton('shop'));
    await user.click(unspy);
    expect([all('[data-arena-sheet^="card:"]').length, all('[data-arena-sheet="shop"]').length, all('[data-unspy-picker]').length]).toEqual([0, 0, 0]);
    expect(coachTitle()).toBe(TUTORIAL_TOUR_STEPS[0]?.coach.title);
    expectNoArenaIntent(props);
    await user.click(seatButton('p1'));
    expect(document.querySelector('[data-arena-sheet="seat:p1"]')).not.toBeNull();
    expectNoArenaIntent(props);
  });

  it('at index 9 blocks every send until the revealed seat sheet opens, then never again in that mount', async () => {
    const { user, props, rerender } = setup(9);
    expect(coachTitle()).toBe(TUTORIAL_LOOK_COACH.title);
    expect(coach()?.textContent).toContain(TUTORIAL_LOOK_COACH.body);
    expectMarked('opponent-portrait', all('[data-zone="opponent-seat"][data-player-id="p1"] [data-zone="opponent-portrait"]'));
    await user.click(dockButton('draw'));
    await user.click(handCard('shield-1'));
    expect(document.querySelector('[data-arena-sheet^="card:"]')).toBeNull();
    expectNoArenaIntent(props);
    await user.click(seatButton('p1'));
    expect(document.querySelector('[data-arena-sheet="seat:p1"]')).not.toBeNull();
    expect(coachTitle()).toBe(tutorialStepAt(9)?.coach?.title);
    expect(document.querySelector('[data-tutorial-highlight="opponent-portrait"]')).toBeNull();
    await user.keyboard('{Escape}');
    rerender(<ArenaScreen {...props} view={makeTutorialArenaView(9)} />);
    expect(coachTitle()).toBe(tutorialStepAt(9)?.coach?.title);
    await user.click(handCard('shield-1'));
    await user.click(one('[data-arena-sheet="card:shield-1"] [data-card-action="sell"]'));
    expect(vi.mocked(props.onSellCard).mock.calls).toEqual([['shield-1']]);
  });
});

describe('the coach (§6.12, Q45)', () => {
  it('hides with ×, reopens from Menu → Show coach, and reopens by itself on new copy', async () => {
    const { user, props, rerender } = setup(1);
    await user.click(menuButton());
    expect(within(screen.getByRole('dialog', { name: MENU_LABEL })).queryByRole('button', { name: OPEN_COACH_ARIA_LABEL })).toBeNull();
    await user.keyboard('{Escape}');
    await user.click(hideCoach());
    expect(coach()).toBeNull();
    await user.click(menuButton());
    const menu = screen.getByRole('dialog', { name: MENU_LABEL });
    const entries = within(menu).getAllByRole('button');
    expect(entries.slice(0, 3).map((entry) => entry.textContent)).toEqual([HOW_TO_PLAY_ARIA_LABEL, OPEN_COACH_ARIA_LABEL, ACTION_LOG_OPEN_LABEL]);
    expect(entries.slice(0, 2).map((entry) => entry.querySelector('svg')?.getAttribute('data-icon'))).toEqual(['help', 'coach']);
    await user.click(within(menu).getByRole('button', { name: OPEN_COACH_ARIA_LABEL }));
    expect(coachTitle()).toBe(tutorialStepAt(1)?.coach?.title);
    await user.click(hideCoach());
    rerender(<ArenaScreen {...props} view={makeTutorialArenaView(3)} />);
    expect(coachTitle()).toBe(tutorialStepAt(3)?.coach?.title);
    expectNoArenaIntent(props);
  });

  it("retitles the coach 'Play' after 20 s on the POV's turn, and reopens it", async () => {
    vi.useFakeTimers();
    const props = makeArenaProps({ view: makeTutorialArenaView(1) });
    const { user } = renderUi(<ArenaScreen {...props} />, { advanceTimers: vi.advanceTimersByTime, reducedMotion: true });
    await user.click(hideCoach());
    act(() => { vi.advanceTimersByTime(TUTORIAL_IDLE_MS - 1); });
    expect(coach()).toBeNull();
    act(() => { vi.advanceTimersByTime(1); });
    expect(coachTitle()).toBe(TUTORIAL_IDLE_PLAY_TITLE);
    expectNoArenaIntent(props);
  });

  it.each([
    { label: 'during the tour', index: 0, title: TUTORIAL_TOUR_STEPS[0]?.coach.title },
    { label: 'on a bot turn, which keeps the last lesson', index: 2, title: tutorialStepAt(1)?.coach?.title },
  ])('never retitles $label', ({ index, title }) => {
    vi.useFakeTimers();
    renderUi(<ArenaScreen {...makeArenaProps({ view: makeTutorialArenaView(index) })} />, { advanceTimers: vi.advanceTimersByTime, reducedMotion: true });
    act(() => { vi.advanceTimersByTime(TUTORIAL_IDLE_MS * 2); });
    expect(coachTitle()).toBe(title);
  });

  it('× from the keyboard hands the focus to Menu, where Show coach lives', async () => {
    const { user } = setup(1);
    hideCoach().focus();
    await user.keyboard('{Enter}');
    expect([coach(), document.activeElement === menuButton()]).toEqual([null, true]);
  });

  it("Got it from the keyboard keeps the focus on the next step's Got it", async () => {
    const { user } = setup(0);
    gotIt().focus();
    await user.keyboard('{Enter}');
    expect([coachTitle(), document.activeElement === gotIt()]).toEqual([TUTORIAL_TOUR_STEPS[1]?.coach.title, true]);
  });
});

describe('the coach over a sheet (Review Focus 3)', () => {
  it.each<{ label: string; subChoice: MirrorChoiceRequiredPayload | null; view: Partial<PlayingStateView>; open: (user: User) => Promise<HTMLElement> }>([
    { label: 'an open read-only card sheet', subChoice: null, view: {},
      open: async (user: User) => { await user.click(handCard('tax-1')); return one('[data-arena-sheet="card:tax-1"]'); } },
    { label: 'an expanded blocking sheet', subChoice: MIRROR, view: { pendingEffects: [INCOMING] },
      open: () => Promise.resolve(screen.getByRole('dialog', { name: SUB_CHOICE_COPY.mirror.title })) },
  ])('stays visible and pressable over $label: × hides it, the sheet stays open and keeps the focus', async ({ subChoice, view, open }) => {
    const { user, props } = setup(1, { subChoice }, view);
    const dialog = await open(user);
    const panel = coach();
    if (panel === null) throw new Error('no coach');
    const host = panel.closest<HTMLElement>('[data-tutorial-coach-host]');
    const overlay = dialog.closest<HTMLElement>('[data-zone="sheet-overlay"]');
    expect(host?.style.zIndex).toBe(String(Z_INDEX.coach));
    expect(Number(host?.style.zIndex)).toBeGreaterThan(Number(overlay?.style.zIndex));
    expect([panel.closest('[inert]'), dialog.contains(panel), dialog.contains(document.activeElement)]).toEqual([null, false, true]);
    await user.click(within(panel).getByRole('button', { name: HIDE_COACH_ARIA_LABEL }));
    expect(coach()).toBeNull();
    expect([dialog.isConnected, dialog.closest('[inert]'), dialog.contains(document.activeElement)]).toEqual([true, null, true]);
    expectNoArenaIntent(props);
  });

  it('Got it advances the tour with the seat sheet open, which keeps the focus', async () => {
    const { user, props } = setup(0);
    await user.click(seatButton('p1'));
    const sheet = one('[data-arena-sheet="seat:p1"]');
    await user.click(gotIt());
    expect([coachTitle(), sheet.isConnected, sheet.contains(document.activeElement)]).toEqual([TUTORIAL_TOUR_STEPS[1]?.coach.title, true, true]);
    expectNoArenaIntent(props);
  });
});

describe('the coach across a mode change (Review Focus 1, coach half)', () => {
  it('keeps its message key and its hidden state from portrait to desktop to landscape-compact', async () => {
    const phone = ARENA_TEST_BOXES.phone390;
    stub = stubArenaLayout(phone.viewport, phone.arena);
    const { user } = setup(0);
    await ack(user, 2);
    const panel = coach();
    act(() => { stub?.setViewport(1440, 900); });
    expect([mode(), coach() === panel, coachTitle()]).toEqual(['desktop', true, TUTORIAL_TOUR_STEPS[2]?.coach.title]);
    await user.click(hideCoach());
    act(() => { stub?.setViewport(390, 420); });
    expect([mode(), coach()]).toEqual(['landscape-compact', null]);
    await user.click(menuButton());
    await user.click(within(screen.getByRole('dialog', { name: MENU_LABEL })).getByRole('button', { name: OPEN_COACH_ARIA_LABEL }));
    expect([coachTitle(), coach()?.getAttribute('data-tutorial-index')]).toEqual([TUTORIAL_TOUR_STEPS[2]?.coach.title, '0']);
    expectMarked('specials', TOUR_TARGET.specials());
  });
});

describe('tutorial table states (§6.10, §6.12, L51-07, Lot 45)', () => {
  it('rings the incoming Basic at index 3 in attack tone, with no tutorial mark on it', () => {
    setup(3);
    const badge = one('[data-zone="pending"] [data-pending-id="tut-3"]');
    expect([badge.getAttribute('data-tone'), badge.closest('[data-tutorial-highlight]')]).toEqual(['attack', null]);
  });

  it('hides the bot difficulty on the tutorial seat and shows no turn clock', () => {
    setup(1);
    expect(one('[data-zone="opponent-seat"][data-player-id="p1"]').querySelector('[data-seat-bot]')).toBeNull();
    expect(one('[data-arena-region="top-bar"] [data-turn-clock]').getAttribute('data-turn-clock')).toBe('none');
  });

  it("opens 'Skip the tutorial?' from the flag during the tour, and Skip tutorial only leaves", async () => {
    const { user, props } = setup(0);
    await user.click(within(region('top-bar')).getByRole('button', { name: SKIP_TUTORIAL_ARIA_LABEL }));
    await user.click(within(screen.getByRole('dialog', { name: SKIP_TUTORIAL_CONFIRM_TITLE })).getByRole('button', { name: SKIP_TUTORIAL_ACTION_LABEL }));
    for (const name of ARENA_INTENT_PROPS) {
      const handler = props[name];
      if (handler !== undefined) expect(vi.mocked(handler).mock.calls).toEqual(name === 'onLeave' ? [[]] : []);
    }
  });

  it('shows no coach, no mark and no lock on the finished tutorial board', async () => {
    const { user, props } = setup(0, { readOnly: true });
    expect([coach(), all('[data-tutorial-highlight]').length]).toEqual([null, 0]);
    await user.click(handCard('tax-1'));
    expect(document.querySelector('[data-arena-sheet="card:tax-1"]')).not.toBeNull();
    expectNoArenaIntent(props);
  });
});

describe('the coach slot flips below its mark (designer 2026-11-06, S4; S-B1)', () => {
  const ARENA_RECT = new DOMRect(0, 100, 375, 282);
  const SEAT_RECT = new DOMRect(150, 110, 76, 92);
  const HAND_RECT = new DOMRect(0, 600, 375, 120);
  const COACH_RECT = new DOMRect(0, 0, 352, 130);
  /** The ticker row, well above the arena. */
  const LOG_RECT = new DOMRect(0, 20, 375, 44);
  const rectFor = (element: Element): DOMRect | undefined => {
    if (element.getAttribute('data-arena-region') === 'arena') return ARENA_RECT;
    if (element.hasAttribute('data-tutorial-coach-slot')) return COACH_RECT;
    if (element.getAttribute('data-zone') === 'opponent-seat' || element.hasAttribute('data-target-seat')) return SEAT_RECT;
    if (element.getAttribute('data-zone') === 'hand' || element.hasAttribute('data-instance-id')) return HAND_RECT;
    if (element.getAttribute('data-zone') === 'log-collapsed') return LOG_RECT;
    return undefined;
  };
  const slot = (): HTMLElement => one('[data-tutorial-coach-slot]');
  const slotTop = (): number => Number.parseFloat(slot().style.top);
  /** The arena top inset 8 px, or the arena bottom edge less the coach and 8 px. */
  const TOP = ARENA_RECT.top + 8;
  const BOTTOM = ARENA_RECT.top + ARENA_RECT.height - 8 - COACH_RECT.height;
  /** The tour's slots are the visible viewport's edges (the arena box above is 100-382 of a 375×812 viewport). */
  const VIEWPORT_TOP = 8;
  const VIEWPORT_BOTTOM = ARENA_TEST_BOXES.phone375.viewport.height - 8 - COACH_RECT.height;

  it('during the tour sits on the viewport top edge until a mark overlaps it, then on the viewport bottom edge (S-B1)', async () => {
    const phone = ARENA_TEST_BOXES.phone375;
    stub = stubArenaLayout(phone.viewport, phone.arena, { rectFor });
    const { user } = setup(0);
    // Step 0 marks 'your-zone', which the stub gives the arena box: use the first mark that does not overlap the top edge.
    await ack(user, 1);
    expect(one('[data-tutorial-highlight]').getAttribute('data-tutorial-highlight')).toBe('hand');
    // The tour leaves the arena: the top slot is the viewport's, above the arena region (K8's 108 px).
    expect([slotTop(), slot().style.left]).toEqual([VIEWPORT_TOP, '8px']);
    expect(slotTop()).toBeLessThan(TOP);
    await ack(user, 5);
    expectMarked('opponent', all('[data-zone="opponent-seat"]'));
    expect(slotTop()).toBe(VIEWPORT_BOTTOM);
    expect(slotTop() + COACH_RECT.height).toBeGreaterThan(ARENA_RECT.top + ARENA_RECT.height);
    await ack(user, 1);
    expect(one('[data-tutorial-highlight]').getAttribute('data-tutorial-highlight')).toBe('action-log');
    // The ticker row sits under the viewport's top edge: the coach stays at the bottom edge.
    expect(slotTop()).toBe(VIEWPORT_BOTTOM);
  });

  it('on a script step keeps the coach inside the arena, so the hand and the dock stay playable (S-B1)', () => {
    const phone = ARENA_TEST_BOXES.phone375;
    stub = stubArenaLayout(phone.viewport, phone.arena, { rectFor });
    setup(3);
    expect(all('[data-tutorial-ack]')).toEqual([]);
    expect(slotTop()).toBeGreaterThanOrEqual(TOP);
    expect(slotTop() + COACH_RECT.height).toBeLessThanOrEqual(ARENA_RECT.top + ARENA_RECT.height - 8);
  });

  it('dodges the valid target seats while the player is targeting, though no tutorial mark is on them (final review I1)', async () => {
    const phone = ARENA_TEST_BOXES.phone375;
    stub = stubArenaLayout(phone.viewport, phone.arena, { rectFor });
    const { user } = setup(3);
    expect(slotTop()).toBe(TOP);
    await user.click(one('[data-arena-region="hand"] [data-instance-id="basic-attack-1"]'));
    await user.click(one('[data-arena-sheet="card:basic-attack-1"] [data-card-action="use"]'));
    expect(all('[data-target-seat="valid"]').length).toBeGreaterThan(0);
    expect(all('[data-zone="opponent-seat"] [data-tutorial-highlight], [data-zone="opponent-seat"][data-tutorial-highlight]')).toEqual([]);
    await waitFor(() => { expect(slotTop()).toBe(BOTTOM); });
    await user.click(within(one('[data-zone="targeting-bar"]')).getByRole('button', { name: CANCEL_ACTION_LABEL }));
    await waitFor(() => { expect(slotTop()).toBe(TOP); });
  });

  it('stays non-modal and above the sheets after a flip: the slot keeps the host layer and takes presses', async () => {
    const phone = ARENA_TEST_BOXES.phone375;
    stub = stubArenaLayout(phone.viewport, phone.arena, { rectFor });
    const { user } = setup(0);
    await ack(user, 6);
    expect(slotTop()).toBe(VIEWPORT_BOTTOM);
    const host = slot().closest<HTMLElement>('[data-tutorial-coach-host]');
    expect([host?.style.zIndex, host?.style.pointerEvents, slot().style.pointerEvents]).toEqual([String(Z_INDEX.coach), 'none', 'auto']);
    expect(coach()?.getAttribute('role')).toBeNull();
  });
});
