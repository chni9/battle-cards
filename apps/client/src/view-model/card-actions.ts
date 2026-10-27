/**
 * Card actions — technical spec v7 §4.3, §6.6.1, §11 (Q37, Q39, Q40, Q44); Appendix A
 * `card-actions-dialog`, `table-target-picker-eligibility`, `regeneration-quantity-picker`,
 * `card-transformer-consume-picker`, `assassin-multi-attack`, `table-inspect-active-upgrade`,
 * `deactivate-confirm-dialog`, `active-persistent-thumbs`, `sentence-chips`,
 * `global-activated-art-guard`; Lot 73 (L73-06, L73-07).
 *
 * What a hand or special card offers, in display order (Use, Upgrade, Sell, Multi-attack), and
 * where Use routes. A hidden action is absent; an offered one is disabled with the first reason the
 * server would reject it for, in the server's own check order. Seat sets and the extra Use gates
 * mirror `apps/server/src/engine/turn/list-legal-play-card.ts`, `perform-action.ts`
 * (`playCardAction`, `playMultipleAttacksAction`) and each handler's `canPlay`, read from this
 * recipient's view only (§6.3). A reason shows only when the view proves the server rejects:
 * there is no client immunity filter, and the server revalidates every intent (golden rule 8).
 *
 * A card in play (an active persistent, a Shield, a ticking Sentence) offers only Upgrade and
 * Deactivate, and only when the server would find it as the POV's own (Q37): another seat's card
 * in play gets a read-only sheet. `inPlayThumbs` lists one seat's cards in play for the strips.
 */

import {
  ACTIVE_SHIELD_INSTANCE_ID,
  SHARED_CARD_CATALOG,
  cardActsOnOpponents,
  getCard,
  getKit,
  isAttackCardId,
  isSharedAttackCardId,
  isSharedCardId,
  isTemporarilyUnavailableCardId,
  isUpgradeableActiveCardId,
  type CardId,
  type CardInstance,
  type PendingEffectView,
  type PendingSentenceView,
  type PersistentEffectView,
  type PlayingStateView,
  type PublicPlayerView,
} from '@card-battle/shared';

import { CARDS_WITH_ACTIVATED_ART } from '../ui/asset-lookup';
import { structuredPlayCost } from '../ui/structured-cost';
import { actionLock, type ActionContext } from './action-lock';
import { availabilityFor, type ActionAvailability, type DisabledReason } from './action-reasons';
import { persistentToCardInstance } from './active-display';
import { attackTargetOpponents, thiefTargetOpponents } from './attack-targets';

/**
 * A card the POV can act on (hand, special), or only read: an opponent's Spy hand, the log, the
 * queue, the pool or the shop. A card in play (L73-07) names its seat: an active persistent, a
 * Shield (`isUpgraded` as that seat shows it) or a ticking Sentence, whose owner is its
 * `sourcePlayerId`.
 */
export type CardRef =
  | { zone: 'hand' | 'special'; instance: CardInstance }
  | { zone: 'read-only'; instance: CardInstance }
  | { zone: 'active'; ownerPlayerId: string; effect: PersistentEffectView }
  | { zone: 'shield'; ownerPlayerId: string; isUpgraded: boolean }
  | { zone: 'sentence'; ownerPlayerId: string; sentence: PendingSentenceView };

/** A card in play: the in-play branch of `cardActions` and every `InPlayThumb` (L73-07). */
export type InPlayCardRef = Extract<CardRef, { zone: 'active' | 'shield' | 'sentence' }>;

/** A held or read-only card: everything `cardActions` routes through Use. */
type HeldCardRef = Exclude<CardRef, InPlayCardRef>;

/** `deactivate` is for own persistents in play (L73-07). */
export type CardActionKind = 'use' | 'upgrade' | 'sell' | 'multi-attack' | 'deactivate';

/** Hidden actions are absent from the model; a present one is enabled or carries its reason. */
export interface CardAction extends ActionAvailability {
  kind: CardActionKind;
}

