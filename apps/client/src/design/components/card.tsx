/**
 * Card face from CardInstance — technical spec v2 §5, L10-04.
 * Activated art is supported via prop but must stay unused until protocol exposes
 * activePersistentEffects (Lot 10 ruling).
 */

import { getCard, type CardInstance } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { getCardArtUrl } from '../asset-lookup';

export interface CardProps {
  instance: CardInstance;
  /** Do not pass true until activePersistentEffects are on the wire. */
  activated?: boolean;
  selected?: boolean;
  onSelect?: (instanceId: string) => void;
  className?: string;
}

export function Card({
  instance,
  activated = false,
  selected = false,
  onSelect,
  className = '',
}: CardProps): ReactElement {
  const definition = getCard(instance.cardId);
  const name = definition?.name ?? instance.cardId;
  const effect = instance.isUpgraded
    ? (definition?.upgradeEffect ?? '')
    : (definition?.effect ?? '');
  const artUrl = getCardArtUrl(instance.cardId, {
    isUpgraded: instance.isUpgraded,
    ...(activated ? { activated: true } : {}),
  });

  const body = (
    <>
      <img
        src={artUrl}
        alt=""
        className="aspect-[2/3] w-full object-contain"
        draggable={false}
      />
      <span className="mt-1 block text-center text-xs font-semibold text-ink">
        {name}
        {instance.isUpgraded ? ' ↑' : ''}
      </span>
      {effect.length > 0 && (
        <span className="mt-0.5 block text-center text-[10px] leading-snug text-ink-muted">
          {effect}
        </span>
      )}
    </>
  );

  if (onSelect !== undefined) {
    return (
      <button
        type="button"
        onClick={() => {
          onSelect(instance.instanceId);
        }}
        aria-pressed={selected}
        className={[
          'w-28 rounded-[length:var(--radius-card)] border border-border bg-surface-raised p-1',
          'text-left font-sans focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
          selected ? 'ring-2 ring-cta-purple' : '',
          className,
        ].join(' ')}
      >
        {body}
      </button>
    );
  }

  return (
    <article
      className={[
        'w-28 rounded-[length:var(--radius-card)] border border-border bg-surface-raised p-1 font-sans',
        className,
      ].join(' ')}
    >
      {body}
    </article>
  );
}
