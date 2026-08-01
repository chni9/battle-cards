/**
 * Private zone — kit, resources, incoming pending, hand, specials.
 * Kit portrait opens inspect Dialog (catalog facts only).
 *
 * Must fit the dock without vertical scroll: compact faces, side-by-side
 * hand/specials, overflow-hidden (horizontal scroll only if many cards).
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
import { Tooltip } from '../../design/components/tooltip';
import { PendingQueue } from './pending-queue';

export interface PrivateZoneProps {
  view: PlayingStateView;
  selfPublic: PublicPlayerView | undefined;
  /** Effects targeting the local player. */
  incomingEffects: readonly PendingEffectView[];
  onInspectKit: () => void;
  onSelectOwnCard?: (instanceId: string) => void;
  cardDisabledReason?: (instanceId: string) => string | null;
}

function OwnCardFace({
  card,
  onSelectOwnCard,
  cardDisabledReason,
}: {
  card: PlayingStateView['self']['hand'][number];
  onSelectOwnCard?: (instanceId: string) => void;
  cardDisabledReason?: (instanceId: string) => string | null;
}): ReactElement {
  const reason = cardDisabledReason?.(card.instanceId) ?? null;
  const canSelect = onSelectOwnCard !== undefined && reason === null;
  const face = (
    <Card
      instance={card}
      detail="face"
      className={['w-[3.25rem] shrink-0 p-0.5', reason !== null ? 'opacity-50' : ''].join(
        ' ',
      )}
      {...(canSelect
        ? {
            onSelect: () => {
              onSelectOwnCard(card.instanceId);
            },
          }
        : {})}
    />
  );
  return (
    <Tooltip content={reason ?? ''} enabled={reason !== null}>
      {face}
    </Tooltip>
  );
}

export function PrivateZone({
  view,
  selfPublic,
  incomingEffects,
  onInspectKit,
  onSelectOwnCard,
  cardDisabledReason,
}: PrivateZoneProps): ReactElement {
  return (
    <section
      data-zone="private-zone"
      className="flex h-full min-h-0 flex-col gap-1 overflow-hidden"
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-1">
        <h2 className="text-xs font-semibold text-ink md:text-sm">Your zone</h2>
        {selfPublic !== undefined && (
          <span className="flex items-center gap-2 text-xs text-ink-muted">
            <ConnectionBadge player={selfPublic} />
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <KitPortrait
            kitId={view.self.kitId}
            className="w-12"
            onClick={onInspectKit}
            ariaLabel="Inspect your kit"
          />
          <div className="flex flex-wrap items-center gap-1">
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
        </div>
        <div
          data-zone="incoming-pending"
          className="max-h-[4.5rem] max-w-[min(100%,12rem)] shrink-0 self-start overflow-y-auto"
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

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-1 overflow-hidden sm:grid-cols-2">
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            Hand
          </p>
          <div
            className="mt-0.5 flex min-h-0 flex-nowrap items-start gap-1 overflow-x-auto overflow-y-hidden"
            data-zone="hand"
          >
            {view.self.hand.length === 0 ? (
              <p className="text-xs text-ink-muted">Empty</p>
            ) : (
              view.self.hand.map((card) => (
                <OwnCardFace
                  key={card.instanceId}
                  card={card}
                  {...(onSelectOwnCard !== undefined ? { onSelectOwnCard } : {})}
                  {...(cardDisabledReason !== undefined ? { cardDisabledReason } : {})}
                />
              ))
            )}
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            Specials
          </p>
          <div
            className="mt-0.5 flex min-h-0 flex-nowrap items-start gap-1 overflow-x-auto overflow-y-hidden"
            data-zone="specials"
          >
            {view.self.specialCards.length === 0 ? (
              <p className="text-xs text-ink-muted">None</p>
            ) : (
              view.self.specialCards.map((card) => (
                <OwnCardFace
                  key={card.instanceId}
                  card={card}
                  {...(onSelectOwnCard !== undefined ? { onSelectOwnCard } : {})}
                  {...(cardDisabledReason !== undefined ? { cardDisabledReason } : {})}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
