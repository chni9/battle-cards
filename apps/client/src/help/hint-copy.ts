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
  resources: {
    title: 'Resources',
    body: 'Heart lives · diamond points · upgrade-point icon · shield (attacks only).',
  },
  incoming: {
    title: 'Incoming',
    body: 'This hits **after you act** on your next turn. You can attack back, Shield, or Mirror.',
  },
  'hidden-kit': {
    title: 'Hidden kit',
    body: 'You cannot see their kit until Spy (or death).',
  },
  shop: {
    title: 'Shop',
    body: 'Shop prices are double the play cost.',
  },
};
