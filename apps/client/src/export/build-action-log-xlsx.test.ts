/**
 * Excel action-log workbook builder — Lot 19.
 */

import type { GameExportLogView } from '@card-battle/shared';
import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import { buildActionLogWorkbook } from './build-action-log-xlsx';

describe('buildActionLogWorkbook (L19-03)', () => {
  it('produces Turns and Events sheets with before/after columns', async () => {
    const exportLog: GameExportLogView = {
      turns: [
        {
          turnSequence: 1,
          actorPlayerId: 'a',
          action: 'draw',
          before: [
            {
              playerId: 'a',
              nickname: 'Alice',
              kitId: 'assassin',
              lives: 10,
              points: 0,
              upgradePoints: 0,
              shield: 0,
              shieldIsUpgraded: false,
              isEliminated: false,
              hand: [],
              specialCards: [],
              pendingAttacks: [],
            },
            {
              playerId: 'b',
              nickname: 'Bob',
              kitId: 'kamikaze',
              lives: 10,
              points: 0,
              upgradePoints: 0,
              shield: 0,
              shieldIsUpgraded: false,
              isEliminated: false,
              hand: [{ instanceId: '1', cardId: 'basic-attack', isUpgraded: false }],
              specialCards: [],
              pendingAttacks: [],
            },
          ],
          after: [
            {
              playerId: 'a',
              nickname: 'Alice',
              kitId: 'assassin',
              lives: 10,
              points: 2,
              upgradePoints: 0,
              shield: 0,
              shieldIsUpgraded: false,
              isEliminated: false,
              hand: [],
              specialCards: [],
              pendingAttacks: [],
            },
            {
              playerId: 'b',
              nickname: 'Bob',
              kitId: 'kamikaze',
              lives: 10,
              points: 0,
              upgradePoints: 0,
              shield: 0,
              shieldIsUpgraded: false,
              isEliminated: false,
              hand: [{ instanceId: '1', cardId: 'basic-attack', isUpgraded: false }],
              specialCards: [],
              pendingAttacks: [],
            },
          ],
        },
      ],
      events: [
        {
          kind: 'actionPlayed',
          actorPlayerId: 'a',
          action: 'draw',
          turnSequence: 1,
        },
      ],
    };

    const buffer = await buildActionLogWorkbook(exportLog);
    expect(buffer.byteLength).toBeGreaterThan(100);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    expect(workbook.getWorksheet('Turns')).toBeDefined();
    expect(workbook.getWorksheet('Events')).toBeDefined();
    const turns = workbook.getWorksheet('Turns');
    expect(turns?.getRow(1).getCell(1).value).toBe('turnSequence');
    expect(turns?.rowCount).toBe(2);
  });
});
