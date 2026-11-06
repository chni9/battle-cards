// @vitest-environment happy-dom
/**
 * The shared FX trigger hook: technical spec v7 §6.12, §8.1, §8.3, Q63; Appendix A `table-fx-layer`,
 * `table-fx-token-chips`, `table-fx-card-ghosts`, `table-fx-threat`, `table-fx-resolution-elim-reward`
 * (L74-17). It replaces the `fx/play-flyout.test.ts` table.tsx source assertions (spec v7 §12.1).
 * happy-dom has no layout: every anchor this file measures gets a stubbed rect.
 */
import type { ActionLogEntryView, ActionResolvedPayload, PlayingStateView, SubChoiceRequiredPayload } from '@card-battle/shared';
import { renderHook } from '@testing-library/react';
import { createElement, type ReactElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { setReducedMotion } from '../test/render'; // also the act environment and per-test cleanup (L72-06)
import { getCardArtUrl } from '../ui/asset-lookup';
import { makeCard, makePending, makeSelf, makeTableView } from '../view-model/test-fixtures';
import { resetResourceFlowFlashForTests, subscribeResourceFlowFlash } from './resource-flow-flash';
import { TableFxContext, type TableFxContextValue, type TableFxInput } from './table-fx-hooks';
import { useTableFxTriggers, type TableFxTriggerInput } from './use-table-fx-triggers';

const IDS = ['me', 'p1', 'p2'];
const BUY: ActionLogEntryView = { kind: 'actionPlayed', actorPlayerId: 'p1', action: 'buyCard', cardId: 'spy', turnSequence: 2 };
const PLAY: ActionLogEntryView = { kind: 'actionPlayed', actorPlayerId: 'p1', action: 'playCard', cardId: 'spy', turnSequence: 2 };
const elim = (playerId: string, turnSequence: number): ActionLogEntryView =>
  ({ kind: 'playerEliminated', playerId, eliminatorPlayerId: null, reason: 'combat', turnSequence });
const anchors: HTMLElement[] = [];
function anchor(attributes: Readonly<Record<string, string>>, rect: DOMRect, parent: HTMLElement = document.body): HTMLElement {
  const element = document.createElement('div');
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  parent.append(element);
  anchors.push(element);
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(rect);
  return element;
}
/** The plate, the hand band, the log endpoint and p1's seat, as the arena lays them out. */
function tableAnchors(): void {
  anchor({ 'data-zone': 'pending' }, new DOMRect(100, 300, 120, 96));
  anchor({ 'data-zone': 'card-band' }, new DOMRect(0, 600, 400, 120));
  anchor({ 'data-zone': 'log-collapsed' }, new DOMRect(0, 60, 400, 20));
  anchor({ 'data-zone': 'opponent-seat', 'data-player-id': 'p1' }, new DOMRect(10, 10, 76, 92));
}
const input = (view: PlayingStateView, extra: Partial<TableFxTriggerInput> = {}): TableFxTriggerInput =>
  ({ view, lastActionResolved: null, subChoice: null, ...extra });
function renderTriggers(initial: TableFxTriggerInput) {
  const enqueue = vi.fn<(event: TableFxInput) => void>();
  const value: TableFxContextValue = { enqueue, events: [] };
  const wrapper = ({ children }: { children: ReactNode }): ReactElement => createElement(TableFxContext.Provider, { value }, children);
  return { enqueue, ...renderHook((props: TableFxTriggerInput) => useTableFxTriggers(props), { initialProps: initial, wrapper }) };
}
const sent = (enqueue: ReturnType<typeof renderTriggers>['enqueue']): TableFxInput[] => enqueue.mock.calls.map(([event]) => event);

afterEach(() => {
  for (const element of anchors.splice(0)) element.remove();
  resetResourceFlowFlashForTests();
});

describe('useTableFxTriggers (L74-17)', () => {
  it('seeds elimination beats on mount and never replays them on a remount (Q63)', () => {
    const past = makeTableView(IDS, { actionLog: [elim('p1', 3)] });
    const first = renderTriggers(input(past));
    first.rerender(input({ ...past, actionLog: [elim('p1', 3), elim('p2', 5)] }));
    expect(sent(first.enqueue).filter((event) => event.kind === 'eliminationBeat')).toEqual([{ kind: 'eliminationBeat', playerId: 'p2' }]);
    first.unmount();
    const both = { ...past, actionLog: [elim('p1', 3), elim('p2', 5)] };
    const second = renderTriggers(input(both));
    second.rerender(input({ ...both }));
    expect(sent(second.enqueue)).toEqual([]);
  });

  it('flashes each resolution once per effect and outcome, and pulses the dock once per reward prompt (Lot 14)', () => {
    const view = makeTableView(IDS);
    const hit: ActionResolvedPayload = { effectId: 'e1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack', isUpgraded: false, livesLost: 1, shieldAbsorbed: 0, outcome: 'applied' };
    const reward: SubChoiceRequiredPayload = { kind: 'elimination-reward', eliminationId: 'el-1', eliminatedPlayerId: 'p2', availableCards: [], deadlineMs: 1 };
    const { enqueue, rerender } = renderTriggers(input(view, { lastActionResolved: hit }));
    rerender(input(view, { lastActionResolved: { ...hit } }));
    rerender(input(view, { lastActionResolved: { ...hit }, subChoice: reward }));
    rerender(input(view, { lastActionResolved: { ...hit }, subChoice: { ...reward } }));
    expect(sent(enqueue)).toEqual([
      { kind: 'resolutionFlash', outcome: 'applied', effectId: 'e1' },
      { kind: 'rewardPulse', eliminationId: 'el-1' },
    ]);
  });

  it('pulses the source seat once per fresh incoming threat, after a silent first paint; collapsed chrome gets no cue (L39-05, R6)', () => {
    anchor({ 'data-zone': 'opponent-seat', 'data-player-id': 'p1' }, new DOMRect(10, 10, 76, 92));
    anchor({ 'data-zone': 'incoming-collapsed' }, new DOMRect(300, 20, 44, 44));
    const old = makePending({ id: 'old', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack' });
    const view = makeTableView(IDS, { pendingEffects: [old] });
    const { enqueue, rerender } = renderTriggers(input(view));
    expect(sent(enqueue)).toEqual([]);
    rerender(input({ ...view, pendingEffects: [old, makePending({ id: 'new', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack' })] }));
    const events = sent(enqueue);
    expect(events.map((event) => event.kind)).toEqual(['threatOutline', 'targetingCue']);
    expect(events.flatMap((event) => (event.kind === 'targetingCue' ? [event.from] : []))).toEqual([
      { left: 10, top: 10, width: 76, height: 92 },
    ]);
  });

  it('an opponent buy flies one 48×72 card ghost and no playCard flyout (L51-13)', () => {
    tableAnchors();
    const view = makeTableView(IDS);
    const { enqueue, rerender } = renderTriggers(input(view));
    rerender(input({ ...view, actionLog: [BUY] }));
    const events = sent(enqueue);
    const ghosts = events.filter((event) => event.kind === 'tokenFlyout' && event.asCard === true);
    expect(ghosts).toHaveLength(1);
    expect(ghosts[0]).toMatchObject({ from: { width: 48, height: 72 }, to: { width: 48, height: 72 } });
    expect(events.some((event) => event.kind === 'playFlyout')).toBe(false);
  });

  it("an opponent's play flies one face-up card ghost from that seat to the felt center (§6.6.2, final review)", () => {
    tableAnchors();
    const view = makeTableView(IDS);
    const { enqueue, rerender } = renderTriggers(input(view));
    rerender(input({ ...view, actionLog: [PLAY] }));
    const ghosts = sent(enqueue).filter((event) => event.kind === 'tokenFlyout' && event.asCard === true);
    expect(ghosts).toHaveLength(1);
    // p1's seat (10, 10, 76 × 92) and the plate's centre (L75-08: the plate, not the plate / card-band midpoint), each as a 48 × 72 card.
    expect(ghosts[0]).toMatchObject({
      artUrl: getCardArtUrl('spy', { isUpgraded: false }),
      from: { left: 24, top: 20, width: 48, height: 72 },
      to: { left: 136, top: 312, width: 48, height: 72 },
    });
  });

  it('a leftover live delta flies directed chips and flashes the resource (L51-15, L51-16)', () => {
    anchor({ 'data-zone': 'log-collapsed' }, new DOMRect(0, 60, 400, 20));
    const pov = anchor({ 'data-zone': 'private-zone', 'data-player-id': 'me' }, new DOMRect(0, 500, 400, 80));
    anchor({ 'data-resource-kind': 'point' }, new DOMRect(200, 520, 40, 28), pov);
    const flashes: number[] = [];
    const stop = subscribeResourceFlowFlash('self', 'point', (delta) => { flashes.push(delta); });
    const view = makeTableView(IDS, { self: makeSelf({ points: 10 }) });
    const { enqueue, rerender } = renderTriggers(input(view));
    rerender(input({ ...view, self: makeSelf({ points: 13 }) }));
    stop();
    expect(sent(enqueue).filter((event) => event.kind === 'tokenFlyout' && event.asCard !== true)).toHaveLength(3);
    expect(flashes).toEqual([3]);
  });

  it('replays no log history on mount, and flies nothing for new entries under reduced motion (§8.3)', () => {
    tableAnchors();
    const history = renderTriggers(input(makeTableView(IDS, { actionLog: [BUY] })));
    expect(sent(history.enqueue)).toEqual([]);
    history.unmount();
    setReducedMotion(true);
    const view = makeTableView(IDS);
    const reduced = renderTriggers(input(view));
    reduced.rerender(input({ ...view, actionLog: [BUY] }));
    expect(sent(reduced.enqueue)).toEqual([]);
  });

  it('flies an own play from its drop point and a buy from the felt center; reduced motion keeps only the buy (Lot 14, §8.3)', () => {
    tableAnchors();
    const view = makeTableView(IDS, { self: makeSelf({ hand: [makeCard('tax')] }) });
    const full = renderTriggers(input(view));
    full.result.current.ownIntent({ kind: 'play', instanceId: 'tax-1', origin: { x: 50, y: 60 } });
    full.result.current.ownIntent({ kind: 'buy-card', cardId: 'spy' });
    expect(sent(full.enqueue)).toMatchObject([
      { kind: 'tokenFlyout', asCard: true, from: { left: 26, top: 24, width: 48, height: 72 } },
      { kind: 'playFlyout' },
    ]);
    full.unmount();
    setReducedMotion(true);
    const reduced = renderTriggers(input(view));
    reduced.result.current.ownIntent({ kind: 'play', instanceId: 'tax-1' });
    reduced.result.current.ownIntent({ kind: 'buy-card', cardId: 'spy' });
    expect(sent(reduced.enqueue).map((event) => event.kind)).toEqual(['playFlyout']);
  });
});