/** Quantities 1 to 4: `regeneration.ts` `MAX_LIVES_PER_USE` (rules spec §3). */
export const REGENERATION_QUANTITIES = [1, 2, 3, 4] as const;
export type RegenerationQuantity = (typeof REGENERATION_QUANTITIES)[number];

export interface RegenerationTile extends ActionAvailability {
  quantity: RegenerationQuantity;
  label: string;
  /** Points: the per-life price for this copy's tier × quantity. */
  totalCost: number;
}

export type UseRouting =
  /** May be empty: Use is then disabled with `no-valid-target`. */
  | { kind: 'target'; seatIds: readonly string[] }
  | { kind: 'send' }
  | { kind: 'regeneration'; tiles: readonly RegenerationTile[] }
  | { kind: 'consume'; options: readonly CardInstance[] };

/** `perform-action.ts` `playMultipleAttacksAction` rejects fewer with `multi-attack-need-two`. */
export const MULTI_ATTACK_MIN_ATTACKS = 2;

export interface MultiAttackRow {
  instance: CardInstance;
  seatIds: readonly string[];
}

export interface MultiAttackModel {
  rows: readonly MultiAttackRow[];
  minAttacks: typeof MULTI_ATTACK_MIN_ATTACKS;
}

export interface CardActionsModel {
  /**
   * `CardInstance.instanceId` for hand, special and read-only refs; `effect.id` for an active;
   * `'active-shield'` for the POV's own Shield and `active-shield:<playerId>` for another seat's;
   * `sentence.id` for a Sentence.
   */
  instanceId: string;
  /** Order: use, upgrade, sell, multi-attack, deactivate. */
  actions: readonly CardAction[];
  /** Null when Use is absent. Set even while Use is disabled, so the sheet shows it read-only. */
  use: UseRouting | null;
  multiAttack: MultiAttackModel | null;
}

/** Use before the lock and price are applied: the routing, plus the card's own `canPlay` gate. */
type UsePlan =
  | { kind: 'target'; seatIds: readonly string[] }
  | { kind: 'send'; check: DisabledReason | null }
  | { kind: 'regeneration'; pointsPerLife: number }
  | { kind: 'consume'; options: readonly CardInstance[] };

/** `is-invisible.ts` `isIllegalOpposingTarget`: never a single target (L65-02); a corpse is. */
function isLivingInvisible(player: PublicPlayerView): boolean {
  return (
    !player.isEliminated &&
    player.activePersistentEffects.some((effect) => effect.cardId === 'invisibility')
  );
}

/** The server's `playerIsInvisible(actor)`, read from the POV's own record. */
function isOwnInvisible(view: PlayingStateView): boolean {
  return view.self.activePersistentEffects.some((effect) => effect.cardId === 'invisibility');
}

/** `grant-block-turns.ts` `attacksForbiddenDuringBlock`; `PrivateSelfView` has no ban field. */
function isPovBanned(view: PlayingStateView): boolean {
  return view.players.some((player) => player.id === view.you && player.blockAttacksForbidden);
}

/** Every seat but the POV, in `view.players` order. */
function opponentsOf(view: PlayingStateView): PublicPlayerView[] {
  return view.players.filter((player) => player.id !== view.you);
}

/** `list-legal-play-card.ts:41-44` `livingOpponents`; the upgraded thieves' `livingTargets`. */
function livingTargetIds(view: PlayingStateView): string[] {
  return opponentsOf(view)
    .filter((player) => !player.isEliminated && !isLivingInvisible(player))
    .map((player) => player.id);
}

/**
 * `list-legal-play-card.ts:138-145`, `perform-action.ts` `playCardAction` target check: living
 * non-Invisible seats, plus a corpse whose attack is still pending on the POV
 * (`riposte-target.ts`, Lot 68).
 */
function attackSeatIds(view: PlayingStateView): string[] {
  return attackTargetOpponents(opponentsOf(view), view.pendingEffects, view.you).map(
    (player) => player.id,
  );
}

/** `list-legal-play-card.ts:146-153`: the same with a pending Thief. */
function thiefSeatIds(view: PlayingStateView): string[] {
  return thiefTargetOpponents(opponentsOf(view), view.pendingEffects, view.you).map(
    (player) => player.id,
  );
}

