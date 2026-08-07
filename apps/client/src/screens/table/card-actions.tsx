/**
 * Card-first Table dialogs — L12-08 / technical spec v2 §6.1.
 * Same intent payloads as V1.
 */

import {
  ATTACK_CARD_IDS,
  SHARED_CARD_IDS,
  formatCardCost,
  formatCardLabel,
  formatPlayCost,
  getCard,
  getKit,
  type CardCost,
  type CardInstance,
  type PlayingStateView,
  type PublicPlayerView,
} from '@card-battle/shared';
import { motion, useReducedMotion } from 'motion/react';
import { useState, type ReactElement } from 'react';

import { Button } from '../../design/components/button';
import { Card } from '../../design/components/card';
import { Dialog } from '../../design/components/dialog';
import { MOTION_DURATION_S, MOTION_EASE, MOTION_STAGGER_S } from '../../fx/motion-timing';
import type { PlayCardOptions } from '../../net/use-room-connection';
import { cardEffectText } from './table-helpers';

function formatShopCost(cost: CardCost | undefined): string {
  if (cost === undefined) {
    return '—';
  }

  const formatted = formatCardCost(cost);
  return formatted.length > 0 ? formatted : '—';
}

function playCostLabel(instance: CardInstance): string {
  const definition = getCard(instance.cardId);
  if (definition === undefined) {
    return '';
  }

  return formatPlayCost(definition, instance.isUpgraded);
}

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
export type TableDialog =
  | { kind: 'actions'; instance: CardInstance; fromSpecial: boolean }
  | {
      kind: 'inspect';
      instance: CardInstance;
      activated?: boolean;
      counter?: number | null;
      source: 'spy' | 'active';
    }
  | { kind: 'target'; instance: CardInstance }
  | { kind: 'quantity'; instance: CardInstance }
  | { kind: 'multi' }
  | { kind: 'buy' }
  | { kind: 'pool' }
  | null;

export interface CardActionsProps {
  view: PlayingStateView;
  opponents: readonly PublicPlayerView[];
  dialog: TableDialog;
  setDialog: (next: TableDialog) => void;
  isMyTurn: boolean;
  actionsLocked: boolean;
  allowsMultiAttack: boolean;
  attackCards: readonly CardInstance[];
  onPlayCard: (instanceId: string, options?: PlayCardOptions) => void;
  onPlayMultipleAttacks: (
    attacks: readonly { instanceId: string; targetPlayerId: string }[],
  ) => void;
  onUpgradeCard: (instanceId: string) => void;
  onSellCard: (instanceId: string) => void;
  onBuyCard: (cardId: (typeof SHARED_CARD_IDS)[number]) => void;
  onBuySpecialCard: () => void;
  /** Called when Use needs target or quantity — parent already set dialog via setDialog. */
  onBeginUse: (instance: CardInstance) => void;
}

