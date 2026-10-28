/**
 * Shop model — technical spec v7 §6.8, §11 and §13 Q50; Appendix A `economy-bar`; L58-03, L58-05
 * and Lot 54; Lot 73 (L73-10).
 *
 * What the Shop dialog shows and which purchases it may send: the four tabs, every shared card
 * at its catalog buy cost, the random special, the public pool and the upgrade-point trade. Every
 * availability comes from `availabilityFor` after the shared lock, so the Shop is browse-only off
 * turn, in a sub-choice, for an eliminated POV and on the finished board, and is never stricter
 * than the server (`buy-shared-card`, `buy-special-card`, `buy-pool-card` and `upgrade-points`
 * under `apps/server/src/engine/economy/`).
 */

import {
  getKit,
  SHARED_CARD_CATALOG,
  SHARED_CARD_IDS,
  upgradePointBuyCost,
  upgradePointSellYield,
  type CardCost,
  type CardInstance,
  type PlayingStateView,
  type PrivateSelfView,
  type SharedCardId,
} from '@card-battle/shared';

import { structuredCostFromCardCost, type StructuredCost } from '../ui/structured-cost';
import { actionLock, type ActionContext } from './action-lock';
import { availabilityFor, type ActionAvailability, type DisabledReason } from './action-reasons';
import { SHOP_SECTION_CARDS, SHOP_SECTION_POOL, SHOP_SECTION_UPGRADE_POINTS } from './chrome-labels';
import {
  tutorialHighlightAt,
  tutorialShopSpotlight,
  type TutorialShopSpotlight,
} from './tutorial-coach-copy';

/**
 * The only client copy of the random special price (spec v7 §6.8, §13 Q50). Mirrors the
 * server's SPECIAL_CARD_PURCHASE_COST (apps/server/src/engine/economy/buy-special-card.ts),
 * which stays authoritative; rules spec §5.
 */
export const SPECIAL_CARD_PURCHASE_POINTS = 20;

/** Tab order of spec v7 §6.8. */
export const SHOP_TABS = ['cards', 'special', 'pool', 'upgrade-points'] as const;
export type ShopTab = (typeof SHOP_TABS)[number];

/** Three labels are the V2 section strings verbatim; `Special` is the only new one (§10.6). */
export const SHOP_TAB_LABELS: Readonly<Record<ShopTab, string>> = {
  cards: SHOP_SECTION_CARDS,
  special: 'Special',
  pool: SHOP_SECTION_POOL,
  'upgrade-points': SHOP_SECTION_UPGRADE_POINTS,
};

/** The tutorial item to spotlight and the tab it lives on (§6.8). */
export type ShopHighlight =
  | { tab: 'upgrade-points'; item: Extract<TutorialShopSpotlight, 'upgrade-point'> }
  | { tab: 'cards'; item: Extract<TutorialShopSpotlight, 'absorber'> };

export interface ShopCardTile {
  cardId: SharedCardId;
  /** The V2 `shop-dialog.tsx` face: the kit's `alwaysUpgraded` cards show upgraded. */
  instance: CardInstance;
  /** Catalog `buyCost`, never the upgraded play cost (`card-catalog.ts`). */
  cost: StructuredCost | null;
  /** Points and lives against `cost`, ignoring turn and lock: the V2 faded tile. */
  affordable: boolean;
  /** Tutorial `shop-absorber`: highlighted, not preselected. */
  highlighted: boolean;
  buy: ActionAvailability;
}

export interface ShopCardsModel {
  tiles: readonly ShopCardTile[];
  /** V2 `DEFAULT_SHOP_CARD_ID`: select-then-Buy keeps its default (§6.8). */
  defaultSelectedCardId: SharedCardId;
}

export interface ShopSpecialModel {
  cost: StructuredCost;
  buy: ActionAvailability;
}

export interface ShopPoolModel {
  /** Public pool faces, `view.pool` order. */
  cards: readonly CardInstance[];
  /** The public `view.poolBuyCost`. */
  cost: StructuredCost;
  buy: ActionAvailability;
}

export interface ShopUpgradePointsModel {
  buyCostPoints: number;
  sellYieldPoints: number;
  buy: ActionAvailability;
  sell: ActionAvailability;
}

