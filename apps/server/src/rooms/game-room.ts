/**
 * The game room — technical spec §3, §5.1, §5.3.
 *
 * Colyseus is used as **transport only**: no `Schema` state, no automatic synchronisation.
 * The authoritative state stays a plain object on the server and every client receives its
 * own `stateUpdate` message, because §5.1 requires one view per recipient and golden rule 4
 * forbids building a complete state to filter on the way out — which is exactly what a
 * room-wide synchronised state is. See `docs/agent/decisions.md`.
 *
 * L0-06 scope: connect, count, disconnect. Game codes and nicknames arrive with L1-01, the
 * lobby and its 4-player limit with L1-02, the real state with L1-03, the real view with
 * L1-09, and the 60-second reconnection window with L7-01.
 */

import {
  CLIENT_READY,
  PROTOCOL_VERSION,
  STATE_UPDATE,
  type ServerToClientMessages,
} from '@card-battle/shared';
import { ErrorCode, Room, ServerError, type Client } from 'colyseus';

import { buildViewFor } from '../protocol/build-view-for';

/** A client typed with the messages the server may send it, so a wrong name fails to compile. */
type GameClient = Client<{ messages: ServerToClientMessages }>;

export class GameRoom extends Room<{ client: GameClient }> {
  /**
   * Runs before `onJoin`. Refuses a client whose message contract differs from the server's:
   * it would misread everything it receives. `options` is `unknown` until checked — technical
   * spec §5.4's "trust nothing the client sends" starts at the join.
   */
  override onAuth(_client: GameClient, options: unknown): boolean {
    const clientVersion = readProtocolVersion(options);

    if (clientVersion !== PROTOCOL_VERSION) {
      const sent = clientVersion === null ? 'no version' : `v${clientVersion}`;

      throw new ServerError(
        ErrorCode.APPLICATION_ERROR,
        `Protocol version mismatch: the server speaks v${PROTOCOL_VERSION}, this client sent ${sent}. Reload the page.`,
      );
    }

    return true;
  }

  override messages = {
    /**
     * A client reporting that its handlers are registered. Its first view is sent here rather
     * than from `onJoin`, because the SDK silently drops a message that arrives before its
     * handler exists — and `onJoin` runs before the client's join promise resolves.
     */
    [CLIENT_READY]: (client: GameClient): void => {
      this.sendStateTo(client, this.connectedSessionIds());
    },
  };

  override onJoin(client: GameClient): void {
    console.log(`[${this.roomId}] ${client.sessionId} joined — ${this.clients.length} connected`);
    // Everyone but the newcomer: theirs comes when it says it is ready.
    this.sendStateToEveryoneExcept(client);
  }

  override onLeave(client: GameClient): void {
    console.log(`[${this.roomId}] ${client.sessionId} left — ${this.clients.length} connected`);
    // The leaving client is already out of `this.clients` here.
    this.sendStateToEveryoneExcept(client);
  }

  private connectedSessionIds(): string[] {
    return this.clients.map((client) => client.sessionId);
  }

  /**
   * One message per client, each built for that client alone. Never `broadcast`: a broadcast
   * sends a single payload to everybody, which is the pattern §5.1 rules out.
   */
  private sendStateToEveryoneExcept(excluded: GameClient): void {
    const connectedSessionIds = this.connectedSessionIds();

    for (const client of this.clients) {
      if (client.sessionId !== excluded.sessionId) {
        this.sendStateTo(client, connectedSessionIds);
      }
    }
  }

  private sendStateTo(client: GameClient, connectedSessionIds: readonly string[]): void {
    client.send(STATE_UPDATE, buildViewFor(client.sessionId, connectedSessionIds));
  }
}

function readProtocolVersion(options: unknown): number | null {
  if (typeof options !== 'object' || options === null || !('protocolVersion' in options)) {
    return null;
  }

  const { protocolVersion } = options;

  return typeof protocolVersion === 'number' ? protocolVersion : null;
}
