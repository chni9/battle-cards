/**
 * Private zone — kit + incoming, shared-height hand/specials, resources.
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
import { FluidCardRow } from './fluid-card-row';
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
            className="w-11"
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

      {/* One shared card band so hand + specials share height and stay readable. */}
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-[1_1_78%] flex-col overflow-hidden">
          <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            Hand
          </p>
          <div className="mt-0.5 min-h-0 flex-1 overflow-hidden">
            <FluidCardRow
              cards={view.self.hand}
              detail="face"
              emptyLabel="Empty"
              data-zone="hand"
              {...(onSelectOwnCard !== undefined ? { onSelect: onSelectOwnCard } : {})}
            />
          </div>
        </div>
        <div className="flex min-h-0 w-[min(22%,9rem)] shrink-0 flex-col overflow-hidden">
          <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            Specials
          </p>
          <div className="mt-0.5 min-h-0 flex-1 overflow-hidden">
            <FluidCardRow
              cards={view.self.specialCards}
              detail="face"
              emptyLabel="None"
              data-zone="specials"
              {...(onSelectOwnCard !== undefined ? { onSelect: onSelectOwnCard } : {})}
            />
          </div>
        </div>
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
