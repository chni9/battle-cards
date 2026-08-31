/**
 * Card-first Table dialogs — L12-08 / technical spec v2 §6.1.
 * Same intent payloads as V1.
 */

import {
  ATTACK_CARD_IDS,
  SHARED_CARD_IDS,
  formatCardLabel,
  getCard,
  type CardInstance,
  type PlayingStateView,
  type PublicPlayerView,
} from '@card-battle/shared';
import { motion, useReducedMotion } from 'motion/react';
import { useState, type ReactElement } from 'react';

import { Button } from '../../design/components/button';
import { Card } from '../../design/components/card';
import { CardChoiceTile } from '../../design/components/card-choice-tile';
import { choiceTileClassName } from '../../design/components/choice-tile-chrome';
import { CostDisplay } from '../../design/components/cost-display';
import {
  structuredCostFromCardCost,
  structuredPlayCost,
  type StructuredCost,
} from '../../design/components/structured-cost';
import { Dialog } from '../../design/components/dialog';
import { SeatTile } from '../../design/components/seat-tile';
import { MOTION_DURATION_S, MOTION_EASE, MOTION_STAGGER_S } from '../../fx/motion-timing';
import type { PlayCardOptions } from '../../net/use-room-connection';
import { CARD_SELL_LABEL, CARD_UPGRADE_LABEL } from './chrome-labels';
import { CardEffectCopy } from '../../design/components/card-effect-copy';
import { visibleKitId } from './table-helpers';
import { TutorialCallout } from './tutorial-callout';

const REGEN_QUANTITIES = [1, 2, 3, 4] as const;

function regenerationQuantityLabel(lives: (typeof REGEN_QUANTITIES)[number]): string {
  return lives === 1 ? '1 life' : `${String(lives)} lives`;
}

