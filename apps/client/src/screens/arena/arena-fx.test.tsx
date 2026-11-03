// @vitest-environment happy-dom
/**
 * FX and banners hosted on arena anchors: technical spec v7 §6.12, §8.1, §8.3; Appendix A `table-fx-layer`,
 * `table-fx-card-ghosts`, `table-fx-resource-flash`, `table-banners` (L74-17). happy-dom has no layout:
 * a test stubs the rect of each arena anchor it expects the FX to measure.
 */
import type { PlayingStateView } from '@card-battle/shared';
import { act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { emitResourceFlowFlash, resetResourceFlowFlashForTests } from '../../fx/resource-flow-flash';
import { renderUi, type RenderUiOptions } from '../../test/render';
import { makeSelf } from '../../view-model/test-fixtures';
import { ArenaScreen } from './arena-screen';
import { expectNoArenaIntent, makeArenaProps, makeArenaView } from './test-view';

function setup(view: PlayingStateView, options: RenderUiOptions = {}) {
  const props = makeArenaProps({ view });
  return { props, ...renderUi(<ArenaScreen {...props} />, options) };
}
function one(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector);
  if (element === null) throw new Error(`no ${selector}`);
  return element;
}
const stub = (selector: string, rect: DOMRect): void => { vi.spyOn(one(selector), 'getBoundingClientRect').mockReturnValue(rect); };

afterEach(() => { resetResourceFlowFlashForTests(); });

describe('arena FX hosting (L74-17)', () => {
  it('mounts one FX overlay and one banner host, and Your turn plays on the POV turn (§6.12)', () => {
    const { props, rerender } = setup(makeArenaView());
    rerender(<ArenaScreen {...props} view={{ ...props.view }} />);
    expect(document.querySelectorAll('[data-zone="table-fx"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-zone="table-banners"]')).toHaveLength(1);
    expect(document.querySelector('[data-banner="turn"]')?.textContent).toBe('Your turn');
    expectNoArenaIntent(props);
  });

  it('an opponent buy in a fake log diff flies one card ghost between arena anchors (§6.12)', () => {
    const { props, rerender } = setup(makeArenaView());
    stub('[data-zone="opponent-seat"][data-player-id="p1"]', new DOMRect(10, 10, 76, 92));
    stub('[data-zone="pending"]', new DOMRect(100, 300, 120, 96));
    stub('[data-arena-region="hand"]', new DOMRect(0, 600, 400, 120));
    stub('[data-zone="log-collapsed"]', new DOMRect(0, 60, 400, 20));
    const buy = { kind: 'actionPlayed', actorPlayerId: 'p1', action: 'buyCard', cardId: 'spy', turnSequence: 2 } as const;
    rerender(<ArenaScreen {...props} view={{ ...props.view, actionLog: [buy] }} />);
    expect(document.querySelectorAll('[data-zone="table-fx"] [data-fx="card-flyout"]')).toHaveLength(1);
    expectNoArenaIntent(props);
  });

  it('marks a new elimination beat data-fx="elimination-beat" on the seat, once (Q63; L74-24 asserts this marker)', () => {
    const { props, rerender } = setup(makeArenaView());
    stub('[data-zone="opponent-seat"][data-player-id="p1"]', new DOMRect(10, 10, 76, 92));
    const out = { kind: 'playerEliminated', playerId: 'p1', eliminatorPlayerId: 'me', reason: 'combat', turnSequence: 1 } as const;
    rerender(<ArenaScreen {...props} view={{ ...props.view, actionLog: [out] }} />);
    rerender(<ArenaScreen {...props} view={{ ...props.view, actionLog: [out] }} />);
    expect(document.querySelectorAll('[data-zone="table-fx"] [data-fx="elimination-beat"]')).toHaveLength(1);
  });

  it.each([{ reduced: false, float: '+3' }, { reduced: true, float: null }])(
    'the self strip flashes a POV gain, with the float only under full motion (reduced $reduced; §8.3)',
    ({ reduced, float }) => {
      const view = makeArenaView({ overrides: { self: makeSelf({ points: 10 }) } });
      const { props, rerender } = setup(view, { reducedMotion: reduced });
      rerender(<ArenaScreen {...props} view={{ ...view, self: makeSelf({ points: 13 }) }} />);
      const cue = one('[data-zone="resources"] [data-resource-kind="point"]').closest('[data-resource-flash]');
      expect(cue?.getAttribute('data-resource-flash')).toBe('gain');
      expect(cue?.querySelector('[data-resource-float="gain"]')?.textContent ?? null).toBe(float);
    },
  );

  it('an unspied seat flashes a public loss on its ? value (L51-16)', () => {
    setup(makeArenaView());
    act(() => { emitResourceFlowFlash('p1', 'life', -2); });
    const life = one('[data-zone="opponent-seat"][data-player-id="p1"] [data-resource-kind="life"]');
    expect([life.getAttribute('data-resource-flash'), life.querySelector('[data-resource-float="loss"]')?.textContent]).toEqual(['loss', '-2']);
    expect(life.textContent).toContain('?');
  });
});
