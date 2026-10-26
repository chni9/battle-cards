/**
 * Card face data — technical spec v7 §5.4. Everything the V7 `Card` prints or speaks comes
 * from the catalog through here, so the component holds no card knowledge of its own.
 *
 * - The damage chip is `listedAttackDamage` × the pending multiplier, null on non-attacks and
 *   on Tax, Absorber and Super Mirror (L56-04).
 * - The cost chip is the play cost, with the upgraded Regeneration rate (rules spec §1–§3).
 * - Counters speak card lives (L56-06) and Invisibility turns (L58-06), with singulars.
 * - The name's font size fits its widest word whole (fix round 1, A4): no mid-word break.
 */

import {
  SPECIAL_CARD_IDS,
  getCard,
  isSharedAttackCardId,
  listedAttackDamage,
  type CardId,
  type CardType,
} from '@card-battle/shared';
import { structuredPlayCost, type StructuredCost } from '../structured-cost';

export const CARD_SIZES = ['hand', 'lifted', 'sheet', 'thumb', 'tile'] as const;
export type CardSize = (typeof CARD_SIZES)[number];

export type CardCounterKind = 'card-lives' | 'turns';

export interface CardCounter {
  readonly kind: CardCounterKind;
  readonly amount: number;
}

/** The accessible name of a verso face: a Spy hand without identity (spec v7 §5.4). */
export const HIDDEN_CARD_LABEL = 'Hidden card';

const SPECIAL_IDS: ReadonlySet<string> = new Set(SPECIAL_CARD_IDS);

/** The catalog family; an id the catalog does not know falls back on the id lists. */
export function cardFamilyOf(cardId: CardId): CardType {
  const type = getCard(cardId)?.type;
  if (type !== undefined) return type;
  if (SPECIAL_IDS.has(cardId)) return 'special';
  return isSharedAttackCardId(cardId) ? 'attack' : 'action';
}

export function cardCostChip(cardId: CardId, isUpgraded: boolean): StructuredCost | null {
  const card = getCard(cardId);
  return card === undefined ? null : structuredPlayCost(card, isUpgraded);
}

export function cardDamageChip(cardId: CardId, isUpgraded: boolean, damageMultiplier?: number): number | null {
  return listedAttackDamage(cardId, isUpgraded, damageMultiplier ?? 1);
}

export function cardCounterLabel(counter: CardCounter): string {
  const n = String(counter.amount);
  if (counter.kind === 'card-lives') {
    return `${n} ${counter.amount === 1 ? 'card life' : 'card lives'}`;
  }
  return `${n} ${counter.amount === 1 ? 'turn' : 'turns'} remaining`;
}

/**
 * Fredoka 600 advance widths in thousandths of an em, measured with canvas `measureText` on the
 * self-hosted font (2026-10-26). A sum of advances runs 0–10 % over the kerned width, so a fit
 * computed from it errs small, never wide.
 */
const FREDOKA_600_ADVANCE: Readonly<Record<string, number>> = {
  a: 563, b: 563, c: 505, d: 565, e: 537, f: 405, g: 552, h: 554, i: 242, j: 236, k: 504, l: 301, m: 803,
  n: 563, o: 559, p: 552, q: 551, r: 423, s: 458, t: 411, u: 560, v: 564, w: 746, x: 523, y: 559, z: 540,
  A: 709, B: 619, C: 643, D: 667, E: 610, F: 619, G: 715, H: 662, I: 232, J: 536, K: 595, L: 565, M: 814,
  N: 683, O: 725, P: 597, Q: 792, R: 611, S: 546, T: 648, U: 688, V: 727, W: 953, X: 691, Y: 638, Z: 590,
};
/** Any other glyph counts as a wide capital, so an unknown name still errs small. */
const FALLBACK_ADVANCE = 820;
/** The name's `tracking-tight`: -0.025em after every glyph. */
const NAME_TRACKING_EM = -0.025;

/**
 * The em width of the name's widest word as printed on a card (Fredoka 600, tight tracking).
 * The Card sizes the name so this word fits its strip whole: no word ever breaks mid-word
 * (L72-12 fix round 1, A4).
 */
export function cardNameWordEm(name: string): number {
  let widest = 0;
  for (const word of name.split(/\s+/)) {
    let em = 0;
    for (const glyph of word) em += (FREDOKA_600_ADVANCE[glyph] ?? FALLBACK_ADVANCE) / 1000 + NAME_TRACKING_EM;
    widest = Math.max(widest, em);
  }
  return widest;
}

/**
 * Per size: the font-size floor and base (px, or a container-relative expression that scales
 * the hand name up toward the 120 px clamp top), and the share of the face width the name strip
 * leaves for text (100 % minus its side padding). Thumbs print no name.
 */
export const CARD_NAME_FIT: Readonly<
  Record<Exclude<CardSize, 'thumb'>, { readonly floorPx: number; readonly base: string; readonly textPct: number }>
> = {
  hand: { floorPx: 10, base: 'max(11px, 11cqi)', textPct: 97 },
  lifted: { floorPx: 11, base: '12px', textPct: 88 },
  sheet: { floorPx: 11, base: '20px', textPct: 84 },
  tile: { floorPx: 11, base: '12px', textPct: 88 },
};

/**
 * The name's CSS font size: the base, shrunk until the widest word fits the strip, never under
 * the floor. `cqi` is relative to the face (`@container`), so the fit follows the card width.
 * 10 px at the 64 px hand clamp floor is the one exception to the 11 px floor (DESIGN.md).
 */
export function cardNameFontSize(name: string, size: Exclude<CardSize, 'thumb'>): string {
  const { floorPx, base, textPct } = CARD_NAME_FIT[size];
  const fitCqi = (textPct / Math.max(cardNameWordEm(name), 0.001)).toFixed(2);
  return `max(${String(floorPx)}px, min(${base}, ${fitCqi}cqi))`;
}

export function cardFaceLabel(input: {
  readonly name: string;
  readonly isUpgraded: boolean;
  readonly damage: number | null;
  readonly counter?: CardCounter;
}): string {
  const { name, isUpgraded, damage, counter } = input;
  return `${name}${isUpgraded ? ' upgraded' : ''}${damage !== null ? `, ${String(damage)} damage` : ''}${
    counter !== undefined ? `, ${cardCounterLabel(counter)}` : ''
  }`;
}
