/**
 * Exhaustiveness for ActionRejectCode ↔ message map — L32-01 / PROTOCOL_VERSION 27.
 */

import { describe, expect, it } from 'vitest';

import {
  ACTION_REJECT_CODES,
  ACTION_REJECT_MESSAGE,
  actionReject,
  type ActionRejectCode,
} from './action-reject';
import { MAX_PLAYERS } from '../domain/player-count';

describe('ActionRejectCode catalog (L32-01)', () => {
  it('gives every code a non-empty English message', () => {
    for (const code of ACTION_REJECT_CODES) {
      const message = ACTION_REJECT_MESSAGE[code];
      expect(message.length).toBeGreaterThan(0);
      expect(message).toBe(actionReject(code).message);
      expect(actionReject(code).code).toBe(code);
      expect(actionReject(code).ok).toBe(false);
    }
  });

  it('covers Record keys exhaustively over ACTION_REJECT_CODES', () => {
    const messageKeys = Object.keys(ACTION_REJECT_MESSAGE) as ActionRejectCode[];
    expect(messageKeys.sort()).toEqual([...ACTION_REJECT_CODES].sort());
  });

  it('room-full copy names the Classic seat cap', () => {
    expect(ACTION_REJECT_MESSAGE['add-bot-room-full']).toContain(`${String(MAX_PLAYERS)} seats`);
  });
});
