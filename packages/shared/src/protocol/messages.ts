/**
 * The client/server message contract — technical spec §5.2 and §5.3.
 *
 * Only the messages actually in use live here. The full event list of §5.2/§5.3 arrives one
 * lot at a time, with the feature that sends it: a name declared before anything sends it
 * cannot be kept honest.
 */

import type { PlaceholderStateView } from './state-view';

/** The name the matchmaker knows the game room by. Joining by game code arrives with L1-01. */
export const GAME_ROOM_NAME = 'game';

/** The personalised state of one recipient (technical spec §5.3). One per client, never a broadcast. */
export const STATE_UPDATE = 'stateUpdate';

/**
 * Sent by a client once it has registered its message handlers, to ask for its first view.
 *
 * Not in technical spec §5.2's event list: it exists because the Colyseus SDK **drops** a
 * message that arrives before a handler for it is registered, and a server sending the first
 * view from `onJoin` is racing the client's own join promise. With the state carried by
 * messages rather than a synchronised schema, that first view has to be asked for.
 */
export const CLIENT_READY = 'clientReady';

/** Server → client payloads, keyed by message name. Used to type both ends of the wire. */
export interface ServerToClientMessages {
  [STATE_UPDATE]: PlaceholderStateView;
}

/**
 * What a client sends when joining a room.
 *
 * `protocolVersion` lets the server refuse a client whose message contract is too old to
 * understand what it would receive (see `PROTOCOL_VERSION`). Like every client-supplied
 * value, the server revalidates it and trusts nothing else in the payload.
 */
export interface JoinRoomOptions {
  protocolVersion: number;
}
