// @vitest-environment happy-dom
/**
 * Every arena commit path is gated in the tutorial: technical spec v7 §6.12, §6.6.4, §6.6.3, §6.8;
 * Lot 75 plan Appendix A.8.4–A.8.6 (L75-05); Review Focus 2 (a vetoed send leaves its control live).
 */
import {
  TUTORIAL_TOUR_STEPS, tutorialStepAt, type MirrorChoiceRequiredPayload, type PlayingStateView,
} from '@card-battle/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { readVisualViewportBox } from '../../ui/visual-viewport';
import { CARD_BUY_LABEL, UNSPY_ACTION_LABEL } from '../../view-model/chrome-labels';
import { SHOP_TAB_LABELS } from '../../view-model/shop';
import { DEACTIVATE_CONFIRM_TITLE, GOT_IT_ACTION_LABEL } from '../../view-model/table-copy';
import { makeCard, makePending, makePersistent } from '../../view-model/test-fixtures';
import { ILLEGAL_ACTION_COPY } from '../illegal-action-copy';
import { ArenaScreen, type ArenaScreenProps } from './arena-screen';
import { CANCEL_ACTION_LABEL, DEACTIVATE_ACTION_LABEL } from './card-sheet-actions';
import { UNSPY_CONFIRM_LABEL } from './dock-model';
import { sellZoneRect } from './hand-drag';
import { SUB_CHOICE_COPY } from './sub-choice/sub-choice-model';
import {
  ARENA_INTENT_PROPS, expectNoArenaIntent, makeArenaProps, makeTutorialArenaView, TUTORIAL_HUMAN_INDICES,
} from './test-view';

type User = ReturnType<typeof renderUi>['user'];
type Sent = readonly [(typeof ARENA_INTENT_PROPS)[number], readonly unknown[]];
const FOLLOW = ILLEGAL_ACTION_COPY['tutorial-follow-coach'];
/** Reduced motion by default; the drop test passes `reducedMotion: false` (see it): under reduced motion `springBack` (`use-hand-drag.ts`) clears the ghost at once. */
function setup(index: number, options: { props?: Partial<ArenaScreenProps>; view?: (view: PlayingStateView) => PlayingStateView; reducedMotion?: boolean } = {}) {
  const view = makeTutorialArenaView(index);
  const props = makeArenaProps({ view: options.view?.(view) ?? view, ...options.props });
  return { props, ...renderUi(<ArenaScreen {...props} />, { reducedMotion: options.reducedMotion ?? true }) };
}
function one(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector);
  if (element === null) throw new Error(`no ${selector}`);
  return element;
}
const region = (name: string): HTMLElement => one(`[data-arena-region="${name}"]`);
const coach = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-zone="tutorial-coach"]');
const coachTitle = (): string | null => coach()?.querySelector('h2')?.textContent ?? null;
const handCard = (id: string): HTMLElement => one(`[data-arena-region="hand"] [data-instance-id="${id}"]`);
const cardSheet = (id: string): HTMLElement => one(`[data-arena-sheet="card:${id}"]`);
const action = (sheet: HTMLElement, kind: string): HTMLElement => {
  const button = sheet.querySelector<HTMLElement>(`[data-card-action="${kind}"]`);
  if (button === null) throw new Error(`no ${kind}`);
  return button;
};
const dockButton = (anchor: 'draw' | 'shop'): HTMLElement => one(`[data-arena-region="dock"] [data-hint-anchor="${anchor}"]`);
const target = (id: string): HTMLElement => screen.getByRole('button', { name: `${id}, target` });
const buyCard = (): HTMLElement => one('[data-arena-sheet="shop"] [data-shop-action="buy-card"]');
const isDisabled = (button: HTMLElement): boolean => button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true';
const PRIMARY = { pointerId: 1, isPrimary: true, button: 0 } as const;
function lift(card: HTMLElement): void {
  fireEvent.pointerDown(card, { ...PRIMARY, clientX: 100, clientY: 700 });
  fireEvent.pointerMove(window, { ...PRIMARY, clientX: 103, clientY: 688 });
}
function dropOnSell(): void {
  const sell = sellZoneRect({ left: 0, top: 0, width: 0, height: 0 }, 100, readVisualViewportBox().width);
  fireEvent.pointerUp(window, { ...PRIMARY, clientX: sell.left + sell.width / 2, clientY: sell.top + sell.height / 2 });
}
async function finishTour(user: User): Promise<void> {
  for (let left = TUTORIAL_TOUR_STEPS.length; left > 0; left -= 1) await user.click(one('[data-tutorial-ack="got-it"]'));
}
async function clearLook(user: User): Promise<void> {
  await user.click(one('[data-zone="opponent-seat"][data-player-id="p1"] > button'));
  await user.keyboard('{Escape}');
}
/** Exactly these elements carry `data-tutorial-highlight`, in document order, with these ids. */
function expectMarked(pairs: readonly (readonly [string, Element])[], scope: ParentNode = document): void {
  const marked = Array.from(scope.querySelectorAll('[data-tutorial-highlight]'));
  expect(marked.map((element) => element.getAttribute('data-tutorial-highlight'))).toEqual(pairs.map(([id]) => id));
  expect(marked.every((element, at) => element === pairs[at]?.[1])).toBe(true);
}
/** Exactly one intent: `name` got `args` once, and no other intent prop was called (by name, never by spy identity). */
function expectOnly(props: ArenaScreenProps, [name, args]: Sent): void {
  for (const prop of ARENA_INTENT_PROPS) {
    const handler = props[prop];
    if (handler !== undefined) expect(vi.mocked(handler).mock.calls).toEqual(prop === name ? [args] : []);
  }
}
function expectFollowCoach(): void {
  expect(coachTitle()).toBe(FOLLOW.title);
  expect(coach()?.textContent).toContain(FOLLOW.body);
}

