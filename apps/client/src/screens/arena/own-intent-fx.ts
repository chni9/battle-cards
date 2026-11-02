/**
 * Which own intent flies a card — technical spec v7 §6.6.2, §6.6.3, §6.12; Appendix A
 * `table-fx-card-ghosts`; Lot 74 plan A.9.3, ruling S5 (L74-17).
 *
 * The commit helper's `onSent` hook maps each sent `ArenaIntent` here, after the send (Lot 14), so
 * every commit path (card sheet, target tap, drop) flies the same way. A play or a sell starts at
 * the drop point when the card was dragged. The kinds V2 flew no card for (`buyPoolWithFx`,
 * `buyUpgradeWithFx`, `sellUpgradeWithFx`, Draw, Upgrade, Unspy, …) return null. The switch is
 * exhaustive, so a new `ArenaIntent` fails typecheck until it gets a case (L74-18 adds
 * `resolveSubChoice`).
 */

import type { OwnIntentFx } from '../../view-model/fx-triggers';
import type { ArenaIntent, CommitContext } from './arena-commit';

export function ownIntentFxFor(intent: ArenaIntent, context: CommitContext): OwnIntentFx | null {
  const origin = context.dropPoint !== undefined ? { origin: context.dropPoint } : {};
  switch (intent.kind) {
    case 'playCard':
      return { kind: 'play', instanceId: intent.payload.instanceId, ...origin };
    case 'sellCard':
      return { kind: 'sell', instanceId: intent.payload.instanceId, ...origin };
    case 'playMultipleAttacks':
      return { kind: 'multi-attack', instanceIds: intent.payload.attacks.map((attack) => attack.instanceId) };
    case 'buyCard':
      return { kind: 'buy-card', cardId: intent.payload.cardId };
    case 'buySpecialCard':
      return { kind: 'buy-special' };
    case 'upgradeCard':
    case 'deactivatePersistent':
    case 'clearSpy':
    case 'drawCard':
    case 'activateDuplication':
    case 'buyUpgradePoint':
    case 'sellUpgradePoint':
    case 'buyPoolCard':
      return null;
    default: {
      const _exhaustive: never = intent;
      return _exhaustive;
    }
  }
}
