/**
 * Build a two-sheet .xlsx buffer from FinishedStateView.exportLog — Lot 19.
 */

import type { GameExportLogView } from '@card-battle/shared';
import ExcelJS from 'exceljs';

function cardsCell(
  cards: readonly { cardId: string; isUpgraded: boolean }[],
): string {
  return cards
    .map((card) => `${card.cardId}${card.isUpgraded ? '*' : ''}`)
    .join(', ');
}

function pendingCell(
  pending: readonly {
    cardId: string;
    isUpgraded: boolean;
    sourcePlayerId: string;
    damageMultiplier: number;
    redirectedBy: 'mirror' | 'super-mirror' | null;
  }[],
): string {
  return pending
    .map(
      (effect) => {
        const redirect =
          effect.redirectedBy === null ? '' : `→${effect.redirectedBy}`;
        return `${effect.cardId}${effect.isUpgraded ? '*' : ''}×${effect.damageMultiplier}←${effect.sourcePlayerId}${redirect}`;
      },
    )
    .join('; ');
}

function playerIds(exportLog: GameExportLogView): string[] {
  const first = exportLog.turns[0]?.before ?? exportLog.turns[0]?.after ?? [];
  return first.map((row) => row.playerId);
}

/** Pure builder — returns ArrayBuffer suitable for download. */
export async function buildActionLogWorkbook(
  exportLog: GameExportLogView,
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Card Battle';
  workbook.created = new Date();

  const turnsSheet = workbook.addWorksheet('Turns');
  const ids = playerIds(exportLog);

  const turnHeaders = [
    'turnSequence',
    'actorPlayerId',
    'action',
    'cardId',
    'isUpgraded',
    'targetPlayerId',
    'attacks',
  ];

  for (const playerId of ids) {
    for (const phase of ['before', 'after'] as const) {
      turnHeaders.push(
        `${playerId}_${phase}_lives`,
        `${playerId}_${phase}_points`,
        `${playerId}_${phase}_upgradePoints`,
        `${playerId}_${phase}_shield`,
        `${playerId}_${phase}_kit`,
        `${playerId}_${phase}_elim`,
        `${playerId}_${phase}_hand`,
        `${playerId}_${phase}_specials`,
        `${playerId}_${phase}_pending`,
      );
    }
  }

  turnsSheet.addRow(turnHeaders);

  for (const turn of exportLog.turns) {
    const row: (string | number | boolean)[] = [
      turn.turnSequence,
      turn.actorPlayerId,
      turn.action,
      turn.cardId ?? '',
      turn.isUpgraded ?? '',
      turn.targetPlayerId ?? '',
      turn.attacks !== undefined
        ? turn.attacks
            .map(
              (attack) =>
                `${attack.cardId}${attack.isUpgraded ? '*' : ''}→${attack.targetPlayerId}`,
            )
            .join('; ')
        : '',
    ];

    for (const playerId of ids) {
      for (const phase of ['before', 'after'] as const) {
        const snap = turn[phase].find((entry) => entry.playerId === playerId);
        row.push(
          snap?.lives ?? '',
          snap?.points ?? '',
          snap?.upgradePoints ?? '',
          snap?.shield ?? '',
          snap?.kitId ?? '',
          snap?.isEliminated ?? '',
          snap !== undefined ? cardsCell(snap.hand) : '',
          snap !== undefined ? cardsCell(snap.specialCards) : '',
          snap !== undefined ? pendingCell(snap.pendingAttacks) : '',
        );
      }
    }

    turnsSheet.addRow(row);
  }

  const eventsSheet = workbook.addWorksheet('Events');
  eventsSheet.addRow([
    'kind',
    'turnSequence',
    'actorPlayerId',
    'sourcePlayerId',
    'targetPlayerId',
    'cardId',
    'isUpgraded',
    'action',
    'outcome',
    'livesLost',
    'shieldAbsorbed',
    'playerId',
    'eliminatorPlayerId',
    'reason',
    'detail',
  ]);

  for (const event of exportLog.events) {
    switch (event.kind) {
      case 'actionPlayed':
        eventsSheet.addRow([
          event.kind,
          event.turnSequence,
          event.actorPlayerId,
          '',
          event.targetPlayerId ?? '',
          event.cardId ?? '',
          event.isUpgraded ?? '',
          event.action,
          '',
          '',
          '',
          '',
          '',
          '',
          event.attacks !== undefined
            ? JSON.stringify(event.attacks)
            : (event.botReason?.code ?? ''),
        ]);
        break;
      case 'actionResolved':
        eventsSheet.addRow([
          event.kind,
          event.turnSequence,
          '',
          event.sourcePlayerId,
          event.targetPlayerId,
          event.cardId,
          event.isUpgraded,
          '',
          event.outcome,
          event.livesLost,
          event.shieldAbsorbed,
          '',
          '',
          '',
          event.effectId,
        ]);
        break;
      case 'playerEliminated':
        eventsSheet.addRow([
          event.kind,
          event.turnSequence,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          event.playerId,
          event.eliminatorPlayerId ?? '',
          event.reason,
          '',
        ]);
        break;
      case 'mirrorRedirected':
        eventsSheet.addRow([
          event.kind,
          event.turnSequence,
          event.actorPlayerId,
          '',
          event.newTargetPlayerId,
          event.cardId,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          `from ${event.previousTargetPlayerId}`,
        ]);
        break;
      case 'curseTransferred':
        eventsSheet.addRow([
          event.kind,
          event.turnSequence,
          event.fromPlayerId,
          '',
          event.toPlayerId,
          event.cardId,
          event.isUpgraded,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          event.effectId,
        ]);
        break;
      case 'playerReanimated':
        eventsSheet.addRow([
          event.kind,
          event.turnSequence,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          event.playerId,
          '',
          '',
          event.kitId ?? '',
        ]);
        break;
      case 'rewardsClaimed':
        eventsSheet.addRow([
          event.kind,
          event.turnSequence,
          event.eliminatorPlayerId,
          '',
          event.eliminatedPlayerId,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          event.botReason?.code ?? '',
        ]);
        break;
      default: {
        const _exhaustive: never = event;
        void _exhaustive;
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer instanceof ArrayBuffer
    ? buffer
    : Uint8Array.from(buffer).buffer;
}

export function downloadWorkbookBuffer(
  buffer: ArrayBuffer,
  filename: string,
): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
