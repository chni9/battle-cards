import { describe, expect, it } from 'vitest';

import { KIT_IDS, type LobbyRules } from '@card-battle/shared';

import {
  cachedLobbyRules,
  nextRulesCache,
  rulesRecall,
  tableRulesRecall,
  type RulesCache,
} from './rules-recall';
import { makeFinishedView, makeLobbyView, makePlayingView } from './test-fixtures';

const TWO_OUT_30: LobbyRules = { excludedKitIds: ['kamikaze', 'ghost'], randomOnly: false, turnTimeSeconds: 30 };
const GAMBLER_OUT_45: LobbyRules = { excludedKitIds: ['gambler'], randomOnly: true, turnTimeSeconds: 45 };
const room = (gameCode: string) => makePlayingView({ gameCode });

describe('rulesRecall (spec v7 §6.11, §7.6)', () => {
  it('recalls a lobby view with 2 excluded kits and a 30 s turn', () => {
    expect(rulesRecall(makeLobbyView({ lobbyRules: TWO_OUT_30 }))).toEqual({
      excludedKitIds: ['kamikaze', 'ghost'],
      randomOnly: false,
      turnTimeSeconds: 30,
      allowedKitIds: ['untouchable', 'scientific', 'assassin', 'upgrader', 'tactician',
        'indestructible', 'prophet', 'specialist', 'witch', 'warrior', 'wizard', 'juggernaut',
        'duplicator', 'gambler'],
    });
  });

  it('recalls a finished Classic view from its own rules', () => {
    const recall = rulesRecall(makeFinishedView({ lobbyRules: GAMBLER_OUT_45 }));
    expect(recall).toMatchObject({ excludedKitIds: ['gambler'], randomOnly: true, turnTimeSeconds: 45 });
    expect(recall?.allowedKitIds).toEqual(KIT_IDS.slice(0, 15));
  });

  it('gives null for a tutorial finished view', () => {
    const tutorial = makePlayingView({ playKind: 'tutorial', tutorialIndex: 7 });
    expect(rulesRecall(makeFinishedView({ finalTable: tutorial, lobbyRules: null }))).toBeNull();
    expect(rulesRecall(makeFinishedView({ finalTable: tutorial, lobbyRules: TWO_OUT_30 }))).toBeNull();
  });

  it('gives null when the view carries no rules', () => {
    expect(rulesRecall(makeLobbyView({ lobbyRules: null }))).toBeNull();
  });

  it('allows every kit when none is excluded', () => {
    expect(rulesRecall(makeLobbyView())).toEqual({
      excludedKitIds: [], randomOnly: false, turnTimeSeconds: 60, allowedKitIds: [...KIT_IDS],
    });
  });
});

describe('nextRulesCache (spec v7 §6.11)', () => {
  const lobby1 = makeLobbyView({ gameCode: 'ROOM1', lobbyRules: TWO_OUT_30 });

  it('a new room code clears the cache', () => {
    const cache = nextRulesCache(null, lobby1);
    expect(cache).toEqual({ gameCode: 'ROOM1', rules: TWO_OUT_30 });
    expect(nextRulesCache(cache, room('ROOM2'))).toBeNull();
    expect(nextRulesCache(cache, makeLobbyView({ gameCode: 'ROOM2', lobbyRules: GAMBLER_OUT_45 })))
      .toEqual({ gameCode: 'ROOM2', rules: GAMBLER_OUT_45 });
  });

  it('each lobby view of the room replaces it, Play again included', () => {
    const playing = nextRulesCache(nextRulesCache(null, lobby1), room('ROOM1'));
    const finished = nextRulesCache(playing, makeFinishedView({ finalTable: room('ROOM1') }));
    expect(nextRulesCache(finished, makeLobbyView({ gameCode: 'ROOM1', lobbyRules: GAMBLER_OUT_45 })))
      .toEqual({ gameCode: 'ROOM1', rules: GAMBLER_OUT_45 });
  });

  it('keeps the same cache for a playing or finished view of the room and for no view', () => {
    const cache = nextRulesCache(null, lobby1);
    expect(nextRulesCache(cache, room('ROOM1'))).toBe(cache);
    expect(nextRulesCache(cache, makeFinishedView({ finalTable: room('ROOM1'), lobbyRules: GAMBLER_OUT_45 })))
      .toBe(cache);
    expect(nextRulesCache(cache, null)).toBe(cache);
  });
});

describe('table rules source (spec v7 §6.10, §6.11)', () => {
  const cache: RulesCache = { gameCode: 'ROOM1', rules: TWO_OUT_30 };

  it('gives the cached rules only to a Classic table of the same room', () => {
    expect(cachedLobbyRules(cache, room('ROOM1'))).toBe(TWO_OUT_30);
    expect(cachedLobbyRules(cache, room('ROOM2'))).toBeNull();
    expect(cachedLobbyRules(cache, makePlayingView({ gameCode: 'ROOM1', playKind: 'tutorial', tutorialIndex: 0 })))
      .toBeNull();
    expect(cachedLobbyRules(null, room('ROOM1'))).toBeNull();
  });

  it('recalls the cached rules on the table and hides them when unknown', () => {
    const recall = tableRulesRecall(cache, room('ROOM1'));
    expect(recall).toMatchObject({ excludedKitIds: ['kamikaze', 'ghost'], randomOnly: false, turnTimeSeconds: 30 });
    expect(recall?.allowedKitIds).toHaveLength(14);
    expect(tableRulesRecall(null, room('ROOM1'))).toBeNull();
  });
});
