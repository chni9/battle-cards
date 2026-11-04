/**
 * The lobby's reconnecting lock: technical spec v7 §7.2 "controls disabled while reconnecting"
 * (§11 Q29; plan A.9 ruling 6). The hook never checks `status` (§4.1), and `@colyseus/sdk`
 * buffers a send while it reconnects and replays it on rejoin, against a state the player has not
 * seen (decisions.md 2026-11-02, L74-25). So the lobby disables every control that sends an
 * intent, rather than let one queue. L76-14.
 */

import type { RoomConnectionStatus } from '../../net/use-room-connection';

/** True only for 'reconnecting' (A.4, A.9 ruling 6). */
export function lobbyIntentsLocked(status: RoomConnectionStatus): boolean {
  return status === 'reconnecting';
}
