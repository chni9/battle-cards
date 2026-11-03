// @vitest-environment happy-dom
/**
 * Home, rendered: technical spec v7 §7.1, §7.7, §12.1, §12.2; Appendix A `home-hub`, `home-beta-badge`,
 * `home-whats-new`, `home-whats-new-dismiss`, `home-whats-new-seen-storage`, `home-how-to-play-soft-gate`,
 * `home-how-to-play-dismiss`, `home-feedback-dialog`, `global-feedback-entry-points`, `home-online-path`,
 * `home-tutorial-path`, `home-solo-path`, `solo-menu-rules`, `home-forms-enter-submit`,
 * `home-connection-status-and-errors`, `global-status-labels`, `global-visual-viewport-fit`,
 * `legacy-inbox-redirect` (L76-01). Replaces the four `screens/home.*.test.ts` source-text splits and
 * the `home.tsx` reads of `whats-new-dialog.test.ts`.
 */
import { defaultLobbyRules, latestReleaseNote, PROTOCOL_VERSION, RELEASE_NOTES, type FeedbackSubmitBody } from '@card-battle/shared';
import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { HINTS_STORAGE_KEY, HOW_TO_PLAY_SEEN_KEY, readHintState } from '../../ui/help-storage';
import { LAST_SEEN_RELEASE_ID_KEY } from '../../ui/release-storage';
import { KIT_PICKER_LEAD } from '../kit-pick-copy';
import type { SoloMenuSeed } from '../solo-menu-seed';
import { STATUS_LABELS } from '../status-labels';
import { ONLINE_CREATE_HELPER } from './home-copy';
import { HomeScreen, type HomeScreenProps } from './home-screen';
import { closeHomeDialog, enterHomePath, expectNoHomeIntent, HOME_PATH_LABEL, HOME_PATHS, makeHomeProps, seedHomeStorage } from './test-home';

const feedback = vi.hoisted(() => ({
  submit: vi.fn<(body: FeedbackSubmitBody) => Promise<{ ok: true } | { ok: false; message: string }>>(),
}));
vi.mock('../../feedback/submit-feedback', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../feedback/submit-feedback')>()),
  submitFeedback: feedback.submit,
}));

const SEEN = { howToPlaySeen: true, whatsNewSeen: true } as const;
const HUB_BUTTONS = ['Play online', 'Play solo', 'Tutorial', 'How to play', 'Feedback'];
const SEED: SoloMenuSeed = {
  opponentCount: 3, difficulty: 'hard', kitSelection: 'assassin',
  lobbyRules: { excludedKitIds: ['ghost'], randomOnly: false, turnTimeSeconds: 90 },
};

function renderHome(overrides: Partial<HomeScreenProps> = {}) {
  const props = makeHomeProps(overrides);
  return { ...renderUi(<HomeScreen {...props} />, { reducedMotion: true }), props };
}
const main = (): HTMLElement => screen.getByRole('main');
const title = (): string => screen.getByRole('heading', { level: 1 }).textContent;
const isEnabled = (name: string): boolean => !screen.getByRole('button', { name }).hasAttribute('disabled');
const whatsNew = (): HTMLElement | null => screen.queryByRole('dialog', { name: "What's new" });
const scopeOf = (dialog: HTMLElement | null): string | null | undefined =>
  dialog?.querySelector('[data-whats-new-scope]')?.getAttribute('data-whats-new-scope');
const releaseIds = (dialog: HTMLElement): (string | null)[] =>
  Array.from(dialog.querySelectorAll('[data-release-id]'), (node) => node.getAttribute('data-release-id'));

beforeEach(() => {
  localStorage.clear();
  feedback.submit.mockReset();
  feedback.submit.mockResolvedValue({ ok: true });
});

