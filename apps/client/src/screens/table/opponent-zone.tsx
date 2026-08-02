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
  onInspectActive?: (effectId: string) => void;
  onInspectKit?: (kitId: KitId) => void;
}

export function OpponentZone({
  player,
  onInspectCard,
  onInspectActive,
  onInspectKit,
}: OpponentZoneProps): ReactElement {
  const spiedKitId = player.spied?.kitId;
  const spied = player.spied;
  const actives = player.activePersistentEffects;

  return (
    <article
      data-zone="opponent-seat"
      data-player-id={player.id}
      className="flex w-auto max-w-[11rem] shrink-0 flex-col rounded-[length:var(--radius-card)] border border-border-soft bg-surface-raised p-1.5 text-ink shadow-sm landscape:max-w-[14rem] sm:max-w-[20rem] sm:p-2"
    >
      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
        <h3 className="truncate text-xs font-semibold text-ink sm:text-sm">
          {player.nickname}
        </h3>
        <ConnectionBadge player={player} />
      </div>

      {actives.length > 0 && (
        <div className="mt-1 border-t border-border-soft pt-1">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-ink-muted">
            Active
          </p>
          <div className="mt-0.5 flex flex-wrap gap-0.5">
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
                className="w-8 !p-0.5"
                {...(onInspectActive !== undefined
                  ? {
                      onSelect: () => {
                        onInspectActive(effect.id);
                      },
                    }
                  : {})}
              />
            ))}
          </div>
        </div>
      )}

      {spied === undefined ? (
        <div className="mt-1 flex items-center gap-1.5 border-t border-border-soft pt-1 sm:mt-1.5 sm:gap-2 sm:pt-1.5">
          <KitPortrait
            kitId={null}
            nickname={player.nickname}
            isEliminated={player.isEliminated}
            className="w-10 shrink-0 sm:w-14"
          />
          <p className="text-[9px] uppercase tracking-wide text-ink-muted sm:text-[10px]">
            Hidden kit
          </p>
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
