import { matchMaker } from 'colyseus';
import { describe, expect, it } from 'vitest';

import { allowInboxPasswordCorsHeader } from './allow-inbox-cors';

describe('allowInboxPasswordCorsHeader (technical spec v6 §7.3 / L47-05)', () => {
  it('adds X-Inbox-Password to Colyseus OPTIONS Allow-Headers', () => {
    allowInboxPasswordCorsHeader();
    allowInboxPasswordCorsHeader();
    expect(
      matchMaker.controller.DEFAULT_CORS_HEADERS['Access-Control-Allow-Headers'],
    ).toContain('X-Inbox-Password');
    expect(
      matchMaker.controller.DEFAULT_CORS_HEADERS['Access-Control-Allow-Headers'],
    ).toContain('Content-Type');
  });
});
