/**
 * Client-only tutorial board tour and Look gate — technical spec v6 §5.4 /
 * designer 2026-08-26.
 *
 * These steps are not engine actions and do not bump `tutorialIndex`.
 * Copy lives here so the client does not invent strings.
 */

import type { TutorialCoachCopy } from './script';

export type TutorialTourHighlight =
  | 'your-zone'
  | 'hand'
  | 'specials'
  | 'resources'
  | 'incoming'
  | 'shop'
  | 'opponent'
  | 'action-log'
  | 'timer'
  | 'kit'
  | 'flag';

export interface TutorialTourStep {
  readonly highlight: TutorialTourHighlight;
  readonly coach: TutorialCoachCopy;
}

/**
 * Spy queued at 7 resolves after the bot acts at this index.
 * Look is required only on the next human send (index 9 sell), not later.
 */
export const TUTORIAL_SPY_RESOLVE_INDEX = 8;

/** First human index after Spy resolves — the Look gate lives here only. */
export const TUTORIAL_LOOK_INDEX = TUTORIAL_SPY_RESOLVE_INDEX + 1;

export const TUTORIAL_LOOK_COACH: TutorialCoachCopy = {
  title: 'Look',
  body: 'Spy has resolved. You can now click the opponent to see their kit and cards. Click their portrait.',
};

export const TUTORIAL_TOUR_STEPS: readonly TutorialTourStep[] = [
  {
    highlight: 'your-zone',
    coach: {
      title: 'Your zone',
      body: 'This dock is **your zone**. Your kit, cards, Incoming, and resources live here.',
    },
  },
  {
    highlight: 'hand',
    coach: {
      title: 'Hand',
      body: 'These are the cards in your **hand**. Attack and action cards stay here after you play them.',
    },
  },
  {
    highlight: 'specials',
    coach: {
      title: 'Specials',
      body: '**Specials** sit in this row. They are usually one-use.',
    },
  },
  {
    highlight: 'resources',
    coach: {
      title: 'Resources',
      body: 'This row is your status: **lives**, shield, **points**, and **upgrade points**.',
    },
  },
  {
    highlight: 'incoming',
    coach: {
      title: 'Incoming',
      body: '**Incoming** shows delayed effects aimed at you. They wait until after you act. It is empty for now.',
    },
  },
  {
    highlight: 'shop',
    coach: {
      title: 'Shop',
      body: 'The **Shop** is where you spend **points** to buy cards and **upgrade points**. You will open it later.',
    },
  },
  {
    highlight: 'opponent',
    coach: {
      title: 'Opponent',
      body: 'That seat is your opponent. Their kit and cards stay hidden until Spy reveals them.',
    },
  },
  {
    highlight: 'action-log',
    coach: {
      title: 'Action log',
      body: 'The action log lists every public action this game.',
    },
  },
  {
    highlight: 'timer',
    coach: {
      title: 'Turn strip',
      body: 'This strip shows whose turn it is. The tutorial has no turn countdown.',
    },
  },
  {
    highlight: 'kit',
    coach: {
      title: 'Your kit',
      body: 'This portrait is your kit. Click it any time to reread what it does.',
    },
  },
  {
    highlight: 'flag',
    coach: {
      title: 'Leave',
      body: 'The red flag skips the tutorial and returns to the hub. That is not a forfeit.',
    },
  },
];

export function tutorialTourStepAt(step: number): TutorialTourStep | undefined {
  return TUTORIAL_TOUR_STEPS[step];
}

export function isTutorialTourActive(
  tutorialIndex: number | null,
  tourStep: number,
): boolean {
  return (
    tutorialIndex === 0 &&
    tourStep >= 0 &&
    tourStep < TUTORIAL_TOUR_STEPS.length
  );
}

export function isTutorialLookPending(
  tutorialIndex: number | null,
  portraitInspected: boolean,
): boolean {
  return tutorialIndex === TUTORIAL_LOOK_INDEX && !portraitInspected;
}
