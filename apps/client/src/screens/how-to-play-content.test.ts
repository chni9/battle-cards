/**
 * How to play primer shape — technical spec v6 §5.1 / L42-01.
 */

import { describe, expect, it } from 'vitest';

import {
  HOW_TO_PLAY_SCREENSHOT_FILES,
  HOW_TO_PLAY_SECTIONS,
  HOW_TO_PLAY_SECTION_IDS,
} from './how-to-play-content';
import { howToPlayScreenshotUrl } from './how-to-play-screenshots';

describe('How to play content (technical spec v6 §5.1)', () => {
  it('lists sections in the spec order', () => {
    expect(HOW_TO_PLAY_SECTIONS.map((section) => section.id)).toEqual([
      ...HOW_TO_PLAY_SECTION_IDS,
    ]);
  });

  it('uses the designer screenshot filenames and no others', () => {
    expect(HOW_TO_PLAY_SCREENSHOT_FILES).toEqual({
      table: 'table-overview.png',
      delay: 'delayed-resolution.png',
      turn: 'one-action.png',
      resources: 'resources.png',
      hidden: 'hidden-kit.png',
      shop: 'shop.png',
    });
    expect(
      HOW_TO_PLAY_SECTIONS.filter((section) => section.screenshotFile !== null).map(
        (section) => section.screenshotFile,
      ),
    ).toEqual(Object.values(HOW_TO_PLAY_SCREENSHOT_FILES));
    expect(HOW_TO_PLAY_SECTIONS.find((section) => section.id === 'goal')?.screenshotFile).toBeNull();
    expect(HOW_TO_PLAY_SECTIONS.find((section) => section.id === 'modes')?.screenshotFile).toBeNull();
  });

  it('states every §5.1 must-say fact', () => {
    const byId = Object.fromEntries(HOW_TO_PLAY_SECTIONS.map((section) => [section.id, section]));
    expect(byId['goal']?.body).toMatch(/last player alive/i);
    expect(byId['goal']?.body).toMatch(/25/);
    expect(byId['table']?.body).toMatch(/dock/i);
    expect(byId['table']?.body).toMatch(/Spy/);
    expect(byId['table']?.body).toMatch(/Incoming/);
    expect(byId['delay']?.body).toMatch(/their next turn/i);
    expect(byId['delay']?.body).toMatch(/after they have acted/i);
    expect(byId['delay']?.body).toMatch(/never lose lives off-turn/i);
    expect(byId['turn']?.body).toMatch(/exactly one/i);
    expect(byId['turn']?.body).toMatch(/does not deal a card/i);
    expect(byId['resources']?.body).toMatch(/Lives/);
    expect(byId['resources']?.body).toMatch(/Upgrade points/);
    expect(byId['resources']?.body).toMatch(/never “UP”/);
    expect(byId['resources']?.body).toMatch(/Tax ignores/i);
    expect(byId['hidden']?.body).toMatch(/private/);
    expect(byId['hidden']?.body).toMatch(/action is public/i);
    expect(byId['shop']?.body).toMatch(/double its play cost/i);
    expect(byId['modes']?.body).toMatch(/Tutorial/);
    expect(byId['modes']?.body).toMatch(/6 seats/);
  });

  it('omits screenshot urls when designer files are absent', () => {
    for (const fileName of Object.values(HOW_TO_PLAY_SCREENSHOT_FILES)) {
      expect(howToPlayScreenshotUrl(fileName)).toBeNull();
    }
    expect(howToPlayScreenshotUrl('invented-placeholder.png')).toBeNull();
  });
});