/** `list-legal-play-card.ts:45-50` and `absorb-window.ts` `isAbsorberTargetable`. */
function absorberSeatIds(view: PlayingStateView): string[] {
  return opponentsOf(view)
    .filter(
      (player) =>
        (!player.isEliminated || player.absorbWindowOpen) && !isLivingInvisible(player),
    )
    .map((player) => player.id);
}

/** The POV's queue: an effect sits on its target (`queue-effect.ts`, `mirror-choice.ts`). */
function pendingOnPov(view: PlayingStateView): PendingEffectView[] {
  return view.pendingEffects.filter((effect) => effect.targetPlayerId === view.you);
}

/**
 * `mirror-choice.ts` `listEligibleMirrorTargets`: a pending attack on the POV, base Mirror only
 * against a base attack, never a Super Mirror redirect, and MEGA ATTACK only base and only for an
 * upgraded Mirror (technical spec v4 §4.7).
 */
function hasMirrorTarget(view: PlayingStateView, isUpgradedMirror: boolean): boolean {
  return pendingOnPov(view).some((effect) => {
    if (!isAttackCardId(effect.cardId) || effect.redirectedBy === 'super-mirror') {
      return false;
    }
    if (!isUpgradedMirror && effect.isUpgraded) {
      return false;
    }
    return effect.cardId !== 'mega-attack' || (isUpgradedMirror && !effect.isUpgraded);
  });
}

/** `mirror-choice.ts` `listEligibleSuperMirrorTargets`: any pending attack on the POV. */
function hasSuperMirrorTarget(view: PlayingStateView): boolean {
  return pendingOnPov(view).some((effect) => isAttackCardId(effect.cardId));
}

/**
 * `pending-sentences.ts` `sentenceCandidates`: a living non-Invisible player, the POV included
 * for a base Sentence. Opponents' lives are hidden, so a living seat counts (never stricter).
 */
function hasSentenceCandidate(view: PlayingStateView, isUpgraded: boolean): boolean {
  return view.players.some(
    (player) =>
      !player.isEliminated && !isLivingInvisible(player) && (!isUpgraded || player.id !== view.you),
  );
}

/** Points per life for this tier: 3, or 2 upgraded (`regeneration.ts`; rules spec §3). */
function regenerationPointsPerLife(isUpgraded: boolean): number {
  const cost = structuredPlayCost(SHARED_CARD_CATALOG.regeneration, isUpgraded);
  return cost?.kind === 'pointsPerLife' ? cost.amount : 0;
}

/** `play-cost.ts` `playPointsCost`: the catalog points, whatever the tier. */
function catalogPlayPoints(cardId: CardId): number {
  return getCard(cardId)?.cost.points ?? 0;
}

function sendUnless(blocked: boolean, reason: DisabledReason): UsePlan {
  return { kind: 'send', check: blocked ? reason : null };
}

