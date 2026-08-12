/**
 * Opponent hand / special sampling from public evidence — technical spec v5 §4.2
 * (L34-04). No `GameState`. Follows the #V5-2 unlimited-shop ruling: card ids are
 * not constrained by pool outflow; only instance identity can be provably elsewhere.
 *
 * Shared attack/action cards stay in hand when played (`playCardAction` in
 * `perform-action.ts`); specials are single-use and leave the specials zone.
 * Draw grants points, not cards. Card Thief / Card Transformer results are
 * private (technical spec v4 §5.1) — size intervals widen rather than collapse.
 */

import {
  ACTION_CARD_IDS,
  ATTACK_CARD_IDS,
  SPECIAL_CARD_IDS,
  getKit,
  isSharedAttackCardId,
  isSpecialCardId,
  type ActionLogEntryView,
  type ActionPlayedLogEntry,
  type CardId,
  type CardInstance,
  type KitId,
  type PlayingStateView,
  type PublicPlayerView,
} from '@card-battle/shared';

import type { Rng } from '../../engine/rng';
import type { HandPrior } from './hand-prior';
import { sampleFromInterval } from './resources';
import type { HandSizeBelief, ResourceInterval } from './types';

export type { HandSizeBelief };

/** Card Absorber recover cap — `generic-sub-choice.ts` `CARD_ABSORBER_MAX`. */
const CARD_ABSORBER_MAX = 4;

/** Two opaque card picks per `rewardsClaimed` — rules spec §6. */
const ELIMINATION_REWARD_PICKS = 2;

const UNIT_DRAW_SPAN = 1_000_000;

interface MutableInterval {
  lo: number;
  hi: number;
}

function point(value: number): ResourceInterval {
  return { lo: value, hi: value };
}

function addExact(interval: MutableInterval, delta: number): void {
  interval.lo += delta;
  interval.hi += delta;
}

function addRange(interval: MutableInterval, minDelta: number, maxDelta: number): void {
  interval.lo += minDelta;
  interval.hi += maxDelta;
}

function clampNonNeg(interval: MutableInterval): ResourceInterval {
  const lo = Math.max(0, interval.lo);
  const hi = Math.max(lo, interval.hi);
  return { lo, hi };
}

function playerView(
  view: PlayingStateView,
  playerId: string,
): PublicPlayerView | undefined {
  return view.players.find((player) => player.id === playerId);
}

function livingCount(view: PlayingStateView): number {
  return view.players.filter((player) => !player.isEliminated).length;
}

function isActionCardId(cardId: string): boolean {
  return (ACTION_CARD_IDS as readonly string[]).includes(cardId);
}

function zoneOf(cardId: string): 'action' | 'attack' | 'special' | null {
  if (isSpecialCardId(cardId)) {
    return 'special';
  }

  if (isSharedAttackCardId(cardId)) {
    return 'attack';
  }

  if (isActionCardId(cardId)) {
    return 'action';
  }

  return null;
}

function countHandZones(cards: readonly CardInstance[]): {
  action: number;
  attack: number;
} {
  let action = 0;
  let attack = 0;

  for (const card of cards) {
    const zone = zoneOf(card.cardId);

    if (zone === 'action') {
      action += 1;
    } else if (zone === 'attack') {
      attack += 1;
    }
  }

  return { action, attack };
}

function sizesFromCards(
  hand: readonly CardInstance[],
  specialCards: readonly CardInstance[],
): HandSizeBelief {
  const zones = countHandZones(hand);
  return {
    actionCount: point(zones.action),
    attackCount: point(zones.attack),
    specialCount: point(specialCards.length),
  };
}

function startingSpecialCount(kitId: KitId): number {
  const kit = getKit(kitId);
  return kit.randomStartingSpecialCount ?? kit.specialCards.length;
}

function resetToKitStart(
  action: MutableInterval,
  attack: MutableInterval,
  special: MutableInterval,
  kitId: KitId,
): void {
  const kit = getKit(kitId);
  action.lo = kit.startingCardCounts.action;
  action.hi = kit.startingCardCounts.action;
  attack.lo = kit.startingCardCounts.attack;
  attack.hi = kit.startingCardCounts.attack;
  const specials = startingSpecialCount(kitId);
  special.lo = specials;
  special.hi = specials;
}

function stealCap(entry: ActionPlayedLogEntry, view: PlayingStateView): number {
  if (entry.isUpgraded === true) {
    return Math.max(1, livingCount(view) - 1);
  }

  return 1;
}