export interface ShopModel {
  tabs: readonly ShopTab[];
  initialTab: ShopTab;
  highlight: ShopHighlight | null;
  /** `actionLock(view, ctx) !== null`: the Shop opens but every buy is disabled. */
  browseOnly: boolean;
  cards: ShopCardsModel;
  special: ShopSpecialModel;
  pool: ShopPoolModel;
  upgradePoints: ShopUpgradePointsModel;
}

/**
 * Points before lives, as `canAffordCost` and `payCost` do
 * (apps/server/src/engine/economy/transfers.ts).
 */
function buyShortfall(
  self: PrivateSelfView,
  cost: CardCost,
): Extract<DisabledReason, 'not-enough-points' | 'not-enough-lives'> | null {
  if ((cost.points ?? 0) > self.points) {
    return 'not-enough-points';
  }
  if ((cost.lives ?? 0) > self.lives) {
    return 'not-enough-lives';
  }
  return null;
}

/**
 * The pool's own checks, in `buy-pool-card.ts` order (apps/server/src/engine/economy/): an empty
 * pool first, then the public fee through `payCost` (points only).
 */
function poolShortfall(
  view: PlayingStateView,
): Extract<DisabledReason, 'pool-empty' | 'not-enough-points'> | null {
  if (view.pool.length === 0) {
    return 'pool-empty';
  }
  return view.self.points < view.poolBuyCost ? 'not-enough-points' : null;
}

function highlightOf(view: PlayingStateView): ShopHighlight | null {
  const spotlight =
    view.playKind === 'tutorial' && view.tutorialIndex !== null
      ? tutorialShopSpotlight(tutorialHighlightAt(view.tutorialIndex))
      : undefined;
  if (spotlight === 'upgrade-point') {
    return { tab: 'upgrade-points', item: 'upgrade-point' };
  }
  if (spotlight === 'absorber') {
    return { tab: 'cards', item: 'absorber' };
  }
  return null;
}

/**
 * The Shop for the POV. Prices come from the kit and the view at call time and are never cached
 * (L58-03: Cloning can change the kit). `ctx.readOnly` is the finished board, where `view` is
 * `finished.finalTable`. While the board tour or the Look gate is active the Shop cannot be
 * opened (Appendix A `economy-bar`), so the tutorial highlight is read from the view alone.
 */
export function shop(view: PlayingStateView, ctx: ActionContext): ShopModel {
  const lock = actionLock(view, ctx);
  const self = view.self;
  const highlight = highlightOf(view);
  const alwaysUpgraded = getKit(self.kitId).traits.alwaysUpgraded;

  const tiles = SHARED_CARD_IDS.map((cardId): ShopCardTile => {
    const buyCost = SHARED_CARD_CATALOG[cardId].buyCost;
    const shortfall = buyShortfall(self, buyCost);
    return {
      cardId,
      instance: { instanceId: `shop-${cardId}`, cardId, isUpgraded: alwaysUpgraded.includes(cardId) },
      cost: structuredCostFromCardCost(buyCost),
      affordable: shortfall === null,
      highlighted: highlight?.item === 'absorber' && cardId === 'absorber',
      buy: availabilityFor(lock ?? shortfall),
    };
  });

  const buyCostPoints = upgradePointBuyCost(self.kitId);
  const sellYieldPoints = upgradePointSellYield(self.kitId);

  return {
    tabs: SHOP_TABS,
    initialTab: highlight?.tab ?? 'cards',
    highlight,
    browseOnly: lock !== null,
    cards: { tiles, defaultSelectedCardId: SHARED_CARD_IDS[0] },
    special: {
      cost: { kind: 'points', amount: SPECIAL_CARD_PURCHASE_POINTS },
      buy: availabilityFor(lock ?? (self.points < SPECIAL_CARD_PURCHASE_POINTS ? 'not-enough-points' : null)),
    },
    pool: {
      cards: view.pool,
      cost: { kind: 'points', amount: view.poolBuyCost },
      buy: availabilityFor(lock ?? poolShortfall(view)),
    },
    upgradePoints: {
      buyCostPoints,
      sellYieldPoints,
      buy: availabilityFor(lock ?? (self.points < buyCostPoints ? 'not-enough-points' : null)),
      sell: availabilityFor(lock ?? (self.upgradePoints < 1 ? 'no-upgrade-point' : null)),
    },
  };
}
