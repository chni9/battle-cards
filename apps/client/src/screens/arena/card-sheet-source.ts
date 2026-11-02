/**
 * Card sheet sources — technical spec v7 §6.6.1 (the card sheet), §5.4 (the card face); Lot 74
 * plan Appendix A.5 and A.8 ruling 1; L56-05 (a log or queue card shows the catalog face with no
 * footer).
 *
 * A source says where a card came from. Every switch on `kind` ends in a `never` default, so a
 * new source (L74-14 added pool and shop) is a type error here, not a silent fallthrough.
 *
 * The labels below are the V2 `screens/table/card-actions.tsx` copy, reused verbatim: the arena
 * never imports `screens/table/` (L74-01 import rule), so they are restated, not new strings.
 */

import {
  getCard,
  type CardId,
  type CardInstance,
  type PlayingStateView,
  type SharedCardId,
} from '@card-battle/shared';

import { inPlayThumbs, type CardRef, type InPlayThumb } from '../../view-model/card-actions';
import type { CardCounter } from '../../ui/card/card-face';
import { unreachable } from './unreachable';

export type CardSheetSource =
  | { kind: 'hand'; instance: CardInstance }
  | { kind: 'special'; instance: CardInstance }
  /** An own or an opponent in-play card: Shield, active persistent, ticking Sentence (L73-07). */
  | { kind: 'in-play'; thumb: InPlayThumb }
  /** A Spy+ or death-frozen hand / special of another seat (§6.3). */
  | { kind: 'spy-reveal'; instance: CardInstance; ownerPlayerId: string }
  /** A plate badge or arrow label: catalog-only face, no footer (L56-05). */
  | { kind: 'queue'; effectId: string; cardId: CardId; isUpgraded: boolean }
  /** A log card: catalog-only face, no footer (L56-05). Opened by the plate's landing card (L74-06) and the log (L74-15). */
  | { kind: 'log'; cardId: CardId; isUpgraded: boolean }
  /** A public pool face (§6.8): read-only, no footer. */
  | { kind: 'pool'; instance: CardInstance }
  /** A Shop tile's catalog face at the kit's tier (§6.8): read-only, no footer. */
  | { kind: 'shop'; cardId: SharedCardId; isUpgraded: boolean };

export const ACTIVE_LABEL = 'Active';
export const CARD_LIVES_LABEL = 'Card lives';
export const TURNS_LEFT_LABEL = 'Turns left';
export const SPY_REVEAL_LABEL = 'Spy reveal — inspect only';

const FALLBACK_TITLE = 'Card';

export interface CardSheetCount {
  readonly label: typeof CARD_LIVES_LABEL | typeof TURNS_LEFT_LABEL;
  readonly value: number;
}

export type CardSheetContext =
  | { readonly kind: 'active'; readonly count: CardSheetCount | null }
  | { readonly kind: 'spy-reveal' }
  | null;

/** hand → zone 'hand', special → 'special', in-play → thumb.ref, others → 'read-only'. */
export function cardRefFor(source: CardSheetSource): CardRef {
  switch (source.kind) {
    case 'hand':
      return { zone: 'hand', instance: source.instance };
    case 'special':
      return { zone: 'special', instance: source.instance };
    case 'in-play':
      return source.thumb.ref;
    case 'spy-reveal':
    case 'pool':
      return { zone: 'read-only', instance: source.instance };
    case 'queue':
    case 'log':
    case 'shop':
      return { zone: 'read-only', instance: sheetInstanceFor(source) };
    default:
      return unreachable(source);
  }
}

/**
 * The ref `cardActions` reads against the latest view (Lot 74 Review Focus 1). A held hand or
 * special card takes its live instance (an upgrade since the sheet opened). One that left
 * `view.self` (played, stolen, sold, transformed) becomes `{ zone: 'read-only', instance }`, so no
 * action can name a stale instance. Every other source is `cardRefFor(source)`; an in-play ref
 * needs no check, because `cardActions` already gives a card it no longer finds as the POV's own
 * `actions: []`.
 */
export function liveCardRefFor(source: CardSheetSource, view: PlayingStateView): CardRef {
  switch (source.kind) {
    case 'hand': {
      const live = view.self.hand.find((card) => card.instanceId === source.instance.instanceId);
      return live === undefined
        ? { zone: 'read-only', instance: source.instance }
        : { zone: 'hand', instance: live };
    }
    case 'special': {
      const live = view.self.specialCards.find((card) => card.instanceId === source.instance.instanceId);
      return live === undefined
        ? { zone: 'read-only', instance: source.instance }
        : { zone: 'special', instance: live };
    }
    case 'in-play':
    case 'spy-reveal':
    case 'queue':
    case 'log':
    case 'pool':
    case 'shop':
      return cardRefFor(source);
    default:
      return unreachable(source);
  }
}

