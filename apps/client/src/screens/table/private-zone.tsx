/**
 * Private zone — kit + incoming, shared-size hand/specials, resources.
 * No vertical scroll. Effect text only in Dialogs.
 */

import type {
  PendingEffectView,
  PlayingStateView,
  PublicPlayerView,
} from '@card-battle/shared';
import type { ReactElement } from 'react';

import { ConnectionBadge } from '../../design/components/connection-badge';
import { KitPortrait } from '../../design/components/kit-portrait';
import { ResourceIcon } from '../../design/components/resource-icon';
import { CardBand } from './card-band';
import { PendingQueue } from './pending-queue';

export interface PrivateZoneProps {
  view: PlayingStateView;
  selfPublic: PublicPlayerView | undefined;
  incomingEffects: readonly PendingEffectView[];
  onInspectKit: () => void;
  onSelectOwnCard?: (instanceId: string) => void;
}

export function PrivateZone({
  view,
  selfPublic,
  incomingEffects,
  onInspectKit,
  onSelectOwnCard,
}: PrivateZoneProps): ReactElement {
  return (
    <section
      data-zone="private-zone"
      className="flex h-full min-h-0 flex-col gap-1 overflow-hidden"
    >
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <KitPortrait
            kitId={view.self.kitId}
            className="w-14 shrink-0"
            onClick={onInspectKit}
            ariaLabel="Inspect your kit"
          />
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <h2 className="text-sm font-semibold text-ink">Your zone</h2>
            {selfPublic !== undefined && <ConnectionBadge player={selfPublic} />}
          </div>
        </div>
        <div
          data-zone="incoming-pending"
          className="max-h-[3rem] max-w-[min(100%,12rem)] shrink-0 overflow-hidden"
        >
          <PendingQueue
            view={view}
            effects={incomingEffects}
            title="Incoming"
            compact
            tone="dock"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <CardBand
          hand={view.self.hand}
          specials={view.self.specialCards}
          {...(onSelectOwnCard !== undefined ? { onSelect: onSelectOwnCard } : {})}
        />
      </div>

      <div
        data-zone="resources"
        className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border-soft pt-1"
      >
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
    </section>
  );
}
