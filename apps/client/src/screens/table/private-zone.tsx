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
import { Button } from '../../design/components/button';
import { KitPortrait } from '../../design/components/kit-portrait';
import { PlayerName } from '../../design/components/player-name';
import { ResourceIcon } from '../../design/components/resource-icon';
import { seatIndexOf } from '../../design/seat-colors';
import { persistentToCardInstance, shieldActiveInstance } from './active-display';
import { CardBand } from './card-band';
import { FlowStatusBadges } from './flow-status-badges';
import { PendingQueue } from './pending-queue';

/** Dock resource row shows captions in the layout (L43-01 / technical spec v6 §6.1). */
export const DOCK_RESOURCE_CAPTION_VISIBLE = true;

export interface PrivateZoneProps {
  view: PlayingStateView;
  selfPublic: PublicPlayerView | undefined;
  incomingEffects: readonly PendingEffectView[];
  mirrorHighlightIds?: readonly string[];
  isMyTurn: boolean;
  actionsLocked: boolean;
  onInspectKit: () => void;
  onSelectOwnCard?: (instanceId: string) => void;
  onSelectActive?: (instanceId: string) => void;
  onDeactivatePersistent?: (effectId: string) => void;
  onActivateDuplication?: () => void;
  highlightedInstanceIds?: readonly string[];
  /** Tutorial red Incoming chips (Attack / Spy / Thief). */
  threatHighlightIds?: readonly string[];
}

export function PrivateZone({
  view,
  selfPublic,
  incomingEffects,
  mirrorHighlightIds = [],
  isMyTurn,
  actionsLocked,
  onInspectKit,
  onSelectOwnCard,
  onSelectActive,
  onDeactivatePersistent,
  onActivateDuplication,
  highlightedInstanceIds,
  threatHighlightIds = [],
}: PrivateZoneProps): ReactElement {
  const actives = [
    ...(view.self.shield > 0
      ? [shieldActiveInstance(view.self.shieldIsUpgraded)]
      : []),
    ...view.self.activePersistentEffects.map(persistentToCardInstance),
  ];

  const invisibilityEffect = view.self.activePersistentEffects.find(
    (effect) => effect.cardId === 'invisibility',
  );
  const controlsDisabled = !isMyTurn || actionsLocked;
  const showActivateDuplication =
    view.self.kitId === 'duplicator' && selfPublic?.duplicationActive !== true;
  const showDuplicationActive = selfPublic?.duplicationActive === true;
  const showTurnFlowControls =
    invisibilityEffect !== undefined ||
    showActivateDuplication ||
    showDuplicationActive;

  const povSeat = seatIndexOf(view, view.you);
  const isActiveSeat = view.currentTurnPlayerId === view.you;
  const youLabel = selfPublic?.nickname ?? 'You';
  const incomingThreats = threatHighlightIds.length > 0;

  return (
    <section
      data-zone="private-zone"
      data-player-id={view.you}
      data-seat={view.you}
      data-seat-index={povSeat !== null ? String(povSeat) : undefined}
      data-active-seat={isActiveSeat ? 'true' : undefined}
      className="flex h-full min-h-0 flex-col gap-0.5 overflow-visible landscape:gap-1"
    >
      <div className="flex shrink-0 items-center justify-between gap-1.5 overflow-visible sm:gap-2">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <KitPortrait
            kitId={view.self.kitId}
            className="w-10 shrink-0 landscape:w-12 sm:w-14"
            onClick={onInspectKit}
            ariaLabel="Inspect your kit"
          />
          <div className="flex min-w-0 flex-wrap items-center gap-1 sm:gap-1.5">
            <h2 className="truncate text-xs sm:text-sm">
              <PlayerName
                nickname={youLabel}
                playerId={view.you}
                view={view}
                className="text-xs sm:text-sm"
              />
            </h2>
            {selfPublic !== undefined && <ConnectionBadge player={selfPublic} />}
            {selfPublic !== undefined && <FlowStatusBadges player={selfPublic} />}
          </div>
          {actives.length > 0 && (
            <div
              data-zone="own-actives"
              className="flex shrink-0 items-center gap-0.5"
              title="Active cards"
            >
              {actives.map((instance) => (
                <Card
                  key={instance.instanceId}
                  instance={instance}
                  detail="thumb"
                  activated={instance.cardId !== 'shield'}
                  className="w-7 !p-0.5 sm:w-8"
                  {...(onSelectActive !== undefined
                    ? {
                        onSelect: () => {
                          onSelectActive(instance.instanceId);
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
          className={[
            'min-w-0 flex-1 overscroll-contain',
            incomingThreats
              ? 'overflow-visible pt-10'
              : 'max-h-[3.5rem] overflow-y-auto landscape:max-h-[5rem] sm:max-h-[5.5rem]',
          ].join(' ')}
        >
          <PendingQueue
            view={view}
            effects={incomingEffects}
            title="Incoming"
            compact
            tone="dock"
            highlightedIds={mirrorHighlightIds}
            animateEntrance
            {...(incomingThreats ? { threatHighlightIds } : {})}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <CardBand
          hand={view.self.hand}
          specials={view.self.specialCards}
          {...(onSelectOwnCard !== undefined ? { onSelect: onSelectOwnCard } : {})}
          {...(highlightedInstanceIds !== undefined ? { highlightedInstanceIds } : {})}
        />
      </div>

      <div
        data-zone="resources"
        className="flex shrink-0 flex-wrap items-center gap-1.5 border-t border-border-soft pt-0.5 sm:gap-2 sm:pt-1"
      >
        <ResourceIcon
          kind="life"
          value={view.self.lives}
          label="Lives"
          captionVisible={DOCK_RESOURCE_CAPTION_VISIBLE}
        />
        <ResourceIcon
          kind="shield"
          value={view.self.shield}
          label="Shield"
          captionVisible={DOCK_RESOURCE_CAPTION_VISIBLE}
        />
        <ResourceIcon
          kind="point"
          value={view.self.points}
          label="Points"
          captionVisible={DOCK_RESOURCE_CAPTION_VISIBLE}
        />
        <ResourceIcon
          kind="upgradePoint"
          value={view.self.upgradePoints}
          label="Upgrade points"
          captionVisible={DOCK_RESOURCE_CAPTION_VISIBLE}
        />
        {view.self.shieldIsUpgraded ? (
          <span className="rounded-[length:var(--radius-badge)] bg-resource-shield/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-resource-shield">
            Shield ↑
          </span>
        ) : null}
      </div>
      {showTurnFlowControls && (
        <div
          data-zone="turn-flow-controls"
          className="flex shrink-0 flex-wrap items-center gap-1 border-t border-border-soft pt-0.5 sm:gap-1.5 sm:pt-1"
        >
          {invisibilityEffect !== undefined && onDeactivatePersistent !== undefined && (
            <Button
              variant="purple"
              disabled={controlsDisabled}
              className="min-h-8 min-w-0 px-2.5 py-1 text-[11px] sm:text-xs"
              onClick={() => {
                onDeactivatePersistent(invisibilityEffect.id);
              }}
            >
              Deactivate invisibility
            </Button>
          )}
          {showActivateDuplication && onActivateDuplication !== undefined && (
            <Button
              variant="purple"
              disabled={controlsDisabled}
              className="min-h-8 min-w-0 px-2.5 py-1 text-[11px] sm:text-xs"
              onClick={onActivateDuplication}
            >
              Activate duplication
            </Button>
          )}
          {showDuplicationActive && (
            <span className="text-[10px] font-medium text-ink-muted sm:text-xs">
              Duplication active
            </span>
          )}
        </div>
      )}
    </section>
  );
}
