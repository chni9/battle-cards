// @vitest-environment happy-dom
/**
 * First-game hints on the arena: technical spec v7 §6.12 (same selector order and auto-dismiss rules,
 * a compact panel next to `data-hint-anchor`), §6.3 (Q66), §6.7, §14.3; L46-01..03; Appendix A
 * `first-game-hint-host`, `table-first-game-hints`, `global-help-storage`; Lot 75 plan A.9, ruling
 * R11 (L75-06). Also the arena replacements that classification rows 92 and 96 name.
 */
import { formatCardLabel, type PendingEffectView, type RewardChoiceRequiredPayload, type SubChoiceRequiredPayload } from '@card-battle/shared';
import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { INCOMING_THIEF_HINT_BODY, SKIP_ALL_HINTS_LABEL } from '../../help/hint-copy';
import { placeHintCard } from '../../help/place-hint-card';
import { renderUi, type RenderUiOptions, type RenderUiResult } from '../../test/render';
import { CoachBody } from '../../ui/coach/coach-panel';
import { HINTS_STORAGE_KEY, readHintState, resetHelpStorage, writeHintState } from '../../ui/help-storage';
import { HINT_IDS, hintAnchorId, hintPlacePrefer, type HintId } from '../../ui/hint-ids';
import { Z_INDEX } from '../../ui/layers';
import { MINIMIZE_LABEL } from '../../ui/ui-copy';
import { SHOP_ACTION_LABEL } from '../../view-model/chrome-labels';
import type { IncomingThiefCardId } from '../../view-model/incoming-threat-diff';
import { GOT_IT_ACTION_LABEL, HIDE_COACH_ARIA_LABEL, RETURN_HOME_ARIA_LABEL, SKIP_TUTORIAL_ARIA_LABEL } from '../../view-model/table-copy';
import { makeCard, makePending, makeSelf } from '../../view-model/test-fixtures';
import { ArenaScreen, type ArenaScreenProps } from './arena-screen';
import { SUB_CHOICE_COPY } from './sub-choice/sub-choice-model';
import { ARENA_TEST_BOXES, expectNoArenaIntent, makeArenaProps, makeArenaView, makeTutorialArenaView, stubArenaLayout, type ArenaLayoutStub } from './test-view';
import { LEAVE_CONFIRM_CHROME, MENU_LABEL } from './top-bar-model';

type User = RenderUiResult['user'];
const REWARD: RewardChoiceRequiredPayload = { kind: 'elimination-reward', eliminationId: 'el-1', eliminatedPlayerId: 'p1', availableCards: [], deadlineMs: 40_000 };
const REWARD_TITLE = SUB_CHOICE_COPY['elimination-reward'].title;
const MIRROR: SubChoiceRequiredPayload = { kind: 'mirror', eligibleEffectIds: [], deadlineMs: 40_000 };
const onMe = (cardId: 'basic-attack' | 'thief'): PendingEffectView => makePending({ id: `e-${cardId}`, sourcePlayerId: 'p1', targetPlayerId: 'me', cardId });
const ON_TURN: readonly HintId[] = ['your-turn', 'draw', 'hand', 'specials', 'shop', 'resources'];
const HELD = makeArenaView({ overrides: { self: makeSelf({ hand: [makeCard('tax')], specialCards: [makeCard('super-regeneration')] }) } });
const ANCHOR = new DOMRect(120, 220, 80, 44);
const WIDTH = { narrow: 'w-[min(15.5rem,calc(100vw-1rem))]', wide: 'w-[min(22rem,calc(100vw-1rem))]' } as const;
const MODES = [['portrait', ARENA_TEST_BOXES.phone390], ['landscape-compact', ARENA_TEST_BOXES.landscape], ['desktop', ARENA_TEST_BOXES.desktop]] as const;

let layout: ArenaLayoutStub | undefined;
beforeEach(() => { resetHelpStorage(); });
afterEach(() => { layout?.restore(); layout = undefined; });

function setup(overrides: Partial<ArenaScreenProps> = {}, options: RenderUiOptions = {}): RenderUiResult & { props: ArenaScreenProps } {
  const props = makeArenaProps(overrides);
  return { props, ...renderUi(<ArenaScreen {...props} />, options) };
}
function one(selector: string, root: ParentNode = document): HTMLElement {
  const found = root.querySelector<HTMLElement>(selector);
  if (found === null) throw new Error(`no ${selector}`);
  return found;
}
const shown = (): string | null => document.querySelector('[data-zone="first-game-hint"]')?.getAttribute('data-hint-id') ?? null;
const hint = (): HTMLElement => one('[data-zone="first-game-hint"]');
/** The text a CoachBody renders for `text` (glyphs and bold markers included), for comparison. */
function coachText(text: string): string | null {
  const probe = renderUi(<CoachBody text={text} />);
  const value = probe.container.textContent;
  probe.unmount();
  return value;
}
const region = (name: string): HTMLElement => one(`[data-arena-region="${name}"]`);
const openCard = (user: User, group: 'Hand' | 'Specials', cardId: 'tax' | 'super-regeneration'): Promise<void> =>
  user.click(within(screen.getByRole('list', { name: group })).getByRole('button', { name: formatCardLabel(cardId, false) }));
