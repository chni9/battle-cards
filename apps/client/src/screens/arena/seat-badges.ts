/**
 * Seat badge icon and words — technical spec v7 §6.2 (at most two status badges plus "+n"),
 * §11 (Q47: the Gambler draw gain); L74-04. The seat prints the icon and a short value and
 * speaks the words; the seat sheet (L74-05) prints the words.
 *
 * Words reuse V2 verbatim: `Spying on you` (`opponent-zone.tsx`), `Block · N left`,
 * `Block · attacks banned` and `Reanimating` (`flow-status-badges.tsx`), `Duplication active`
 * (`private-zone.tsx`), the card face words (`cardFaceLabel`) and the Draw aria pattern
 * `Draw, plus N pts` (plan Appendix A.8 ruling 4). `Absorber window` and `more statuses` are
 * new (plan Appendix B, §10.6).
 */

import { getCard, type CardId } from '@card-battle/shared';

import { cardFaceLabel, type CardCounter } from '../../ui/card/card-face';
import { spokenGlyphAmount } from '../../ui/card/glyph-amount';
import type { IconName } from '../../ui/icons/icon-names';
import { DRAW_ACTION_LABEL } from '../../view-model/chrome-labels';
import type { SeatBadge } from '../../view-model/seats';

/** Screen-reader words after a seat's "+n" (plan Appendix B, §10.6). */
export const SEAT_MORE_STATUSES_LABEL = 'more statuses';
/** An eliminated seat's open Absorber window (plan Appendix B, §10.6). */
export const ABSORB_WINDOW_LABEL = 'Absorber window';

export interface SeatBadgeView {
  icon: IconName;
  /** Spoken and `title` words on the seat; the visible label in the seat sheet. */
  label: string;
  /** The short value printed beside the icon on the seat, else null. */
  value: string | null;
}

function unreachable(value: never): never {
  void value;
  throw new Error('Unhandled seat badge');
}

/** The card words a seat badge speaks, from the catalog name (an unknown id falls back to the id). */
function cardWords(cardId: CardId, isUpgraded: boolean, counter?: CardCounter): string {
  return cardFaceLabel({
    name: getCard(cardId)?.name ?? cardId,
    isUpgraded,
    damage: null,
    ...(counter !== undefined ? { counter } : {}),
  });
}

export function seatBadgeView(badge: SeatBadge): SeatBadgeView {
  switch (badge.kind) {
    case 'spying-on-you':
      return { icon: 'spying-on-you', label: 'Spying on you', value: null };
    case 'block':
      return badge.turnsRemaining > 0
        ? { icon: 'block', label: `Block · ${String(badge.turnsRemaining)} left`, value: String(badge.turnsRemaining) }
        : { icon: 'block', label: 'Block · attacks banned', value: null };
    case 'invisibility': {
      const { effect } = badge;
      if (effect.counter === null) {
        return { icon: 'invisibility', label: cardWords(effect.cardId, effect.isUpgraded), value: null };
      }
      const amount = effect.counter;
      return {
        icon: 'invisibility',
        label: cardWords(effect.cardId, effect.isUpgraded, { kind: 'turns', amount }),
        value: String(amount),
      };
    }
    case 'sentence': {
      const amount = badge.sentence.remainingOwnerTurns;
      return {
        icon: 'sentence-ticking',
        label: cardWords('sentence', badge.sentence.isUpgraded, { kind: 'turns', amount }),
        value: String(amount),
      };
    }
    case 'shield':
      return { icon: 'shield-active', label: cardWords('shield', badge.isUpgraded), value: null };
    case 'persistent': {
      const { effect } = badge;
      if (effect.counter === null) {
        return { icon: 'persistent', label: cardWords(effect.cardId, effect.isUpgraded), value: null };
      }
      const amount = effect.counter;
      return {
        icon: 'persistent',
        label: cardWords(effect.cardId, effect.isUpgraded, { kind: 'card-lives', amount }),
        value: String(amount),
      };
    }
    case 'duplication':
      return { icon: 'duplication-active', label: 'Duplication active', value: null };
    case 'draw-gain':
      return {
        icon: 'draw',
        label: `${DRAW_ACTION_LABEL}, ${spokenGlyphAmount({ kind: 'points', amount: badge.amount }, { signed: 'gain' })}`,
        value: `+${String(badge.amount)}`,
      };
    case 'reanimation':
      return { icon: 'reanimation-armed', label: 'Reanimating', value: null };
    case 'absorb-window':
      return { icon: 'absorb-window', label: ABSORB_WINDOW_LABEL, value: null };
    default:
      return unreachable(badge);
  }
}
