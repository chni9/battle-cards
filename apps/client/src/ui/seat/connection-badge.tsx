/**
 * Seat connection and elimination badge — L10-04, parity `global-connection-badge` (technical
 * spec v7 Appendix A), §5.1 (grounds), §5.2 (11 px floor for functional text) and §5.3 (a seat
 * badge takes its radius from `--chrome-radius-sm` and carries no outline or hard shadow: the
 * seat frame around it owns the arcade chrome). L72-19. It replaces
 * `design/components/connection-badge.tsx` on V7 surfaces; the V2 file stays for the V2 table
 * until L74 switches its imports.
 *
 * - **Copy:** `connectionBadgeLabel` (the V2 strings and its 3 / 5 thresholds, unchanged);
 *   `null` means no badge, so the component renders nothing.
 * - **Name:** none beyond the text. The root has no role and no `aria-label`: the visible text
 *   is the spoken text, as in V2. The 12 px icon is decorative.
 * - **Tone:** eliminated is `--text` on `--bg-0` with the `eliminated` cross; every degraded
 *   state is `--text-2` on `--panel-2` with the `disconnected` plug. The two icons have
 *   different geometry, so the states never rest on color alone. Neither icon sits within
 *   CIEDE2000 20 of its fill (DESIGN.md › Icons), so neither needs a well.
 * - **Where:** table seats only. The lobby and Game over say the same things in their own
 *   words.
 */

import type { ReactElement } from 'react';
import { Icon } from '../icons/icon';
import { connectionBadgeLabel, type ConnectionBadgePlayer } from './connection-badge-label';

export interface ConnectionBadgeProps {
  player: ConnectionBadgePlayer;
  className?: string;
}

/** The same chip as `BotSeatLabel`'s `CHIP_CLASS` (`bot-seat-label.tsx`); change one, change both. */
const CHIP_CLASS =
  'inline-flex items-center gap-1 rounded-v7-chrome-sm px-1.5 py-0.5 font-v7-body text-v7-micro font-extrabold uppercase tracking-wide';

export function ConnectionBadge({ player, className = '' }: ConnectionBadgeProps): ReactElement | null {
  const label = connectionBadgeLabel(player);
  if (label === null) {
    return null;
  }

  const tone = player.isEliminated ? 'bg-v7-bg-0 text-v7-text' : 'bg-v7-panel-2 text-v7-text-2';

  return (
    <span className={[CHIP_CLASS, 'align-middle', tone, className].filter((part) => part !== '').join(' ')}>
      <Icon name={player.isEliminated ? 'eliminated' : 'disconnected'} size={12} className="shrink-0" />
      <span>{label}</span>
    </span>
  );
}
