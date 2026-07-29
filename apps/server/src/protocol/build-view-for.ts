/**
 * Per-recipient view construction — technical spec §5.1, AGENTS golden rule 4.
 *
 * One function, one recipient. There is deliberately no "full view" builder anywhere for
 * this to filter down from: a filtering pipeline leaks every field added after it was
 * written, silently and without a test failing.
 *
 * A pure function on purpose — it needs no room, no socket and no server to be tested, which
 * is what makes the hidden-information tests of technical spec §8 level 2 cheap to write.
 *
 * L0-06 scope: the connection slice only. `GameState` does not exist yet (L1-03) and the real
 * view arrives with L1-09, which replaces this body and its return type. What must survive
 * that replacement is the shape of this module: recipient in, that recipient's view out.
 */

import type { PlaceholderStateView } from '@card-battle/shared';

export function buildViewFor(
  recipientSessionId: string,
  connectedSessionIds: readonly string[],
): PlaceholderStateView {
  if (!connectedSessionIds.includes(recipientSessionId)) {
    // A view is always built *for a participant*. Building one for anybody else means a
    // caller is about to send someone a view that is not theirs.
    throw new Error(`Cannot build a view for ${recipientSessionId}: not in the room`);
  }

  return {
    you: recipientSessionId,
    connected: [...connectedSessionIds],
  };
}
