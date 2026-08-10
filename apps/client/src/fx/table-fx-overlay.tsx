/**
 * Absolute overlay for Table FX — pointer-events-none (Lot 14 / L39-05).
 */

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ReactElement } from 'react';

import type { ActionResolutionOutcome } from '@card-battle/shared';

import {
  MOTION_DURATION_S,
  MOTION_EASE,
  THREAT_OUTLINE_DURATION_S,
  TOKEN_FLYOUT_DURATION_S,
} from './motion-timing';
import { useTableFx } from './table-fx-hooks';
import type { DomRectLite, ThreatTone } from './table-fx-types';

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

function threatColor(tone: ThreatTone): string {
  return tone === 'attack' ? 'var(--color-cta-red)' : 'var(--color-cta-orange)';
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

function ThreatOutlineFlash({
  id,
  tone,
  reduceMotion,
}: {
  id: string;
  tone: ThreatTone;
  reduceMotion: boolean | null;
}): ReactElement {
  const color = threatColor(tone);
  // Long readable pulse — TTL is THREAT_FX_TTL_MS; keep the border visible most of that window.
  const dur = reduceMotion === true ? 0.35 : THREAT_OUTLINE_DURATION_S;
  return (
    <motion.div
      key={id}
      className="absolute inset-2 rounded-[length:var(--radius-card)] border-[3px] sm:inset-3 sm:border-4"
      style={{
        borderColor: color,
        boxShadow: `inset 0 0 28px color-mix(in srgb, ${color} 40%, transparent), 0 0 22px color-mix(in srgb, ${color} 45%, transparent)`,
      }}
      initial={reduceMotion === true ? { opacity: 0.7 } : { opacity: 0 }}
      animate={
        reduceMotion === true
          ? { opacity: [0.7, 0] }
          : {
              opacity: [0, 1, 0.85, 1, 0.85, 1, 0.55, 0],
              scale: [0.994, 1, 1.003, 1, 1.003, 1, 1, 1],
            }
      }
      exit={{ opacity: 0 }}
      transition={{
        duration: dur,
        ease: MOTION_EASE,
        times:
          reduceMotion === true
            ? [0, 1]
            : [0, 0.08, 0.22, 0.38, 0.54, 0.7, 0.88, 1],
      }}
    />
  );
}

function TargetingCueLine({
  id,
  tone,
  from,
  to,
  reduceMotion,
}: {
  id: string;
  tone: ThreatTone;
  from: DomRectLite;
  to: DomRectLite;
  reduceMotion: boolean | null;
}): ReactElement | null {
  if (reduceMotion === true) {
    return null;
  }
  const x1 = from.left + from.width / 2;
  const y1 = from.top + from.height / 2;
  const x2 = to.left + to.width / 2;
  const y2 = to.top + to.height / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 8) {
    return null;
  }
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const color = threatColor(tone);

  return (
    <>
      <motion.div
        key={`${id}-pulse`}
        className="absolute rounded-full"
        style={{
          left: x1 - 10,
          top: y1 - 10,
          width: 20,
          height: 20,
          backgroundColor: color,
        }}
        initial={{ opacity: 0.9, scale: 0.6 }}
        animate={{ opacity: [0.9, 0], scale: [0.6, 1.8] }}
        exit={{ opacity: 0 }}
        transition={{ duration: MOTION_DURATION_S, ease: MOTION_EASE }}
      />
      <motion.div
        key={id}
        className="absolute h-[3px] origin-left rounded-full"
        style={{
          left: x1,
          top: y1 - 1.5,
          width: length,
          background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 20%, transparent))`,
          transform: `rotate(${String(angleDeg)}deg)`,
          boxShadow: `0 0 8px color-mix(in srgb, ${color} 55%, transparent)`,
        }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: [0, 1, 0.15] }}
        exit={{ opacity: 0 }}
        transition={{ duration: MOTION_DURATION_S * 1.1, ease: MOTION_EASE }}
      />
    </>
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

          if (event.kind === 'threatOutline') {
            return (
              <ThreatOutlineFlash
                key={event.id}
                id={event.id}
                tone={event.tone}
                reduceMotion={reduceMotion}
              />
            );
          }

          if (event.kind === 'targetingCue') {
            return (
              <TargetingCueLine
                key={event.id}
                id={event.id}
                tone={event.tone}
                from={event.from}
                to={event.to}
                reduceMotion={reduceMotion}
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
