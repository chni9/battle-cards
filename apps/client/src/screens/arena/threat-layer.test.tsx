// @vitest-environment happy-dom
/**
 * Threat arrows, central plate and recurring chips: technical spec v7 §6.1 item 2, §6.5, §8.2, §11
 * (Q35); Appendix A `incoming-pending`, `waiting-on-others-strip`, `table-subchoice-mirror`,
 * `table-action-log-inspect` (L74-06). The arrow layer is aria-hidden, so it is read by attributes.
 */
import { formatCardLabel, type ActionLogEntryView, type PlayingStateView, type PublicPlayerView, type SubChoiceRequiredPayload } from '@card-battle/shared';
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { spokenTexts, visibleText } from '../../test/glyph-queries';
import { renderUi } from '../../test/render';
import { inPlayThumbs } from '../../view-model/card-actions';
import type { LayoutBox } from '../../view-model/seat-layout';
import { seats } from '../../view-model/seats';
import { makePending, makePersistent, makePlayer, makeSelf } from '../../view-model/test-fixtures';
import { threats } from '../../view-model/threats';
import { ArenaScreen } from './arena-screen';
import type { CardSheetSource } from './card-sheet-source';
import { CentralPlate } from './central-plate';
import { ThreatLayer } from './threat-layer';
import { expectNoArenaIntent, makeArenaProps, makeArenaView } from './test-view';

const ARC_BOX: LayoutBox = { viewport: { width: 390, height: 844 }, arena: { width: 390, height: 360 } };
const PHONE_360: LayoutBox = { viewport: { width: 360, height: 740 }, arena: { width: 360, height: 320 } };
const MIRROR = (ids: string[]): SubChoiceRequiredPayload => ({ kind: 'mirror', eligibleEffectIds: ids, deadlineMs: 1 });

function renderThreats(view: PlayingStateView, options: { box?: LayoutBox; subChoice?: SubChoiceRequiredPayload; tappedSeatId?: string } = {}) {
  const box = options.box ?? ARC_BOX;
  const model = threats(view, options.subChoice ?? null);
  const { layout } = seats(view, box);
  const onOpenCard = vi.fn<(source: CardSheetSource) => void>();
  const result = renderUi(
    <div className="relative">
      <ThreatLayer model={model} layout={layout} arena={box.arena} povId={view.you} tappedSeatId={options.tappedSeatId ?? null} />
      <CentralPlate view={view} model={model} mode={layout.mode} arena={box.arena} onOpenCard={onOpenCard} />
    </div>,
  );
  return { ...result, model, onOpenCard };
}

const arrowIds = (): (string | null)[] => Array.from(document.querySelectorAll('[data-threat-arrow]'), (el) => el.getAttribute('data-threat-arrow'));
function arrow(id: string): Element {
  const el = document.querySelector(`[data-threat-arrow="${id}"]`);
  if (el === null) throw new Error(`no arrow ${id}`);
  return el;
}
function label(id: string): Element {
  const el = document.querySelector(`[data-threat-label][data-pending-id="${id}"]`);
  if (el === null) throw new Error(`no label ${id}`);
  return el;
}
function plate(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[data-zone="pending"]');
  if (el === null) throw new Error('no plate');
  return el;
}
function withPlayer(view: PlayingStateView, player: PublicPlayerView): PlayingStateView {
  return { ...view, players: view.players.map((entry) => (entry.id === player.id ? player : entry)) };
}