/** Per-card routing and `canPlay` gate (the Lot 73 plan's L73-06 target table). */
function planUse(view: PlayingStateView, instance: CardInstance): UsePlan {
  const { cardId, isUpgraded } = instance;
  if (isSharedAttackCardId(cardId)) {
    return { kind: 'target', seatIds: attackSeatIds(view) };
  }
  switch (cardId) {
    case 'thief':
      return { kind: 'target', seatIds: thiefSeatIds(view) };
    case 'absorber':
      return { kind: 'target', seatIds: absorberSeatIds(view) };
    case 'spy':
    case 'cloning':
    case 'curse':
      return { kind: 'target', seatIds: livingTargetIds(view) };
    case 'card-thief':
      // card-thief.ts canPlay: the upgrade hits everyone and checks no living seat.
      return isUpgraded
        ? { kind: 'send', check: null }
        : { kind: 'target', seatIds: livingTargetIds(view) };
    case 'upgrade-point-thief':
    case 'spy-thief':
      // upgrade-point-thief.ts / spy-thief.ts canPlay: the upgrade needs a living target.
      return isUpgraded
        ? sendUnless(livingTargetIds(view).length === 0, 'no-valid-target')
        : { kind: 'target', seatIds: livingTargetIds(view) };
    case 'sentence':
      return sendUnless(!hasSentenceCandidate(view, isUpgraded), 'no-valid-target');
    case 'mirror':
      return sendUnless(!hasMirrorTarget(view, isUpgraded), 'no-valid-target');
    case 'super-mirror':
      return sendUnless(!hasSuperMirrorTarget(view), 'no-valid-target');
    case 'card-absorber':
      // card-absorber.ts canPlay: `state.pool.length >= 1`.
      return sendUnless(view.pool.length === 0, 'pool-empty');
    case 'reanimation':
      // reanimation.ts canPlay: at most one armed (#V4-12c; greyed by designer 2026-10-27).
      return sendUnless(
        view.self.activePersistentEffects.some((effect) => effect.cardId === 'reanimation'),
        'reanimation-armed',
      );
    case 'regeneration':
      return { kind: 'regeneration', pointsPerLife: regenerationPointsPerLife(isUpgraded) };
    case 'card-transformer':
      // card-transformer.ts canPlay: consume a shared (attack or action) hand card.
      return {
        kind: 'consume',
        options: view.self.hand.filter((card) => isSharedCardId(card.cardId)),
      };
    default:
      // MEGA ATTACK, Block and every other card: canPlay asks only `targetPlayerId === null`.
      return { kind: 'send', check: null };
  }
}

function planCheck(plan: UsePlan): DisabledReason | null {
  switch (plan.kind) {
    case 'target':
      return plan.seatIds.length === 0 ? 'no-valid-target' : null;
    case 'send':
      return plan.check;
    case 'regeneration':
      return null;
    case 'consume':
      return plan.options.length === 0 ? 'nothing-to-consume' : null;
  }
}

/**
 * Use's first reason, in `perform-action.ts` `playCardAction` order: frozen card, own
 * Invisibility on a card that acts on others (L58-06), the Block ban (attacks here, Block through
 * its `canPlay`, as `list-legal-play-card.ts:68-73` groups them), the card's target or `canPlay`
 * gate, then the play price (Regeneration: one life's price, the cheapest legal quantity).
 */
function reasonForUse(
  view: PlayingStateView,
  instance: CardInstance,
  plan: UsePlan,
  lock: DisabledReason | null,
): DisabledReason | null {
  const { cardId } = instance;
  const playPoints = plan.kind === 'regeneration' ? plan.pointsPerLife : catalogPlayPoints(cardId);
  return (
    lock ??
    (isTemporarilyUnavailableCardId(cardId) ? 'temporarily-unavailable' : null) ??
    (isOwnInvisible(view) && cardActsOnOpponents(cardId) ? 'invisibility' : null) ??
    (isPovBanned(view) && (isAttackCardId(cardId) || cardId === 'block') ? 'attack-ban' : null) ??
    planCheck(plan) ??
    (view.self.points < playPoints ? 'not-enough-points' : null)
  );
}

function regenerationLabel(quantity: RegenerationQuantity): string {
  // V2 screens/table/card-actions.tsx regenerationQuantityLabel.
  return quantity === 1 ? '1 life' : `${String(quantity)} lives`;
}

function routingFor(
  view: PlayingStateView,
  plan: UsePlan,
  useReason: DisabledReason | null,
): UseRouting {
  switch (plan.kind) {
    case 'target':
      return { kind: 'target', seatIds: plan.seatIds };
    case 'send':
      return { kind: 'send' };
    case 'consume':
      return { kind: 'consume', options: plan.options };
    case 'regeneration':
      // Each tile takes Use's reason first, then its own price (regeneration.ts canPlay).
      return {
        kind: 'regeneration',
        tiles: REGENERATION_QUANTITIES.map((quantity) => {
          const totalCost = plan.pointsPerLife * quantity;
          const price = view.self.points < totalCost ? 'not-enough-points' : null;
          return {
            quantity,
            label: regenerationLabel(quantity),
            totalCost,
            ...availabilityFor(useReason ?? price),
          };
        }),
      };
  }
}

