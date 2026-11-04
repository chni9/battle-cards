/**
 * How to play soft gate rules (technical spec v7 §7.1; L42-02, L51-02; Appendix A `home-how-to-play-soft-gate`).
 * Pure: reads no storage (`ui/help-storage.ts` does).
 */

import type { HowToPlayContinueTarget } from '../../ui/help-storage';
import type { HowToPlayCloseReason } from '../how-to-play-dialog';

export interface HowToPlayCloseOutcome {
  /** markHowToPlaySeen() before anything else. */
  readonly markSeen: boolean;
  /** The path to enter, or null to stay where we are. */
  readonly enter: HowToPlayContinueTarget | null;
  /** Run the What's new re-check (manual closes only). */
  readonly checkWhatsNew: boolean;
}

export function howToPlayCloseOutcome(
  pendingTarget: HowToPlayContinueTarget | null,
  reason: HowToPlayCloseReason,
): HowToPlayCloseOutcome {
  if (pendingTarget !== null) {
    return { markSeen: true, enter: pendingTarget, checkWhatsNew: false };
  }
  return { markSeen: reason !== 'dismiss', enter: null, checkWhatsNew: true };
}
