/**
 * Center-screen table banners — L51-06 / L63-03.
 * Your turn, incoming attack, death, You won!, and caster-only Sentence.
 * Pointer-events-none, ~1.6s.
 */

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type ReactElement } from 'react';

import type { PendingEffectView, SentenceAnnouncementLogEntry } from '@card-battle/shared';

import { MOTION_EASE } from '../../fx/motion-timing';
import { seatColorAlpha, seatColorWash } from '../../design/seat-colors';
import {
  emptySentenceBannerWatch,
  emptyTableBannerWatch,
  isFlashierBanner,
  nextSentenceBannerLines,
  nextTableBannerCues,
  TABLE_BANNER_COPY,
  TABLE_BANNER_MS,
  type TableBannerCue,
} from './table-banner';

const ATTACK_RED = '#d62828';

export interface TableBannerFlashProps {
  isMyTurn: boolean;
  isEliminated: boolean;
  youWon: boolean;
  pendingEffects: readonly PendingEffectView[];
  sentenceAnnouncements: readonly SentenceAnnouncementLogEntry[];
  nicknameOf: (id: string) => string;
  you: string;
  /** Seat hex color for turn / win chrome. */
  seatColor?: string;
}

export function TableBannerFlash({
  isMyTurn,
  isEliminated,
  youWon,
  pendingEffects,
  sentenceAnnouncements,
  nicknameOf,
  you,
  seatColor = '#f0c419',
}: TableBannerFlashProps): ReactElement {
  const reduceMotion = useReducedMotion();
  const watch = useRef(emptyTableBannerWatch());
  const sentenceWatch = useRef(emptySentenceBannerWatch());
  const [queue, setQueue] = useState<readonly TableBannerCue[]>([]);
  const [sentenceQueue, setSentenceQueue] = useState<readonly string[]>([]);
  const cue = queue[0];
  const sentenceLines = sentenceQueue[0];

  useEffect(() => {
    const { cues, next } = nextTableBannerCues(watch.current, {
      isMyTurn,
      isEliminated,
      youWon,
      pendingEffects,
      you,
    });
    watch.current = next;
    if (cues.length === 0) {
      return undefined;
    }
    // Synchronous enqueue: a 0ms timeout is cleared on React Strict Mode's
    // immediate remount, which dropped seed cues (You are dead / You won!).
    setQueue((current) => [...current, ...cues]);
    return undefined;
  }, [isMyTurn, isEliminated, youWon, pendingEffects, you]);

  useEffect(() => {
    const { lines, next } = nextSentenceBannerLines(sentenceWatch.current, {
      announcements: sentenceAnnouncements,
      nicknameOf,
      isEliminated,
      youWon,
    });
    sentenceWatch.current = next;
    if (lines.length === 0) {
      return undefined;
    }
    setSentenceQueue((current) => [...current, ...lines]);
    return undefined;
  }, [sentenceAnnouncements, nicknameOf, isEliminated, youWon]);

  useEffect(() => {
    if (queue.length === 0) {
      return undefined;
    }
    const hideId = window.setTimeout(() => {
      setQueue((current) => current.slice(1));
    }, TABLE_BANNER_MS);
    return () => {
      window.clearTimeout(hideId);
    };
  }, [queue]);

  useEffect(() => {
    if (sentenceQueue.length === 0) {
      return undefined;
    }
    const hideId = window.setTimeout(() => {
      setSentenceQueue((current) => current.slice(1));
    }, TABLE_BANNER_MS);
    return () => {
      window.clearTimeout(hideId);
    };
  }, [sentenceQueue]);

  const flashier = cue !== undefined && isFlashierBanner(cue);
  const chrome = flashier ? ATTACK_RED : seatColor;

  return (
    <AnimatePresence>
      {cue !== undefined ? (
        <motion.div
          key={`table-banner-${cue}-${String(queue.length)}`}
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center"
          initial={reduceMotion === true ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion === true ? 0.15 : 0.35, ease: MOTION_EASE }}
        >
          <motion.p
            className={[
              'rounded-[length:var(--radius-card)] px-8 py-4 font-bold tracking-tight text-ink sm:px-12 sm:py-5',
              flashier
                ? 'border-8 text-3xl sm:text-4xl'
                : 'border-4 text-2xl sm:text-3xl',
            ].join(' ')}
            style={{
              borderColor: chrome,
              backgroundColor: seatColorWash(chrome, flashier ? 0.72 : 0.55),
              boxShadow: flashier
                ? `0 0 0 6px ${seatColorAlpha(chrome, 0.5)}, 0 16px 48px rgba(214,40,40,0.45)`
                : `0 0 0 4px ${seatColorAlpha(chrome, 0.35)}, 0 12px 40px rgba(28,26,31,0.35)`,
            }}
            initial={
              reduceMotion === true
                ? false
                : { scale: flashier ? 0.72 : 0.85, y: 12 }
            }
            animate={{ scale: flashier ? 1.06 : 1, y: 0 }}
            {...(reduceMotion === true
              ? {}
              : { exit: { scale: 0.92, y: -8 } })}
            transition={{ duration: reduceMotion === true ? 0 : 0.4, ease: MOTION_EASE }}
          >
            {TABLE_BANNER_COPY[cue]}
          </motion.p>
        </motion.div>
      ) : null}
      {sentenceLines !== undefined ? (
        <motion.div
          key={`sentence-banner-${sentenceLines}-${String(sentenceQueue.length)}`}
          role="status"
          aria-live="assertive"
          className="pointer-events-none fixed inset-0 z-[91] flex items-center justify-center"
          initial={reduceMotion === true ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion === true ? 0.15 : 0.35, ease: MOTION_EASE }}
        >
          <motion.p
            data-banner="sentence"
            className="whitespace-pre-line rounded-[length:var(--radius-card)] border-8 px-8 py-4 text-center text-3xl font-black tracking-tight sm:px-12 sm:py-5 sm:text-4xl"
            style={{
              borderColor: ATTACK_RED,
              backgroundColor: seatColorWash(ATTACK_RED, 0.82),
              boxShadow: `0 0 0 8px ${seatColorAlpha(ATTACK_RED, 0.55)}, 0 20px 56px rgba(214,40,40,0.6)`,
              color: '#fff8f0',
            }}
            initial={
              reduceMotion === true ? false : { scale: 0.62, y: 18, rotate: -4 }
            }
            animate={
              reduceMotion === true
                ? { scale: 1, y: 0, rotate: 0 }
                : { scale: [1.12, 1.04, 1.1], y: 0, rotate: [0, -1.5, 1.5, 0] }
            }
            {...(reduceMotion === true
              ? {}
              : { exit: { scale: 0.88, y: -10, rotate: 3 } })}
            transition={{ duration: reduceMotion === true ? 0 : 0.55, ease: MOTION_EASE }}
          >
            {sentenceLines}
          </motion.p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