describe('threat arrows (§6.5)', () => {
  it('two attacks from one Assassin action on the same seat draw two labels with their own damage, never a sum', () => {
    renderThreats(makeArenaView({ seatCount: 4, overrides: { pendingEffects: [
      makePending({ id: 'e1', sourcePlayerId: 'p1', targetPlayerId: 'p2', cardId: 'strong-attack', queuedAt: 7 }),
      makePending({ id: 'e2', sourcePlayerId: 'p1', targetPlayerId: 'p2', cardId: 'basic-attack', queuedAt: 7 }),
    ] } }));
    expect(arrowIds()).toEqual(['e1', 'e2']);
    expect(visibleText(label('e1'))).toBe('2');
    expect(visibleText(label('e2'))).toBe('1');
    expect(document.querySelector('[data-zone="threats"]')?.textContent).not.toContain('3');
  });

  it('MEGA ATTACK against 7 opponents renders one burst plus 7 target badges and no arrow', () => {
    const targets = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
    renderThreats(makeArenaView({ seatCount: 8, overrides: { pendingEffects: targets.map((t, i) =>
      makePending({ id: `m${String(i)}`, sourcePlayerId: 'me', targetPlayerId: t, cardId: 'mega-attack', queuedAt: 9 })) } }), { box: PHONE_360 });
    const bursts = document.querySelectorAll('[data-threat-burst]');
    expect(bursts).toHaveLength(1);
    expect(bursts[0]?.textContent).toContain('Hits all');
    const badges = Array.from(document.querySelectorAll('[data-fan-out-target]'));
    expect(badges.map((badge) => badge.getAttribute('data-fan-out-target'))).toEqual(targets);
    expect(badges.map((badge) => visibleText(badge))).toEqual(targets.map(() => '20'));
    expect(arrowIds()).toEqual([]);
  });

  it('a third-party hits-all play bursts on its seat; the POV copy lands on the plate', () => {
    const targets = ['me', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
    renderThreats(makeArenaView({ seatCount: 8, overrides: { pendingEffects: targets.map((t, i) =>
      makePending({ id: `m${String(i)}`, sourcePlayerId: 'p1', targetPlayerId: t, cardId: 'mega-attack', queuedAt: 9 })) } }), { box: PHONE_360 });
    expect(document.querySelector('[data-threat-burst]')?.getAttribute('data-source-player-id')).toBe('p1');
    expect(document.querySelectorAll('[data-fan-out-target]')).toHaveLength(6);
    const badge = within(plate()).getByRole('button', { name: `Inspect ${formatCardLabel('mega-attack', false)}` });
    expect(visibleText(badge)).toBe('20');
  });

  it("a Mirror-redirected effect shows its badge on the redirector's arrow", () => {
    renderThreats(makeArenaView({ seatCount: 4, overrides: { pendingEffects: [
      makePending({ id: 'e1', sourcePlayerId: 'p2', targetPlayerId: 'p3', cardId: 'strong-attack', redirectedBy: 'mirror' }),
    ] } }));
    expect(arrow('e1').getAttribute('data-source-player-id')).toBe('p2');
    expect(label('e1').querySelector('[data-mirror-badge="mirror"]')?.textContent).toBe(formatCardLabel('mirror', false));
  });

  it('highlights eligible ids on their arrows and plate badges while a Mirror prompt is open', () => {
    const view = makeArenaView({ seatCount: 4, overrides: { pendingEffects: [
      makePending({ id: 'e1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'strong-attack' }),
      makePending({ id: 'e2', sourcePlayerId: 'p2', targetPlayerId: 'me', cardId: 'basic-attack' }),
    ] } });
    const { unmount } = renderThreats(view, { subChoice: MIRROR(['e1']) });
    expect(plate().querySelector('[data-pending-id="e1"]')?.getAttribute('data-mirror-eligible')).toBe('true');
    expect(plate().querySelector('[data-pending-id="e2"]')?.hasAttribute('data-mirror-eligible')).toBe(false);
    expect(arrow('e1').getAttribute('data-mirror-eligible')).toBe('true');
    unmount();
    renderThreats(view);
    expect(document.querySelectorAll('[data-mirror-eligible]')).toHaveLength(0);
  });

  it('in grid mode draws only POV arrows; a tapped seat adds its own', () => {
    const view = makeArenaView({ seatCount: 8, overrides: { pendingEffects: [
      makePending({ id: 'e1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'spy' }),
      makePending({ id: 'e2', sourcePlayerId: 'me', targetPlayerId: 'p2', cardId: 'spy' }),
      makePending({ id: 'e3', sourcePlayerId: 'p3', targetPlayerId: 'p1', cardId: 'spy' }),
    ] } });
    const { unmount } = renderThreats(view, { box: PHONE_360 });
    expect(arrowIds()).toEqual(['e1', 'e2']);
    unmount();
    renderThreats(view, { box: PHONE_360, tappedSeatId: 'p3' });
    expect(arrowIds()).toEqual(['e1', 'e2', 'e3']);
  });

  it('a tapped seat lights its in and out arrows and dims the rest', () => {
    renderThreats(makeArenaView({ seatCount: 4, overrides: { pendingEffects: [
      makePending({ id: 'e1', sourcePlayerId: 'p1', targetPlayerId: 'p2', cardId: 'spy' }),
      makePending({ id: 'e2', sourcePlayerId: 'p3', targetPlayerId: 'p1', cardId: 'spy' }),
      makePending({ id: 'e3', sourcePlayerId: 'p2', targetPlayerId: 'p3', cardId: 'spy' }),
    ] } }), { tappedSeatId: 'p1' });
    expect(['e1', 'e2', 'e3'].map((id) => arrow(id).getAttribute('data-highlighted'))).toEqual(['true', 'true', 'false']);
  });

  it('hides the arrow layer from assistive tech and never takes a press', () => {
    renderThreats(makeArenaView());
    const layer = document.querySelector('[data-zone="threats"]');
    expect(layer?.getAttribute('aria-hidden')).toBe('true');
    expect(layer?.querySelector('button, a, [tabindex]')).toBeNull();
  });
});

describe('central plate (§6.1 item 2)', () => {
  it('keeps data-zone="pending" and the incoming hint anchor even when empty', () => {
    renderThreats(makeArenaView());
    expect(plate().getAttribute('data-hint-anchor')).toBe('incoming');
    expect(plate().querySelector('[data-pending-id], [data-recurring-chip], [data-card-face]')).toBeNull();
    expect(plate().querySelector('[data-plate-landing]')).not.toBeNull();
  });

  it('gives each incoming effect its own badge button: two attacks never show a sum', () => {
    renderThreats(makeArenaView({ seatCount: 3, overrides: { pendingEffects: [
      makePending({ id: 'e1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'strong-attack', queuedAt: 7 }),
      makePending({ id: 'e2', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack', queuedAt: 7 }),
    ] } }));
    const badges = within(plate()).getAllByRole('button', { name: /^Inspect / });
    expect(badges.map((badge) => badge.getAttribute('data-pending-id'))).toEqual(['e1', 'e2']);
    expect(badges.map((badge) => visibleText(badge))).toEqual(['2', '1']);
    expect(visibleText(plate())).not.toContain('3');
  });

  it('a plate badge opens the queue inspect', async () => {
    const { user, onOpenCard } = renderThreats(makeArenaView({ overrides: { pendingEffects: [
      makePending({ id: 'e1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'strong-attack' }),
    ] } }));
    await user.click(within(plate()).getByRole('button', { name: `Inspect ${formatCardLabel('strong-attack', false)}` }));
    expect(onOpenCard).toHaveBeenCalledWith({ kind: 'queue', effectId: 'e1', cardId: 'strong-attack', isUpgraded: false });
  });

  it('shows a Curse-on-you chip as paused under own Invisibility, in words', () => {
    renderThreats(makeArenaView({ overrides: { self: makeSelf({ lives: 6, activePersistentEffects: [
      makePersistent({ id: 'cur', cardId: 'curse' }),
      makePersistent({ id: 'inv', cardId: 'invisibility', counter: 2 }),
    ] }) } }));
    const chip = plate().querySelector('[data-recurring-chip="cur"]');
    expect(chip?.getAttribute('data-recurring-state')).toBe('paused');
    expect(chip === null ? '' : visibleText(chip)).toContain('Paused');
  });

  it('shows a Curse at 1 life as ending, in words', () => {
    renderThreats(makeArenaView({ overrides: { self: makeSelf({ lives: 1, activePersistentEffects: [makePersistent({ id: 'cur', cardId: 'curse' })] }) } }));
    const chip = plate().querySelector('[data-recurring-chip="cur"]');
    expect(chip?.getAttribute('data-recurring-state')).toBe('ending');
    expect(chip === null ? '' : visibleText(chip)).toContain('Ending');
  });

  it("an opponent's Poison chip names its owner and rate and opens the in-play card sheet", async () => {
    const view = withPlayer(makeArenaView(), makePlayer('p1', { activePersistentEffects: [makePersistent({ id: 'poi', cardId: 'poison', counter: 3 })] }));
    const { user, onOpenCard } = renderThreats(view);
    const chip = plate().querySelector<HTMLElement>('[data-recurring-chip="poi"]');
    if (chip === null) throw new Error('no Poison chip');
    expect(chip.getAttribute('data-recurring-state')).toBe('live');
    expect(visibleText(chip)).toContain('p1');
    expect(spokenTexts(chip)).toContain('minus 1 life');
    await user.click(chip);
    expect(onOpenCard).toHaveBeenCalledWith({ kind: 'in-play', thumb: inPlayThumbs(view, 'p1').find((thumb) => thumb.instance.instanceId === 'poi') });
  });

  it('holds the last publicly played card on its landing spot, and opens it as a log inspect', async () => {
    const log: ActionLogEntryView[] = [
      { kind: 'actionPlayed', actorPlayerId: 'p1', action: 'playCard', cardId: 'strong-attack', isUpgraded: true, targetPlayerId: 'me', turnSequence: 2 },
      { kind: 'actionPlayed', actorPlayerId: 'p2', action: 'draw', turnSequence: 3 },
    ];
    const { user, onOpenCard } = renderThreats(makeArenaView({ overrides: { actionLog: log } }));
    const landing = plate().querySelector<HTMLElement>('[data-plate-landing] [data-card-id="strong-attack"]');
    if (landing === null) throw new Error('no landing card');
    expect(landing.tagName).toBe('BUTTON');
    await user.click(landing);
    expect(onOpenCard).toHaveBeenCalledWith({ kind: 'log', cardId: 'strong-attack', isUpgraded: true });
  });
});

describe('central plate presses (final review, Minor 3)', () => {
  it('lets presses through its empty area: only the landing card, badges and chips take them', () => {
    const log: ActionLogEntryView[] = [
      { kind: 'actionPlayed', actorPlayerId: 'p1', action: 'playCard', cardId: 'strong-attack', isUpgraded: false, targetPlayerId: 'me', turnSequence: 2 },
    ];
    renderThreats(makeArenaView({ overrides: {
      actionLog: log,
      pendingEffects: [makePending({ id: 'e1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'strong-attack' })],
      self: makeSelf({ lives: 6, activePersistentEffects: [makePersistent({ id: 'cur', cardId: 'curse' })] }),
    } }));
    // happy-dom has no hit testing: a tap on a grid seat under the plate's empty area is an L74-26 gate check.
    expect(plate().classList.contains('pointer-events-none')).toBe(true);
    const takers = [
      plate().querySelector('[data-plate-landing] [data-card-id="strong-attack"]'),
      plate().querySelector('[data-pending-id="e1"]'),
      plate().querySelector('[data-recurring-chip="cur"]'),
    ];
    expect(takers.map((element) => element?.classList.contains('pointer-events-auto'))).toEqual([true, true, true]);
    expect(plate().querySelector('[data-plate-landing]')?.classList.contains('pointer-events-auto')).toBe(false);
  });
});

describe('the plate in the arena (§6.6.4)', () => {
  it('a plate badge opens the read-only card sheet; nothing is sent', async () => {
    const props = makeArenaProps({ view: makeArenaView({ overrides: { pendingEffects: [
      makePending({ id: 'e1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'strong-attack' }),
    ] } }) });
    const { user } = renderUi(<ArenaScreen {...props} />);
    await user.click(screen.getByRole('button', { name: `Inspect ${formatCardLabel('strong-attack', false)}` }));
    expect(document.querySelector('[data-arena-sheet="card:queue-e1"]')).not.toBeNull();
    expectNoArenaIntent(props);
  });
});
