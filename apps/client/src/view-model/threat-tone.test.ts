import { describe, expect, it } from 'vitest';

import { threatToneFor } from './threat-tone';

describe('threatToneFor (L39-05)', () => {
  it('marks shared and special attacks as attack tone', () => {
    expect(threatToneFor('basic-attack')).toBe('attack');
    expect(threatToneFor('strong-attack')).toBe('attack');
    expect(threatToneFor('super-attack')).toBe('attack');
    expect(threatToneFor('mega-attack')).toBe('attack');
  });

  it('marks Sentence / Mirror / Super Mirror as attack tone', () => {
    expect(threatToneFor('sentence')).toBe('attack');
    expect(threatToneFor('mirror')).toBe('attack');
    expect(threatToneFor('super-mirror')).toBe('attack');
  });

  it('marks other Incoming cards as effect tone', () => {
    expect(threatToneFor('tax')).toBe('effect');
    expect(threatToneFor('thief')).toBe('effect');
    expect(threatToneFor('spy')).toBe('effect');
    expect(threatToneFor('suicide')).toBe('effect');
  });
});
