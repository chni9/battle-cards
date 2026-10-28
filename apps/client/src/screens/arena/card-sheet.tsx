/**
 * Read-only card sheet — technical spec v7 §6.6.1 (the face at sheet size, then the Cost row, the
 * effect and the Upgrade block), §5.4 (the card face), §6.7 (read-only sheets stack); Lot 74 plan
 * A.8 ruling 1 (the activated look is the counter glow; Shield and Sentence never get it); L56-05
 * (a queue or log card shows the catalog face with no footer).
 *
 * Every source shows the same body. L74-08 adds the action row (§6.6.1, §6.6.2, §11 Q39): Use,
 * Upgrade and Sell in model order, each disabled with its own reason, and every commit through
 * `commit` (`arena-commit.ts`). Without `commit` the sheet is a pure inspect with no action row.
 * Opening or closing the sheet sends nothing (§6.6.4). A held card that left the hand while the
 * sheet is open turns it read-only (`liveCardRefFor`, Review Focus 1), and a sheet commits at most
 * once per view (Review Focus 3).
 *
 * L74-09 adds the in-play Deactivate (§6.6.1, §11 Q40; Appendix A `deactivate-confirm-dialog`,
 * `table-deactivate-confirm-escape-layer`): `danger`, behind the Lot 69 confirm. The confirm is a
 * `Dialog` stacked over the sheet, so the sheet stack hands Esc to it alone (Q49) and one Esc
 * leaves the card sheet open; only the confirm's Deactivate sends `deactivatePersistent`.
 *
 * L74-10 adds the pre-send choices (§6.6.2; Appendix A `regeneration-quantity-picker`,
 * `card-transformer-consume-picker`): Regeneration tiles ('1 life' preselected, the checked tile
 * takes initial focus) and Card Transformer consume tiles (the first preselected) only select, and
 * Use then sends `quantity` / `consumeInstanceId`. The pick resets on every opening. The arena
 * passes `collapsed` / `collapsedBar` while the card is targeted (§6.6.2, `targeting.tsx`).
 *
 * L74-11 adds the Assassin multi-attack (§6.6.1, §6.6.2, §13 Q44; Appendix A `assassin-multi-attack`):
 * the model's Multi-attack entry turns the sheet into a step (title, body and actions), not a fourth
 * sheet kind. Cancel returns to the card; the selection resets on every opening, so Esc or the
 * backdrop then reopen on the card step with nothing selected. Play commits one
 * `playMultipleAttacks` through `send` and picking a seat sends nothing (§6.6.4).
 */

import { getCard, type PlayingStateView } from '@card-battle/shared';
import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';

import type { ActionContext } from '../../view-model/action-lock';
import { DISABLED_REASON_COPY } from '../../view-model/action-reasons';
import { cardActions, type CardAction, type RegenerationQuantity } from '../../view-model/card-actions';
import { CARD_SELL_LABEL, CARD_UPGRADE_LABEL } from '../../view-model/chrome-labels';
import { DEACTIVATE_CONFIRM_BODY, DEACTIVATE_CONFIRM_TITLE } from '../../view-model/table-copy';
import { Card } from '../../ui/card/card';
import { cardCostChip } from '../../ui/card/card-face';
import { CostAmount } from '../../ui/card/cost-amount';
import { Badge } from '../../ui/primitives/badge';
import { Button } from '../../ui/primitives/button';
import { ICON_WELL_CLASS } from '../../ui/primitives/chrome-classes';
import { Dialog } from '../../ui/primitives/dialog';
import { Sheet } from '../../ui/primitives/sheet';
import type { CostSign, StructuredCost } from '../../ui/structured-cost';
import { CardEffectCopy } from '../../ui/text/card-effect-copy';
import type { ArenaCommit, ArenaIntent } from './arena-commit';
import { arenaSheetKey } from './arena-sheets';
import {
  CANCEL_ACTION_LABEL,
  DEACTIVATE_ACTION_LABEL,
  sellYieldOf,
  UPGRADE_ACTION_COST,
  USE_ACTION_LABEL,
} from './card-sheet-actions';
import {
  ACTIVE_LABEL,
  CARD_LIVES_LABEL,
  SPY_REVEAL_LABEL,
  cardSheetContext,
  cardSheetCounter,
  cardSheetTitle,
  liveCardRefFor,
  liveCardSheetSource,
  sheetInstanceFor,
  type CardSheetSource,
} from './card-sheet-source';
import { MultiAttackPanel } from './multi-attack';
import {
  EMPTY_MULTI_ATTACK_SELECTION,
  MULTI_ATTACK_ENTRY_LABEL,
  MULTI_ATTACK_TITLE,
  multiAttackPayload,
  pickMultiAttackTarget,
  playAttacksLabel,
  selectedMultiAttackRows,
  toggleMultiAttackRow,
  type MultiAttackSelection,
} from './multi-attack-selection';
import { ConsumeChoice, RegenerationChoice } from './pre-send-choice';
import { DEFAULT_REGENERATION_QUANTITY, resolveConsumeId } from './pre-send-model';

