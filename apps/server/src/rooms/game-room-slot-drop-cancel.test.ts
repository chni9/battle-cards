/**
 * A human slot-drop cancel gives the turn back with a fresh turn timer (technical spec §5.5).
 * beginTurnOrAbsentAutoPlay sets turnDeadlineMs, or nulls it for a bot, tutorial or
 * disconnected seat, so the state sent after the cancel must be built after it. Otherwise
 * every view carries the previous deadline while TURN_STARTED announces the new one, and the
 * client timer counts down a stale clock until the next state (technical spec §5.3,
 * docs/agent/protocol.md rule 4). L82-01.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(dir, 'game-room.ts'), 'utf8');

describe('handleSlotDrop cancel turn restart (technical spec §5.3, §5.5)', () => {
  it('sets the new deadline before sending state, then announces TURN_STARTED', () => {
    const handler = source.slice(
      source.indexOf('private handleSlotDrop'),
      source.indexOf('private beginSlotDropTimer'),
    );
    const cancelBranch = handler.slice(
      handler.indexOf('if (parsed.cancel === true)'),
      handler.indexOf('const result = completeSlotDrop('),
    );
    const calls = [
      ...cancelBranch.matchAll(
        /this\.(beginTurnOrAbsentAutoPlay|sendStateToEveryone|broadcastTurnStarted)\(\)/g,
      ),
    ].map((match) => match[1]);

    expect(calls).toEqual(['beginTurnOrAbsentAutoPlay', 'sendStateToEveryone', 'broadcastTurnStarted']);
  });
});
