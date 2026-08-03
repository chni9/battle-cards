/**
 * Private zone — kit + actives + incoming on one header row; hand/specials below.
 * Activating a card must not steal vertical space from the card band.
 */

import type {
  PendingEffectView,
  PlayingStateView,
  PublicPlayerView,
} from '@card-battle/shared';
import type { ReactElement } from 'react';

import { Card } from '../../design/components/card';
import { ConnectionBadge } from '../../design/components/connection-badge';
import { KitPortrait } from '../../design/components/kit-portrait';
import { ResourceIcon } from '../../design/components/resource-icon';
import { CardBand } from './card-band';
import { PendingQueue } from './pending-queue';

export interface PrivateZoneProps {
  view: PlayingStateView;
  selfPublic: PublicPlayerView | undefined;
  incomingEffects: readonly PendingEffectView[];
  mirrorHighlightIds?: readonly string[];
  onInspectKit: () => void;
  onSelectOwnCard?: (instanceId: string) => void;
  onSelectActive?: (instanceId: string) => void;
}

export function PrivateZone({
  view,
  selfPublic,
  incomingEffects,
  mirrorHighlightIds = [],
  onInspectKit,
  onSelectOwnCard,
  onSelectActive,
}: PrivateZoneProps): ReactElement {
  const actives = view.self.activePersistentEffects;

  return (
    <section
      data-zone="private-zone"
      className="flex h-full min-h-0 flex-col gap-0.5 overflow-hidden landscape:gap-1"
    >
      <div className="flex shrink-0 items-center justify-between gap-1.5 sm:gap-2">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <KitPortrait
            kitId={view.self.kitId}
            className="w-10 shrink-0 landscape:w-12 sm:w-14"
            onClick={onInspectKit}
            ariaLabel="Inspect your kit"
          />
          <div className="flex min-w-0 flex-wrap items-center gap-1 sm:gap-1.5">
            <h2 className="text-xs font-semibold text-ink sm:text-sm">You</h2>
            {selfPublic !== undefined && <ConnectionBadge player={selfPublic} />}
          </div>
          {actives.length > 0 && (
            <div
              data-zone="own-actives"
              className="flex shrink-0 items-center gap-0.5"
              title="Active cards"
            >
              {actives.map((effect) => (
                <Card
                  key={effect.id}
                  instance={{
                    instanceId: effect.id,
                    cardId: effect.cardId,
                    isUpgraded: effect.isUpgraded,
                  }}
                  detail="thumb"
                  activated
                  className="w-7 !p-0.5 sm:w-8"
                  {...(onSelectActive !== undefined
                    ? {
                        onSelect: () => {
                          onSelectActive(effect.id);
                        },
                      }
                    : {})}
                />
              ))}
            </div>
          )}
        </div>
        <div
          data-zone="incoming-pending"
          className="max-h-[3.5rem] max-w-[min(100%,12rem)] shrink-0 overflow-y-auto overscroll-contain landscape:max-h-[5rem] sm:max-h-[5.5rem] sm:max-w-[min(100%,14rem)]"
        >
          <PendingQueue
            view={view}
            effects={incomingEffects}
            title="Incoming"
            compact
            tone="dock"
            highlightedIds={mirrorHighlightIds}
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
        className="flex shrink-0 flex-wrap items-center gap-1.5 border-t border-border-soft pt-0.5 sm:gap-2 sm:pt-1"
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
