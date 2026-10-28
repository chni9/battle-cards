/**
 * shop(): technical spec v7 §6.8, §11 and §13 Q50 (L73-10).
 */
import {
  getCard,
  SHARED_CARD_IDS,
  TUTORIAL_STEPS,
  upgradePointBuyCost,
  upgradePointSellYield,
  type ActionLogEntryView,
  type PlayingStateView,
  type SharedCardId,
  type SubChoiceRequiredPayload,
  type TutorialHighlight,
} from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import type { ActionContext } from './action-lock';
import { DISABLED_REASON_COPY } from './action-reasons';
import { chipsForPublicLogEntry } from './opponent-token-chips';
import {
  shop,
  SHOP_TAB_LABELS,
  SPECIAL_CARD_PURCHASE_POINTS,
  type ShopCardTile,
  type ShopModel,
} from './shop';
import { makeCard, makePlayer, makePlayingView, makeSelf } from './test-fixtures';

const LIVE: ActionContext = { subChoice: null, readOnly: false };
const MIRROR_OPEN: SubChoiceRequiredPayload = { kind: 'mirror', eligibleEffectIds: [], deadlineMs: 1 };

function tile(model: ShopModel, cardId: SharedCardId): ShopCardTile {
  const found = model.cards.tiles.find((entry) => entry.cardId === cardId);
  if (found === undefined) {
    throw new Error(`no ${cardId} tile`);
  }
  return found;
}

function tutorialIndexOf(highlight: TutorialHighlight): number {
  const step = TUTORIAL_STEPS.find((entry) => entry.highlight === highlight);
  if (step === undefined) {
    throw new Error(`no tutorial step highlights ${String(highlight)}`);
  }
  return step.index;
}

