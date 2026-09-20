/**
 * Player-facing hub What’s new catalog (L63-07).
 * Newest first. Update the latest entry in the same commit as player-visible work.
 */

import type { CardId } from './domain/card';

export interface ReleaseNoteItem {
  readonly cardId?: CardId;
  readonly before: string;
  readonly after: string;
}

export interface ReleaseNote {
  readonly id: string;
  readonly date: string;
  readonly title: string;
  readonly items: readonly ReleaseNoteItem[];
}

export const RELEASE_NOTES = [
  {
    id: 'lot-63',
    date: '2026-09-20',
    title: 'Sentence, Imposition, Super Absorber, and pool buys',
    items: [
      {
        cardId: 'sentence',
        before:
          'Sentence was instant. Playing it immediately marked a random living player to die.',
        after:
          'This update adds a 3-turn countdown. Sentence costs 20 points. After you play it, it waits through 3 of your later turns (playing it does not count), then a living visible player is marked to die on their turn.',
      },
      {
        cardId: 'imposition',
        before:
          'If a victim had fewer points than the tax, they lost lives to make up the difference.',
        after:
          'If they have fewer than 2 points (4 if upgraded), nothing happens — no lives are lost.',
      },
      {
        cardId: 'super-absorber',
        before:
          'Absorbed lives, points, and upgrade points from opponents, and doubled those gains when upgraded.',
        after:
          'Unupgraded Super Absorber now only absorbs lives and no longer absorbs points and upgrade points. Upgraded Super Absorber absorbs lives, points, and upgrade points but no longer doubles the gains.',
      },
    ],
  },
] as const satisfies readonly ReleaseNote[];

export type ReleaseNoteId = (typeof RELEASE_NOTES)[number]['id'];

export function latestReleaseNote(): (typeof RELEASE_NOTES)[number] {
  return RELEASE_NOTES[0];
}

export function isReleaseNoteId(value: unknown): value is ReleaseNoteId {
  return typeof value === 'string' && RELEASE_NOTES.some((note) => note.id === value);
}
