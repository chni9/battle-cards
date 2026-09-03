/**
 * Game-over chrome — L45-06 / technical spec v6 §5.4.
 * Tutorial complete stays on the same finished view; the CTA still calls `onLeave` (hub).
 */

import type { PlayKind } from '@card-battle/shared';

export const TUTORIAL_COMPLETE_TITLE = 'Tutorial complete';
export const PLAY_A_REAL_GAME_LABEL = 'Play a real game';
export const GAME_OVER_TITLE = 'Game over';
export const RETURN_HOME_LABEL = 'Return home';
export const FEEDBACK_LABEL = 'Feedback';
export const DOWNLOAD_ACTION_LOG_LABEL = 'Download action log';

export function gameOverTitle(playKind: PlayKind): string {
  return playKind === 'tutorial' ? TUTORIAL_COMPLETE_TITLE : GAME_OVER_TITLE;
}

export function gameOverLeaveLabel(playKind: PlayKind): string {
  return playKind === 'tutorial' ? PLAY_A_REAL_GAME_LABEL : RETURN_HOME_LABEL;
}

/** Excel download is DEV-only in every mode (spec §5.4). */
export function showActionLogDownload(isDev: boolean): boolean {
  return isDev;
}
