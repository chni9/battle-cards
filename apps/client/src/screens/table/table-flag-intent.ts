/**
 * Table corner flag intent — L43-05 / technical spec v6 §6.1.
 * Presentation only; server still revalidates Leave / Forfeit.
 *
 * Designer 2026-08-21 follow-up: finished inspect keeps the flag as Return home
 * (overrides the earlier hide-on-readOnly ruling).
 */

import type { PlayKind } from '@card-battle/shared';

export type TableFlagIntent = 'hidden' | 'forfeit' | 'leaveTable' | 'returnHome' | 'skipTutorial';

export type TableFlagLeaveAction = 'hidden' | 'forfeit' | 'leaveGame';

export function tableFlagIntent(input: {
  readOnly: boolean;
  selfEliminated: boolean;
  playKind?: PlayKind;
}): TableFlagIntent {
  if (input.readOnly) {
    return 'returnHome';
  }
  if (input.playKind === 'tutorial') {
    return 'skipTutorial';
  }
  if (input.selfEliminated) {
    return 'leaveTable';
  }
  return 'forfeit';
}

/** Confirm action for the flag: Forfeit keeps the socket; Leave / Return home / Skip disconnect. */
export function tableFlagLeaveAction(input: {
  readOnly: boolean;
  selfEliminated: boolean;
  playKind?: PlayKind;
}): TableFlagLeaveAction {
  const intent = tableFlagIntent(input);
  if (intent === 'hidden') {
    return 'hidden';
  }
  if (intent === 'forfeit') {
    return 'forfeit';
  }
  return 'leaveGame';
}

export function tableFlagAriaLabel(
  intent: TableFlagIntent,
  labels: {
    forfeit: string;
    leaveTable: string;
    returnHome: string;
    skipTutorial: string;
  },
): string | null {
  if (intent === 'hidden') {
    return null;
  }
  if (intent === 'forfeit') {
    return labels.forfeit;
  }
  if (intent === 'leaveTable') {
    return labels.leaveTable;
  }
  if (intent === 'skipTutorial') {
    return labels.skipTutorial;
  }
  return labels.returnHome;
}
