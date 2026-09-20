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

  it('renders a New section for additions with kit or card art', () => {
    const source = read('whats-new-dialog.tsx');
    expect(source).toContain('data-whats-new-section="new"');
    expect(source).toContain('>New<');
    expect(source).toContain('note.additions');
    expect(source).toContain('KitPortrait');
    expect(source).toContain('<Card');
    expect(latestReleaseNote().additions).toHaveLength(2);
  });

  it('wires a green New control, red unread badge, and auto-open when unseen', () => {
    const home = read('home.tsx');
    expect(home).toContain("What's new");
    expect(home).toContain('WhatsNewDialog');
    expect(home).toContain('hasUnseenReleaseNotes');
    expect(home).toContain('shouldAutoOpenWhatsNew');
    expect(home).toContain('markLatestReleaseSeen');
    expect(home).toContain('data-whats-new-unread');
    expect(home).toContain('data-whats-new-button');
    expect(home).toMatch(
      /<Button[\s\S]{0,400}data-whats-new-button[\s\S]{0,200}variant="green"|<Button[\s\S]{0,400}variant="green"[\s\S]{0,200}data-whats-new-button/,
    );
    expect(home).toContain('bg-cta-red');
    expect(home).not.toContain('bg-cta-green');
    expect(home).not.toContain('Super Regeneration');
  });

  it('keeps What’s new as a small top-right control, not a hub action-row block', () => {
    const home = read('home.tsx');
    const hubStart = home.indexOf('function HubView');
    const hub = hubStart === -1 ? '' : home.slice(hubStart);
    expect(hub).not.toContain('onOpenWhatsNew');
    expect(home).toContain('data-whats-new-button');
    expect(home).toMatch(/data-whats-new-button[\s\S]{0,400}absolute/);
  });
});
