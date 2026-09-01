/**
 * Card face from CardInstance — technical spec v2 §5, L10-04.
 * Pass `activated` for Imposition / Points Generator while they sit in
 * `activePersistentEffects` (PROTOCOL_VERSION 19).
 */

import { getCard, type CardInstance } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { getCardArtUrl } from '../asset-lookup';
import { CardEffectCopy } from './card-effect-copy';

export interface CardProps {
  instance: CardInstance;
  /** Use activated art for public/self active persistents. */
  activated?: boolean;
  selected?: boolean;
  onSelect?: (instanceId: string) => void;
  className?: string;
  /**
   * `full` — art, name, effect text (Dialogs).
   * `face` — art + name (private hand / specials).
   * `thumb` — art only (Spy opponent seats, tiny).
   */
  detail?: 'full' | 'face' | 'thumb';
}

export function Card({
  instance,
  activated = false,
  selected = false,
  onSelect,
  className = '',
  detail = 'full',
}: CardProps): ReactElement {
  const definition = getCard(instance.cardId);
  const name = definition?.name ?? instance.cardId;
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
      {detail !== 'thumb' && (
        <span
          className={[
            'mt-0.5 block shrink-0 truncate text-center font-semibold text-ink',
            detail === 'face' ? 'text-[10px] leading-tight' : 'mt-1 text-xs',
          ].join(' ')}
        >
          {name}
          {instance.isUpgraded ? ' ↑' : ''}
        </span>
      )}
      {detail === 'full' && definition !== undefined && (
        <div className="mt-0.5 w-full shrink-0 text-left">
          <CardEffectCopy card={definition} isUpgraded={instance.isUpgraded} />
        </div>
      )}
    </>
  );

  const label =
    detail === 'thumb'
      ? `${name}${instance.isUpgraded ? ' upgraded' : ''}`
      : undefined;

  if (onSelect !== undefined) {
    return (
      <button
        type="button"
        onClick={() => {
          onSelect(instance.instanceId);
        }}
        aria-pressed={selected}
        aria-label={label}
        title={label}
        className={[
          'flex flex-col overflow-hidden rounded-[length:var(--radius-card)] border border-border bg-surface-raised',
          'text-left font-sans focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
          selected ? 'ring-2 ring-cta-purple' : '',
          className.includes('p-') ? '' : 'p-1',
          className.includes('w-') ? '' : 'w-28',
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
        'flex flex-col overflow-hidden rounded-[length:var(--radius-card)] border border-border bg-surface-raised font-sans',
        className.includes('p-') ? '' : 'p-1',
        className.includes('w-') ? '' : 'w-28',
        className,
      ].join(' ')}
      aria-label={label}
      title={label}
    >
      {body}
    </article>
  );
}
