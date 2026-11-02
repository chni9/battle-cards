// @vitest-environment happy-dom
/**
 * Turn clock in the top bar: technical spec v7 §4.1, §6.10, §14.3; Appendix A
 * `table-turn-timer-scale`, `turn-strip-timers`; L12-07 (cosmetic, the server deadline rules);
 * Lot 73 carry-forward (the countdown runs on during a post-action sub-choice) (L74-21).
 */
import {
  defaultLobbyRules,
  type LobbyRules,
  type PlayingStateView,
  type PublicPlayerView,
  type SubChoiceRequiredPayload,
  type TurnStartedPayload,
} from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { renderUi, type RenderUiOptions } from '../../test/render';
import { TURN_CLOCK_ABSENT_LABEL, TURN_CLOCK_NONE_LABEL, TURN_CLOCK_PAUSED_LABEL } from '../../view-model/turn-clock';
import { ArenaScreen, type ArenaScreenProps } from './arena-screen';
import { expectNoArenaIntent, makeArenaProps, makeArenaView } from './test-view';

const rules = (turnTimeSeconds: number): LobbyRules => ({ ...defaultLobbyRules(), turnTimeSeconds });
const started = (deadlineMs: number): TurnStartedPayload => ({ activePlayerId: 'me', deadlineMs, blockTurnsRemaining: 0 });
const MIRROR: SubChoiceRequiredPayload = { kind: 'mirror', eligibleEffectIds: [], deadlineMs: 1 };
const LINK = { disconnectedAt: 0, automaticTurnsTaken: 0, consecutiveTimeouts: 0 } as const;
const myTurn = (turnDeadlineMs: number | null, turnSequence = 4): PlayingStateView =>
  makeArenaView({ overrides: { turnDeadlineMs, turnSequence } });
function onSeat(view: PlayingStateView, patch: Partial<PublicPlayerView>): PlayingStateView {
  return { ...view, players: view.players.map((player) => (player.id === 'p1' ? { ...player, ...patch } : player)) };
}
const p1Turn = (turnDeadlineMs: number | null): PlayingStateView =>
  makeArenaView({ overrides: { currentTurnPlayerId: 'p1', turnDeadlineMs } });

function setup(overrides: Partial<ArenaScreenProps>, options: RenderUiOptions = {}) {
  const props = makeArenaProps(overrides);
  const result = renderUi(<ArenaScreen {...props} />, options);
  const update = (next: Partial<ArenaScreenProps>): void => {
    result.rerender(<ArenaScreen {...props} {...next} />);
  };
  return { ...result, props, update };
}
function clockPart(selector: string): Element {
  const found = document.querySelector(`[data-arena-region="top-bar"] [data-zone="timers"][data-hint-anchor="your-turn"] ${selector}`);
  if (found === null) throw new Error(`no ${selector} in the clock slot`);
  return found;
}
const label = (): string => clockPart('[data-zone="timer-label"]').textContent;
const bar = (): Element => clockPart('[role="progressbar"][aria-label="Turn timer"]');
const valueNow = (): string | null => bar().getAttribute('aria-valuenow');
const danger = (): boolean => clockPart('[data-zone="timer-label"]').hasAttribute('data-danger');

describe('turn clock (spec v7 §6.10, L74-21)', () => {
  it('scales the bar to a 180 s host turn: full at 180 s, half at 90 s (source 1)', () => {
    const { update } = setup({ view: myTurn(180_000), nowMs: 0, cachedLobbyRules: rules(180) });
    expect([label(), valueNow(), danger()]).toEqual(['180s', '100', false]);
    update({ nowMs: 90_000 });
    expect([label(), valueNow(), danger()]).toEqual(['90s', '50', false]);
  });

  it('starts a 5 s host turn full, in --danger for its last 10 s', () => {
    setup({ view: myTurn(5_000), nowMs: 0, cachedLobbyRules: rules(5) });
    expect([label(), valueNow(), danger()]).toEqual(['5s', '100', true]);
  });

  it('falls back to the first TURN_STARTED of the turn; a resume on the same turnSequence keeps its length (source 2, §4.1)', () => {
    const { update } = setup({ view: myTurn(30_000, 4), nowMs: 0, lastTurnStarted: started(30_000) });
    expect(valueNow()).toBe('100');
    update({ view: myTurn(30_000, 4), nowMs: 10_000 });
    expect(valueNow()).toBe('67');
    // Resume after a disconnect: a new payload on the same turnSequence, 20 s left of 30.
    update({ view: myTurn(70_000, 4), nowMs: 50_000, lastTurnStarted: started(70_000) });
    expect([label(), valueNow()]).toEqual(['20s', '67']);
    // The next turn records its own length.
    update({ view: myTurn(140_000, 5), nowMs: 80_000, lastTurnStarted: started(140_000) });
    expect([label(), valueNow()]).toEqual(['60s', '100']);
  });

  it('ignores a payload left from the previous game at mount, then records the new turn (Play again in one room)', () => {
    const { update } = setup({ view: myTurn(30_000, 1), nowMs: 0, lastTurnStarted: started(9_000) });
    expect(valueNow()).toBeNull();
    update({ view: myTurn(30_000, 1), nowMs: 0, lastTurnStarted: started(30_000) });
    expect(valueNow()).toBe('100');
  });

  it('shows seconds only, with no aria-valuenow, when no length is known (source 3)', () => {
    setup({ view: myTurn(42_500), nowMs: 0 });
    expect([label(), valueNow()]).toEqual(['43s', null]);
  });

  it.each<{ label: string; overrides: Partial<ArenaScreenProps>; text: string }>([
    { label: 'the active seat disconnected', overrides: { view: onSeat(p1Turn(30_000), { connection: { ...LINK, status: 'disconnected' } }) }, text: TURN_CLOCK_PAUSED_LABEL },
    { label: 'the active seat absent with no deadline', overrides: { view: onSeat(p1Turn(null), { connection: { ...LINK, status: 'absent' } }) }, text: TURN_CLOCK_ABSENT_LABEL },
    { label: 'a bot turn', overrides: { view: onSeat(p1Turn(null), { isBot: true }) }, text: TURN_CLOCK_NONE_LABEL },
    { label: 'the finished board', overrides: { view: myTurn(30_000), readOnly: true, cachedLobbyRules: rules(60) }, text: TURN_CLOCK_NONE_LABEL },
  ])('shows $text for $label, with an empty bar and no aria-valuenow', ({ overrides, text }) => {
    setup({ nowMs: 0, ...overrides });
    expect([label(), valueNow()]).toEqual([text, null]);
  });

  it('keeps counting down while a post-action sub-choice is open, as V2 did (Lot 73 carry-forward)', () => {
    setup({ view: myTurn(30_000), nowMs: 0, cachedLobbyRules: rules(60), subChoice: MIRROR });
    expect([label(), valueNow()]).toEqual(['30s', '50']);
  });

  it('sends nothing, and the fill jumps under reduced motion', () => {
    const { props, unmount } = setup({ view: myTurn(30_000), nowMs: 0, cachedLobbyRules: rules(60) });
    expect(bar().querySelector('[data-motion]')?.getAttribute('data-motion')).toBe('full');
    expectNoArenaIntent(props);
    unmount();
    setup({ view: myTurn(30_000), nowMs: 0, cachedLobbyRules: rules(60) }, { reducedMotion: true });
    expect(bar().querySelector('[data-motion]')?.getAttribute('data-motion')).toBe('reduced');
  });
});
