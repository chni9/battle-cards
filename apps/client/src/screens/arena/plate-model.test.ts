/** Plate model: spec v7 §6.1 item 2 (landing spot), §6.5 (recurring chips at the catalog rate), L74-06. */
import type { ActionPlayedLogEntry } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { inPlayThumbs } from '../../view-model/card-actions';
import { recurringChips } from '../../view-model/recurring-chips';
import { makePersistent, makePlayer, makeSelf, makeTableView } from '../../view-model/test-fixtures';
import { lastPlayedCard, recurringAmountGlyph, recurringChipThumb } from './plate-model';

// `ActionPlayedLogEntry`, not the `ActionLogEntryView` union, so `{ ...PLAY, … }` spreads one shape.
const DRAW: ActionPlayedLogEntry = { kind: 'actionPlayed', actorPlayerId: 'p1', action: 'draw', turnSequence: 1 };
const PLAY: ActionPlayedLogEntry = { kind: 'actionPlayed', actorPlayerId: 'p1', action: 'playCard', cardId: 'strong-attack', isUpgraded: true, targetPlayerId: 'me', turnSequence: 2 };

describe('lastPlayedCard (§6.1 item 2)', () => {
  it('is null for an empty log and for a log of draws only', () => {
    expect(lastPlayedCard([])).toBeNull();
    expect(lastPlayedCard([DRAW])).toBeNull();
  });

  it('takes the newest playCard, keyed by its log index', () => {
    const older: ActionPlayedLogEntry = { ...PLAY, cardId: 'spy', isUpgraded: false, turnSequence: 1 };
    expect(lastPlayedCard([older, PLAY, DRAW])).toEqual({ instanceId: 'landing-1', cardId: 'strong-attack', isUpgraded: true });
  });

  it("shows a multi-attack's first attack, and skips a play with no public card", () => {
    const multi: ActionPlayedLogEntry = {
      kind: 'actionPlayed', actorPlayerId: 'p2', action: 'playMultipleAttacks', turnSequence: 3,
      attacks: [{ cardId: 'basic-attack', targetPlayerId: 'p1', isUpgraded: false }, { cardId: 'strong-attack', targetPlayerId: 'me', isUpgraded: false }],
    };
    const blind: ActionPlayedLogEntry = { kind: 'actionPlayed', actorPlayerId: 'p1', action: 'playCard', turnSequence: 4 };
    expect(lastPlayedCard([PLAY, multi, blind])).toEqual({ instanceId: 'landing-1', cardId: 'basic-attack', isUpgraded: false });
  });
});

describe('recurring chips on the plate (§6.5)', () => {
  const view = makeTableView(['me', 'p1'], {
    players: [makePlayer('me', { isYou: true }), makePlayer('p1', { activePersistentEffects: [makePersistent({ id: 'poi', cardId: 'poison', counter: 3 })] })],
    self: makeSelf({ activePersistentEffects: [makePersistent({ id: 'cur', cardId: 'curse' })] }),
  });

  it("finds the opponent's Poison thumb and the POV's own Curse thumb", () => {
    const [curse, poison] = recurringChips(view);
    if (curse === undefined || poison === undefined) throw new Error('expected two chips');
    expect(recurringChipThumb(view, curse)).toEqual(inPlayThumbs(view, 'me').find((thumb) => thumb.instance.instanceId === 'cur'));
    expect(recurringChipThumb(view, poison)).toEqual(inPlayThumbs(view, 'p1').find((thumb) => thumb.instance.instanceId === 'poi'));
  });

  it('draws the catalog rate: lives per turn, points taken, points per life', () => {
    expect(recurringAmountGlyph({ kind: 'lives-per-turn', lives: 1 })).toEqual({ amount: { kind: 'lives', amount: 1 }, signed: 'cost' });
    expect(recurringAmountGlyph({ kind: 'points-above-floor', maxPoints: 2, floor: 7 })).toEqual({ amount: { kind: 'points', amount: 2 }, signed: 'cost' });
    expect(recurringAmountGlyph({ kind: 'life-per-points-spent', pointsPerLife: 3 })).toEqual({ amount: { kind: 'pointsPerLife', amount: 3 } });
  });
});
