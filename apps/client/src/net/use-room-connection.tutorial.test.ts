/**
 * Tutorial launch intent — L45-04 / technical spec v6 §5.3.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('startTutorialGame (L45-04)', () => {
  it('creates with tutorial true, starts, and never addBot or chooseKit', () => {
    const source = readFileSync(join(dir, 'use-room-connection.ts'), 'utf8');
    const fn = /const startTutorialGame = useCallback\([\s\S]*?\[attachRoom\],\n {2}\);/.exec(
      source,
    )?.[0];

    expect(fn).toBeDefined();
    expect(fn).toContain('tutorial: true');
    expect(fn).toContain('START_GAME');
    expect(fn).not.toContain('ADD_BOT');
    expect(fn).not.toContain('CHOOSE_KIT');
  });
});