export interface CardSheetProps {
  /** False while the sheet plays its exit from `closing` (arena-sheets.ts). */
  open: boolean;
  source: CardSheetSource;
  /** The live view: in-play counters follow it; the card actions are read from it (L74-08). */
  view: PlayingStateView;
  /** The arena's action context (Appendix A.2): the lock the actions read. */
  ctx: ActionContext;
  onClose: () => void;
  /** The single intent exit (L74-08). Without it the sheet renders no action row (a pure inspect). */
  commit?: ArenaCommit;
  /** Use routed `target`: the sheet hands the card and its seats over. L74-10 passes it from ArenaScreen and collapses the sheet into targeting. */
  onBeginTargeting?: (request: { instanceId: string; seatIds: readonly string[] }) => void;
  /** L74-10: the card is targeted; the sheet collapses into `collapsedBar` (Sheet `collapsed`). */
  collapsed?: boolean;
  /** L74-10: the "Choose a target" bar shown while `collapsed`. */
  collapsedBar?: ReactNode;
}

/** Icons sit in a `--bg-0` well on a CTA fill (DESIGN.md › Cost glyphs); the amount is a private part of the button label. */
function ActionCost({ amount, signed }: { amount: StructuredCost; signed: CostSign }): ReactElement {
  return (
    <span data-action-cost="" className={`${ICON_WELL_CLASS} gap-0.5 px-2 py-0.5 text-v7-text`}>
      <CostAmount amount={amount} signed={signed} title={null} />
    </span>
  );
}

