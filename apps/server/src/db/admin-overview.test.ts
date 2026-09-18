import { describe, expect, it, vi } from 'vitest';

import { loadAdminOverview } from './admin-overview';
import { parseAdminFinishedGameFilters } from './admin-filters';

function dispatch(sql: string): { rows: Record<string, unknown>[] } {
  if (sql.includes('overview_median_duration')) {
    return {
      rows: [
        {
          overview_game_count: '4',
          overview_human_only: '3',
          overview_with_bots: '1',
          overview_avg_duration: '120000',
          overview_median_duration: '90000',
          overview_avg_turns: '12.4',
          overview_avg_clock: '10000',
          overview_avg_occupancy: '3.5',
        },
      ],
    };
  }
  if (sql.includes('weighted_ms')) {
    return { rows: [{ weighted_ms: '240000', human_seats: '3' }] };
  }
  if (sql.includes('ORDER BY COUNT(*) DESC')) {
    return { rows: [{ kit_id: 'kamikaze', wins: '2' }] };
  }
  if (sql.includes('GROUP BY g.has_bots')) {
    return {
      rows: [
        { has_bots: false, game_count: '10', avg_duration: '180000' },
        { has_bots: true, game_count: '5', avg_duration: '60000' },
      ],
    };
  }
  if (sql.includes('occ.occ_n') && sql.includes('avg_duration')) {
    return {
      rows: [{ occupancy: '4', game_count: '4', avg_duration: '150000', avg_turns: '20' }],
    };
  }
  if (sql.includes("AT TIME ZONE 'UTC')::date")) {
    return { rows: [{ day: '2026-09-18', game_count: '4' }] };
  }
  if (sql.includes('EXTRACT(HOUR')) {
    return { rows: [{ hour: '9', game_count: '4' }] };
  }
  if (sql.includes('finished_game_eliminations e ON e.game_id') && sql.includes('GROUP BY e.reason')) {
    return { rows: [{ reason: 'combat', count: '3' }, { reason: 'leave', count: '1' }] };
  }
  if (sql.includes("e.reason = 'leave'")) {
    return {
      rows: [
        {
          occupancy: '4',
          game_count: '4',
          leave_games: '1',
          inactivity_games: '0',
        },
      ],
    };
  }
  if (sql.includes('b_1to5')) {
    return {
      rows: [
        {
          avg_lives: '8',
          b_1to5: '1',
          b_6to10: '3',
          b_11to15: '0',
          b_16plus: '0',
        },
      ],
    };
  }
  if (sql.includes('AS under5')) {
    return {
      rows: [{ under5: '1', from5to15: '2', from15to30: '1', over30: '0' }],
    };
  }
  if (sql.includes('overview_rematch_count')) {
    return { rows: [{ overview_game_count: '4', overview_rematch_count: '2' }] };
  }
  if (sql.includes('overview_nicknames')) {
    return { rows: [{ overview_nicknames: '5' }] };
  }
  if (sql.includes('GROUP BY kind')) {
    return { rows: [{ kind: 'bug', count: '3' }] };
  }
  if (sql.includes('FROM feedback_reports')) {
    return { rows: [{ count: '3' }] };
  }
  return { rows: [] };
}

describe('loadAdminOverview match-level series (L62-03)', () => {
  it('fills occupancy, hours, reasons, and rematch rate', async () => {
    const sql: string[] = [];
    const pool = {
      query: vi.fn((text: string) => {
        sql.push(text);
        return Promise.resolve(dispatch(text));
      }),
    };

    const overview = await loadAdminOverview(
      pool as never,
      parseAdminFinishedGameFilters({ bots: 'humans' }),
    );

    expect(overview.gameCount).toBe(4);
    expect(overview.general.medianDurationMs).toBe(90_000);
    expect(overview.general.avgClockMsPerTurn).toBe(10_000);
    expect(overview.general.gamesByOccupancy.find((row) => row.occupancy === 4)?.gameCount).toBe(
      4,
    );
    expect(overview.general.gamesByOccupancy).toHaveLength(7);
    expect(overview.general.durationByOpponentMix).toEqual([
      { hasBots: false, gameCount: 10, avgDurationMs: 180_000 },
      { hasBots: true, gameCount: 5, avgDurationMs: 60_000 },
    ]);
    expect(overview.volume.gamesByHourUtc).toHaveLength(24);
    expect(overview.volume.gamesByHourUtc[9]?.gameCount).toBe(4);
    expect(overview.endings.reasons.find((row) => row.reason === 'combat')?.count).toBe(3);
    expect(overview.endings.reasons.find((row) => row.reason === 'absence')?.count).toBe(0);
    expect(overview.retention.rematchRate).toBe(0.5);
    expect(overview.retention.distinctNicknames).toBe(5);
    expect(overview.feedbackPulse.reportsPerGame).toBe(0.75);
    expect(overview.feedbackCount).toBe(3);

    const mixSql = sql.find((text) => text.includes('GROUP BY g.has_bots'));
    expect(mixSql).toBeDefined();
    expect(mixSql).not.toContain('has_bots = false');
    expect(sql.some((text) => text.includes('is_tutorial = false'))).toBe(true);
  });

  it('excludes tutorials by default on an empty log', async () => {
    const sql: string[] = [];
    const pool = {
      query: vi.fn((text: string) => {
        sql.push(text);
        if (text.includes('overview_median_duration')) {
          return Promise.resolve({
            rows: [
              {
                overview_game_count: '0',
                overview_human_only: '0',
                overview_with_bots: '0',
                overview_avg_duration: null,
                overview_median_duration: null,
                overview_avg_turns: null,
                overview_avg_clock: null,
                overview_avg_occupancy: null,
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      }),
    };

    const overview = await loadAdminOverview(pool as never, parseAdminFinishedGameFilters({}));
    expect(overview.gameCount).toBe(0);
    expect(overview.retention.rematchRate).toBeNull();
    expect(overview.volume.gamesByHourUtc).toHaveLength(24);
    expect(sql.some((text) => text.includes('is_tutorial = false'))).toBe(true);
  });
});