describe('Home hub (spec v7 §7.1; L42-04, L51-03)', () => {
  it('shows no status line and no alert on the idle hub', () => {
    seedHomeStorage(SEEN);
    renderHome();
    expect(title()).toBe('Card Battle');
    for (const copy of [...Object.values(STATUS_LABELS), 'Starting solo game…']) expect(screen.queryByText(copy)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(HUB_BUTTONS.filter((name) => !isEnabled(name))).toEqual([]);
  });

  it('never shows /admin, /inbox, Inbox, Admin, a protocol version or Reset help on the hub or any path', async () => {
    seedHomeStorage(SEEN);
    const { user } = renderHome();
    for (const target of [null, ...HOME_PATHS]) {
      if (target !== null) await enterHomePath(user, target);
      expect(main().querySelector('a')).toBeNull();
      expect(main().textContent).not.toMatch(/admin|inbox|protocol v|reset help/i);
      expect(screen.queryByRole('button', { name: /admin|inbox|reset help/i })).toBeNull();
      if (target !== null) await user.click(screen.getByRole('button', { name: 'Back' }));
    }
  });

  it('locks every hub button while connecting, shows Connecting…, and leaves New live', () => {
    seedHomeStorage(SEEN);
    renderHome({ status: 'connecting' });
    expect(screen.getByText(STATUS_LABELS.connecting)).toBeTruthy();
    expect(HUB_BUTTONS.filter(isEnabled)).toEqual([]);
    // Today New stays live while busy; L76-04 disables it during a solo launch (spec v7 §11, Q8).
    expect(isEnabled("What's new")).toBe(true);
  });

  it('shows a failure as Could not join with an alert under the hub title, and keeps it on a path', async () => {
    seedHomeStorage(SEEN);
    const { user } = renderHome({ status: 'failed', error: 'room "ABCDEF" not found' });
    expect(screen.getByText(STATUS_LABELS.failed)).toBeTruthy();
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('room "ABCDEF" not found');
    expect(screen.getByRole('heading', { level: 1 }).compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    await enterHomePath(user, 'online');
    expect(screen.getByRole('alert').textContent).toBe('room "ABCDEF" not found');
  });

  it('keeps Starting solo game… off the Online header and shows it on the Tutorial header', async () => {
    seedHomeStorage(SEEN);
    const props = makeHomeProps();
    const { user, rerender } = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
    await enterHomePath(user, 'online');
    rerender(<HomeScreen {...props} soloLaunchPending />);
    expect(screen.queryByText('Starting solo game…')).toBeNull();
    rerender(<HomeScreen {...props} />);
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await enterHomePath(user, 'tutorial');
    rerender(<HomeScreen {...props} soloLaunchPending />);
    expect(screen.getByText('Starting solo game…')).toBeTruthy();
  });
});

describe('How to play soft gate (spec v7 §7.1; L42-02, L51-02)', () => {
  it('opens How to play on the first path click while unseen, and enters nothing yet', async () => {
    seedHomeStorage({ howToPlaySeen: false, whatsNewSeen: true });
    const { user, props } = renderHome();
    await user.click(screen.getByRole('button', { name: 'Play online' }));
    expect(screen.getByRole('dialog', { name: 'How to play' })).toBeTruthy();
    expect(title()).toBe('Card Battle');
    expect(localStorage.getItem(HOW_TO_PLAY_SEEN_KEY)).toBeNull();
    expectNoHomeIntent(props);
  });

  it.each([['Skip', 'online'], ['Got it', 'solo'], ['Escape', 'tutorial'], ['backdrop', 'online']] as const)(
    'a gated %s marks How to play seen and enters %s', async (way, target) => {
      seedHomeStorage({ howToPlaySeen: false, whatsNewSeen: true });
      const { user, props } = renderHome();
      await user.click(screen.getByRole('button', { name: HOME_PATH_LABEL[target] }));
      await closeHomeDialog(user, 'How to play', way);
      expect(localStorage.getItem(HOW_TO_PLAY_SEEN_KEY)).toBe('1');
      expect(title()).toBe(HOME_PATH_LABEL[target]);
      expectNoHomeIntent(props);
    });

  it('enters a path directly once How to play is seen', async () => {
    seedHomeStorage(SEEN);
    const { user } = renderHome();
    await user.click(screen.getByRole('button', { name: 'Play solo' }));
    expect(title()).toBe('Play solo');
    expect(screen.queryByRole('dialog', { name: 'How to play' })).toBeNull();
  });

  it.each([['Skip', '1'], ['Got it', '1'], ['Escape', null], ['backdrop', null]] as const)(
    'a manual %s close leaves the seen key at %s and stays on the hub', async (way, stored) => {
      seedHomeStorage({ howToPlaySeen: false, whatsNewSeen: true });
      const { user, props } = renderHome();
      await user.click(screen.getByRole('button', { name: 'How to play' }));
      await closeHomeDialog(user, 'How to play', way);
      expect(localStorage.getItem(HOW_TO_PLAY_SEEN_KEY)).toBe(stored);
      expect(title()).toBe('Card Battle');
      expectNoHomeIntent(props);
    });

  it("never re-checks What's new after a gated close", async () => {
    seedHomeStorage({ howToPlaySeen: false, whatsNewSeen: true });
    const { user, props } = renderHome();
    localStorage.removeItem(LAST_SEEN_RELEASE_ID_KEY); // the latest entry is unseen from here on
    await user.click(screen.getByRole('button', { name: 'Play online' }));
    await closeHomeDialog(user, 'How to play', 'Skip');
    expect(whatsNew()).toBeNull();
    expectNoHomeIntent(props);
  });

  it("re-checks What's new after a manual close", async () => {
    seedHomeStorage(SEEN);
    const { user, props } = renderHome();
    localStorage.removeItem(LAST_SEEN_RELEASE_ID_KEY);
    await user.click(screen.getByRole('button', { name: 'How to play' }));
    await closeHomeDialog(user, 'How to play', 'Escape');
    expect(scopeOf(whatsNew())).toBe('current');
    expectNoHomeIntent(props);
  });
});

describe("What's new (spec v7 §7.1; L63-07, L65-05)", () => {
  it('auto-opens only the latest entry when it is unseen, under an unread New', () => {
    seedHomeStorage({ howToPlaySeen: false, whatsNewSeen: false }); // How to play never blocks it
    const { props } = renderHome();
    const dialog = screen.getByRole('dialog', { name: "What's new" });
    expect(scopeOf(dialog)).toBe('current');
    expect(releaseIds(dialog)).toEqual([latestReleaseNote().id]);
    for (const item of latestReleaseNote().items) {
      expect(dialog.textContent).toContain(item.before);
      expect(dialog.textContent).toContain(item.after);
    }
    expect(screen.getByRole('button', { name: "What's new (unread)" }).querySelector('[data-whats-new-unread]')).not.toBeNull();
    expectNoHomeIntent(props);
  });

  it.each(['Got it', 'Escape', 'backdrop'] as const)(
    'a %s dismissal marks the latest entry seen and clears the unread label and dot', async (way) => {
      seedHomeStorage({ howToPlaySeen: true, whatsNewSeen: false });
      const { user, props } = renderHome();
      await closeHomeDialog(user, "What's new", way);
      expect(localStorage.getItem(LAST_SEEN_RELEASE_ID_KEY)).toBe(latestReleaseNote().id);
      expect(screen.getByRole('button', { name: "What's new" }).querySelector('[data-whats-new-unread]')).toBeNull();
      expectNoHomeIntent(props);
    });

  it('stays closed when the latest entry is seen; New opens every entry, newest first', async () => {
    seedHomeStorage(SEEN);
    const { user, props } = renderHome();
    expect(whatsNew()).toBeNull();
    expect(main().textContent).not.toContain('Super Regeneration'); // no release copy outside RELEASE_NOTES
    const newButton = screen.getByRole('button', { name: "What's new" });
    expect(newButton.querySelector('[data-whats-new-unread]')).toBeNull();
    await user.click(newButton);
    const dialog = screen.getByRole('dialog', { name: "What's new" });
    expect(scopeOf(dialog)).toBe('history');
    expect(releaseIds(dialog)).toEqual(RELEASE_NOTES.map((note) => note.id));
    expect(within(dialog).getByText('Latest')).toBeTruthy();
    expectNoHomeIntent(props);
  });

  it('reopens on the latest entry alone when Back finds it unseen after a history visit', async () => {
    seedHomeStorage(SEEN);
    const { user, props } = renderHome();
    await user.click(screen.getByRole('button', { name: "What's new" }));
    await closeHomeDialog(user, "What's new", 'Got it');
    localStorage.removeItem(LAST_SEEN_RELEASE_ID_KEY);
    await enterHomePath(user, 'online');
    expect(whatsNew()).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    const dialog = screen.getByRole('dialog', { name: "What's new" });
    expect(scopeOf(dialog)).toBe('current');
    expect(releaseIds(dialog)).toEqual([latestReleaseNote().id]);
    expectNoHomeIntent(props);
  });

  it('keeps New beside the Beta badge, outside the hub buttons', () => {
    seedHomeStorage(SEEN);
    renderHome();
    const newButton = screen.getByRole('button', { name: "What's new" });
    expect(screen.getByText('Beta').closest('aside')?.nextElementSibling).toBe(newButton);
    expect(newButton.parentElement).toBe(main());
    expect(screen.getByRole('button', { name: 'Play online' }).closest('section')?.contains(newButton)).toBe(false);
  });
});

describe('Feedback on Home (spec v7 §7.7; L47-03, L57-05)', () => {
  it('opens Feedback in manual mode from the hub, and a send carries screen home and the nickname only', async () => {
    seedHomeStorage(SEEN);
    const { user, props } = renderHome({ nickname: 'Ada' });
    await user.click(screen.getByRole('button', { name: 'Feedback' }));
    const dialog = screen.getByRole('dialog', { name: 'Feedback' });
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(within(dialog).queryByText('Skip is fine.')).toBeNull();
    await user.click(within(dialog).getByRole('button', { name: 'Idea' }));
    await user.type(within(dialog).getByLabelText('Message'), 'More kits');
    await user.click(within(dialog).getByRole('button', { name: 'Send' }));
    expect(feedback.submit.mock.calls).toEqual([[
      { kind: 'idea', message: 'More kits', screen: 'home', protocolVersion: PROTOCOL_VERSION, topics: [], nickname: 'Ada' },
    ]]);
    await waitFor(() => { expect(screen.queryByRole('dialog', { name: 'Feedback' })).toBeNull(); });
    expectNoHomeIntent(props);
  });

  it.each(HOME_PATHS)('opens the same Feedback from the %s path header', async (target) => {
    seedHomeStorage(SEEN);
    const { user, props } = renderHome({ nickname: 'Ada' });
    await enterHomePath(user, target);
    await user.click(screen.getByRole('button', { name: 'Feedback' }));
    await closeHomeDialog(user, 'Feedback', 'Cancel');
    expect(feedback.submit).not.toHaveBeenCalled();
    expectNoHomeIntent(props);
  });
});

describe('Online path (spec v7 §7.1; L57-07)', () => {
  it('uppercases the code as typed and caps it at 6 characters', async () => {
    seedHomeStorage(SEEN);
    const { user, props } = renderHome();
    await enterHomePath(user, 'online');
    const code = screen.getByLabelText('Game code');
    expect(code.getAttribute('maxlength')).toBe('6');
    await user.type(code, 'q');
    expect(props.onJoinCodeChange).toHaveBeenCalledWith('Q');
  });

  it('enables Create with a nickname, and Join only with a nickname and a 6-character code', async () => {
    seedHomeStorage(SEEN);
    const props = makeHomeProps();
    const { user, rerender } = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
    await enterHomePath(user, 'online');
    const cases = [['', '', false, false], ['Ada', 'ABCDE', true, false], ['   ', 'ABCDEF', false, false], ['Ada', 'ABCDEF', true, true]] as const;
    for (const [nickname, joinCode, create, join] of cases) {
      rerender(<HomeScreen {...props} nickname={nickname} joinCode={joinCode} />);
      expect([isEnabled('Create'), isEnabled('Join')]).toEqual([create, join]);
    }
    rerender(<HomeScreen {...props} nickname="Ada" joinCode="ABCDEF" status="connecting" />);
    expect([isEnabled('Create'), isEnabled('Join')]).toEqual([false, false]);
    rerender(<HomeScreen {...props} nickname="Ada" joinCode="ABCDEF" />);
    await user.click(screen.getByRole('button', { name: 'Join' }));
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(props.onJoin).toHaveBeenCalledTimes(1);
    expect(props.onCreate).toHaveBeenCalledTimes(1);
  });

  it('submits Join on Enter in the code field only when Join is enabled; Enter in Nickname sends nothing', async () => {
    seedHomeStorage(SEEN);
    const props = makeHomeProps({ nickname: 'Ada', joinCode: 'ABCDE' });
    const { user, rerender } = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
    await enterHomePath(user, 'online');
    await user.type(screen.getByLabelText('Game code'), '{Enter}');
    expect(props.onJoin).not.toHaveBeenCalled();
    rerender(<HomeScreen {...props} joinCode="ABCDEF" />);
    await user.type(screen.getByLabelText('Nickname'), '{Enter}');
    expectNoHomeIntent(props);
    await user.type(screen.getByLabelText('Game code'), '{Enter}');
    expect(props.onJoin).toHaveBeenCalledTimes(1);
  });
});

describe('Solo path (spec v7 §7.1; L17-01, L67-01, Lot 70)', () => {
  it('starts a default solo game: 1 opponent, Normal, Random, default rules, no clock', async () => {
    seedHomeStorage(SEEN);
    const { user, props } = renderHome({ nickname: 'Ada' });
    await enterHomePath(user, 'solo');
    await user.click(screen.getByRole('button', { name: 'Start solo game' }));
    expect(vi.mocked(props.onStartSolo).mock.calls).toEqual([[1, 'normal', 'random', { lobbyRules: defaultLobbyRules(), includeTurnTime: false }]]);
    expect([props.onCreate, props.onJoin, props.onStartTutorial].map((fn) => vi.mocked(fn).mock.calls.length)).toEqual([0, 0, 0]);
  });

  it('opens on the solo path from a Play again seed, applies it once and launches with it', async () => {
    seedHomeStorage(SEEN);
    const { user, props } = renderHome({ nickname: 'Ada', soloMenuSeed: SEED });
    expect(title()).toBe('Play solo');
    expect(props.onSoloMenuSeedApplied).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Start solo game' }));
    expect(vi.mocked(props.onStartSolo).mock.calls).toEqual([[3, 'hard', 'assassin', { lobbyRules: SEED.lobbyRules, includeTurnTime: true }]]);
  });

  it('locks the solo menu while the launch is pending', () => {
    seedHomeStorage(SEEN);
    renderHome({ nickname: 'Ada', soloMenuSeed: SEED, soloLaunchPending: true });
    expect(screen.getByText('Starting solo game…')).toBeTruthy();
    expect(['Back', 'Feedback', '1', '7', 'Easy', 'Normal', 'Hard', 'Choose kit', 'Start solo game'].filter(isEnabled)).toEqual([]);
    expect(screen.getByLabelText('Nickname').hasAttribute('disabled')).toBe(true);
  });
});

describe('Tutorial path (spec v7 §7.1; L45-04, L46-03)', () => {
  it('starts the tutorial through the gate without writing hint storage', async () => {
    seedHomeStorage({ howToPlaySeen: false, whatsNewSeen: true });
    const { user, props } = renderHome({ nickname: 'Ada' });
    await user.click(screen.getByRole('button', { name: 'Tutorial' }));
    await closeHomeDialog(user, 'How to play', 'Skip');
    await user.click(screen.getByRole('button', { name: 'Start tutorial' }));
    expect(vi.mocked(props.onStartTutorial).mock.calls).toEqual([[]]);
    expect(localStorage.getItem(HINTS_STORAGE_KEY)).toBeNull();
    expect(readHintState().skipAll).toBe(false);
    expect([props.onCreate, props.onJoin, props.onStartSolo].map((fn) => vi.mocked(fn).mock.calls.length)).toEqual([0, 0, 0]);
  });
});

describe('Home layout (L53-07)', () => {
  it('keeps main as the scroll container with no 100dvh on the hub or any path', async () => {
    seedHomeStorage(SEEN);
    const { user, container } = renderHome();
    for (const target of [null, ...HOME_PATHS]) {
      if (target !== null) await enterHomePath(user, target);
      expect(['overflow-y-auto', 'overscroll-contain', 'overflow-hidden'].map((token) => main().classList.contains(token))).toEqual([true, true, false]);
      expect(container.innerHTML).not.toContain('100dvh');
      if (target !== null) await user.click(screen.getByRole('button', { name: 'Back' }));
    }
  });
});

describe('Lot 76 copy (spec v7 §10.1, L76-03)', () => {
  it('tells the host on Online to start once every guest is Ready', async () => {
    seedHomeStorage(SEEN);
    const { user } = renderHome();
    await enterHomePath(user, 'online');
    expect(screen.getByText(ONLINE_CREATE_HELPER)).toBeTruthy();
    expect(main().textContent).not.toContain('when everyone is seated');
  });

  it('says on the solo kit block who can see your kit', async () => {
    seedHomeStorage(SEEN);
    const { user } = renderHome();
    await enterHomePath(user, 'solo');
    expect(screen.getByText(KIT_PICKER_LEAD)).toBeTruthy();
  });
});
