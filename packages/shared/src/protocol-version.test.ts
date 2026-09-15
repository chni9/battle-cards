/**
 * Protocol version pin — L58-02 / PROTOCOL_VERSION 32.
 */

import { describe, expect, it } from 'vitest';

import { PROTOCOL_VERSION } from './protocol-version';

describe('PROTOCOL_VERSION (L58-02)', () => {
  it('is 32', () => {
    expect(PROTOCOL_VERSION).toBe(32);
  });
});