export function CardSheet(props: CardSheetProps): ReactElement {
  const { open, view, ctx, commit, onBeginTargeting, onClose, collapsed, collapsedBar } = props;
  const source = liveCardSheetSource(props.source, view);
  const ref = liveCardRefFor(source, view);
  const model = cardActions(view, ref, ctx);
  // The face follows the live copy of a held card; any other source keeps L74-02's sheetInstanceFor.
  const face = ref.zone === 'hand' || ref.zone === 'special' ? ref.instance : sheetInstanceFor(source);
  const card = getCard(face.cardId);
  const counter = cardSheetCounter(source);
  const context = cardSheetContext(source);

  // One commit per view (Review Focus 3): a second tap before the next state update sends nothing,
  // even on the stale panel an exit animation keeps on screen.
  const committedFor = useRef<PlayingStateView | null>(null);
  // Per opening, not per mount: a closed sheet stays mounted through its exit (`closing`) and is reused
  // when the same card opens again (same key), so the guard re-arms when `open` turns true. A ref is
  // not written during render (React Compiler lint), hence the effect; the state resets below.
  useEffect(() => {
    if (open) {
      committedFor.current = null;
    }
  }, [open]);

  // The pre-send picks (§6.6.2), reset on every opening for the same reason: "pick 3 lives, Esc,
  // reopen" shows '1 life' again. React's adjust-state-during-render pattern, as
  // `ui/primitives/sheet.tsx` does; never an effect with setState.
  const [quantity, setQuantity] = useState<RegenerationQuantity>(DEFAULT_REGENERATION_QUANTITY);
  const [consumePick, setConsumePick] = useState<string | null>(null);
  const checkedRef = useRef<HTMLButtonElement>(null);
  // The multi-attack step (L74-11): null is the card step. Reset on every opening like the picks above
  // (Q44), because a closed sheet is reused, never remounted.
  const [multi, setMulti] = useState<MultiAttackSelection | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuantity(DEFAULT_REGENERATION_QUANTITY);
      setConsumePick(null);
      setMulti(null);
    }
  }
  // The card left the hand, or the hand fell below two attacks: back to the card step.
  if (multi !== null && model.multiAttack === null) {
    setMulti(null);
  }

  // The Lot 69 confirm (in-play Deactivate). It lives and dies with this sheet.
  const [confirming, setConfirming] = useState(false);
  const deactivate = model.actions.find((action) => action.kind === 'deactivate');
  const useAction = model.actions.find((action) => action.kind === 'use');
  const use = model.use;
  // The pre-send groups belong to the action row: a pure inspect (no `commit`) shows neither.
  const regeneration = commit !== undefined && use?.kind === 'regeneration' ? use : null;
  // Use takes the selected tile's availability, which carries Use's own reason first, then its price.
  const regenerationTile = regeneration?.tiles.find((tile) => tile.quantity === quantity);
  const consume = commit !== undefined && use?.kind === 'consume' ? use : null;
  // Null with nothing to consume: no group, and Use's own reason says why once.
  const consumeId = consume === null ? null : resolveConsumeId(consume.options, consumePick);
  const multiAction = model.actions.find((action) => action.kind === 'multi-attack');
  const multiStep = multi !== null && model.multiAttack !== null ? { selection: multi, model: model.multiAttack } : null;
  const multiPayload = multiStep === null ? null : multiAttackPayload(multiStep.model, multiStep.selection);

  function send(intent: ArenaIntent): void {
    if (commit === undefined || committedFor.current === view) {
      return;
    }
    committedFor.current = view;
    commit(intent);
    onClose();
  }

  function onUse(): void {
    if (use === null) {
      return;
    }
    switch (use.kind) {
      case 'send':
        send({ kind: 'playCard', payload: { instanceId: model.instanceId } });
        return;
      case 'target':
        // L74-10 collapses this sheet into targeting; nothing is sent until a seat is tapped.
        onBeginTargeting?.({ instanceId: model.instanceId, seatIds: use.seatIds });
        return;
      case 'regeneration':
        send({ kind: 'playCard', payload: { instanceId: model.instanceId, quantity } });
        return;
      case 'consume':
        if (consumeId === null) {
          return;
        }
        send({ kind: 'playCard', payload: { instanceId: model.instanceId, consumeInstanceId: consumeId } });
        return;
    }
  }

  function renderAction(action: CardAction): ReactElement | null {
    const availability = action.kind === 'use' && regenerationTile !== undefined ? regenerationTile : action;
    const shared = {
      'data-card-action': action.kind,
      disabled: !availability.enabled,
      ...(availability.reason !== null ? { disabledReason: DISABLED_REASON_COPY[availability.reason] } : {}),
    };
    switch (action.kind) {
      case 'use': {
        const cost = cardCostChip(face.cardId, face.isUpgraded);
        return (
          <Button key={action.kind} variant="primary" onClick={onUse} {...shared}>
            {USE_ACTION_LABEL}
            {cost !== null ? (
              <>
                {' '}
                <ActionCost amount={cost} signed="cost" />
              </>
            ) : null}
          </Button>
        );
      }
      case 'upgrade':
        return (
          <Button
            key={action.kind}
            variant="secondary"
            onClick={() => {
              send({ kind: 'upgradeCard', payload: { instanceId: model.instanceId } });
            }}
            {...shared}
          >
            {CARD_UPGRADE_LABEL}{' '}
            <ActionCost amount={UPGRADE_ACTION_COST} signed="cost" />
          </Button>
        );
      case 'sell': {
        const yielded = sellYieldOf(face);
        return (
          <Button
            key={action.kind}
            variant="quiet"
            onClick={() => {
              send({ kind: 'sellCard', payload: { instanceId: model.instanceId } });
            }}
            {...shared}
          >
            {CARD_SELL_LABEL}
            {yielded !== null ? (
              <>
                {' '}
                <ActionCost amount={yielded} signed="gain" />
              </>
            ) : null}
          </Button>
        );
      }
      case 'multi-attack':
        // Nothing is sent from here: the entry only opens the step.
        return (
          <Button
            key={action.kind}
            variant="secondary"
            onClick={() => {
              setMulti(EMPTY_MULTI_ATTACK_SELECTION);
            }}
            {...shared}
          >
            {MULTI_ATTACK_ENTRY_LABEL}
          </Button>
        );
      case 'deactivate':
        // Nothing is sent from here: the button only opens the confirm (Lot 69).
        return (
          <Button
            key={action.kind}
            variant="danger"
            onClick={() => {
              setConfirming(true);
            }}
            {...shared}
          >
            {DEACTIVATE_ACTION_LABEL}
          </Button>
        );
    }
  }

  return (
    <>
      <Sheet
        open={open}
        mode="read-only"
        placement="bottom"
        title={multiStep !== null ? MULTI_ATTACK_TITLE : cardSheetTitle(source)}
        onClose={onClose}
        dataAttributes={{ 'data-arena-sheet': arenaSheetKey({ kind: 'card', source }) }}
        {...(collapsed !== undefined ? { collapsed } : {})}
        {...(collapsedBar !== undefined ? { collapsedBar } : {})}
        {...(regenerationTile?.enabled === true ? { initialFocusRef: checkedRef } : {})}
        {...(multiStep !== null
          ? {
              actions: (
                <div className="flex flex-wrap items-start gap-2">
                  <Button
                    variant="primary"
                    disabled={multiAction?.enabled !== true || multiPayload === null}
                    {...(multiAction !== undefined && multiAction.reason !== null
                      ? { disabledReason: DISABLED_REASON_COPY[multiAction.reason] }
                      : {})}
                    onClick={() => {
                      if (multiPayload !== null) {
                        send({ kind: 'playMultipleAttacks', payload: multiPayload });
                      }
                    }}
                  >
                    {playAttacksLabel(selectedMultiAttackRows(multiStep.model, multiStep.selection).length)}
                  </Button>
                  <Button
                    variant="quiet"
                    onClick={() => {
                      setMulti(null);
                    }}
                  >
                    {CANCEL_ACTION_LABEL}
                  </Button>
                </div>
              ),
            }
          : commit !== undefined && model.actions.length > 0
            ? { actions: <div className="flex flex-wrap items-start gap-2">{model.actions.map(renderAction)}</div> }
            : {})}
      >
        {multiStep !== null ? (
          <MultiAttackPanel
            view={view}
            model={multiStep.model}
            selection={multiStep.selection}
            onToggle={(instanceId) => {
              setMulti((current) => (current === null ? current : toggleMultiAttackRow(current, instanceId)));
            }}
            onPickTarget={(instanceId, playerId) => {
              setMulti((current) => (current === null ? current : pickMultiAttackTarget(current, instanceId, playerId)));
            }}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 pt-2 pb-3">
            <Card size="sheet" instance={face} {...(counter !== null ? { counter } : {})} />
            {card !== undefined ? (
              <div className="w-full">
                <CardEffectCopy card={card} isUpgraded={face.isUpgraded} />
              </div>
            ) : null}
            {regeneration !== null ? (
              <div className="w-full">
                <RegenerationChoice
                  tiles={regeneration.tiles}
                  selected={quantity}
                  onSelect={setQuantity}
                  checkedRef={checkedRef}
                />
              </div>
            ) : null}
            {consume !== null && consumeId !== null ? (
              <div className="w-full">
                <ConsumeChoice
                  options={consume.options}
                  selectedId={consumeId}
                  disabled={useAction?.enabled !== true}
                  onSelect={setConsumePick}
                />
              </div>
            ) : null}
            {context?.kind === 'active' ? (
              <div data-card-sheet-context="active" className="flex w-full flex-wrap items-center gap-2">
                <p className="font-v7-display text-v7-body text-v7-text">{ACTIVE_LABEL}</p>
                {context.count !== null ? (
                  <Badge
                    icon={context.count.label === CARD_LIVES_LABEL ? 'life' : 'clock'}
                    label={context.count.label}
                    value={context.count.value}
                  />
                ) : null}
              </div>
            ) : null}
            {context?.kind === 'spy-reveal' ? (
              <p data-card-sheet-context="spy-reveal" className="w-full font-v7-body text-v7-body text-v7-text-2">
                {SPY_REVEAL_LABEL}
              </p>
            ) : null}
          </div>
        )}
      </Sheet>
      {/* Cancel comes first, so it takes the initial focus: the safe answer, as in V2. The confirm closes by itself when the action leaves the model (the persistent expired), and its Deactivate carries the live reason if the turn passes or a sub-choice opens while it is up. */}
      <Dialog
        open={confirming && deactivate !== undefined}
        title={DEACTIVATE_CONFIRM_TITLE}
        onClose={() => {
          setConfirming(false);
        }}
        dataAttributes={{ 'data-arena-sheet': `deactivate:${model.instanceId}` }}
        actions={
          <>
            <Button
              variant="quiet"
              onClick={() => {
                setConfirming(false);
              }}
            >
              {CANCEL_ACTION_LABEL}
            </Button>
            <Button
              variant="danger"
              disabled={deactivate?.enabled !== true}
              {...(deactivate !== undefined && deactivate.reason !== null
                ? { disabledReason: DISABLED_REASON_COPY[deactivate.reason] }
                : {})}
              onClick={() => {
                setConfirming(false);
                send({ kind: 'deactivatePersistent', payload: { effectId: model.instanceId } });
              }}
            >
              {DEACTIVATE_ACTION_LABEL}
            </Button>
          </>
        }
      >
        <p className="font-v7-body text-v7-body text-v7-text">{DEACTIVATE_CONFIRM_BODY}</p>
      </Dialog>
    </>
  );
}
