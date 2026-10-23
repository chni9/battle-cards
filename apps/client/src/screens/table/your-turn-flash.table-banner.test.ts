/**
 * Table banner flash source — L51-06 / L63-03.
 * Your-turn-flash part, split from screens/table/table-banner.test.ts by owner lot (technical spec v7 §12.1, L72-02).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

describe('table banners (L51-06)', () => {
  it('enqueues seed cues synchronously so Strict Mode cannot drop them', () => {
    const flash = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'your-turn-flash.tsx'),
      'utf8',
    );
    expect(flash).toContain('setQueue((current) => [...current, ...cues])');
    expect(flash).toContain('Synchronous enqueue');
    expect(flash).not.toContain('setTimeout(() => {\n      setQueue((current) => [...current, ...cues])');
  });
});

describe('Sentence countdown banners (L63-03)', () => {
  it('locks the scary Sentence banner in the Motion flash', () => {
    const flash = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'your-turn-flash.tsx'),
      'utf8',
    );
    expect(flash).toContain('data-banner="sentence"');
    expect(flash).toContain('nextSentenceBannerLines');
    expect(flash).toContain('setSentenceQueue');
    expect(flash).toContain('data-banner="wipe"');
    expect(flash).toContain('nextWipeBannerLines');
  });
});
