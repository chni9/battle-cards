/**
 * How to play primer shape — technical spec v6 §5.1 / L51-02.
 */

import { describe, expect, it } from 'vitest';

import {
  HOW_TO_PLAY_SCREENSHOT_FILES,
  HOW_TO_PLAY_SECTIONS,
  HOW_TO_PLAY_SECTION_IDS,
} from './how-to-play-content';
import { howToPlayScreenshotUrl } from './how-to-play-screenshots';

describe('How to play content (technical spec v6 §5.1 / L51-02)', () => {
  it('lists sections in the spec order', () => {
    expect(HOW_TO_PLAY_SECTIONS.map((section) => section.id)).toEqual([
      ...HOW_TO_PLAY_SECTION_IDS,
    ]);
  });

  it('uses the designer screenshot filenames and no others', () => {
    expect(HOW_TO_PLAY_SCREENSHOT_FILES).toEqual({
      turn: 'one-action.png',
      lives: 'resources.png',
      kits: 'hidden-kit.png',
      shop: 'shop.png',
    });
    expect(
      HOW_TO_PLAY_SECTIONS.filter((section) => section.screenshotFile !== null).map(
        (section) => section.screenshotFile,
      ),
    ).toEqual(Object.values(HOW_TO_PLAY_SCREENSHOT_FILES));
    expect(HOW_TO_PLAY_SECTIONS.find((section) => section.id === 'goal')?.screenshotFile).toBeNull();
    expect(HOW_TO_PLAY_SECTIONS.find((section) => section.id === 'points')?.screenshotFile).toBeNull();
    expect(HOW_TO_PLAY_SECTIONS.find((section) => section.id === 'cards')?.screenshotFile).toBeNull();
    expect(HOW_TO_PLAY_SECTIONS.find((section) => section.id === 'upgrade')?.screenshotFile).toBeNull();
    expect(HOW_TO_PLAY_SECTIONS.find((section) => section.id === 'specials')?.screenshotFile).toBeNull();
  });

  it('states every §5.1 must-say fact', () => {
    const byId = Object.fromEntries(HOW_TO_PLAY_SECTIONS.map((section) => [section.id, section]));
    expect(byId['goal']?.body).toMatch(/last player alive/i);
    expect(byId['goal']?.body).toMatch(/25/);
    expect(byId['goal']?.body).toMatch(/2 to 4/);
    expect(byId['turn']?.body).toMatch(/exactly one action/i);
    expect(byId['turn']?.body).toMatch(/Draw/);
    expect(byId['lives']?.body).toMatch(/0 lives/i);
    expect(byId['lives']?.body).toMatch(/shield/i);
    expect(byId['points']?.body).toMatch(/almost every action/i);
    expect(byId['points']?.body).toMatch(/Draw gives you points/i);
    expect(byId['cards']?.body).toMatch(/attack cards and action cards/i);
    expect(byId['upgrade']?.body).toMatch(/1 upgrade point/);
    expect(byId['kits']?.body).toMatch(/Spy/);
    expect(byId['kits']?.body).toMatch(/Random/);
    expect(byId['specials']?.body).toMatch(/one use/);
    expect(byId['shop']?.body).toMatch(/buy extra cards or upgrade points/i);
  });

  it('omits delayed resolution, shop-price formula, and draw-is-not-a-card', () => {
    const joined = HOW_TO_PLAY_SECTIONS.map((section) => section.body).join('\n');
    expect(joined).not.toMatch(/delayed/i);
    expect(joined).not.toMatch(/double/i);
    expect(joined).not.toMatch(/not a card/i);
    expect(joined).not.toMatch(/does not deal a card/i);
    expect(joined).not.toMatch(/\(the icon\)/i);
    expect(joined).not.toMatch(/usually/i);
    expect(joined).not.toMatch(/shared card/i);
  });

  it('omits screenshot urls when designer files are absent', () => {
    for (const fileName of Object.values(HOW_TO_PLAY_SCREENSHOT_FILES)) {
      expect(howToPlayScreenshotUrl(fileName)).toBeNull();
    }
    expect(howToPlayScreenshotUrl('invented-placeholder.png')).toBeNull();
  });
});
