/** What's new auto-open: technical spec v7 §7.1; L63-07, L65-05; Appendix A `home-whats-new`, `home-whats-new-seen-storage`. */
import { describe, expect, it } from 'vitest';

import { whatsNewAutoScope, type WhatsNewAutoTrigger } from './home-whats-new';

const TRIGGERS: readonly WhatsNewAutoTrigger[] = ['mount', 'back-to-hub', 'how-to-play-manual-close'];

describe('whatsNewAutoScope (L65-05)', () => {
  it('opens the latest entry alone for every trigger while it is unseen; How to play never blocks it', () => {
    expect(TRIGGERS.map((trigger) => whatsNewAutoScope(trigger, true))).toEqual(['current', 'current', 'current']);
  });

  it('stays closed for every trigger once the latest entry is seen', () => {
    expect(TRIGGERS.map((trigger) => whatsNewAutoScope(trigger, false))).toEqual([null, null, null]);
  });
});
