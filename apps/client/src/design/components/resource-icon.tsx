/**
 * Resource icon + value — technical spec v2 §5, L10-04.
 * Brief gain (green) / loss (red) flash — clears after RESOURCE_FLASH_MS.
 */

import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type ReactElement } from 'react';

import { measureTokenFlyout } from '../../fx/play-flyout';
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
  value: number;
  label?: string;
  className?: string;
  /** When false, skip enqueueing a token flyout (e.g. opponent seats). Default true. */
  flyToken?: boolean;
  /**
   * Dock row (L43-01): show the caption in the layout, not `sr-only` / `title` only.
   * Kit inspect and opponent reveal stay compact.
   */
  captionVisible?: boolean;
}

export function ResourceIcon({
  kind,
  value,
  label = RESOURCE_CAPTIONS[kind],
  className = '',
  flyToken = true,
  captionVisible,
}: ResourceIconProps): ReactElement {
  const reduceMotion = useReducedMotion();
  const fx = useTableFxOptional();
  const enqueue = fx?.enqueue;
  const prev = useRef(value);
  const [flash, setFlash] = useState<'gain' | 'loss' | null>(null);
  const [floatDelta, setFloatDelta] = useState(0);

  useEffect(() => {
    if (prev.current === value) {
      return;
    }
    const d = value - prev.current;
    prev.current = value;
    const nextFlash = d > 0 ? 'gain' : 'loss';
    setFlash(nextFlash);
    setFloatDelta(d);

    if (flyToken && enqueue !== undefined && reduceMotion !== true) {
      const direction = nextFlash === 'gain' ? 'gain' : 'loss';
      const count = Math.abs(d);
      for (let i = 0; i < count; i++) {
        const measured = measureTokenFlyout(kind, direction, i);
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

    const id = window.setTimeout(() => {
      setFlash(null);
      setFloatDelta(0);
    }, RESOURCE_FLASH_MS);
    return () => {
      window.clearTimeout(id);
    };
  }, [value, kind, flyToken, enqueue, reduceMotion]);

  const valueClass =
    flash === 'gain' ? 'text-cta-green' : flash === 'loss' ? 'text-cta-red' : 'text-ink';

  return (
    <span
      data-resource-kind={kind}
      className={`inline-flex items-center gap-1.5 font-sans tabular-nums ${valueClass} ${className}`}
      title={label}
    >
      <motion.span
        className="inline-flex items-center gap-1.5"
        animate={
          reduceMotion === true || flash === null
            ? { scale: 1, y: 0 }
            : { scale: [1.18, 1], y: flash === 'gain' ? [-4, 0] : [4, 0] }
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
          <span className="sr-only">{label} </span>
        )}
        <span className="relative text-sm font-medium">
          {value}
          {flash !== null && floatDelta !== 0 && reduceMotion !== true && (
            <motion.span
              key={`${flash}-${String(floatDelta)}`}
              className="pointer-events-none absolute left-full top-0 ml-0.5 text-[10px] font-semibold whitespace-nowrap"
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 0, y: flash === 'gain' ? -14 : 14 }}
              transition={{ duration: RESOURCE_FLASH_MS / 1000, ease: MOTION_EASE }}
              aria-hidden
            >
              {floatDelta > 0 ? `+${String(floatDelta)}` : String(floatDelta)}
            </motion.span>
          )}
        </span>
      </motion.span>
    </span>
  );
}
