/**
 * Shop dialog — upgrade points, shared cards, pool (L43-02 / technical spec v6 §6.1).
 * Same intents as the former economy Buy / Pool / upgrade-point controls.
 */

import {
  SHARED_CARD_IDS,
  formatCardLabel,
  getCard,
  getKit,
  upgradePointBuyCost,
  upgradePointSellYield,
  type PlayingStateView,
  type TutorialHighlight,
} from '@card-battle/shared';
import { useEffect, useRef, useState, type ReactElement } from 'react';

import { Button } from '../../design/components/button';
import { Card } from '../../design/components/card';
import { choiceTileClassName } from '../../design/components/choice-tile-chrome';
import { CostDisplay } from '../../design/components/cost-display';
import { Dialog } from '../../design/components/dialog';
import {
  costAriaLabel,
  structuredCostFromCardCost,
} from '../../design/components/structured-cost';
import {
  BUY_SPECIAL_LABEL,
  BUY_UPGRADE_POINT_LABEL,
  CARD_BUY_LABEL,
  SELL_UPGRADE_POINT_LABEL,
  SHOP_ACTION_LABEL,
  SHOP_SECTION_CARDS,
  SHOP_SECTION_POOL,
  SHOP_SECTION_UPGRADE_POINTS,
} from './chrome-labels';
import { SHOP_PRICE_BLURB } from './table-copy';
import { TutorialCallout } from './tutorial-callout';

const DEFAULT_SHOP_CARD_ID = SHARED_CARD_IDS[0];

function canAffordSharedBuy(
  view: PlayingStateView,
  cardId: (typeof SHARED_CARD_IDS)[number],
): boolean {
  const cost = getCard(cardId)?.buyCost;

  if (cost === undefined) {
    return false;
  }

  const points = cost.points ?? 0;
  const lives = cost.lives ?? 0;

  if (points > 0 && view.self.points < points) {
    return false;
  }

  if (lives > 0 && view.self.lives < lives) {
    return false;
  }

  return points > 0 || lives > 0;
}

export interface ShopDialogProps {
  open: boolean;
  view: PlayingStateView;
  isMyTurn: boolean;
  actionsLocked: boolean;
  onClose: () => void;
  onBuyUpgradePoint: () => void;
  onSellUpgradePoint: () => void;
  onBuyCard: (cardId: (typeof SHARED_CARD_IDS)[number]) => void;
  onBuySpecialCard: () => void;
  /** Tutorial spotlight (L45-05). Shop is never auto-opened. */
  tutorialHighlight?: TutorialHighlight;
}

