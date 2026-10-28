/**
 * The Unspy picker — technical spec v7 §6.1 item 5, §6.6.4 (an explicit button commits), §11;
 * L58-07, L58-09; Appendix A `unspy-dialog` (L74-13).
 *
 * A read-only bottom Sheet over the dock. Opening it, picking a seat, Cancel, Esc, the backdrop and
 * the swipe send nothing; only Confirm calls `onConfirm`, once, with the resolved spy. The seats are
 * `control.spyIds` (living spies only, in `view.players` order), and a single spy is preselected
 * (L58-09). The pick resets whenever the sheet closes, so a reopened sheet never shows a stale
 * choice. It carries no kit portrait and no hidden information: a seat is its hue initial and its
 * nickname (`SeatChoiceButton`).
 */

import type { PlayingStateView } from '@card-battle/shared';
import { useState, type ReactElement } from 'react';

import { Button } from '../../ui/primitives/button';
import { Sheet } from '../../ui/primitives/sheet';
import { DISABLED_REASON_COPY } from '../../view-model/action-reasons';
import { UNSPY_ACTION_LABEL } from '../../view-model/chrome-labels';
import { UNSPY_PICKER_HINT } from '../../view-model/table-copy';
import type { UnspyControl } from '../../view-model/self-strip';
import { CANCEL_ACTION_LABEL } from './card-sheet-actions';
import { resolvedSpyId, UNSPY_CONFIRM_LABEL } from './dock-model';
import { SeatChoiceButton } from './seat-choice-button';

export interface UnspySheetProps {
  open: boolean;
  /** `selfStrip(view, ctx).dock.unspy`, read live: the seats and the availability follow the latest view. */
  control: UnspyControl;
  /** Nicknames and seat hues for the picker. */
  view: PlayingStateView;
  onConfirm: (targetPlayerId: string) => void;
  onClose: () => void;
}

export function UnspySheet({ open, control, view, onConfirm, onClose }: UnspySheetProps): ReactElement {
  const [picked, setPicked] = useState<string | null>(null);
  const target = resolvedSpyId(control, picked);
  const close = (): void => {
    setPicked(null);
    onClose();
  };
  return (
    <Sheet
      open={open}
      mode="read-only"
      placement="bottom"
      title={UNSPY_ACTION_LABEL}
      onClose={close}
      dataAttributes={{ 'data-arena-sheet': 'unspy' }}
      actions={
        <>
          <Button
            variant="primary"
            disabled={!control.enabled || target === null}
            {...(control.reason !== null ? { disabledReason: DISABLED_REASON_COPY[control.reason] } : {})}
            onClick={() => {
              if (target === null) return;
              setPicked(null);
              onConfirm(target);
            }}
          >
            {UNSPY_CONFIRM_LABEL}
          </Button>
          <Button variant="quiet" onClick={close}>
            {CANCEL_ACTION_LABEL}
          </Button>
        </>
      }
    >
      <div className="flex w-full flex-col gap-3 pt-2 pb-3">
        <p className="font-v7-body text-v7-body text-v7-text-2">{UNSPY_PICKER_HINT}</p>
        <ul data-unspy-picker="" aria-label={UNSPY_PICKER_HINT} className="flex flex-wrap items-center gap-2">
          {control.spyIds.map((playerId) => (
            <li key={playerId} className="min-w-0 max-w-full">
              <SeatChoiceButton
                view={view}
                playerId={playerId}
                selected={playerId === target}
                onSelect={() => {
                  setPicked(playerId);
                }}
              />
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}
