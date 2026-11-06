/**
 * First-real-game hint copy — technical spec v6 §5.2 / L46-01; v7 §10.1–§10.2 (L75-01).
 */

import { formatCardLabel } from '@card-battle/shared';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { DRAW_ACTION_LABEL, SHOP_ACTION_LABEL } from '../view-model/chrome-labels';
import { HIDDEN_KIT_LABEL } from '../view-model/table-copy';

import { INCOMING_THIEF_CARD_IDS, type IncomingThiefCardId } from '../view-model/incoming-threat-diff';
import { HINT_COPY, INCOMING_THIEF_HINT_BODY, SKIP_ALL_HINTS_LABEL } from './hint-copy';
import { HINT_IDS } from '../ui/hint-ids';

describe('hint copy (technical spec v6 §5.2)', () => {
  it('covers every HintId with spec bodies', () => {
    for (const id of HINT_IDS) {
      expect(HINT_COPY[id].body.length).toBeGreaterThan(0);
    }
    expect(HINT_COPY['your-turn'].body).toBe(
      'It is your turn you have to take **one** action.',
    );
    expect(HINT_COPY.draw.body).toBe(
      '**Draw** gives you points. The number of points you can draw depends on your kit.',
    );
    expect(HINT_COPY.hand.body).toContain('**use**');
    expect(HINT_COPY.hand.body).toContain('**upgrade**');
    expect(HINT_COPY.hand.body).toContain('**sell**');
    expect(HINT_COPY.specials.body).toContain('one-use');
    expect(HINT_COPY.resources.body).toContain('lives');
    expect(HINT_COPY.resources.body).toContain('points');
    expect(HINT_COPY.resources.body).toContain('upgrade points');
    expect(HINT_COPY.resources.body).toContain('shield');
    expect(HINT_COPY.incoming.body).toContain('incoming **attack**');
    expect(HINT_COPY.incoming.body).toContain('Shield');
    expect(HINT_COPY.incoming.body).toContain('Mirror');
    expect(HINT_COPY['incoming-thief'].body).toContain('**Thief**');
    expect(HINT_COPY['incoming-thief'].body).not.toContain('Shield');
    expect(HINT_COPY['hidden-kit'].body).toContain('Spy');
    expect(HINT_COPY.shop.body).toContain('buy cards');
    expect(HINT_COPY.shop.body).not.toContain('double the play cost');
    expect(HINT_COPY.reward.body).toContain('**two** rewards');
    expect(HINT_COPY.reward.body).toContain('4 lives');
    expect(SKIP_ALL_HINTS_LABEL).toBe('Skip all');
  });

  it('titles reuse table chrome words', () => {
    expect(HINT_COPY.draw.title).toBe(DRAW_ACTION_LABEL);
    expect(HINT_COPY.shop.title).toBe(SHOP_ACTION_LABEL);
    expect(HINT_COPY['hidden-kit'].title).toBe(HIDDEN_KIT_LABEL);
    expect(HINT_COPY['your-turn'].title).toBe('Your turn');
    expect(HINT_COPY.incoming.title).toBe('Incoming');
    expect(HINT_COPY['incoming-thief'].title).toBe('Incoming');
    expect(HINT_COPY.hand.title).toBe('Hand');
    expect(HINT_COPY.specials.title).toBe('Specials');
    expect(HINT_COPY.reward.title).toBe('Elimination reward');
  });
});

describe('hint copy fixes (technical spec v7 §10.1, §10.2; L75-01)', () => {
  const TYPOS = ['you kit', 'you hand', 'stronger that', 'ressources', 'atteign', 'uo to', 'opponent !', ' !'] as const;

  it('carries none of the seven locked typos and no space before an exclamation mark (§10.2)', () => {
    for (const id of HINT_IDS) {
      for (const typo of TYPOS) expect(HINT_COPY[id].body).not.toContain(typo);
    }
    expect(HINT_COPY.hand.body).toContain('This is your hand');
    expect(HINT_COPY.specials.body).toContain('They are stronger than normal cards.');
    expect(HINT_COPY.resources.body).toContain('They are your resources');
    expect(HINT_COPY.resources.body).toContain('If your lives reach 0, you are eliminated.');
    expect(HINT_COPY['incoming-thief'].body).toContain('steal up to 10 points');
  });

  it('hidden-kit: kit and cards need an upgraded Spy, a basic Spy shows only resources (§10.1, Lot 69)', () => {
    const body = HINT_COPY['hidden-kit'].body;
    expect(body).toContain('upgraded Spy');
    expect(body).toContain('Spy Thief');
    expect(body).toContain('A basic Spy shows only their resources.');
    expect(body).not.toContain('until you use Spy');
  });

  it('reward: picks reward helping eliminate an opponent, on one shared timer (§10.1, Lot 71)', () => {
    const body = HINT_COPY.reward.body;
    expect(body.startsWith('You eliminated')).toBe(false);
    expect(body).toContain('helped eliminate');
    expect(body).toContain('one shared timer');
  });
});

describe('per-card incoming-thief copy (technical spec v7 §10.1, Q52; L75-07)', () => {
  it('gives each of the five thieves its own body, naming its card, after you act, with no Shield', () => {
    expect(new Set(INCOMING_THIEF_CARD_IDS.map((id) => INCOMING_THIEF_HINT_BODY[id])).size).toBe(INCOMING_THIEF_CARD_IDS.length);
    for (const id of INCOMING_THIEF_CARD_IDS) {
      expect(INCOMING_THIEF_HINT_BODY[id]).toContain(`**${formatCardLabel(id, false)}**`);
      expect(INCOMING_THIEF_HINT_BODY[id]).toContain('**after you act**');
      expect(INCOMING_THIEF_HINT_BODY[id]).not.toContain('Shield');
    }
  });

  it('mentions the 10-point cap only for Thief', () => {
    for (const id of INCOMING_THIEF_CARD_IDS) {
      expect(/\b10\b/.test(INCOMING_THIEF_HINT_BODY[id])).toBe(id === 'thief');
    }
  });

  it('is typed over exactly the five thief ids; the incoming-thief hint keeps its title with the Thief body', () => {
    expectTypeOf(INCOMING_THIEF_HINT_BODY).toEqualTypeOf<Readonly<Record<IncomingThiefCardId, string>>>();
    expect(new Set(Object.keys(INCOMING_THIEF_HINT_BODY))).toEqual(new Set(INCOMING_THIEF_CARD_IDS));
    expect(HINT_COPY['incoming-thief']).toEqual({ title: 'Incoming', body: INCOMING_THIEF_HINT_BODY.thief });
  });
});
