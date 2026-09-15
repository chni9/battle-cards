import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { LobbyStateView } from '@card-battle/shared';

import {
  lobbyGuestsReady,
  lobbyReadyLabel,
  lobbyShowsReadyToggle,
  lobbyStartEnabled,
} from './lobby-ready';

const here = dirname(fileURLToPath(import.meta.url));

function lobby(overrides: Partial<LobbyStateView> = {}): LobbyStateView {
  return {
    phase: 'lobby',
    you: 'host',
    gameCode: 'ABCDEF',
    hostPlayerId: 'host',
    yourKitSelection: 'random',
    players: [
      { id: 'host', nickname: 'Ada', isBot: false, isReady: true },
      { id: 'guest', nickname: 'Bea', isBot: false, isReady: false },
    ],
    ...overrides,
  };
}

describe('lobby Ready (L57-11)', () => {
  it('disables Start until every human guest is ready', () => {
    const unreadied = lobby();
    expect(lobbyGuestsReady(unreadied)).toBe(false);
    expect(lobbyStartEnabled(unreadied)).toBe(false);
    const readied = lobby({
      players: [
        { id: 'host', nickname: 'Ada', isBot: false, isReady: true },
        { id: 'guest', nickname: 'Bea', isBot: false, isReady: true },
      ],
    });
    expect(lobbyStartEnabled(readied)).toBe(true);
  });

  it('allows host plus bots with no human guests (solo path)', () => {
    const solo = lobby({
      players: [
        { id: 'host', nickname: 'Ada', isBot: false, isReady: true },
        { id: 'bot-1', nickname: 'Alpha', isBot: true, botDifficulty: 'normal', isReady: true },
      ],
    });
    expect(lobbyStartEnabled(solo)).toBe(true);
    expect(lobbyShowsReadyToggle(solo)).toBe(false);
  });

  it('shows the Ready toggle only to human guests', () => {
    expect(lobbyShowsReadyToggle(lobby())).toBe(false);
    expect(lobbyShowsReadyToggle(lobby({ you: 'guest' }))).toBe(true);
    expect(lobbyReadyLabel(false)).toBe('Not ready');
    expect(lobbyReadyLabel(true)).toBe('Ready');
  });
});

describe('lobby Ready wiring (L57-11)', () => {
  it('toggles Ready from view facts and greys Start', () => {
    const lobby = readFileSync(join(here, 'lobby.tsx'), 'utf8');
    expect(lobby).toContain('onSetReady');
    expect(lobby).toContain('lobbyStartEnabled');
    expect(lobby).toContain('Cancel ready');
    expect(lobby).not.toContain('Feedback on the felt');
  });
});
