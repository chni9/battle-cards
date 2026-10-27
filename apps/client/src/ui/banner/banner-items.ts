/**
 * Table banner items (technical spec v7 §6.12, §8.1): the keyed, displayable form of the
 * L51-06 cues (Your turn, attacked, You are dead, You won!), the L63-03 Sentence lines and the
 * L67-01 own-Gambler wipe line. Which cue fires stays in `view-model/table-banner.ts`; this
 * module only names each item, sorts it into its lane and picks the lane's live-region mode.
 */

import { TABLE_BANNER_COPY, type TableBannerCue } from '../../view-model/table-banner';

export type BannerKind = TableBannerCue | 'sentence' | 'wipe';

/** The host's three queues; each owns one live region. */
export type BannerLane = 'cue' | 'sentence' | 'wipe';

export const BANNER_LANES: readonly BannerLane[] = ['cue', 'sentence', 'wipe'];

/**
 * The one lane-to-mode map. Sentence lines are table-wide and can name the victim (L63-03),
 * and the wipe line reports a total loss (L67-01), so both interrupt; the four POV cues wait
 * their turn. A region keeps its mode for its whole life, so every kind in a lane shares it.
 */
export const BANNER_LANE_LIVE_MODE: Readonly<Record<BannerLane, 'polite' | 'assertive'>> = {
  cue: 'polite',
  sentence: 'assertive',
  wipe: 'assertive',
};

export interface BannerItem {
  /** `${kind}:${seq}`, unique per host: it keys the slab and its hide timer. */
  readonly key: string;
  readonly kind: BannerKind;
  readonly text: string;
}

export function bannerLaneOf(kind: BannerKind): BannerLane {
  return kind === 'sentence' || kind === 'wipe' ? kind : 'cue';
}

export function bannerLiveMode(kind: BannerKind): 'polite' | 'assertive' {
  return BANNER_LANE_LIVE_MODE[bannerLaneOf(kind)];
}

export function bannerItemsForCues(cues: readonly TableBannerCue[], startSeq: number): BannerItem[] {
  return cues.map((cue, index) => ({
    key: `${cue}:${String(startSeq + index)}`,
    kind: cue,
    text: TABLE_BANNER_COPY[cue],
  }));
}