type ScriptRow =
  | { readonly index: number; readonly card: string; readonly id: string; readonly action: 'use' | 'upgrade' | 'sell'; readonly target?: true; readonly sent: Sent }
  | { readonly index: number; readonly dock: 'draw' | 'shop'; readonly shop?: 'upgrade-point' | 'absorber'; readonly sent: Sent };
const basicAt = (index: number): ScriptRow => ({ index, card: 'basic-attack-1', id: 'basic-attack', action: 'use', target: true, sent: ['onPlayCard', ['basic-attack-1', { targetPlayerId: 'p1' }]] });
const spyAt = (index: number): ScriptRow => ({ index, card: 'spy-1', id: 'spy', action: 'use', target: true, sent: ['onPlayCard', ['spy-1', { targetPlayerId: 'p1' }]] });
const SCRIPT: readonly ScriptRow[] = [
  { index: 0, dock: 'draw', sent: ['onDraw', []] },
  { index: 1, card: 'tax-1', id: 'tax', action: 'use', sent: ['onPlayCard', ['tax-1']] },
  basicAt(3),
  { index: 5, card: 'spy-1', id: 'spy', action: 'upgrade', sent: ['onUpgradeCard', ['spy-1']] },
  spyAt(7),
  { index: 9, card: 'shield-1', id: 'shield', action: 'sell', sent: ['onSellCard', ['shield-1']] },
  spyAt(11),
  { index: 13, dock: 'shop', shop: 'upgrade-point', sent: ['onBuyUpgradePoint', []] },
  { index: 15, dock: 'shop', shop: 'absorber', sent: ['onBuyCard', ['absorber']] },
  { index: 17, card: 'shield-2', id: 'shield', action: 'use', sent: ['onPlayCard', ['shield-2']] },
  { index: 19, card: 'super-regeneration-1', id: 'super-regeneration', action: 'use', sent: ['onPlayCard', ['super-regeneration-1']] },
  { index: 21, card: 'tax-1', id: 'tax', action: 'use', sent: ['onPlayCard', ['tax-1']] },
  { index: 23, card: 'basic-attack-1', id: 'basic-attack', action: 'upgrade', sent: ['onUpgradeCard', ['basic-attack-1']] },
  basicAt(25),
  { index: 27, card: 'absorber-1', id: 'absorber', action: 'use', target: true, sent: ['onPlayCard', ['absorber-1', { targetPlayerId: 'p1' }]] },
  basicAt(29),
];

