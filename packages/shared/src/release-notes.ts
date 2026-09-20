/**
 * Player-facing hub What’s new catalog (L63-07).
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

export const RELEASE_NOTES = [
  {
    id: 'lot-63',
    date: '2026-09-20',
    title: 'Gambler kit and Factory',
    additions: [
      {
        kind: 'kit' as const,
        kitId: 'gambler' as const,
        body: 'New kit. Starts at 1 life, 0 points, 0 upgrade points, Draw 10, no attack or action cards, 5 random circulating specials plus Factory. Each Draw has a 1-in-10 chance to instantly eliminate you with no points.',
      },
      {
        kind: 'card' as const,
        cardId: 'factory' as const,
        body: 'New special. Costs 10 points. Persistent: each of your turns, including the turn you play it, you gain one random card — 80% attack or action, 20% circulating special other than Factory. 2 card lives. Upgrade: 70/30 split and a 30% chance the granted copy is already upgraded.',
      },
    ],
    items: [] as readonly ReleaseNoteItem[],
  },
] satisfies readonly ReleaseNote[];

export type ReleaseNoteId = (typeof RELEASE_NOTES)[number]['id'];

export function latestReleaseNote(): (typeof RELEASE_NOTES)[number] {
  const latest = RELEASE_NOTES[0];
  if (latest === undefined) {
    throw new Error('RELEASE_NOTES is empty');
  }
  return latest;
}

export function isReleaseNoteId(value: unknown): value is ReleaseNoteId {
  return typeof value === 'string' && RELEASE_NOTES.some((note) => note.id === value);
}
