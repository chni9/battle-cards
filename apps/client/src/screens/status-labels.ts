/**
 * Connection status copy shared by Home / Lobby — frontend.md.
 */

import type { RoomConnectionStatus } from '../net/use-room-connection';

export const STATUS_LABELS: Record<RoomConnectionStatus, string> = {
  idle: 'Not connected',
  connecting: 'Connecting…',
  connected: 'Connected',
  reconnecting: 'Reconnecting…',
  disconnected: 'Disconnected',
  failed: 'Could not join',
};
