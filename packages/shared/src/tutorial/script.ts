/**
 * Tutorial script table — technical spec v6 §5.4 / designer 2026-08-25.
 * Coach copy lives here so the client does not invent strings; it is not sent on the wire.
 * Player-facing sentences are full English (not compressed chat style).
 */

export const TUTORIAL_LAST_INDEX = 30;

export type TutorialActor = 'human' | 'bot';

export type TutorialHighlight =
  | 'draw'
  | 'tax'
  | 'basic'
  | 'upgrade-spy'
  | 'spy'
  | 'opponent-portrait'
  | 'sell-shield'
  | 'shop-upgrade-point'
  | 'shop-absorber'
  | 'shield'
  | 'super-regeneration'
  | 'upgrade-basic'
  | 'absorber'
  | null;

export type TutorialLegalKind =
  | 'draw'
  | 'play-tax'
  | 'play-basic'
  | 'play-basic-upgraded'
  | 'upgrade-spy'
  | 'play-spy'
  | 'sell-shield'
  | 'buy-upgrade-point'
  | 'buy-absorber'
  | 'play-shield'
  | 'play-super-regeneration'
  | 'upgrade-basic'
  | 'play-absorber'
  | 'bot-draw'
  | 'bot-play-basic'
  | 'bot-play-spy'
  | 'bot-play-strong'
  | 'bot-play-thief';

export interface TutorialCoachCopy {
  readonly title: string;
  readonly body: string;
}

