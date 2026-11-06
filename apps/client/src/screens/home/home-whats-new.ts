/**
 * When Home opens What's new by itself (technical spec v7 §7.1; L63-07, L65-05; Appendix A `home-whats-new`).
 * Pure: reads no storage; the caller passes whether the latest entry is unseen.
 */

import type { WhatsNewScope } from '@card-battle/shared';

import { shouldAutoOpenWhatsNew } from '../../ui/release-storage';

export type WhatsNewAutoTrigger = 'mount' | 'back-to-hub' | 'how-to-play-manual-close';

/**
 * The trigger names the call site; every one gives the same answer because How to play never blocks
 * What's new (`shouldAutoOpenWhatsNew`). The New control opens 'history' itself. The exhaustive switch
 * makes a future trigger choose its own answer.
 */
export function whatsNewAutoScope(
  trigger: WhatsNewAutoTrigger,
  latestUnseen: boolean,
): WhatsNewScope | null {
  switch (trigger) {
    case 'mount':
    case 'back-to-hub':
    case 'how-to-play-manual-close':
      return shouldAutoOpenWhatsNew({ latestUnseen }) ? 'current' : null;
  }
}
