/**
 * Tutorial coach copy + send gate — L45-05 / technical spec v6 §5.4.
 */

import { describe, expect, it } from 'vitest';

import {
  resolveTutorialCoach,
  tutorialCardActionSpotlight,
  tutorialCoachTitle,
  tutorialEconomySpotlight,
  tutorialHighlightAt,
  tutorialPortraitSpotlight,
  tutorialSendAllowed,
  tutorialShopSpotlight,
  tutorialSpotlightInstanceIds,
  TUTORIAL_IDLE_PLAY_TITLE,
} from './tutorial-coach-copy';

describe('resolveTutorialCoach (L45-05)', () => {
  it('index 0 copy mentions Draw is points', () => {
    const coach = resolveTutorialCoach(0);
    expect(coach?.title).toBe('Draw');
    expect(coach?.body).toMatch(/points/i);
    expect(coach?.body).toMatch(/not a card/i);
  });

  it('index 1 and 21 Tax copy mention 4 points', () => {
    expect(resolveTutorialCoach(1)?.body).toMatch(/4 points/);
    expect(resolveTutorialCoach(21)?.body).toMatch(/4 points/);
  });

  it('index 3 copy mentions equal cancel', () => {
    const coach = resolveTutorialCoach(3);
    expect(coach?.body).toMatch(/[Ee]qual/);
    expect(coach?.body).toMatch(/cancel/i);
  });

  it('bot turns keep the last human coach', () => {
    expect(resolveTutorialCoach(2)?.title).toBe('Economy');
    expect(resolveTutorialCoach(4)?.title).toBe('Counter');
  });

  it('index 8 uses the portrait coach', () => {
    const coach = resolveTutorialCoach(8);
    expect(coach?.title).toBe('Look');
    expect(coach?.body).toMatch(/portrait/i);
    expect(tutorialHighlightAt(8)).toBe('opponent-portrait');
    expect(tutorialPortraitSpotlight(tutorialHighlightAt(8))).toBe(true);
  });

  it('idle retitles the coach Play', () => {
    const coach = resolveTutorialCoach(0);
    expect(coach).toBeDefined();
    if (coach === undefined) {
      return;
    }
    expect(tutorialCoachTitle(coach, false)).toBe('Draw');
    expect(tutorialCoachTitle(coach, true)).toBe(TUTORIAL_IDLE_PLAY_TITLE);
  });
});

describe('tutorialSendAllowed (L45-05)', () => {
  it('allows only Draw at index 0', () => {
    expect(tutorialSendAllowed(0, { kind: 'draw' })).toBe(true);
    expect(
      tutorialSendAllowed(0, { kind: 'playCard', cardId: 'tax', isUpgraded: false }),
    ).toBe(false);
  });

  it('allows base Tax at index 1 and 21, not an upgraded Basic', () => {
    expect(
      tutorialSendAllowed(1, { kind: 'playCard', cardId: 'tax', isUpgraded: false }),
    ).toBe(true);
    expect(
      tutorialSendAllowed(21, { kind: 'playCard', cardId: 'tax', isUpgraded: false }),
    ).toBe(true);
    expect(
      tutorialSendAllowed(1, {
        kind: 'playCard',
        cardId: 'basic-attack',
        isUpgraded: true,
      }),
    ).toBe(false);
  });

  it('rejects human sends on a bot index', () => {
    expect(tutorialSendAllowed(2, { kind: 'draw' })).toBe(false);
    expect(
      tutorialSendAllowed(2, {
        kind: 'playCard',
        cardId: 'basic-attack',
        isUpgraded: false,
      }),
    ).toBe(false);
  });

  it('never allows buying Basic', () => {
    for (const index of [0, 13, 15, 21]) {
      expect(tutorialSendAllowed(index, { kind: 'buyCard', cardId: 'basic-attack' })).toBe(
        false,
      );
    }
    expect(tutorialSendAllowed(15, { kind: 'buyCard', cardId: 'absorber' })).toBe(true);
  });

  it('allows unupgraded Basic at 3 and upgraded Basic at 25', () => {
    expect(
      tutorialSendAllowed(3, {
        kind: 'playCard',
        cardId: 'basic-attack',
        isUpgraded: false,
      }),
    ).toBe(true);
    expect(
      tutorialSendAllowed(3, {
        kind: 'playCard',
        cardId: 'basic-attack',
        isUpgraded: true,
      }),
    ).toBe(false);
    expect(
      tutorialSendAllowed(25, {
        kind: 'playCard',
        cardId: 'basic-attack',
        isUpgraded: true,
      }),
    ).toBe(true);
  });
});

describe('tutorial spotlights (L45-05)', () => {
  it('maps shop and card-dialog highlights', () => {
    expect(tutorialEconomySpotlight('draw', false)).toBe('draw');
    expect(tutorialEconomySpotlight('shop-absorber', false)).toBe('shop');
    expect(tutorialEconomySpotlight('shop-absorber', true)).toBeUndefined();
    expect(tutorialShopSpotlight('shop-upgrade-point')).toBe('upgrade-point');
    expect(tutorialShopSpotlight('shop-absorber')).toBe('absorber');
    expect(tutorialCardActionSpotlight('tax')).toBe('use');
    expect(tutorialCardActionSpotlight('upgrade-spy')).toBe('upgrade');
    expect(tutorialCardActionSpotlight('sell-shield')).toBe('sell');
  });

  it('picks the scripted hand instance', () => {
    const ids = tutorialSpotlightInstanceIds('tax', [
      { instanceId: 't1', cardId: 'tax', isUpgraded: false },
      { instanceId: 'b1', cardId: 'basic-attack', isUpgraded: false },
    ]);
    expect(ids).toEqual(['t1']);
  });
});
