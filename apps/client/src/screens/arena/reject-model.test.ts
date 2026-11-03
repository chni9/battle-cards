/**
 * Which card springs back after a reject: technical spec v7 §6.6.2, §6.12; Part 2 Review Focus 4 (L74-25).
 */
import { describe, expect, it } from 'vitest';

import type { ActionRejectPayload } from '../../net/use-room-connection';
import { makeCard, makePlayingView, makeSelf } from '../../view-model/test-fixtures';
import { rejectCueFor } from './reject-model';

const REJECT: ActionRejectPayload = { code: 'not-your-turn', message: 'Not your turn.' };
const VIEW = makePlayingView({ self: makeSelf({ hand: [makeCard('spy')], specialCards: [makeCard('poison')] }) });

describe('rejectCueFor (L74-25)', () => {
  it('names the held card the last send spent when no state update came since, hand or specials', () => {
    expect(rejectCueFor({ instanceId: 'spy-1', view: VIEW }, VIEW, REJECT)).toEqual({ instanceId: 'spy-1', reject: REJECT });
    expect(rejectCueFor({ instanceId: 'poison-1', view: VIEW }, VIEW, REJECT)).toEqual({ instanceId: 'poison-1', reject: REJECT });
  });
  it('is null with no send, a send that spent no card (Draw), or a card no longer held', () => {
    expect(rejectCueFor(null, VIEW, REJECT)).toBeNull();
    expect(rejectCueFor({ instanceId: null, view: VIEW }, VIEW, REJECT)).toBeNull();
    expect(rejectCueFor({ instanceId: 'gone-1', view: VIEW }, VIEW, REJECT)).toBeNull();
  });
  it('is null once a state update arrived after the send: that send was accepted', () => {
    expect(rejectCueFor({ instanceId: 'spy-1', view: VIEW }, { ...VIEW }, REJECT)).toBeNull();
  });
});
