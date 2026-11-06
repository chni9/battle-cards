/**
 * Resource value flash for V7 values — technical spec v7 §6.12, §8.3; Appendix A
 * `table-fx-resource-flash`, `table-fx-token-chips` (L74-17).
 *
 * The V2 `ResourceIcon` logic (`design/components/resource-icon.tsx`, L51-09, L51-15, L51-16),
 * ported because the arena may not import `design/`; both copies live until Lot 77 or 81 retires
 * `design/components/resource-icon.tsx` (Game over). A printed value's Δ flashes and floats; the POV
 * (no `playerId`) listens as `self` and flies one chip per unit between the log and the value; an
 * opponent seat listens by player id and never flies. A Δ the overlay already choreographed
 * (`shouldSkipResourceIconFlyout`) neither flies nor floats here: the overlay's `emitResourceFlowFlash` floats it instead, which is
 * also how a hidden `?` value flashes its public chip amount. Reduced motion keeps the flash and
 * drops the flight (§8.3). Works without a provider: it then only flashes.
 */

import { useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { ResourceKind } from '../ui/asset-lookup';
import { measureTokenFlyout } from './play-flyout';
import { pointFlyoutCount, RESOURCE_FLASH_MS, TOKEN_FLYOUT_DURATION_S, TOKEN_STAGGER_MS } from './motion-timing';
import { subscribeResourceFlowFlash } from './resource-flow-flash';
import { useTableFxOptional } from './table-fx-hooks';
import { shouldSkipResourceIconFlyout } from './token-flyout-skip';

export type ResourceFlashTone = 'gain' | 'loss' | 'both';

export interface ResourceFlashState {
  readonly tone: ResourceFlashTone | null;
  readonly gain: number;
  readonly loss: number;
}

export interface ResourceFlashInput {
  readonly kind: ResourceKind;
  /** The printed value; 'unknown' for a hidden seat value (`?`). */
  readonly value: number | 'unknown';
  /** An opponent seat. Omitted for the POV, which listens as 'self' and flies its own Δ (V2 ResourceIcon, L51-09). */
  readonly playerId?: string;
}

function toneOf(gain: number, loss: number): ResourceFlashTone | null {
  if (gain !== 0 && loss !== 0) {
    return 'both';
  }
  if (gain !== 0) {
    return 'gain';
  }
  return loss !== 0 ? 'loss' : null;
}

export function useResourceFlash({ kind, value, playerId }: ResourceFlashInput): ResourceFlashState {
  const reduceMotion = useReducedMotion();
  const fx = useTableFxOptional();
  const enqueue = fx?.enqueue;
  const prev = useRef(value);
  const [gain, setGain] = useState(0);
  const [loss, setLoss] = useState(0);
  const skipId = playerId ?? 'self';
  const flyToken = playerId === undefined;
  const flashClearRef = useRef(0);

  const applyDelta = useCallback((delta: number): void => {
    if (delta > 0) {
      setGain((current) => current + delta);
    } else if (delta < 0) {
      setLoss((current) => current + delta);
    } else {
      return;
    }
    window.clearTimeout(flashClearRef.current);
    flashClearRef.current = window.setTimeout(() => {
      setGain(0);
      setLoss(0);
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
    if (value === 'unknown' || previous === 'unknown') {
      return;
    }
    const delta = value - previous;
    // The overlay already choreographed this Δ (L51-15, L51-16): no net flight, and no float
    // over the two-way floats the overlay emitted.
    if (skipped) {
      return;
    }
    applyDelta(delta);

    if (flyToken && enqueue !== undefined && reduceMotion !== true) {
      const direction = delta > 0 ? 'gain' : 'loss';
      const count = pointFlyoutCount(kind, Math.abs(delta));
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
  }, [value, kind, flyToken, enqueue, reduceMotion, playerId, skipId, applyDelta]);

  return { tone: toneOf(gain, loss), gain, loss };
}
