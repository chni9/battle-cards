/**
 * Card face with entrance + upgrade reveal motion (L14-01).
 * Presentational only — does not delay intents.
 */

import type { CardInstance } from '@card-battle/shared';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type ReactElement } from 'react';

import { MOTION_DURATION_S, MOTION_EASE } from '../../fx/motion-timing';
import { Card, type CardProps } from './card';

export type AnimatedCardProps = CardProps & {
  instance: CardInstance;
  /** Skip the mount flip — pagination remounts must not blink (L50-05). */
  skipEntrance?: boolean;
};

export function AnimatedCard({
  instance,
  skipEntrance = false,
  ...cardProps
}: AnimatedCardProps): ReactElement {
  const reduceMotion = useReducedMotion();
  const prevUpgraded = useRef(instance.isUpgraded);
  const [upgradePulse, setUpgradePulse] = useState(0);

  useEffect(() => {
    if (prevUpgraded.current !== instance.isUpgraded) {
      prevUpgraded.current = instance.isUpgraded;
      setUpgradePulse((n) => n + 1);
    }
  }, [instance.isUpgraded]);

  const skipFlip = skipEntrance || reduceMotion === true;

  return (
    <motion.div
      data-instance-id={instance.instanceId}
      className="h-full w-full [perspective:600px]"
      // Never start at opacity 0 — HMR / interrupted motion left cards invisible (Lot 39).
      initial={
        skipFlip ? false : { opacity: 1, rotateY: -28, scale: 0.98 }
      }
      animate={{ opacity: 1, rotateY: 0, scale: 1 }}
      transition={{ duration: MOTION_DURATION_S, ease: MOTION_EASE }}
    >
      <motion.div
        key={upgradePulse}
        initial={
          reduceMotion === true || upgradePulse === 0
            ? false
            : { rotateY: 90, opacity: 1 }
        }
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: MOTION_DURATION_S, ease: MOTION_EASE }}
        className="h-full w-full"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <Card instance={instance} {...cardProps} />
      </motion.div>
    </motion.div>
  );
}
