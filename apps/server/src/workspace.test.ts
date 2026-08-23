import { describe, expect, it } from 'vitest';

import { PROTOCOL_VERSION } from '@card-battle/shared';

describe('workspace wiring', () => {
  it('resolves @card-battle/shared from the server package', () => {
    expect(PROTOCOL_VERSION).toBe(30);
  });
});
