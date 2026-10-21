/**
 * Reduced-motion helper (technical spec v7 §5.7, §8.3). Under
 * `prefers-reduced-motion: reduce` a motion spec keeps fades and color flashes only:
 * no x, y, scale or rotate, and the spring becomes a fast tween. No information may be
 * carried by motion alone, so the end state of every spec is still reached.
 */

import type { TargetAndTransition, Transition } from 'motion/react';

import { durationS } from './motion-tokens';

export interface V7MotionTarget {
  readonly opacity?: number;
  readonly x?: number | string;
  readonly y?: number | string;
  readonly scale?: number;
  readonly rotate?: number;
  readonly color?: string;
  readonly backgroundColor?: string;
  readonly boxShadow?: string;
}

export interface V7MotionSpec {
  readonly initial?: V7MotionTarget;
  readonly animate: V7MotionTarget;
  readonly exit?: V7MotionTarget;
  readonly transition?: Transition;
}

const REDUCED_TRANSITION: Transition = { type: 'tween', duration: durationS('fast') };

/** Keeps only the fade and color keys. Absent keys stay absent (`exactOptionalPropertyTypes`). */
function reduceTarget(target: V7MotionTarget): V7MotionTarget {
  return {
    ...(target.opacity !== undefined ? { opacity: target.opacity } : {}),
    ...(target.color !== undefined ? { color: target.color } : {}),
    ...(target.backgroundColor !== undefined ? { backgroundColor: target.backgroundColor } : {}),
    ...(target.boxShadow !== undefined ? { boxShadow: target.boxShadow } : {}),
  };
}

/** The spec with every transform and scale key dropped and a fast tween as the transition. */
export function reduceMotionSpec(spec: V7MotionSpec): V7MotionSpec {
  return {
    ...(spec.initial !== undefined ? { initial: reduceTarget(spec.initial) } : {}),
    animate: reduceTarget(spec.animate),
    ...(spec.exit !== undefined ? { exit: reduceTarget(spec.exit) } : {}),
    transition: REDUCED_TRANSITION,
  };
}

/** Components run every motion prop through this, with `usePrefersReducedMotion()`. */
export function motionSpecFor(spec: V7MotionSpec, reduced: boolean): V7MotionSpec {
  return reduced ? reduceMotionSpec(spec) : spec;
}

/** The `initial` / `animate` / `exit` / `transition` props of a motion element. */
export interface V7MotionProps {
  readonly initial?: TargetAndTransition;
  readonly animate: TargetAndTransition;
  readonly exit?: TargetAndTransition;
  readonly transition?: Transition;
}

/**
 * `motionSpecFor` as props to spread on a motion element (L72-09). Each target is copied into a
 * fresh object literal: motion's target type carries a `--${string}` index signature, which an
 * interface such as `V7MotionTarget` cannot satisfy, but an object literal type can.
 */
export function motionPropsFor(spec: V7MotionSpec, reduced: boolean): V7MotionProps {
  const chosen = motionSpecFor(spec, reduced);
  return {
    ...(chosen.initial !== undefined ? { initial: { ...chosen.initial } } : {}),
    animate: { ...chosen.animate },
    ...(chosen.exit !== undefined ? { exit: { ...chosen.exit } } : {}),
    ...(chosen.transition !== undefined ? { transition: chosen.transition } : {}),
  };
}
