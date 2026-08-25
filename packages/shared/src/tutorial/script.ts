/**
 * Tutorial script table — technical spec v6 §5.4 / designer 2026-08-25.
 * Coach copy lives here so the client does not invent strings; it is not sent on the wire.
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
      body: 'Draw gives **points**, not a card. Draw once.',
    },
  },
  {
    index: 1,
    actor: 'human',
    legalKind: 'play-tax',
    highlight: 'tax',
    coach: {
      title: 'Economy',
      body: 'Tax spends **1 life** (shield does not stop it) and gives **4 points**. Play Tax.',
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
      body: 'Incoming is delayed. Play Basic attack back at them. **Equal** damage cancels **both** attacks.',
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
      body: 'Spend **1 upgrade point** (the icon). Upgrade Spy.',
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
      body: 'Spy reveals their kit and cards **when it resolves on their turn**. Play Spy.',
    },
  },
  {
    index: 8,
    actor: 'bot',
    legalKind: 'bot-draw',
    highlight: 'opponent-portrait',
    coach: {
      title: 'Look',
      body: 'Spy resolved. **Click their portrait** to see kit and cards.',
    },
  },
  {
    index: 9,
    actor: 'human',
    legalKind: 'sell-shield',
    highlight: 'sell-shield',
    coach: {
      title: 'Sell',
      body: 'Selling yields the play cost in **points**. Sell one Shield.',
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
      body: 'Play Spy back at them. The same card aimed at the source **cancels both**.',
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
      title: 'Upgrade point',
      body: 'Open the Shop and **buy an upgrade point**.',
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
      body: 'Shop price is **double** the play cost. Buy Absorber.',
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
    legalKind: 'draw',
    highlight: 'draw',
    coach: {
      title: 'Incoming',
      body: 'Draw. After you act, their Strong hits — you will be at **1 life**.',
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
      title: 'Special',
      body: 'You have **1 life**. Play Super Regeneration (gain lives, cap 25). Specials are usually one use.',
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
      title: 'Make points',
      body: 'Thief took points. Tax again — Super Regeneration gave you lives to spend. **+4 points**.',
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
      body: 'Upgrade that Basic. It will deal **3**.',
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
      body: 'Play the upgraded Basic. They have 4 lives — this queues **3** damage.',
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
      body: 'Play Absorber on them. You gain the lives they **lost last turn**.',
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
      body: 'Play Basic+ back. **3** vs **2** cancels their Strong; yours stays and will finish them.',
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
