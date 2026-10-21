import type { HTMLMotionProps } from 'motion/react';
import { describe, expect, it } from 'vitest';
import { CARD_SPRING, durationS } from './motion-tokens';
import { motionPropsFor, motionSpecFor, reduceMotionSpec, type V7MotionSpec, type V7MotionTarget } from './reduced-motion';

const FAST_TWEEN = { type: 'tween', duration: durationS('fast') };
const slam: V7MotionSpec = {
  initial: { opacity: 0, x: -24, y: '40%', scale: 1.6, rotate: -8, color: '#ff3d7f' },
  animate: { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, color: '#f3eeff', backgroundColor: '#1f1850', boxShadow: '0 4px 0 #0c0920' },
  exit: { opacity: 0, scale: 0.8, y: 12 },
  transition: CARD_SPRING,
};
function expectNoTransform(target: V7MotionTarget | undefined): void {
  expect(target).toBeDefined();
  for (const key of ['x', 'y', 'scale', 'rotate']) expect(target).not.toHaveProperty(key);
}

describe('reduceMotionSpec (technical spec v7 §5.7, §8.3)', () => {
  it('drops every transform and scale key from initial, animate and exit', () => {
    const r = reduceMotionSpec(slam);
    [r.initial, r.animate, r.exit].forEach(expectNoTransform);
  });
  it('keeps fades and color flashes and turns the spring into a fast tween', () => {
    expect(reduceMotionSpec(slam)).toStrictEqual({
      initial: { opacity: 0, color: '#ff3d7f' },
      animate: { opacity: 1, color: '#f3eeff', backgroundColor: '#1f1850', boxShadow: '0 4px 0 #0c0920' },
      exit: { opacity: 0 },
      transition: FAST_TWEEN,
    });
  });
  it('gives a fast tween even when the spec had no transition', () => {
    expect(reduceMotionSpec({ animate: { opacity: 1 } }).transition).toStrictEqual(FAST_TWEEN);
  });
  it('omits absent targets and keys instead of setting them to undefined', () => {
    const r = reduceMotionSpec({ animate: { x: 40 } });
    expect(Object.keys(r).sort()).toEqual(['animate', 'transition']);
    expect(Object.keys(r.animate)).toEqual([]);
  });
  it('does not mutate its input', () => {
    const before = structuredClone(slam);
    reduceMotionSpec(slam);
    expect(slam).toStrictEqual(before);
  });
});
describe('motionSpecFor', () => {
  it('returns the spec untouched when motion is allowed', () => {
    expect(motionSpecFor(slam, false)).toBe(slam);
  });
  it('returns the reduced spec when the user prefers reduced motion', () => {
    expect(motionSpecFor(slam, true)).toStrictEqual(reduceMotionSpec(slam));
  });
});

describe('motionPropsFor (L72-09)', () => {
  it('returns motionSpecFor as props a motion element accepts', () => {
    const full: Pick<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'exit' | 'transition'> = motionPropsFor(slam, false);
    expect(full).toStrictEqual(slam);
    expect(motionPropsFor(slam, true)).toStrictEqual(reduceMotionSpec(slam));
  });
  it('omits absent targets instead of setting them to undefined', () => {
    expect(Object.keys(motionPropsFor({ animate: { opacity: 1 } }, false))).toEqual(['animate']);
  });
});
