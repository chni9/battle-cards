/**
 * Human-facing labels and formatting for the designer admin UI (Lot 61).
 */

import {
  KIT_CATALOG,
  type AdminGameDetail,
  type AdminGameElimination,
  type KitId,
} from '@card-battle/shared';

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
  if (durationMs === null || durationMs === undefined || !Number.isFinite(durationMs)) {
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
  if (!Number.isFinite(rate)) {
    return '—';
  }
  return `${(rate * 100).toFixed(1)}%`;
}

export function formatNullablePercent(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) {
    return '—';
  }
  return formatPercent(rate);
}

export function formatCount(value: number): string {
  return value.toLocaleString();
}

export function formatTurns(turns: number): string {
  return turns.toLocaleString();
}

/** Recap / pacing think time in seconds. */
export function formatThinkMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) {
    return '—';
  }
  const seconds = ms / 1000;
  if (seconds < 0.05) {
    return '< 0.1 s';
  }
  return `${seconds.toFixed(1)} s`;
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
    gambling: 'Gambling',
  };
  return labels[reason] ?? reason;
}

/**
 * The match mode as the detail dialog names it (spec v7 §7.8, L80-07). Classic is the only mode
 * V7 ships (technical spec v1 §9); a mode the client does not know is shown raw rather than
 * hidden, so a future one is visible in the admin before it gets a label.
 */
export function gameModeLabel(mode: string): string {
  const labels: Record<string, string> = { classic: 'Classic' };
  return labels[mode] ?? mode;
}

/**
 * The Notes cell of a match, in the list and in the detail (L80-07): `Bots · Tutorial`, or `—`
 * when neither flag is set. One helper keeps the two surfaces on the same words.
 */
export function gameNotesLabel(game: { hasBots: boolean; isTutorial: boolean }): string {
  const notes: string[] = [];
  if (game.hasBots) {
    notes.push('Bots');
  }
  if (game.isTutorial) {
    notes.push('Tutorial');
  }
  return notes.length === 0 ? '—' : notes.join(' · ');
}

/**
 * Who eliminated a seat, by the nickname on that seat, or `null` when nobody did (an absence, a
 * leave, a gambling death) or the id matches no seat of this match (L80-07). `null` adds nothing
 * to the detail line, so an unresolved eliminator never prints a guess.
 */
export function eliminatorNickname(
  detail: AdminGameDetail,
  elimination: AdminGameElimination,
): string | null {
  if (elimination.eliminatorPlayerId === null) {
    return null;
  }
  const seat = detail.seats.find((candidate) => candidate.playerId === elimination.eliminatorPlayerId);
  return seat?.nickname ?? null;
}
