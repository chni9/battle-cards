/**
 * The Mirror redirect picker — technical spec v7 §6.7; V2 `mirror-panel.tsx` (L44-03, L56-04);
 * Appendix A `table-subchoice-mirror` (L74-18).
 *
 * - The eligible pending attacks, in wire order, as `ChoiceCardTile`s with the V2 names
 *   ("{source}'s {card} → you") and the listed damage × the pending multiplier (L56-04).
 * - Every living opponent, Invisible included (V2; the server accepts them), as a
 *   `SeatChoiceButton`: the seat-hue initial, which can never show a hidden kit (designer
 *   default 2026-11-02).
 * - Both are preselected (V2), and a pick a resend no longer offers falls back to the first.
 */

import { formatCardLabel, type MirrorChoiceRequiredPayload } from '@card-battle/shared';
import { useState, type ReactElement } from 'react';

import { Button } from '../../../ui/primitives/button';
import { PlayerName } from '../../../ui/seat/player-name';
import { DISABLED_REASON_COPY } from '../../../view-model/action-reasons';
import { seatColorIndexOf } from '../../../view-model/seats';
import { nicknameOf } from '../../../view-model/table-helpers';
import { SeatChoiceButton } from '../seat-choice-button';
import { ChoiceCardTile } from './choice-card-tile';
import { mirrorOptions, resolvePick, type SubChoicePickerProps } from './sub-choice-model';

const LEGEND_CLASS = 'font-v7-display text-v7-body text-v7-text';

export function MirrorChoice({
  subChoice,
  view,
  frame,
  send,
  locked,
}: SubChoicePickerProps<MirrorChoiceRequiredPayload>): ReactElement {
  const { effects, targetIds } = mirrorOptions(view, subChoice);
  const [effectPick, setEffectPick] = useState<string | null>(null);
  const [targetPick, setTargetPick] = useState<string | null>(null);
  const effectId = resolvePick(effectPick, effects.map((effect) => effect.id));
  const targetId = resolvePick(targetPick, targetIds);

  const body = (
    <>
      <p className="text-v7-body text-v7-text-2">Choose which pending attack to redirect and its new target.</p>
      <fieldset className="mt-3 min-w-0">
        <legend className={LEGEND_CLASS}>Pending attack</legend>
        <ul className="mt-2 flex flex-wrap gap-3">
          {effects.map((effect) => {
            const source = nicknameOf(view, effect.sourcePlayerId);
            return (
              <li key={effect.id} className="min-w-0">
                <ChoiceCardTile
                  instance={{ instanceId: effect.id, cardId: effect.cardId, isUpgraded: effect.isUpgraded }}
                  damageMultiplier={effect.damageMultiplier}
                  label={`${source}'s ${formatCardLabel(effect.cardId, effect.isUpgraded)} → you`}
                  caption={
                    <>
                      <PlayerName nickname={source} seatIndex={seatColorIndexOf(view, effect.sourcePlayerId)} />
                      {' → you'}
                    </>
                  }
                  selected={effectId === effect.id}
                  onSelect={() => {
                    setEffectPick(effect.id);
                  }}
                />
              </li>
            );
          })}
        </ul>
      </fieldset>
      <fieldset className="mt-3 min-w-0">
        <legend className={LEGEND_CLASS}>New target</legend>
        <ul className="mt-2 flex flex-wrap gap-2">
          {targetIds.map((playerId) => (
            <li key={playerId} className="min-w-0 max-w-full">
              <SeatChoiceButton
                view={view}
                playerId={playerId}
                selected={targetId === playerId}
                onSelect={() => {
                  setTargetPick(playerId);
                }}
              />
            </li>
          ))}
        </ul>
      </fieldset>
    </>
  );

  const actions = (
    <Button
      variant="primary"
      disabled={effectId === null || targetId === null || locked}
      {...(locked ? { disabledReason: DISABLED_REASON_COPY['actions-locked'] } : {})}
      onClick={() => {
        if (effectId === null || targetId === null) return;
        send({ kind: 'mirror', pendingEffectId: effectId, newTargetPlayerId: targetId });
      }}
    >
      Confirm redirect
    </Button>
  );

  return frame({ body, actions });
}
