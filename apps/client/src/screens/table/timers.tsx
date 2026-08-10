/**
 * Turn / sub-choice timers — L12-07 / L14-05 / L39-05.
 * Cosmetic only: trust server deadlineMs. Motion polish on progress bars.
 * Landscape meta (code · status) lives here — no separate Card Battle header.
 * Illegal-action rejects use IllegalActionDialog (L39-02), not a strip under timers.
 */

import { motion, useReducedMotion } from 'motion/react';
import type { CSSProperties, ReactElement } from 'react';

import { PlayerName } from '../../design/components/player-name';
import { seatColorVar, seatIndexOf, type SeatPlayersView } from '../../design/seat-colors';
import { MOTION_DURATION_S, MOTION_EASE } from '../../fx/motion-timing';

export interface TimersProps {
  gameCode: string;
  statusLabel: string;
  activeNickname: string;
  /** Active seat id for seat-colored turn banner (L39-05). */
  activePlayerId?: string | null;
  view?: SeatPlayersView;
  isMyTurn: boolean;
  timerLabel: string;
  /** 0–1 remaining fraction when known; null when paused/unknown. */
  progressRatio: number | null;
  subChoiceLabel?: string | undefined;
  /** Optional sub-choice remaining fraction (Mirror / rewards). */
  subChoiceProgressRatio?: number | null | undefined;
  /** Block chain / attack-ban hint for the active seat (L30-04). */
  blockStatusLabel?: string | undefined;
}

export function Timers({
  gameCode,
  statusLabel,
  activeNickname,
  activePlayerId,
  view,
  isMyTurn,
  timerLabel,
  progressRatio,
  subChoiceLabel,
  subChoiceProgressRatio,
  blockStatusLabel,
}: TimersProps): ReactElement {
  const reduceMotion = useReducedMotion();
  const turnPct =
    progressRatio === null ? 0 : Math.round(progressRatio * 100);
  const subPct =
    subChoiceProgressRatio === undefined || subChoiceProgressRatio === null
      ? null
      : Math.round(subChoiceProgressRatio * 100);

  const seat =
    view !== undefined && activePlayerId !== undefined && activePlayerId !== null
      ? seatIndexOf(view, activePlayerId)
      : null;

  const turnTint: CSSProperties | undefined =
    seat !== null
      ? {
          borderColor: seatColorVar(seat),
          backgroundColor: `color-mix(in srgb, ${seatColorVar(seat)} ${isMyTurn ? '22' : '16'}%, var(--color-surface-raised))`,
          boxShadow: isMyTurn
            ? `inset 0 0 0 2px color-mix(in srgb, ${seatColorVar(seat)} 55%, transparent)`
            : `inset 0 3px 0 0 ${seatColorVar(seat)}`,
        }
      : undefined;

  return (
    <section
      data-zone="timers"
      data-my-turn={isMyTurn ? 'true' : undefined}
      className="rounded-[length:var(--radius-card)] border border-border bg-surface-raised px-2 py-1 sm:px-2.5 sm:py-1.5"
      style={turnTint}
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
          <h2 className="text-sm font-bold text-ink sm:text-base">
            {isMyTurn ? (
              <span className="text-ink">Your turn</span>
            ) : (
              <>
                <PlayerName
                  nickname={activeNickname}
                  {...(activePlayerId !== undefined && activePlayerId !== null
                    ? { playerId: activePlayerId }
                    : {})}
                  {...(view !== undefined ? { view } : {})}
                  {...(seat !== null ? { seatIndex: seat } : {})}
                  possessive
                  className="text-sm sm:text-base"
                />{' '}
                <span className="font-bold text-ink">turn</span>
              </>
            )}
          </h2>
        </div>
        <p
          className="rounded-[length:var(--radius-badge)] bg-surface px-2 py-0.5 text-xs tabular-nums text-ink-muted sm:text-sm"
          data-zone="timer-label"
        >
          {timerLabel}
        </p>
      </div>
      {blockStatusLabel !== undefined && (
        <p className="mt-0.5 text-[10px] font-medium text-ink-muted sm:text-xs">
          {blockStatusLabel}
        </p>
      )}
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
