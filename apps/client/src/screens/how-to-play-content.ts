/**
 * How to play primer copy — technical spec v6 §5.1.
 * Must-say floor only; screenshot filenames are designer-owned.
 */

export const HOW_TO_PLAY_SECTION_IDS = [
  'goal',
  'table',
  'delay',
  'turn',
  'resources',
  'hidden',
  'shop',
  'modes',
] as const;

export type HowToPlaySectionId = (typeof HOW_TO_PLAY_SECTION_IDS)[number];

export interface HowToPlaySection {
  id: HowToPlaySectionId;
  title: string;
  body: string;
  /** Exact filename under `assets/how-to-play/`; omit `<img>` when missing. */
  screenshotFile: string | null;
}

/** Spec §5.1 screenshot files — agents never invent additional names. */
export const HOW_TO_PLAY_SCREENSHOT_FILES = {
  table: 'table-overview.png',
  delay: 'delayed-resolution.png',
  turn: 'one-action.png',
  resources: 'resources.png',
  hidden: 'hidden-kit.png',
  shop: 'shop.png',
} as const satisfies Partial<Record<HowToPlaySectionId, string>>;

export const HOW_TO_PLAY_SECTIONS: readonly HowToPlaySection[] = [
  {
    id: 'goal',
    title: 'Goal',
    body: 'Last player alive wins. Lives never exceed 25.',
    screenshotFile: null,
  },
  {
    id: 'table',
    title: 'The table',
    body: 'The dock is yours. Opponents stay hidden until Spy. Incoming is delayed hits on you.',
    screenshotFile: HOW_TO_PLAY_SCREENSHOT_FILES.table,
  },
  {
    id: 'delay',
    title: 'Delayed resolution',
    body: 'An action aimed at an opponent resolves on their next turn, after they have acted. You never lose lives off-turn. That delay is how you counter or heal.',
    screenshotFile: HOW_TO_PLAY_SCREENSHOT_FILES.delay,
  },
  {
    id: 'turn',
    title: 'One action',
    body: 'Each turn: exactly one of draw, play, buy, sell, upgrade, or use a special. Draw grants points equal to your kit’s Draw value — it does not deal a card.',
    screenshotFile: HOW_TO_PLAY_SCREENSHOT_FILES.turn,
  },
  {
    id: 'resources',
    title: 'Resources',
    body: 'Lives, Points, Upgrade points (the icon, never “UP”), Shield (attacks only; Tax ignores it).',
    screenshotFile: HOW_TO_PLAY_SCREENSHOT_FILES.resources,
  },
  {
    id: 'hidden',
    title: 'Hidden information',
    body: 'Kit, hand, and exact resources stay private. Every action is public.',
    screenshotFile: HOW_TO_PLAY_SCREENSHOT_FILES.hidden,
  },
  {
    id: 'shop',
    title: 'Shop',
    body: 'Buying a shared card costs double its play cost. Selling yields the play cost. Upgrade spends 1 upgrade point.',
    screenshotFile: HOW_TO_PLAY_SCREENSHOT_FILES.shop,
  },
  {
    id: 'modes',
    title: 'Online, solo, tutorial',
    body: 'Online = code + friends (bots may fill). Solo = bots. Tutorial = optional scripted 1v1.',
    screenshotFile: null,
  },
];
