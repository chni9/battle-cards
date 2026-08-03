/**
 * Opponent seat — hug content, never crop kit portrait.
 * Active persistents sit beside the kit as tiny thumbs (not a row above).
 */

import type { KitId, PublicPlayerView } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { BotSeatLabel } from '../../design/components/bot-seat-label';
import { Card } from '../../design/components/card';
import { ConnectionBadge } from '../../design/components/connection-badge';
import { KitPortrait } from '../../design/components/kit-portrait';
import { ResourceIcon } from '../../design/components/resource-icon';
import {
  persistentToCardInstance,
  shieldActiveInstance,
} from './active-display';

export interface OpponentZoneProps {
  player: PublicPlayerView;
  onInspectCard?: (instanceId: string) => void;
  onInspectActive?: (effectId: string) => void;
  onInspectKit?: (kitId: KitId) => void;
}

function ActiveThumbs({
  player,
  onInspectActive,
}: {
  player: PublicPlayerView;
  onInspectActive?: (effectId: string) => void;
}): ReactElement | null {
  const actives = [
    ...(player.activeShield !== null
      ? [shieldActiveInstance(player.activeShield.isUpgraded)]
      : []),
    ...player.activePersistentEffects.map(persistentToCardInstance),
  ];
  if (actives.length === 0) {
    return null;
  }

  return (
    <div
      data-zone="opponent-actives"
      className="flex shrink-0 items-center gap-0.5"
      title="Active cards"
    >
      {actives.map((instance) => (
        <Card
          key={instance.instanceId}
          instance={instance}
          detail="thumb"
          activated={instance.cardId !== 'shield'}
          className="w-6 !p-0 sm:w-7"
          {...(onInspectActive !== undefined
            ? {
                onSelect: () => {
                  onInspectActive(instance.instanceId);
                },
              }
            : {})}
        />
      ))}
    </div>
  );
}

export function OpponentZone({
  player,
  onInspectCard,
  onInspectActive,
  onInspectKit,
}: OpponentZoneProps): ReactElement {
  const spiedKitId = player.spied?.kitId;
  const spied = player.spied;

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
        {player.isBot && player.botDifficulty !== undefined && (
          <BotSeatLabel difficulty={player.botDifficulty} />
        )}
      </div>

      {spied === undefined ? (
        <div className="mt-1 flex items-center gap-1.5 border-t border-border-soft pt-1 sm:mt-1.5 sm:gap-2 sm:pt-1.5">
          <KitPortrait
            kitId={null}
            nickname={player.nickname}
            isEliminated={player.isEliminated}
            className="w-10 shrink-0 sm:w-14"
          />
          <ActiveThumbs player={player} {...(onInspectActive !== undefined ? { onInspectActive } : {})} />
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
            <ActiveThumbs
              player={player}
              {...(onInspectActive !== undefined ? { onInspectActive } : {})}
            />
            {spied.lives !== undefined ? (
              <div className="flex min-w-0 flex-wrap gap-1">
                <ResourceIcon kind="life" value={spied.lives} flyToken={false} />
                <ResourceIcon kind="point" value={spied.points ?? 0} flyToken={false} />
                <ResourceIcon
                  kind="upgradePoint"
                  value={spied.upgradePoints ?? 0}
                  flyToken={false}
                />
                <ResourceIcon kind="shield" value={spied.shield ?? 0} flyToken={false} />
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
