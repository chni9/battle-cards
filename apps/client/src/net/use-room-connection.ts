/**
 * The client's single connection to the game room — technical spec §3, §5.3.
 *
 * The client holds no rule logic: it joins, receives the view the server built for it, and
 * renders it. Every `stateUpdate` replaces the previous view outright, because the server
 * decides what this recipient may see (technical spec §5.1).
 */

import { CLIENT_READY, GAME_ROOM_NAME, PROTOCOL_VERSION, STATE_UPDATE } from '@card-battle/shared';
import type { JoinRoomOptions, PlaceholderStateView } from '@card-battle/shared';
import { Client, type Room } from '@colyseus/sdk';
import { useEffect, useState } from 'react';

const DEFAULT_SERVER_URL = 'http://localhost:2567';

export type RoomConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'failed';

export interface RoomConnection {
  status: RoomConnectionStatus;
  /** The last view received. `null` until the first `stateUpdate` arrives. */
  view: PlaceholderStateView | null;
  /** Why the connection failed or ended, when the server said. */
  error: string | null;
}

const INITIAL: RoomConnection = { status: 'connecting', view: null, error: null };

export function useRoomConnection(): RoomConnection {
  const [connection, setConnection] = useState<RoomConnection>(INITIAL);

  useEffect(() => {
    let cancelled = false;
    let joinedRoom: Room | null = null;

    async function connect(): Promise<void> {
      const client = new Client(import.meta.env.VITE_SERVER_URL ?? DEFAULT_SERVER_URL);
      const options: JoinRoomOptions = { protocolVersion: PROTOCOL_VERSION };

      try {
        const room = await client.joinOrCreate(GAME_ROOM_NAME, options);

        if (cancelled) {
          // StrictMode mounts twice in development: the room joined by the discarded
          // effect has to be left, or it lingers as a phantom player.
          await room.leave();
          return;
        }

        joinedRoom = room;

        room.onMessage(STATE_UPDATE, (payload: unknown) => {
          if (isStateView(payload)) {
            setConnection({ status: 'connected', view: payload, error: null });
          }
        });

        room.onError((_code, message) => {
          setConnection((previous) => ({ ...previous, status: 'failed', error: message ?? null }));
        });

        room.onLeave((_code, reason) => {
          setConnection((previous) => ({
            ...previous,
            status: 'disconnected',
            error: reason ?? null,
          }));
        });

        setConnection((previous) => ({ ...previous, status: 'connected' }));

        // Only now: the SDK drops a message whose handler is not registered yet, so the first
        // view has to be asked for after the handler above exists.
        room.send(CLIENT_READY);
      } catch (error) {
        if (!cancelled) {
          setConnection({ status: 'failed', view: null, error: describe(error) });
        }
      }
    }

    void connect();

    return () => {
      cancelled = true;
      void joinedRoom?.leave();
    };
  }, []);

  return connection;
}

/**
 * Nothing arriving over the wire is trusted to have the shape it claims — the same reason
 * the server revalidates every action (technical spec §5.4).
 */
function isStateView(payload: unknown): payload is PlaceholderStateView {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  if (!('you' in payload) || !('connected' in payload)) {
    return false;
  }

  const { you, connected } = payload;

  return (
    typeof you === 'string' &&
    Array.isArray(connected) &&
    connected.every((session) => typeof session === 'string')
  );
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not reach the server';
}
