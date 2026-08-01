/**
 * Turn / timer strip — L12-01 placement; L12-07 progress restyle.
 */

import type { ActionResolvedPayload } from '@card-battle/shared';
import type { ReactElement } from 'react';

export interface TimersProps {
  activeNickname: string;
  isMyTurn: boolean;
  timerLabel: string;
  lastActionResolved: ActionResolvedPayload | null;
  /** 0–1 remaining fraction when known; null when paused/unknown. */
  progressRatio: number | null;
  subChoiceLabel?: string | undefined;
}

export function Timers({
  activeNickname,
  isMyTurn,
  timerLabel,
  lastActionResolved,
  progressRatio,
  subChoiceLabel,
}: TimersProps): ReactElement {
  return (
    <section
      data-zone="timers"
      className="rounded-[length:var(--radius-card)] border border-border bg-surface-raised p-3"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">
          Turn:{' '}
          <span className="font-semibold">
            {activeNickname}
            {isMyTurn ? ' (you)' : ''}
          </span>
        </h2>
        <p className="text-sm tabular-nums text-ink-muted" data-zone="timer-label">
          {timerLabel}
        </p>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-border-soft"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        {...(progressRatio === null
          ? {}
          : { 'aria-valuenow': Math.round(progressRatio * 100) })}
        aria-label="Turn timer"
      >
        <div
          className="h-full rounded-full bg-cta-yellow transition-[width] duration-200 ease-out motion-reduce:transition-none"
          style={{
            width:
              progressRatio === null ? '0%' : `${Math.round(progressRatio * 100)}%`,
          }}
        />
      </div>
      {subChoiceLabel !== undefined && (
        <p className="mt-2 text-xs text-ink-muted">{subChoiceLabel}</p>
      )}
      {lastActionResolved?.outcome === 'immune' && (
        <p className="mt-2 text-sm font-medium text-cta-red" role="status">
          {lastActionResolved.cardId} failed — target is immune
        </p>
      )}
    </section>
  );
}
