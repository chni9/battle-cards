/**
 * Turn / sub-choice timers — L12-07 / L14-05.
 * Cosmetic only: trust server deadlineMs. Motion polish on progress bars.
 * Landscape meta (code · status) lives here — no separate Card Battle header.
 */

import { motion, useReducedMotion } from 'motion/react';
import type { ReactElement } from 'react';

import { MOTION_DURATION_S, MOTION_EASE } from '../../fx/motion-timing';

export interface TimersProps {
  gameCode: string;
  statusLabel: string;
  error: string | null;
  activeNickname: string;
  isMyTurn: boolean;
  timerLabel: string;
  /** 0–1 remaining fraction when known; null when paused/unknown. */
  progressRatio: number | null;
  subChoiceLabel?: string | undefined;
  /** Optional sub-choice remaining fraction (Mirror / rewards). */
  subChoiceProgressRatio?: number | null | undefined;
}

export function Timers({
  gameCode,
  statusLabel,
  error,
  activeNickname,
  isMyTurn,
  timerLabel,
  progressRatio,
  subChoiceLabel,
  subChoiceProgressRatio,
}: TimersProps): ReactElement {
  const reduceMotion = useReducedMotion();
  const turnPct =
    progressRatio === null ? 0 : Math.round(progressRatio * 100);
  const subPct =
    subChoiceProgressRatio === undefined || subChoiceProgressRatio === null
      ? null
      : Math.round(subChoiceProgressRatio * 100);

  return (
    <section
      data-zone="timers"
      className="rounded-[length:var(--radius-card)] border border-border bg-surface-raised px-2 py-1 sm:px-2.5 sm:py-1.5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink-muted sm:text-xs">
            Code {gameCode}
            <span className="mx-1 text-border-soft" aria-hidden>
              ·
            </span>
            {statusLabel}
          </p>
          <h2 className="text-xs font-semibold text-ink sm:text-sm">
            Turn:{' '}
            <span className="font-semibold">
              {activeNickname}
              {isMyTurn ? ' (you)' : ''}
            </span>
          </h2>
        </div>
        <p
          className="rounded-[length:var(--radius-badge)] bg-surface px-2 py-0.5 text-xs tabular-nums text-ink-muted sm:text-sm"
          data-zone="timer-label"
        >
          {timerLabel}
        </p>
      </div>
      <div
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-border-soft sm:h-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        {...(progressRatio === null ? {} : { 'aria-valuenow': turnPct })}
        aria-label="Turn timer"
      >
        <motion.div
          className={[
            'h-full rounded-full origin-left',
            progressRatio !== null && progressRatio < 0.2
              ? 'bg-cta-red'
              : 'bg-cta-yellow',
          ].join(' ')}
          initial={false}
          animate={{
            width: `${String(turnPct)}%`,
            scaleY: progressRatio !== null && progressRatio < 0.2 ? 1.15 : 1,
          }}
          transition={
            reduceMotion === true
              ? { duration: 0 }
              : { duration: MOTION_DURATION_S, ease: MOTION_EASE }
          }
        />
      </div>
      {error !== null && (
        <p className="mt-1 text-xs font-medium text-cta-red sm:text-sm" role="alert">
          {error}
        </p>
      )}
      {subChoiceLabel !== undefined && (
        <div className="mt-1 sm:mt-1.5">
          <p className="text-[10px] font-medium text-ink-muted sm:text-xs">
            {subChoiceLabel}
          </p>
          {subPct !== null && (
            <div
              className="mt-1 h-1 overflow-hidden rounded-full bg-border-soft sm:h-1.5"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={subPct}
              aria-label="Sub-choice timer"
            >
              <motion.div
                className="h-full rounded-full bg-cta-orange origin-left"
                initial={false}
                animate={{ width: `${String(subPct)}%` }}
                transition={
                  reduceMotion === true
                    ? { duration: 0 }
                    : { duration: MOTION_DURATION_S, ease: MOTION_EASE }
                }
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
