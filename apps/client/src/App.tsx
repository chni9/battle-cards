import { PROTOCOL_VERSION } from '@card-battle/shared';

import { useRoomConnection } from './net/use-room-connection';

const STATUS_LABELS = {
  connecting: 'Connecting to the room…',
  connected: 'Connected',
  disconnected: 'Disconnected from the room',
  failed: 'Could not join the room',
} as const;

/**
 * L0-06 renders what the server sent and nothing else: the interface proper starts with the
 * home screen in L1-01 and the table in L1-12.
 */
export function App() {
  const { status, view, error } = useRoomConnection();

  return (
    <main>
      <h1>Card Battle</h1>
      <p>Protocol v{PROTOCOL_VERSION}</p>

      <p>{STATUS_LABELS[status]}</p>
      {error !== null && <p>{error}</p>}

      {view && (
        <section>
          <p>You are {view.you}</p>
          <p>{view.connected.length} connected</p>
          <ul>
            {view.connected.map((sessionId) => (
              <li key={sessionId}>
                {sessionId}
                {sessionId === view.you ? ' (you)' : ''}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