/** queue: `{ instanceId: `queue-${effectId}`, cardId, isUpgraded }`; log: `log-${cardId}-${'up'|'base'}`; shop: `shop-${cardId}`. */
export function sheetInstanceFor(source: CardSheetSource): CardInstance {
  switch (source.kind) {
    case 'hand':
    case 'special':
    case 'spy-reveal':
    case 'pool':
      return source.instance;
    case 'in-play':
      return source.thumb.instance;
    case 'queue':
      return { instanceId: `queue-${source.effectId}`, cardId: source.cardId, isUpgraded: source.isUpgraded };
    case 'log':
      return {
        instanceId: `log-${source.cardId}-${source.isUpgraded ? 'up' : 'base'}`,
        cardId: source.cardId,
        isUpgraded: source.isUpgraded,
      };
    case 'shop':
      // The id `shop()` gives the tile (view-model/shop.ts), so the inspect keys like its tile.
      return { instanceId: `shop-${source.cardId}`, cardId: source.cardId, isUpgraded: source.isUpgraded };
    default:
      return unreachable(source);
  }
}

/** The card name, as the V2 dialog titled it: no upgraded suffix (the face's accessible name says "upgraded"). */
export function cardSheetTitle(source: CardSheetSource): string {
  return getCard(sheetInstanceFor(source).cardId)?.name ?? FALLBACK_TITLE;
}

/**
 * The activated look is the `counter` glow, only for a persistent's card lives or Invisibility
 * turns. Shield and a Sentence never get one (A.8 ruling 1, the L72 `global-activated-art-guard`).
 */
export function cardSheetCounter(source: CardSheetSource): CardCounter | null {
  switch (source.kind) {
    case 'in-play': {
      const { badge } = source.thumb;
      if (badge === null) {
        return null;
      }
      switch (badge.kind) {
        case 'card-lives':
          return { kind: 'card-lives', amount: badge.value };
        case 'turns':
          return { kind: 'turns', amount: badge.value };
        case 'sentence-turns':
          return null;
        default:
          return unreachable(badge);
      }
    }
    case 'hand':
    case 'special':
    case 'spy-reveal':
    case 'queue':
    case 'log':
    case 'pool':
    case 'shop':
      return null;
    default:
      return unreachable(source);
  }
}

function countFor(source: Extract<CardSheetSource, { kind: 'in-play' }>): CardSheetCount | null {
  const { badge } = source.thumb;
  if (badge === null) {
    return null;
  }
  switch (badge.kind) {
    case 'card-lives':
      return { label: CARD_LIVES_LABEL, value: badge.value };
    case 'turns':
    case 'sentence-turns':
      return { label: TURNS_LEFT_LABEL, value: badge.value };
    default:
      return unreachable(badge);
  }
}

/** The V2 context line: Active with its count, the Spy reveal, nothing for a held, queue, log, pool or shop card. */
export function cardSheetContext(source: CardSheetSource): CardSheetContext {
  switch (source.kind) {
    case 'in-play':
      return { kind: 'active', count: countFor(source) };
    case 'spy-reveal':
      return { kind: 'spy-reveal' };
    case 'hand':
    case 'special':
    case 'queue':
    case 'log':
    case 'pool':
    case 'shop':
      return null;
    default:
      return unreachable(source);
  }
}

/**
 * An in-play source re-read from `inPlayThumbs(view, owner)` by instance id, so a counter that
 * ticks while the sheet is open shows the new value. A thumb that left play keeps its last face
 * (read-only); every other source is returned unchanged. A held hand or special card is re-read by
 * L74-08's `liveCardRefFor`, not here (Appendix A.5).
 */
export function liveCardSheetSource(source: CardSheetSource, view: PlayingStateView): CardSheetSource {
  if (source.kind !== 'in-play') {
    return source;
  }
  const found = inPlayThumbs(view, source.thumb.ref.ownerPlayerId).find(
    (entry) => entry.instance.instanceId === source.thumb.instance.instanceId,
  );
  return found === undefined ? source : { kind: 'in-play', thumb: found };
}
