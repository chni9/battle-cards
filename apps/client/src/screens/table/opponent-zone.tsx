/**
 * Opponent seat — hug content, never crop kit portrait.
 * Spy / death reveal stays compact: click the portrait to open the reveal dialog.
 * Active persistents sit beside the kit as tiny thumbs (not a row above).
 */

import type { PlayingStateView, PublicPlayerView } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { BotSeatLabel } from '../../design/components/bot-seat-label';
import { Card } from '../../design/components/card';
import { ConnectionBadge } from '../../design/components/connection-badge';
import { KitPortrait } from '../../design/components/kit-portrait';
import { PlayerName } from '../../design/components/player-name';
import { seatIndexOf, seatZoneStyle } from '../../design/seat-colors';
import {
  persistentToCardInstance,
  shieldActiveInstance,
} from './active-display';
import { FlowStatusBadges } from './flow-status-badges';
import { HIDDEN_KIT_LABEL } from './table-copy';

export interface OpponentZoneProps {
  view: PlayingStateView;
  player: PublicPlayerView;
  onInspectActive?: (effectId: string) => void;
  /** Spy or death reveal — opens the opponent info dialog. */
  onInspectReveal?: () => void;
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
  view,
  player,
  onInspectActive,
  onInspectReveal,
}: OpponentZoneProps): ReactElement {
  // Death reveal (Lot 19) beats Spy for dead seats — same display shape.
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
      className="flex w-auto max-w-[11rem] shrink-0 flex-col rounded-[length:var(--radius-card)] border border-border-soft bg-surface-raised p-1.5 text-ink shadow-sm landscape:max-w-[14rem] sm:max-w-[20rem] sm:p-2"
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
        {!player.isEliminated && player.isBot && player.botDifficulty !== undefined && (
          <BotSeatLabel difficulty={player.botDifficulty} />
        )}
      </div>
      {!player.isEliminated && (
        <FlowStatusBadges player={player} compact />
      )}

      <div className="mt-1 flex items-center gap-1.5 border-t border-border-soft pt-1 sm:mt-1.5 sm:gap-2 sm:pt-1.5">
        <KitPortrait
          kitId={shownKitId}
          nickname={player.nickname}
          isEliminated={player.isEliminated}
          className="w-10 shrink-0 sm:w-14"
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
        <ActiveThumbs
          player={player}
          {...(onInspectActive !== undefined ? { onInspectActive } : {})}
        />
        {revealMode === null ? (
          <p className="text-[9px] uppercase tracking-wide text-ink-muted sm:text-[10px]">
            {HIDDEN_KIT_LABEL}
          </p>
        ) : (
          <p className="text-[9px] font-semibold uppercase tracking-wide text-cta-purple sm:text-[10px]">
            {revealMode === 'elimination' ? 'Revealed — tap' : 'Spied — tap'}
          </p>
        )}
      </div>
    </article>
  );
}
