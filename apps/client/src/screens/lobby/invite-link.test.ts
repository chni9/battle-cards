/** The invite link: technical spec v7 §7.1, §7.2, Q28; Part 2 Review Focus 4 (L76-17). */
import { describe, expect, it } from 'vitest';

import { INVITE_CODE_LENGTH, inviteLink, parseInviteCode, searchWithoutInviteCode } from './invite-link';

describe('invite link (L76-17)', () => {
  it('builds the root URL with the code', () => {
    expect(inviteLink('https://cards.example', 'ABCDEF')).toBe('https://cards.example/?code=ABCDEF');
    expect(inviteLink('http://localhost:5173', 'QWERTY')).toBe('http://localhost:5173/?code=QWERTY');
  });

  it('reads ?code= uppercased and capped at 6, with no character filter; a missing or empty code is null (Review Focus 4)', () => {
    expect(INVITE_CODE_LENGTH).toBe(6);
    expect(parseInviteCode('?code=abcdefgh')).toBe('ABCDEF');
    expect(parseInviteCode('?code=ab')).toBe('AB');
    expect(parseInviteCode('?ui=next&code=x1-y')).toBe('X1-Y');
    expect(parseInviteCode('?code=')).toBeNull();
    expect(parseInviteCode('?ui=next')).toBeNull();
    expect(parseInviteCode('')).toBeNull();
  });

  it('strips only the code from the search string', () => {
    expect(searchWithoutInviteCode('?code=ABCDEF')).toBe('');
    expect(searchWithoutInviteCode('?code=ABCDEF&ui=next')).toBe('?ui=next');
    expect(searchWithoutInviteCode('?ui=next')).toBe('?ui=next');
    expect(searchWithoutInviteCode('')).toBe('');
  });
});
