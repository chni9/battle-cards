/**
 * Home connection copy — technical spec v6 §5.1 / L42-04.
 */

import { describe, expect, it } from 'vitest';

import { homeStatusCopy, STATUS_LABELS } from './status-labels';

describe('homeStatusCopy (technical spec v6 §5.1)', () => {
  it('leaves idle unlabeled so the hub does not alarm', () => {
    expect(homeStatusCopy('idle', false)).toBeNull();
    expect(STATUS_LABELS.idle).toBe('Not connected');
  });

  it('keeps connecting, error-path, and solo-launch copy', () => {
    expect(homeStatusCopy('connecting', false)).toBe('Connecting…');
    expect(homeStatusCopy('failed', false)).toBe('Could not join');
    expect(homeStatusCopy('idle', true)).toBe('Starting solo game…');
  });
});
