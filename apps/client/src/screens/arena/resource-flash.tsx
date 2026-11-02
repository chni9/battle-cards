/**
 * The flash and floats on an arena resource value — technical spec v7 §6.12, §8.3, §5.1; Appendix A
 * `table-fx-resource-flash` (L74-17).
 *
 * It paints `useResourceFlash` state inside a `relative` parent: a 2 px `--upgrade` (gain) or
 * `--danger` (loss, both) outline, kept under reduced motion because it is the colour flash, not a
 * movement (§8.3), and V2's +N / −N floats (`resource-icon.tsx`, ASCII `-` verbatim) under full
 * motion only. Resource colours are never small text on their own (§5.1), so the value itself keeps
 * `--text`. Both parts are `aria-hidden`: the value already speaks its number. L78 restyles it.
 */

import { motion } from 'motion/react';
import type { ReactElement } from 'react';

import { MOTION_EASE, RESOURCE_FLASH_MS } from '../../fx/motion-timing';
import type { ResourceFlashState } from '../../fx/use-resource-flash';
import { usePrefersReducedMotion } from '../../ui/motion/use-prefers-reduced-motion';

const FLOAT_TRANSITION = { duration: RESOURCE_FLASH_MS / 1000, ease: MOTION_EASE } as const;

export function ResourceFlashCue({ flash }: { readonly flash: ResourceFlashState }): ReactElement | null {
  const reduced = usePrefersReducedMotion();
  if (flash.tone === null) {
    return null;
  }
  return (
    <>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 rounded-[inherit] outline-2 ${flash.tone === 'gain' ? 'outline-v7-upgrade' : 'outline-v7-danger'}`}
      />
      {reduced ? null : (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-full top-0 ml-0.5 flex flex-col whitespace-nowrap font-v7-display text-v7-caption leading-none"
        >
          {flash.gain > 0 ? (
            <motion.span
              key={`gain-${String(flash.gain)}`}
              data-resource-float="gain"
              className="text-v7-upgrade"
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 0, y: -14 }}
              transition={FLOAT_TRANSITION}
            >
              +{flash.gain}
            </motion.span>
          ) : null}
          {flash.loss < 0 ? (
            <motion.span
              key={`loss-${String(flash.loss)}`}
              data-resource-float="loss"
              className="text-v7-danger"
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 0, y: 14 }}
              transition={FLOAT_TRANSITION}
            >
              {String(flash.loss)}
            </motion.span>
          ) : null}
        </span>
      )}
    </>
  );
}
