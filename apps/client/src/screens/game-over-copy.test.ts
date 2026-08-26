/**
 * Game-over title / CTA / Excel gate — L45-06 / technical spec v6 §5.4.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  DOWNLOAD_ACTION_LOG_LABEL,
  GAME_OVER_TITLE,
  PLAY_A_REAL_GAME_LABEL,
  RETURN_HOME_LABEL,
  TUTORIAL_COMPLETE_TITLE,
  gameOverLeaveLabel,
  gameOverTitle,
  showActionLogDownload,
} from './game-over-copy';

describe('game-over copy (L45-06)', () => {
  it('titles tutorial finished views Tutorial complete', () => {
    expect(gameOverTitle('tutorial')).toBe(TUTORIAL_COMPLETE_TITLE);
    expect(gameOverTitle('classic')).toBe(GAME_OVER_TITLE);
  });

  it('sends Play a real game to the hub (same onLeave)', () => {
    expect(gameOverLeaveLabel('tutorial')).toBe(PLAY_A_REAL_GAME_LABEL);
    expect(gameOverLeaveLabel('classic')).toBe(RETURN_HOME_LABEL);
  });

  it('hides Download action log unless DEV', () => {
    expect(showActionLogDownload(false)).toBe(false);
    expect(showActionLogDownload(true)).toBe(true);
    expect(DOWNLOAD_ACTION_LOG_LABEL).toBe('Download action log');
  });

  it('gates the Excel button on import.meta.env.DEV', () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(dir, 'game-over-dialog.tsx'), 'utf8');
    expect(source).toContain('import.meta.env.DEV');
    expect(source).toContain('showActionLogDownload');
    expect(source).toContain('gameOverTitle(view.playKind)');
    expect(source).toContain('gameOverLeaveLabel(view.playKind)');
  });
});