function applyZoneDelta(
  action: MutableInterval,
  attack: MutableInterval,
  special: MutableInterval,
  cardId: string,
  delta: number,
): void {
  const zone = zoneOf(cardId);

  if (zone === 'action') {
    addExact(action, delta);
    return;
  }

  if (zone === 'attack') {
    addExact(attack, delta);
    return;
  }

  if (zone === 'special') {
    addExact(special, delta);
  }
}

function widenUnknownCard(
  action: MutableInterval,
  attack: MutableInterval,
  special: MutableInterval,
  minDelta: number,
  maxDelta: number,
): void {
  addRange(action, minDelta, maxDelta);
  addRange(attack, minDelta, maxDelta);
  addRange(special, minDelta, maxDelta);
}

function applyOpponentPlay(
  action: MutableInterval,
  attack: MutableInterval,
  special: MutableInterval,
  view: PlayingStateView,
  entry: ActionPlayedLogEntry,
): void {
  const cardId = entry.cardId;

  switch (entry.action) {
    case 'buyCard':
      if (cardId !== undefined) {
        applyZoneDelta(action, attack, special, cardId, 1);
      }
      return;
    case 'sellCard':
      if (cardId !== undefined) {
        applyZoneDelta(action, attack, special, cardId, -1);
      } else {
        addRange(action, -1, 0);
        addRange(attack, -1, 0);
      }
      return;
    case 'buySpecialCard':
      addExact(special, 1);
      return;
    case 'playCard': {
      if (cardId === undefined) {
        return;
      }

      if (isSpecialCardId(cardId)) {
        addExact(special, -1);
      }

      if (cardId === 'card-thief') {
        const cap = stealCap(entry, view);
        widenUnknownCard(action, attack, special, 0, cap);
        return;
      }

      if (cardId === 'attack-thief') {
        const cap = stealCap(entry, view);
        addRange(attack, 0, cap);
        return;
      }

      if (cardId === 'card-transformer') {
        addRange(action, -1, 0);
        addRange(attack, -1, 0);
        addExact(special, 1);
        return;
      }

      if (cardId === 'card-absorber') {
        addRange(action, 0, CARD_ABSORBER_MAX);
        addRange(attack, 0, CARD_ABSORBER_MAX);
        addRange(special, 0, CARD_ABSORBER_MAX);
      }

      return;
    }
    default:
      return;
  }
}

function applyIncomingThiefPlay(
  action: MutableInterval,
  attack: MutableInterval,
  special: MutableInterval,
  opponentPlayerId: string,
  view: PlayingStateView,
  entry: ActionPlayedLogEntry,
): void {
  if (entry.action !== 'playCard' || entry.cardId === undefined) {
    return;
  }

  if (entry.cardId === 'card-thief') {
    const targeted =
      entry.targetPlayerId === opponentPlayerId ||
      (entry.isUpgraded === true && entry.targetPlayerId === undefined);
    if (targeted) {
      const cap = stealCap(entry, view);
      widenUnknownCard(action, attack, special, -cap, 0);
    }
    return;
  }

  if (entry.cardId === 'attack-thief') {
    const cap = stealCap(entry, view);
    addRange(attack, -cap, 0);
  }
}

function integrateLog(
  opponentPlayerId: string,
  kitId: KitId,
  view: PlayingStateView,
  log: readonly ActionLogEntryView[],
): { action: MutableInterval; attack: MutableInterval; special: MutableInterval } {
  const action: MutableInterval = { lo: 0, hi: 0 };
  const attack: MutableInterval = { lo: 0, hi: 0 };
  const special: MutableInterval = { lo: 0, hi: 0 };
  resetToKitStart(action, attack, special, kitId);

  for (const entry of log) {
    if (entry.kind === 'playerEliminated' && entry.playerId === opponentPlayerId) {
      action.lo = 0;
      action.hi = 0;
      attack.lo = 0;
      attack.hi = 0;
      special.lo = 0;
      special.hi = 0;
      continue;
    }

    if (entry.kind === 'playerReanimated' && entry.playerId === opponentPlayerId) {
      resetToKitStart(action, attack, special, entry.kitId ?? kitId);
      continue;
    }

    if (entry.kind === 'rewardsClaimed' && entry.eliminatorPlayerId === opponentPlayerId) {
      addRange(action, 0, ELIMINATION_REWARD_PICKS);
      addRange(attack, 0, ELIMINATION_REWARD_PICKS);
      addRange(special, 0, ELIMINATION_REWARD_PICKS);
      continue;
    }

    if (entry.kind !== 'actionPlayed') {
      continue;
    }

    if (entry.actorPlayerId === opponentPlayerId) {
      applyOpponentPlay(action, attack, special, view, entry);
      continue;
    }

    applyIncomingThiefPlay(action, attack, special, opponentPlayerId, view, entry);
  }

  return { action, attack, special };
}