const useTax = async (user: User): Promise<void> => {
  await openCard(user, 'Hand', 'tax');
  await user.click(within(screen.getByRole('dialog', { name: formatCardLabel('tax', false) })).getByRole('button', { name: /^Use/ }));
};
const tapSeat = (user: User, id: string): Promise<void> =>
  user.click(within(one(`[data-zone="opponent-seat"][data-player-id="${id}"]`)).getByRole('button', { name: id }));
const draw = (user: User): Promise<void> => user.click(within(region('dock')).getByRole('button', { name: /^Draw, plus / }));

/** The props and stored dismissals that make `id` the selected hint (selector order, select-hint.ts). */
function caseFor(id: HintId): { readonly props: Partial<ArenaScreenProps>; readonly dismissed: readonly HintId[] } {
  switch (id) {
    case 'incoming': return { props: { view: makeArenaView({ overrides: { pendingEffects: [onMe('basic-attack')] } }) }, dismissed: [] };
    case 'incoming-thief': return { props: { view: makeArenaView({ overrides: { pendingEffects: [onMe('thief')] } }) }, dismissed: [] };
    case 'hidden-kit': return { props: { view: makeArenaView({ overrides: { currentTurnPlayerId: 'p1' } }) }, dismissed: [] };
    case 'reward': return { props: { subChoice: REWARD }, dismissed: [] };
    default: return { props: {}, dismissed: ON_TURN.slice(0, ON_TURN.indexOf(id)) };
  }
}

describe('hint placement in every layout mode (§6.12, §14.3)', () => {
  it.each(MODES.flatMap(([mode, box]) => HINT_IDS.map((id) => ({ mode, box, id }))))('$id sits next to its anchor in $mode', ({ mode, box, id }) => {
    const selector = `[data-hint-anchor="${hintAnchorId(id)}"]`;
    layout = stubArenaLayout(box.viewport, box.arena, { rectFor: (element) => (element.matches(selector) ? ANCHOR : undefined) });
    const { props, dismissed } = caseFor(id);
    writeHintState({ dismissed, skipAll: false });
    setup(props);
    expect([one('[data-arena="next"]').getAttribute('data-layout-mode'), shown()]).toEqual([mode, id]);
    const layer = one('[data-hint-layer]');
    const slot = one('[data-hint-slot]', layer);
    const placed = placeHintCard(ANCHOR, { width: slot.offsetWidth, height: slot.offsetHeight }, box.viewport, { prefer: hintPlacePrefer(id) });
    expect([layer.parentElement, layer.style.zIndex, slot.style.top, slot.style.left])
      .toEqual([document.body, String(Z_INDEX.hint), `${String(placed.top)}px`, `${String(placed.left)}px`]);
    expect(slot.classList.contains(mode === 'landscape-compact' ? WIDTH.wide : WIDTH.narrow)).toBe(true);
  });

  it('keeps one hint card across mode changes and re-places it at the new anchor (Review Focus 1 invariant)', () => {
    let rect = new DOMRect(40, 600, 120, 44);
    const stub = stubArenaLayout(ARENA_TEST_BOXES.phone390.viewport, ARENA_TEST_BOXES.phone390.arena, {
      rectFor: (element) => (element.matches('[data-hint-anchor="draw"]') ? rect : undefined),
    });
    layout = stub;
    writeHintState({ dismissed: ['your-turn'], skipAll: false });
    setup();
    const card = hint();
    for (const [width, height, mode, cls] of [[1440, 900, 'desktop', WIDTH.narrow], [844, 390, 'landscape-compact', WIDTH.wide]] as const) {
      rect = new DOMRect(width - 300, height - 120, 120, 44);
      act(() => { stub.setViewport(width, height); });
      const slot = one('[data-hint-slot]');
      const placed = placeHintCard(rect, { width: slot.offsetWidth, height: slot.offsetHeight }, { width, height }, { prefer: 'below' });
      expect([one('[data-arena="next"]').getAttribute('data-layout-mode'), hint() === card, slot.style.top, slot.style.left, slot.classList.contains(cls)])
        .toEqual([mode, true, `${String(placed.top)}px`, `${String(placed.left)}px`, true]);
    }
  });

  it.each([['base-spy', 'hidden-kit'], ['spy-plus', null]] as const)('a lone %s opponent off turn selects %s (§6.3, Q66)', (tier, expected) => {
    setup({ view: makeArenaView({ seatCount: 2, tiers: { p1: tier }, overrides: { currentTurnPlayerId: 'p1' } }) });
    expect(shown()).toBe(expected);
  });
});

