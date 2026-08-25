/**
 * Tutorial coach helpers — technical spec v6 §5.4 / L45-05.
 * Copy is keyed by `tutorialIndex`; the client never invents strings.
 */

import {
  isAttackCardId,
  tutorialStepAt,
  type CardInstance,
  type TutorialCoachCopy,
  type TutorialHighlight,
  type TutorialLegalKind,
} from '@card-battle/shared';

/** Client idle before the coach title becomes Play (spec §5.3). */
export const TUTORIAL_IDLE_MS = 20_000;

export const TUTORIAL_IDLE_PLAY_TITLE = 'Play';

export type TutorialSendIntent =
  | { kind: 'draw' }
  | { kind: 'playCard'; cardId: string; isUpgraded: boolean }
  | { kind: 'upgradeCard'; cardId: string }
  | { kind: 'sellCard'; cardId: string }
  | { kind: 'buyCard'; cardId: string }
  | { kind: 'buyUpgradePoint' }
  | { kind: 'buySpecialCard' }
  | { kind: 'sellUpgradePoint' }
  | { kind: 'playMultipleAttacks' }
  | { kind: 'other' };

export type TutorialCardActionSpotlight = 'use' | 'upgrade' | 'sell';

export type TutorialEconomySpotlight = 'draw' | 'shop';

export type TutorialShopSpotlight = 'upgrade-point' | 'absorber';

/**
 * Last non-null coach walking backward. Bot turns keep that copy;
 * index 8 has its own (portrait).
 */
export function resolveTutorialCoach(index: number): TutorialCoachCopy | undefined {
  for (let cursor = index; cursor >= 0; cursor -= 1) {
    const coach = tutorialStepAt(cursor)?.coach;
    if (coach !== null && coach !== undefined) {
      return coach;
    }
  }

  return undefined;
}

export function tutorialCoachTitle(copy: TutorialCoachCopy, idle: boolean): string {
  return idle ? TUTORIAL_IDLE_PLAY_TITLE : copy.title;
}

/** Stable key so a new title/body (idle Play, illegal hint, next step) reopens the chat. */
export function tutorialCoachMessageKey(
  index: number,
  title: string,
  body: string,
): string {
  return `${String(index)}|${title}|${body}`;
}

export function isTutorialCoachOpen(
  coachKey: string | null,
  dismissedKey: string | null,
): boolean {
  return coachKey !== null && dismissedKey !== coachKey;
}

export type CoachResourceKind = 'point' | 'life' | 'upgradePoint' | 'shield';

export type CoachBodyPart =
  | { readonly kind: 'text'; readonly text: string; readonly bold: boolean }
  | {
      readonly kind: 'resource';
      readonly resource: CoachResourceKind;
      readonly amount: number | null;
      readonly sign: '+' | '';
      readonly word: string;
      readonly bold: boolean;
    };

/**
 * Split coach copy so the client can drop resource icons inline.
 * Source strings stay in `tutorialStepAt`; this does not invent words.
 */
export function parseCoachBody(text: string): readonly CoachBodyPart[] {
  const chunks = text.split(/(\*\*[^*]+\*\*)/g);
  const parts: CoachBodyPart[] = [];
  for (const chunk of chunks) {
    if (chunk.length === 0) {
      continue;
    }
    const bold = /^\*\*([^*]+)\*\*$/.exec(chunk);
    const inner = bold?.[1];
    if (inner !== undefined) {
      parts.push(...parseResourceTokens(inner, true));
    } else {
      parts.push(...parseResourceTokens(chunk, false));
    }
  }
  return parts;
}

function parseResourceTokens(text: string, bold: boolean): CoachBodyPart[] {
  const token =
    /(\+)?(\d+)\s+(upgrade\s+points?|points?|lives?|life|shield(?:\s+points?)?)|\b(upgrade\s+points?|points?|lives?|life|shield)\b/gi;
  const parts: CoachBodyPart[] = [];
  let last = 0;
  let match = token.exec(text);
  while (match !== null) {
    if (match.index > last) {
      parts.push({ kind: 'text', text: text.slice(last, match.index), bold });
    }
    const labeled = match[3] ?? match[4];
    if (labeled === undefined) {
      match = token.exec(text);
      continue;
    }
    const amountRaw = match[2];
    const parsed = amountRaw === undefined ? Number.NaN : Number(amountRaw);
    parts.push({
      kind: 'resource',
      resource: resourceFromLabel(labeled),
      amount: Number.isFinite(parsed) ? parsed : null,
      sign: match[1] === '+' ? '+' : '',
      word: labeled,
      bold,
    });
    last = match.index + match[0].length;
    match = token.exec(text);
  }
  if (last < text.length) {
    parts.push({ kind: 'text', text: text.slice(last), bold });
  }
  return parts;
}

function resourceFromLabel(label: string): CoachResourceKind {
  const normalized = label.toLowerCase();
  if (normalized.startsWith('upgrade')) {
    return 'upgradePoint';
  }
  if (normalized.startsWith('point')) {
    return 'point';
  }
  if (normalized.startsWith('live') || normalized === 'life') {
    return 'life';
  }
  return 'shield';
}

export function tutorialHighlightAt(index: number): TutorialHighlight {
  return tutorialStepAt(index)?.highlight ?? null;
}

