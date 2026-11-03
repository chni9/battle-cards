// @vitest-environment happy-dom
/**
 * Shop sheet: technical spec v7 §6.8, §6.6.4, §6.6.5, §13 Q50; Appendix A `shop-dialog`,
 * `table-shop-double-click-buy`, `economy-bar` (L74-14). The ArenaScreenProps spies stand in for
 * the connection; every test that opens or selects asserts that nothing was sent (§6.6.4). It is
 * also the behavior replacement the Owner lot 75 `shop-dialog.test.ts` rows name.
 */
import { SHARED_CARD_IDS, type PlayingStateView } from '@card-battle/shared';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { spokenTexts, visibleText } from '../../test/glyph-queries';
import { renderUi, type RenderUiOptions, type RenderUiResult } from '../../test/render';
import { LONG_PRESS_MS } from '../../ui/motion/use-long-press';
import { DISABLED_REASON_COPY, type DisabledReason } from '../../view-model/action-reasons';
import { SPECIAL_CARD_PURCHASE_POINTS } from '../../view-model/shop';
import { makeCard, makeSelf } from '../../view-model/test-fixtures';
import { ArenaScreen, type ArenaScreenProps } from './arena-screen';
import { POOL_BLURB, POOL_EMPTY_COPY } from './shop-sheet-model';
import { expectNoArenaIntent, makeArenaProps, makeArenaView } from './test-view';

const viewWith = (self: Parameters<typeof makeSelf>[0], overrides: Partial<PlayingStateView> = {}): PlayingStateView =>
  makeArenaView({ overrides: { self: makeSelf(self), ...overrides } });
function setup(view: PlayingStateView, overrides: Partial<ArenaScreenProps> = {}, options: RenderUiOptions = {}) {
  const spies = {
    onBuyCard: vi.fn<ArenaScreenProps['onBuyCard']>(),
    onBuySpecialCard: vi.fn<() => void>(),
    onBuyPoolCard: vi.fn<() => void>(),
    onBuyUpgradePoint: vi.fn<() => void>(),
    onSellUpgradePoint: vi.fn<() => void>(),
  };
  const props = makeArenaProps({ view, ...spies, ...overrides });
  return { ...spies, props, ...renderUi(<ArenaScreen {...props} />, options) };
}
function part(root: ParentNode, selector: string): HTMLElement {
  const found = root.querySelector<HTMLElement>(selector);
  if (found === null) throw new Error(`no ${selector}`);
  return found;
}
const tile = (sheet: HTMLElement, cardId: string): HTMLElement => part(sheet, `[data-shop-tile="${cardId}"]`);
const action = (sheet: HTMLElement, name: string): HTMLElement => part(sheet, `[data-shop-action="${name}"]`);
const isDisabled = (button: HTMLElement): boolean => button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true';
function reasonOf(button: HTMLElement): string {
  const ids = button.getAttribute('aria-describedby') ?? '';
  return ids.split(' ').map((id) => document.getElementById(id)?.textContent ?? '').join(' ').trim();
}
async function openShop(user: RenderUiResult['user']): Promise<HTMLElement> {
  await user.click(within(part(document, '[data-arena-region="dock"]')).getByRole('button', { name: 'Shop' }));
  return screen.getByRole('dialog', { name: 'Shop' });
}
const POOL_SPY = [makeCard('spy', { instanceId: 'pool-1' })];

