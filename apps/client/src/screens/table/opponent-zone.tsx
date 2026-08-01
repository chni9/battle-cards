/**
 * Opponent seat — L12-01 shell placement; L12-02 restyles.
 * Visibility follows PlayingStateView only (Spy-gated).
 */

import type { PublicPlayerView } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { Card } from '../../design/components/card';
import { ConnectionBadge } from '../../design/components/connection-badge';
import { KitPortrait } from '../../design/components/kit-portrait';
import { ResourceIcon } from '../../design/components/resource-icon';

export interface OpponentZoneProps {
  player: PublicPlayerView;
  /** Legacy target radio until L12-08. */
  selectedAsTarget: boolean;
  onSelectTarget: () => void;
  targetDisabled: boolean;
}

export function OpponentZone({
  player,
  selectedAsTarget,
  onSelectTarget,
  targetDisabled,
}: OpponentZoneProps): ReactElement {
  return (
    <article
      data-zone="opponent-seat"
      className="w-full max-w-[14rem] rounded-[length:var(--radius-card)] border border-slate-soft/50 bg-surface-raised p-2 text-ink shadow-sm"
    >
      <label className="flex cursor-pointer flex-wrap items-center gap-2 text-sm font-semibold">
        <input
          type="radio"
          name="target"
          checked={selectedAsTarget}
          disabled={targetDisabled}
          onChange={onSelectTarget}
          className="size-4 accent-cta-purple"
        />
        <span>{player.nickname}</span>
        <ConnectionBadge player={player} />
      </label>

      {player.spied !== undefined ? (
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <KitPortrait
              kitId={player.spied.kitId}
              nickname={player.nickname}
              isEliminated={player.isEliminated}
            />
            {player.spied.lives !== undefined ? (
              <>
                <ResourceIcon kind="life" value={player.spied.lives} />
                <ResourceIcon kind="point" value={player.spied.points ?? 0} />
                <ResourceIcon
                  kind="upgradePoint"
                  value={player.spied.upgradePoints ?? 0}
                />
                <ResourceIcon kind="shield" value={player.spied.shield ?? 0} />
              </>
            ) : null}
            {player.spied.resourcesSnapshot !== undefined ? (
              <span className="text-xs text-ink-muted">
                Snapshot turn {player.spied.resourcesSnapshot.turnSequence}:{' '}
                <ResourceIcon kind="life" value={player.spied.resourcesSnapshot.lives} />{' '}
                <ResourceIcon kind="point" value={player.spied.resourcesSnapshot.points} />{' '}
                <ResourceIcon
                  kind="upgradePoint"
                  value={player.spied.resourcesSnapshot.upgradePoints}
                />{' '}
                <ResourceIcon
                  kind="shield"
                  value={player.spied.resourcesSnapshot.shield}
                />
              </span>
            ) : null}
          </div>
          <p className="text-xs font-medium text-ink-muted">Hand</p>
          <div className="flex flex-wrap gap-2">
            {player.spied.hand.map((card) => (
              <Card key={card.instanceId} instance={card} className="w-16" />
            ))}
          </div>
          {player.spied.specialCards.length > 0 && (
            <>
              <p className="text-xs font-medium text-ink-muted">Specials</p>
              <div className="flex flex-wrap gap-2">
                {player.spied.specialCards.map((card) => (
                  <Card key={card.instanceId} instance={card} className="w-16" />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="mt-2">
          <KitPortrait
            kitId={null}
            nickname={player.nickname}
            isEliminated={player.isEliminated}
          />
        </div>
      )}
    </article>
  );
}