/**
 * Reconstruct action / attack / special *counts* for one opponent from public
 * evidence only (technical spec v5 §4.2). Composition stays a prior until sampled.
 */
export function accountOpponentHandSizes(
  opponentPlayerId: string,
  kitId: KitId,
  view: PlayingStateView,
  log: readonly ActionLogEntryView[],
): HandSizeBelief {
  if (opponentPlayerId === view.you) {
    return sizesFromCards(view.self.hand, view.self.specialCards);
  }

  const player = playerView(view, opponentPlayerId);

  if (player === undefined) {
    return {
      actionCount: point(0),
      attackCount: point(0),
      specialCount: point(0),
    };
  }

  const spied = player.spied;

  if (spied !== undefined) {
    return sizesFromCards(spied.hand, spied.specialCards);
  }

  if (player.isEliminated) {
    return {
      actionCount: point(0),
      attackCount: point(0),
      specialCount: point(0),
    };
  }

  const integrated = integrateLog(opponentPlayerId, kitId, view, log);
  return {
    actionCount: clampNonNeg(integrated.action),
    attackCount: clampNonNeg(integrated.attack),
    specialCount: clampNonNeg(integrated.special),
  };
}

function unitRng(rng: Rng): { next: () => number } {
  return {
    next: (): number => rng.nextInt(UNIT_DRAW_SPAN) / UNIT_DRAW_SPAN,
  };
}

function pickWeighted(
  ids: readonly CardId[],
  prior: HandPrior,
  zone: 'action' | 'attack',
  rng: Rng,
): CardId {
  const weights = ids.map((id) => Math.max(0, prior.weight(id, zone)));
  let total = 0;

  for (const weight of weights) {
    total += weight;
  }

  if (total <= 0) {
    return rng.pick(ids);
  }

  let cursor = (rng.nextInt(UNIT_DRAW_SPAN) / UNIT_DRAW_SPAN) * total;

  for (let index = 0; index < ids.length; index += 1) {
    const id = ids[index];
    cursor -= weights[index] ?? 0;

    if (cursor < 0 && id !== undefined) {
      return id;
    }
  }

  const last = ids[ids.length - 1];

  if (last === undefined) {
    throw new Error('hand prior: empty zone catalog');
  }

  return last;
}

function mintInstanceId(
  prefix: string,
  forbidden: Set<string>,
): string {
  let instanceId = prefix;
  let nonce = 0;

  while (forbidden.has(instanceId)) {
    nonce += 1;
    instanceId = `${prefix}:${String(nonce)}`;
  }

  forbidden.add(instanceId);
  return instanceId;
}

function mintCard(
  opponentPlayerId: string,
  zone: 'hand' | 'special',
  slot: number,
  cardId: CardId,
  kitId: KitId,
  forbidden: Set<string>,
): CardInstance {
  const instanceId = mintInstanceId(
    `belief:${opponentPlayerId}:${zone}:${String(slot)}:${cardId}`,
    forbidden,
  );
  return {
    instanceId,
    cardId,
    isUpgraded: getKit(kitId).traits.alwaysUpgraded.includes(cardId),
  };
}

function collectForbiddenInstanceIds(view: PlayingStateView): Set<string> {
  const forbidden = new Set<string>();

  for (const card of view.self.hand) {
    forbidden.add(card.instanceId);
  }

  for (const card of view.self.specialCards) {
    forbidden.add(card.instanceId);
  }

  for (const card of view.pool) {
    forbidden.add(card.instanceId);
  }

  return forbidden;
}

function removeOne(held: CardId[], cardId: CardId): void {
  const index = held.indexOf(cardId);

  if (index >= 0) {
    held.splice(index, 1);
  }
}

function knownHeldSpecialIds(
  opponentPlayerId: string,
  kitId: KitId,
  log: readonly ActionLogEntryView[],
): CardId[] {
  const held: CardId[] = [...getKit(kitId).specialCards];

  for (const entry of log) {
    if (entry.kind === 'playerEliminated' && entry.playerId === opponentPlayerId) {
      held.length = 0;
      continue;
    }

    if (entry.kind === 'playerReanimated' && entry.playerId === opponentPlayerId) {
      held.length = 0;
      held.push(...getKit(entry.kitId ?? kitId).specialCards);
      continue;
    }

    if (entry.kind !== 'actionPlayed' || entry.actorPlayerId !== opponentPlayerId) {
      continue;
    }

    if (
      entry.action === 'buySpecialCard' &&
      entry.cardId !== undefined &&
      isSpecialCardId(entry.cardId)
    ) {
      held.push(entry.cardId);
      continue;
    }

    if (
      entry.action === 'playCard' &&
      entry.cardId !== undefined &&
      isSpecialCardId(entry.cardId)
    ) {
      removeOne(held, entry.cardId);
    }
  }

  return held;
}

