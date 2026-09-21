/**
 * Player-facing hub What’s new catalog (L63-07 / L64-06).
 * Newest first. Update the latest entry in the same commit as player-visible work.
 */

import type { CardId } from './domain/card';
import type { KitId } from './domain/kit';

/** New kit or card that did not exist in the previous catalog. */
export type ReleaseNoteAddition =
  | { readonly kind: 'kit'; readonly kitId: KitId; readonly body: string }
  | { readonly kind: 'card'; readonly cardId: CardId; readonly body: string };

export interface ReleaseNoteItem {
  readonly cardId?: CardId;
  readonly kitId?: KitId;
  readonly before: string;
  readonly after: string;
}

export interface ReleaseNote {
  readonly id: string;
  readonly date: string;
  readonly title: string;
  /** Rendered under heading New. Empty when this entry has no additions. */
  readonly additions: readonly ReleaseNoteAddition[];
  readonly items: readonly ReleaseNoteItem[];
}

const RELEASE_NOTES_CATALOG = [
  {
    id: 'lot-64',
    date: '2026-09-21',
    title: 'Gambler start specials and Draw',
    items: [
      {
        kitId: 'gambler' as const,
        before:
          'Gambler started with 5 random circulating specials plus Roulette.',
        after:
          'Gambler starts with 2 distinct random specials (never Roulette) plus Roulette — 3 specials total.',
      },
      {
        kitId: 'gambler' as const,
        before:
          'Gambler Draw always granted Draw 10 points, with a 1-in-10 chance to instantly eliminate you and grant no points.',
        after:
          'Each of the Gambler’s turns, Draw payout rerolls to 5–100 (weighted; each extra point is rarer). Bust is still 1-in-10 with no points.',
      },
      {
        kitId: 'gambler' as const,
        before: 'A Draw bust logged as is eliminated in combat.',
        after: 'A Draw bust logs as {nickname} dies by Gambling.',
      },
    ],
    additions: [],
  },
  {
    id: 'lot-63',
    date: '2026-09-20',
    title: 'Sentence, Imposition, Super Absorber, Gambler, and Roulette',
    items: [
      {
        cardId: 'sentence' as const,
        before:
          'Sentence was instant. Playing it immediately marked a random living player to die.',
        after:
          'This update adds a 3-turn countdown. Sentence costs 20 points. After you play it, it waits through 3 of your later turns (playing it does not count), then a living visible player is marked to die on their turn.',
      },
      {
        cardId: 'imposition' as const,
        before:
          'If a victim had fewer points than the tax, they lost lives to make up the difference.',
        after:
          'If they have fewer than 2 points (4 if upgraded), nothing happens — no lives are lost.',
      },
      {
        cardId: 'super-absorber' as const,
        before:
          'Absorbed lives, points, and upgrade points from opponents, and doubled those gains when upgraded.',
        after:
          'Unupgraded Super Absorber now only absorbs lives and no longer absorbs points and upgrade points. Upgraded Super Absorber absorbs lives, points, and upgrade points but no longer doubles the gains.',
      },
    ],
    additions: [
      {
        kind: 'kit' as const,
        kitId: 'gambler' as const,
        body: 'New kit. Starts at 1 life, 0 points, 0 upgrade points, Draw 10, no attack or action cards, 5 random circulating specials plus Roulette. Each Draw has a 1-in-10 chance to instantly eliminate you with no points.',
      },
      {
        kind: 'card' as const,
        cardId: 'roulette' as const,
        body: 'New special. Costs 10 points. Persistent: each of your turns, including the turn you play it, you gain one random card — 80% attack or action, 20% circulating special other than Roulette. 2 card lives. Upgrade: 70/30 split and a 30% chance the granted copy is already upgraded.',
      },
    ],
  },
] as const satisfies readonly ReleaseNote[];

export const RELEASE_NOTES: readonly ReleaseNote[] = RELEASE_NOTES_CATALOG;

export type ReleaseNoteId = (typeof RELEASE_NOTES_CATALOG)[number]['id'];

export function latestReleaseNote(): ReleaseNote {
  const latest = RELEASE_NOTES[0];
  if (latest === undefined) {
    throw new Error('RELEASE_NOTES is empty');
  }
  return latest;
}

export function isReleaseNoteId(value: unknown): value is ReleaseNoteId {
  return typeof value === 'string' && RELEASE_NOTES.some((note) => note.id === value);
}
