/**
 * Table corner flag intent — L43-05 / technical spec v6 §6.1.
 * Presentation only; server still revalidates Leave / Forfeit.
 */

export type TableFlagIntent = 'hidden' | 'forfeit' | 'leaveTable';

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
