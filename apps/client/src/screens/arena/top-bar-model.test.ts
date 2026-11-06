/**
 * Top bar model — technical spec v7 §6.1 item 1, §6.12; Lot 74 plan rulings 2 and 3; Appendix A
 * `turn-strip-timers`, `table-leave-forfeit`, `global-status-labels`.
 */
import type { PlayingStateView } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { makeArenaView } from './test-view';
import {
  activeBlockLabel, arenaFlag, chatAriaLabel, CODE_COPIED_LABEL, CODE_COPY_FAILED_LABEL, COPY_CODE_LABEL, gameCodeLine,
  LEAVE_CONFIRM_CHROME, MENU_LABEL, topBarRoundLabel, turnBannerOf, turnBannerText, type TurnBanner,
} from './top-bar-model';

function withActive(patch: { blockTurnsRemaining: number; blockAttacksForbidden: boolean }): PlayingStateView {
  const base = makeArenaView({ overrides: { currentTurnPlayerId: 'p1' } });
  return { ...base, players: base.players.map((player) => (player.id === 'p1' ? { ...player, ...patch } : player)) };
}

describe('top bar model (spec v7 §6.1)', () => {
  it('counts the round like the log and the chat (ruling 2)', () => {
    expect(topBarRoundLabel(makeArenaView({ overrides: { turnSequence: 0 } }))).toBe('Round 1');
    expect(topBarRoundLabel(makeArenaView({ overrides: { turnSequence: 7 } }))).toBe('Round 3');
    expect(topBarRoundLabel(makeArenaView({ seatCount: 8, overrides: { turnSequence: 15 } }))).toBe('Round 2');
  });

  it('names the turn owner: you, another seat, or nobody', () => {
    expect(turnBannerOf(makeArenaView(), false)).toEqual({ kind: 'you' });
    expect(turnBannerOf(makeArenaView({ overrides: { currentTurnPlayerId: 'p2' } }), false))
      .toEqual({ kind: 'seat', playerId: 'p2', nickname: 'p2' });
    expect(turnBannerOf(makeArenaView({ overrides: { currentTurnPlayerId: null } }), false)).toEqual({ kind: 'none' });
    expect(turnBannerOf(makeArenaView({ pov: 'walk-in' }), false)).toEqual({ kind: 'seat', playerId: 'me', nickname: 'me' });
    const banners: readonly TurnBanner[] = [{ kind: 'you' }, { kind: 'seat', playerId: 'p2', nickname: 'p2' }, { kind: 'none' }];
    expect(banners.map(turnBannerText)).toEqual(['Your turn', "p2's turn", '—']);
  });

  it('names nobody on the finished board, whoever held the turn last (Gate C, S-C3)', () => {
    expect(turnBannerOf(makeArenaView(), true)).toEqual({ kind: 'none' });
    expect(turnBannerOf(makeArenaView({ overrides: { currentTurnPlayerId: 'p2' } }), true)).toEqual({ kind: 'none' });
    expect(turnBannerOf(makeArenaView({ pov: 'walk-in' }), true)).toEqual({ kind: 'none' });
  });

  it.each([
    { turns: 2, ban: false, label: 'Block chain · 2 turns left' },
    { turns: 1, ban: false, label: 'Block chain · 1 turn left' },
    { turns: 0, ban: true, label: 'Block · attacks banned this turn' },
    { turns: 2, ban: true, label: 'Block chain · 2 turns left' },
    { turns: 0, ban: false, label: null },
  ])('gives the active seat the Block line $label ($turns turns, ban $ban)', ({ turns, ban, label }) => {
    expect(activeBlockLabel(withActive({ blockTurnsRemaining: turns, blockAttacksForbidden: ban }))).toBe(label);
  });

  it('derives the flag from tableFlagIntent with isSpectator (ruling 3)', () => {
    expect(arenaFlag(makeArenaView(), false)).toEqual({ intent: 'forfeit', ariaLabel: 'Forfeit' });
    for (const pov of ['walk-in', 'eliminated', 'reanimating'] as const) {
      expect(arenaFlag(makeArenaView({ pov }), false)).toEqual({ intent: 'leaveTable', ariaLabel: 'Leave table' });
    }
    expect(arenaFlag(makeArenaView(), true)).toEqual({ intent: 'returnHome', ariaLabel: 'Return home' });
  });

  it('keeps the V2 confirm copy for every flag intent', () => {
    expect(LEAVE_CONFIRM_CHROME).toEqual({
      forfeit: { title: 'Leave the game?', body: 'That counts as a forfeit.', confirm: 'Forfeit' },
      leaveTable: { title: 'Leave the table?', body: null, confirm: 'Leave' },
      returnHome: { title: 'Return home?', body: 'Leave this finished game and go back to the home screen.', confirm: 'Return home' },
      skipTutorial: { title: 'Skip the tutorial?', body: 'You will return to the hub. This is not a forfeit.', confirm: 'Skip tutorial' },
    });
  });

  it('prints the game code with the connection label, and the menu copy', () => {
    expect(gameCodeLine(makeArenaView(), 'Reconnecting…')).toBe('Code TEST · Reconnecting…');
    expect([MENU_LABEL, COPY_CODE_LABEL, CODE_COPIED_LABEL, CODE_COPY_FAILED_LABEL])
      .toEqual(['Menu', 'Copy', 'Code copied', 'Copy failed']);
  });

  it('names the Chat control Chat, or Chat, N unread (V2; the badge is aria-hidden, L74-16)', () => {
    expect([0, 1, 12].map((unread) => chatAriaLabel(unread))).toEqual(['Chat', 'Chat, 1 unread', 'Chat, 12 unread']);
  });
});