export interface TutorialStep {
  readonly index: number;
  readonly actor: TutorialActor;
  readonly legalKind: TutorialLegalKind;
  readonly highlight: TutorialHighlight;
  readonly coach: TutorialCoachCopy | null;
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    index: 0,
    actor: 'human',
    legalKind: 'draw',
    highlight: 'draw',
    coach: {
      title: 'Draw',
      body: 'Your **points** are what you spend to play many cards and to buy things in the Shop. Draw gives **points**, not a card. Draw once.',
    },
  },
  {
    index: 1,
    actor: 'human',
    legalKind: 'play-tax',
    highlight: 'tax',
    coach: {
      title: 'Tax',
      body: 'Your **lives** are your health. If they reach 0, you are eliminated. Tax spends **1 life** (a Shield does not stop that) and gives you **4 points**. Play Tax.',
    },
  },
  {
    index: 2,
    actor: 'bot',
    legalKind: 'bot-play-basic',
    highlight: null,
    coach: null,
  },
  {
    index: 3,
    actor: 'human',
    legalKind: 'play-basic',
    highlight: 'basic',
    coach: {
      title: 'Counter',
      body: 'Incoming is the delayed effects aimed at you. They wait until after you play your own action, so you can still react. A Basic attack is incoming now — that is the red highlight. Play your Basic attack back at them. **Equal** damage cancels **both** attacks.',
    },
  },
  {
    index: 4,
    actor: 'bot',
    legalKind: 'bot-draw',
    highlight: null,
    coach: null,
  },
  {
    index: 5,
    actor: 'human',
    legalKind: 'upgrade-spy',
    highlight: 'upgrade-spy',
    coach: {
      title: 'Upgrade',
      body: 'An **upgrade point** upgrades one card you already hold, making it stronger. Spend **1 upgrade point** on Spy.',
    },
  },
  {
    index: 6,
    actor: 'bot',
    legalKind: 'bot-draw',
    highlight: null,
    coach: null,
  },
  {
    index: 7,
    actor: 'human',
    legalKind: 'play-spy',
    highlight: 'spy',
    coach: {
      title: 'Spy',
      body: 'Spy reveals their kit and the cards they hold when it resolves on their next turn — not instantly. Play Spy.',
    },
  },
  {
    index: 8,
    actor: 'bot',
    legalKind: 'bot-draw',
    highlight: 'opponent-portrait',
    coach: {
      title: 'Look',
      body: 'Spy resolved. **Click their portrait** to see their kit and cards.',
    },
  },
  {
    index: 9,
    actor: 'human',
    legalKind: 'sell-shield',
    highlight: 'sell-shield',
    coach: {
      title: 'Sell',
      body: 'Your cards sit in your hand, not in a separate deck. Selling a card **removes it from your hand** and gives you its play cost back in **points**. Sell **one** Shield and keep the other.',
    },
  },
  {
    index: 10,
    actor: 'bot',
    legalKind: 'bot-play-spy',
    highlight: null,
    coach: null,
  },
  {
    index: 11,
    actor: 'human',
    legalKind: 'play-spy',
    highlight: 'spy',
    coach: {
      title: 'Counter Spy',
      body: 'A Spy is incoming now — that is the red highlight. Play Spy back at them. The same card aimed at the source **cancels both**.',
    },
  },
  {
    index: 12,
    actor: 'bot',
    legalKind: 'bot-draw',
    highlight: null,
    coach: null,
  },
  {
    index: 13,
    actor: 'human',
    legalKind: 'buy-upgrade-point',
    highlight: 'shop-upgrade-point',
    coach: {
      title: 'Shop',
      body: 'Open the Shop. Buying an **upgrade point** spends **points** and gives you another **upgrade point** you can later spend to upgrade a card you hold.',
    },
  },
  {
    index: 14,
    actor: 'bot',
    legalKind: 'bot-draw',
    highlight: null,
    coach: null,
  },
  {
    index: 15,
    actor: 'human',
    legalKind: 'buy-absorber',
    highlight: 'shop-absorber',
    coach: {
      title: 'Buy',
      body: 'Buying a card spends its Shop price — **double** the play cost — and puts that card into your hand. Buy Absorber. Never buy Basic: attack cards stay in your hand after you play them, so you already have the one you need.',
    },
  },
  {
    index: 16,
    actor: 'bot',
    legalKind: 'bot-play-strong',
    highlight: null,
    coach: null,
  },
  {
    index: 17,
    actor: 'human',
    legalKind: 'play-shield',
    highlight: 'shield',
    coach: {
      title: 'Shield',
      body: 'A Strong attack is incoming now — that is the red highlight. **Shield** stops **attack** damage; it does not stop Tax. Play your remaining Shield. After you act, their Strong resolves and the Shield absorbs it.',
    },
  },
  {
    index: 18,
    actor: 'bot',
    legalKind: 'bot-play-thief',
    highlight: null,
    coach: null,
  },
  {
    index: 19,
    actor: 'human',
    legalKind: 'play-super-regeneration',
    highlight: 'super-regeneration',
    coach: {
      title: 'Thief',
      body: 'A Thief is incoming now — that is the red highlight. When it resolves after you act, it steals **points** from you. You have **1 life**. Play Super Regeneration to restore **lives** (the cap is 25). Specials are usually one-use.',
    },
  },
  {
    index: 20,
    actor: 'bot',
    legalKind: 'bot-draw',
    highlight: null,
    coach: null,
  },
  {
    index: 21,
    actor: 'human',
    legalKind: 'play-tax',
    highlight: 'tax',
    coach: {
      title: 'Tax',
      body: 'Thief took some of your **points**. Tax again — Super Regeneration gave you **lives** to spend. **+4 points**.',
    },
  },
  {
    index: 22,
    actor: 'bot',
    legalKind: 'bot-draw',
    highlight: null,
    coach: null,
  },
  {
    index: 23,
    actor: 'human',
    legalKind: 'upgrade-basic',
    highlight: 'upgrade-basic',
    coach: {
      title: 'Upgrade',
      body: 'Upgrade that Basic. An upgraded Basic deals **3** damage instead of 1.',
    },
  },
  {
    index: 24,
    actor: 'bot',
    legalKind: 'bot-draw',
    highlight: null,
    coach: null,
  },
  {
    index: 25,
    actor: 'human',
    legalKind: 'play-basic-upgraded',
    highlight: 'basic',
    coach: {
      title: 'Attack',
      body: 'Play the upgraded Basic. They have 4 lives — this queues **3** damage, which will resolve on their turn.',
    },
  },
  {
    index: 26,
    actor: 'bot',
    legalKind: 'bot-draw',
    highlight: null,
    coach: null,
  },
  {
    index: 27,
    actor: 'human',
    legalKind: 'play-absorber',
    highlight: 'absorber',
    coach: {
      title: 'Absorber',
      body: 'Play Absorber on them. You immediately gain the **lives** they **lost last turn**.',
    },
  },
  {
    index: 28,
    actor: 'bot',
    legalKind: 'bot-play-strong',
    highlight: null,
    coach: null,
  },
  {
    index: 29,
    actor: 'human',
    legalKind: 'play-basic-upgraded',
    highlight: 'basic',
    coach: {
      title: 'Finish',
      body: 'Play your upgraded Basic back. **3** versus **2** cancels their weaker Strong; yours stays pending and will finish them on their turn.',
    },
  },
  {
    index: 30,
    actor: 'bot',
    legalKind: 'bot-draw',
    highlight: null,
    coach: null,
  },
] as const satisfies readonly TutorialStep[];

export function tutorialStepAt(index: number): TutorialStep | undefined {
  return TUTORIAL_STEPS.find((step) => step.index === index);
}