export function ShopDialog({
  open,
  view,
  isMyTurn,
  actionsLocked,
  onClose,
  onBuyUpgradePoint,
  onSellUpgradePoint,
  onBuyCard,
  onBuySpecialCard,
  tutorialHighlight = null,
}: ShopDialogProps): ReactElement {
  const [buyCardId, setBuyCardId] = useState<string>(DEFAULT_SHOP_CARD_ID);
  const upgradePointRef = useRef<HTMLDivElement>(null);
  const disabled = !isMyTurn || actionsLocked;
  const kitId = view.self.kitId;
  const buyUpgradeCost = upgradePointBuyCost(kitId);
  const sellUpgradeYield = upgradePointSellYield(kitId);
  const alwaysUpgradedIds = getKit(kitId).traits.alwaysUpgraded;
  const selectedShopId =
    tutorialHighlight === 'shop-absorber'
      ? 'absorber'
      : (SHARED_CARD_IDS as readonly string[]).includes(buyCardId)
        ? (buyCardId as (typeof SHARED_CARD_IDS)[number])
        : DEFAULT_SHOP_CARD_ID;
  const shopBlurbCost = structuredCostFromCardCost(getCard(selectedShopId)?.buyCost);
  const highlightUpgradePoint = tutorialHighlight === 'shop-upgrade-point';

  useEffect(() => {
    if (!open || !highlightUpgradePoint) {
      return;
    }
    upgradePointRef.current?.scrollIntoView({ block: 'center', inline: 'nearest' });
  }, [open, highlightUpgradePoint]);

  return (
    <Dialog
      open={open}
      title={SHOP_ACTION_LABEL}
      onClose={onClose}
      panelClassName="max-w-3xl"
      actions={
        <>
          <Button
            compact
            variant="orange"
            disabled={disabled || view.self.points < 20}
            onClick={() => {
              onBuySpecialCard();
              onClose();
            }}
          >
            {BUY_SPECIAL_LABEL}{' '}
            <CostDisplay
              cost={{ kind: 'points', amount: 20 }}
              signed="cost"
              className="text-inherit"
            />
          </Button>
          <TutorialCallout
            active={
              tutorialHighlight === 'shop-absorber' && selectedShopId === 'absorber'
            }
            arrow="top"
            highlightId="shop-absorber-buy"
          >
          <Button
            compact
            variant="orange"
            disabled={disabled || !canAffordSharedBuy(view, selectedShopId)}
            onClick={() => {
              onBuyCard(selectedShopId);
              onClose();
            }}
          >
            {CARD_BUY_LABEL}
          </Button>
          </TutorialCallout>
          <Button compact variant="red" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <section className={highlightUpgradePoint ? 'space-y-2 overflow-visible pt-12' : 'space-y-2'}>
        <h3 className="text-sm font-semibold text-ink">{SHOP_SECTION_UPGRADE_POINTS}</h3>
        <div ref={upgradePointRef} className="flex flex-wrap gap-2 overflow-visible">
          <TutorialCallout
            active={tutorialHighlight === 'shop-upgrade-point'}
            arrow="top"
            highlightId="shop-upgrade-point"
          >
          <Button
            compact
            variant="orange"
            disabled={disabled || view.self.points < buyUpgradeCost}
            onClick={() => {
              onBuyUpgradePoint();
              onClose();
            }}
          >
            {BUY_UPGRADE_POINT_LABEL}{' '}
            <CostDisplay
              cost={{ kind: 'points', amount: buyUpgradeCost }}
              signed="cost"
              className="text-inherit"
            />
          </Button>
          </TutorialCallout>
          <Button
            compact
            variant="green"
            disabled={disabled || view.self.upgradePoints < 1}
            onClick={() => {
              onSellUpgradePoint();
              onClose();
            }}
          >
            {SELL_UPGRADE_POINT_LABEL}{' '}
            <CostDisplay
              cost={{ kind: 'points', amount: sellUpgradeYield }}
              signed="gain"
              className="text-inherit"
            />
          </Button>
        </div>
      </section>

      <section className="mt-4">
        <h3 className="text-sm font-semibold text-ink">{SHOP_SECTION_CARDS}</h3>
        <p className="mt-1 flex flex-wrap items-center gap-1 text-sm text-ink-muted">
          <span>{SHOP_PRICE_BLURB}</span>
          {shopBlurbCost !== null ? <CostDisplay cost={shopBlurbCost} signed="cost" /> : null}
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {SHARED_CARD_IDS.map((id) => {
            const definition = getCard(id);
            const name = definition?.name ?? id;
            const shopCost = structuredCostFromCardCost(definition?.buyCost);
            const priceSpoken = costAriaLabel(shopCost, 'cost');
            const affordable = canAffordSharedBuy(view, id);
            const selected = buyCardId === id;
            const shopUpgraded = alwaysUpgradedIds.includes(id);
            const shopInstance = {
              instanceId: `shop-${id}`,
              cardId: id,
              isUpgraded: shopUpgraded,
            } as const;
            const tutorialAbsorber = tutorialHighlight === 'shop-absorber' && id === 'absorber';

            return (
              <li key={id}>
                <TutorialCallout
                  active={tutorialAbsorber}
                  arrow="top"
                  highlightId="shop-absorber"
                  className="w-full"
                >
                <button
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  aria-label={`${name}${shopUpgraded ? ' upgraded' : ''}, ${priceSpoken.length > 0 ? priceSpoken : 'no price'}${affordable ? '' : ', cannot afford'}`}
                  onClick={() => {
                    setBuyCardId(id);
                  }}
                  onDoubleClick={() => {
                    if (disabled || !affordable) {
                      return;
                    }
                    onBuyCard(id);
                    onClose();
                  }}
                  className={choiceTileClassName({
                    selected,
                    disabled,
                    faded: !affordable,
                  })}
                >
                  <Card
                    instance={shopInstance}
                    detail="thumb"
                    className="pointer-events-none w-full max-w-[5.5rem]"
                  />
                  <span className="mt-1 w-full truncate text-center text-xs font-semibold text-ink">
                    {name}
                    {shopUpgraded ? ' ↑' : ''}
                  </span>
                  <span
                    className={[
                      'mt-0.5 flex justify-center text-[11px] font-medium',
                      affordable ? 'text-ink' : 'text-ink-muted',
                    ].join(' ')}
                  >
                    {shopCost !== null ? <CostDisplay cost={shopCost} signed="cost" /> : '—'}
                  </span>
                </button>
                </TutorialCallout>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-4">
        <h3 className="text-sm font-semibold text-ink">
          {SHOP_SECTION_POOL} ({String(view.pool.length)})
        </h3>
        <p className="mt-1 text-sm text-ink-muted">
          Cards deactivated or dumped here are visible to every player. This is not a hand.
        </p>
        {view.pool.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">The pool is empty.</p>
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {view.pool.map((instance) => {
              const definition = getCard(instance.cardId);
              const name = formatCardLabel(instance.cardId, instance.isUpgraded);
              return (
                <li key={instance.instanceId}>
                  <div className="flex h-full w-full flex-col items-center rounded-[length:var(--radius-card)] border border-border-soft bg-surface p-1.5">
                    <Card
                      instance={instance}
                      detail="thumb"
                      className="pointer-events-none w-full max-w-[5.5rem]"
                    />
                    <span className="mt-1 w-full truncate text-center text-xs font-semibold text-ink">
                      {name}
                    </span>
                    {definition !== undefined && (
                      <span className="mt-0.5 text-center text-[11px] font-medium text-ink-muted">
                        {definition.type}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </Dialog>
  );
}
