/**
 * Private zone — kit, resources, hand, specials (L12-03 / L12-08 click).
 * Art via L10-03 lookup on Card; never pass activated.
 */

import type { PlayingStateView, PublicPlayerView } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { Card } from '../../design/components/card';
import { ConnectionBadge } from '../../design/components/connection-badge';
import { KitPortrait } from '../../design/components/kit-portrait';
import { ResourceIcon } from '../../design/components/resource-icon';
import { Tooltip } from '../../design/components/tooltip';

export interface PrivateZoneProps {
  view: PlayingStateView;
  selfPublic: PublicPlayerView | undefined;
  onSelectOwnCard?: (instanceId: string) => void;
  cardDisabledReason?: (instanceId: string) => string | null;
}

export function PrivateZone({
  view,
  selfPublic,
  onSelectOwnCard,
  cardDisabledReason,
}: PrivateZoneProps): ReactElement {
  return (
    <section data-zone="private-zone">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Your zone</h2>
        {selfPublic !== undefined && (
          <span className="flex items-center gap-2 text-xs text-ink-muted">
            <ConnectionBadge player={selfPublic} />
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-4">
        <KitPortrait kitId={view.self.kitId} className="w-20" />
        <div className="flex flex-wrap items-center gap-2">
          <ResourceIcon kind="life" value={view.self.lives} label="Lives" />
          <ResourceIcon kind="shield" value={view.self.shield} label="Shield" />
          <ResourceIcon kind="point" value={view.self.points} label="Points" />
          <ResourceIcon
            kind="upgradePoint"
            value={view.self.upgradePoints}
            label="Upgrade points"
          />
          {view.self.shieldIsUpgraded ? (
            <span className="rounded-[length:var(--radius-badge)] bg-resource-shield/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-resource-shield">
              Shield ↑
            </span>
          ) : null}
        </div>
      </div>

      <p className="mt-4 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
        Hand
      </p>
      <div className="mt-1 flex flex-wrap gap-2" data-zone="hand">
        {view.self.hand.length === 0 ? (
          <p className="text-sm text-ink-muted">Empty</p>
        ) : (
          view.self.hand.map((card) => {
            const reason = cardDisabledReason?.(card.instanceId) ?? null;
            const canSelect = onSelectOwnCard !== undefined && reason === null;
            const face = (
              <Card
                instance={card}
                className={['w-[5.5rem]', reason !== null ? 'opacity-50' : ''].join(' ')}
                {...(canSelect
                  ? {
                      onSelect: () => {
                        onSelectOwnCard(card.instanceId);
                      },
                    }
                  : {})}
              />
            );
            return (
              <Tooltip
                key={card.instanceId}
                content={reason ?? ''}
                enabled={reason !== null}
              >
                {face}
              </Tooltip>
            );
          })
        )}
      </div>

      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
        Specials
      </p>
      <div className="mt-1 flex flex-wrap gap-2" data-zone="specials">
        {view.self.specialCards.length === 0 ? (
          <p className="text-sm text-ink-muted">None</p>
        ) : (
          view.self.specialCards.map((card) => {
            const reason = cardDisabledReason?.(card.instanceId) ?? null;
            const canSelect = onSelectOwnCard !== undefined && reason === null;
            const face = (
              <Card
                instance={card}
                className={['w-[5.5rem]', reason !== null ? 'opacity-50' : ''].join(' ')}
                {...(canSelect
                  ? {
                      onSelect: () => {
                        onSelectOwnCard(card.instanceId);
                      },
                    }
                  : {})}
              />
            );
            return (
              <Tooltip
                key={card.instanceId}
                content={reason ?? ''}
                enabled={reason !== null}
              >
                {face}
              </Tooltip>
            );
          })
        )}
      </div>
    </section>
  );
}