describe('when hints show (§6.12, R11)', () => {
  it.each<{ label: string; props: () => Partial<ArenaScreenProps>; coach: boolean }>([
    { label: 'a tutorial room', props: () => ({ view: makeTutorialArenaView(1) }), coach: true },
    { label: 'the finished board', props: () => ({ readOnly: true }), coach: false },
    { label: 'the finished tutorial board', props: () => ({ view: makeTutorialArenaView(30), readOnly: true }), coach: false },
    { label: 'an eliminated POV', props: () => ({ view: makeArenaView({ pov: 'eliminated' }) }), coach: false },
    { label: 'a walk-in', props: () => ({ view: makeArenaView({ pov: 'walk-in' }) }), coach: false },
  ])('$label shows no first-game hint', ({ props, coach }) => {
    setup(props());
    expect([shown(), document.querySelector('[data-zone="tutorial-coach"]') !== null]).toEqual([null, coach]);
  });

  it('hides under a read-only sheet and a non-reward sub-choice, and comes back after (§6.7)', async () => {
    const { user, props, rerender } = setup({}, { reducedMotion: true });
    expect(shown()).toBe('your-turn');
    await user.click(within(region('top-bar')).getByRole('button', { name: MENU_LABEL }));
    expect(shown()).toBeNull();
    await user.keyboard('{Escape}');
    await waitFor(() => { expect(shown()).toBe('your-turn'); });
    rerender(<ArenaScreen {...props} subChoice={MIRROR} />);
    expect(shown()).toBeNull();
    expectNoArenaIntent(props);
  });

  it('opening the Shop hides the card and dismisses shop; closing it shows the next lesson (R11)', async () => {
    writeHintState({ dismissed: ['your-turn', 'draw', 'hand', 'specials'], skipAll: false });
    const { user, props } = setup({}, { reducedMotion: true });
    expect(shown()).toBe('shop');
    await user.click(within(region('dock')).getByRole('button', { name: SHOP_ACTION_LABEL }));
    expect([shown(), readHintState().dismissed.includes('shop')]).toEqual([null, true]);
    await user.keyboard('{Escape}');
    await waitFor(() => { expect(shown()).toBe('resources'); });
    expectNoArenaIntent(props);
  });

  it('keeps the reward hint over the reward sheet, hides it while minimized and brings it back on restore (R11)', async () => {
    const { user } = setup({ subChoice: REWARD }, { reducedMotion: true });
    const sheet = screen.getByRole('dialog', { name: REWARD_TITLE });
    expect(shown()).toBe('reward');
    expect(Number(one('[data-hint-layer]').style.zIndex)).toBeGreaterThan(Number(sheet.closest<HTMLElement>('[data-zone="sheet-overlay"]')?.style.zIndex));
    await user.click(within(sheet).getByRole('button', { name: MINIMIZE_LABEL }));
    expect(shown()).toBeNull();
    await user.click(screen.getByRole('button', { name: REWARD_TITLE }));
    expect(shown()).toBe('reward');
  });
});

