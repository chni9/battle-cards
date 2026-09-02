/**
 * First-real-game hint copy — technical spec v6 §5.2 (normative bodies).
 * Titles are existing table chrome words, not new lore.
 */

import type { HintId } from './hint-ids';

export const SKIP_ALL_HINTS_LABEL = 'Skip all';

export interface HintCopy {
  readonly title: string;
  readonly body: string;
}

export const HINT_COPY: Record<HintId, HintCopy> = {
  'your-turn': {
    title: 'Your turn',
    body: 'It is your turn you have to take **one** action.',
  },
  draw: {
    title: 'Draw',
    body: '**Draw** gives you points. The number of points you can draw depends on you kit.',
  },
  hand: {
    title: 'Hand',
    body: 'This is you hand where you have all the cards you can use. Click a card to **use**, **upgrade**, or **sell** it for points.',
  },
  specials: {
    title: 'Specials',
    body: '**Specials** are one-use cards. They are stronger that normal cards. Use them wisely. Special cards you start with depend on your kit.',
  },
  resources: {
    title: 'Resources',
    body: 'Here you will find lives, points, upgrade points and shield. They are your ressources that you have to manage during the game. If your number of lives atteign 0, you are eliminated.',
  },
  incoming: {
    title: 'Incoming',
    body: 'There is an incoming **attack**! It will take effect **after you act**. You can attack back (equal cancels both; a weaker answer still hits them later), use Shield, or use Mirror.',
  },
  'incoming-thief': {
    title: 'Incoming',
    body: 'An opponent used **Thief** on you! It will take effect **after you act**. This will steal uo to 10 points from you. You can counter it with Thief, or spend your points before it resolves.',
  },
  'hidden-kit': {
    title: 'Hidden kit',
    body: 'Here are your opponents. You cannot see their kit until you use Spy to reveal it.',
  },
  shop: {
    title: 'Shop',
    body: 'This is the shop. You can buy cards, special cards and upgrade points from here.',
  },
  reward: {
    title: 'Elimination reward',
    body: 'You eliminated an opponent ! You can pick **two** rewards: 4 lives, 8 points, a card from their hand, or an upgrade point.',
  },
};
