/**
 * Home Beta badge and card fan (BetaCard, HomeArt): technical spec v7 §7.1 (the hub's art and the
 * Beta badge), §5.4 (holo Card), §5.5 (base drawings only), §8.3 (reduced motion); Appendix A
 * `home-beta-badge`, `global-art-catalog`.
 *
 * `HomeArt` is the hub's fan of five base cards. It is decorative (`aria-hidden`), so the holo
 * `Card` articles stay out of the accessibility tree. Each card floats through `motionPropsFor`;
 * `reduceMotionSpec` drops `y` and the loop, so under reduced motion nothing moves and no
 * transform is written. The float is a `motion` loop rather than a CSS keyframe, so no `ui/` file
 * changes (L76-04).
 *
 * `BetaCard` is the word Beta on a flat chrome badge. It is not positioned: the Home corner row
 * places it beside the New control.
 */

import type { CardId } from '@card-battle/shared';
import { motion } from 'motion/react';
import type { ReactElement } from 'react';

import { Card } from '../../ui/card/card';
import { motionPropsFor, type V7MotionSpec } from '../../ui/motion/reduced-motion';
import { usePrefersReducedMotion } from '../../ui/motion/use-prefers-reduced-motion';
import { CHROME_FLAT_SM_CLASS, motionAttribute } from '../../ui/primitives/chrome-classes';

/** Left to right; each card's static tilt and drop. No Super Regeneration: no release copy outside RELEASE_NOTES. */
const FAN_CARDS: readonly { readonly cardId: CardId; readonly tilt: string }[] = [
  { cardId: 'spy', tilt: '-rotate-12 translate-y-4' },
  { cardId: 'strong-attack', tilt: '-rotate-6 translate-y-1' },
  { cardId: 'basic-attack', tilt: '' },
  { cardId: 'mirror', tilt: 'rotate-6 translate-y-1' },
  { cardId: 'shield', tilt: 'rotate-12 translate-y-4' },
];

/** A slow mirrored bob, offset per card so the fan never moves in step. */
function fanFloat(index: number): V7MotionSpec {
  return {
    initial: { y: 0 },
    animate: { y: -8 },
    transition: { duration: 3.2, delay: index * 0.4, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' },
  };
}

export function BetaCard(): ReactElement {
  return (
    <aside
      data-zone="beta-card"
      className={`${CHROME_FLAT_SM_CLASS} inline-flex min-h-7 items-center bg-v7-panel-2 px-2`}
    >
      <p className="font-v7-body text-v7-caption font-extrabold uppercase tracking-[0.16em] text-v7-text">
        Beta
      </p>
    </aside>
  );
}

export function HomeArt(): ReactElement {
  const reduced = usePrefersReducedMotion();
  return (
    <div
      aria-hidden="true"
      data-home-card-fan
      data-motion={motionAttribute(reduced)}
      className="pointer-events-none relative flex h-40 w-full items-end justify-center overflow-x-clip sm:h-48"
    >
      {FAN_CARDS.map(({ cardId, tilt }, index) => (
        <div key={cardId} className={`-mx-4 ${tilt}`.trim()}>
          <motion.div data-home-fan-card {...motionPropsFor(fanFloat(index), reduced)}>
            <Card
              size="tile"
              className="[--card-w:clamp(64px,19vw,104px)]"
              instance={{ instanceId: `home-fan-${cardId}`, cardId, isUpgraded: false }}
            />
          </motion.div>
        </div>
      ))}
    </div>
  );
}
