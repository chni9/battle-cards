/**
 * How to play primer copy — technical spec v6 §5.1 / L51-02.
 * First-time floor only; screenshot filenames are designer-owned.
 */

export const HOW_TO_PLAY_SECTION_IDS = [
  'goal',
  'turn',
  'lives',
  'points',
  'cards',
  'upgrade',
  'kits',
  'specials',
  'shop',
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
  turn: 'one-action.png',
  lives: 'resources.png',
  kits: 'hidden-kit.png',
  shop: 'shop.png',
} as const satisfies Partial<Record<HowToPlaySectionId, string>>;

export const HOW_TO_PLAY_SECTIONS: readonly HowToPlaySection[] = [
  {
    id: 'goal',
    title: 'Goal',
    body: "Last player alive wins. This is a turn-based elimination game for 2 to 4 players: reduce opponents' lives to 0 and stay alive yourself. Lives can never go above 25, no matter how you gain them.",
    screenshotFile: null,
  },
  {
    id: 'turn',
    title: 'Turns',
    body: 'Players act one after another. On your turn you take exactly one action, then play passes on. That action is one of: Draw, play a card from your hand, play a special, buy, sell, or upgrade.',
    screenshotFile: HOW_TO_PLAY_SCREENSHOT_FILES.turn,
  },
  {
    id: 'lives',
    title: 'Lives',
    body: 'Lives are your health. At 0 lives you are eliminated and become a spectator. Attacks deal damage to lives. A shield only absorbs attack damage; other life loss ignores it.',
    screenshotFile: HOW_TO_PLAY_SCREENSHOT_FILES.lives,
  },
  {
    id: 'points',
    title: 'Points',
    body: "Points are the currency for almost every action: playing most cards, buying from the Shop, selling, and buying upgrade points. Draw gives you points equal to your kit's Draw value.",
    screenshotFile: null,
  },
  {
    id: 'cards',
    title: 'Cards',
    body: 'Your hand holds attack cards and action cards. Attacks deal damage to a chosen opponent. Action cards do everything else: gain resources, steal, spy, shield, or heal. Tap a card to read it, then Use, Upgrade, or Sell.',
    screenshotFile: null,
  },
  {
    id: 'upgrade',
    title: 'Upgrade',
    body: 'You can upgrade a held copy by spending 1 upgrade point. That upgrade is permanent for that copy and makes its effect stronger. The card dialog tells you what the upgrade adds.',
    screenshotFile: null,
  },
  {
    id: 'kits',
    title: 'Kits',
    body: 'Each player has a kit. It sets starting lives, points, upgrade points, and Draw, how many random action and attack cards you begin with, which special cards you hold, and sometimes a kit ability. Opponents cannot see your kit until they Spy you, or until you are eliminated. In the lobby you may pick a kit or keep Random.',
    screenshotFile: HOW_TO_PLAY_SCREENSHOT_FILES.kits,
  },
  {
    id: 'specials',
    title: 'Special cards',
    body: 'Special cards come with your kit; you can also buy one in the Shop. Each special has one use: after you play it, it is gone. They have a play cost in points and can be upgraded like other cards.',
    screenshotFile: null,
  },
  {
    id: 'shop',
    title: 'Shop',
    body: 'Open Shop to buy extra cards or upgrade points, and to sell cards you do not need.',
    screenshotFile: HOW_TO_PLAY_SCREENSHOT_FILES.shop,
  },
];
