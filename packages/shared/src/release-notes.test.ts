import { describe, expect, it } from 'vitest';

import {
  latestReleaseNote,
  RELEASE_NOTES,
  isReleaseNoteId,
} from './release-notes';

describe('release notes catalog (L63-07)', () => {
  it('lists newest first and keeps lot-63 as the latest id', () => {
    expect(RELEASE_NOTES.length).toBeGreaterThan(0);
    expect(latestReleaseNote().id).toBe('lot-63');
    expect(latestReleaseNote().date).toBe('2026-09-20');
    expect(isReleaseNoteId('lot-63')).toBe(true);
    expect(isReleaseNoteId('lot-62')).toBe(false);
  });

  it('covers this lot’s visible changes and omits Super Regeneration', () => {
    const latest = latestReleaseNote();
    const body = [
      latest.title,
      ...latest.items.map((item) => `${item.before}\n${item.after}`),
    ].join('\n');
    expect(latest.items.map((item) => item.cardId)).toEqual([
      'sentence',
      'imposition',
      'super-absorber',
    ]);
    expect(body).toMatch(/Sentence/i);
    expect(body).toMatch(/20/);
    expect(body).toMatch(/3/);
    expect(body).toMatch(/Imposition/i);
    expect(body).toMatch(/Super Absorber/i);
    expect(body).toMatch(/only absorbs lives/i);
    expect(body).toMatch(/no longer doubles/i);
    expect(body).not.toMatch(/Super Regeneration/i);
    expect(body).not.toMatch(/\+9/);
    expect(body).not.toMatch(/\+18/);
    expect(body).not.toMatch(/Superpowers/i);
    expect(body).not.toMatch(/banner/i);
    expect(body).not.toMatch(/button/i);
    expect(body).not.toMatch(/this play counts/i);
    for (const item of latest.items) {
      expect(item.before.length).toBeGreaterThan(0);
      expect(item.after.length).toBeGreaterThan(0);
      expect(item.before).not.toBe(item.after);
    }
  });
});
