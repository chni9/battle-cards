/**
 * Tutorial coach copy + send gate — L45-05 / technical spec v6 §5.4.
 */

import { describe, expect, it } from 'vitest';

import {
  isTutorialCoachOpen,
  parseCoachBody,
  resolveTutorialCoach,
  tutorialCardActionSpotlight,
  tutorialCoachMessageKey,
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

  it('reopens the chat when copy or index changes', () => {
    const coach = resolveTutorialCoach(0);
    expect(coach).toBeDefined();
    if (coach === undefined) {
      return;
    }
    const drawKey = tutorialCoachMessageKey(0, coach.title, coach.body);
    const idleKey = tutorialCoachMessageKey(
      0,
      tutorialCoachTitle(coach, true),
      coach.body,
    );
    expect(isTutorialCoachOpen(drawKey, null)).toBe(true);
    expect(isTutorialCoachOpen(drawKey, drawKey)).toBe(false);
    expect(isTutorialCoachOpen(idleKey, drawKey)).toBe(true);
    expect(isTutorialCoachOpen(null, drawKey)).toBe(false);
    const tax = resolveTutorialCoach(1);
    expect(tax).toBeDefined();
    if (tax === undefined) {
      return;
    }
    const taxKey = tutorialCoachMessageKey(1, tax.title, tax.body);
    expect(isTutorialCoachOpen(taxKey, drawKey)).toBe(true);
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

describe('parseCoachBody (technical spec v6 §5.4)', () => {
  it('turns Draw copy into a points icon token', () => {
    const parts = parseCoachBody('Draw gives **points**, not a card. Draw once.');
    expect(parts).toContainEqual({
      kind: 'resource',
      resource: 'point',
      amount: null,
      sign: '',
      word: 'points',
      bold: true,
    });
  });

  it('turns Tax copy into life, shield, and 4-point tokens', () => {
    const parts = parseCoachBody(
      'Tax spends **1 life** (shield does not stop it) and gives **4 points**. Play Tax.',
    );
    expect(parts).toContainEqual({
      kind: 'resource',
      resource: 'life',
      amount: 1,
      sign: '',
      word: 'life',
      bold: true,
    });
    expect(parts).toContainEqual({
      kind: 'resource',
      resource: 'shield',
      amount: null,
      sign: '',
      word: 'shield',
      bold: false,
    });
    expect(parts).toContainEqual({
      kind: 'resource',
      resource: 'point',
      amount: 4,
      sign: '',
      word: 'points',
      bold: true,
    });
  });

  it('keeps a + sign on the second Tax yield', () => {
    const parts = parseCoachBody(
      'Thief took points. Tax again — Super Regeneration gave you lives to spend. **+4 points**.',
    );
    expect(parts).toContainEqual({
      kind: 'resource',
      resource: 'point',
      amount: 4,
      sign: '+',
      word: 'points',
      bold: true,
    });
  });
});