/**
 * Assassin multi-attack (Q44): offered on a shared attack in hand when the kit allows it and the
 * hand holds at least two shared attacks (`assassin-candidates.ts:91-93`; never MEGA ATTACK). Rows
 * are the hand's shared attacks in hand order, each with the attack seat set.
 */
function multiAttackOffer(view: PlayingStateView, card: HeldCardRef): MultiAttackModel | null {
  if (card.zone !== 'hand' || !isSharedAttackCardId(card.instance.cardId)) {
    return null;
  }
  if (!getKit(view.self.kitId).traits.allowsMultipleAttacksPerTurn) {
    return null;
  }
  const attacks = view.self.hand.filter((instance) => isSharedAttackCardId(instance.cardId));
  if (attacks.length < MULTI_ATTACK_MIN_ATTACKS) {
    return null;
  }
  const seatIds = attackSeatIds(view);
  return {
    rows: attacks.map((instance) => ({ instance, seatIds })),
    minAttacks: MULTI_ATTACK_MIN_ATTACKS,
  };
}

/**
 * `perform-action.ts:1536-1626` `playMultipleAttacksAction` order: the Block ban, own
 * Invisibility, a valid target, then the summed price, here of the two cheapest hand attacks.
 */
function multiAttackReason(
  view: PlayingStateView,
  offer: MultiAttackModel,
  lock: DisabledReason | null,
): DisabledReason | null {
  const cheapest = offer.rows
    .map((row) => catalogPlayPoints(row.instance.cardId))
    .sort((left, right) => left - right)
    .slice(0, MULTI_ATTACK_MIN_ATTACKS)
    .reduce((sum, points) => sum + points, 0);
  return (
    lock ??
    (isPovBanned(view) ? 'attack-ban' : null) ??
    (isOwnInvisible(view) ? 'invisibility' : null) ??
    (attackSeatIds(view).length === 0 ? 'no-valid-target' : null) ??
    (view.self.points < cheapest ? 'not-enough-points' : null)
  );
}

/**
 * Upgrade's reason: the lock, then the upgrade point (`upgrade-card.ts:40-42`). It has no other
 * check (`list-legal-economy.ts:49-71`), so Invisibility and the Block ban leave it usable.
 */
function upgradeReason(view: PlayingStateView, lock: DisabledReason | null): DisabledReason | null {
  return lock ?? (view.self.upgradePoints < 1 ? 'no-upgrade-point' : null);
}

/** A walk-in owns nothing in play: its `self` is filler data (Q38). */
function isOwnSeat(view: PlayingStateView, ownerPlayerId: string): boolean {
  return view.isSpectator !== true && ownerPlayerId === view.you;
}

/**
 * The Shield's id. The server knows only the actor's own `ACTIVE_SHIELD_INSTANCE_ID`; another
 * seat's Shield gets a per-seat id that no intent can carry as the POV's own (Q37).
 */
function shieldInstanceId(view: PlayingStateView, ownerPlayerId: string): string {
  return isOwnSeat(view, ownerPlayerId)
    ? ACTIVE_SHIELD_INSTANCE_ID
    : `${ACTIVE_SHIELD_INSTANCE_ID}:${ownerPlayerId}`;
}

function inPlayInstanceId(view: PlayingStateView, ref: InPlayCardRef): string {
  switch (ref.zone) {
    case 'active':
      return ref.effect.id;
    case 'shield':
      return shieldInstanceId(view, ref.ownerPlayerId);
    case 'sentence':
      return ref.sentence.id;
  }
}

interface InPlayOffer {
  upgradeable: boolean;
  deactivatable: boolean;
}

/**
 * The POV owns a card in play exactly when the server would find it as the actor's own
 * (`upgrade-card.ts:44-108`; `list-legal-deactivate.ts:23-31`). The upgraded state is read from
 * that own record, never from the ref. Upgrade: an unupgraded own active in
 * `UPGRADEABLE_ACTIVE_CARD_IDS` (never Curse or Reanimation), the own Shield while
 * `self.shield > 0`, an own ticking Sentence. Deactivate: every own persistent, a Curse on the
 * POV included, never Shield or Sentence (Lot 69). Null: a read-only sheet.
 */
