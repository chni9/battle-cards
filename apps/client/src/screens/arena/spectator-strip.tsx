/**
 * The Watching strip — technical spec v7 §6.3, §6.12, §7.2, §10.6, §13 (Q24, Q38); Appendix A
 * `walk-in-spectator-mode`, `table-prompts`, `claim-seat-dismiss-stay`; A.8 rulings 7 and 9
 * (L74-23).
 *
 * - `WatchingHeader` heads a Watching POV's strip: L73's 'Watching' label, Claim a seat (only
 *   while App passes `onClaimSeat`, a walk-in with claimable seats), Leave table and V2's line
 *   (`watchingCopy`). Leave and its line show only while `model.leave`: never on the finished
 *   board, where the flag is Return home.
 * - `SpectatorStrip` is a walk-in's whole self strip: no kit, resources or dock (Q38), so it
 *   carries no `resources` zone.
 *
 * Nothing here is an `ArenaIntent` (§6.6.4): Leave table opens the top bar's leave confirm
 * (`confirmRequest`, plan A.9.4) and Claim a seat reopens App's claim picker. Both are App-level
 * and stay enabled while reconnecting (S3).
 */

import type { ReactElement } from 'react';

import { Button } from '../../ui/primitives/button';
import { CHROME_SHAPE_SM_CLASS } from '../../ui/primitives/chrome-classes';
import type { SelfStripModel } from '../../view-model/self-strip';
import { LEAVE_TABLE_ARIA_LABEL } from '../../view-model/table-copy';
import { CLAIM_SEAT_LABEL, watchingCopy } from './spectator-model';

export interface WatchingHeaderProps {
  readonly model: SelfStripModel;
  /** Opens the top bar's leave confirm (A.9.4). Shown while `model.leave`. */
  readonly onLeave: () => void;
  /** App's claim picker reopen (§7.2); present only while claimable seats exist. */
  readonly onClaimSeat?: () => void;
}

export function WatchingHeader({ model, onLeave, onClaimSeat }: WatchingHeaderProps): ReactElement | null {
  if (model.povLabel === null) {
    return null;
  }
  const copy = watchingCopy(model);
  return (
    <div data-pov-strip={model.pov} className={`flex flex-col gap-1.5 bg-v7-panel px-3 py-2 ${CHROME_SHAPE_SM_CLASS}`}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto font-v7-display text-v7-title leading-tight text-v7-text">{model.povLabel}</h2>
        {onClaimSeat !== undefined ? (
          <Button variant="primary" onClick={onClaimSeat}>
            {CLAIM_SEAT_LABEL}
          </Button>
        ) : null}
        {model.leave ? (
          <Button variant="quiet" icon="flag" onClick={onLeave}>
            {LEAVE_TABLE_ARIA_LABEL}
          </Button>
        ) : null}
      </div>
      {model.leave && copy !== null ? <p className="font-v7-body text-v7-caption text-v7-text-2">{copy}</p> : null}
    </div>
  );
}

/** A walk-in's whole self strip (Q38: no kit, resources or dock). */
export function SpectatorStrip(props: WatchingHeaderProps): ReactElement {
  return (
    <div data-spectator-strip="" className="flex w-full flex-col gap-2 px-4 py-2">
      <WatchingHeader {...props} />
    </div>
  );
}
