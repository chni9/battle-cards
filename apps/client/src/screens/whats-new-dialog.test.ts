/**
 * What's new catalog pins (technical spec v7 §10.4; L63-07, L65-05). Every append to the open
 * entry updates the item count here; the dialog is rendered in whats-new-dialog.sheet.test.tsx (L76-05).
 */
import { latestReleaseNote, RELEASE_NOTES, releaseNotesForScope } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

describe("What's new catalog (L63-07, L65-05)", () => {
  it('keeps lot-72-v7 as the current update and dates the full log newest first', () => {
    expect(latestReleaseNote().id).toBe('lot-72-v7');
    expect(releaseNotesForScope('current').map((note) => note.id)).toEqual(['lot-72-v7']);
    expect(releaseNotesForScope('history').map((note) => note.date)).toEqual([
      '2026-10-26',
      '2026-10-07',
      '2026-10-06',
      '2026-10-05',
      '2026-09-29',
      '2026-09-28',
      '2026-09-20',
    ]);
    expect(RELEASE_NOTES.map((note) => note.id)[0]).toBe(latestReleaseNote().id);
  });

  it('pins the item and addition counts of each entry', () => {
    expect(latestReleaseNote().additions).toHaveLength(0);
    expect(latestReleaseNote().items).toHaveLength(12);
    const lot72 = RELEASE_NOTES.find((note) => note.id === 'lot-72');
    expect(lot72?.items).toHaveLength(3);
    const lot71 = RELEASE_NOTES.find((note) => note.id === 'lot-71');
    expect(lot71?.items).toHaveLength(5);
    const lot69 = RELEASE_NOTES.find((note) => note.id === 'lot-69');
    expect(lot69?.items).toHaveLength(4);
    const lot63 = RELEASE_NOTES.find((note) => note.id === 'lot-63');
    expect(lot63?.items.map((item) => item.cardId)).toEqual(['sentence', 'imposition', 'super-absorber']);
    expect(lot63?.additions).toHaveLength(2);
  });
});