describe('the scripted path at every human index (§6.12, A.8.6)', () => {
  it('covers every human index once', () => {
    expect(SCRIPT.map((row) => row.index)).toEqual(TUTORIAL_HUMAN_INDICES);
  });

  it.each(SCRIPT)('index $index: the highlighted control is marked, and the scripted intent goes out once', async (row) => {
    const { user, props } = setup(row.index);
    if (row.index === 0) await finishTour(user);
    if (row.index === 9) await clearLook(user);
    if ('card' in row) {
      expectMarked([[row.id, handCard(row.card)]]);
      await user.click(handCard(row.card));
      const sheet = cardSheet(row.card);
      expectMarked([[row.action, action(sheet, row.action)]], sheet);
      await user.click(action(sheet, row.action));
      if (row.target === true) await user.click(target('p1'));
    } else {
      expectMarked([[row.dock, dockButton(row.dock)]]);
      await user.click(dockButton(row.dock));
      if (row.shop === 'upgrade-point') {
        const buy = one('[data-arena-sheet="shop"] [data-shop-action="buy-upgrade-point"]');
        expectMarked([['shop-upgrade-point', buy]]);
        await user.click(buy);
      } else if (row.shop === 'absorber') {
        const tile = one('[data-arena-sheet="shop"] [data-shop-tile="absorber"]');
        expectMarked([['shop-absorber', tile]]);
        await user.click(tile);
        expectMarked([['shop-absorber-buy', buyCard()]]);
        await user.click(buyCard());
      }
    }
    expectOnly(props, row.sent);
  });
});

const upgradeBasic = (view: PlayingStateView): PlayingStateView => ({
  ...view, self: { ...view.self, hand: view.self.hand.map((card) => (card.cardId === 'basic-attack' ? { ...card, isUpgraded: true } : card)) },
});
const spiedOn = (view: PlayingStateView): PlayingStateView => ({
  ...view, players: view.players.map((player) => (player.id === 'p1' ? { ...player, spyingOnYou: true } : player)),
});
const withPool = (view: PlayingStateView): PlayingStateView => ({ ...view, pool: [makeCard('mirror', { instanceId: 'pool-mirror' })] });
const WRONG: readonly { label: string; index: number; view?: (view: PlayingStateView) => PlayingStateView; run: (user: User) => Promise<void> }[] = [
  { label: 'another card: Shield at the Tax step', index: 21, run: async (user) => { await user.click(handCard('shield-2')); await user.click(action(cardSheet('shield-2'), 'use')); } },
  { label: 'Basic+ at the Counter step (3)', index: 3, view: upgradeBasic, run: async (user) => { await user.click(handCard('basic-attack-1')); await user.click(action(cardSheet('basic-attack-1'), 'use')); await user.click(target('p1')); } },
  { label: 'buying Basic at the Absorber step', index: 15, run: async (user) => { await user.click(dockButton('shop')); await user.click(buyCard()); } },
  { label: 'a drop on Sell at the Counter step', index: 3, run: () => { lift(handCard('basic-attack-1')); dropOnSell(); return Promise.resolve(); } },
  { label: 'Draw at the Tax step', index: 1, run: async (user) => { await user.click(dockButton('draw')); } },
  { label: 'Unspy at the Tax step', index: 1, view: spiedOn, run: async (user) => { await user.click(one('[data-arena-region="dock"] [data-unspy]')); await user.click(within(screen.getByRole('dialog', { name: UNSPY_ACTION_LABEL })).getByRole('button', { name: UNSPY_CONFIRM_LABEL })); } },
  { label: 'Buy random from the pool at the Absorber step', index: 15, view: withPool, run: async (user) => { await user.click(dockButton('shop')); await user.click(screen.getByRole('tab', { name: SHOP_TAB_LABELS.pool })); await user.click(one('[data-shop-action="buy-pool"]')); } },
];

describe('a wrong path sends nothing (§6.6.4, R8)', () => {
  it.each(WRONG)('$label sends nothing and shows the follow-coach copy', async ({ index, view, run }) => {
    const { user, props } = setup(index, view === undefined ? {} : { view });
    await run(user);
    expectNoArenaIntent(props);
    expectFollowCoach();
  });
});