export function tutorialSendAllowed(
  index: number,
  intent: TutorialSendIntent,
): boolean {
  const step = tutorialStepAt(index);
  if (step?.actor !== 'human') {
    return false;
  }

  return matchesLegalKind(step.legalKind, intent);
}

export function tutorialSpotlightInstanceIds(
  highlight: TutorialHighlight,
  cards: readonly CardInstance[],
): readonly string[] {
  switch (highlight) {
    case 'tax':
      return idsWhere(cards, (card) => card.cardId === 'tax');
    case 'basic':
      return idsWhere(cards, (card) => card.cardId === 'basic-attack');
    case 'upgrade-basic':
      return idsWhere(
        cards,
        (card) => card.cardId === 'basic-attack' && !card.isUpgraded,
      );
    case 'upgrade-spy':
    case 'spy':
      return idsWhere(cards, (card) => card.cardId === 'spy');
    case 'sell-shield': {
      const shields = idsWhere(cards, (card) => card.cardId === 'shield');
      const first = shields[0];
      return first === undefined ? [] : [first];
    }
    case 'shield':
      return idsWhere(cards, (card) => card.cardId === 'shield');
    case 'super-regeneration':
      return idsWhere(cards, (card) => card.cardId === 'super-regeneration');
    case 'absorber':
      return idsWhere(cards, (card) => card.cardId === 'absorber');
    default:
      return [];
  }
}

export function tutorialCardActionSpotlight(
  highlight: TutorialHighlight,
): TutorialCardActionSpotlight | undefined {
  switch (highlight) {
    case 'tax':
    case 'basic':
    case 'spy':
    case 'shield':
    case 'super-regeneration':
    case 'absorber':
      return 'use';
    case 'upgrade-spy':
    case 'upgrade-basic':
      return 'upgrade';
    case 'sell-shield':
      return 'sell';
    default:
      return undefined;
  }
}

export function tutorialEconomySpotlight(
  highlight: TutorialHighlight,
  shopOpen: boolean,
): TutorialEconomySpotlight | undefined {
  if (highlight === 'draw') {
    return 'draw';
  }

  if (
    (highlight === 'shop-upgrade-point' || highlight === 'shop-absorber') &&
    !shopOpen
  ) {
    return 'shop';
  }

  return undefined;
}

export function tutorialShopSpotlight(
  highlight: TutorialHighlight,
): TutorialShopSpotlight | undefined {
  if (highlight === 'shop-upgrade-point') {
    return 'upgrade-point';
  }

  if (highlight === 'shop-absorber') {
    return 'absorber';
  }

  return undefined;
}

export function tutorialPortraitSpotlight(highlight: TutorialHighlight): boolean {
  return highlight === 'opponent-portrait';
}

function matchesLegalKind(
  legalKind: TutorialLegalKind,
  intent: TutorialSendIntent,
): boolean {
  switch (legalKind) {
    case 'draw':
      return intent.kind === 'draw';
    case 'play-tax':
      return intent.kind === 'playCard' && intent.cardId === 'tax';
    case 'play-basic':
      return (
        intent.kind === 'playCard' &&
        intent.cardId === 'basic-attack' &&
        !intent.isUpgraded
      );
    case 'play-basic-upgraded':
      return (
        intent.kind === 'playCard' &&
        intent.cardId === 'basic-attack' &&
        intent.isUpgraded
      );
    case 'upgrade-spy':
      return intent.kind === 'upgradeCard' && intent.cardId === 'spy';
    case 'play-spy':
      return intent.kind === 'playCard' && intent.cardId === 'spy';
    case 'sell-shield':
      return intent.kind === 'sellCard' && intent.cardId === 'shield';
    case 'buy-upgrade-point':
      return intent.kind === 'buyUpgradePoint';
    case 'buy-absorber':
      return intent.kind === 'buyCard' && intent.cardId === 'absorber';
    case 'play-shield':
      return intent.kind === 'playCard' && intent.cardId === 'shield';
    case 'play-super-regeneration':
      return intent.kind === 'playCard' && intent.cardId === 'super-regeneration';
    case 'upgrade-basic':
      return intent.kind === 'upgradeCard' && intent.cardId === 'basic-attack';
    case 'play-absorber':
      return intent.kind === 'playCard' && intent.cardId === 'absorber';
    case 'bot-draw':
    case 'bot-play-basic':
    case 'bot-play-spy':
    case 'bot-play-strong':
    case 'bot-play-thief':
      return false;
  }
}

/** Incoming Attack, Spy, or Thief chips get the red threat callout. */
export function isTutorialIncomingThreatCard(cardId: string): boolean {
  return isAttackCardId(cardId) || cardId === 'spy' || cardId === 'thief';
}

export function tutorialIncomingThreatIds(
  effects: readonly { readonly id: string; readonly cardId: string }[],
  tutorial: boolean,
): readonly string[] {
  if (!tutorial) {
    return [];
  }

  return effects
    .filter((effect) => isTutorialIncomingThreatCard(effect.cardId))
    .map((effect) => effect.id);
}

function idsWhere(
  cards: readonly CardInstance[],
  predicate: (card: CardInstance) => boolean,
): readonly string[] {
  return cards.filter(predicate).map((card) => card.instanceId);
}
