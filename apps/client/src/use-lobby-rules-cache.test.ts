// @vitest-environment happy-dom
/**
 * App's lobby-rules cache: technical spec v7 §6.10 source (1), §6.11; `view-model/rules-recall.ts`
 * (L73-12) (L74-21). One `nextRulesCache` step per new view identity; leaving clears it.
 */
import { defaultLobbyRules, type StateView } from '@card-battle/shared';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import './test/render'; // act environment and per-test cleanup (L72-06)
import { useLobbyRulesCache } from './use-lobby-rules-cache';
import { cachedLobbyRules } from './view-model/rules-recall';
import { makeLobbyView, makePlayingView } from './view-model/test-fixtures';

const RULES_180 = { ...defaultLobbyRules(), turnTimeSeconds: 180 };
const lobby = (gameCode: string, turnTimeSeconds = 180): StateView =>
  makeLobbyView({ gameCode, lobbyRules: { ...RULES_180, turnTimeSeconds } });

function setup(first: StateView | null) {
  return renderHook(({ view }: { view: StateView | null }) => useLobbyRulesCache(view), { initialProps: { view: first } });
}

describe('useLobbyRulesCache (L74-21)', () => {
  it("keeps the room's last lobby rules from the lobby into play, and drops them for another room", () => {
    const { result, rerender } = setup(lobby('ROOM01'));
    const playing = makePlayingView({ gameCode: 'ROOM01' });
    rerender({ view: playing });
    expect(cachedLobbyRules(result.current.cache, playing)?.turnTimeSeconds).toBe(180);
    rerender({ view: makePlayingView({ gameCode: 'ROOM02' }) });
    expect(result.current.cache).toBeNull();
  });

  it('keeps the rules through a null view, clears them on leave, and stays clear until a lobby view', () => {
    const { result, rerender } = setup(lobby('ROOM01'));
    rerender({ view: null });
    expect(result.current.cache?.rules.turnTimeSeconds).toBe(180);
    rerender({ view: makePlayingView({ gameCode: 'ROOM01' }) });
    act(() => {
      result.current.clear();
    });
    expect(result.current.cache).toBeNull();
    rerender({ view: makePlayingView({ gameCode: 'ROOM01' }) });
    expect(result.current.cache).toBeNull();
  });

  it('takes every new lobby view of the room, so Play again brings the edited rules', () => {
    const { result, rerender } = setup(lobby('ROOM01'));
    rerender({ view: lobby('ROOM01', 45) });
    expect(result.current.cache?.rules.turnTimeSeconds).toBe(45);
  });
});
