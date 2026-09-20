/**
 * Hub What’s new wiring — L63-07.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { latestReleaseNote, RELEASE_NOTES } from '@card-battle/shared';

const here = dirname(fileURLToPath(import.meta.url));

function read(rel: string): string {
  return readFileSync(join(here, rel), 'utf8');
}

describe('What’s new dialog (L63-07)', () => {
  it('renders the shared catalog newest first with a Latest marker', () => {
    const source = read('whats-new-dialog.tsx');
    expect(source).toContain('RELEASE_NOTES.map');
    expect(source).toContain('Latest');
    expect(source).toContain('Got it');
    expect(latestReleaseNote().id).toBe('lot-63');
    expect(RELEASE_NOTES.map((note) => note.id)[0]).toBe(latestReleaseNote().id);
  });

  it('wires a hub button, red dot, auto-popup after How to play, and the storage key', () => {
    const home = read('home.tsx');
    expect(home).toContain("What's new");
    expect(home).toContain('WhatsNewDialog');
    expect(home).toContain('hasUnseenReleaseNotes');
    expect(home).toContain('shouldAutoOpenWhatsNew');
    expect(home).toContain('hasSeenHowToPlay');
    expect(home).toContain('markLatestReleaseSeen');
    expect(home).toContain('data-whats-new-unread');
    expect(home).not.toContain('Super Regeneration');
  });
});
