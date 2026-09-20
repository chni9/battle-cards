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
    const body = [latestReleaseNote().title, ...latestReleaseNote().items].join('\n');
    expect(body).toMatch(/Sentence/i);
    expect(body).toMatch(/20/);
    expect(body).toMatch(/Imposition/i);
    expect(body).toMatch(/points only/i);
    expect(body).toMatch(/pool/i);
    expect(body).not.toMatch(/Super Regeneration/i);
    expect(body).not.toMatch(/\+9/);
    expect(body).not.toMatch(/\+18/);
  });
});
