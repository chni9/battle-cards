/**
 * Active persistent / Shield thumb — L56-06 / L58-06.
 * Card lives sit under the art when `PersistentEffectView.counter` is public.
 * Invisibility shows remaining turns (no heart). Curse and combat Shield keep
 * `counter === null` (no badge).
 */

import type { CardInstance } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { Card } from '../../design/components/card';
import { LifeCountBadge } from '../../design/components/life-count-badge';

export interface ActivePersistentThumbProps {
  instance: CardInstance;
  counter: number | null;
  activated: boolean;
  className?: string;
  onSelect?: () => void;
}

export function ActivePersistentThumb({
  instance,
  counter,
  activated,
  className = '',
  onSelect,
}: ActivePersistentThumbProps): ReactElement {
  const badgeKind = instance.cardId === 'invisibility' ? 'turns' : 'card-lives';

  return (
    <span className="inline-flex flex-col items-center">
      <Card
        instance={instance}
        detail="thumb"
        activated={activated}
        className={className}
        {...(onSelect !== undefined
          ? {
              onSelect: () => {
                onSelect();
              },
            }
          : {})}
      />
      {counter !== null ? (
        <LifeCountBadge
          amount={counter}
          kind={badgeKind}
          iconSize={10}
          className="mt-px text-[9px] text-ink"
        />
      ) : null}
    </span>
  );
}
