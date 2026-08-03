/**
 * Absolute overlay for Table FX — pointer-events-none (Lot 14).
 */

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ReactElement } from 'react';

import { useTableFx } from './table-fx-hooks';

function outcomeClass(outcome: 'applied' | 'cancelled' | 'immune'): string {
  if (outcome === 'applied') {
    return 'border-cta-green bg-cta-green/25 text-cta-green';
  }
  if (outcome === 'cancelled') {
    return 'border-ink-muted bg-surface/80 text-ink-muted';
  }
  return 'border-cta-red bg-cta-red/20 text-cta-red';
}

function outcomeLabel(outcome: 'applied' | 'cancelled' | 'immune'): string {
  if (outcome === 'applied') {
    return 'Applied';
  }
  if (outcome === 'cancelled') {
    return 'Cancelled';
  }
  return 'Immune';
}

export function TableFxOverlay(): ReactElement {
  const { events } = useTableFx();
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[80] overflow-hidden"
      aria-hidden
      data-zone="table-fx"
    >
      <AnimatePresence>
        {events.map((event) => {
          if (event.kind === 'playFlyout') {
            if (reduceMotion === true) {
              return null;
            }
            const { from, to, artUrl, id } = event;
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
                }}
                animate={{
                  left: to.left + to.width / 2 - from.width / 4,
                  top: to.top + to.height / 2 - from.height / 4,
                  width: from.width / 2,
                  height: from.height / 2,
                  opacity: 0,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
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
                    : { opacity: 0, y: 6, scale: event.outcome === 'immune' ? 1.05 : 0.95 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion === true ? 0 : 0.2 }}
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
                initial={reduceMotion === true ? { opacity: 1 } : { opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion === true ? 0 : 0.25 }}
              />
            );
          }

          // Remaining kind: rewardPulse (exhaustive after prior returns)
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
              animate={{ opacity: [0.15, 0.45, 0.15] }}
              exit={{ opacity: 0 }}
              transition={{
                duration: reduceMotion === true ? 0 : 0.5,
                times: [0, 0.5, 1],
              }}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
