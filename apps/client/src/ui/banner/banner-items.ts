/**
 * Table banner items (technical spec v7 §6.12, §8.1): the keyed, displayable form of the
 * L51-06 cues (Your turn, attacked, You are dead, You won!), the L63-03 Sentence lines and the
 * L67-01 own-Gambler wipe line. Which cue fires stays in `view-model/table-banner.ts`; this
 * module only names each item and picks its live-region mode.
 */

import { TABLE_BANNER_COPY, type TableBannerCue } from '../../view-model/table-banner';

export type BannerKind = TableBannerCue | 'sentence' | 'wipe';

export interface BannerItem {
  /** `${kind}:${seq}`, unique per host: it keys the slab and its hide timer. */
  readonly key: string;
  readonly kind: BannerKind;
  readonly text: string;
}

/**
 * Sentence lines are table-wide and can name the victim (L63-03), and the wipe line reports a
 * total loss (L67-01), so both interrupt; the four POV cues wait their turn.
 */
export function bannerLiveMode(kind: BannerKind): 'polite' | 'assertive' {
  return kind === 'sentence' || kind === 'wipe' ? 'assertive' : 'polite';
}

export function bannerItemsForCues(cues: readonly TableBannerCue[], startSeq: number): BannerItem[] {
  return cues.map((cue, index) => ({
    key: `${cue}:${String(startSeq + index)}`,
    kind: cue,
    text: TABLE_BANNER_COPY[cue],
  }));
}