export function CardActions(props: CardActionsProps): ReactElement {
  const {
    view,
    opponents,
    dialog,
    setDialog,
    isMyTurn,
    actionsLocked,
    allowsMultiAttack,
    attackCards,
    onPlayCard,
    onPlayMultipleAttacks,
    onUpgradeCard,
    onSellCard,
    onBuyCard,
    onBuySpecialCard,
    onBeginUse,
  } = props;

  const close = (): void => {
    setQuantityText('1');
    setDialog(null);
  };

  const aliveOpponents = opponents.filter((player) => !player.isEliminated);
  const defaultTarget = aliveOpponents[0]?.id ?? '';

  const [targetId, setTargetId] = useState('');
  const [quantityText, setQuantityText] = useState('1');
  const [buyCardId, setBuyCardId] = useState<string>(SHARED_CARD_IDS[0]);
  const [multiIds, setMultiIds] = useState<string[]>([]);
  const [multiTargets, setMultiTargets] = useState<Record<string, string>>({});

  const resolvedTarget = aliveOpponents.some((p) => p.id === targetId)
    ? targetId
    : defaultTarget;

  const quantityTrimmed = quantityText.trim();
  const quantityParsed = Number(quantityTrimmed);
  const quantityValid =
    quantityTrimmed !== '' &&
    Number.isInteger(quantityParsed) &&
    quantityParsed >= 1 &&
    quantityParsed <= 4;

  const actionsOpen = dialog?.kind === 'actions';
  const actionInstance = dialog?.kind === 'actions' ? dialog.instance : null;
  const fromSpecial = dialog?.kind === 'actions' ? dialog.fromSpecial : false;
  const actionEffect =
    actionInstance !== null ? cardEffectText(actionInstance) : '';
  const actionPlayCost =
    actionInstance !== null ? playCostLabel(actionInstance) : '';
  const inspectEffect =
    dialog?.kind === 'inspect' ? cardEffectText(dialog.instance) : '';
  const reduceMotion = useReducedMotion();
  const alwaysUpgradedIds = getKit(view.self.kitId).traits.alwaysUpgraded;

  return (
    <>
      <Dialog
        open={actionsOpen}
        title={
          actionInstance !== null
            ? (getCard(actionInstance.cardId)?.name ?? 'Card')
            : 'Card'
        }
        onClose={close}
        actions={
          actionInstance !== null ? (
            <>
              <Button
                variant="purple"
                disabled={!isMyTurn || actionsLocked}
                onClick={() => {
                  onBeginUse(actionInstance);
                }}
              >
                {actionPlayCost.length > 0 ? `Use (${actionPlayCost})` : 'Use'}
              </Button>
              {!actionInstance.isUpgraded && (
                <Button
                  variant="orange"
                  disabled={!isMyTurn || actionsLocked || view.self.upgradePoints < 1}
                  onClick={() => {
                    onUpgradeCard(actionInstance.instanceId);
                    close();
                  }}
                >
                  Upgrade
                </Button>
              )}
              {!fromSpecial && (
                <Button
                  variant="orange"
                  disabled={!isMyTurn || actionsLocked}
                  onClick={() => {
                    onSellCard(actionInstance.instanceId);
                    close();
                  }}
                >
                  Sell
                </Button>
              )}
              {allowsMultiAttack &&
                (ATTACK_CARD_IDS as readonly string[]).includes(actionInstance.cardId) && (
                  <Button
                    variant="purple"
                    disabled={!isMyTurn || actionsLocked}
                    onClick={() => {
                      setDialog({ kind: 'multi' });
                    }}
                  >
                    Multi-attack
                  </Button>
                )}
              <Button variant="red" onClick={close}>
                Cancel
              </Button>
            </>
          ) : undefined
        }
      >
        {actionInstance !== null && (
          <div className="flex gap-3">
            <Card instance={actionInstance} detail="face" className="w-24 shrink-0" />
            <div className="min-w-0 space-y-2">
              {actionEffect.length > 0 && (
                <p className="whitespace-pre-line text-sm leading-snug text-ink">
                  {actionEffect}
                </p>
              )}
              <p className="text-sm text-ink-muted">
                {!isMyTurn || actionsLocked
                  ? 'Actions locked — you can still read the card.'
                  : 'Choose Use, Upgrade, or Sell.'}
              </p>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        open={dialog?.kind === 'inspect'}
        title={
          dialog?.kind === 'inspect'
            ? (getCard(dialog.instance.cardId)?.name ?? 'Card')
            : 'Inspect'
        }
        onClose={close}
        actions={
          <Button variant="green" onClick={close}>
            Close
          </Button>
        }
      >
        {dialog?.kind === 'inspect' && (
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start">
            <Card
              instance={dialog.instance}
              detail="face"
              activated={dialog.activated === true}
              className="w-28 shrink-0"
            />
            <div className="min-w-0 space-y-2 text-center sm:text-left">
              {inspectEffect.length > 0 && (
                <p className="whitespace-pre-line text-sm leading-snug text-ink">
                  {inspectEffect}
                </p>
              )}
              {dialog.source === 'active' ? (
                <>
                  <p className="text-sm font-semibold text-ink">Active</p>
                  {dialog.counter !== undefined && dialog.counter !== null && (
                    <p className="text-sm text-ink-muted">
                      Counter: {String(dialog.counter)}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-ink-muted">Spy reveal — inspect only</p>
              )}
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        open={dialog?.kind === 'target'}
        title="Choose target"
        onClose={close}
        actions={
          dialog?.kind === 'target' ? (
            <>
              <Button
                variant="purple"
                disabled={resolvedTarget === ''}
                onClick={() => {
                  onPlayCard(dialog.instance.instanceId, {
                    targetPlayerId: resolvedTarget,
                  });
                  close();
                }}
              >
                Confirm
              </Button>
              <Button variant="red" onClick={close}>
                Cancel
              </Button>
            </>
          ) : undefined
        }
      >
        <ul className="space-y-2">
          {aliveOpponents.map((player) => (
            <li key={player.id}>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="card-target"
                  checked={resolvedTarget === player.id}
                  onChange={() => {
                    setTargetId(player.id);
                  }}
                />
                {player.nickname}
              </label>
            </li>
          ))}
        </ul>
      </Dialog>

      <Dialog
        open={dialog?.kind === 'quantity'}
        title="Regeneration quantity"
        onClose={close}
        actions={
          dialog?.kind === 'quantity' ? (
            <>
              <Button
                variant="purple"
                disabled={!quantityValid}
                onClick={() => {
                  if (!quantityValid) {
                    return;
                  }
                  onPlayCard(dialog.instance.instanceId, {
                    quantity: quantityParsed,
                  });
                  close();
                }}
              >
                Confirm
              </Button>
              <Button variant="red" onClick={close}>
                Cancel
              </Button>
            </>
          ) : undefined
        }
      >
        <label className="block text-sm text-ink">
          Lives (1–4)
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={quantityText}
            onChange={(event) => {
              setQuantityText(event.target.value);
            }}
            className="mt-2 block w-full max-w-[8rem] rounded-[length:var(--radius-control)] border border-border bg-surface px-3 py-2 text-base tabular-nums text-ink"
            aria-invalid={!quantityValid}
            aria-describedby="regen-quantity-hint"
          />
        </label>
        <p
          id="regen-quantity-hint"
          className={[
            'mt-2 text-xs',
            quantityValid ? 'text-ink-muted' : 'text-cta-red',
          ].join(' ')}
        >
          {quantityValid
            ? 'Enter how many lives to buy.'
            : 'Enter a whole number from 1 to 4 to confirm.'}
        </p>
      </Dialog>

      <Dialog
        open={dialog?.kind === 'multi'}
        title="Assassin multi-attack"
        onClose={close}
        actions={
          <>
            <Button
              variant="purple"
              disabled={
                multiIds.length < 2 ||
                multiIds.some((id) => {
                  const t = multiTargets[id];
                  return t === undefined || t === '';
                })
              }
              onClick={() => {
                const attacks = multiIds.flatMap((instanceId) => {
                  const targetPlayerId = multiTargets[instanceId];
                  if (targetPlayerId === undefined || targetPlayerId === '') {
                    return [];
                  }
                  return [{ instanceId, targetPlayerId }];
                });
                if (attacks.length !== multiIds.length || attacks.length < 2) {
                  return;
                }
                onPlayMultipleAttacks(attacks);
                setMultiIds([]);
                setMultiTargets({});
                close();
              }}
            >
              Play {multiIds.length} attacks
            </Button>
            <Button variant="red" onClick={close}>
              Cancel
            </Button>
          </>
        }
      >
        <p className="mb-2 text-sm text-ink-muted">
          Select at least two attack cards and a target each.
        </p>
        <ul className="space-y-2">
          {attackCards.map((card, index) => {
            const checked = multiIds.includes(card.instanceId);
            const rowTarget = multiTargets[card.instanceId] ?? resolvedTarget;
            return (
              <motion.li
                key={card.instanceId}
                className="flex flex-wrap items-center gap-2"
                initial={
                  reduceMotion === true || dialog?.kind !== 'multi'
                    ? false
                    : { opacity: 0, y: 6 }
                }
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: MOTION_DURATION_S,
                  delay: reduceMotion === true ? 0 : index * MOTION_STAGGER_S,
                  ease: MOTION_EASE,
                }}
              >
                <label className="text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setMultiIds([...multiIds, card.instanceId]);
                        setMultiTargets({
                          ...multiTargets,
                          [card.instanceId]:
                            rowTarget !== '' ? rowTarget : defaultTarget,
                        });
                      } else {
                        setMultiIds(multiIds.filter((id) => id !== card.instanceId));
                      }
                    }}
                  />{' '}
                  {card.cardId}
                  {card.isUpgraded ? ' ↑' : ''}
                </label>
                {checked && (
                  <select
                    value={rowTarget}
                    onChange={(event) => {
                      setMultiTargets({
                        ...multiTargets,
                        [card.instanceId]: event.target.value,
                      });
                    }}
                    className="rounded-[length:var(--radius-control)] border border-border px-2 py-1 text-sm"
                  >
                    {aliveOpponents.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.nickname}
                      </option>
                    ))}
                  </select>
                )}
              </motion.li>
            );
          })}
        </ul>
      </Dialog>

      <Dialog
        open={dialog?.kind === 'buy'}
        title="Buy a card"
        onClose={close}
        panelClassName="max-w-3xl"
        actions={
          <>
            <Button
              variant="orange"
              disabled={!isMyTurn || actionsLocked || view.self.points < 20}
              onClick={() => {
                onBuySpecialCard();
                close();
              }}
            >
              Buy special (20 pts)
            </Button>
            <Button
              variant="orange"
              disabled={
                !isMyTurn ||
                actionsLocked ||
                !canAffordSharedBuy(view, buyCardId as (typeof SHARED_CARD_IDS)[number])
              }
              onClick={() => {
                onBuyCard(buyCardId as (typeof SHARED_CARD_IDS)[number]);
                close();
              }}
            >
              Buy selected
            </Button>
            <Button variant="red" onClick={close}>
              Cancel
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          Choose a shared card from the shop. Prices are double the base play cost.
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {SHARED_CARD_IDS.map((id) => {
            const definition = getCard(id);
            const name = definition?.name ?? id;
            const price = formatShopCost(definition?.buyCost);
            const affordable = canAffordSharedBuy(view, id);
            const selected = buyCardId === id;
            const shopUpgraded = alwaysUpgradedIds.includes(id);
            const shopInstance = {
              instanceId: `shop-${id}`,
              cardId: id,
              isUpgraded: shopUpgraded,
            } as const;

            return (
              <li key={id}>
                <button
                  type="button"
                  disabled={!isMyTurn || actionsLocked}
                  aria-pressed={selected}
                  aria-label={`${name}${shopUpgraded ? ' upgraded' : ''}, ${price}${affordable ? '' : ', cannot afford'}`}
                  onClick={() => {
                    setBuyCardId(id);
                  }}
                  onDoubleClick={() => {
                    if (!isMyTurn || actionsLocked || !affordable) {
                      return;
                    }
                    onBuyCard(id);
                    close();
                  }}
                  className={[
                    'flex h-full w-full flex-col items-center rounded-[length:var(--radius-card)] border p-1.5 text-left transition',
                    selected
                      ? 'border-cta-orange bg-surface ring-2 ring-cta-orange/40'
                      : 'border-border-soft bg-surface hover:border-border',
                    !affordable ? 'opacity-55' : '',
                    (!isMyTurn || actionsLocked) && 'cursor-not-allowed',
                  ].join(' ')}
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
                      'mt-0.5 text-center text-[11px] font-medium',
                      affordable ? 'text-ink' : 'text-ink-muted',
                    ].join(' ')}
                  >
                    {price}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Dialog>

      <Dialog
        open={dialog?.kind === 'pool'}
        title={`Shared pool (${String(view.pool.length)})`}
        onClose={close}
        panelClassName="max-w-3xl"
        actions={
          <Button variant="green" onClick={close}>
            Close
          </Button>
        }
      >
        <p className="text-sm text-ink-muted">
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
      </Dialog>
    </>
  );
}
