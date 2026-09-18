import { describe, expect, it, vi } from 'vitest';

import { loadAdminOverview } from './admin-overview';
import { overviewAttackCardIdSql } from './admin-overview-actors';
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

describe('loadAdminOverview actor-level series (L62-04)', () => {
  function actorDispatch(sql: string): { rows: Record<string, unknown>[] } {
    if (sql.includes('overview_actor_actions')) {
      return { rows: [{ action: 'draw', n: '4' }, { action: 'buyCard', n: '2' }] };
    }
    if (sql.includes('overview_actor_kit_sample')) {
      return { rows: [{ count: '3' }] };
    }
    if (sql.includes('overview_actor_kits')) {
      return { rows: [{ kit_id: 'kamikaze', picks: '4', wins: '2' }] };
    }
    if (sql.includes('overview_cards_played_by_id')) {
      return {
        rows: [
          { card_id: 'spy', played: '3' },
          { card_id: 'basic-attack', played: '5' },
        ],
      };
    }
    if (sql.includes('overview_actor_seats')) {
      return {
        rows: [
          {
            actor_seats: '4',
            think_seats: '2',
            avg_think: '8000',
            p50_think: '7000',
            p90_think: '12000',
            sum_think: '16000',
            think_actions: '8',
            avg_lives: '9.2',
            avg_points: '4',
            avg_upgrade_points: '1',
            avg_buy: '2.4',
            avg_sell: '0.5',
            avg_upgrade: '1',
            avg_cards: '6',
          },
        ],
      };
    }
    if (sql.includes('overview_upgraded_plays')) {
      return { rows: [{ play_or_multi: '10', upgraded_plays: '4' }] };
    }
    if (sql.includes('overview_attack_lives_lost')) {
      return {
        rows: [
          {
            lives_lost: '12',
            shield: '3',
            non_attack: '6',
            o_applied: '5',
            o_immune: '1',
            o_cancelled: '0',
            o_blocked: '2',
          },
        ],
      };
    }
    if (sql.includes('overview_hidden_tools')) {
      return {
        rows: [{ spy_plays: '2', thief_plays: '1', unspy: '3', mirror_redirects: '4' }],
      };
    }
    if (sql.includes('overview_persistents')) {
      return {
        rows: [{ card_id: 'invisibility', plays: '2', deacts: '1' }],
      };
    }
    if (sql.includes('overview_mixed_human_wins')) {
      return { rows: [{ mixed_games: '4', human_wins: '1' }] };
    }
    if (sql.includes('overview_bot_difficulty')) {
      return { rows: [{ difficulty: 'normal', game_count: '3', wins: '2' }] };
    }
    if (sql.includes('overview_seat_wins')) {
      return { rows: [{ seat_index: '0', wins: '2', game_count: '4' }] };
    }
    return dispatch(sql);
  }

  it('filters mixed-game seats by actors=humans and keeps match mix open', async () => {
    const sql: string[] = [];
    const pool = {
      query: vi.fn((text: string) => {
        sql.push(text);
        return Promise.resolve(actorDispatch(text));
      }),
    };

    const overview = await loadAdminOverview(
      pool as never,
      parseAdminFinishedGameFilters({ actors: 'humans' }),
    );

    const actionsSql = sql.find((text) => text.includes('overview_actor_actions'));
    expect(actionsSql).toContain('p.is_bot = false');
    expect(actionsSql).not.toContain('has_bots = false');
    expect(actionsSql).not.toContain('has_bots = true');

    const cardsSql = sql.find((text) => text.includes('overview_cards_played_by_id'));
    expect(cardsSql).toContain('p.is_bot = false');

    expect(overview.gameplay.actions.find((row) => row.action === 'draw')?.count).toBe(4);
    expect(overview.gameplay.drawShare).toBe(4 / 6);
    expect(overview.gameplay.kitSampleGames).toBe(3);
    expect(overview.gameplay.kits[0]).toEqual({
      kitId: 'kamikaze',
      picks: 4,
      wins: 2,
      pickRate: 1,
      winRate: 0.5,
    });
    expect(overview.gameplay.thinkTimePartial).toBe(true);
    expect(overview.gameplay.thinkTimePerActionMs).toBe(2000);
    expect(overview.economy.shopMix.find((row) => row.action === 'buyCard')?.count).toBe(2);
    expect(overview.economy.upgradedPlayShare).toBe(0.4);
    expect(overview.hidden.unspyCount).toBe(3);
    expect(overview.botsSeats.humanWinRateInMixed).toBe(0.25);
    expect(overview.botsSeats.seatWinShare).toHaveLength(8);
  });

  it('does not treat Tax / Suicide / Imposition as attack damage', async () => {
    const sql: string[] = [];
    const pool = {
      query: vi.fn((text: string) => {
        sql.push(text);
        return Promise.resolve(actorDispatch(text));
      }),
    };

    const overview = await loadAdminOverview(pool as never, parseAdminFinishedGameFilters({}));
    const combatSql = sql.find((text) => text.includes('overview_attack_lives_lost'));
    expect(combatSql).toBeDefined();
    expect(overviewAttackCardIdSql()).toBe(
      "'basic-attack', 'strong-attack', 'super-attack', 'mega-attack'",
    );
    expect(combatSql).toContain(overviewAttackCardIdSql());
    expect(overviewAttackCardIdSql()).not.toContain('tax');
    expect(overviewAttackCardIdSql()).not.toContain('suicide');
    expect(overviewAttackCardIdSql()).not.toContain('imposition');
    expect(overview.combat.livesLost).toBe(12);
    expect(overview.combat.nonAttackLivesLost).toBe(6);
    expect(overview.combat.outcomes.find((row) => row.outcome === 'blocked')?.count).toBe(2);

    const bothActions = sql.find((text) => text.includes('overview_actor_actions'));
    expect(bothActions).not.toContain('is_bot');
  });
});
