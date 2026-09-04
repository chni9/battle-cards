/**
 * Constant-time UTF-8 compare (technical spec v6 §7.3 / L47-04).
 * Pads to a shared length so a mismatch does not return before timingSafeEqual.
 */

import { timingSafeEqual } from 'node:crypto';

export function timingSafeEqualUtf8(left: string, right: string): boolean {
  const leftBuf = Buffer.from(left, 'utf8');
  const rightBuf = Buffer.from(right, 'utf8');
  const size = Math.max(leftBuf.length, rightBuf.length, 1);
  const paddedLeft = Buffer.alloc(size);
  const paddedRight = Buffer.alloc(size);
  leftBuf.copy(paddedLeft);
  rightBuf.copy(paddedRight);
  const sameBytes = timingSafeEqual(paddedLeft, paddedRight);
  return sameBytes && leftBuf.length === rightBuf.length;
}
