/**
 * Absolute overlay for Table FX — pointer-events-none (Lot 14).
 */

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ReactElement } from 'react';

import type { ActionResolutionOutcome } from '@card-battle/shared';

import { MOTION_DURATION_S, MOTION_EASE, TOKEN_FLYOUT_DURATION_S } from './motion-timing';
import { useTableFx } from './table-fx-hooks';

function outcomeClass(outcome: ActionResolutionOutcome): string {
  if (outcome === 'applied') {
    return 'border-cta-green bg-cta-green/25 text-cta-green';
  }
  if (outcome === 'cancelled' || outcome === 'blocked') {
    return 'border-ink-muted bg-surface/80 text-ink-muted';
  }
  return 'border-cta-red bg-cta-red/20 text-cta-red';
}

function outcomeLabel(outcome: ActionResolutionOutcome): string {
  if (outcome === 'applied') {
    return 'Applied';
  }
  if (outcome === 'cancelled') {
    return 'Cancelled';
  }
  if (outcome === 'blocked') {
    return 'Blocked';
  }
  return 'Immune';
}

function FlyoutImage({
  id,
  artUrl,
  from,
  to,
  reduceMotion,
}: {
  id: string;
  artUrl: string;
  from: { left: number; top: number; width: number; height: number };
  to: { left: number; top: number; width: number; height: number };
  reduceMotion: boolean | null;
}): ReactElement | null {
  if (reduceMotion === true) {
    return null;
  }
  return (
    <motion.img
      key={id}
      src={artUrl}
      alt=""
      className="absolute rounded-[length:var(--radius-card)] border border-border object-contain shadow-lg"
      initial={{
        left: from.left,
        top: from.top,
        width: from.width,
        height: from.height,
        opacity: 0.95,
        rotate: -4,
      }}
      animate={{
        left: to.left,
        top: to.top,
        width: to.width,
        height: to.height,
        opacity: 0,
        rotate: 6,
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: MOTION_DURATION_S, ease: MOTION_EASE }}
      draggable={false}
    />
  );
}

export function TableFxOverlay(): ReactElement {
  const { events } = useTableFx();
  const reduceMotion = useReducedMotion();
  const dur = reduceMotion === true ? 0 : MOTION_DURATION_S;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[80] overflow-hidden"
      aria-hidden
      data-zone="table-fx"
    >
      <AnimatePresence>
        {events.map((event) => {
          if (event.kind === 'playFlyout') {
            return (
              <FlyoutImage
                key={event.id}
                id={event.id}
                artUrl={event.artUrl}
                from={event.from}
                to={event.to}
                reduceMotion={reduceMotion}
              />
            );
          }

          if (event.kind === 'tokenFlyout') {
            if (reduceMotion === true) {
              return null;
            }
            const { from, to, artUrl, id, delayMs = 0 } = event;
            return (
              <motion.img
                key={id}
                src={artUrl}
                alt=""
                className="absolute object-contain drop-shadow-md"
                initial={{
                  left: from.left,
                  top: from.top,
                  width: from.width,
                  height: from.height,
                  opacity: 0,
                  scale: 1.15,
                }}
                animate={{
                  left: to.left,
                  top: to.top,
                  width: to.width,
                  height: to.height,
                  opacity: [0, 1, 0.15],
                  scale: 0.9,
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: TOKEN_FLYOUT_DURATION_S,
                  ease: MOTION_EASE,
                  delay: delayMs / 1000,
                }}
                draggable={false}
              />
            );
          }

          if (event.kind === 'resolutionFlash') {
            const pending = document.querySelector(
              `[data-pending-id="${CSS.escape(event.effectId)}"]`,
            );
            const felt = document.querySelector('[data-zone="pending"]');
            const target = pending ?? felt;
            const rect = target?.getBoundingClientRect();
            if (rect === undefined) {
              return null;
            }
            return (
              <motion.div
                key={event.id}
                className={[
                  'absolute rounded-[length:var(--radius-badge)] border px-2 py-1 text-xs font-semibold shadow-md',
                  outcomeClass(event.outcome),
                ].join(' ')}
                style={{
                  left: rect.left + rect.width / 2,
                  top: rect.top,
                  transform: 'translateX(-50%)',
                }}
                initial={
                  reduceMotion === true
                    ? { opacity: 1 }
                    : { opacity: 0, y: 10, scale: event.outcome === 'immune' ? 1.08 : 0.92 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: dur, ease: MOTION_EASE }}
              >
                {outcomeLabel(event.outcome)}
              </motion.div>
            );
          }

          if (event.kind === 'eliminationBeat') {
            const seat = document.querySelector(
              `[data-player-id="${CSS.escape(event.playerId)}"]`,
            );
            const rect = seat?.getBoundingClientRect();
            if (rect === undefined) {
              return null;
            }
            return (
              <motion.div
                key={event.id}
                className="absolute rounded-[length:var(--radius-card)] border-2 border-cta-red bg-cta-red/15"
                style={{
                  left: rect.left - 4,
                  top: rect.top - 4,
                  width: rect.width + 8,
                  height: rect.height + 8,
                }}
                initial={reduceMotion === true ? { opacity: 1 } : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: [0.9, 1, 0.55], scale: [0.95, 1.02, 1] }}
                exit={{ opacity: 0 }}
                transition={{ duration: dur, ease: MOTION_EASE }}
              />
            );
          }

          // Remaining kind: rewardPulse
          const dock = document.querySelector('[data-zone="dock"]');
          const rect = dock?.getBoundingClientRect();
          if (rect === undefined) {
            return null;
          }
          return (
            <motion.div
              key={event.id}
              className="absolute rounded-[length:var(--radius-card)] border-2 border-cta-orange/80"
              style={{
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
              }}
              initial={reduceMotion === true ? { opacity: 0.5 } : { opacity: 0 }}
              animate={{ opacity: [0.12, 0.5, 0.12] }}
              exit={{ opacity: 0 }}
              transition={{
                duration: reduceMotion === true ? 0 : MOTION_DURATION_S * 1.2,
                times: [0, 0.5, 1],
              }}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
