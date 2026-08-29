import { afterEach, describe, expect, it } from 'vitest';

import {
  emitResourceFlowFlash,
  resetResourceFlowFlashForTests,
  subscribeResourceFlowFlash,
} from './resource-flow-flash';

describe('resource flow flash (L51-16)', () => {
  afterEach(() => {
    resetResourceFlowFlashForTests();
  });

  it('delivers a public loss to a live subscriber (unspied livesLost)', () => {
    const seen: number[] = [];
    const stop = subscribeResourceFlowFlash('opp', 'life', (delta) => {
      seen.push(delta);
    });
    emitResourceFlowFlash('opp', 'life', -2);
    expect(seen).toEqual([-2]);
    stop();
  });

  it('drains queued deltas when the icon subscribes after emit', () => {
    emitResourceFlowFlash('self', 'point', -3);
    emitResourceFlowFlash('self', 'point', 10);
    const seen: number[] = [];
    const stop = subscribeResourceFlowFlash('self', 'point', (delta) => {
      seen.push(delta);
    });
    expect(seen).toEqual([-3, 10]);
    stop();
  });

  it('ignores a zero delta', () => {
    const seen: number[] = [];
    const stop = subscribeResourceFlowFlash('self', 'life', (delta) => {
      seen.push(delta);
    });
    emitResourceFlowFlash('self', 'life', 0);
    expect(seen).toEqual([]);
    stop();
  });
});
