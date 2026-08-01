/**
 * Opponent seat — hug content, no empty white slab, no internal scroll.
 * Spy thumbs scale via FluidCardRow inside a capped seat height.
 */

import type { KitId, PublicPlayerView } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { ConnectionBadge } from '../../design/components/connection-badge';
import { KitPortrait } from '../../design/components/kit-portrait';
import { ResourceIcon } from '../../design/components/resource-icon';
import { FluidCardRow } from './fluid-card-row';

export interface OpponentZoneProps {
  player: PublicPlayerView;
  onInspectCard?: (instanceId: string) => void;
  onInspectKit?: (kitId: KitId) => void;
}

export function OpponentZone({
  player,
  onInspectCard,
  onInspectKit,
}: OpponentZoneProps): ReactElement {
  const spiedKitId = player.spied?.kitId;
  const spied = player.spied;

  return (
    <article
      data-zone="opponent-seat"
      data-player-id={player.id}
      className="flex w-auto max-w-[18rem] flex-col overflow-hidden rounded-[length:var(--radius-card)] border border-border-soft bg-surface-raised p-2 text-ink shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <h3 className="truncate text-sm font-semibold text-ink">{player.nickname}</h3>
        <ConnectionBadge player={player} />
      </div>

      {spied === undefined ? (
        <div className="mt-1.5 flex items-center gap-2 border-t border-border-soft pt-1.5">
          <KitPortrait
            kitId={null}
            nickname={player.nickname}
            isEliminated={player.isEliminated}
            className="w-11"
          />
          <p className="text-[10px] uppercase tracking-wide text-ink-muted">Hidden kit</p>
        </div>
      ) : (
        <div className="mt-1.5 flex max-h-[14vh] min-h-0 flex-col gap-1 overflow-hidden border-t border-border-soft pt-1.5">
          <div className="flex shrink-0 items-center gap-1.5">
            <KitPortrait
              kitId={spied.kitId}
              nickname={player.nickname}
              isEliminated={player.isEliminated}
              className="w-10"
              {...(onInspectKit !== undefined && spiedKitId !== undefined
                ? {
                    onClick: () => {
                      onInspectKit(spiedKitId);
                    },
                    ariaLabel: `Inspect ${player.nickname}'s kit`,
                  }
                : {})}
            />
            {spied.lives !== undefined ? (
              <div className="flex min-w-0 flex-wrap gap-1">
                <ResourceIcon kind="life" value={spied.lives} />
                <ResourceIcon kind="point" value={spied.points ?? 0} />
                <ResourceIcon kind="upgradePoint" value={spied.upgradePoints ?? 0} />
                <ResourceIcon kind="shield" value={spied.shield ?? 0} />
              </div>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <p className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-ink-muted">
              Hand
            </p>
            <div className="mt-0.5 min-h-0 flex-1 overflow-hidden">
              <FluidCardRow
                cards={spied.hand}
                detail="thumb"
                emptyLabel="—"
                {...(onInspectCard !== undefined ? { onSelect: onInspectCard } : {})}
              />
            </div>
          </div>

          {spied.specialCards.length > 0 && (
            <div className="flex max-h-[32%] min-h-[2.25rem] shrink-0 flex-col overflow-hidden">
              <p className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-ink-muted">
                Specials
              </p>
              <div className="mt-0.5 min-h-0 flex-1 overflow-hidden">
                <FluidCardRow
                  cards={spied.specialCards}
                  detail="thumb"
                  emptyLabel="—"
                  {...(onInspectCard !== undefined ? { onSelect: onInspectCard } : {})}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