describe('shop() (§6.8)', () => {
  it('keeps the one client special price and feeds the token chips from it (Q50)', () => {
    expect(SPECIAL_CARD_PURCHASE_POINTS).toBe(20);
    expect(shop(makePlayingView(), LIVE).special.cost).toEqual({ kind: 'points', amount: SPECIAL_CARD_PURCHASE_POINTS });
    const entry: ActionLogEntryView = { kind: 'actionPlayed', actorPlayerId: 'p1', action: 'buySpecialCard', turnSequence: 3 };
    expect(chipsForPublicLogEntry(entry, 'me', makePlayingView().players, 'kamikaze')).toEqual([
      { kind: 'point', count: SPECIAL_CARD_PURCHASE_POINTS, from: { playerId: 'p1' }, to: 'log' },
    ]);
  });

  it('opens on Cards with the §6.8 tab order and the V2 default selection', () => {
    const model = shop(makePlayingView(), LIVE);
    expect(model.tabs).toEqual(['cards', 'special', 'pool', 'upgrade-points']);
    expect(SHOP_TAB_LABELS).toEqual({ cards: 'Cards', special: 'Special', pool: 'Pool', 'upgrade-points': 'Upgrade points' });
    expect(model.initialTab).toBe('cards');
    expect(model.highlight).toBeNull();
    expect(model.browseOnly).toBe(false);
    expect(model.cards.defaultSelectedCardId).toBe('basic-attack');
  });

  it('lists every shared card at its catalog buy cost; the Spy tile costs 4 to buy (Lot 54)', () => {
    const model = shop(makePlayingView({ self: makeSelf({ points: 100 }) }), LIVE);
    expect(model.cards.tiles.map((entry) => entry.cardId)).toEqual([...SHARED_CARD_IDS]);
    expect(model.cards.tiles.map((entry) => entry.cost)).toEqual([
      { kind: 'points', amount: 2 },
      { kind: 'points', amount: 4 },
      { kind: 'points', amount: 20 },
      { kind: 'points', amount: 6 },
      { kind: 'points', amount: 4 },
      { kind: 'points', amount: 10 },
      { kind: 'points', amount: 12 },
      { kind: 'points', amount: 14 },
      { kind: 'lives', amount: 2 },
      { kind: 'points', amount: 6 },
    ]);
    expect(tile(model, 'spy').cost).toEqual({ kind: 'points', amount: 4 });
    expect(getCard('spy')?.cost).toEqual({ points: 2 });
    expect(tile(model, 'spy').instance).toEqual({ instanceId: 'shop-spy', cardId: 'spy', isUpgraded: false });
  });

  it('checks points and lives: Tax needs 2 lives, Super attack 20 points', () => {
    const poor = shop(makePlayingView({ self: makeSelf({ points: 19, lives: 1 }) }), LIVE);
    expect(tile(poor, 'tax')).toMatchObject({ affordable: false, buy: { enabled: false, reason: 'not-enough-lives' } });
    expect(tile(poor, 'super-attack')).toMatchObject({ affordable: false, buy: { enabled: false, reason: 'not-enough-points' } });
    expect(tile(poor, 'mirror')).toMatchObject({ affordable: true, buy: { enabled: true, reason: null } });
    const twoLives = shop(makePlayingView({ self: makeSelf({ points: 19, lives: 2 }) }), LIVE);
    expect(tile(twoLives, 'tax').buy).toEqual({ enabled: true, reason: null });
  });

  it('shows the kit alwaysUpgraded faces at unchanged prices (Tactician)', () => {
    const model = shop(makePlayingView({ self: makeSelf({ kitId: 'tactician', points: 15 }) }), LIVE);
    expect(model.cards.tiles.filter((entry) => entry.instance.isUpgraded).map((entry) => entry.cardId))
      .toEqual(['spy', 'thief', 'mirror']);
    expect(tile(model, 'spy').cost).toEqual({ kind: 'points', amount: 4 });
  });

  it.each(['kamikaze', 'upgrader', 'gambler'] as const)('prices upgrade points from the %s kit at call time (L58-03)', (kitId) => {
    const model = shop(makePlayingView({ self: makeSelf({ kitId }) }), LIVE);
    expect(model.upgradePoints.buyCostPoints).toBe(upgradePointBuyCost(kitId));
    expect(model.upgradePoints.sellYieldPoints).toBe(upgradePointSellYield(kitId));
  });

  it('Upgrader buys an upgrade point for 5 where Kamikaze needs 10; Sell needs one to sell', () => {
    expect(shop(makePlayingView({ self: makeSelf({ kitId: 'upgrader', points: 5, upgradePoints: 0 }) }), LIVE).upgradePoints)
      .toEqual({ buyCostPoints: 5, sellYieldPoints: 7, buy: { enabled: true, reason: null }, sell: { enabled: false, reason: 'no-upgrade-point' } });
    expect(shop(makePlayingView({ self: makeSelf({ kitId: 'kamikaze', points: 5, upgradePoints: 1 }) }), LIVE).upgradePoints)
      .toEqual({ buyCostPoints: 10, sellYieldPoints: 7, buy: { enabled: false, reason: 'not-enough-points' }, sell: { enabled: true, reason: null } });
  });

  it('disables Buy special at 19 points with its reason', () => {
    expect(shop(makePlayingView({ self: makeSelf({ points: 19 }) }), LIVE).special.buy)
      .toEqual({ enabled: false, reason: 'not-enough-points' });
    expect(DISABLED_REASON_COPY['not-enough-points']).not.toBe('');
    expect(shop(makePlayingView({ self: makeSelf({ points: 20 }) }), LIVE).special.buy).toEqual({ enabled: true, reason: null });
  });

  it('reports an empty pool before the fee, as buy-pool-card.ts checks it first', () => {
    expect(shop(makePlayingView({ pool: [], poolBuyCost: 4, self: makeSelf({ points: 3 }) }), LIVE).pool.buy)
      .toEqual({ enabled: false, reason: 'pool-empty' });
  });

  it('shows public pool faces and disables Buy random on an empty pool and under the fee (L58-05)', () => {
    const poolCard = makeCard('shield', { instanceId: 'pool-1', isUpgraded: true });
    expect(shop(makePlayingView({ pool: [], poolBuyCost: 1, self: makeSelf({ points: 50 }) }), LIVE).pool)
      .toEqual({ cards: [], cost: { kind: 'points', amount: 1 }, buy: { enabled: false, reason: 'pool-empty' } });
    expect(shop(makePlayingView({ pool: [poolCard], poolBuyCost: 4, self: makeSelf({ points: 3 }) }), LIVE).pool)
      .toEqual({ cards: [poolCard], cost: { kind: 'points', amount: 4 }, buy: { enabled: false, reason: 'not-enough-points' } });
    expect(shop(makePlayingView({ pool: [poolCard], poolBuyCost: 4, self: makeSelf({ points: 4 }) }), LIVE).pool.buy)
      .toEqual({ enabled: true, reason: null });
  });

  it('off-turn disables every buy with its reason while every tile stays listed', () => {
    const view = makePlayingView({
      currentTurnPlayerId: 'p1',
      pool: [makeCard('spy', { instanceId: 'pool-1' })],
      self: makeSelf({ points: 19, upgradePoints: 2 }),
    });
    const model = shop(view, LIVE);
    expect(model.browseOnly).toBe(true);
    expect(model.cards.tiles).toHaveLength(SHARED_CARD_IDS.length);
    expect(model.pool.cards).toHaveLength(1);
    expect(tile(model, 'super-attack').affordable).toBe(false);
    const buys = [
      ...model.cards.tiles.map((entry) => entry.buy),
      model.special.buy, model.pool.buy, model.upgradePoints.buy, model.upgradePoints.sell,
    ];
    expect(buys).toHaveLength(SHARED_CARD_IDS.length + 4);
    for (const buy of buys) {
      expect(buy).toEqual({ enabled: false, reason: 'not-your-turn' });
    }
  });

  it.each<{ label: string; view: PlayingStateView; ctx: ActionContext }>([
    { label: 'the finished board', view: makePlayingView({ turnDeadlineMs: null, self: makeSelf({ points: 100 }) }), ctx: { subChoice: null, readOnly: true } },
    { label: 'an open sub-choice', view: makePlayingView({ self: makeSelf({ points: 100 }) }), ctx: { subChoice: MIRROR_OPEN, readOnly: false } },
    {
      label: 'an eliminated POV',
      view: makePlayingView({
        currentTurnPlayerId: 'p1',
        players: [makePlayer('me', { isYou: true, isEliminated: true }), makePlayer('p1'), makePlayer('p2')],
        self: makeSelf({ points: 100 }),
      }),
      ctx: LIVE,
    },
  ])('is browse-only on $label (actions-locked)', ({ view, ctx }) => {
    const model = shop(view, ctx);
    expect(model.browseOnly).toBe(true);
    expect(model.cards.tiles).toHaveLength(SHARED_CARD_IDS.length);
    expect(model.cards.tiles.every((entry) => entry.buy.reason === 'actions-locked')).toBe(true);
    expect(model.special.buy).toEqual({ enabled: false, reason: 'actions-locked' });
    expect(model.upgradePoints.buy).toEqual({ enabled: false, reason: 'actions-locked' });
  });

  it('opens shop-upgrade-point on the Upgrade points tab with Buy highlighted (§6.8)', () => {
    const model = shop(makePlayingView({ playKind: 'tutorial', tutorialIndex: tutorialIndexOf('shop-upgrade-point') }), LIVE);
    expect(model.initialTab).toBe('upgrade-points');
    expect(model.highlight).toEqual({ tab: 'upgrade-points', item: 'upgrade-point' });
    expect(model.cards.tiles.some((entry) => entry.highlighted)).toBe(false);
  });

  it('opens shop-absorber on Cards with Absorber highlighted, not preselected (§6.8)', () => {
    const model = shop(makePlayingView({ playKind: 'tutorial', tutorialIndex: tutorialIndexOf('shop-absorber') }), LIVE);
    expect(model.initialTab).toBe('cards');
    expect(model.highlight).toEqual({ tab: 'cards', item: 'absorber' });
    expect(model.cards.tiles.filter((entry) => entry.highlighted).map((entry) => entry.cardId)).toEqual(['absorber']);
    expect(model.cards.defaultSelectedCardId).toBe('basic-attack');
  });

  it('ignores tutorial highlights outside the Shop and in Classic', () => {
    expect(shop(makePlayingView({ playKind: 'tutorial', tutorialIndex: tutorialIndexOf('draw') }), LIVE).highlight).toBeNull();
    expect(shop(makePlayingView({ playKind: 'classic', tutorialIndex: null }), LIVE).highlight).toBeNull();
  });
});