function ownInPlay(view: PlayingStateView, ref: InPlayCardRef): InPlayOffer | null {
  if (!isOwnSeat(view, ref.ownerPlayerId)) {
    return null;
  }
  switch (ref.zone) {
    case 'shield':
      return view.self.shield > 0
        ? { upgradeable: !view.self.shieldIsUpgraded, deactivatable: false }
        : null;
    case 'sentence': {
      const entry = view.pendingSentences.find(
        (sentence) => sentence.id === ref.sentence.id && sentence.sourcePlayerId === view.you,
      );
      return entry === undefined ? null : { upgradeable: !entry.isUpgraded, deactivatable: false };
    }
    case 'active': {
      const effect = view.self.activePersistentEffects.find((entry) => entry.id === ref.effect.id);
      return effect === undefined
        ? null
        : {
            upgradeable: !effect.isUpgraded && isUpgradeableActiveCardId(effect.cardId),
            deactivatable: true,
          };
    }
  }
}

/**
 * Upgrade then Deactivate. Deactivate has no check beyond the lock, which covers the
 * `game-room.ts` `handleAction` sub-choice gate (Q40); own Invisibility leaves both usable.
 */
function inPlayActions(
  view: PlayingStateView,
  ref: InPlayCardRef,
  ctx: ActionContext,
): CardActionsModel {
  const offer = ownInPlay(view, ref);
  const actions: CardAction[] = [];
  if (offer !== null) {
    const lock = actionLock(view, ctx);
    if (offer.upgradeable) {
      actions.push({ kind: 'upgrade', ...availabilityFor(upgradeReason(view, lock)) });
    }
    if (offer.deactivatable) {
      actions.push({ kind: 'deactivate', ...availabilityFor(lock) });
    }
  }
  return { instanceId: inPlayInstanceId(view, ref), actions, use: null, multiAttack: null };
}

/**
 * The actions for one card. Use is always offered on a held card; Upgrade unless the copy is
 * upgraded (`upgrade-card.ts`); Sell only for a shared card in hand (`sell-card.ts`);
 * Multi-attack per `multiAttackOffer`. Upgrade and Sell have no check beyond the lock and the
 * upgrade point (`list-legal-economy.ts:43-71`), so Invisibility and the Block ban leave them
 * usable. A card in play goes to `inPlayActions`.
 */
export function cardActions(
  view: PlayingStateView,
  card: CardRef,
  ctx: ActionContext,
): CardActionsModel {
  if (card.zone === 'active' || card.zone === 'shield' || card.zone === 'sentence') {
    return inPlayActions(view, card, ctx);
  }
  const { instance } = card;
  if (card.zone === 'read-only') {
    return { instanceId: instance.instanceId, actions: [], use: null, multiAttack: null };
  }

  const lock = actionLock(view, ctx);
  const plan = planUse(view, instance);
  const useReason = reasonForUse(view, instance, plan, lock);
  const actions: CardAction[] = [{ kind: 'use', ...availabilityFor(useReason) }];
  if (!instance.isUpgraded) {
    actions.push({ kind: 'upgrade', ...availabilityFor(upgradeReason(view, lock)) });
  }
  if (card.zone === 'hand' && isSharedCardId(instance.cardId)) {
    actions.push({ kind: 'sell', ...availabilityFor(lock) });
  }
  const multiAttack = multiAttackOffer(view, card);
  if (multiAttack !== null) {
    actions.push({
      kind: 'multi-attack',
      ...availabilityFor(multiAttackReason(view, multiAttack, lock)),
    });
  }

  return {
    instanceId: instance.instanceId,
    actions,
    use: routingFor(view, plan, useReason),
    multiAttack,
  };
}

