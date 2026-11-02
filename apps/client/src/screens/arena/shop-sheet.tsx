/**
 * The Shop sheet — technical spec v7 §6.8 (tabs Cards / Special / Pool / Upgrade points,
 * select-then-Buy, the double-tap buy), §6.6.4 (an explicit button commits; selecting, opening
 * and long-pressing send nothing), §6.6.5 (a long-press opens the read-only card sheet), §13 Q50
 * (one client special price); Lot 74 plan Appendix A `shop-dialog`, `table-shop-double-click-buy`,
 * `economy-bar`, A.9.3 and A.9.4 (L74-14).
 *
 * It renders `shop(view, ctx)` and decides nothing (golden rule 8): every enabled state, reason
 * and price comes from the model. It does not render the tutorial `highlight` (L75).
 *
 * - **Cards.** One tile per shared card, a button around a decorative `Card size="tile"` at the
 *   kit's tier. A tap selects (Basic attack by default); the footer's Buy selected sends
 *   `buyCard`; a double tap on an affordable tile buys it at once. Long-press, or the Inspect
 *   button in the tile's price row, opens the read-only `{ kind: 'shop' }` card sheet. A
 *   browse-only Shop makes every tile `aria-disabled` (focusable, tap inert, long-press live); an
 *   unaffordable one stays selectable and dimmed, as in V2.
 * - **Footer per tab (designer 2026-11-02).** The open tab's buys, each disabled with its
 *   reason, then Close.
 * - **One buy per view.** Every buy goes through `commit` and one `useCommitOnce` control
 *   (`shop`): the Shop sends at most once until the next view or reject, and a buy that went out
 *   closes the sheet.
 *
 * The tab and the selection reset on every opening: a closed sheet stays mounted through its
 * exit and is reused on reopen (`arena-sheets.ts`).
 */

import { getCard, type CardInstance, type PlayingStateView, type SharedCardId } from '@card-battle/shared';
import { useState, type ReactElement, type ReactNode } from 'react';

import type { ActionRejectPayload } from '../../net/use-room-connection';
import { Card } from '../../ui/card/card';
import { CostAmount } from '../../ui/card/cost-amount';
import { Icon } from '../../ui/icons/icon';
import { useLongPress } from '../../ui/motion/use-long-press';
import { Button } from '../../ui/primitives/button';
import { CHROME_FOCUS_CLASS, ICON_WELL_CLASS } from '../../ui/primitives/chrome-classes';
import { IconButton } from '../../ui/primitives/icon-button';
import { Sheet } from '../../ui/primitives/sheet';
import { Tabs } from '../../ui/primitives/tabs';
import type { CostSign, StructuredCost } from '../../ui/structured-cost';
import { DISABLED_REASON_COPY, type ActionAvailability } from '../../view-model/action-reasons';
import {
  BUY_POOL_CARD_LABEL,
  BUY_SPECIAL_LABEL,
  BUY_UPGRADE_POINT_LABEL,
  CARD_BUY_LABEL,
  SELL_UPGRADE_POINT_LABEL,
  SHOP_ACTION_LABEL,
  SHOP_SECTION_UPGRADE_POINTS,
} from '../../view-model/chrome-labels';
import { SHOP_TAB_LABELS, type ShopCardTile, type ShopModel, type ShopTab } from '../../view-model/shop';
import { SHOP_PRICE_BLURB } from '../../view-model/table-copy';
import type { ArenaCommit, ArenaIntent } from './arena-commit';
import { arenaSheetKey } from './arena-sheets';
import type { CardSheetSource } from './card-sheet-source';
import {
  POOL_BLURB,
  POOL_EMPTY_COPY,
  SHOP_CLOSE_LABEL,
  poolHeading,
  shopInspectLabel,
  shopTileLabel,
} from './shop-sheet-model';
import { useCommitOnce } from './use-commit-once';