function playedSharedIds(
  opponentPlayerId: string,
  zone: 'action' | 'attack',
  log: readonly ActionLogEntryView[],
): CardId[] {
  const ids: CardId[] = [];

  for (const entry of log) {
    if (entry.kind !== 'actionPlayed' || entry.actorPlayerId !== opponentPlayerId) {
      continue;
    }

    if (entry.action === 'playCard' && entry.cardId !== undefined && zoneOf(entry.cardId) === zone) {
      ids.push(entry.cardId);
    }

    if (entry.action === 'playMultipleAttacks' && zone === 'attack') {
      for (const attack of entry.attacks ?? []) {
        if (zoneOf(attack.cardId) === 'attack') {
          ids.push(attack.cardId);
        }
      }
    }
  }

  return ids;
}

function fillZone(
  count: number,
  catalog: readonly CardId[],
  zone: 'action' | 'attack',
  prior: HandPrior,
  rng: Rng,
  preferred: readonly CardId[],
): CardId[] {
  const ids: CardId[] = [];

  for (const preferredId of preferred) {
    if (ids.length >= count) {
      break;
    }

    if (zoneOf(preferredId) === zone) {
      ids.push(preferredId);
    }
  }

  while (ids.length < count) {
    ids.push(pickWeighted(catalog, prior, zone, rng));
  }

  return ids;
}

function fillSpecials(
  count: number,
  known: readonly CardId[],
  rng: Rng,
): CardId[] {
  if (count <= known.length) {
    return rng.shuffle(known).slice(0, count);
  }

  const ids: CardId[] = [...known];

  while (ids.length < count) {
    ids.push(rng.pick(SPECIAL_CARD_IDS));
  }

  return ids;
}

function copyInstances(cards: readonly CardInstance[]): CardInstance[] {
  return cards.map((card) => ({ ...card }));
}

/**
 * Sample a consistent opponent hand and specials zone (technical spec v5 §4.2).
 * Fresh `belief:` instance ids never collide with the bot's own copies or the pool.
 */
export function sampleOpponentHandAndSpecials(args: {
  opponentPlayerId: string;
  kitId: KitId;
  view: PlayingStateView;
  log: readonly ActionLogEntryView[];
  sizes: HandSizeBelief;
  prior: HandPrior;
  rng: Rng;
}): { hand: CardInstance[]; specialCards: CardInstance[] } {
  const { opponentPlayerId, kitId, view, log, sizes, prior, rng } = args;

  if (opponentPlayerId === view.you) {
    return {
      hand: copyInstances(view.self.hand),
      specialCards: copyInstances(view.self.specialCards),
    };
  }

  const player = playerView(view, opponentPlayerId);
  const spied = player?.spied;

  if (spied !== undefined) {
    return {
      hand: copyInstances(spied.hand),
      specialCards: copyInstances(spied.specialCards),
    };
  }

  const unit = unitRng(rng);
  const actionCount = sampleFromInterval(sizes.actionCount, unit);
  const attackCount = sampleFromInterval(sizes.attackCount, unit);
  const specialCount = sampleFromInterval(sizes.specialCount, unit);
  const forbidden = collectForbiddenInstanceIds(view);

  const actionIds = fillZone(
    actionCount,
    ACTION_CARD_IDS,
    'action',
    prior,
    rng,
    playedSharedIds(opponentPlayerId, 'action', log),
  );
  const attackIds = fillZone(
    attackCount,
    ATTACK_CARD_IDS,
    'attack',
    prior,
    rng,
    playedSharedIds(opponentPlayerId, 'attack', log),
  );
  const specialIds = fillSpecials(
    specialCount,
    knownHeldSpecialIds(opponentPlayerId, kitId, log),
    rng,
  );

  const hand: CardInstance[] = [];
  let slot = 0;

  for (const cardId of actionIds) {
    hand.push(mintCard(opponentPlayerId, 'hand', slot, cardId, kitId, forbidden));
    slot += 1;
  }

  for (const cardId of attackIds) {
    hand.push(mintCard(opponentPlayerId, 'hand', slot, cardId, kitId, forbidden));
    slot += 1;
  }

  const specialCards: CardInstance[] = [];

  for (let index = 0; index < specialIds.length; index += 1) {
    const cardId = specialIds[index];

    if (cardId === undefined) {
      continue;
    }

    specialCards.push(mintCard(opponentPlayerId, 'special', index, cardId, kitId, forbidden));
  }

  return { hand, specialCards };
}
