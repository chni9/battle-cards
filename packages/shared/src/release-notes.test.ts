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

  it('puts Sentence, Imposition, and Super Absorber above the New additions', () => {
    const latest = latestReleaseNote();
    expect(latest.items.map((item) => item.cardId)).toEqual([
      'sentence',
      'imposition',
      'super-absorber',
    ]);
    const body = [
      latest.title,
      ...latest.items.map((item) => `${item.before}\n${item.after}`),
    ].join('\n');
    expect(body).toMatch(/Sentence/i);
    expect(body).toMatch(/20/);
    expect(body).toMatch(/3/);
    const sentence = latest.items.find((item) => item.cardId === 'sentence');
    expect(sentence?.before).toMatch(/instant/i);
    expect(sentence?.after).toMatch(/20/);
    expect(body).toMatch(/Imposition/i);
    expect(body).toMatch(/Super Absorber/i);
    expect(body).toMatch(/only absorbs lives/i);
    expect(body).toMatch(/no longer doubles/i);
    expect(body).not.toMatch(/Super Regeneration/i);
    expect(body).not.toMatch(/Superpowers/i);
    for (const item of latest.items) {
      expect(item.before.length).toBeGreaterThan(0);
      expect(item.after.length).toBeGreaterThan(0);
      expect(item.before).not.toBe(item.after);
    }
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
