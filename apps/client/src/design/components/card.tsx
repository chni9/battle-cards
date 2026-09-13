/**
 * Card face from CardInstance — technical spec v2 §5, L10-04.
 * Pass `activated` for Imposition / Points Generator while they sit in
 * `activePersistentEffects` (PROTOCOL_VERSION 19).
 */

import { getCard, listedAttackDamage, type CardInstance } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { getCardArtUrl } from '../asset-lookup';
import { CardEffectCopy } from './card-effect-copy';
import { LifeCountBadge } from './life-count-badge';

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
  /**
   * Pending listed-damage multiplier (Mirror). Default 1.
   * Faces use catalog × this value (L56-04).
   */
  damageMultiplier?: number;
}

export function Card({
  instance,
  activated = false,
  selected = false,
  onSelect,
  className = '',
  detail = 'full',
  damageMultiplier = 1,
}: CardProps): ReactElement {
  const definition = getCard(instance.cardId);
  const name = definition?.name ?? instance.cardId;
  const artUrl = getCardArtUrl(instance.cardId, {
    isUpgraded: instance.isUpgraded,
    ...(activated ? { activated: true } : {}),
  });
  const listedDamage = listedAttackDamage(
    instance.cardId,
    instance.isUpgraded,
    damageMultiplier,
  );
  const damageBadge =
    listedDamage === null ? null : (
      <LifeCountBadge
        amount={listedDamage}
        kind="damage"
        iconSize={detail === 'thumb' ? 8 : 10}
        className="text-[8px] text-ink sm:text-[10px]"
      />
    );

  const body = (
    <>
      <span className="relative block w-full">
        <img
          src={artUrl}
          alt=""
          className="aspect-[2/3] w-full object-contain"
          draggable={false}
        />
        {damageBadge !== null ? (
          <span className="pointer-events-none absolute right-0 bottom-0 rounded-sm bg-surface-raised/90 px-0.5">
            {damageBadge}
          </span>
        ) : null}
      </span>
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

  const damageSpoken =
    listedDamage === null ? '' : `, ${String(listedDamage)} damage`;
  const label =
    detail === 'thumb'
      ? `${name}${instance.isUpgraded ? ' upgraded' : ''}${damageSpoken}`
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
