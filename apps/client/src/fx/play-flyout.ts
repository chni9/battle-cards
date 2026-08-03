/**
 * Helpers to stage play flyouts without delaying intents (L14-01).
 */

import type { CardId } from '@card-battle/shared';

import { getCardArtUrl } from '../design/asset-lookup';
import type { DomRectLite } from './table-fx-types';

function rectOf(el: Element | null): DomRectLite | null {
  if (el === null) {
    return null;
  }
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) {
    return null;
  }
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

export function measurePlayFlyout(
  instanceId: string,
  cardId: CardId,
  isUpgraded: boolean,
): { artUrl: string; from: DomRectLite; to: DomRectLite } | null {
  const from =
    rectOf(document.querySelector(`[data-instance-id="${CSS.escape(instanceId)}"]`)) ??
    rectOf(document.querySelector('[data-zone="hand"]')) ??
    rectOf(document.querySelector('[data-zone="dock"]'));
  const to =
    rectOf(document.querySelector('[data-zone="pending"]')) ??
    rectOf(document.querySelector('[data-zone="felt"]'));
  if (from === null || to === null) {
    return null;
  }
  return {
    artUrl: getCardArtUrl(cardId, { isUpgraded }),
    from,
    to,
  };
}
