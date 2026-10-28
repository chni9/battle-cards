/**
 * Card sheet sources — Lot 74 plan Appendix A.5 and ruling 1; technical spec v7 §6.6.1, §5.4;
 * L56-05 (log and queue inspect: catalog face, no footer).
 */
import type { CardId, PlayingStateView } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { inPlayThumbs, type InPlayThumb } from '../../view-model/card-actions';
import { makeCard, makePersistent, makePlayingView, makeSelf } from '../../view-model/test-fixtures';
import {
  ACTIVE_LABEL, CARD_LIVES_LABEL, SPY_REVEAL_LABEL, TURNS_LEFT_LABEL,
  cardRefFor, cardSheetContext, cardSheetCounter, cardSheetTitle, liveCardRefFor, liveCardSheetSource, sheetInstanceFor,
  type CardSheetSource,
} from './card-sheet-source';
import { makeArenaView } from './test-view';

const POISON = makePersistent({ id: 'poison-e', cardId: 'poison', counter: 3 });
const INVISIBILITY = makePersistent({ id: 'invisibility-e', cardId: 'invisibility', counter: 4 });
const CURSE = makePersistent({ id: 'curse-e', cardId: 'curse' });
const SENTENCE = { id: 'sentence-s', sourcePlayerId: 'me', remainingOwnerTurns: 2, isUpgraded: false };

function boardWith(poisonCounter: number | null): PlayingStateView {
  const persistents = poisonCounter === null ? [INVISIBILITY, CURSE] : [{ ...POISON, counter: poisonCounter }, INVISIBILITY, CURSE];
  return makeArenaView({ overrides: { self: makeSelf({ shield: 4, activePersistentEffects: persistents }), pendingSentences: [SENTENCE] } });
}
const BOARD = boardWith(3);

function thumb(cardId: CardId, view: PlayingStateView = BOARD): InPlayThumb {
  const found = inPlayThumbs(view, 'me').find((entry) => entry.instance.cardId === cardId);
  if (found === undefined) {
    throw new Error(`no ${cardId} thumb`);
  }
  return found;
}
const inPlay = (cardId: CardId): CardSheetSource => ({ kind: 'in-play', thumb: thumb(cardId) });
const REGEN = makeCard('regeneration');
const HAND: CardSheetSource = { kind: 'hand', instance: REGEN };
const SPECIAL: CardSheetSource = { kind: 'special', instance: makeCard('poison') };
const SPY: CardSheetSource = { kind: 'spy-reveal', instance: makeCard('strong-attack', { instanceId: 'p1-strong' }), ownerPlayerId: 'p1' };
const QUEUE: CardSheetSource = { kind: 'queue', effectId: 'e9', cardId: 'basic-attack', isUpgraded: false };
const LOG: CardSheetSource = { kind: 'log', cardId: 'spy', isUpgraded: true };

