import { describe, expect, it, vi } from 'vitest';

import { isFinishedGameId, loadAdminGameDetail } from './admin-game-detail';

const OLDER_ID = '11111111-1111-4111-8111-111111111111';

describe('loadAdminGameDetail (Lot 61)', () => {
  it('accepts finished_games uuid text and rejects room codes', () => {
    expect(isFinishedGameId(OLDER_ID)).toBe(true);
    expect(isFinishedGameId('ABCDEF')).toBe(false);
    expect(isFinishedGameId('')).toBe(false);
  });

  it('looks up by finished_games.id, not newest room_id', async () => {
    const query = vi.fn((sql: string, params: unknown[]) => {
      if (sql.includes('FROM finished_games') && sql.includes('seed')) {
        expect(sql).toContain('WHERE id = $1');
        expect(sql).not.toContain('WHERE room_id');
        expect(params[0]).toBe(OLDER_ID);
        return Promise.resolve({
          rows: [
            {
              id: OLDER_ID,
              room_id: 'ABCDEF',
              mode: 'classic',
              seed: 'older-seed',
              winner_player_id: 'p1',
              turn_sequence: 3,
              started_at: new Date('2026-01-01T00:00:00.000Z'),
              ended_at: new Date('2026-01-01T00:10:00.000Z'),
              duration_ms: 600_000,
              has_bots: false,
              is_tutorial: false,
              export_log: null,
            },
          ],
        });
      }
      if (sql.includes('finished_game_players')) {
        expect(params[0]).toBe(OLDER_ID);
        return Promise.resolve({
          rows: [
            {
              player_id: 'p1',
              seat_index: 0,
              nickname: 'Ada',
              kit_id: 'kamikaze',
              lives: 5,
              points: 1,
              is_winner: true,
              is_eliminated: false,
              is_bot: false,
            },
          ],
        });
      }
      if (sql.includes('finished_game_eliminations')) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const detail = await loadAdminGameDetail({ query } as never, OLDER_ID);
    expect(detail).not.toBeNull();
    expect(detail?.id).toBe(OLDER_ID);
    expect(detail?.roomId).toBe('ABCDEF');
    expect(detail?.seed).toBe('older-seed');
  });
});
