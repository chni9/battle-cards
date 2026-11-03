/** Home copy: technical spec v7 §10.1 (Online Create helper, L57-11); L76-03. */
import { describe, expect, it } from 'vitest';

import { ONLINE_CREATE_HELPER } from './home-copy';

describe('Home copy (spec v7 §10.1, L76-03)', () => {
  it('tells the host to start once every guest is Ready', () => {
    expect(ONLINE_CREATE_HELPER).toBe('Host gets a code to share. Start from the lobby once every guest is Ready.');
  });
});
