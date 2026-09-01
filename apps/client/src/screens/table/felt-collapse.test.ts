import { describe, expect, it } from 'vitest';

import {
  FELT_COLLAPSE_BUTTON_PX,
  FELT_LOG_MIN_PX,
  FELT_OPPONENT_ROW_PX,
  FELT_PENDING_NONEMPTY_PX,
  dockMinHeightPx,
  feltCollapseFromCounts,
  planFeltCollapse,
} from './felt-collapse';

describe('planFeltCollapse (L53-05)', () => {
  const base = {
    opponentRowHeight: FELT_OPPONENT_ROW_PX,
    pendingHeight: FELT_PENDING_NONEMPTY_PX,
    logHeight: 80,
    dockMinHeight: 300,
    incomingDockHeight: 64,
    buttonHeight: FELT_COLLAPSE_BUTTON_PX,
  };

  it('keeps all chrome when the felt is tall enough', () => {
    expect(
      planFeltCollapse({ ...base, feltHeight: 900 }),
    ).toEqual({ incoming: false, actionLog: false, opponents: false });
  });

  it('collapses Incoming first', () => {
    const next = planFeltCollapse({ ...base, feltHeight: 560 });
    expect(next.incoming).toBe(true);
    expect(next.actionLog).toBe(false);
    expect(next.opponents).toBe(false);
  });

  it('collapses Incoming then opponents before the action log', () => {
    const next = planFeltCollapse({ ...base, feltHeight: 480 });
    expect(next.incoming).toBe(true);
    expect(next.opponents).toBe(true);
    expect(next.actionLog).toBe(false);
  });

  it('collapses the action log last', () => {
    const next = planFeltCollapse({ ...base, feltHeight: 340 });
    expect(next).toEqual({
      incoming: true,
      actionLog: true,
      opponents: true,
    });
  });

  it('skips Incoming when Incoming and Waiting are already empty', () => {
    const next = planFeltCollapse({
      ...base,
      incomingDockHeight: 0,
      pendingHeight: 0,
      feltHeight: 480,
    });
    expect(next.incoming).toBe(false);
    expect(next.opponents).toBe(true);
    expect(next.actionLog).toBe(false);
  });
});

describe('feltCollapseFromCounts (L53-05)', () => {
  it('collapses all three on a short 6-player felt', () => {
    const next = feltCollapseFromCounts({
      feltHeight: 320,
      opponentCount: 5,
      incomingCount: 2,
      waitingCount: 1,
      specialsCount: 4,
    });
    expect(next.incoming).toBe(true);
    expect(next.actionLog).toBe(true);
    expect(next.opponents).toBe(true);
  });

  it('does not invent Incoming height when Incoming is empty', () => {
    const next = feltCollapseFromCounts({
      feltHeight: 900,
      opponentCount: 1,
      incomingCount: 0,
      waitingCount: 0,
      specialsCount: 1,
    });
    expect(next).toEqual({
      incoming: false,
      actionLog: false,
      opponents: false,
    });
  });
});

describe('dockMinHeightPx', () => {
  it('is at least one uncropped hand row plus dock chrome', () => {
    expect(dockMinHeightPx(0)).toBeGreaterThan(FELT_LOG_MIN_PX);
    expect(dockMinHeightPx(4)).toBeGreaterThan(dockMinHeightPx(0));
  });
});

describe('short viewport collapse (L53-07)', () => {
  it('collapses Incoming and opponents on a 390px-tall landscape, keeps the log', () => {
    const next = planFeltCollapse({
      opponentRowHeight: FELT_OPPONENT_ROW_PX,
      pendingHeight: FELT_PENDING_NONEMPTY_PX,
      logHeight: 80,
      dockMinHeight: 300,
      incomingDockHeight: 64,
      buttonHeight: FELT_COLLAPSE_BUTTON_PX,
      feltHeight: 330,
      viewportHeight: 390,
      viewportWidth: 844,
    });
    expect(next).toEqual({
      incoming: true,
      actionLog: false,
      opponents: true,
    });
  });

  it('still collapses the log last when the dock is stacked on a short portrait', () => {
    const next = planFeltCollapse({
      opponentRowHeight: FELT_OPPONENT_ROW_PX,
      pendingHeight: FELT_PENDING_NONEMPTY_PX,
      logHeight: 80,
      dockMinHeight: 300,
      incomingDockHeight: 64,
      buttonHeight: FELT_COLLAPSE_BUTTON_PX,
      feltHeight: 340,
      viewportHeight: 390,
      viewportWidth: 360,
    });
    expect(next).toEqual({
      incoming: true,
      actionLog: true,
      opponents: true,
    });
  });
});

describe('landscape leftover log (L53-07)', () => {
  const landscape = {
    opponentRowHeight: FELT_OPPONENT_ROW_PX,
    pendingHeight: FELT_PENDING_NONEMPTY_PX,
    logHeight: 80,
    dockMinHeight: 300,
    incomingDockHeight: 64,
    buttonHeight: FELT_COLLAPSE_BUTTON_PX,
    dockBesideChrome: true,
  };

  it('does not count dock height against left chrome', () => {
    const stacked = planFeltCollapse({
      ...landscape,
      dockBesideChrome: false,
      feltHeight: 330,
    });
    const beside = planFeltCollapse({ ...landscape, feltHeight: 330 });
    expect(stacked.actionLog).toBe(true);
    expect(beside).toEqual({
      incoming: false,
      actionLog: false,
      opponents: false,
    });
  });

  it('keeps the log after opponents collapse so leftover is not an empty slate', () => {
    const next = planFeltCollapse({ ...landscape, feltHeight: 150 });
    expect(next.incoming).toBe(true);
    expect(next.opponents).toBe(true);
    expect(next.actionLog).toBe(false);
  });

  it('collapses the log only when leftover chrome still overflows', () => {
    const next = planFeltCollapse({ ...landscape, feltHeight: 100 });
    expect(next).toEqual({
      incoming: true,
      actionLog: true,
      opponents: true,
    });
  });

  it('keeps the log on a short 6-player landscape felt', () => {
    const next = feltCollapseFromCounts({
      feltHeight: 330,
      opponentCount: 5,
      incomingCount: 0,
      waitingCount: 0,
      specialsCount: 1,
      viewportHeight: 390,
      viewportWidth: 844,
    });
    expect(next.incoming).toBe(true);
    expect(next.opponents).toBe(true);
    expect(next.actionLog).toBe(false);
  });
});
