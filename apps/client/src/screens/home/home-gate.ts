/**
 * How to play soft gate rules (technical spec v7 §7.1; L42-02, L51-02; Appendix A `home-how-to-play-soft-gate`),
 * and the path Home opens at mount (a seeded solo menu, or an invite link through the gate: L76-17).
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

export type HomeMountMode = 'hub' | HowToPlayContinueTarget;

export interface HomeMountEntry {
  /** The path Home shows first. */
  readonly mode: HomeMountMode;
  /** The path waiting behind a gated How to play opened at mount, else null. */
  readonly gatedTarget: HowToPlayContinueTarget | null;
}

/**
 * Where Home opens (spec v7 §7.1; L76-17). A solo Play again seed skips the gate, as it always has;
 * an invite link (`openOnline`) enters Online, behind the soft gate until How to play was seen.
 */
export function homeMountEntry(input: {
  readonly soloSeed: boolean;
  readonly openOnline: boolean;
  readonly howToPlaySeen: boolean;
}): HomeMountEntry {
  if (input.soloSeed) {
    return { mode: 'solo', gatedTarget: null };
  }
  if (input.openOnline) {
    return input.howToPlaySeen ? { mode: 'online', gatedTarget: null } : { mode: 'hub', gatedTarget: 'online' };
  }
  return { mode: 'hub', gatedTarget: null };
}