describe('Shop sheet (§6.8)', () => {
  it.each<{ label: string; view: PlayingStateView; overrides: Partial<ArenaScreenProps>; reason: DisabledReason }>([
    { label: 'off-turn', view: viewWith({ points: 50 }, { currentTurnPlayerId: 'p1', pool: POOL_SPY }), overrides: {}, reason: 'not-your-turn' },
    { label: 'on the finished board', view: viewWith({ points: 50 }, { pool: POOL_SPY }), overrides: { readOnly: true, onOpenFeedback: vi.fn(), onShowStats: vi.fn() }, reason: 'actions-locked' },
  ])('opens $label with every tile and buy disabled, every tab still browsable', async ({ view, overrides, reason }) => {
    const { user, props } = setup(view, overrides);
    const sheet = await openShop(user);
    expect(sheet.getAttribute('data-arena-sheet')).toBe('shop');
    const tiles = [...sheet.querySelectorAll<HTMLElement>('[data-shop-tile]')];
    expect(tiles.map((entry) => entry.getAttribute('data-shop-tile'))).toEqual([...SHARED_CARD_IDS]);
    expect(tiles.every(isDisabled)).toBe(true);
    fireEvent.doubleClick(tile(sheet, 'spy'));
    expect(reasonOf(action(sheet, 'buy-card'))).toBe(DISABLED_REASON_COPY[reason]);
    await user.click(within(sheet).getByRole('tab', { name: 'Pool' }));
    expect(within(sheet).getByRole('button', { name: 'Spy' })).toBeTruthy();
    expect(isDisabled(action(sheet, 'buy-pool'))).toBe(true);
    await user.click(within(sheet).getByRole('tab', { name: 'Upgrade points' }));
    expect(reasonOf(action(sheet, 'buy-upgrade-point'))).toBe(DISABLED_REASON_COPY[reason]);
    expectNoArenaIntent(props);
  });

  it('a tap only selects; Buy selected sends buyCard for the selected tile once and closes', async () => {
    const { user, props, onBuyCard } = setup(viewWith({ points: 50 }));
    const sheet = await openShop(user);
    expect(tile(sheet, 'basic-attack').getAttribute('aria-pressed')).toBe('true');
    await user.click(tile(sheet, 'spy'));
    expect([tile(sheet, 'spy'), tile(sheet, 'basic-attack')].map((entry) => entry.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
    expectNoArenaIntent(props);
    const buy = within(sheet).getByRole('button', { name: 'Buy selected' });
    fireEvent.click(buy);
    fireEvent.click(buy);
    expect(onBuyCard.mock.calls).toEqual([['spy']]);
    expect(screen.queryByRole('dialog', { name: 'Shop' })).toBeNull();
  });

  it('a double tap buys that tile at once: one buyCard, and the sheet closes', async () => {
    const { user, onBuyCard } = setup(viewWith({ points: 50 }));
    const sheet = await openShop(user);
    const mirror = tile(sheet, 'mirror');
    expect(mirror.classList.contains('touch-manipulation')).toBe(true);
    await user.dblClick(mirror);
    expect(onBuyCard.mock.calls).toEqual([['mirror']]);
    expect(screen.queryByRole('dialog', { name: 'Shop' })).toBeNull();
  });

  it("ends an unaffordable tile's name with ', cannot afford'; a double tap only selects it", async () => {
    const { user, props } = setup(viewWith({ points: 19 }));
    const sheet = await openShop(user);
    const superAttack = tile(sheet, 'super-attack');
    expect([superAttack.getAttribute('aria-label'), tile(sheet, 'spy').getAttribute('aria-label')])
      .toEqual(['Super attack, minus 20 pts, cannot afford', 'Spy, minus 4 pts']);
    await user.dblClick(superAttack);
    expect(superAttack.getAttribute('aria-pressed')).toBe('true');
    expect(reasonOf(within(sheet).getByRole('button', { name: 'Buy selected' }))).toBe(DISABLED_REASON_COPY['not-enough-points']);
    expectNoArenaIntent(props);
  });

  it('shows the Spy tile at play 2 and buy 4 (Lot 54), on the kit face (Tactician: upgraded)', async () => {
    const { user } = setup(viewWith({ kitId: 'tactician', points: 50 }));
    const sheet = await openShop(user);
    const spy = tile(sheet, 'spy');
    expect(visibleText(part(spy, '[data-card-chip="cost"]'))).toBe('2');
    expect(visibleText(part(sheet, '[data-shop-price="spy"]'))).toBe('−4');
    expect(spy.getAttribute('aria-label')).toBe('Spy upgraded, minus 4 pts');
    expect(spy.querySelector('[data-card-badge="upgraded"]')).not.toBeNull();
  });

  it.each([
    { kitId: 'upgrader', upgradePoints: 0, buy: ['minus 5 pts', 'plus 1 upgrade point'], blocked: 'sell-upgrade-point', reason: 'no-upgrade-point', press: 'buy-upgrade-point', sent: 'onBuyUpgradePoint' },
    { kitId: 'kamikaze', upgradePoints: 1, buy: ['minus 10 pts', 'plus 1 upgrade point'], blocked: 'buy-upgrade-point', reason: 'not-enough-points', press: 'sell-upgrade-point', sent: 'onSellUpgradePoint' },
  ] as const)('prices Upgrade points from the $kitId kit at render; $press sends once and closes (L58-03)', async ({ kitId, upgradePoints, buy, blocked, reason, press, sent }) => {
    const shown = setup(viewWith({ kitId, points: 5, upgradePoints }));
    const sheet = await openShop(shown.user);
    await shown.user.click(within(sheet).getByRole('tab', { name: 'Upgrade points' }));
    expect(spokenTexts(action(sheet, 'buy-upgrade-point'))).toEqual(buy);
    expect(spokenTexts(action(sheet, 'sell-upgrade-point'))).toEqual(['plus 7 pts', 'minus 1 upgrade point']);
    expect(reasonOf(action(sheet, blocked))).toBe(DISABLED_REASON_COPY[reason]);
    expect(visibleText(sheet)).not.toMatch(/\bUP\b/);
    fireEvent.click(action(sheet, press));
    fireEvent.click(action(sheet, press));
    expect(shown[sent]).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: 'Shop' })).toBeNull();
  });

  it('lists the public pool with the V2 copy; Buy random shows the public fee and is disabled on an empty pool', async () => {
    const pool = [makeCard('shield', { instanceId: 'pool-1', isUpgraded: true }), makeCard('spy', { instanceId: 'pool-2' })];
    const full = setup(viewWith({ points: 50 }, { pool, poolBuyCost: 4 }));
    let sheet = await openShop(full.user);
    await full.user.click(within(sheet).getByRole('tab', { name: 'Pool' }));
    expect([within(sheet).getByText('Pool (2)'), within(sheet).getByText(POOL_BLURB)]).toHaveLength(2);
    expect(within(sheet).getByRole('button', { name: 'Shield upgraded' })).toBeTruthy();
    expect(within(sheet).queryByText('Hidden card')).toBeNull();
    expect([spokenTexts(action(sheet, 'buy-pool')), isDisabled(action(sheet, 'buy-pool'))]).toEqual([['minus 4 pts'], false]);
    full.unmount();
    const empty = setup(viewWith({ points: 50 }, { pool: [], poolBuyCost: 4 }));
    sheet = await openShop(empty.user);
    await empty.user.click(within(sheet).getByRole('tab', { name: 'Pool' }));
    expect(within(sheet).getByText(POOL_EMPTY_COPY)).toBeTruthy();
    expect(reasonOf(action(sheet, 'buy-pool'))).toBe(DISABLED_REASON_COPY['pool-empty']);
    expectNoArenaIntent(empty.props);
  });

  it.each([
    { tab: 'Special', name: 'buy-special', spoken: [`minus ${String(SPECIAL_CARD_PURCHASE_POINTS)} pts`], sent: 'onBuySpecialCard' },
    { tab: 'Pool', name: 'buy-pool', spoken: ['minus 1 pt'], sent: 'onBuyPoolCard' },
  ] as const)('$tab: one press sends once at its price and closes the sheet (Q50)', async ({ tab, name, spoken, sent }) => {
    const shown = setup(viewWith({ points: 50 }, { pool: POOL_SPY }));
    const sheet = await openShop(shown.user);
    await shown.user.click(within(sheet).getByRole('tab', { name: tab }));
    expect(spokenTexts(action(sheet, name))).toEqual(spoken);
    fireEvent.click(action(sheet, name));
    fireEvent.click(action(sheet, name));
    expect(shown[sent]).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: 'Shop' })).toBeNull();
  });

  it("the tile's Inspect button opens the read-only card sheet on the kit face, selecting and sending nothing", async () => {
    const { user, props } = setup(viewWith({ kitId: 'tactician', points: 50 }));
    const sheet = await openShop(user);
    await user.click(within(sheet).getByRole('button', { name: 'Inspect Spy' }));
    const card = screen.getByRole('dialog', { name: 'Spy' });
    expect(card.getAttribute('data-arena-sheet')).toBe('card:shop-spy');
    expect(within(card).getByRole('article', { name: 'Spy upgraded' })).toBeTruthy();
    expect(card.querySelector('[data-zone="sheet-actions"]')).toBeNull();
    expect(tile(sheet, 'spy').getAttribute('aria-pressed')).toBe('false');
    expectNoArenaIntent(props);
  });

  it('a long-press on a tile opens the same read-only card sheet (§6.6.5)', async () => {
    vi.useFakeTimers();
    const { user, props } = setup(viewWith({ points: 50 }), {}, { advanceTimers: vi.advanceTimersByTime });
    const sheet = await openShop(user);
    // The press `use-long-press.test.tsx` (L74-02) fires: a primary button, held still.
    fireEvent.pointerDown(tile(sheet, 'thief'), { button: 0, pointerId: 1, clientX: 10, clientY: 10 });
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
    expect(screen.getByRole('dialog', { name: 'Thief' }).getAttribute('data-arena-sheet')).toBe('card:shop-thief');
    expectNoArenaIntent(props);
  });

  it('a browse-only tile stays focusable: a tap selects nothing, a long-press opens its card sheet (§6.6.5)', async () => {
    vi.useFakeTimers();
    const { user, props } = setup(viewWith({ points: 50 }, { currentTurnPlayerId: 'p1' }), {}, { advanceTimers: vi.advanceTimersByTime });
    const sheet = await openShop(user);
    const thief = tile(sheet, 'thief');
    expect([thief.hasAttribute('disabled'), thief.getAttribute('aria-disabled')]).toEqual([false, 'true']);
    await user.click(thief);
    expect([thief, tile(sheet, 'basic-attack')].map((entry) => entry.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
    fireEvent.pointerDown(thief, { button: 0, pointerId: 1, clientX: 10, clientY: 10 });
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
    expect(screen.getByRole('dialog', { name: 'Thief' }).getAttribute('data-arena-sheet')).toBe('card:shop-thief');
    expectNoArenaIntent(props);
  });

  it('a pool face opens its read-only card sheet, sending nothing', async () => {
    const pool = [makeCard('shield', { instanceId: 'pool-1', isUpgraded: true })];
    const { user, props } = setup(viewWith({ points: 50 }, { pool }));
    const sheet = await openShop(user);
    await user.click(within(sheet).getByRole('tab', { name: 'Pool' }));
    await user.click(within(sheet).getByRole('button', { name: 'Shield upgraded' }));
    const card = screen.getByRole('dialog', { name: 'Shield' });
    expect(card.getAttribute('data-arena-sheet')).toBe('card:pool-1');
    expect(within(card).getByRole('article', { name: 'Shield upgraded' })).toBeTruthy();
    expect(card.querySelector('[data-zone="sheet-actions"]')).toBeNull();
    expectNoArenaIntent(props);
  });
});
