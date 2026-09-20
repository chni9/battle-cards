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
    title: 'Sentence, Imposition, and pool buys',
    items: [
      'Sentence now costs 20 points. After you play it, it ticks for three of your turns (this play counts), then a living visible player is marked to die on their turn. If you die first, Sentence is cancelled. Upgraded Sentence never picks you. Invisible players are skipped.',
      'While Sentence is ticking, every seat sees a red warning: “N turn(s) before Sentence!”',
      'Imposition now takes points only. If the victim has fewer than 2 points (4 if upgraded), nothing happens — no lives are lost.',
      'When someone buys a card from the pool, others see that a pool buy happened, not which card. You still see your own recovered card, and so does anyone already Spying you.',
      'The shared pool list shows how many cards are there, not which cards they are — except while you are choosing a Card Absorber recovery.',
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
