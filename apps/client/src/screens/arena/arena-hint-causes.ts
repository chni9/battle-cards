/**
 * Hint dismiss causes on the arena — technical spec v7 §6.12 (the L46 auto-dismiss rules); Lot 75
 * plan A.9.2, ruling R11 (L75-06). V2 parity: the `noteHintCause` call sites in `screens/table.tsx`.
 *
 * Pure. The shell calls `hintCauseForIntent` from the commit's `onSent` and `hintCauseForCardSheet`
 * from its card opener; `view-model/` stays free of React (plan Architecture).
 */

import type { HintDismissCause } from '../../view-model/select-hint';
import type { ArenaIntent } from './arena-commit';
import type { CardSheetSource } from './card-sheet-source';
import { unreachable } from './unreachable';

/** The cause a sent intent notes, or null when V2 noted none (Deactivate, Activate duplication, a non-reward answer). */
export function hintCauseForIntent(intent: ArenaIntent): HintDismissCause | null {
  switch (intent.kind) {
    case 'drawCard':
      return 'draw';
    case 'playCard':
    case 'playMultipleAttacks':
    case 'sellCard':
    case 'upgradeCard':
    case 'buyCard':
    case 'buyUpgradePoint':
    case 'sellUpgradePoint':
    case 'buySpecialCard':
    case 'buyPoolCard':
    case 'clearSpy':
      return 'playing-intent';
    case 'deactivatePersistent':
    case 'activateDuplication':
      return null;
    case 'resolveSubChoice':
      return intent.payload.kind === 'elimination-reward' ? 'confirm-reward' : null;
    default:
      return unreachable(intent);
  }
}

/** The cause opening a card sheet notes: only the own hand and specials teach (V2 noted them on every own-card select). */
export function hintCauseForCardSheet(source: CardSheetSource): HintDismissCause | null {
  switch (source.kind) {
    case 'hand':
      return 'inspect-hand';
    case 'special':
      return 'inspect-special';
    case 'in-play':
    case 'spy-reveal':
    case 'queue':
    case 'log':
    case 'pool':
    case 'shop':
      return null;
    default:
      return unreachable(source);
  }
}