function regenerationTotalCost(
  instance: CardInstance,
  lives: (typeof REGEN_QUANTITIES)[number],
): StructuredCost | null {
  const definition = getCard('regeneration') ?? getCard(instance.cardId);
  if (definition === undefined) {
    return null;
  }
  const playCost = structuredPlayCost(definition, instance.isUpgraded);
  if (playCost?.kind !== 'pointsPerLife') {
    return null;
  }
  return { kind: 'points', amount: playCost.amount * lives };
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
  | { kind: 'consume'; instance: CardInstance }
  | { kind: 'multi' }
  | { kind: 'shop' }
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
  /** Called when Use needs target or quantity — parent already set dialog via setDialog. */
  onBeginUse: (instance: CardInstance) => void;
  /** Tutorial spotlight on Use / Upgrade / Sell (L45-05). */
  tutorialAction?: 'use' | 'upgrade' | 'sell';
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
    onBeginUse,
    tutorialAction,
  } = props;

  const [targetId, setTargetId] = useState('');
  const [consumeInstanceId, setConsumeInstanceId] = useState('');
  const [multiIds, setMultiIds] = useState<string[]>([]);
  const [multiTargets, setMultiTargets] = useState<Record<string, string>>({});

  const close = (): void => {
    setConsumeInstanceId('');
    setDialog(null);
  };

  const aliveOpponents = opponents.filter((player) => !player.isEliminated);
  const absorberOpponents = opponents.filter(
    (player) => !player.isEliminated || player.absorbWindowOpen,
  );
  const defaultTarget = aliveOpponents[0]?.id ?? '';

  const transformableHand = view.self.hand.filter((card) =>
    (SHARED_CARD_IDS as readonly string[]).includes(card.cardId),
  );
  const consumeDefault = transformableHand[0]?.instanceId ?? '';
  const resolvedConsumeId = transformableHand.some(
    (card) => card.instanceId === consumeInstanceId,
  )
    ? consumeInstanceId
    : consumeDefault;

  const targetDialogOpponents =
    dialog?.kind === 'target' && dialog.instance.cardId === 'absorber'
      ? absorberOpponents
      : aliveOpponents;
  const targetDialogDefault = targetDialogOpponents[0]?.id ?? '';
  const resolvedTarget = targetDialogOpponents.some((p) => p.id === targetId)
    ? targetId
    : targetDialogDefault;

  const actionsOpen = dialog?.kind === 'actions';
  const actionInstance = dialog?.kind === 'actions' ? dialog.instance : null;
  const actionDefinition =
    actionInstance !== null ? getCard(actionInstance.cardId) : undefined;
  const fromSpecial = dialog?.kind === 'actions' ? dialog.fromSpecial : false;
  const actionPlayCost =
    actionInstance !== null && actionDefinition !== undefined
      ? structuredPlayCost(actionDefinition, actionInstance.isUpgraded)
      : null;
  const actionSellCost =
    actionDefinition !== undefined
      ? structuredCostFromCardCost(actionDefinition.sellYield)
      : null;
  const reduceMotion = useReducedMotion();
  const transformerUseBlocked =
    actionInstance?.cardId === 'card-transformer' && transformableHand.length === 0;
  const inspectInstance = dialog?.kind === 'inspect' ? dialog.instance : null;
  const inspectDefinition =
    inspectInstance !== null ? getCard(inspectInstance.cardId) : undefined;

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
              <TutorialCallout
                active={tutorialAction === 'use'}
                arrow="top"
                highlightId="use"
              >
              <Button
                compact
                variant="purple"
                disabled={!isMyTurn || actionsLocked || transformerUseBlocked}
                onClick={() => {
                  onBeginUse(actionInstance);
                }}
              >
                {actionPlayCost !== null ? (
                  <>
                    Use{' '}
                    <CostDisplay
                      cost={actionPlayCost}
                      signed="cost"
                      className="text-inherit"
                    />
                  </>
                ) : (
                  'Use'
                )}
              </Button>
              </TutorialCallout>
              {!actionInstance.isUpgraded && (
                <TutorialCallout
                  active={tutorialAction === 'upgrade'}
                  arrow="top"
                  highlightId="upgrade"
                >
                <Button
                  compact
                  variant="orange"
                  disabled={!isMyTurn || actionsLocked || view.self.upgradePoints < 1}
                  onClick={() => {
                    onUpgradeCard(actionInstance.instanceId);
                    close();
                  }}
                >
                  {CARD_UPGRADE_LABEL}{' '}
                  <CostDisplay
                    cost={{ kind: 'upgradePoint', amount: 1 }}
                    signed="cost"
                    className="text-inherit"
                  />
                </Button>
                </TutorialCallout>
              )}
              {!fromSpecial && (
                <TutorialCallout
                  active={tutorialAction === 'sell'}
                  arrow="top"
                  highlightId="sell"
                >
                <Button
                  compact
                  variant="green"
                  disabled={!isMyTurn || actionsLocked}
                  onClick={() => {
                    onSellCard(actionInstance.instanceId);
                    close();
                  }}
                >
                  {CARD_SELL_LABEL}
                  {actionSellCost !== null ? (
                    <>
                      {' '}
                      <CostDisplay
                        cost={actionSellCost}
                        signed="gain"
                        className="text-inherit"
                      />
                    </>
                  ) : null}
                </Button>
                </TutorialCallout>
              )}
              {allowsMultiAttack &&
                (ATTACK_CARD_IDS as readonly string[]).includes(actionInstance.cardId) && (
                  <Button
                    compact
                    variant="purple"
                    disabled={!isMyTurn || actionsLocked}
                    onClick={() => {
                      setDialog({ kind: 'multi' });
                    }}
                  >
                    Multi-attack
                  </Button>
                )}
              <Button compact variant="red" onClick={close}>
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
              {actionDefinition !== undefined ? (
                <CardEffectCopy
                  card={actionDefinition}
                  isUpgraded={actionInstance.isUpgraded}
                />
              ) : null}
              {!isMyTurn || actionsLocked ? (
                <p className="text-sm text-ink-muted">
                  Actions locked — you can still read the card.
                </p>
              ) : null}
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
          <Button compact variant="green" onClick={close}>
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
              {inspectDefinition !== undefined && inspectInstance !== null ? (
                <CardEffectCopy
                  card={inspectDefinition}
                  isUpgraded={inspectInstance.isUpgraded}
                />
              ) : null}
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
                compact
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
              <Button compact variant="red" onClick={close}>
                Cancel
              </Button>
            </>
          ) : undefined
        }
      >
        <ul className="grid grid-cols-2 gap-3 p-2 sm:grid-cols-3">
          {targetDialogOpponents.map((player) => (
            <li key={player.id}>
              <SeatTile
                view={view}
                playerId={player.id}
                nickname={player.nickname}
                kitId={visibleKitId(player)}
                selected={resolvedTarget === player.id}
                onSelect={() => {
                  setTargetId(player.id);
                }}
              />
            </li>
          ))}
        </ul>
      </Dialog>

      <Dialog
        open={dialog?.kind === 'consume'}
        title="Choose a card to transform"
        onClose={close}
        actions={
          dialog?.kind === 'consume' ? (
            <>
              <Button
                compact
                variant="purple"
                disabled={resolvedConsumeId === ''}
                onClick={() => {
                  if (resolvedConsumeId === '') {
                    return;
                  }
                  onPlayCard(dialog.instance.instanceId, {
                    consumeInstanceId: resolvedConsumeId,
                  });
                  close();
                }}
              >
                Transform
              </Button>
              <Button compact variant="red" onClick={close}>
                Cancel
              </Button>
            </>
          ) : undefined
        }
      >
        {transformableHand.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No action or attack card in hand to transform.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {transformableHand.map((card) => {
              const selected = resolvedConsumeId === card.instanceId;
              const name = formatCardLabel(card.cardId, card.isUpgraded);
              return (
                <li key={card.instanceId}>
                  <CardChoiceTile
                    instance={card}
                    caption={name}
                    selected={selected}
                    ariaLabel={name}
                    onSelect={() => {
                      setConsumeInstanceId(card.instanceId);
                    }}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </Dialog>

      <Dialog
        open={dialog?.kind === 'quantity'}
        title="Regeneration quantity"
        onClose={close}
        actions={
          dialog?.kind === 'quantity' ? (
            <Button compact variant="red" onClick={close}>
              Cancel
            </Button>
          ) : undefined
        }
      >
        {dialog?.kind === 'quantity' ? (
          <ul className="grid grid-cols-2 gap-2">
            {REGEN_QUANTITIES.map((lives) => {
              const label = regenerationQuantityLabel(lives);
              const cost = regenerationTotalCost(dialog.instance, lives);
              return (
                <li key={lives}>
                  <button
                    type="button"
                    aria-label={label}
                    onClick={() => {
                      onPlayCard(dialog.instance.instanceId, { quantity: lives });
                      close();
                    }}
                    className={choiceTileClassName({ selected: false })}
                  >
                    <span className="text-sm font-semibold text-ink">{label}</span>
                    {cost !== null ? <CostDisplay cost={cost} signed="cost" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </Dialog>

      <Dialog
        open={dialog?.kind === 'multi'}
        title="Assassin multi-attack"
        onClose={close}
        actions={
          <>
            <Button
              compact
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
            <Button compact variant="red" onClick={close}>
              Cancel
            </Button>
          </>
        }
      >
        <p className="mb-2 text-sm text-ink-muted">
          Select at least two attack cards and a target each.
        </p>
        <ul className="space-y-3">
          {attackCards.map((card, index) => {
            const checked = multiIds.includes(card.instanceId);
            const rowTarget = multiTargets[card.instanceId] ?? resolvedTarget;
            const name = formatCardLabel(card.cardId, card.isUpgraded);
            return (
              <motion.li
                key={card.instanceId}
                className="flex flex-col gap-2 sm:flex-row sm:items-start"
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
                <div className="w-full max-w-[7.5rem]">
                  <CardChoiceTile
                    instance={card}
                    caption={name}
                    selected={checked}
                    ariaLabel={name}
                    onSelect={() => {
                      if (checked) {
                        setMultiIds(multiIds.filter((id) => id !== card.instanceId));
                        return;
                      }
                      setMultiIds([...multiIds, card.instanceId]);
                      setMultiTargets({
                        ...multiTargets,
                        [card.instanceId]: rowTarget !== '' ? rowTarget : defaultTarget,
                      });
                    }}
                  />
                </div>
                {checked ? (
                  <ul className="grid min-w-0 flex-1 grid-cols-2 gap-3 p-2">
                    {aliveOpponents.map((player) => (
                      <li key={player.id}>
                        <SeatTile
                          view={view}
                          playerId={player.id}
                          nickname={player.nickname}
                          kitId={visibleKitId(player)}
                          selected={rowTarget === player.id}
                          onSelect={() => {
                            setMultiTargets({
                              ...multiTargets,
                              [card.instanceId]: player.id,
                            });
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </motion.li>
            );
          })}
        </ul>
      </Dialog>
    </>
  );
}
