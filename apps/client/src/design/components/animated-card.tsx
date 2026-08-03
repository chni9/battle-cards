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
};

export function AnimatedCard({
  instance,
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

  return (
    <motion.div
      data-instance-id={instance.instanceId}
      className="h-full w-full [perspective:600px]"
      initial={
        reduceMotion === true ? false : { opacity: 0, rotateY: -70, scale: 0.96 }
      }
      animate={{ opacity: 1, rotateY: 0, scale: 1 }}
      transition={{ duration: MOTION_DURATION_S, ease: MOTION_EASE }}
    >
      <motion.div
        key={upgradePulse}
        initial={
          reduceMotion === true || upgradePulse === 0
            ? false
            : { rotateY: 90, opacity: 0.6 }
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
