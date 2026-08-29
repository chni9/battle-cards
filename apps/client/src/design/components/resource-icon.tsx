/**
 * Resource icon + value — technical spec v2 §5, L10-04.
 * Brief gain (green) / loss (red) flash — clears after RESOURCE_FLASH_MS.
 * Two-way ticks can show both floats at once (L51-16).
 */

import { motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';

import { measureTokenFlyout } from '../../fx/play-flyout';
import { subscribeResourceFlowFlash } from '../../fx/resource-flow-flash';
import { shouldSkipResourceIconFlyout } from '../../fx/token-flyout-skip';
import {
  MOTION_EASE,
  MOTION_PULSE_S,
  RESOURCE_FLASH_MS,
  TOKEN_FLYOUT_DURATION_S,
  TOKEN_STAGGER_MS,
} from '../../fx/motion-timing';
import { useTableFxOptional } from '../../fx/table-fx-hooks';
import { getResourceIconUrl, type ResourceKind } from '../asset-lookup';
import { RESOURCE_CAPTIONS, resourceCaptionMode } from './resource-captions';

export interface ResourceIconProps {
  kind: ResourceKind;
  /** Numeric amount, or `unknown` for unspied / base Spy seats (L51-08). */
  value: number | 'unknown';
  label?: string;
  className?: string;
  /** When false, skip enqueueing a token flyout (e.g. opponent seats). Default true. */
  flyToken?: boolean;
  /**
   * Dock row (L43-01): show the caption in the layout, not `sr-only` / `title` only.
   * Kit inspect and opponent reveal stay compact.
   */
  captionVisible?: boolean;
  /** Scope token flyouts to an opponent seat (L51-09). */
  playerId?: string;
}

export function ResourceIcon({
  kind,
  value,
  label = RESOURCE_CAPTIONS[kind],
  className = '',
  flyToken = true,
  captionVisible,
  playerId,
}: ResourceIconProps): ReactElement {
  const reduceMotion = useReducedMotion();
  const fx = useTableFxOptional();
  const enqueue = fx?.enqueue;
  const prev = useRef(value);
  const [gainFloat, setGainFloat] = useState(0);
  const [lossFloat, setLossFloat] = useState(0);
  const unknown = value === 'unknown';
  const skipId = playerId ?? 'self';
  const flashClearRef = useRef(0);

  const applyDelta = useCallback((delta: number): void => {
    if (delta > 0) {
      setGainFloat((current) => current + delta);
    } else if (delta < 0) {
      setLossFloat((current) => current + delta);
    } else {
      return;
    }
    window.clearTimeout(flashClearRef.current);
    flashClearRef.current = window.setTimeout(() => {
      setGainFloat(0);
      setLossFloat(0);
    }, RESOURCE_FLASH_MS);
  }, []);

  useEffect(() => {
    const stop = subscribeResourceFlowFlash(skipId, kind, applyDelta);
    return () => {
      stop();
      window.clearTimeout(flashClearRef.current);
    };
  }, [skipId, kind, applyDelta]);

  useEffect(() => {
    if (prev.current === value) {
      return;
    }
    const previous = prev.current;
    prev.current = value;
    const skipped = shouldSkipResourceIconFlyout(skipId, kind);
    if (unknown || previous === 'unknown' || typeof value !== 'number' || typeof previous !== 'number') {
      return;
    }
    const d = value - previous;
    // Overlay already choreographed this Δ (L51-15/16) — do not net-fly or
    // overwrite the two-way floats the overlay emitted.
    if (skipped) {
      return;
    }
    applyDelta(d);

    if (flyToken && enqueue !== undefined && reduceMotion !== true) {
      const direction = d > 0 ? 'gain' : 'loss';
      const count = Math.abs(d);
      for (let i = 0; i < count; i++) {
        const measured = measureTokenFlyout(kind, direction, i, playerId);
        if (measured === null) {
          break;
        }
        const delayMs = i * TOKEN_STAGGER_MS;
        enqueue({
          kind: 'tokenFlyout',
          ...measured,
          delayMs,
          expiresAt: Date.now() + delayMs + TOKEN_FLYOUT_DURATION_S * 1000 + 120,
        });
      }
    }
  }, [value, kind, flyToken, enqueue, reduceMotion, unknown, playerId, skipId, applyDelta]);

  const flash =
    gainFloat !== 0 && lossFloat !== 0
      ? 'both'
      : gainFloat !== 0
        ? 'gain'
        : lossFloat !== 0
          ? 'loss'
          : null;
  const valueClass =
    flash === 'gain' ? 'text-cta-green' : flash === 'loss' ? 'text-cta-red' : 'text-ink';
  const pulseY = flash === 'gain' ? -4 : flash === 'loss' ? 4 : 0;

  return (
    <span
      data-resource-kind={kind}
      data-resource-flash={flash ?? undefined}
      className={`inline-flex items-center gap-1.5 font-sans tabular-nums ${valueClass} ${className}`}
      title={unknown ? `${label} unknown` : label}
    >
      <motion.span
        className="inline-flex items-center gap-1.5"
        animate={
          reduceMotion === true || flash === null
            ? { scale: 1, y: 0 }
            : { scale: [1.18, 1], y: [pulseY, 0] }
        }
        transition={{ duration: MOTION_PULSE_S, ease: MOTION_EASE }}
      >
        <img
          src={getResourceIconUrl(kind)}
          alt=""
          width={20}
          height={20}
          className="size-5 shrink-0 object-contain"
          aria-hidden
        />
        {resourceCaptionMode(captionVisible) === 'visible' ? (
          <span className="text-[10px] font-semibold leading-none text-ink-muted sm:text-[11px]">
            {label}
          </span>
        ) : (
          <span className="sr-only">{unknown ? `${label} unknown` : `${label} `}</span>
        )}
        <span className="relative text-sm font-medium">
          {unknown ? '?' : value}
          {flash !== null && reduceMotion !== true && (
            <span className="pointer-events-none absolute left-full top-0 ml-0.5 flex flex-col text-[10px] font-semibold whitespace-nowrap">
              {gainFloat > 0 ? (
                <motion.span
                  key={`gain-${String(gainFloat)}`}
                  className="text-cta-green"
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 0, y: -14 }}
                  transition={{ duration: RESOURCE_FLASH_MS / 1000, ease: MOTION_EASE }}
                  aria-hidden
                >
                  {`+${String(gainFloat)}`}
                </motion.span>
              ) : null}
              {lossFloat < 0 ? (
                <motion.span
                  key={`loss-${String(lossFloat)}`}
                  className="text-cta-red"
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 0, y: 14 }}
                  transition={{ duration: RESOURCE_FLASH_MS / 1000, ease: MOTION_EASE }}
                  aria-hidden
                >
                  {String(lossFloat)}
                </motion.span>
              ) : null}
            </span>
          )}
        </span>
      </motion.span>
    </span>
  );
}
