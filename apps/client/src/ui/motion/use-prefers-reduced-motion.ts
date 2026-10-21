/**
 * The only reduced-motion read V7 components make (technical spec v7 §5.7, §8.3).
 * `motion`'s hook returns `null` until it has read the media query; that counts as full
 * motion so first paint is never stripped for users who did not ask for it.
 */

import { useReducedMotion } from 'motion/react';

export function usePrefersReducedMotion(): boolean {
  return useReducedMotion() === true;
}
