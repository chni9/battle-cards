/** How to play soft gate: technical spec v7 §7.1; L42-02, L51-02; Appendix A `home-how-to-play-soft-gate`, `home-how-to-play-dismiss`. */
import { describe, expect, it } from 'vitest';

import type { HowToPlayContinueTarget } from '../../ui/help-storage';
import type { HowToPlayCloseReason } from '../how-to-play-dialog';
import { homeMountEntry, howToPlayCloseOutcome } from './home-gate';

const TARGETS: readonly HowToPlayContinueTarget[] = ['online', 'solo', 'tutorial'];
const REASONS: readonly HowToPlayCloseReason[] = ['skip', 'got-it', 'dismiss'];

describe('howToPlayCloseOutcome (L42-02)', () => {
  it("a gated close of any kind marks seen and enters the chosen path, with no What's new check", () => {
    for (const target of TARGETS) {
      for (const reason of REASONS) {
        expect(howToPlayCloseOutcome(target, reason)).toEqual({ markSeen: true, enter: target, checkWhatsNew: false });
      }
    }
  });

  it("a manual Skip or Got it marks seen and re-checks What's new", () => {
    expect(howToPlayCloseOutcome(null, 'skip')).toEqual({ markSeen: true, enter: null, checkWhatsNew: true });
    expect(howToPlayCloseOutcome(null, 'got-it')).toEqual({ markSeen: true, enter: null, checkWhatsNew: true });
  });

  it("a manual dismiss (Esc, backdrop) does not mark seen and re-checks What's new", () => {
    expect(howToPlayCloseOutcome(null, 'dismiss')).toEqual({ markSeen: false, enter: null, checkWhatsNew: true });
  });
});

describe('homeMountEntry (L76-17; spec v7 §7.1)', () => {
  it('opens a seeded solo menu first, an invite on Online (behind the gate while unseen), else the hub', () => {
    const entry = (soloSeed: boolean, openOnline: boolean, howToPlaySeen: boolean) => homeMountEntry({ soloSeed, openOnline, howToPlaySeen });
    expect(entry(true, true, false)).toEqual({ mode: 'solo', gatedTarget: null });
    expect(entry(false, true, true)).toEqual({ mode: 'online', gatedTarget: null });
    expect(entry(false, true, false)).toEqual({ mode: 'hub', gatedTarget: 'online' });
    expect(entry(false, false, false)).toEqual({ mode: 'hub', gatedTarget: null });
    expect(entry(false, false, true)).toEqual({ mode: 'hub', gatedTarget: null });
  });
});
