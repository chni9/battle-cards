/**
 * What a client receives about the game — technical spec §5.1.
 *
 * The server builds one of these **per recipient**, and there is deliberately no type
 * describing a complete state that could be filtered on the way out: that pattern leaks
 * every field added later.
 */

/**
 * Placeholder view, for the connection slice only (L0-06): the recipient's own session and
 * who else is in the room. It carries no game data because no game exists yet — the real
 * per-recipient view arrives with L1-09, which replaces this type.
 *
 * Nothing here is private: a player already sees who is connected (technical spec §5.1).
 */
export interface PlaceholderStateView {
  /** The recipient's own session id. */
  you: string;
  /** Everyone currently connected to the room, in join order. */
  connected: readonly string[];
}
