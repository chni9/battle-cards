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

  it('puts Gambler and Factory in the New additions section', () => {
    const latest = latestReleaseNote();
    expect(latest.title).toMatch(/Gambler/i);
    expect(latest.title).toMatch(/Factory/i);
    expect(latest.additions.map((item) => item.kind)).toEqual(['kit', 'card']);
    const gambler = latest.additions.find((item) => item.kind === 'kit');
    const factory = latest.additions.find((item) => item.kind === 'card');
    expect(gambler?.kind === 'kit' ? gambler.kitId : undefined).toBe('gambler');
    expect(factory?.kind === 'card' ? factory.cardId : undefined).toBe('factory');
    const body = latest.additions.map((item) => item.body).join('\n');
    expect(body).toMatch(/1-in-10/);
    expect(body).toMatch(/Draw 10/);
    expect(body).toMatch(/10 points/);
    expect(body).toMatch(/2 card lives/);
    expect(body).not.toMatch(/Superpowers/i);
    for (const item of latest.additions) {
      expect(item.body.length).toBeGreaterThan(0);
    }
  });
});
