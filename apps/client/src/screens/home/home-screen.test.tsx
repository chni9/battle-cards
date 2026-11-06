// @vitest-environment happy-dom
/**
 * Home, rendered: technical spec v7 §7.1, §7.7, §12.1, §12.2; Appendix A `home-hub`, `home-beta-badge`,
 * `home-whats-new`, `home-whats-new-dismiss`, `home-whats-new-seen-storage`, `home-how-to-play-soft-gate`,
 * `home-how-to-play-dismiss`, `home-feedback-dialog`, `global-feedback-entry-points`, `home-online-path`,
 * `home-tutorial-path`, `home-solo-path`, `solo-menu-rules`, `home-forms-enter-submit`,
 * `home-connection-status-and-errors`, `global-status-labels`, `global-visual-viewport-fit`,
 * `legacy-inbox-redirect`, `home-path-header`, `global-motion-reduced-motion`, `global-art-catalog`,
 * `global-dialog-button-primitives` (L76-01, L76-04). Replaces the four `screens/home.*.test.ts`
 * source-text splits and the `home.tsx` reads of `whats-new-dialog.test.ts`.
 */
import { defaultLobbyRules, latestReleaseNote, PROTOCOL_VERSION, RELEASE_NOTES, type FeedbackSubmitBody } from '@card-battle/shared';
import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { stubPhoneViewport, swipeCarouselTo } from '../../test/sheet-gestures';
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
afterEach(() => { vi.unstubAllGlobals(); });

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
    // Only a solo launch disables New (spec v7 §11, §13 Q8; L76-04): an online connect leaves it live.
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

  it('disables New during a solo launch, keeps its unread name and dot, and frees it after (§11, Q8)', () => {
    seedHomeStorage({ howToPlaySeen: true, whatsNewSeen: false });
    const props = makeHomeProps({ soloLaunchPending: true });
    const { rerender } = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
    const newButton = screen.getByRole('button', { name: "What's new (unread)" });
    expect(newButton.hasAttribute('disabled')).toBe(true);
    expect(newButton.querySelector('[data-whats-new-unread]')).not.toBeNull();
    expect(HUB_BUTTONS.filter(isEnabled)).toEqual([]);
    expect(screen.getByText('Starting solo game…')).toBeTruthy();
    rerender(<HomeScreen {...props} soloLaunchPending={false} />);
    expect(isEnabled("What's new (unread)")).toBe(true);
    expectNoHomeIntent(props);
  });

  it('shows the V7 hub: the Card Battle wordmark, the Solo, Online and Tutorial tiles, then How to play and Feedback (§7.1)', () => {
    seedHomeStorage(SEEN);
    renderHome();
    const wordmark = screen.getByRole('heading', { level: 1 });
    expect(wordmark.textContent).toBe('Card Battle'); // the accessible name stays; CSS shows CARD BATTLE
    expect(wordmark.classList.contains('uppercase')).toBe(true);
    expect(screen.getByText('Turn-based card battle')).toBeTruthy();
    expect(screen.getByText('New here? Open How to play once, then pick Tutorial, Online, or Solo.')).toBeTruthy();
    // Every button in main, in DOM order: New in the corner, the three tiles, the two secondary buttons, nothing else.
    expect(within(main()).getAllByRole('button').map((button) => button.textContent)).toEqual(
      ['New', 'Play solo', 'Play online', 'Tutorial', 'How to play', 'Feedback'],
    );
    expect(['Play solo', 'Play online', 'Tutorial'].map((name) => screen.getByRole('button', { name }).getAttribute('data-home-tile')))
      .toEqual(['solo', 'online', 'tutorial']);
  });

  it('keeps the card fan aria-hidden on the hub only, and still under reduced motion (§7.1, §8.3)', async () => {
    seedHomeStorage(SEEN);
    // A float starts at y 0, so a mount-time read cannot tell a still fan from a moving one: watch both for one window.
    const FAN_WINDOW_MS = 1_000;
    const floating = (): HTMLElement[] =>
      Array.from(main().querySelectorAll<HTMLElement>('[data-home-fan-card]')).filter((card) => card.style.transform.includes('translate'));
    // Control: at full motion the fan floats (card 0 has no delay), so the probe does see motion.
    const fullMotion = renderUi(<HomeScreen {...makeHomeProps()} />, { reducedMotion: false });
    expect(main().querySelector('[data-home-card-fan]')?.getAttribute('data-motion')).toBe('full');
    await waitFor(() => { expect(floating()).not.toEqual([]); }, { timeout: FAN_WINDOW_MS });
    fullMotion.unmount();
    const { user } = renderHome();
    const fan = main().querySelector<HTMLElement>('[data-home-card-fan]');
    if (fan === null) throw new Error('no card fan');
    expect([fan.getAttribute('aria-hidden'), fan.getAttribute('data-motion')]).toEqual(['true', 'reduced']);
    expect(fan.querySelectorAll('[data-home-fan-card]')).toHaveLength(5);
    expect(within(main()).queryAllByRole('article')).toEqual([]); // the holo cards are hidden from assistive tech
    await new Promise((resolve) => { setTimeout(resolve, FAN_WINDOW_MS); });
    expect(floating()).toEqual([]); // no float offset after the whole window
    await enterHomePath(user, 'online');
    expect(main().querySelector('[data-home-card-fan]')).toBeNull();
  });

  it('names the mode on its transition root and marks reduced motion there (§11 Q7)', async () => {
    seedHomeStorage(SEEN);
    const { user, unmount } = renderHome();
    const modeRoot = (): Element | null => main().querySelector('[data-home-mode]');
    expect([modeRoot()?.getAttribute('data-home-mode'), modeRoot()?.getAttribute('data-motion')]).toEqual(['hub', 'reduced']);
    await enterHomePath(user, 'tutorial');
    expect(modeRoot()?.getAttribute('data-home-mode')).toBe('tutorial');
    unmount();
    renderUi(<HomeScreen {...makeHomeProps()} />, { reducedMotion: false });
    expect(modeRoot()?.getAttribute('data-motion')).toBe('full');
  });

  it.each(HOME_PATHS)('disables Back and Feedback on the %s path while connecting or launching', async (target) => {
    seedHomeStorage(SEEN);
    const props = makeHomeProps({ nickname: 'Ada' });
    const { user, rerender } = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
    await enterHomePath(user, target);
    expect(['Back', 'Feedback'].filter(isEnabled)).toEqual(['Back', 'Feedback']);
    rerender(<HomeScreen {...props} status="connecting" />);
    expect(['Back', 'Feedback'].filter(isEnabled)).toEqual([]);
    rerender(<HomeScreen {...props} soloLaunchPending />);
    expect(['Back', 'Feedback'].filter(isEnabled)).toEqual([]);
    expectNoHomeIntent(props);
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

  it.each(['Got it', 'Escape', 'backdrop', 'swipe'] as const)(
    'a %s dismissal marks the latest entry seen and clears the unread label and dot', async (way) => {
      if (way === 'swipe') stubPhoneViewport(); // the handle exists only on a bottom sheet
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

  it('keeps New beside the Beta badge, outside the hub buttons', async () => {
    seedHomeStorage(SEEN);
    const { user } = renderHome();
    const newButton = screen.getByRole('button', { name: "What's new" });
    expect(screen.getByText('Beta').closest('aside')?.nextElementSibling).toBe(newButton);
    const corner = newButton.parentElement;
    expect(corner?.hasAttribute('data-home-corner')).toBe(true);
    expect(corner?.parentElement).toBe(main());
    expect(screen.getByRole('button', { name: 'Play online' }).closest('section')?.contains(newButton)).toBe(false);
    for (const target of HOME_PATHS) {
      await enterHomePath(user, target);
      const pathCorner = main().querySelector('[data-home-corner]');
      expect(pathCorner?.contains(screen.getByText('Beta'))).toBe(true);
      expect(pathCorner?.contains(screen.getByRole('button', { name: "What's new" }))).toBe(true);
      await user.click(screen.getByRole('button', { name: 'Back' }));
    }
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
    await user.click(within(dialog).getByRole('radio', { name: 'Idea' }));
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
    expect(['Back', 'Feedback', 'Choose kit', 'Start solo game'].filter(isEnabled)).toEqual([]);
    // Opponents and Difficulty are radio groups since L76-11 (spec v7 §11, Q7): the same controls, role radio.
    expect(['1', '7', 'Easy', 'Normal', 'Hard'].filter((name) => !screen.getByRole('radio', { name }).hasAttribute('disabled'))).toEqual([]);
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

describe('Focus on a mode switch (P2-m5; WCAG 2.4.3)', () => {
  const heading = (): HTMLElement => screen.getByRole('heading', { level: 1 });

  it('focuses nothing on the first mount, then the path title after a tile and the hub title after Back', async () => {
    seedHomeStorage(SEEN);
    const { user } = renderHome();
    expect(document.activeElement).toBe(document.body);
    await user.click(screen.getByRole('button', { name: 'Play solo' }));
    expect(title()).toBe('Play solo');
    expect(document.activeElement).toBe(heading());
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(title()).toBe('Card Battle');
    expect(document.activeElement).toBe(heading());
  });

  it.each(['Skip', 'Got it'] as const)('a gated %s hands focus to the path title it enters', async (way) => {
    seedHomeStorage({ howToPlaySeen: false, whatsNewSeen: true });
    const { user } = renderHome();
    await user.click(screen.getByRole('button', { name: 'Play online' }));
    await closeHomeDialog(user, 'How to play', way);
    expect(title()).toBe('Play online');
    expect(document.activeElement).toBe(heading());
  });

  it('does not steal focus from a dialog that opens over the hub', async () => {
    seedHomeStorage(SEEN);
    const { user } = renderHome();
    await user.click(screen.getByRole('button', { name: 'How to play' }));
    expect(screen.getByRole('dialog', { name: 'How to play' }).contains(document.activeElement)).toBe(true);
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

describe('How to play carousel on Home (spec v7 §7.1; Part 2 Review Focus 1, L76-06)', () => {
  beforeEach(() => { stubPhoneViewport(); }); // the swipe-down handle exists only on a bottom sheet

  it.each(['Skip', 'Got it', 'Escape', 'backdrop', 'swipe'] as const)(
    "a gated %s after paging marks seen and enters Play solo once, with no What's new re-check", async (way) => {
      seedHomeStorage({ howToPlaySeen: false, whatsNewSeen: true });
      const { user, props } = renderHome();
      localStorage.removeItem(LAST_SEEN_RELEASE_ID_KEY); // a second, manual-looking close would open What's new
      await user.click(screen.getByRole('button', { name: 'Play solo' }));
      const dialog = screen.getByRole('dialog', { name: 'How to play' });
      await user.click(within(dialog).getByRole('button', { name: 'Next' }));
      await user.click(within(dialog).getByRole('button', { name: 'Next' }));
      swipeCarouselTo(dialog, 5);
      expect(within(dialog).getByRole('status').textContent).toBe('How to play, 6 of 9');
      expect([title(), localStorage.getItem(HOW_TO_PLAY_SEEN_KEY)]).toEqual(['Card Battle', null]); // paging closes nothing
      await closeHomeDialog(user, 'How to play', way);
      expect([title(), localStorage.getItem(HOW_TO_PLAY_SEEN_KEY)]).toEqual(['Play solo', '1']);
      expect(whatsNew()).toBeNull();
      expectNoHomeIntent(props);
    });

  it("a double click on the gated Skip enters Play online once and opens no What's new", async () => {
    seedHomeStorage({ howToPlaySeen: false, whatsNewSeen: true });
    const { user, props } = renderHome();
    localStorage.removeItem(LAST_SEEN_RELEASE_ID_KEY);
    await user.click(screen.getByRole('button', { name: 'Play online' }));
    await user.dblClick(within(screen.getByRole('dialog', { name: 'How to play' })).getByRole('button', { name: 'Skip' }));
    await waitFor(() => { expect(screen.queryByRole('dialog', { name: 'How to play', hidden: true })).toBeNull(); });
    expect([title(), localStorage.getItem(HOW_TO_PLAY_SEEN_KEY)]).toEqual(['Play online', '1']);
    expect(whatsNew()).toBeNull();
    expectNoHomeIntent(props);
  });

  it("a manual swipe-down closes without marking seen and re-checks What's new", async () => {
    seedHomeStorage({ howToPlaySeen: false, whatsNewSeen: true });
    const { user, props } = renderHome();
    localStorage.removeItem(LAST_SEEN_RELEASE_ID_KEY);
    await user.click(screen.getByRole('button', { name: 'How to play' }));
    await closeHomeDialog(user, 'How to play', 'swipe');
    expect([title(), localStorage.getItem(HOW_TO_PLAY_SEEN_KEY)]).toEqual(['Card Battle', null]);
    expect(scopeOf(whatsNew())).toBe('current');
    expectNoHomeIntent(props);
  });
});
