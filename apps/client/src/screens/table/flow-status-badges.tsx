/**
 * Turn-flow status pills on a seat — Block chain, Invisibility, Duplicator, Reanimation (L30-04).
 * Public fields only; zero rule logic.
 */

import type { PublicPlayerView } from '@card-battle/shared';
import type { ReactElement } from 'react';

export interface FlowStatusBadgesProps {
  player: PublicPlayerView;
  compact?: boolean;
}

interface BadgeSpec {
  key: string;
  label: string;
  tone: 'muted' | 'accent';
}

function badgesForPlayer(player: PublicPlayerView): BadgeSpec[] {
  const badges: BadgeSpec[] = [];

  if (player.blockTurnsRemaining > 0) {
    badges.push({
      key: 'block-turns',
      label: `Block · ${String(player.blockTurnsRemaining)} left`,
      tone: 'accent',
    });
  } else if (player.blockAttacksForbidden) {
    badges.push({
      key: 'block-attacks',
      label: 'Block · attacks banned',
      tone: 'accent',
    });
  }

  if (player.activePersistentEffects.some((effect) => effect.cardId === 'invisibility')) {
    badges.push({ key: 'invisibility', label: 'Invisible', tone: 'accent' });
  }

  if (player.duplicationActive) {
    badges.push({ key: 'duplication', label: 'Duplicating', tone: 'accent' });
  }

  if (player.pendingReanimation !== null) {
    badges.push({ key: 'reanimation', label: 'Reanimating', tone: 'accent' });
  }

  return badges;
}

export function FlowStatusBadges({
  player,
  compact = false,
}: FlowStatusBadgesProps): ReactElement | null {
  const badges = badgesForPlayer(player);
  if (badges.length === 0) {
    return null;
  }

  const textSize = compact ? 'text-[9px]' : 'text-[10px] sm:text-[10px]';

  return (
    <div
      data-zone="flow-status-badges"
      className="flex flex-wrap items-center gap-0.5 sm:gap-1"
    >
      {badges.map((badge) => (
        <span
          key={badge.key}
          className={[
            'inline-block rounded-[length:var(--radius-badge)] px-1.5 py-0.5',
            'font-sans font-semibold uppercase tracking-wide',
            textSize,
            badge.tone === 'accent'
              ? 'bg-cta-purple/15 text-cta-purple'
              : 'bg-surface text-ink-muted',
          ].join(' ')}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}
