import { describe, expect, it } from 'vitest';

import { buildViewFor } from './build-view-for';

describe('buildViewFor (technical spec §5.1, golden rule 4)', () => {
  it('tells the recipient which session is theirs', () => {
    const view = buildViewFor('session-b', ['session-a', 'session-b']);

    expect(view.you).toBe('session-b');
  });

  it('lists everyone connected, which is public information', () => {
    const view = buildViewFor('session-a', ['session-a', 'session-b', 'session-c']);

    expect(view.connected).toEqual(['session-a', 'session-b', 'session-c']);
  });

  it('builds a different view for each recipient of the same room', () => {
    const connected = ['session-a', 'session-b'];

    expect(buildViewFor('session-a', connected)).not.toEqual(buildViewFor('session-b', connected));
  });

  it('never shares the room list with the view it returns', () => {
    const connected = ['session-a'];
    const view = buildViewFor('session-a', connected);

    expect(view.connected).not.toBe(connected);
  });

  it('refuses to build a view for someone who is not in the room', () => {
    expect(() => buildViewFor('intruder', ['session-a'])).toThrow(/not in the room/);
  });
});