/** A thumb's count, shown under the art (V2 `active-persistent-thumb.tsx`, L56-06 / L58-06). */
export type ThumbBadge =
  /** `PersistentEffectView.counter` on any persistent but Invisibility. */
  | { kind: 'card-lives'; value: number }
  /** Invisibility's turns left (L58-06). */
  | { kind: 'turns'; value: number }
  /** `PendingSentence.remainingOwnerTurns`: turns, not card lives. */
  | { kind: 'sentence-turns'; value: number };

export interface InPlayThumb {
  /** Feed it to `cardActions` for the sheet. Own Shield: `self.shieldIsUpgraded`; another seat's: `activeShield.isUpgraded`. */
  ref: InPlayCardRef;
  /** The face; `instanceId` is the `cardActions` model's `instanceId`. */
  instance: CardInstance;
  /** Null for a Shield and any persistent whose `counter` is null (Curse, Reanimation). */
  badge: ThumbBadge | null;
  /** The activated art; never for Shield or Sentence (Appendix A `global-activated-art-guard`). */
  activatedArt: boolean;
}

/** `ui/asset-lookup.ts`: the cards with an activated PNG. A `Set<string>` reads any `CardId`. */
const ACTIVATED_ART_CARD_IDS = new Set<string>(CARDS_WITH_ACTIVATED_ART);

function shieldThumb(view: PlayingStateView, ownerPlayerId: string, isUpgraded: boolean): InPlayThumb {
  return {
    ref: { zone: 'shield', ownerPlayerId, isUpgraded },
    instance: { instanceId: shieldInstanceId(view, ownerPlayerId), cardId: 'shield', isUpgraded },
    badge: null,
    activatedArt: false,
  };
}

function persistentBadge(effect: PersistentEffectView): ThumbBadge | null {
  if (effect.counter === null) {
    return null;
  }
  return effect.cardId === 'invisibility'
    ? { kind: 'turns', value: effect.counter }
    : { kind: 'card-lives', value: effect.counter };
}

function persistentThumb(ownerPlayerId: string, effect: PersistentEffectView): InPlayThumb {
  return {
    ref: { zone: 'active', ownerPlayerId, effect },
    instance: persistentToCardInstance(effect),
    badge: persistentBadge(effect),
    activatedArt: ACTIVATED_ART_CARD_IDS.has(effect.cardId),
  };
}

function sentenceThumb(ownerPlayerId: string, sentence: PendingSentenceView): InPlayThumb {
  return {
    ref: { zone: 'sentence', ownerPlayerId, sentence },
    instance: { instanceId: sentence.id, cardId: 'sentence', isUpgraded: sentence.isUpgraded },
    badge: { kind: 'sentence-turns', value: sentence.remainingOwnerTurns },
    activatedArt: false,
  };
}

/**
 * One seat's cards in play, in V2 `private-zone.tsx` order: Shield, persistents, then that
 * seat's ticking Sentences in `pendingSentences` order. The POV's own seat reads `self` (the
 * Shield while `self.shield > 0`); any other seat, and every seat for a walk-in, reads its
 * `view.players` entry (none: no thumbs).
 */
export function inPlayThumbs(view: PlayingStateView, ownerPlayerId: string): readonly InPlayThumb[] {
  const sentences = view.pendingSentences
    .filter((sentence) => sentence.sourcePlayerId === ownerPlayerId)
    .map((sentence) => sentenceThumb(ownerPlayerId, sentence));
  if (isOwnSeat(view, ownerPlayerId)) {
    const { self } = view;
    return [
      ...(self.shield > 0 ? [shieldThumb(view, ownerPlayerId, self.shieldIsUpgraded)] : []),
      ...self.activePersistentEffects.map((effect) => persistentThumb(ownerPlayerId, effect)),
      ...sentences,
    ];
  }
  const player = view.players.find((entry) => entry.id === ownerPlayerId);
  if (player === undefined) {
    return [];
  }
  return [
    ...(player.activeShield === null
      ? []
      : [shieldThumb(view, ownerPlayerId, player.activeShield.isUpgraded)]),
    ...player.activePersistentEffects.map((effect) => persistentThumb(ownerPlayerId, effect)),
    ...sentences,
  ];
}
