/**
 * Private zone — L12-01 placement; L12-03 restyles hand/resources.
 */

import type { PlayingStateView, PublicPlayerView } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { Card } from '../../design/components/card';
import { ConnectionBadge } from '../../design/components/connection-badge';
import { KitPortrait } from '../../design/components/kit-portrait';
import { ResourceIcon } from '../../design/components/resource-icon';

export interface PrivateZoneProps {
  view: PlayingStateView;
  selfPublic: PublicPlayerView | undefined;
}

export function PrivateZone({ view, selfPublic }: PrivateZoneProps): ReactElement {
  return (
    <section data-zone="private-zone">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Your zone</h2>
        {selfPublic !== undefined && (
          <span className="flex items-center gap-2 text-xs text-ink-muted">
            connected
            <ConnectionBadge player={selfPublic} />
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <KitPortrait kitId={view.self.kitId} />
        <ResourceIcon kind="life" value={view.self.lives} />
        <ResourceIcon kind="shield" value={view.self.shield} />
        <ResourceIcon kind="point" value={view.self.points} />
        <ResourceIcon kind="upgradePoint" value={view.self.upgradePoints} />
        {view.self.shieldIsUpgraded ? (
          <span className="text-xs text-ink-muted">Shield upgraded</span>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2" data-zone="hand">
        {view.self.hand.map((card) => (
          <Card key={card.instanceId} instance={card} className="w-20" />
        ))}
      </div>
      <h3 className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Specials
      </h3>
      {view.self.specialCards.length === 0 ? (
        <p className="mt-1 text-sm text-ink-muted">None</p>
      ) : (
        <div className="mt-1 flex flex-wrap gap-2" data-zone="specials">
          {view.self.specialCards.map((card) => (
            <Card key={card.instanceId} instance={card} className="w-20" />
          ))}
        </div>
      )}
    </section>
  );
}
