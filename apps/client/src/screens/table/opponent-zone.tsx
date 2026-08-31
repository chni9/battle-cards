/**
 * Opponent seat — hug content, never crop kit portrait.
 * Spy / death reveal: click the portrait to open the reveal dialog.
 * Resource icons always render; unspied / base Spy show `?` (L51-08).
 * Resources stack beside the portrait; activated cards sit under it (L51-10).
 */

import type { PlayingStateView, PublicPlayerView } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { BotSeatLabel } from '../../design/components/bot-seat-label';
import { Card } from '../../design/components/card';
import { ConnectionBadge } from '../../design/components/connection-badge';
import { KitPortrait } from '../../design/components/kit-portrait';
import { PlayerName } from '../../design/components/player-name';
import { ResourceIcon } from '../../design/components/resource-icon';
import { seatIndexOf, seatZoneStyle } from '../../design/seat-colors';
import {
  persistentToCardInstance,
  shieldActiveInstance,
} from './active-display';
import { FlowStatusBadges } from './flow-status-badges';
import { opponentResourceDisplay } from './opponent-seat-resources';
import { TutorialCallout } from './tutorial-callout';

export interface OpponentZoneProps {
  view: PlayingStateView;
  player: PublicPlayerView;
  onInspectActive?: (effectId: string) => void;
  /** Spy or death reveal — opens the opponent info dialog. */
  onInspectReveal?: () => void;
  /** Tutorial spotlight after Spy (L45-05). */
  highlightPortrait?: boolean;
  /** Shrink chrome when 4+ opponents share the arc. */
  compact?: boolean;
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
      className="flex max-w-full flex-wrap items-center gap-0.5"
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

function OpponentSeatResourceColumn({
  player,
}: {
  player: PublicPlayerView;
}): ReactElement {
  const display = opponentResourceDisplay(player);

  const value = (amount: number): number | 'unknown' =>
    display.known ? amount : 'unknown';
  const lives = display.known ? display.values.lives : 0;
  const points = display.known ? display.values.points : 0;
  const upgradePoints = display.known ? display.values.upgradePoints : 0;
  const shield = display.known ? display.values.shield : 0;

  return (
    <div
      data-zone="opponent-resources"
      className="flex shrink-0 flex-col items-start gap-0"
    >
      <ResourceIcon
        kind="life"
        value={value(lives)}
        flyToken={display.known}
        playerId={player.id}
        className="gap-1"
      />
      <ResourceIcon
        kind="point"
        value={value(points)}
        flyToken={display.known}
        playerId={player.id}
        className="gap-1"
      />
      <ResourceIcon
        kind="upgradePoint"
        value={value(upgradePoints)}
        flyToken={display.known}
        playerId={player.id}
        className="gap-1"
      />
      <ResourceIcon
        kind="shield"
        value={value(shield)}
        flyToken={display.known}
        playerId={player.id}
        className="gap-1"
      />
    </div>
  );
}

export function OpponentZone({
  view,
  player,
  onInspectActive,
  onInspectReveal,
  highlightPortrait = false,
  compact = false,
}: OpponentZoneProps): ReactElement {
  const reveal = player.eliminationReveal;
  const spied = player.spied;
  const shownKitId =
    reveal !== undefined ? reveal.kitId : spied !== undefined ? spied.kitId : null;
  const revealMode =
    reveal !== undefined ? 'elimination' : spied !== undefined ? 'spy' : null;

  const seat = seatIndexOf(view, player.id);
  const isActiveSeat = view.currentTurnPlayerId === player.id;
  const zoneStyle =
    seat !== null
      ? seatZoneStyle(seat, { active: isActiveSeat, intensity: 'soft' })
      : undefined;

  return (
    <article
      data-zone="opponent-seat"
      data-player-id={player.id}
      data-seat={player.id}
      data-seat-index={seat !== null ? String(seat) : undefined}
      data-active-seat={isActiveSeat ? 'true' : undefined}
      {...(revealMode === null && !player.isEliminated
        ? { 'data-hint-anchor': 'hidden-kit' }
        : {})}
      className={
        compact
          ? 'flex w-auto max-w-[6.75rem] shrink-0 flex-col rounded-[length:var(--radius-card)] border border-border-soft bg-surface-raised p-1 text-ink shadow-sm landscape:max-w-[8rem] sm:max-w-[9rem] sm:p-1.5'
          : 'flex w-auto max-w-[7.75rem] shrink-0 flex-col rounded-[length:var(--radius-card)] border border-border-soft bg-surface-raised p-1 text-ink shadow-sm sm:max-w-[10rem] sm:p-1.5'
      }
      style={zoneStyle}
    >
      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
        <h3 className="truncate text-xs sm:text-sm">
          <PlayerName
            nickname={player.nickname}
            playerId={player.id}
            view={view}
            className="text-xs sm:text-sm"
          />
        </h3>
        {!player.isEliminated && <ConnectionBadge player={player} />}
        {!player.isEliminated &&
          player.isBot &&
          player.botDifficulty !== undefined &&
          view.playKind !== 'tutorial' && (
          <BotSeatLabel difficulty={player.botDifficulty} />
        )}
      </div>
      {!player.isEliminated && (
        <FlowStatusBadges player={player} compact />
      )}

      <div className="mt-1 flex items-start gap-1.5 border-t border-border-soft pt-1 sm:mt-1.5 sm:gap-2 sm:pt-1.5">
        <div className="flex min-w-0 flex-col items-start gap-1">
          <TutorialCallout
            active={highlightPortrait}
            arrow="bottom"
            highlightId="opponent-portrait"
          >
            <div data-zone="opponent-portrait">
              <KitPortrait
                kitId={shownKitId}
                nickname={player.nickname}
                isEliminated={player.isEliminated}
                className={compact ? 'w-7 shrink-0 sm:w-9' : 'w-8 shrink-0 sm:w-11'}
                {...(onInspectReveal !== undefined && revealMode !== null
                  ? {
                      onClick: onInspectReveal,
                      ariaLabel:
                        revealMode === 'elimination'
                          ? `Inspect ${player.nickname}'s revealed cards`
                          : `Inspect ${player.nickname}'s Spy reveal`,
                    }
                  : {})}
              />
            </div>
          </TutorialCallout>
          <ActiveThumbs
            player={player}
            {...(onInspectActive !== undefined ? { onInspectActive } : {})}
          />
        </div>
        <OpponentSeatResourceColumn player={player} />
      </div>
    </article>
  );
}
