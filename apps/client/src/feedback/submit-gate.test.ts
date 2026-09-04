import { describe, expect, it } from 'vitest';

import { beginFeedbackSend, endFeedbackSend } from './submit-gate';

describe('feedback submit gate (technical spec v6 §7.1 / L47-03)', () => {
  it('lets only the first click start a POST before paint', () => {
    const inFlight = { current: false };
    const posts: string[] = [];
    const click = (): void => {
      if (!beginFeedbackSend(inFlight)) {
        return;
      }
      posts.push('post');
    };

    click();
    click();
    expect(posts).toEqual(['post']);

    endFeedbackSend(inFlight);
    click();
    expect(posts).toEqual(['post', 'post']);
  });
});
