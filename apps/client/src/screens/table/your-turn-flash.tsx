/**
 * Brief center-screen “Your turn” cue when the POV seat becomes active.
 */

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type ReactElement } from 'react';

import { MOTION_EASE } from '../../fx/motion-timing';

const FLASH_MS = 1600;

export interface YourTurnFlashProps {
  isMyTurn: boolean;
  /** Seat CSS color for the banner chrome. */
  seatColor?: string;
}

export function YourTurnFlash({
  isMyTurn,
  seatColor = 'var(--color-cta-yellow)',
}: YourTurnFlashProps): ReactElement {
  const reduceMotion = useReducedMotion();
  const wasMyTurn = useRef(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isMyTurn) {
      wasMyTurn.current = false;
      const hideId = window.setTimeout(() => {
        setVisible(false);
      }, 0);
      return () => {
        window.clearTimeout(hideId);
      };
    }
    if (wasMyTurn.current) {
      return undefined;
    }
    wasMyTurn.current = true;
    const showId = window.setTimeout(() => {
      setVisible(true);
    }, 0);
    const hideId = window.setTimeout(() => {
      setVisible(false);
    }, FLASH_MS);
    return () => {
      window.clearTimeout(showId);
      window.clearTimeout(hideId);
    };
  }, [isMyTurn]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="your-turn-flash"
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center"
          initial={reduceMotion === true ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion === true ? 0.15 : 0.35, ease: MOTION_EASE }}
        >
          <motion.p
            className="rounded-[length:var(--radius-card)] border-4 px-8 py-4 text-2xl font-bold tracking-tight text-ink sm:px-12 sm:py-5 sm:text-3xl"
            style={{
              borderColor: seatColor,
              backgroundColor: `color-mix(in srgb, ${seatColor} 55%, white)`,
              boxShadow: `0 0 0 4px color-mix(in srgb, ${seatColor} 35%, transparent), 0 12px 40px rgba(28,26,31,0.35)`,
            }}
            initial={
              reduceMotion === true ? false : { scale: 0.85, y: 12 }
            }
            animate={{ scale: 1, y: 0 }}
            {...(reduceMotion === true
              ? {}
              : { exit: { scale: 0.92, y: -8 } })}
            transition={{ duration: reduceMotion === true ? 0 : 0.4, ease: MOTION_EASE }}
          >
            Your turn
          </motion.p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
