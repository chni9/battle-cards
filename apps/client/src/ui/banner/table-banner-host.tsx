/**
 * V7 table banners (technical spec v7 §6.12, §8.1, §8.3): the center-screen cues of L51-06
 * (Your turn, You are being attacked, You are dead, You won!), the table-wide Sentence lines of
 * L63-03 and the own-Gambler wipe line of L67-01. Which cue fires stays in
 * `view-model/table-banner.ts`; this host only queues, times and paints them. It replaces
 * `screens/table/your-turn-flash.tsx` when L74-17 mounts it in the arena; the classic table
 * keeps that file until L75.
 *
 * - Three lanes (cue, Sentence, wipe), each a queue of `BannerItem`s showing its head for
 *   exactly `TABLE_BANNER_MS`. The hide timer is keyed on the head's item key, so a banner
 *   queued behind it never extends it (TableBannerFlash restarted it on every enqueue).
 * - Each lane owns one `role="status"` live region that stays mounted, empty between banners,
 *   and only its content swaps: a region that mounts together with its text is skipped by many
 *   screen readers. Cues are polite, Sentence and wipe assertive (`bannerLiveMode`). A rerender
 *   with the same state keeps the slab node, so a banner is announced once.
 * - The root is `pointer-events: none` on `Z_INDEX.banner` (90): above sheets and Minimize bars,
 *   below toasts, and never takes focus or a press. It renders in place, not in a portal, so its
 *   host must mount it outside any stacking context (L74-17).
 * - Entrance only, over `--dur-slow` on `--ease-entrance`; the next item mounts exactly at
 *   `TABLE_BANNER_MS`, with no exit (L78 owns banner juice). Reduced motion keeps the same
 *   text with a fade only: no slam, scale or tilt (§8.3).
 */

import { motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';

import type { ActionLogEntryView, PendingEffectView, SentenceAnnouncementLogEntry } from '@card-battle/shared';

import {
  emptySentenceBannerWatch,
  emptyTableBannerWatch,
  isFlashierBanner,
  nextSentenceBannerLines,
  nextTableBannerCues,
  nextWipeBannerLines,
  TABLE_BANNER_MS,
} from '../../view-model/table-banner';
import { Z_INDEX } from '../layers';
import { durationS, EASE_ENTRANCE } from '../motion/motion-tokens';
import { motionPropsFor, type V7MotionSpec } from '../motion/reduced-motion';
import { usePrefersReducedMotion } from '../motion/use-prefers-reduced-motion';
import { V7_COLORS } from '../palette';
import { CHROME_SHAPE_CLASS, motionAttribute } from '../primitives/chrome-classes';
import { bannerItemsForCues, bannerLiveMode, type BannerItem, type BannerKind } from './banner-items';

export interface TableBannerHostProps {
  isMyTurn: boolean;
  isEliminated: boolean;
  youWon: boolean;
  pendingEffects: readonly PendingEffectView[];
  sentenceAnnouncements: readonly SentenceAnnouncementLogEntry[];
  /** Full log. The wipe flash keeps only this seat's own bust. */
  actionLog: readonly ActionLogEntryView[];
  nicknameOf: (id: string) => string;
  you: string;
  /** Seat hex color for turn / win chrome (`v7SeatColor`); `--cta` when absent. */
  seatColor?: string;
}

const SLAM_TRANSITION = { duration: durationS('slow'), ease: EASE_ENTRANCE } as const;

const CUE_MOTION: V7MotionSpec = {
  initial: { opacity: 0, scale: 0.85, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0 },
  transition: SLAM_TRANSITION,
};

/** Attacked and You are dead land harder and stay slightly oversized (L51-06). */
const FLASHIER_MOTION: V7MotionSpec = {
  initial: { opacity: 0, scale: 0.72, y: 12 },
  animate: { opacity: 1, scale: 1.06, y: 0 },
  transition: SLAM_TRANSITION,
};

/** Sentence and wipe lines tilt in from further away: the gravest news (L63-03, L67-01). */
const LINE_MOTION: V7MotionSpec = {
  initial: { opacity: 0, scale: 0.62, y: 18, rotate: -4 },
  animate: { opacity: 1, scale: 1.04, y: 0, rotate: 0 },
  transition: SLAM_TRANSITION,
};

function slabMotion(kind: BannerKind): V7MotionSpec {
  if (kind === 'sentence' || kind === 'wipe') return LINE_MOTION;
  return isFlashierBanner(kind) ? FLASHIER_MOTION : CUE_MOTION;
}

/**
 * The slab fill. Every fill carries a `--text-on-cta` label at 4.5:1 or better
 * (`banner-items.test.ts`). A seat hue only ever fills Your turn and You won!, never an
 * element with `--life` or a `--threat-*` color (§5.1).
 */
function slabTone(kind: BannerKind, seatColor: string | undefined): string {
  switch (kind) {
    case 'turn':
    case 'won':
      return seatColor ?? V7_COLORS.cta;
    case 'attacked':
      return V7_COLORS['threat-attack'];
    case 'dead':
    case 'sentence':
    case 'wipe':
      return V7_COLORS.danger;
  }
}

/** One lane: a queue whose head shows for exactly `TABLE_BANNER_MS`, keyed on its item key. */
function useBannerLane(): readonly [BannerItem | undefined, (items: readonly BannerItem[]) => void] {
  const [queue, setQueue] = useState<readonly BannerItem[]>([]);
  const head = queue[0];
  const headKey = head?.key;

  useEffect(() => {
    if (headKey === undefined) return;
    const hideId = window.setTimeout(() => {
      setQueue((current) => (current[0]?.key === headKey ? current.slice(1) : current));
    }, TABLE_BANNER_MS);
    return () => {
      window.clearTimeout(hideId);
    };
  }, [headKey]);

  const enqueue = useCallback((items: readonly BannerItem[]): void => {
    setQueue((current) => [...current, ...items]);
  }, []);

  return [head, enqueue];
}

function lineItems(kind: 'sentence' | 'wipe', lines: readonly string[], startSeq: number): BannerItem[] {
  return lines.map((text, index) => ({ key: `${kind}:${String(startSeq + index)}`, kind, text }));
}

interface BannerSlabProps {
  item: BannerItem;
  tone: string;
  reduced: boolean;
}

function BannerSlab({ item, tone, reduced }: BannerSlabProps): ReactElement {
  const padding = item.kind !== 'sentence' && item.kind !== 'wipe' && !isFlashierBanner(item.kind) ? 'px-6 py-3' : 'px-8 py-4';
  return (
    <motion.p
      data-banner={item.kind}
      data-motion={motionAttribute(reduced)}
      className={`my-1.5 max-w-[min(92vw,30rem)] whitespace-pre-line text-balance wrap-anywhere text-center font-v7-display text-v7-display leading-tight ${padding} ${CHROME_SHAPE_CLASS}`}
      style={{ backgroundColor: tone, color: V7_COLORS['text-on-cta'] }}
      {...motionPropsFor(slabMotion(item.kind), reduced)}
    >
      {item.text}
    </motion.p>
  );
}

interface BannerRegionProps {
  live: 'polite' | 'assertive';
  item: BannerItem | undefined;
  seatColor: string | undefined;
  reduced: boolean;
}

/** A lane's live region: always mounted, holding at most its head slab. */
function BannerRegion({ live, item, seatColor, reduced }: BannerRegionProps): ReactElement {
  return (
    <div role="status" aria-live={live} className="flex w-full flex-col items-center">
      {item !== undefined ? (
        <BannerSlab key={item.key} item={item} tone={slabTone(item.kind, seatColor)} reduced={reduced} />
      ) : null}
    </div>
  );
}

export function TableBannerHost({
  isMyTurn,
  isEliminated,
  youWon,
  pendingEffects,
  sentenceAnnouncements,
  actionLog,
  nicknameOf,
  you,
  seatColor,
}: TableBannerHostProps): ReactElement {
  const reduced = usePrefersReducedMotion();
  const watch = useRef(emptyTableBannerWatch());
  const sentenceWatch = useRef(emptySentenceBannerWatch());
  const wipeWatch = useRef(emptySentenceBannerWatch());
  const seq = useRef(0);
  const [cueHead, enqueueCues] = useBannerLane();
  const [sentenceHead, enqueueSentence] = useBannerLane();
  const [wipeHead, enqueueWipe] = useBannerLane();

  useEffect(() => {
    const { cues, next } = nextTableBannerCues(watch.current, { isMyTurn, isEliminated, youWon, pendingEffects, you });
    watch.current = next;
    if (cues.length === 0) return;
    const items = bannerItemsForCues(cues, seq.current);
    seq.current += items.length;
    // Synchronous enqueue (L51-06): a deferred enqueue is cleared by React Strict Mode's
    // effect replay, which dropped the first-paint You are dead / You won! cues.
    enqueueCues(items);
  }, [isMyTurn, isEliminated, youWon, pendingEffects, you, enqueueCues]);

  useEffect(() => {
    const { lines, next } = nextSentenceBannerLines(sentenceWatch.current, {
      announcements: sentenceAnnouncements,
      nicknameOf,
      isEliminated,
      youWon,
    });
    sentenceWatch.current = next;
    if (lines.length === 0) return;
    const items = lineItems('sentence', lines, seq.current);
    seq.current += items.length;
    enqueueSentence(items);
  }, [sentenceAnnouncements, nicknameOf, isEliminated, youWon, enqueueSentence]);

  useEffect(() => {
    const { lines, next } = nextWipeBannerLines(wipeWatch.current, actionLog, you);
    wipeWatch.current = next;
    if (lines.length === 0) return;
    const items = lineItems('wipe', lines, seq.current);
    seq.current += items.length;
    enqueueWipe(items);
  }, [actionLog, you, enqueueWipe]);

  return (
    <div
      className="pointer-events-none fixed inset-0 flex flex-col items-center justify-center px-4"
      style={{ zIndex: Z_INDEX.banner }}
    >
      <BannerRegion live={bannerLiveMode('turn')} item={cueHead} seatColor={seatColor} reduced={reduced} />
      <BannerRegion live={bannerLiveMode('sentence')} item={sentenceHead} seatColor={seatColor} reduced={reduced} />
      <BannerRegion live={bannerLiveMode('wipe')} item={wipeHead} seatColor={seatColor} reduced={reduced} />
    </div>
  );
}
