/**
 * Assassin multi-attack panel — technical spec v7 §6.6.1, §6.6.2 (one explicit seat per row, no
 * default target), §13 Q44; Appendix A `assassin-multi-attack`,
 * `table-multi-attack-target-eligibility`; L74-11.
 *
 * The body of the card sheet's multi-attack step (`card-sheet.tsx`). One row per
 * `MultiAttackModel` row, in model (hand) order: the card as a toggle and, once toggled, the seats
 * the row may aim at. Which rows and seats exist come only from the model (golden rule 8): a riposte
 * corpse is a seat the model lists, a living Invisible seat never is. Toggling and picking send
 * nothing (§6.6.4); the sheet's Play button commits. No entrance motion here: L78 owns it.
 */

import { formatCardLabel, getCard, type PlayingStateView } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { Card } from '../../ui/card/card';
import { cardDamageChip, cardFaceLabel } from '../../ui/card/card-face';
import type { MultiAttackModel } from '../../view-model/card-actions';
import {
  MULTI_ATTACK_HINT,
  selectedMultiAttackRows,
  type MultiAttackSelection,
} from './multi-attack-selection';
import { SeatChoiceButton } from './seat-choice-button';

export interface MultiAttackPanelProps {
  view: PlayingStateView;
  model: MultiAttackModel;
  selection: MultiAttackSelection;
  onToggle: (instanceId: string) => void;
  onPickTarget: (instanceId: string, playerId: string) => void;
}

export function MultiAttackPanel({ view, model, selection, onToggle, onPickTarget }: MultiAttackPanelProps): ReactElement {
  // The live picks: a target that left a row's seat set reads null, so no stale seat shows as chosen.
  const picks = selectedMultiAttackRows(model, selection);
  return (
    <div className="flex w-full flex-col gap-3 pt-2 pb-3">
      <p className="font-v7-body text-v7-body text-v7-text-2">{MULTI_ATTACK_HINT}</p>
      <ul className="flex flex-col gap-3">
        {model.rows.map((row) => {
          const { instance } = row;
          const pick = picks.find((entry) => entry.instanceId === instance.instanceId);
          // The group takes the face label the card button speaks (`Card` has no id to label by).
          const faceLabel = cardFaceLabel({
            name: getCard(instance.cardId)?.name ?? instance.cardId,
            isUpgraded: instance.isUpgraded,
            damage: cardDamageChip(instance.cardId, instance.isUpgraded),
          });
          return (
            <li key={instance.instanceId} data-multi-attack-row={instance.instanceId} className="flex items-start gap-3">
              <div className="flex w-20 shrink-0 flex-col items-center gap-1">
                <Card size="thumb" instance={instance} selected={pick !== undefined} onActivate={onToggle} />
                <span aria-hidden="true" className="text-center font-v7-body text-v7-caption text-v7-text-2 wrap-anywhere">
                  {formatCardLabel(instance.cardId, instance.isUpgraded)}
                </span>
              </div>
              {pick !== undefined ? (
                <div role="group" aria-label={faceLabel} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  {row.seatIds.map((seatId) => (
                    <SeatChoiceButton
                      key={seatId}
                      view={view}
                      playerId={seatId}
                      selected={pick.targetPlayerId === seatId}
                      onSelect={() => {
                        onPickTarget(instance.instanceId, seatId);
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
