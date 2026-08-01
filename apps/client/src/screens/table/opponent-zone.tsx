/**
 * Opponent seat — L12-02 / L12-08 Spy inspect.
 * Visibility follows PlayingStateView only (Spy-gated). No public lives/card-count.
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

  return (
    <article
      data-zone="opponent-seat"
      data-player-id={player.id}
      className="max-h-full w-full max-w-[13rem] overflow-y-auto rounded-[length:var(--radius-card)] border border-border-soft bg-surface-raised p-2 text-ink shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-1">
        <h3 className="truncate text-sm font-semibold text-ink">{player.nickname}</h3>
        <ConnectionBadge player={player} />
      </div>
      {player.spied === undefined && (
        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-muted">
          Hidden kit
        </p>
      )}

      {player.spied !== undefined ? (
        <div className="mt-2 space-y-1.5 border-t border-border-soft pt-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <KitPortrait
              kitId={player.spied.kitId}
              nickname={player.nickname}
              isEliminated={player.isEliminated}
              className="w-14"
              {...(onInspectKit !== undefined && spiedKitId !== undefined
                ? {
                    onClick: () => {
                      onInspectKit(spiedKitId);
                    },
                    ariaLabel: `Inspect ${player.nickname}'s kit`,
                  }
                : {})}
            />
            {player.spied.lives !== undefined ? (
              <div className="flex flex-wrap gap-1">
                <ResourceIcon kind="life" value={player.spied.lives} />
                <ResourceIcon kind="point" value={player.spied.points ?? 0} />
                <ResourceIcon
                  kind="upgradePoint"
                  value={player.spied.upgradePoints ?? 0}
                />
                <ResourceIcon kind="shield" value={player.spied.shield ?? 0} />
              </div>
            ) : null}
          </div>
          {player.spied.resourcesSnapshot !== undefined ? (
            <p className="text-[11px] leading-snug text-ink-muted">
              Snapshot turn {player.spied.resourcesSnapshot.turnSequence}
              <span className="mt-1 flex flex-wrap gap-1">
                <ResourceIcon kind="life" value={player.spied.resourcesSnapshot.lives} />
                <ResourceIcon kind="point" value={player.spied.resourcesSnapshot.points} />
                <ResourceIcon
                  kind="upgradePoint"
                  value={player.spied.resourcesSnapshot.upgradePoints}
                />
                <ResourceIcon
                  kind="shield"
                  value={player.spied.resourcesSnapshot.shield}
                />
              </span>
            </p>
          ) : null}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
              Hand
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {player.spied.hand.map((card) => (
                <Card
                  key={card.instanceId}
                  instance={card}
                  detail="face"
                  className="w-12"
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
          {player.spied.specialCards.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                Specials
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {player.spied.specialCards.map((card) => (
                  <Card
                    key={card.instanceId}
                    instance={card}
                    detail="face"
                    className="w-12"
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
      ) : (
        <div className="mt-2 flex justify-center border-t border-border-soft pt-1.5">
          <KitPortrait
            kitId={null}
            nickname={player.nickname}
            isEliminated={player.isEliminated}
            className="w-14"
          />
        </div>
      )}
    </article>
  );
}
