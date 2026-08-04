import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { gainPoints } from './gain-points';
import { gainUpgradePoints } from './gain-upgrade-points';

const SERVER_SRC_ROOT = fileURLToPath(new URL('../..', import.meta.url));

const ALLOWED_POINTS_INCREMENT_FILES = new Set([
  'engine/economy/gain-points.ts',
]);

const ALLOWED_UPGRADE_POINTS_INCREMENT_FILES = new Set([
  'engine/economy/gain-upgrade-points.ts',
]);

function collectProductionTsFiles(directory: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectProductionTsFiles(absolutePath));
      continue;
    }

    if (!entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts')) {
      continue;
    }

    files.push(absolutePath);
  }

  return files;
}

function relativeServerPath(absolutePath: string): string {
  return relative(SERVER_SRC_ROOT, absolutePath).replaceAll('\\', '/');
}

describe('gainPoints / gainUpgradePoints — primitives (technical spec v4 §4.2)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  function player() {
    const state = createInitialState({ seats, seed: 'gain-primitives' });
    const entry = state.players[0];

    if (entry === undefined) {
      throw new Error('missing player');
    }

    return entry;
  }

  it('gainPoints increments player points', () => {
    const target = player();
    target.points = 5;

    gainPoints(target, 3, 'direct');

    expect(target.points).toBe(8);
  });

  it('gainUpgradePoints increments player upgrade points', () => {
    const target = player();
    target.upgradePoints = 1;

    gainUpgradePoints(target, 2, 'direct');

    expect(target.upgradePoints).toBe(3);
  });

  it('rejects negative point gains', () => {
    const target = player();

    expect(() => {
      gainPoints(target, -1, 'direct');
    }).toThrow(RangeError);
  });

  it('rejects negative upgrade point gains', () => {
    const target = player();

    expect(() => {
      gainUpgradePoints(target, -1, 'direct');
    }).toThrow(RangeError);
  });

  it('no production file outside the primitives mutates points with +=', () => {
    const violations: string[] = [];
    const pattern = /\.points\s*\+=/;

    for (const file of collectProductionTsFiles(SERVER_SRC_ROOT)) {
      const relativePath = relativeServerPath(file);

      if (ALLOWED_POINTS_INCREMENT_FILES.has(relativePath)) {
        continue;
      }

      const content = readFileSync(file, 'utf8');

      if (pattern.test(content)) {
        violations.push(relativePath);
      }
    }

    expect(violations).toEqual([]);
  });

  it('no production file outside the primitives mutates upgradePoints with +=', () => {
    const violations: string[] = [];
    const pattern = /\.upgradePoints\s*\+=/;

    for (const file of collectProductionTsFiles(SERVER_SRC_ROOT)) {
      const relativePath = relativeServerPath(file);

      if (ALLOWED_UPGRADE_POINTS_INCREMENT_FILES.has(relativePath)) {
        continue;
      }

      const content = readFileSync(file, 'utf8');

      if (pattern.test(content)) {
        violations.push(relativePath);
      }
    }

    expect(violations).toEqual([]);
  });
});
