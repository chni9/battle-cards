import { describe, expect, it } from 'vitest';

import {
  latestReleaseNote,
  RELEASE_NOTES,
  isReleaseNoteId,
} from './release-notes';

describe('release notes catalog (L64-06)', () => {
  it('lists newest first and keeps lot-64 as the latest id', () => {
    expect(RELEASE_NOTES.length).toBeGreaterThan(1);
    expect(latestReleaseNote().id).toBe('lot-64');
    expect(latestReleaseNote().date).toBe('2026-09-21');
    expect(isReleaseNoteId('lot-64')).toBe(true);
    expect(isReleaseNoteId('lot-63')).toBe(true);
    expect(RELEASE_NOTES.map((note) => note.id)[1]).toBe('lot-63');
  });

  it('covers Gambler start specials, weighted Draw, and the death-log line', () => {
    const latest = latestReleaseNote();
    expect(latest.title).toMatch(/Gambler/i);
    expect(latest.additions).toEqual([]);
    expect(latest.items.length).toBeGreaterThanOrEqual(2);
    expect(latest.items.every((item) => item.kitId === 'gambler')).toBe(true);
    const body = [
      latest.title,
      ...latest.items.map((item) => `${item.before}\n${item.after}`),
    ].join('\n');
    expect(body).toMatch(/5 random/i);
    expect(body).toMatch(/2 distinct/i);
    expect(body).toMatch(/Roulette/i);
    expect(body).toMatch(/Draw 10/i);
    expect(body).toMatch(/5–100|5-100/);
    expect(body).toMatch(/weighted/i);
    expect(body).toMatch(/dies by Gambling/);
    expect(body).toMatch(/1-in-10/);
    expect(body).not.toMatch(/Superpowers/i);
    for (const item of latest.items) {
      expect(item.before.length).toBeGreaterThan(0);
      expect(item.after.length).toBeGreaterThan(0);
      expect(item.before).not.toBe(item.after);
    }
  });

  it('keeps Lot 63 Sentence / Imposition / Super Absorber and New additions', () => {
    const lot63 = RELEASE_NOTES.find((note) => note.id === 'lot-63');
    expect(lot63).toBeDefined();
    expect(lot63?.items.map((item) => item.cardId)).toEqual([
      'sentence',
      'imposition',
      'super-absorber',
    ]);
    expect(lot63?.additions.map((item) => item.kind)).toEqual(['kit', 'card']);
    const gambler = lot63?.additions.find((item) => item.kind === 'kit');
    const roulette = lot63?.additions.find((item) => item.kind === 'card');
    expect(gambler?.kind === 'kit' ? gambler.kitId : undefined).toBe('gambler');
    expect(roulette?.kind === 'card' ? roulette.cardId : undefined).toBe('roulette');
  });
});
