/**
 * Test-only builders for Home component tests (Lot 76 plan Appendix A.3). Shipped code never imports
 * this file. `closeHomeDialog` finds the backdrop of the V7 Sheet / Dialog (`sheet-overlay`): every
 * Home dialog is one since L76-07.
 * 'swipe' needs `stubPhoneViewport()` (L76-05).
 */
import { latestReleaseNote } from '@card-battle/shared';
import { screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { expect, vi } from 'vitest';

import { swipeSheetDown } from '../../test/sheet-gestures';
import { HOW_TO_PLAY_SEEN_KEY, type HowToPlayContinueTarget } from '../../ui/help-storage';
import { LAST_SEEN_RELEASE_ID_KEY } from '../../ui/release-storage';
import type { HomeScreenProps } from './home-screen';

export const HOME_INTENT_PROPS = ['onCreate', 'onJoin', 'onStartSolo', 'onStartTutorial'] as const;
export const HOME_PATHS = ['online', 'solo', 'tutorial'] as const satisfies readonly HowToPlayContinueTarget[];
/** The hub tile and the path title carry the same label today (spec v7 §10.6). */
export const HOME_PATH_LABEL: Readonly<Record<HowToPlayContinueTarget, string>> = {
  online: 'Play online', solo: 'Play solo', tutorial: 'Tutorial',
};
export type HomeDialogClose = 'Skip' | 'Got it' | 'Cancel' | 'Escape' | 'backdrop' | 'swipe';

/** Idle Home with no room: empty nickname and code, every callback a `vi.fn()`, no seed. */
export function makeHomeProps(overrides: Partial<HomeScreenProps> = {}): HomeScreenProps {
  return {
    nickname: '', joinCode: '', status: 'idle', error: null, soloLaunchPending: false,
    onNicknameChange: vi.fn(), onJoinCodeChange: vi.fn(), onCreate: vi.fn(), onJoin: vi.fn(),
    onStartSolo: vi.fn(), onStartTutorial: vi.fn(), onSoloMenuSeedApplied: vi.fn(),
    ...overrides,
  };
}

/** The commit rule: no Home intent was called (opening or closing a dialog sends nothing). */
export function expectNoHomeIntent(props: HomeScreenProps): void {
  for (const name of HOME_INTENT_PROPS) {
    const fn = props[name];
    if (vi.isMockFunction(fn)) expect(fn).not.toHaveBeenCalled();
  }
}

/** Home reads both keys at mount: call this before `renderUi`. Clears every other key. */
export function seedHomeStorage(seen: { readonly howToPlaySeen: boolean; readonly whatsNewSeen: boolean }): void {
  localStorage.clear();
  if (seen.howToPlaySeen) localStorage.setItem(HOW_TO_PLAY_SEEN_KEY, '1');
  if (seen.whatsNewSeen) localStorage.setItem(LAST_SEEN_RELEASE_ID_KEY, latestReleaseNote().id);
}

/** Clicks the hub tile (How to play already seen) and checks the path title. */
export async function enterHomePath(user: UserEvent, target: HowToPlayContinueTarget): Promise<void> {
  await user.click(screen.getByRole('button', { name: HOME_PATH_LABEL[target] }));
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(HOME_PATH_LABEL[target]);
}

/** Closes the named dialog one way (a footer button, Esc, the backdrop or a swipe-down) and waits until it leaves the DOM. */
export async function closeHomeDialog(user: UserEvent, name: string, way: HomeDialogClose): Promise<void> {
  const dialog = screen.getByRole('dialog', { name });
  if (way === 'Escape') {
    await user.keyboard('{Escape}');
  } else if (way === 'swipe') {
    swipeSheetDown(dialog);
  } else if (way === 'backdrop') {
    const overlay = dialog.closest<HTMLElement>('[data-zone="sheet-overlay"]');
    if (overlay === null) throw new Error(`${name} has no backdrop`);
    await user.click(overlay);
  } else {
    await user.click(within(dialog).getByRole('button', { name: way }));
  }
  await waitFor(() => { expect(screen.queryByRole('dialog', { name, hidden: true })).toBeNull(); });
}