export interface ShopSheetProps {
  open: boolean;
  /** `shop(view, ctx)`, computed by ArenaScreen's host. */
  model: ShopModel;
  /** The reducer's `tab`, else `model.initialTab`; the sheet reopens on it. */
  initialTab: ShopTab;
  /** A new view or reject re-arms the one-buy latch (`useCommitOnce`). */
  view: PlayingStateView;
  actionReject: ActionRejectPayload | null;
  commit: ArenaCommit;
  onOpenCard: (source: CardSheetSource) => void;
  onClose: () => void;
}

const GRID_CLASS = 'grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-3';

interface BuyButtonProps {
  /** `data-shop-action`. */
  action: 'buy-card' | 'buy-special' | 'buy-pool' | 'buy-upgrade-point' | 'sell-upgrade-point';
  variant: 'primary' | 'secondary';
  /** The model's availability; `undefined` (no selected tile) renders disabled with no reason. */
  availability: ActionAvailability | undefined;
  onPress: () => void;
  children: ReactNode;
}

/** A footer buy: focusable while disabled, with the model's reason as visible text (§11, Q39). */
function BuyButton({ action, variant, availability, onPress, children }: BuyButtonProps): ReactElement {
  const reason = availability?.reason ?? null;
  return (
    <Button
      variant={variant}
      data-shop-action={action}
      focusableWhenDisabled
      disabled={availability?.enabled !== true}
      {...(reason !== null ? { disabledReason: DISABLED_REASON_COPY[reason] } : {})}
      onClick={onPress}
    >
      {children}
    </Button>
  );
}

/** A price in a `--bg-0` well on the CTA fill: the card sheet's `ActionCost` rule (DESIGN.md › Cost glyphs). */
function ShopCost({ amount, signed }: { amount: StructuredCost; signed: CostSign }): ReactElement {
  return (
    <span data-shop-cost="" className={`${ICON_WELL_CLASS} gap-0.5 px-2 py-0.5 text-v7-text`}>
      <CostAmount amount={amount} signed={signed} title={null} />
    </span>
  );
}

interface ShopTileProps {
  tile: ShopCardTile;
  selected: boolean;
  browseOnly: boolean;
  onSelect: (cardId: SharedCardId) => void;
  onBuy: (intent: ArenaIntent) => void;
  onOpenCard: (source: CardSheetSource) => void;
}

/**
 * A browse-only tile is `aria-disabled`, never natively disabled (review I1): it stays in the Tab
 * order with its name, its tap and double tap do nothing, and the press still reaches the
 * long-press wrapper in every engine. It keeps full colour, as the hand does off-turn.
 */
function ShopTile({ tile, selected, browseOnly, onSelect, onBuy, onOpenCard }: ShopTileProps): ReactElement {
  const inspect = (): void => {
    onOpenCard({ kind: 'shop', cardId: tile.cardId, isUpgraded: tile.instance.isUpgraded });
  };
  const longPress = useLongPress({ onLongPress: inspect });
  return (
    <li className="flex flex-col gap-1">
      <span {...longPress} className="block">
        <button
          type="button"
          data-shop-tile={tile.cardId}
          aria-pressed={selected}
          aria-label={shopTileLabel(tile)}
          {...(browseOnly ? { 'aria-disabled': true } : {})}
          onClick={() => {
            if (!browseOnly) onSelect(tile.cardId);
          }}
          onDoubleClick={() => {
            if (!browseOnly && tile.buy.enabled) onBuy({ kind: 'buyCard', payload: { cardId: tile.cardId } });
          }}
          className={`flex w-full touch-manipulation justify-center rounded-v7-chrome-sm p-1 select-none aria-disabled:cursor-not-allowed ${CHROME_FOCUS_CLASS}`}
        >
          <span aria-hidden="true" className="pointer-events-none">
            <Card size="tile" instance={tile.instance} selected={selected} unplayable={!tile.affordable} />
          </span>
        </button>
      </span>
      {/*
        The price row, under the card so nothing covers a chip (review I2). Inspect is a sibling of
        the tile, never inside it (no nested buttons); a long price wraps instead of overlapping.
        The price is aria-hidden: the tile's name already speaks it.
      */}
      <div className="flex flex-wrap items-center justify-between gap-1">
        <span data-shop-price={tile.cardId} aria-hidden="true" className="px-1 font-v7-display text-v7-body text-v7-text">
          {tile.cost === null ? '—' : <CostAmount amount={tile.cost} signed="cost" title={null} />}
        </span>
        <IconButton icon="help" aria-label={shopInspectLabel(tile)} aria-haspopup="dialog" onClick={inspect} />
      </div>
    </li>
  );
}

