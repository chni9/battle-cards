/**
 * Human-facing labels and formatting for the designer admin UI (Lot 61).
 */

import { KIT_CATALOG, type KitId } from '@card-battle/shared';

export function kitDisplayName(kitId: string | null | undefined): string {
  if (kitId === null || kitId === undefined || kitId.length === 0) {
    return '—';
  }
  if (!(kitId in KIT_CATALOG)) {
    return kitId;
  }
  return KIT_CATALOG[kitId as KitId].name;
}

/** Match length in minutes (one decimal). */
export function formatMinutesFromMs(durationMs: number | null | undefined): string {
  if (durationMs === null || durationMs === undefined) {
    return '—';
  }
  const minutes = durationMs / 60_000;
  if (minutes < 0.05) {
    return '< 0.1 min';
  }
  return `${minutes.toFixed(1)} min`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export function formatCount(value: number): string {
  return value.toLocaleString();
}

export function formatTurns(turns: number): string {
  return turns.toLocaleString();
}

export function tableDisplayName(table: string): string {
  const labels: Record<string, string> = {
    finished_games: 'Finished games',
    finished_game_players: 'Players',
    finished_game_eliminations: 'Eliminations',
    feedback_reports: 'Feedback',
  };
  return labels[table] ?? table;
}

export function columnDisplayName(column: string): string {
  return column
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function eliminationReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    combat: 'Combat',
    absence: 'Absent',
    inactivity: 'Inactive',
    leave: 'Left',
  };
  return labels[reason] ?? reason;
}
