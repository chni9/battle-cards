/**
 * The turn clock in the top bar's `timers` slot — technical spec v7 §6.10; Appendix A
 * `table-turn-timer-scale`, `turn-strip-timers`; Lot 74 plan L74-21.
 *
 * Renders the `turnClock(...)` model (L73-13, computed once in `ArenaScreenInner`): a seconds label
 * and a thin bar. The bar renders in every mode, as V2's did, empty and with no `aria-valuenow`
 * while idle or while the turn length is unknown (seconds only). The last 10 s turn the label and
 * the fill `--danger`; under reduced motion the fill jumps instead of easing (§8.2).
 */

import type { ReactElement } from 'react';

import { usePrefersReducedMotion } from '../../ui/motion/use-prefers-reduced-motion';
import { motionAttribute } from '../../ui/primitives/chrome-classes';
import type { TurnClockModel } from '../../view-model/turn-clock';

/** V2's aria-label (`screens/table/timers.tsx`); a `.tsx` exports components only, so it stays private. */
const TURN_TIMER_LABEL = 'Turn timer';

export interface TurnClockProps {
  readonly model: TurnClockModel;
}

export function TurnClock({ model }: TurnClockProps): ReactElement {
  const reduced = usePrefersReducedMotion();
  const countdown = model.mode === 'countdown' ? model : null;
  const ratio = countdown?.ratio ?? null;
  const danger = countdown?.danger === true;
  const percent = ratio === null ? 0 : Math.round(ratio * 100);

  return (
    <div data-turn-clock={model.mode} className="mt-1 flex items-center gap-2">
      <p
        data-zone="timer-label"
        {...(danger ? { 'data-danger': '' } : {})}
        className={`shrink-0 font-v7-body text-v7-caption font-bold tabular-nums ${danger ? 'text-v7-danger' : 'text-v7-text-2'}`}
      >
        {model.label}
      </p>
      <div
        role="progressbar"
        aria-label={TURN_TIMER_LABEL}
        aria-valuemin={0}
        aria-valuemax={100}
        {...(ratio === null ? {} : { 'aria-valuenow': percent })}
        className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-v7-panel-2"
      >
        <div
          data-motion={motionAttribute(reduced)}
          className={`h-full rounded-full ${danger ? 'bg-v7-danger' : 'bg-v7-cta'} ${reduced ? '' : 'transition-[width] duration-(--dur-base) ease-linear'}`}
          style={{ width: `${String(percent)}%` }}
        />
      </div>
    </div>
  );
}