function PoolFace({ instance, onOpenCard }: { instance: CardInstance; onOpenCard: (source: CardSheetSource) => void }): ReactElement {
  const open = (): void => {
    onOpenCard({ kind: 'pool', instance });
  };
  const longPress = useLongPress({ onLongPress: open });
  const type = getCard(instance.cardId)?.type;
  return (
    <li className="flex flex-col items-center gap-1">
      <span {...longPress} className="inline-flex">
        <Card size="tile" instance={instance} onActivate={open} />
      </span>
      {type !== undefined ? <span className="text-v7-caption text-v7-text-2">{type}</span> : null}
    </li>
  );
}

export function ShopSheet({
  open,
  model,
  initialTab,
  view,
  actionReject,
  commit,
  onOpenCard,
  onClose,
}: ShopSheetProps): ReactElement {
  const [tab, setTab] = useState<ShopTab>(initialTab);
  const [selected, setSelected] = useState<SharedCardId>(model.cards.defaultSelectedCardId);
  // Per opening, not per mount: React's adjust-state-during-render pattern, as `card-sheet.tsx`.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTab(initialTab);
      setSelected(model.cards.defaultSelectedCardId);
    }
  }
  const once = useCommitOnce({ view, reject: actionReject });

  // One control for every Shop buy; one argument, never `commit(intent, undefined)` (A.9.3, D4).
  function buy(intent: ArenaIntent): void {
    if (
      once('shop', () => {
        commit(intent);
        return true;
      })
    ) {
      onClose();
    }
  }

  const selectedTile = model.cards.tiles.find((entry) => entry.cardId === selected);
  const { special, pool, upgradePoints } = model;

  function renderPanel(): ReactElement {
    switch (tab) {
      case 'cards':
        return (
          <div className="flex flex-col gap-3">
            <p className="flex flex-wrap items-center gap-1 text-v7-body text-v7-text-2">
              <span>{SHOP_PRICE_BLURB}</span>
              {selectedTile !== undefined && selectedTile.cost !== null ? (
                <CostAmount amount={selectedTile.cost} signed="cost" />
              ) : null}
            </p>
            <ul data-shop-grid="cards" className={GRID_CLASS}>
              {model.cards.tiles.map((tile) => (
                <ShopTile
                  key={tile.cardId}
                  tile={tile}
                  selected={tile.cardId === selected}
                  browseOnly={model.browseOnly}
                  onSelect={setSelected}
                  onBuy={buy}
                  onOpenCard={onOpenCard}
                />
              ))}
            </ul>
          </div>
        );
      case 'special':
        return (
          <div className="flex justify-center py-2">
            <span aria-hidden="true">
              <Card size="tile" face="hidden" family="special" />
            </span>
          </div>
        );
      case 'pool':
        return (
          <div className="flex flex-col gap-2">
            <p className="font-v7-display text-v7-body text-v7-text">{poolHeading(pool.cards.length)}</p>
            <p className="text-v7-body text-v7-text-2">{POOL_BLURB}</p>
            {pool.cards.length === 0 ? (
              <p className="text-v7-body text-v7-text-2">{POOL_EMPTY_COPY}</p>
            ) : (
              <ul data-shop-grid="pool" className={GRID_CLASS}>
                {pool.cards.map((instance) => (
                  <PoolFace key={instance.instanceId} instance={instance} onOpenCard={onOpenCard} />
                ))}
              </ul>
            )}
          </div>
        );
      case 'upgrade-points':
        // The heading and its icon, never the balance (designer 2026-09-15).
        return (
          <p className="inline-flex items-center gap-2 font-v7-display text-v7-body text-v7-text">
            <Icon name="upgrade" size={24} />
            {SHOP_SECTION_UPGRADE_POINTS}
          </p>
        );
      default: {
        const _exhaustive: never = tab;
        return _exhaustive;
      }
    }
  }

  function renderBuys(): ReactElement {
    switch (tab) {
      case 'cards':
        return (
          <BuyButton
            action="buy-card"
            variant="primary"
            availability={selectedTile?.buy}
            onPress={() => {
              buy({ kind: 'buyCard', payload: { cardId: selected } });
            }}
          >
            {CARD_BUY_LABEL}
          </BuyButton>
        );
      case 'special':
        return (
          <BuyButton
            action="buy-special"
            variant="primary"
            availability={special.buy}
            onPress={() => {
              buy({ kind: 'buySpecialCard' });
            }}
          >
            {BUY_SPECIAL_LABEL}{' '}
            <ShopCost amount={special.cost} signed="cost" />
          </BuyButton>
        );
      case 'pool':
        return (
          <BuyButton
            action="buy-pool"
            variant="primary"
            availability={pool.buy}
            onPress={() => {
              buy({ kind: 'buyPoolCard' });
            }}
          >
            {BUY_POOL_CARD_LABEL}{' '}
            <ShopCost amount={pool.cost} signed="cost" />
          </BuyButton>
        );
      case 'upgrade-points':
        return (
          <>
            <BuyButton
              action="buy-upgrade-point"
              variant="primary"
              availability={upgradePoints.buy}
              onPress={() => {
                buy({ kind: 'buyUpgradePoint' });
              }}
            >
              {BUY_UPGRADE_POINT_LABEL}{' '}
              <span className="inline-flex items-center gap-1">
                <ShopCost amount={{ kind: 'points', amount: upgradePoints.buyCostPoints }} signed="cost" />
                <ShopCost amount={{ kind: 'upgradePoint', amount: 1 }} signed="gain" />
              </span>
            </BuyButton>
            <BuyButton
              action="sell-upgrade-point"
              variant="secondary"
              availability={upgradePoints.sell}
              onPress={() => {
                buy({ kind: 'sellUpgradePoint' });
              }}
            >
              {SELL_UPGRADE_POINT_LABEL}{' '}
              <span className="inline-flex items-center gap-1">
                <ShopCost amount={{ kind: 'points', amount: upgradePoints.sellYieldPoints }} signed="gain" />
                <ShopCost amount={{ kind: 'upgradePoint', amount: 1 }} signed="cost" />
              </span>
            </BuyButton>
          </>
        );
      default: {
        const _exhaustive: never = tab;
        return _exhaustive;
      }
    }
  }

  return (
    <Sheet
      open={open}
      mode="read-only"
      placement="bottom"
      height="full"
      title={SHOP_ACTION_LABEL}
      onClose={onClose}
      dataAttributes={{ 'data-arena-sheet': arenaSheetKey({ kind: 'shop' }) }}
      actions={
        <div className="flex flex-wrap items-start gap-2">
          {renderBuys()}
          <Button variant="quiet" onClick={onClose}>
            {SHOP_CLOSE_LABEL}
          </Button>
        </div>
      }
    >
      <Tabs
        label={SHOP_ACTION_LABEL}
        tabs={model.tabs.map((id) => ({ id, label: SHOP_TAB_LABELS[id] }))}
        selectedId={tab}
        onSelect={setTab}
      >
        {renderPanel()}
      </Tabs>
    </Sheet>
  );
}
