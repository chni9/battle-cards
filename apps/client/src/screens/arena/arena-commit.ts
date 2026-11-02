/**
 * The arena's single intent exit — technical spec v7 §6.6.4 (an intent leaves only on a target tap,
 * an explicit button or a drop on a valid zone); Lot 74 plan Appendix A.6 (L74-08).
 *
 * No component calls an intent handler (`onPlayCard`, `onSellCard`, …) directly: `ArenaScreen`
 * builds one `ArenaCommit` per render from its props and passes it down. That is the one place
 * where L75's `allowTutorialSend`, L74-17's own-intent FX and L74-25's reject spring-back plug in.
 * Leave, forfeit and chat are App-level actions, not `ArenaIntent`s: the top bar (and later the
 * chat sheet) calls `onLeave` / `onForfeit` / `onSendChat` directly, outside this helper.
 *
 * The helper never checks legality (golden rule 8): callers commit only enabled actions, and the
 * server revalidates every intent.
 */

import type {
  ClearSpyPayload,
  DeactivatePersistentPayload,
  PlayMultipleAttacksPayload,
  SharedCardId,
  UpgradeCardPayload,
} from '@card-battle/shared';

import type { PlayCardOptions } from '../../net/use-room-connection';
import type { CardIntent } from '../../view-model/drop-target';
import type { ArenaScreenProps } from './arena-screen';

export type ArenaIntent =
  | CardIntent
  | { kind: 'upgradeCard'; payload: UpgradeCardPayload }
  | { kind: 'playMultipleAttacks'; payload: PlayMultipleAttacksPayload }
  | { kind: 'deactivatePersistent'; payload: DeactivatePersistentPayload }
  | { kind: 'clearSpy'; payload: ClearSpyPayload }
  | { kind: 'drawCard' }
  | { kind: 'activateDuplication' }
  /** The Shop's buys (L74-14, spec v7 §6.8; plan A.9.3). */
  | { kind: 'buyCard'; payload: { cardId: SharedCardId } }
  | { kind: 'buyUpgradePoint' }
  | { kind: 'sellUpgradePoint' }
  | { kind: 'buySpecialCard' }
  | { kind: 'buyPoolCard' };
// L74-18 adds the sub-choice intent (resolveSubChoice).

export type ArenaCommit = (intent: ArenaIntent) => void;

/** The intent callbacks of `ArenaScreenProps` the helper routes to. */
export type ArenaIntentHandlers = Pick<
  ArenaScreenProps,
  | 'onPlayCard'
  | 'onSellCard'
  | 'onUpgradeCard'
  | 'onPlayMultipleAttacks'
  | 'onDraw'
  | 'onClearSpy'
  | 'onDeactivatePersistent'
  | 'onActivateDuplication'
  | 'onBuyCard'
  | 'onBuyUpgradePoint'
  | 'onSellUpgradePoint'
  | 'onBuySpecialCard'
  | 'onBuyPoolCard'
>;

export function createArenaCommit(handlers: ArenaIntentHandlers): ArenaCommit {
  return (intent) => {
    switch (intent.kind) {
      case 'playCard': {
        const { instanceId, targetPlayerId, quantity, consumeInstanceId } = intent.payload;
        // Only the defined keys: `exactOptionalPropertyTypes` forbids an explicit `undefined`.
        const options: PlayCardOptions = {
          ...(targetPlayerId !== undefined ? { targetPlayerId } : {}),
          ...(quantity !== undefined ? { quantity } : {}),
          ...(consumeInstanceId !== undefined ? { consumeInstanceId } : {}),
        };
        if (Object.keys(options).length === 0) {
          handlers.onPlayCard(instanceId);
        } else {
          handlers.onPlayCard(instanceId, options);
        }
        return;
      }
      case 'sellCard':
        handlers.onSellCard(intent.payload.instanceId);
        return;
      case 'upgradeCard':
        handlers.onUpgradeCard(intent.payload.instanceId);
        return;
      case 'playMultipleAttacks':
        handlers.onPlayMultipleAttacks(intent.payload.attacks);
        return;
      case 'deactivatePersistent':
        handlers.onDeactivatePersistent?.(intent.payload.effectId);
        return;
      case 'clearSpy':
        handlers.onClearSpy(intent.payload.targetPlayerId);
        return;
      case 'drawCard':
        handlers.onDraw();
        return;
      case 'activateDuplication':
        handlers.onActivateDuplication?.();
        return;
      case 'buyCard':
        handlers.onBuyCard(intent.payload.cardId);
        return;
      case 'buyUpgradePoint':
        handlers.onBuyUpgradePoint();
        return;
      case 'sellUpgradePoint':
        handlers.onSellUpgradePoint();
        return;
      case 'buySpecialCard':
        handlers.onBuySpecialCard();
        return;
      case 'buyPoolCard':
        handlers.onBuyPoolCard();
        return;
      default: {
        const _exhaustive: never = intent;
        return _exhaustive;
      }
    }
  };
}
