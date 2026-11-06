/** The lobby's reconnecting lock: technical spec v7 §7.2 (Q29), A.9 ruling 6 (L76-14). */
import { describe, expect, it } from 'vitest';

import type { RoomConnectionStatus } from '../../net/use-room-connection';
import { lobbyIntentsLocked } from './lobby-lock';

const STATUSES: readonly RoomConnectionStatus[] = ['idle', 'connecting', 'connected', 'reconnecting', 'disconnected', 'failed'];

describe('lobbyIntentsLocked (§7.2, Q29, A.9 ruling 6)', () => {
  it('locks lobby intents only while reconnecting', () => {
    expect(STATUSES.filter(lobbyIntentsLocked)).toEqual(['reconnecting']);
  });
});
