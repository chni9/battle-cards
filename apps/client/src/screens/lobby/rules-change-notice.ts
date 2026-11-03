/**
 * Guest rule-change notices (technical spec v7 §7.4, Q16 and Q17; client only, the ready state is
 * unchanged; plan Appendix A `lobby-rules-change-guest-effects`; A.9 rulings 4 and 10; L76-15).
 * The server sends no notice, so the lobby diffs two consecutive views of one room and one seat.
 * Pure: it reads no storage and no clock. The copy lives in `lobby-copy.ts`.
 */

import { defaultLobbyRules, type LobbyRules, type LobbyStateView } from '@card-battle/shared';

/** What the guest's rules toast says; the helpers return null for no toast. */
export interface LobbyRulesNotice {
  /** The host newly excluded this guest's kit pick, so the server moved it to Random (Lot 70). */
  readonly pickReset: boolean;
}

/** Ruling 4: 6 s, as the arena reject toast; a live sheet's focus trap keeps Tab off OK. */
export const LOBBY_RULES_TOAST_MS = 6000;

/** Excluded kits compare as a set: an order-only difference never toasts. */
function sameRules(before: LobbyRules, after: LobbyRules): boolean {
  const excludedBefore = new Set(before.excludedKitIds);
  return (
    before.excludedKitIds.length === after.excludedKitIds.length &&
    after.excludedKitIds.every((kitId) => excludedBefore.has(kitId)) &&
    before.randomOnly === after.randomOnly &&
    before.turnTimeSeconds === after.turnTimeSeconds
  );
}

/**
 * The notice for the step from `previous` to `next`, or null for none. A seated non-host guest of
 * the same room and seat only (A.9 ruling 10): a claim changes `you`, so no comparison crosses it.
 * `pickReset` needs the pick to have been a kit that is now excluded and was not before; a
 * Random-only toggle never resets it, because the server keeps the pick and only hides it
 * (decisions.md, L76-15).
 */
export function lobbyRulesNotice(previous: LobbyStateView | null, next: LobbyStateView): LobbyRulesNotice | null {
  if (previous === null) return null;
  if (previous.gameCode !== next.gameCode || previous.you !== next.you) return null;
  if (next.isSpectator === true || next.hostPlayerId === next.you) return null;
  const before = previous.lobbyRules ?? defaultLobbyRules();
  const after = next.lobbyRules ?? defaultLobbyRules();
  if (sameRules(before, after)) return null;
  const pick = previous.yourKitSelection;
  const pickReset =
    pick !== 'random' &&
    next.yourKitSelection === 'random' &&
    after.excludedKitIds.includes(pick) &&
    !before.excludedKitIds.includes(pick);
  return { pickReset };
}

/**
 * The open toast's notice after a new diff: null keeps it, a notice opens or swaps it, and a reset
 * line stays until the toast closes (a host edits in quick steps; the guest is still reading).
 */
export function mergeRulesNotice(open: LobbyRulesNotice | null, incoming: LobbyRulesNotice | null): LobbyRulesNotice | null {
  if (incoming === null) return open;
  return { pickReset: incoming.pickReset || open?.pickReset === true };
}