describe('card sheet sources (Appendix A.5, spec v7 §6.6.1)', () => {
  it('maps each source to the cardActions ref it reads', () => {
    expect(cardRefFor(HAND)).toEqual({ zone: 'hand', instance: makeCard('regeneration') });
    expect(cardRefFor(SPECIAL)).toEqual({ zone: 'special', instance: makeCard('poison') });
    expect(cardRefFor(inPlay('poison'))).toEqual({ zone: 'active', ownerPlayerId: 'me', effect: POISON });
    expect(cardRefFor(SPY)).toEqual({ zone: 'read-only', instance: makeCard('strong-attack', { instanceId: 'p1-strong' }) });
    expect(cardRefFor(QUEUE)).toEqual({ zone: 'read-only', instance: { instanceId: 'queue-e9', cardId: 'basic-attack', isUpgraded: false } });
    expect(cardRefFor(LOG)).toEqual({ zone: 'read-only', instance: { instanceId: 'log-spy-up', cardId: 'spy', isUpgraded: true } });
  });

  it('shows the instance face, or a synthetic catalog face for the queue and the log (L56-05)', () => {
    expect(sheetInstanceFor(HAND)).toBe(REGEN);
    expect(sheetInstanceFor(inPlay('shield'))).toEqual({ instanceId: 'active-shield', cardId: 'shield', isUpgraded: false });
    expect(sheetInstanceFor(QUEUE)).toEqual({ instanceId: 'queue-e9', cardId: 'basic-attack', isUpgraded: false });
    expect(sheetInstanceFor({ kind: 'log', cardId: 'spy', isUpgraded: false }).instanceId).toBe('log-spy-base');
  });

  it('titles the sheet with the card name', () => {
    expect([HAND, inPlay('shield'), QUEUE, LOG].map(cardSheetTitle)).toEqual(['Regeneration', 'Shield', 'Basic attack', 'Spy']);
  });

  it('gives the activated glow only to a persistent counter, never to Shield or a Sentence (A.8 ruling 1)', () => {
    expect(cardSheetCounter(inPlay('poison'))).toEqual({ kind: 'card-lives', amount: 3 });
    expect(cardSheetCounter(inPlay('invisibility'))).toEqual({ kind: 'turns', amount: 4 });
    expect([inPlay('shield'), inPlay('sentence'), inPlay('curse'), HAND, SPY, QUEUE].map(cardSheetCounter))
      .toEqual([null, null, null, null, null, null]);
  });

  it('names the V2 context: Active with its count, the Spy reveal, nothing for held, queue or log cards', () => {
    expect([ACTIVE_LABEL, CARD_LIVES_LABEL, TURNS_LEFT_LABEL, SPY_REVEAL_LABEL])
      .toEqual(['Active', 'Card lives', 'Turns left', 'Spy reveal — inspect only']);
    expect(cardSheetContext(inPlay('poison'))).toEqual({ kind: 'active', count: { label: 'Card lives', value: 3 } });
    expect(cardSheetContext(inPlay('invisibility'))).toEqual({ kind: 'active', count: { label: 'Turns left', value: 4 } });
    expect(cardSheetContext(inPlay('sentence'))).toEqual({ kind: 'active', count: { label: 'Turns left', value: 2 } });
    expect(cardSheetContext(inPlay('shield'))).toEqual({ kind: 'active', count: null });
    expect(cardSheetContext(SPY)).toEqual({ kind: 'spy-reveal' });
    expect([HAND, SPECIAL, QUEUE, LOG].map(cardSheetContext)).toEqual([null, null, null, null]);
  });

  it('refreshes an in-play card from the next view and keeps the last face once it is gone', () => {
    const open = inPlay('poison');
    const ticked = liveCardSheetSource(open, boardWith(2));
    expect(ticked.kind === 'in-play' ? ticked.thumb.badge : null).toEqual({ kind: 'card-lives', value: 2 });
    expect(liveCardSheetSource(open, boardWith(null))).toBe(open);
    expect(liveCardSheetSource(HAND, boardWith(2))).toBe(HAND);
  });
});

describe('liveCardRefFor (L74-08, Review Focus 1)', () => {
  const spy = makeCard('spy');
  const poison = makeCard('poison');

  it('reads a held hand card from the latest view, upgrade included', () => {
    const upgraded = makeCard('spy', { isUpgraded: true });
    expect(liveCardRefFor({ kind: 'hand', instance: spy }, makePlayingView({ self: makeSelf({ hand: [upgraded] }) })))
      .toEqual({ zone: 'hand', instance: upgraded });
  });

  it('turns a hand card that left the hand into a read-only ref', () => {
    expect(liveCardRefFor({ kind: 'hand', instance: spy }, makePlayingView()))
      .toEqual({ zone: 'read-only', instance: spy });
  });

  it('does the same for a special', () => {
    expect(liveCardRefFor({ kind: 'special', instance: poison }, makePlayingView({ self: makeSelf({ specialCards: [poison] }) })))
      .toEqual({ zone: 'special', instance: poison });
    expect(liveCardRefFor({ kind: 'special', instance: poison }, makePlayingView()))
      .toEqual({ zone: 'read-only', instance: poison });
  });

  it('leaves every other source to cardRefFor', () => {
    const view = makePlayingView({ self: makeSelf({ shield: 4 }) });
    const [thumb] = inPlayThumbs(view, 'me');
    if (thumb === undefined) throw new Error('no own Shield thumb');
    const queue: CardSheetSource = { kind: 'queue', effectId: 'e-1', cardId: 'basic-attack', isUpgraded: false };
    expect(liveCardRefFor({ kind: 'in-play', thumb }, view)).toEqual(cardRefFor({ kind: 'in-play', thumb }));
    expect(liveCardRefFor(queue, view)).toEqual(cardRefFor(queue));
  });
});