describe('dismissal (L46-01, L46-03)', () => {
  it.each([
    { name: GOT_IT_ACTION_LABEL, stored: { dismissed: ['your-turn'], skipAll: false }, next: 'draw' },
    { name: HIDE_COACH_ARIA_LABEL, stored: { dismissed: ['your-turn'], skipAll: false }, next: 'draw' },
    { name: SKIP_ALL_HINTS_LABEL, stored: { dismissed: [], skipAll: true }, next: null },
  ])('$name stores its patch and shows the next hint', async ({ name, stored, next }) => {
    const { user, props } = setup();
    await user.click(within(hint()).getByRole('button', { name }));
    expect([readHintState(), shown()]).toEqual([stored, next]);
    expectNoArenaIntent(props);
  });

  it.each<{ label: string; props: Partial<ArenaScreenProps>; run: (user: User) => Promise<void>; dismissed: readonly HintId[] }>([
    { label: 'Draw', props: {}, run: draw, dismissed: ['your-turn', 'draw'] },
    { label: 'Draw with an attack incoming', props: { view: makeArenaView({ overrides: { pendingEffects: [onMe('basic-attack')] } }) }, run: draw, dismissed: ['your-turn', 'incoming', 'draw'] },
    { label: 'a sent Use (Tax)', props: { view: HELD }, run: useTax, dismissed: ['hand', 'your-turn'] },
    { label: 'a hand card sheet', props: { view: HELD }, run: (user) => openCard(user, 'Hand', 'tax'), dismissed: ['hand'] },
    { label: 'a special card sheet', props: { view: HELD }, run: (user) => openCard(user, 'Specials', 'super-regeneration'), dismissed: ['specials'] },
    { label: 'a Spy+ seat sheet', props: { view: makeArenaView({ tiers: { p1: 'spy-plus' } }) }, run: (user) => tapSeat(user, 'p1'), dismissed: ['hidden-kit'] },
    { label: 'an unspied seat sheet', props: {}, run: (user) => tapSeat(user, 'p1'), dismissed: [] },
  ])('$label dismisses $dismissed', async ({ props, run, dismissed }) => {
    const { user } = setup(props);
    await run(user);
    expect(readHintState().dismissed).toEqual(dismissed);
  });

  it.each([['incoming', 'basic-attack'], ['incoming-thief', 'thief']] as const)('%s is dismissed when its threat leaves the view, never on mount', (id, cardId) => {
    const { props, rerender } = setup({ view: makeArenaView({ overrides: { pendingEffects: [onMe(cardId)] } }) });
    expect([shown(), readHintState().dismissed]).toEqual([id, []]);
    rerender(<ArenaScreen {...props} view={{ ...props.view, pendingEffects: [] }} />);
    expect(readHintState().dismissed).toEqual([id]);
  });

  it('a sent reward Confirm dismisses reward through the commit (confirm-reward, R11)', async () => {
    const { user, props } = setup({ subChoice: REWARD });
    await user.click(within(screen.getByRole('dialog', { name: REWARD_TITLE })).getByRole('button', { name: 'Confirm rewards' }));
    expect(props.onResolveSubChoice).toHaveBeenCalledTimes(1);
    expect(readHintState().dismissed).toEqual(['reward']);
  });

  it.each([
    { label: 'Skip tutorial', props: () => ({ view: makeTutorialArenaView(1) }), flag: SKIP_TUTORIAL_ARIA_LABEL, chrome: LEAVE_CONFIRM_CHROME.skipTutorial },
    { label: 'Return home from the finished tutorial', props: () => ({ view: makeTutorialArenaView(30), readOnly: true }), flag: RETURN_HOME_ARIA_LABEL, chrome: LEAVE_CONFIRM_CHROME.returnHome },
  ])('$label leaves once and never writes the hint blob (L46-03)', async ({ props, flag, chrome }) => {
    const rendered = setup(props());
    await rendered.user.click(within(region('top-bar')).getByRole('button', { name: flag }));
    await rendered.user.click(within(screen.getByRole('dialog', { name: chrome.title })).getByRole('button', { name: chrome.confirm }));
    expect(rendered.props.onLeave).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(HINTS_STORAGE_KEY)).toBeNull();
  });

  it('a sent tutorial step writes no hint dismissal (L46-03)', async () => {
    const { user, props } = setup({ view: makeTutorialArenaView(1) });
    await useTax(user);
    expect(props.onPlayCard).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(HINTS_STORAGE_KEY)).toBeNull();
  });
});

describe('incoming-thief body (L75-07, R12)', () => {
  const thief = (cardId: IncomingThiefCardId, queuedAt: number): PendingEffectView =>
    makePending({ id: `t-${cardId}`, sourcePlayerId: 'p1', targetPlayerId: 'me', cardId, queuedAt });
  it.each<{ label: string; effects: readonly PendingEffectView[]; body: IncomingThiefCardId }>([
    { label: 'an incoming Spy Thief', effects: [thief('spy-thief', 1)], body: 'spy-thief' },
    { label: 'an incoming Thief', effects: [thief('thief', 1)], body: 'thief' },
    { label: 'a Card Thief queued after an Attack Thief', effects: [thief('card-thief', 5), thief('attack-thief', 2)], body: 'attack-thief' },
  ])('$label shows the $body body', ({ effects, body }) => {
    setup({ view: makeArenaView({ overrides: { pendingEffects: [...effects] } }) });
    expect(shown()).toBe('incoming-thief');
    expect(hint().querySelector('p')?.textContent).toBe(coachText(INCOMING_THIEF_HINT_BODY[body]));
  });
});
