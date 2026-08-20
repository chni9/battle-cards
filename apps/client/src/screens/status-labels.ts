/**
 * Connection status copy shared by Home / Lobby — frontend.md.
 * Idle hub must not show “Not connected” (technical spec v6 §5.1 / L42-04).
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

/** Home status line — idle is unlabeled; lobby still uses STATUS_LABELS. */
export function homeStatusCopy(
  status: RoomConnectionStatus,
  soloLaunchPending: boolean,
): string | null {
  if (soloLaunchPending) {
    return 'Starting solo game…';
  }
  if (status === 'idle') {
    return null;
  }
  return STATUS_LABELS[status];
}