describe('a vetoed send leaves its control live (Review Focus 2)', () => {
  it('card sheet: a vetoed Use keeps the sheet open with Use enabled; the copy clears once Tax goes out', async () => {
    const { user, props } = setup(21);
    await user.click(handCard('shield-2'));
    const use = action(cardSheet('shield-2'), 'use');
    await user.click(use);
    expect([cardSheet('shield-2').closest('[inert]'), isDisabled(use)]).toEqual([null, false]);
    expectFollowCoach();
    await user.click(use);
    expectNoArenaIntent(props);
    await user.keyboard('{Escape}');
    await user.click(handCard('tax-1'));
    await user.click(action(cardSheet('tax-1'), 'use'));
    expectOnly(props, ['onPlayCard', ['tax-1']]);
    expect(coachTitle()).toBe(tutorialStepAt(21)?.coach?.title);
  });

  it('Unspy: a vetoed confirm keeps the picker open with Unspy enabled (L75-05 m1)', async () => {
    const { user, props } = setup(1, { view: spiedOn });
    await user.click(one('[data-arena-region="dock"] [data-unspy]'));
    const confirm = (): HTMLElement => within(screen.getByRole('dialog', { name: UNSPY_ACTION_LABEL })).getByRole('button', { name: UNSPY_CONFIRM_LABEL });
    const picker = screen.getByRole('dialog', { name: UNSPY_ACTION_LABEL });
    await user.click(confirm());
    expectNoArenaIntent(props);
    expectFollowCoach();
    expect([screen.getByRole('dialog', { name: UNSPY_ACTION_LABEL }) === picker, picker.closest('[inert]'), isDisabled(confirm())]).toEqual([true, null, false]);
  });

  it('new coach copy that Got it did not cause never moves focus out of an open sheet (L75-04 m2)', async () => {
    const { user } = setup(21);
    await user.click(handCard('shield-2'));
    const sheet = cardSheet('shield-2');
    const use = action(sheet, 'use');
    use.focus();
    await user.click(use);
    expectFollowCoach();
    expect([sheet.isConnected, sheet.contains(document.activeElement)]).toEqual([true, true]);
  });

  it('reconnecting: a send the step does not ask for is held by the lock, with no follow-coach copy, then shows it once connected (final review M3)', async () => {
    const poison = makePersistent({ id: 'eff-poison', cardId: 'poison', counter: 3 });
    const { user, props, rerender } = setup(1, { view: (view) => ({ ...view, self: { ...view.self, activePersistentEffects: [poison] } }) });
    await user.click(within(region('self-strip')).getByRole('button', { name: 'Poison, 3 card lives' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Poison' })).getByRole('button', { name: DEACTIVATE_ACTION_LABEL }));
    const deactivate = (): HTMLElement => within(screen.getByRole('dialog', { name: DEACTIVATE_CONFIRM_TITLE })).getByRole('button', { name: DEACTIVATE_ACTION_LABEL });
    rerender(<ArenaScreen {...props} connectionStatus="reconnecting" />);
    expect(isDisabled(deactivate())).toBe(true);
    await user.click(deactivate());
    expectNoArenaIntent(props);
    expect(coachTitle()).toBe(tutorialStepAt(1)?.coach?.title);
    rerender(<ArenaScreen {...props} connectionStatus="connected" />);
    await user.click(deactivate());
    expectNoArenaIntent(props);
    expectFollowCoach();
  });

  it("Draw: the tour's silent veto latches nothing, so after the last Got it the same Draw sends once", async () => {
    const { user, props } = setup(0);
    await user.click(dockButton('draw'));
    expect([isDisabled(dockButton('draw')), coachTitle()]).toEqual([false, TUTORIAL_TOUR_STEPS[0]?.coach.title]);
    expectNoArenaIntent(props);
    await finishTour(user);
    await user.click(dockButton('draw'));
    expectOnly(props, ['onDraw', []]);
  });

  it('Shop: a vetoed Buy keeps the Shop open, and Absorber then buys once', async () => {
    const { user, props } = setup(15);
    await user.click(dockButton('shop'));
    await user.click(buyCard());
    expect([one('[data-arena-sheet="shop"]').closest('[inert]'), isDisabled(buyCard())]).toEqual([null, false]);
    expectFollowCoach();
    expectNoArenaIntent(props);
    await user.click(one('[data-shop-tile="absorber"]'));
    await user.click(within(one('[data-arena-sheet="shop"]')).getByRole('button', { name: CARD_BUY_LABEL }));
    expectOnly(props, ['onBuyCard', ['absorber']]);
  });

  it('targeting: a vetoed seat tap keeps targeting live, and Basic then targets once', async () => {
    const { user, props } = setup(3);
    await user.click(handCard('spy-1'));
    await user.click(action(cardSheet('spy-1'), 'use'));
    await user.click(target('p1'));
    expect([document.querySelector('[data-zone="targeting-bar"]') !== null, target('p1').getAttribute('data-target-seat')]).toEqual([true, 'valid']);
    expectFollowCoach();
    expectNoArenaIntent(props);
    await user.click(within(one('[data-zone="targeting-bar"]')).getByRole('button', { name: CANCEL_ACTION_LABEL }));
    await user.keyboard('{Escape}');
    await user.click(handCard('basic-attack-1'));
    await user.click(action(cardSheet('basic-attack-1'), 'use'));
    await user.click(target('p1'));
    expectOnly(props, ['onPlayCard', ['basic-attack-1', { targetPlayerId: 'p1' }]]);
  });

  it('drop: a vetoed drop on Sell springs back, and Basic then goes out once', async () => {
    // Full motion, as `commit-veto.test.tsx` renders it: under reduced motion the ghost is gone at once, so only the animated spring leaves one to assert.
    const { user, props } = setup(3, { reducedMotion: false });
    lift(handCard('basic-attack-1'));
    dropOnSell();
    expect(document.querySelector('[data-zone="hand-drag-ghost"]')).not.toBeNull();
    expectFollowCoach();
    expectNoArenaIntent(props);
    handCard('basic-attack-1').focus();
    await user.keyboard('{Enter}');
    await user.click(action(cardSheet('basic-attack-1'), 'use'));
    await user.click(target('p1'));
    expectOnly(props, ['onPlayCard', ['basic-attack-1', { targetPlayerId: 'p1' }]]);
  });

  it('Deactivate: a vetoed confirm stays open with Deactivate enabled (carry-forward fix)', async () => {
    const poison = makePersistent({ id: 'eff-poison', cardId: 'poison', counter: 3 });
    const { user, props } = setup(1, { view: (view) => ({ ...view, self: { ...view.self, activePersistentEffects: [poison] } }) });
    await user.click(within(region('self-strip')).getByRole('button', { name: 'Poison, 3 card lives' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Poison' })).getByRole('button', { name: DEACTIVATE_ACTION_LABEL }));
    const confirm = screen.getByRole('dialog', { name: DEACTIVATE_CONFIRM_TITLE });
    const deactivate = within(confirm).getByRole('button', { name: DEACTIVATE_ACTION_LABEL });
    await user.click(deactivate);
    expect([screen.getByRole('dialog', { name: DEACTIVATE_CONFIRM_TITLE }) === confirm, confirm.closest('[inert]'), isDisabled(deactivate)]).toEqual([true, null, false]);
    expectFollowCoach();
    expectNoArenaIntent(props);
  });
});

describe('sub-choice answers (open question 8)', () => {
  const MIRROR: MirrorChoiceRequiredPayload = { kind: 'mirror', eligibleEffectIds: ['tut-e1'], deadlineMs: 40_000 };
  const incoming = (view: PlayingStateView): PlayingStateView => ({
    ...view, pendingEffects: [makePending({ id: 'tut-e1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack' })],
  });
  const confirmRedirect = async (user: User): Promise<void> => {
    await user.click(within(screen.getByRole('dialog', { name: SUB_CHOICE_COPY.mirror.title })).getByRole('button', { name: 'Confirm redirect' }));
  };

  it('goes out outside the tour and the Look gate', async () => {
    const { user, props } = setup(1, { props: { subChoice: MIRROR }, view: incoming });
    await confirmRedirect(user);
    expect(vi.mocked(props.onResolveSubChoice).mock.calls).toHaveLength(1);
  });

  it('is held silently during the tour, with no follow-coach copy', async () => {
    const { user, props } = setup(0, { props: { subChoice: MIRROR }, view: incoming });
    await confirmRedirect(user);
    expectNoArenaIntent(props);
    expect(coachTitle()).toBe(TUTORIAL_TOUR_STEPS[0]?.coach.title);
    expect(document.querySelector(`[data-zone="tutorial-coach"] [data-tutorial-ack="got-it"]`)?.textContent).toBe(GOT_IT_ACTION_LABEL);
  });
});
