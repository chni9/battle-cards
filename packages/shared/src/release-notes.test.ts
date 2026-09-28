import { describe, expect, it } from 'vitest';

import {
  latestReleaseNote,
  RELEASE_NOTES,
  isReleaseNoteId,
  releaseNotesForScope,
} from './release-notes';

describe('release notes catalog (L63-07 / L65-05)', () => {
  it('lists newest first and keeps lot-65 as the open update', () => {
    expect(RELEASE_NOTES.length).toBeGreaterThan(0);
    expect(latestReleaseNote().id).toBe('lot-65');
    expect(latestReleaseNote().date).toBe('2026-09-28');
    expect(isReleaseNoteId('lot-63')).toBe(true);
    expect(isReleaseNoteId('lot-65')).toBe(true);
    expect(isReleaseNoteId('lot-64')).toBe(false);
    expect(RELEASE_NOTES.some((note) => note.id === 'lot-64')).toBe(false);
    expect(RELEASE_NOTES.map((note) => note.date)).toEqual(['2026-09-28', '2026-09-20']);
  });

  it('shows only the current update in the auto popup and every date on New', () => {
    expect(releaseNotesForScope('current').map((note) => note.id)).toEqual(['lot-65']);
    expect(releaseNotesForScope('history').map((note) => note.id)).toEqual([
      'lot-65',
      'lot-63',
    ]);
  });

  it('writes the Lot 65 fixes on the open update, not on lot-63', () => {
    const latest = latestReleaseNote();
    expect(latest.additions).toEqual([]);
    expect(latest.items.length).toBeGreaterThanOrEqual(4);
    const text = latest.items.map((item) => `${item.before} ${item.after}`).join('\n');
    expect(text).toMatch(/one point/);
    expect(text).toMatch(/Gambler/);
    expect(text).toMatch(/invisible/i);
    expect(text).toMatch(/Sentence/);
    expect(text).toMatch(/Hand and Specials/);
    expect(text).toMatch(/lost everything|1 life/);
    expect(text).not.toMatch(/Dying by Gambling/);
    expect(text).not.toMatch(/5–100|5-100/);
  });

  it('writes Gambler and Roulette as current truth on the original lot-63 entry', () => {
    const latest = RELEASE_NOTES.find((note) => note.id === 'lot-63');
    expect(latest).toBeDefined();
    if (latest === undefined) {
      return;
    }
    expect(latest.title).toMatch(/Gambler/i);
    expect(latest.additions).toHaveLength(2);
    expect(latest.items.map((item) => item.cardId)).toEqual([
      'sentence',
      'imposition',
      'super-absorber',
    ]);
    const gambler = latest.additions.find((item) => item.kind === 'kit');
    const roulette = latest.additions.find((item) => item.kind === 'card');
    expect(gambler?.kind === 'kit' ? gambler.kitId : undefined).toBe('gambler');
    expect(roulette?.kind === 'card' ? roulette.cardId : undefined).toBe('roulette');
    const additionBody = latest.additions.map((item) => item.body).join('\n');
    expect(additionBody).toMatch(/2 distinct/i);
    expect(additionBody).toMatch(/Roulette/i);
    expect(additionBody).toMatch(/3 specials/i);
    expect(additionBody).toMatch(/5–100|5-100/);
    expect(additionBody).toMatch(/weighted|geometric/i);
    expect(additionBody).toMatch(/1-in-10/);
    expect(additionBody).toMatch(/dies by Gambling/);
    expect(additionBody).toMatch(/only a normal|only a shared|never a special/i);
    expect(additionBody).toMatch(/80%/);
    expect(additionBody).toMatch(/20%/);
    expect(additionBody).toMatch(/10%/);
    expect(additionBody).not.toMatch(/round 1|round-1|first round|immun/i);
    expect(additionBody).not.toMatch(/70\/30|30% chance/i);
    expect(additionBody).not.toMatch(/5 random/i);
    expect(additionBody).not.toMatch(/Superpowers/i);
    for (const item of latest.items) {
      expect(item.before.length).toBeGreaterThan(0);
      expect(item.after.length).toBeGreaterThan(0);
      expect(item.before).not.toBe(item.after);
    }
  });
});
