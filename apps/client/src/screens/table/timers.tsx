/**
 * Turn / sub-choice timers — L12-07.
 * Cosmetic only: trust server deadlineMs. Static progress (L14-05 adds motion).
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
  /** Optional sub-choice remaining fraction (Mirror / rewards). */
  subChoiceProgressRatio?: number | null | undefined;
}

export function Timers({
  activeNickname,
  isMyTurn,
  timerLabel,
  lastActionResolved,
  progressRatio,
  subChoiceLabel,
  subChoiceProgressRatio,
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
        <p
          className="rounded-[length:var(--radius-badge)] bg-surface px-2 py-0.5 text-sm tabular-nums text-ink-muted"
          data-zone="timer-label"
        >
          {timerLabel}
        </p>
      </div>
      <div
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-border-soft"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        {...(progressRatio === null
          ? {}
          : { 'aria-valuenow': Math.round(progressRatio * 100) })}
        aria-label="Turn timer"
      >
        <div
          className={[
            'h-full rounded-full transition-[width] duration-200 ease-out motion-reduce:transition-none',
            progressRatio !== null && progressRatio < 0.2
              ? 'bg-cta-red'
              : 'bg-cta-yellow',
          ].join(' ')}
          style={{
            width:
              progressRatio === null ? '0%' : `${Math.round(progressRatio * 100)}%`,
          }}
        />
      </div>
      {subChoiceLabel !== undefined && (
        <div className="mt-3">
          <p className="text-xs font-medium text-ink-muted">{subChoiceLabel}</p>
          {subChoiceProgressRatio !== undefined && subChoiceProgressRatio !== null && (
            <div
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-border-soft"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(subChoiceProgressRatio * 100)}
              aria-label="Sub-choice timer"
            >
              <div
                className="h-full rounded-full bg-cta-orange transition-[width] duration-200 ease-out motion-reduce:transition-none"
                style={{
                  width: `${Math.round(subChoiceProgressRatio * 100)}%`,
                }}
              />
            </div>
          )}
        </div>
      )}
      {lastActionResolved?.outcome === 'immune' && (
        <p
          className="mt-2 rounded-[length:var(--radius-badge)] bg-cta-red/10 px-2 py-1 text-sm font-medium text-cta-red"
          role="status"
        >
          {lastActionResolved.cardId} failed — target is immune
        </p>
      )}
    </section>
  );
}
