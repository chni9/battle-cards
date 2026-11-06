/**
 * First-real-game hint copy — technical spec v7 §10.1–§10.2 (Lot 75 fixes; supersedes the v6 §5.2 bodies).
 * Titles are existing table chrome words, not new lore.
 */

import type { HintId } from '../ui/hint-ids';
import type { IncomingThiefCardId } from '../view-model/incoming-threat-diff';

export const SKIP_ALL_HINTS_LABEL = 'Skip all';

export interface HintCopy {
  readonly title: string;
  readonly body: string;
}

/**
 * Per-card `incoming-thief` bodies (technical spec v7 §10.1, Q52; rules spec §3 Thief, §5 the special thieves).
 * Only Thief names the 10-point cap.
 */
export const INCOMING_THIEF_HINT_BODY: Readonly<Record<IncomingThiefCardId, string>> = {
  thief:
    'An opponent used **Thief** on you! It will take effect **after you act**. This will steal up to 10 points from you. You can counter it with Thief, or spend your points before it resolves.',
  'card-thief':
    'An opponent used **Card Thief** on you! It will take effect **after you act**. It takes one of your cards: a random one, or the card they choose if their Spy is on you. It cannot be countered.',
  'spy-thief':
    'An opponent used **Spy Thief** on you! It will take effect **after you act**. It steals all your points and shows them your kit, cards and resources for the rest of the game. It cannot be countered, so spend your points before it resolves.',
  'upgrade-point-thief':
    'An opponent used **Upgrade Point Thief** on you! It will take effect **after you act**. It takes all your upgrade points and removes the upgrade from your upgraded cards. It cannot be countered.',
  'attack-thief':
    'An opponent used **Attack Thief** on you! It will take effect **after you act**. It takes a random attack card from you, or all of them if it is upgraded. It cannot be countered.',
};

export const HINT_COPY: Record<HintId, HintCopy> = {
  'your-turn': {
    title: 'Your turn',
    body: 'It is your turn you have to take **one** action.',
  },
  draw: {
    title: 'Draw',
    body: '**Draw** gives you points. The number of points you can draw depends on your kit.',
  },
  hand: {
    title: 'Hand',
    body: 'This is your hand where you have all the cards you can use. Click a card to **use**, **upgrade**, or **sell** it for points.',
  },
  specials: {
    title: 'Specials',
    body: '**Specials** are one-use cards. They are stronger than normal cards. Use them wisely. Special cards you start with depend on your kit.',
  },
  resources: {
    title: 'Resources',
    body: 'Here you will find lives, points, upgrade points and shield. They are your resources that you have to manage during the game. If your lives reach 0, you are eliminated.',
  },
  incoming: {
    title: 'Incoming',
    body: 'There is an incoming **attack**! It will take effect **after you act**. You can attack back (equal cancels both; a weaker answer still hits them later), use Shield, or use Mirror.',
  },
  'incoming-thief': {
    title: 'Incoming',
    body: INCOMING_THIEF_HINT_BODY.thief,
  },
  'hidden-kit': {
    title: 'Hidden kit',
    body: 'Here are your opponents. You see their kit and cards only with an upgraded Spy or Spy Thief, or once they are eliminated. A basic Spy shows only their resources.',
  },
  shop: {
    title: 'Shop',
    body: 'This is the shop. You can buy cards, special cards and upgrade points from here.',
  },
  reward: {
    title: 'Elimination reward',
    body: 'You helped eliminate an opponent! Pick **two** rewards: 4 lives, 8 points, one of their cards, or an upgrade point. Everyone who helped picks at the same time, on one shared timer.',
  },
};
