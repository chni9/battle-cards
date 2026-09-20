/**
 * Player-facing hub What’s new catalog (L63-07).
 * Newest first. Update the latest entry in the same commit as player-visible work.
 */

export interface ReleaseNote {
  readonly id: string;
  readonly date: string;
  readonly title: string;
  readonly items: readonly string[];
}

export const RELEASE_NOTES = [
  {
    id: 'lot-63',
    date: '2026-09-20',
    title: 'Sentence, Imposition, Super Absorber, and pool buys',
    items: [
      'Sentence costs 20 points. After you play it, it waits through 3 of your later turns, then a living visible player is marked to die on their turn. Playing it does not use up one of those 3 turns. If you die first, Sentence is cancelled. Upgraded Sentence never picks you. Invisible players are skipped.',
      'Imposition takes points only. If the victim has fewer than 2 points (4 if upgraded), nothing happens — no lives are lost.',
      'Super Absorber no longer captures past turns when you play it. While it is active it takes lives each living opponent lost on their turn; upgraded also takes points and upgrade points they spent. Amounts are not doubled.',
      'When someone buys a card from the pool, others see that a pool buy happened, not which card. You still see your own recovered card, and so does anyone already Spying you.',
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
