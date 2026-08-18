/**
 * Fallback log classification — L36-02.
 */

import { describe, expect, it, vi } from 'vitest';

import {
  classifyWorkerFailure,
  FALLBACK_LOG_PREFIX,
  FALLBACK_STAGES,
  logBotFallback,
} from './fallback-log';

describe('fallback-log (L36-02)', () => {
  it('classifies timeout, illegal, and crash messages', () => {
    expect(classifyWorkerFailure(new Error('search worker timed out after 900ms'))).toBe(
      'worker_timeout',
    );
    expect(classifyWorkerFailure(new Error('worker returned illegal action'))).toBe(
      'illegal_action',
    );
    expect(classifyWorkerFailure(new Error('search worker exited with code 1'))).toBe(
      'worker_crash',
    );
  });

  it('emits a greppable line per stage', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    for (const stage of FALLBACK_STAGES) {
      logBotFallback(stage);
    }

    expect(warn.mock.calls.map((call) => String(call[0]))).toEqual(
      FALLBACK_STAGES.map((stage) => `${FALLBACK_LOG_PREFIX}.${stage}`),
    );
    warn.mockRestore();
  });
});
