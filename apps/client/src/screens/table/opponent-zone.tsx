/**
 * Opponent seat — hug content, never crop kit portrait.
 * Spy thumbs stay compact; no internal scroll.
 */

import type { KitId, PublicPlayerView } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { Card } from '../../design/components/card';
import { ConnectionBadge } from '../../design/components/connection-badge';
import { KitPortrait } from '../../design/components/kit-portrait';
import { ResourceIcon } from '../../design/components/resource-icon';

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
      className="flex w-auto max-w-[20rem] flex-col rounded-[length:var(--radius-card)] border border-border-soft bg-surface-raised p-2 text-ink shadow-sm"
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
            className="w-14 shrink-0"
          />
          <p className="text-[10px] uppercase tracking-wide text-ink-muted">Hidden kit</p>
        </div>
      ) : (
        <div className="mt-1.5 flex flex-col gap-1 border-t border-border-soft pt-1.5">
          <div className="flex items-center gap-1.5">
            <KitPortrait
              kitId={spied.kitId}
              nickname={player.nickname}
              isEliminated={player.isEliminated}
              className="w-11 shrink-0"
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

          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-ink-muted">
              Hand
            </p>
            <div className="mt-0.5 flex flex-wrap gap-0.5">
              {spied.hand.map((card) => (
                <Card
                  key={card.instanceId}
                  instance={card}
                  detail="thumb"
                  className="w-8 !p-0.5"
                  {...(onInspectCard !== undefined
                    ? {
                        onSelect: () => {
                          onInspectCard(card.instanceId);
                        },
                      }
                    : {})}
                />
              ))}
            </div>
          </div>

          {spied.specialCards.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-ink-muted">
                Specials
              </p>
              <div className="mt-0.5 flex flex-wrap gap-0.5">
                {spied.specialCards.map((card) => (
                  <Card
                    key={card.instanceId}
                    instance={card}
                    detail="thumb"
                    className="w-8 !p-0.5"
                    {...(onInspectCard !== undefined
                      ? {
                          onSelect: () => {
                            onInspectCard(card.instanceId);
                          },
                        }
                      : {})}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
