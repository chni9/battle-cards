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
    body: 'Your turn — take **one** action.',
  },
  draw: {
    title: 'Draw',
    body: '**Draw** gives points, not a card.',
  },
  hand: {
    title: 'Hand',
    body: 'Click a card to **use**, **upgrade**, or **sell** it for points.',
  },
  specials: {
    title: 'Specials',
    body: '**Specials** are usually one-use. Using one **is** your action for the turn.',
  },
  resources: {
    title: 'Resources',
    body: 'Heart lives · diamond points · upgrade-point icon · shield (attacks only).',
  },
  incoming: {
    title: 'Incoming',
    body: 'There is an incoming **attack**. It hits **after you act**. Do something this turn: attack back, Shield, or Mirror.',
  },
  'incoming-thief': {
    title: 'Incoming',
    body: 'There is an incoming **Thief**. It hits **after you act**. Counter with Thief, or act before it resolves.',
  },
  'hidden-kit': {
    title: 'Hidden kit',
    body: 'You cannot see their kit until Spy (or death).',
  },
  shop: {
    title: 'Shop',
    body: 'Shop prices are double the play cost.',
  },
  reward: {
    title: 'Elimination reward',
    body: 'You eliminated them — pick **two** rewards: 4 lives, 8 points, a card from them, or an upgrade point. Same choice twice is allowed.',
  },
};
