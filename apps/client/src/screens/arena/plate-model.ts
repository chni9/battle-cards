/**
 * What the central plate holds besides its badges — technical spec v7 §6.1 item 2 (the landing
 * spot of the last played card), §6.5 (recurring chips at the catalog rate, never a
 * prediction); L74-06.
 *
 * Pure reads of public fields: the action log every recipient gets, and the in-play thumbs the
 * L73 view-model already builds for the card sheet.
 */

import type { ActionLogEntryView, CardInstance, PlayingStateView } from '@card-battle/shared';

import type { GlyphAmount } from '../../ui/card/glyph-amount';
import type { CostSign } from '../../ui/structured-cost';
import { inPlayThumbs, type InPlayThumb } from '../../view-model/card-actions';
import type { RecurringAmount, RecurringChip } from '../../view-model/recurring-chips';

/**
 * The newest public play (spec v7 §6.1 item 2), else null: the last `actionPlayed` `playCard`
 * with a `cardId`, or a multi-attack's first attack (designer answer Q5). Draws, buys, sells,
 * upgrades and deactivations are not plays. The instance id is keyed by the log index, so a newer
 * play has a new id. The plate does not key the face on it: a remount would drop focus from a
 * focused landing card, and the landing motion is L78's to decide.
 */
export function lastPlayedCard(actionLog: readonly ActionLogEntryView[]): CardInstance | null {
  for (let index = actionLog.length - 1; index >= 0; index -= 1) {
    const entry = actionLog[index];
    if (entry?.kind !== 'actionPlayed') {
      continue;
    }
    const instanceId = `landing-${String(index)}`;
    if (entry.action === 'playCard' && entry.cardId !== undefined) {
      return { instanceId, cardId: entry.cardId, isUpgraded: entry.isUpgraded ?? false };
    }
    const first = entry.action === 'playMultipleAttacks' ? entry.attacks?.[0] : undefined;
    if (first !== undefined) {
      return { instanceId, cardId: first.cardId, isUpgraded: first.isUpgraded };
    }
  }
  return null;
}

/** The in-play thumb a recurring chip ticks from (`inPlayThumbs` of its owner), else null. */
export function recurringChipThumb(view: PlayingStateView, chip: RecurringChip): InPlayThumb | null {
  return (
    inPlayThumbs(view, chip.ownerPlayerId).find(
      (thumb) => thumb.ref.zone === 'active' && thumb.ref.effect.id === chip.effectId,
    ) ?? null
  );
}

/**
 * The catalog rate as a glyph (never a prediction, §6.5): Poison's lives per turn, Imposition's
 * cap (not its floor; the card sheet carries the full text), Curse's points per life.
 */
export function recurringAmountGlyph(amount: RecurringAmount): { amount: GlyphAmount; signed?: CostSign } {
  switch (amount.kind) {
    case 'lives-per-turn':
      return { amount: { kind: 'lives', amount: amount.lives }, signed: 'cost' };
    case 'points-above-floor':
      return { amount: { kind: 'points', amount: amount.maxPoints }, signed: 'cost' };
    case 'life-per-points-spent':
      return { amount: { kind: 'pointsPerLife', amount: amount.pointsPerLife } };
  }
}
