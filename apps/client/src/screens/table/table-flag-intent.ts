/**
 * Table corner flag intent — L43-05 / technical spec v6 §6.1.
 * Presentation only; server still revalidates Leave / Forfeit.
 */

export type TableFlagIntent = 'hidden' | 'forfeit' | 'leaveTable';

export type TableFlagLeaveAction = 'hidden' | 'forfeit' | 'leaveGame';

export function tableFlagIntent(input: {
  readOnly: boolean;
  selfEliminated: boolean;
}): TableFlagIntent {
  if (input.readOnly) {
    return 'hidden';
  }
  if (input.selfEliminated) {
    return 'leaveTable';
  }
  return 'forfeit';
}

/** Confirm action for the flag: Forfeit keeps the socket; spectator Leave disconnects. */
export function tableFlagLeaveAction(input: {
  readOnly: boolean;
  selfEliminated: boolean;
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
