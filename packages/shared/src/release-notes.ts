/**
 * Player-facing hub What’s new catalog (L63-07, L65-05).
 * Newest first. The auto popup shows only the latest entry. The hub New
 * button lists every entry, date by date.
 *
 * While the latest entry is not on `main`, later pull requests append to
 * that same id (one update). After it merges to `main`, the next
 * player-facing change adds a new entry above it. Do not edit an entry
 * that is already on `main` except to correct that entry's own text.
 * `lot-63` shipped on `main` (promote #51). `lot-65` shipped on `main`
 * (promote #56). `lot-68` shipped on `main`. `lot-69` is the open update.
 *
 * Player copy (designer 2026-09-29): keep Before and After. Each side is
 * one short sentence about the gameplay change. Bug fixes: After is
 * `Fixed some bugs.` Detail: `docs/agent/frontend.md`.
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

/** Auto popup vs the hub New button (L65-05). */
export type WhatsNewScope = 'current' | 'history';

const RELEASE_NOTES_CATALOG = [
  {
    id: 'lot-69',
    date: '2026-10-05',
    title: 'Active cards and Spy',
    additions: [],
    items: [
      {
        cardId: 'spy' as const,
        before: 'Basic Spy showed kit and cards; Spy+ showed live resources.',
        after: 'Basic Spy shows live resources; Spy+ also shows kit and cards.',
      },
      {
        cardId: 'shield' as const,
        before: 'You could not play Shield while a shield was up.',
        after: 'Shield refills your shield and you may hold four active cards.',
      },
      {
        before: 'Only one player got rewards for a shared kill.',
        after: 'Every player who helped eliminate someone gets reward picks.',
      },
    ],
  },
  {
    id: 'lot-68',
    date: '2026-09-29',
    title: 'Ghost and Shield',
    additions: [],
    items: [
      {
        kitId: 'ghost' as const,
        before: 'Ghost started with a normal Tax and no upgrade point.',
        after: 'Ghost starts with Tax+ and 1 upgrade point.',
      },
      {
        cardId: 'shield' as const,
        before: 'Shield+ did not block Imposition.',
        after: 'Shield+ blocks Imposition.',
      },
      {
        before: 'Some bugs were in the game.',
        after: 'Fixed some bugs.',
      },
    ],
  },
  {
    id: 'lot-65',
    date: '2026-09-28',
    title: 'Private Draw, invisible players, Sentence, and the hand',
    additions: [],
    items: [
      {
        kitId: 'gambler' as const,
        before:
          'A Draw flew every point that was gained, so a large pile identified Gambler.',
        after:
          'If that player’s kit is hidden from you, a Draw flies one point. Your own Draw still shows the real payout. Gambling too much leaves you at 1 life. The table says you lost everything, and you see that on the table.',
      },
      {
        cardId: 'invisibility' as const,
        before: 'You could target an invisible player. The card did not affect them.',
        after:
          'You can no longer choose an invisible player as the target. Cards that hit the whole table can still be played; that player is unaffected.',
      },
      {
        cardId: 'sentence' as const,
        before: 'A Sentence that was counting down could not be opened.',
        after:
          'Tap the Sentence chip to read the card, including whether it is upgraded. On your turn, with an upgrade point, that same chip can upgrade your Sentence. The countdown does not reset.',
      },
      {
        before:
          'On a phone, Hand and Specials sometimes swapped sides when the browser bar moved.',
        after: 'They keep their places unless there is clearly more room.',
      },
      {
        before: 'A huge point gain flew one chip per point and could freeze the table.',
        after: 'Point chips stop at 50. The number next to them still shows the real total.',
      },
      {
        before: 'Your own kit portrait was the same size as an opponent’s in landscape.',
        after: 'Your kit portrait is a step larger. Opponents stay the same size.',
      },
      {
        before:
          'The action log named a card but not what that play spent or gained.',
        after:
          'Each play ends with the lives, points, upgrade points, or shield that changed, as a green gain or a red loss next to the icon. A Draw or an upgrade-point purchase you cannot see shows ? instead of the point total. A ticking card that changes resources adds a short line with the player’s name and those icons.',
      },
      {
        before:
          'Selling or buying a card showed the payout or the price, which identified the card. A hit or a steal did not show what changed when it resolved.',
        after:
          'A sale or a shop purchase you cannot see no longer shows that payout or price. When an attack hits or a steal resolves, the lives, points, upgrade points, or shield that changed appear on that line.',
      },
      {
        cardId: 'imposition' as const,
        before: 'Opponents with 2 points (4 if upgraded) paid that many points.',
        after:
          'Only points above 7 can be taken, capped at 2 (4 if upgraded). 7 or below pays nothing. 8 pays 1. The turn is not skipped.',
      },
      {
        cardId: 'upgrade-point-thief' as const,
        before: 'Stole upgrade points from every opponent. Upgraded also stole their points.',
        after:
          'Choose one living opponent. Upgraded steals from every living opponent and no longer steals points.',
      },
      {
        cardId: 'block' as const,
        before: 'Block could be played again during its own extra turns.',
        after: 'Block cannot be played while a Block chain is active.',
      },
      {
        cardId: 'spy' as const,
        before: 'A basic Spy or Thief cancelled the upgraded copy.',
        after:
          'Same upgrade level still cancels both. An upgraded Spy or Thief beats the basic copy.',
      },
      {
        cardId: 'absorber' as const,
        before: 'The last living player lost the chance to absorb someone who had just died.',
        after: 'That player can still absorb on their turn. The window closes after they act.',
      },
      {
        before: 'Play again after a solo match opened the online lobby.',
        after:
          'Play again opens the solo menu with the same kit and the same number of bots. The next match starts when you start it.',
      },
      {
        before: 'An upgrade point could only upgrade a card still in hand.',
        after:
          'You can also upgrade your active Poison, Points Generator, Imposition, Super Absorber, Roulette, Invisibility, or Shield. Counters do not reset. An active Shield keeps its remaining points.',
      },
    ],
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
        body: 'New kit. Starts at 1 life, 0 points, 0 upgrade points, listed Draw 10, no attack or action cards, 2 distinct random specials (never Roulette) plus Roulette — 3 specials total. Each of this player’s turns, Draw payout rerolls to 5–100 (weighted; each extra point is rarer). Each Draw has a 1-in-10 chance to instantly eliminate you with no points; a bust logs as {nickname} dies by Gambling.',
      },
      {
        kind: 'card' as const,
        cardId: 'roulette' as const,
        body: 'New special. Costs 10 points. Persistent: each of your turns, including the turn you play it, you gain one random card. Unupgraded grants only a normal attack or action card, never a special; 10% chance that copy is already upgraded. Upgraded: 80% normal / 20% circulating special other than Roulette, and 10% chance the granted copy is upgraded. 2 card lives.',
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

/** Current update for the auto popup, or the full dated log for the New button. */
export function releaseNotesForScope(scope: WhatsNewScope): readonly ReleaseNote[] {
  if (scope === 'history') {
    return RELEASE_NOTES;
  }
  return [latestReleaseNote()];
}

export function isReleaseNoteId(value: unknown): value is ReleaseNoteId {
  return typeof value === 'string' && RELEASE_NOTES.some((note) => note.id === value);
}
