/** Avatar initials by grapheme (Intl.Segmenter). Escape sequences only: ui/ ships no emoji. */
import { describe, expect, it } from 'vitest';
import { avatarInitial } from './avatar-initial';

describe('avatarInitial', () => {
  it('uppercases the first grapheme of the trimmed name', () => {
    expect(avatarInitial('ada')).toBe('A');
    expect(avatarInitial('  bob')).toBe('B');
  });

  it('keeps a combining mark with its letter', () => {
    expect(avatarInitial('e\u0301lodie')).toBe('E\u0301');
  });

  it('keeps a multi-code-point grapheme whole', () => {
    expect(avatarInitial('\u{1F44D}\u{1F3FD}x')).toBe('\u{1F44D}\u{1F3FD}');
  });

  it('returns "?" for an empty or blank name', () => {
    expect(avatarInitial('')).toBe('?');
    expect(avatarInitial('   ')).toBe('?');
  });
});
