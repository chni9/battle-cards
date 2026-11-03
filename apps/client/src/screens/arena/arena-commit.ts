/**
 * The arena's single intent exit — technical spec v7 §6.6.4 (an intent leaves only on a target tap,
 * an explicit button or a drop on a valid zone); Lot 74 plan Appendix A.6 (L74-08).
 *
 * No component calls an intent handler (`onPlayCard`, `onSellCard`, …) directly: `ArenaScreen`
 * builds one `ArenaCommit` per render from its props and passes it down. That is the one place
 * where L75's `allowTutorialSend`, L74-17's own-intent FX and L74-25's reject spring-back plug in:
 * `hooks.allow` can veto a send, and `hooks.onSent` runs after it with the caller's
 * `CommitContext` (L74-17, plan A.9.3). A caller with no context calls `commit(intent)` with one
 * argument, never `commit(intent, undefined)`.
 * `commit` returns whether the intent went out, and a caller latches, closes its sheet or ends
 * targeting only on `true` (L74 Part 2 final review): L75's `allowTutorialSend` vetoes on client
 * state while the models keep the buttons enabled, so a vetoed send must leave its control live.
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
  ResolveSubChoicePayload,
  SharedCardId,
  UpgradeCardPayload,
} from '@card-battle/shared';

import type { PlayCardOptions } from '../../net/use-room-connection';
import type { CardIntent, Point } from '../../view-model/drop-target';
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
  | { kind: 'buyPoolCard' }
  /** A sub-choice answer (L74-18, spec v7 §6.7; plan A.9.3). */
  | { kind: 'resolveSubChoice'; payload: ResolveSubChoicePayload };

/** L74-17. Where an intent came from, for own-intent FX and the reject spring-back (L74-25). */
export interface CommitContext {
  /** The hand / special card the intent spends, when there is one. */
  readonly instanceId?: string;
  /** Viewport point of a drop (drag), so the play flight starts where the card was released. */
  readonly dropPoint?: Point;
}

/** L74-17. */
export interface ArenaCommitHooks {
  /**
   * Veto a send; absent = allow. L74-25 sets `() => !reconnecting`. L75 composes it with
   * `allowTutorialSend`; it never replaces it.
   */
  readonly allow?: (intent: ArenaIntent) => boolean;
  /** After a send that went out: L74-17 own-intent FX (`ownIntentFxFor`), L74-25 the last-send record. `{}` for a one-argument call. */
  readonly onSent?: (intent: ArenaIntent, context: CommitContext) => void;
}

/**
 * Returns whether the intent went out: false when `allow` vetoed it or its optional handler is
 * absent. Every latch, sheet close and targeting end keys on it (L74 Part 2 final review).
 */
export type ArenaCommit = (intent: ArenaIntent, context?: CommitContext) => boolean;

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
  | 'onResolveSubChoice'
>;

/** Whether the intent reached a handler: false only for an absent optional handler. */
function sendIntent(handlers: ArenaIntentHandlers, intent: ArenaIntent): boolean {
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
      return true;
    }
    case 'sellCard':
      handlers.onSellCard(intent.payload.instanceId);
      return true;
    case 'upgradeCard':
      handlers.onUpgradeCard(intent.payload.instanceId);
      return true;
    case 'playMultipleAttacks':
      handlers.onPlayMultipleAttacks(intent.payload.attacks);
      return true;
    case 'deactivatePersistent':
      if (handlers.onDeactivatePersistent === undefined) return false;
      handlers.onDeactivatePersistent(intent.payload.effectId);
      return true;
    case 'clearSpy':
      handlers.onClearSpy(intent.payload.targetPlayerId);
      return true;
    case 'drawCard':
      handlers.onDraw();
      return true;
    case 'activateDuplication':
      if (handlers.onActivateDuplication === undefined) return false;
      handlers.onActivateDuplication();
      return true;
    case 'buyCard':
      handlers.onBuyCard(intent.payload.cardId);
      return true;
    case 'buyUpgradePoint':
      handlers.onBuyUpgradePoint();
      return true;
    case 'sellUpgradePoint':
      handlers.onSellUpgradePoint();
      return true;
    case 'buySpecialCard':
      handlers.onBuySpecialCard();
      return true;
    case 'buyPoolCard':
      handlers.onBuyPoolCard();
      return true;
    case 'resolveSubChoice':
      handlers.onResolveSubChoice(intent.payload);
      return true;
    default: {
      const _exhaustive: never = intent;
      return _exhaustive;
    }
  }
}

export function createArenaCommit(handlers: ArenaIntentHandlers, hooks: ArenaCommitHooks = {}): ArenaCommit {
  return (intent, context) => {
    if (hooks.allow?.(intent) === false || !sendIntent(handlers, intent)) {
      return false;
    }
    hooks.onSent?.(intent, context ?? {});
    return true;
  };
}
